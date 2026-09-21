import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, type JwtSignOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { Environment } from '../config/environment.validation';
import { AuthThrottleGuard } from './guards/auth-throttle.guard';
import { PasswordMailer } from './password-mailer.service';
import { PasswordRecoveryService } from './password-recovery.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAccessStrategy } from './strategies/jwt-access.strategy';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configuration: ConfigService<Environment, true>) => ({
        secret: configuration.get('JWT_ACCESS_SECRET', { infer: true }),
        signOptions: {
          expiresIn: configuration.get('JWT_ACCESS_TOKEN_EXPIRES_IN', {
            infer: true,
          }) as JwtSignOptions['expiresIn'],
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAccessStrategy, AuthThrottleGuard, PasswordMailer, PasswordRecoveryService],
  exports: [AuthService, JwtModule, PassportModule],
})
export class AuthModule {}
