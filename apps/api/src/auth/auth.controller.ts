import { Body, Controller, Delete, Get, HttpCode, HttpStatus, NotFoundException, Param, Patch, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import type { Environment } from '../config/environment.validation';
import { AuthService, type AuthenticatedUser } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAccessGuard } from './guards/jwt-access.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { ExportQueryDto } from './dto/export-query.dto';

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

  @Patch('profile')
  @UseGuards(JwtAccessGuard)
  async updateProfile(@CurrentUser() payload: { sub: string }, @Body() dto: UpdateProfileDto): Promise<AuthenticatedUser> {
    return this.authService.updateProfile(payload.sub, dto);
  }

  @Patch('preferences')
  @UseGuards(JwtAccessGuard)
  async updatePreferences(@CurrentUser() payload: { sub: string }, @Body() dto: UpdatePreferencesDto): Promise<AuthenticatedUser> {
    return this.authService.updatePreferences(payload.sub, dto);
  }

  @Patch('password')
  @UseGuards(JwtAccessGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(@CurrentUser() payload: { sub: string; sid: string }, @Body() dto: UpdatePasswordDto): Promise<void> {
    await this.authService.changePassword(payload.sub, payload.sid, dto);
  }

  @Get('sessions')
  @UseGuards(JwtAccessGuard)
  async getSessions(@CurrentUser() payload: { sub: string; sid: string }) {
    return this.authService.getSessions(payload.sub, payload.sid);
  }

  @Delete('sessions/:id')
  @UseGuards(JwtAccessGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeSession(@CurrentUser() payload: { sub: string; sid: string }, @Param('id') id: string, @Res({ passthrough: true }) response: Response): Promise<void> {
    if (!(await this.authService.revokeSession(payload.sub, id))) throw new NotFoundException('Session not found.');
    if (id === payload.sid) this.clearRefreshTokenCookie(response);
  }

  @Get('export')
  @UseGuards(JwtAccessGuard)
  async exportData(@CurrentUser() payload: { sub: string }, @Query() query: ExportQueryDto, @Res() response: Response): Promise<void> {
    const backup = await this.authService.exportData(payload.sub);
    const stamp = new Date().toISOString().slice(0, 10);
    if (query.format === 'json') {
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
      response.setHeader('Content-Disposition', `attachment; filename="moneypilot-backup-${stamp}.json"`);
      response.send(JSON.stringify(backup, null, 2));
      return;
    }
    const files = Object.entries({ user: [backup], categories: backup.categories, transactions: backup.transactions, budgets: backup.budgets, savings_goals: backup.savingsGoals }).map(([name, rows]) => ({ name: `${name}.csv`, content: toCsv(rows as Record<string, unknown>[]) }));
    response.setHeader('Content-Type', 'application/zip');
    response.setHeader('Content-Disposition', `attachment; filename="moneypilot-backup-${stamp}.zip"`);
    response.send(createZip(files));
  }

  @Delete('account')
  @UseGuards(JwtAccessGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAccount(@CurrentUser() payload: { sub: string }, @Body() dto: DeleteAccountDto, @Res({ passthrough: true }) response: Response): Promise<void> {
    await this.authService.deleteAccount(payload.sub, dto);
    this.clearRefreshTokenCookie(response);
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

function toCsv(rows: Record<string, unknown>[]): string {
  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const quote = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  return [headers.join(','), ...rows.map((row) => headers.map((header) => quote(row[header] instanceof Date ? (row[header] as Date).toISOString() : row[header])).join(','))].join('\r\n');
}

function createZip(files: { name: string; content: string }[]): Buffer {
  const locals: Buffer[] = []; const central: Buffer[] = []; let offset = 0;
  for (const file of files) {
    const name = Buffer.from(file.name); const content = Buffer.from(file.content, 'utf8'); const crc = crc32(content);
    const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt32LE(crc, 14); local.writeUInt32LE(content.length, 18); local.writeUInt32LE(content.length, 22); local.writeUInt16LE(name.length, 26); locals.push(local, name, content);
    const entry = Buffer.alloc(46); entry.writeUInt32LE(0x02014b50, 0); entry.writeUInt16LE(20, 4); entry.writeUInt16LE(20, 6); entry.writeUInt32LE(crc, 16); entry.writeUInt32LE(content.length, 20); entry.writeUInt32LE(content.length, 24); entry.writeUInt16LE(name.length, 28); entry.writeUInt32LE(offset, 42); central.push(entry, name); offset += local.length + name.length + content.length;
  }
  const directory = Buffer.concat(central); const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16); return Buffer.concat([...locals, directory, end]);
}
function crc32(data: Buffer): number { let crc = 0xffffffff; for (const byte of data) { crc ^= byte; for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0); } return (crc ^ 0xffffffff) >>> 0; }
