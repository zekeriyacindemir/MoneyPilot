import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import type { Environment } from '../config/environment.validation';
import { AuthService, type AuthenticatedUser } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAccessGuard } from './guards/jwt-access.guard';

const refreshTokenMaxAge = 30 * 24 * 60 * 60 * 1000;

interface AuthenticationResponse {
  accessToken: string;
  user: AuthenticatedUser;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configuration: ConfigService<Environment, true>,
  ) {}

  @Public()
  @Post('register')
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthenticationResponse> {
    const result = await this.authService.register(registerDto);

    this.setRefreshTokenCookie(response, result.refreshToken);

    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthenticationResponse> {
    const result = await this.authService.login(loginDto);

    this.setRefreshTokenCookie(response, result.refreshToken);

    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ accessToken: string }> {
    const result = await this.authService.refresh(
      this.getCookieValue(request, 'refresh_token'),
    );

    this.setRefreshTokenCookie(response, result.refreshToken);

    return { accessToken: result.accessToken };
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.authService.logout(this.getCookieValue(request, 'refresh_token'));
    this.clearRefreshTokenCookie(response);
  }

  @Post('logout-all')
  @UseGuards(JwtAccessGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async logoutAll(
    @CurrentUser() payload: { sub: string },
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.authService.logoutAll(payload.sub);
    this.clearRefreshTokenCookie(response);
  }

  @Get('me')
  @UseGuards(JwtAccessGuard)
  async getCurrentUser(@CurrentUser() payload: { sub: string }): Promise<AuthenticatedUser> {
    return this.authService.getCurrentUser(payload.sub);
  }

  private setRefreshTokenCookie(response: Response, refreshToken: string): void {
    response.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      maxAge: refreshTokenMaxAge,
      sameSite: 'lax',
      secure: this.configuration.get('NODE_ENV', { infer: true }) === 'production',
    });
  }

  private clearRefreshTokenCookie(response: Response): void {
    response.cookie('refresh_token', '', {
      httpOnly: true,
      maxAge: 0,
      sameSite: 'lax',
      secure: this.configuration.get('NODE_ENV', { infer: true }) === 'production',
    });
  }

  private getCookieValue(request: Request, name: string): string | undefined {
    const cookieHeader = request.headers.cookie;

    if (!cookieHeader) {
      return undefined;
    }

    const cookie = cookieHeader
      .split(';')
      .map((entry) => entry.trim())
      .find((entry) => entry.startsWith(`${name}=`));

    return cookie?.slice(name.length + 1);
  }
}
