import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import {
  RegisterDto,
  LoginDto,
  RegisterWithOtpDto,
  VerifyOtpDto,
  GetOtpLinkDto,
} from './dto/index.js';
import { JwtAuthGuard } from './guards/index.js';
import { CurrentUser } from './decorators/index.js';

const REFRESH_COOKIE_NAME = '__refresh_token';
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/api/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

function extractSessionContext(req: Request) {
  return {
    ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || req.socket?.remoteAddress,
    userAgent: req.headers['user-agent'] || undefined,
    fingerprint: req.headers['x-device-fingerprint'] as string | undefined,
    deviceName: req.headers['x-device-name'] as string | undefined,
  };
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  async register(@Body() dto: RegisterDto, @Req() req: any, @Res({ passthrough: true }) res: any) {
    const ctx = extractSessionContext(req as Request);
    const result = await this.authService.register(dto, ctx);
    (res as Response).cookie(REFRESH_COOKIE_NAME, result._refreshToken, REFRESH_COOKIE_OPTIONS);
    const { _refreshToken, ...response } = result;
    return response;
  }

  @Post('register-with-otp')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  async registerWithOtp(@Body() dto: RegisterWithOtpDto, @Req() req: any, @Res({ passthrough: true }) res: any) {
    const ctx = extractSessionContext(req as Request);
    const result = await this.authService.registerWithOtp(dto, ctx);
    (res as Response).cookie(REFRESH_COOKIE_NAME, result._refreshToken, REFRESH_COOKIE_OPTIONS);
    const { _refreshToken, ...response } = result;
    return response;
  }

  @Post('otp-link')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  async getOtpLink(@Body() dto: GetOtpLinkDto) {
    return this.authService.getOtpLink(dto.phone);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto.phone, dto.code);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  async login(@Body() dto: LoginDto, @Req() req: any, @Res({ passthrough: true }) res: any) {
    const ctx = extractSessionContext(req as Request);
    const result = await this.authService.login(dto, ctx);
    (res as Response).cookie(REFRESH_COOKIE_NAME, result._refreshToken, REFRESH_COOKIE_OPTIONS);
    const { _refreshToken, ...response } = result;
    return response;
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser('id') userId: string) {
    return this.authService.getProfile(userId);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: any, @Res({ passthrough: true }) res: any) {
    // Get refresh token from HttpOnly cookie OR from header (backwards compat)
    const refreshToken =
      (req as Request).cookies?.[REFRESH_COOKIE_NAME] ||
      (req as Request).headers['x-refresh-token'] as string ||
      (req as Request).body?.refreshToken;

    if (!refreshToken) {
      (res as Response).status(401).json({ message: 'No refresh token provided' });
      return;
    }

    const ctx = extractSessionContext(req as Request);
    const result = await this.authService.refreshToken(refreshToken, ctx);

    // Set new refresh token cookie
    (res as Response).cookie(REFRESH_COOKIE_NAME, result.refreshToken, REFRESH_COOKIE_OPTIONS);

    return {
      accessToken: result.accessToken,
      sessionId: result.sessionId,
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser('sessionId') sessionId: string,
    @Req() req: any,
    @Res({ passthrough: true }) res: any,
  ) {
    const refreshToken =
      (req as Request).cookies?.[REFRESH_COOKIE_NAME] ||
      (req as Request).headers['x-refresh-token'] as string ||
      (req as Request).body?.refreshToken;

    const result = await this.authService.logout(refreshToken, sessionId);

    // Clear cookie
    (res as Response).clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });

    return result;
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logoutAll(@CurrentUser('id') userId: string, @Res({ passthrough: true }) res: any) {
    const result = await this.authService.logoutAllDevices(userId);
    (res as Response).clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
    return result;
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  async getSessions(@CurrentUser('id') userId: string) {
    return this.authService.getActiveSessions(userId);
  }

  @Post('sessions/revoke')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async revokeSession(
    @CurrentUser('id') userId: string,
    @Body('sessionId') sessionId: string,
  ) {
    return this.authService.revokeSession(userId, sessionId);
  }
}
