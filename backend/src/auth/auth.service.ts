import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { RegisterDto, LoginDto, RegisterWithOtpDto } from './dto/index.js';
import { TelegramService } from '../telegram/telegram.service.js';
import type { JwtPayload } from './strategies/jwt.strategy.js';
import { SessionStatus, SessionEventType, Role } from '@prisma/client';

export interface SessionContext {
  ip?: string;
  userAgent?: string;
  fingerprint?: string;
  deviceName?: string;
}

const MAX_ALLOWED_RECENT_DEVICES = 2;
const DEVICE_WINDOW_DAYS = 7;
const ACCOUNT_BLOCKED_MESSAGE =
  'Because suspicious activity was detected on your account, it has been blocked. If you have any inquiries about your blocking, please contact the admins.';
const BLOCKED_DEVICE_MESSAGE =
  'This device has been blocked for this account by an administrator.';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private telegramService: TelegramService,
  ) {}

  // ─── Helpers ─────────────────────────────────────────

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private isMissingBlockedDevicesTable(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    const e = error as { code?: string; meta?: { modelName?: string } };
    return e.code === 'P2021' && e.meta?.modelName === 'BlockedDevice';
  }

  private normalizeUserAgent(userAgent?: string | null) {
    if (!userAgent) return '';
    return userAgent
      .toLowerCase()
      .replace(/[0-9._]+/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 120);
  }

  private isAutomatedUserAgent(userAgent?: string | null) {
    if (!userAgent) return false;
    return /(curl|postmanruntime|insomnia|httpie|python-requests|wget|go-http-client|node-fetch)/i.test(
      userAgent,
    );
  }

  private getRelaxedDeviceSignature(session: {
    fingerprintHash: string | null;
    deviceName: string | null;
    userAgent: string | null;
    ipFirstSeen: string | null;
    ipLastSeen: string | null;
  }) {
    const deviceName = (session.deviceName || '').trim().toLowerCase();
    const normalizedAgent = this.normalizeUserAgent(session.userAgent);

    if (deviceName) {
      return `sig:${deviceName}`;
    }

    if (normalizedAgent) {
      return `ua:${normalizedAgent}`;
    }

    if (session.fingerprintHash) {
      return `fp:${session.fingerprintHash}`;
    }

    return `legacy:${session.ipFirstSeen || session.ipLastSeen || 'unknown'}`;
  }

  private async assertDeviceNotBlocked(userId: string, fingerprint?: string) {
    if (!fingerprint) return;

    const fingerprintHash = this.hashToken(fingerprint);
    let blockedDevice: { id: string } | null = null;
    try {
      blockedDevice = await this.prisma.blockedDevice.findFirst({
        where: {
          userId,
          fingerprintHash,
          isBlocked: true,
        },
        select: { id: true },
      });
    } catch (error) {
      if (this.isMissingBlockedDevicesTable(error)) {
        return;
      }
      throw error;
    }

    if (blockedDevice) {
      throw new ForbiddenException(BLOCKED_DEVICE_MESSAGE);
    }
  }

  private async enforceRecentDeviceLimit(userId: string, sessionId: string) {
    if (this.configService.get<string>('NODE_ENV') !== 'production') {
      return;
    }

    const windowStart = new Date(
      Date.now() - DEVICE_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    );

    const recentSessions = await this.prisma.userSession.findMany({
      where: {
        userId,
        createdAt: { gte: windowStart },
      },
      select: {
        fingerprintHash: true,
        deviceName: true,
        userAgent: true,
        ipFirstSeen: true,
        ipLastSeen: true,
      },
    });

    const countableRecentSessions = recentSessions.filter(
      (session) => !this.isAutomatedUserAgent(session.userAgent),
    );

    if (countableRecentSessions.length === 0) {
      return;
    }

    const distinctSignatures = new Set(
      countableRecentSessions.map((session) =>
        this.getRelaxedDeviceSignature(session),
      ),
    );

    if (distinctSignatures.size <= MAX_ALLOWED_RECENT_DEVICES) {
      return;
    }

    await this.prisma.sessionEvent.create({
      data: {
        sessionId,
        eventType: SessionEventType.DEVICE_LIMIT_EXCEEDED,
        metadata: {
          distinctRecentDevices: distinctSignatures.size,
          rawRecentSessions: recentSessions.length,
          countableRecentSessions: countableRecentSessions.length,
          maxAllowedDevices: MAX_ALLOWED_RECENT_DEVICES,
          windowDays: DEVICE_WINDOW_DAYS,
        },
      },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });

    await this.revokeAllUserSessions(userId);

    throw new ForbiddenException(ACCOUNT_BLOCKED_MESSAGE);
  }

  private async generateTokens(payload: JwtPayload) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload as any, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '15m', // Short-lived access token
      }),
      this.jwtService.signAsync(payload as any, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }

  /**
   * Revoke ALL active sessions for a user except optionally one.
   * This enforces one-device-at-a-time.
   */
  private async revokeAllUserSessions(userId: string, exceptSessionId?: string) {
    const where: any = {
      userId,
      status: SessionStatus.ACTIVE,
    };
    if (exceptSessionId) {
      where.NOT = { id: exceptSessionId };
    }

    const sessions = await this.prisma.userSession.findMany({ where });

    if (sessions.length > 0) {
      // Log forced logout events
      await this.prisma.sessionEvent.createMany({
        data: sessions.map((s) => ({
          sessionId: s.id,
          eventType: SessionEventType.FORCED_LOGOUT,
          metadata: { reason: 'new_login_from_another_device' },
        })),
      });

      await this.prisma.userSession.updateMany({
        where,
        data: {
          status: SessionStatus.REVOKED,
          revokedAt: new Date(),
        },
      });
    }
  }

  /**
   * Create a persistent session and return tokens + session data.
   */
  private async createSession(
    user: { id: string; phone: string; role: string },
    ctx: SessionContext,
  ) {
    // Enforce one-device-at-a-time: revoke all existing sessions for this user
    await this.revokeAllUserSessions(user.id);

    // Create session record first with a placeholder hash
    const session = await this.prisma.userSession.create({
      data: {
        userId: user.id,
        refreshTokenHash: 'pending', // will be updated immediately
        deviceName: ctx.deviceName || null,
        fingerprintHash: ctx.fingerprint
          ? this.hashToken(ctx.fingerprint)
          : null,
        ipFirstSeen: ctx.ip || null,
        ipLastSeen: ctx.ip || null,
        userAgent: ctx.userAgent || null,
        status: SessionStatus.ACTIVE,
      },
    });

    if (user.role !== Role.ADMIN) {
      await this.enforceRecentDeviceLimit(user.id, session.id);
    }

    // Now generate tokens with sessionId embedded
    const tokens = await this.generateTokens({
      sub: user.id,
      phone: user.phone,
      role: user.role,
      sessionId: session.id,
    });

    const refreshTokenHash = this.hashToken(tokens.refreshToken);

    // Update session with the actual refresh token hash
    await this.prisma.userSession.update({
      where: { id: session.id },
      data: { refreshTokenHash },
    });

    // Log login event
    await this.prisma.sessionEvent.create({
      data: {
        sessionId: session.id,
        eventType: SessionEventType.LOGIN,
        ip: ctx.ip || null,
        userAgent: ctx.userAgent || null,
      },
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      sessionId: session.id,
    };
  }

  // ─── Registration ────────────────────────────────────

  async register(dto: RegisterDto, ctx: SessionContext = {}) {
    const existing = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });

    if (existing) {
      throw new ConflictException('Phone number already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        phone: dto.phone,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
      },
    });

    const session = await this.createSession(
      { id: user.id, phone: user.phone, role: user.role },
      ctx,
    );

    return {
      user: {
        id: user.id,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      accessToken: session.accessToken,
      sessionId: session.sessionId,
      _refreshToken: session.refreshToken, // Used by controller to set HttpOnly cookie
    };
  }

  // ─── OTP Link / Verify ──────────────────────────────

  async getOtpLink(phone: string) {
    const existing = await this.prisma.user.findUnique({
      where: { phone },
    });

    if (existing) {
      throw new ConflictException('Phone number already registered');
    }

    const deepLink = this.telegramService.getDeepLink(phone);
    const botUsername = this.telegramService.getBotUsername();

    return {
      deepLink,
      botUsername,
      message: 'Open the Telegram link to receive your verification code.',
    };
  }

  async verifyOtp(phone: string, code: string) {
    const result = await this.telegramService.verifyOtp(phone, code);

    if (!result.valid) {
      throw new BadRequestException(result.message);
    }

    return { verified: true, message: result.message };
  }

  async registerWithOtp(dto: RegisterWithOtpDto, ctx: SessionContext = {}) {
    const otpResult = await this.telegramService.verifyOtp(dto.phone, dto.otpCode);
    if (!otpResult.valid) {
      throw new BadRequestException(otpResult.message);
    }

    const existing = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });

    if (existing) {
      throw new ConflictException('Phone number already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        phone: dto.phone,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
      },
    });

    const session = await this.createSession(
      { id: user.id, phone: user.phone, role: user.role },
      ctx,
    );

    return {
      user: {
        id: user.id,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      accessToken: session.accessToken,
      sessionId: session.sessionId,
      _refreshToken: session.refreshToken,
    };
  }

  // ─── Login ──────────────────────────────────────────

  async login(dto: LoginDto, ctx: SessionContext = {}) {
    const user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      if (user.role === Role.ADMIN) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { isActive: true },
        });
      } else {
        throw new UnauthorizedException(ACCOUNT_BLOCKED_MESSAGE);
      }
    }

    const passwordValid = await bcrypt.compare(dto.password, user.password);

    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.assertDeviceNotBlocked(user.id, ctx.fingerprint);

    // Check if there are already active sessions — if so, we forcefully
    // terminate them (one-device-at-a-time policy).
    const session = await this.createSession(
      { id: user.id, phone: user.phone, role: user.role },
      ctx,
    );

    return {
      user: {
        id: user.id,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      accessToken: session.accessToken,
      sessionId: session.sessionId,
      _refreshToken: session.refreshToken,
    };
  }

  // ─── Profile ────────────────────────────────────────

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.isActive) {
      if (user.role === Role.ADMIN) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { isActive: true },
        });
      } else {
        throw new UnauthorizedException(ACCOUNT_BLOCKED_MESSAGE);
      }
    }

    return user;
  }

  // ─── Refresh Token (Rotating) ───────────────────────

  async refreshToken(oldRefreshToken: string, ctx: SessionContext = {}) {
    // Decode the refresh token to get user info
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync(oldRefreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedException(ACCOUNT_BLOCKED_MESSAGE);
    }

    await this.assertDeviceNotBlocked(user.id, ctx.fingerprint);

    // Find the session by the hashed refresh token
    const oldHash = this.hashToken(oldRefreshToken);
    const session = await this.prisma.userSession.findFirst({
      where: {
        refreshTokenHash: oldHash,
        userId: user.id,
        status: SessionStatus.ACTIVE,
      },
    });

    if (!session) {
      // Token reuse detected — potential theft. Revoke all sessions for safety.
      await this.revokeAllUserSessions(user.id);

      // Log suspicious event
      const anySession = await this.prisma.userSession.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      });
      if (anySession) {
        await this.prisma.sessionEvent.create({
          data: {
            sessionId: anySession.id,
            eventType: SessionEventType.FINGERPRINT_MISMATCH,
            ip: ctx.ip || null,
            metadata: { reason: 'refresh_token_reuse_detected' },
          },
        });
      }

      throw new UnauthorizedException('Session invalid. All sessions revoked for security. Please log in again.');
    }

    if (session.fingerprintHash) {
      let blockedDevice: { id: string } | null = null;
      try {
        blockedDevice = await this.prisma.blockedDevice.findFirst({
          where: {
            userId: user.id,
            fingerprintHash: session.fingerprintHash,
            isBlocked: true,
          },
          select: { id: true },
        });
      } catch (error) {
        if (!this.isMissingBlockedDevicesTable(error)) {
          throw error;
        }
      }
      if (blockedDevice) {
        await this.prisma.userSession.update({
          where: { id: session.id },
          data: { status: SessionStatus.REVOKED, revokedAt: new Date() },
        });
        throw new ForbiddenException(BLOCKED_DEVICE_MESSAGE);
      }
    }

    // Fingerprint risk check: if a fingerprint was stored and the new one differs significantly
    if (session.fingerprintHash && ctx.fingerprint) {
      const newFpHash = this.hashToken(ctx.fingerprint);
      if (newFpHash !== session.fingerprintHash) {
        // Suspicious — different device using the same refresh token
        await this.prisma.sessionEvent.create({
          data: {
            sessionId: session.id,
            eventType: SessionEventType.FINGERPRINT_MISMATCH,
            ip: ctx.ip || null,
            metadata: {
              reason: 'fingerprint_changed_during_refresh',
              oldFp: session.fingerprintHash.slice(0, 8),
              newFp: newFpHash.slice(0, 8),
            },
          },
        });

        // Revoke this session and force re-login
        await this.prisma.userSession.update({
          where: { id: session.id },
          data: { status: SessionStatus.REVOKED, revokedAt: new Date() },
        });

        throw new UnauthorizedException(
          'Device fingerprint mismatch detected. Please log in again.',
        );
      }
    }

    // IP change detection (soft — just log, don't block)
    if (session.ipLastSeen && ctx.ip && session.ipLastSeen !== ctx.ip) {
      await this.prisma.sessionEvent.create({
        data: {
          sessionId: session.id,
          eventType: SessionEventType.SUSPICIOUS_IP_CHANGE,
          ip: ctx.ip,
          metadata: {
            previousIp: session.ipLastSeen,
            newIp: ctx.ip,
          },
        },
      });
    }

    // Issue new tokens (rotation) with sessionId
    const newTokens = await this.generateTokens({
      sub: user.id,
      phone: user.phone,
      role: user.role,
      sessionId: session.id,
    });

    const newRefreshHash = this.hashToken(newTokens.refreshToken);

    // Update session with new refresh token hash
    await this.prisma.userSession.update({
      where: { id: session.id },
      data: {
        refreshTokenHash: newRefreshHash,
        lastSeenAt: new Date(),
        ipLastSeen: ctx.ip || session.ipLastSeen,
      },
    });

    // Log refresh event
    await this.prisma.sessionEvent.create({
      data: {
        sessionId: session.id,
        eventType: SessionEventType.REFRESH,
        ip: ctx.ip || null,
        userAgent: ctx.userAgent || null,
      },
    });

    return {
      accessToken: newTokens.accessToken,
      refreshToken: newTokens.refreshToken,
      sessionId: session.id,
    };
  }

  // ─── Logout ─────────────────────────────────────────

  async logout(refreshToken: string, sessionId?: string) {
    let session: any = null;

    // Try to find session by refresh token first
    if (refreshToken) {
      const hash = this.hashToken(refreshToken);
      session = await this.prisma.userSession.findFirst({
        where: { refreshTokenHash: hash, status: SessionStatus.ACTIVE },
      });
    }

    // Fall back to sessionId from JWT
    if (!session && sessionId) {
      session = await this.prisma.userSession.findFirst({
        where: { id: sessionId, status: SessionStatus.ACTIVE },
      });
    }

    if (!session) return { message: 'Logged out' };

    await this.prisma.userSession.update({
      where: { id: session.id },
      data: { status: SessionStatus.REVOKED, revokedAt: new Date() },
    });

    await this.prisma.sessionEvent.create({
      data: {
        sessionId: session.id,
        eventType: SessionEventType.LOGOUT,
      },
    });

    return { message: 'Logged out successfully' };
  }

  async logoutAllDevices(userId: string) {
    await this.revokeAllUserSessions(userId);
    return { message: 'All sessions revoked' };
  }

  // ─── Session Management ─────────────────────────────

  async getActiveSessions(userId: string) {
    return this.prisma.userSession.findMany({
      where: { userId, status: SessionStatus.ACTIVE },
      select: {
        id: true,
        deviceName: true,
        ipFirstSeen: true,
        ipLastSeen: true,
        userAgent: true,
        createdAt: true,
        lastSeenAt: true,
      },
      orderBy: { lastSeenAt: 'desc' },
    });
  }

  async revokeSession(userId: string, sessionId: string) {
    const session = await this.prisma.userSession.findFirst({
      where: { id: sessionId, userId, status: SessionStatus.ACTIVE },
    });

    if (!session) {
      throw new BadRequestException('Session not found or already revoked');
    }

    await this.prisma.userSession.update({
      where: { id: sessionId },
      data: { status: SessionStatus.REVOKED, revokedAt: new Date() },
    });

    await this.prisma.sessionEvent.create({
      data: {
        sessionId,
        eventType: SessionEventType.FORCED_LOGOUT,
        metadata: { reason: 'manual_revoke_by_user' },
      },
    });

    return { message: 'Session revoked' };
  }

  /**
   * Validate that the user's current session is still active.
   * Called from JwtStrategy on every request.
   */
  async validateSession(userId: string, sessionId?: string): Promise<boolean> {
    if (!sessionId) return true; // fallback for old tokens without sessionId

    const session = await this.prisma.userSession.findFirst({
      where: {
        id: sessionId,
        userId,
        status: SessionStatus.ACTIVE,
      },
    });

    return !!session;
  }
}
