import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordMailer } from './password-mailer.service';

@Injectable()
export class PasswordRecoveryService {
 private readonly logger = new Logger(PasswordRecoveryService.name);
 constructor(private readonly prisma: PrismaService, private readonly mailer: PasswordMailer) {}
 async request(email: string): Promise<void> {
   this.mailer.assertConfigured();
   const user = await this.prisma.user.findUnique({ where: { email }, select: { id: true } });
   if (!user) return;
   const token = randomBytes(32).toString('hex');
   const tokenHash = this.hash(token);
   await this.prisma.$transaction([
     this.prisma.passwordReset.deleteMany({ where: { OR: [{ userId: user.id }, { expiresAt: { lte: new Date() } }] } }),
     this.prisma.passwordReset.create({ data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 20 * 60_000) } }),
   ]);
   try { await this.mailer.send(email, token); }
   catch {
     await this.prisma.passwordReset.deleteMany({ where: { tokenHash } });
     // Do not expose recipient, token or mail-server credentials in logs.
     this.logger.error('Password recovery email delivery failed.');
   }
 }
 async reset(token: string, password: string): Promise<void> {
   const tokenHash = this.hash(token);
   const record = await this.prisma.passwordReset.findUnique({ where: { tokenHash } });
   if (!record || record.expiresAt <= new Date()) throw this.invalidToken();
   const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
   await this.prisma.$transaction(async (tx) => {
     const consumed = await tx.passwordReset.deleteMany({ where: { tokenHash, expiresAt: { gt: new Date() } } });
     if (consumed.count !== 1) throw this.invalidToken();
     await tx.user.update({ where: { id: record.userId }, data: { passwordHash } });
     await tx.authSession.updateMany({ where: { userId: record.userId, revokedAt: null }, data: { revokedAt: new Date() } });
     await tx.passwordReset.deleteMany({ where: { userId: record.userId } });
   });
 }
 private hash(token: string) { return createHash('sha256').update(token).digest('hex'); }
 private invalidToken() { return new BadRequestException('Bağlantı geçersiz veya süresi dolmuş. Yeni bir bağlantı isteyin.'); }
}
