import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Currency, Prisma } from '@prisma/client';
import * as argon2 from 'argon2';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import type { Environment } from '../config/environment.validation';
import { PrismaService } from '../prisma/prisma.service';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import type { UpdateProfileDto } from './dto/update-profile.dto';
import type { UpdatePreferencesDto } from './dto/update-preferences.dto';
import type { UpdatePasswordDto } from './dto/update-password.dto';
import type { DeleteAccountDto } from './dto/delete-account.dto';

export interface AccessTokenPayload {
  sub: string;
  sid: string;
  type: 'access';
}

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  defaultCurrency: Currency;
  budgetAlertsEnabled: boolean;
  savingsGoalAlertsEnabled: boolean;
  weeklySummaryEnabled: boolean;
}

export interface AuthenticationResult {
  accessToken: string;
  refreshToken: string;
  user: AuthenticatedUser;
}

export interface RefreshResult {
  accessToken: string;
  refreshToken: string;
}

interface SessionCredentials {
  expiresAt: Date;
  refreshToken: string;
  refreshTokenHash: string;
  sessionId: string;
}

interface SessionUser {
  id: string;
  email: string;
  displayName: string | null;
  createdAt: Date;
  defaultCurrency: Currency;
  budgetAlertsEnabled: boolean;
  savingsGoalAlertsEnabled: boolean;
  weeklySummaryEnabled: boolean;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly configuration: ConfigService<Environment, true>,
  ) {}

  createAccessToken(payload: AccessTokenPayload): string {
    return this.jwtService.sign(payload);
  }

  async register(registerDto: RegisterDto): Promise<AuthenticationResult> {
    const name = registerDto.name.trim();
    const email = registerDto.email.trim().toLowerCase();
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictException('An account with this email already exists.');
    }

    const passwordHash = await argon2.hash(registerDto.password, {
      type: argon2.argon2id,
    });
    const session = this.createSessionCredentials();

    try {
      const user = await this.prisma.user.create({
        data: {
          email,
          displayName: name,
          passwordHash,
          authSessions: {
            create: {
              id: session.sessionId,
              expiresAt: session.expiresAt,
              refreshTokenHash: session.refreshTokenHash,
            },
          },
        },
        select: {
          id: true,
          email: true,
          displayName: true,
          createdAt: true,
          defaultCurrency: true,
          budgetAlertsEnabled: true,
          savingsGoalAlertsEnabled: true,
          weeklySummaryEnabled: true,
        },
      });

      return this.createAuthenticationResult(user, session);
    } catch (error: unknown) {
      if (this.isDuplicateEmailError(error)) {
        throw new ConflictException('An account with this email already exists.');
      }

      throw error;
    }
  }

  async login(loginDto: LoginDto): Promise<AuthenticationResult> {
    const email = loginDto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        displayName: true,
        createdAt: true,
        defaultCurrency: true,
        budgetAlertsEnabled: true,
        savingsGoalAlertsEnabled: true,
        weeklySummaryEnabled: true,
        passwordHash: true,
      },
    });

    if (!user || !(await argon2.verify(user.passwordHash, loginDto.password))) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const session = this.createSessionCredentials();
    await this.prisma.authSession.create({
      data: {
        id: session.sessionId,
        userId: user.id,
        expiresAt: session.expiresAt,
        refreshTokenHash: session.refreshTokenHash,
      },
    });

    return this.createAuthenticationResult(user, session);
  }

  async refresh(refreshToken?: string): Promise<RefreshResult> {
    if (!refreshToken) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    const refreshTokenHash = this.hashRefreshToken(refreshToken);
    const session = await this.prisma.authSession.findUnique({
      where: { refreshTokenHash },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        revokedAt: true,
      },
    });
    const now = new Date();

    if (!session || session.revokedAt || session.expiresAt <= now) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    const nextRefreshToken = this.createRefreshToken();
    const updatedSession = await this.prisma.authSession.updateMany({
      where: {
        id: session.id,
        refreshTokenHash,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      data: {
        refreshTokenHash: nextRefreshToken.refreshTokenHash,
        lastUsedAt: now,
      },
    });

    if (updatedSession.count !== 1) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    return {
      accessToken: this.createAccessToken({
        sub: session.userId,
        sid: session.id,
        type: 'access',
      }),
      refreshToken: nextRefreshToken.refreshToken,
    };
  }

  async logout(refreshToken?: string): Promise<void> {
    if (!refreshToken) {
      return;
    }

    const now = new Date();
    await this.prisma.authSession.updateMany({
      where: {
        refreshTokenHash: this.hashRefreshToken(refreshToken),
      },
      data: {
        revokedAt: now,
        lastUsedAt: now,
      },
    });
  }

  async logoutAll(userId: string): Promise<void> {
    const now = new Date();

    await this.prisma.authSession.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: now,
        lastUsedAt: now,
      },
    });
  }

  async getCurrentUser(userId: string): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        createdAt: true,
        defaultCurrency: true,
        budgetAlertsEnabled: true,
        savingsGoalAlertsEnabled: true,
        weeklySummaryEnabled: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    return {
      id: user.id,
      name: user.displayName ?? '',
      email: user.email,
      createdAt: user.createdAt,
      defaultCurrency: user.defaultCurrency,
      budgetAlertsEnabled: user.budgetAlertsEnabled,
      savingsGoalAlertsEnabled: user.savingsGoalAlertsEnabled,
      weeklySummaryEnabled: user.weeklySummaryEnabled,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, passwordHash: true },
    });
    if (!user) throw new UnauthorizedException();
    const data: Prisma.UserUpdateInput = {};
    if (dto.name !== undefined) data.displayName = dto.name;
    if (dto.email !== undefined && dto.email !== user.email) {
      if (!dto.currentPassword || !(await argon2.verify(user.passwordHash, dto.currentPassword))) {
        throw new UnauthorizedException('Current password is incorrect.');
      }
      data.email = dto.email;
    }
    try {
      await this.prisma.user.update({ where: { id: userId }, data });
    } catch (error) {
      if (this.isDuplicateEmailError(error)) throw new ConflictException('An account with this email already exists.');
      throw error;
    }
    return this.getCurrentUser(userId);
  }

  async updatePreferences(userId: string, dto: UpdatePreferencesDto): Promise<AuthenticatedUser> {
    await this.prisma.user.update({ where: { id: userId }, data: dto });
    return this.getCurrentUser(userId);
  }

  async changePassword(userId: string, currentSessionId: string, dto: UpdatePasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
    if (!user || !(await argon2.verify(user.passwordHash, dto.currentPassword))) {
      throw new UnauthorizedException('Current password is incorrect.');
    }
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash: await argon2.hash(dto.newPassword, { type: argon2.argon2id }) },
      }),
      this.prisma.authSession.updateMany({
        where: { userId, id: { not: currentSessionId }, revokedAt: null },
        data: { revokedAt: now, lastUsedAt: now },
      }),
    ]);
  }

  async getSessions(userId: string, currentSessionId: string) {
    return this.prisma.authSession.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, createdAt: true, lastUsedAt: true, expiresAt: true }, orderBy: { createdAt: 'desc' },
    }).then((sessions) => sessions.map((session) => ({ ...session, current: session.id === currentSessionId })));
  }

  async revokeSession(userId: string, sessionId: string): Promise<boolean> {
    const result = await this.prisma.authSession.updateMany({ where: { id: sessionId, userId, revokedAt: null }, data: { revokedAt: new Date() } });
    return result.count === 1;
  }

  async exportData(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, displayName: true, defaultCurrency: true, createdAt: true, categories: true, transactions: true, budgets: true, savingsGoals: true } });
    if (!user) throw new UnauthorizedException();
    return user;
  }

  async deleteAccount(userId: string, dto: DeleteAccountDto): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
    if (!user || !(await argon2.verify(user.passwordHash, dto.currentPassword))) throw new UnauthorizedException('Current password is incorrect.');
    await this.prisma.$transaction(async (tx) => {
      await tx.authSession.deleteMany({ where: { userId } });
      await tx.transaction.deleteMany({ where: { userId } });
      await tx.budget.deleteMany({ where: { userId } });
      await tx.savingsGoal.deleteMany({ where: { userId } });
      await tx.category.deleteMany({ where: { userId, isSystem: false } });
      await tx.user.delete({ where: { id: userId } });
    });
  }

  private createSessionCredentials(): SessionCredentials {
    const refreshToken = this.createRefreshToken();

    return {
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      ...refreshToken,
      sessionId: randomUUID(),
    };
  }

  private createRefreshToken(): Pick<SessionCredentials, 'refreshToken' | 'refreshTokenHash'> {
    const refreshToken = randomBytes(48).toString('base64url');

    return {
      refreshToken,
      refreshTokenHash: this.hashRefreshToken(refreshToken),
    };
  }

  private createAuthenticationResult(
    user: SessionUser,
    session: SessionCredentials,
  ): AuthenticationResult {
    return {
      accessToken: this.createAccessToken({
        sub: user.id,
        sid: session.sessionId,
        type: 'access',
      }),
      refreshToken: session.refreshToken,
      user: {
        id: user.id,
        name: user.displayName ?? '',
        email: user.email,
      createdAt: user.createdAt,
      defaultCurrency: user.defaultCurrency,
      budgetAlertsEnabled: user.budgetAlertsEnabled,
      savingsGoalAlertsEnabled: user.savingsGoalAlertsEnabled,
      weeklySummaryEnabled: user.weeklySummaryEnabled,
      },
    };
  }

  private hashRefreshToken(refreshToken: string): string {
    return createHmac(
      'sha256',
      this.configuration.get('REFRESH_TOKEN_HMAC_SECRET', { infer: true }),
    )
      .update(refreshToken)
      .digest('hex');
  }

  private isDuplicateEmailError(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }
}
