import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import * as argon2 from 'argon2';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import type { Environment } from '../config/environment.validation';
import { PrismaService } from '../prisma/prisma.service';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';

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
    };
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
