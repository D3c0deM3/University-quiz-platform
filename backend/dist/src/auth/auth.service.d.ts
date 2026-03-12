import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service.js';
import { RegisterDto, LoginDto, RegisterWithOtpDto } from './dto/index.js';
import { TelegramService } from '../telegram/telegram.service.js';
export interface SessionContext {
    ip?: string;
    userAgent?: string;
    fingerprint?: string;
    deviceName?: string;
}
export declare class AuthService {
    private prisma;
    private jwtService;
    private configService;
    private telegramService;
    constructor(prisma: PrismaService, jwtService: JwtService, configService: ConfigService, telegramService: TelegramService);
    private hashToken;
    private isMissingBlockedDevicesTable;
    private assertDeviceNotBlocked;
    private generateTokens;
    private revokeAllUserSessions;
    private createSession;
    register(dto: RegisterDto, ctx?: SessionContext): Promise<{
        user: {
            id: string;
            phone: string;
            firstName: string;
            lastName: string;
            role: import("@prisma/client").$Enums.Role;
        };
        accessToken: string;
        sessionId: string;
        _refreshToken: string;
    }>;
    getOtpLink(phone: string): Promise<{
        deepLink: string;
        botUsername: string;
        message: string;
    }>;
    verifyOtp(phone: string, code: string): Promise<{
        verified: boolean;
        message: string;
    }>;
    registerWithOtp(dto: RegisterWithOtpDto, ctx?: SessionContext): Promise<{
        user: {
            id: string;
            phone: string;
            firstName: string;
            lastName: string;
            role: import("@prisma/client").$Enums.Role;
        };
        accessToken: string;
        sessionId: string;
        _refreshToken: string;
    }>;
    login(dto: LoginDto, ctx?: SessionContext): Promise<{
        user: {
            id: string;
            phone: string;
            firstName: string;
            lastName: string;
            role: import("@prisma/client").$Enums.Role;
        };
        accessToken: string;
        sessionId: string;
        _refreshToken: string;
    }>;
    getProfile(userId: string): Promise<{
        id: string;
        phone: string;
        firstName: string;
        lastName: string;
        role: import("@prisma/client").$Enums.Role;
        isActive: boolean;
        createdAt: Date;
    }>;
    refreshToken(oldRefreshToken: string, ctx?: SessionContext): Promise<{
        accessToken: string;
        refreshToken: string;
        sessionId: string;
    }>;
    logout(refreshToken: string, sessionId?: string): Promise<{
        message: string;
    }>;
    logoutAllDevices(userId: string): Promise<{
        message: string;
    }>;
    getActiveSessions(userId: string): Promise<{
        id: string;
        createdAt: Date;
        deviceName: string | null;
        ipFirstSeen: string | null;
        ipLastSeen: string | null;
        userAgent: string | null;
        lastSeenAt: Date;
    }[]>;
    revokeSession(userId: string, sessionId: string): Promise<{
        message: string;
    }>;
    validateSession(userId: string, sessionId?: string): Promise<boolean>;
}
