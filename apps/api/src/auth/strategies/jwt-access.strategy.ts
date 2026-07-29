import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { type AccessTokenPayload } from '../auth.service';
import type { Environment } from '../../config/environment.validation';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt-access') {
  constructor(
    configuration: ConfigService<Environment, true>,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configuration.get('JWT_ACCESS_SECRET', { infer: true }),
    });
  }

  async validate(payload: AccessTokenPayload): Promise<AccessTokenPayload> {
    if (payload.type !== 'access') {
      throw new UnauthorizedException();
    }

    const session = await this.prisma.authSession.findFirst({
      where: { id: payload.sid, userId: payload.sub, revokedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true },
    });
    if (!session) throw new UnauthorizedException();

    return payload;
  }
}
