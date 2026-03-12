"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const bcrypt = __importStar(require("bcrypt"));
const crypto = __importStar(require("crypto"));
const prisma_service_js_1 = require("../prisma/prisma.service.js");
const telegram_service_js_1 = require("../telegram/telegram.service.js");
const client_1 = require("@prisma/client");
const ACCOUNT_BLOCKED_MESSAGE = 'Because suspicious activity was detected on your account, it has been blocked. If you have any inquiries about your blocking, please contact the admins.';
const BLOCKED_DEVICE_MESSAGE = 'This device has been blocked for this account by an administrator.';
let AuthService = class AuthService {
    prisma;
    jwtService;
    configService;
    telegramService;
    constructor(prisma, jwtService, configService, telegramService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.configService = configService;
        this.telegramService = telegramService;
    }
    hashToken(token) {
        return crypto.createHash('sha256').update(token).digest('hex');
    }
    isMissingBlockedDevicesTable(error) {
        if (!error || typeof error !== 'object')
            return false;
        const e = error;
        return e.code === 'P2021' && e.meta?.modelName === 'BlockedDevice';
    }
    async assertDeviceNotBlocked(userId, fingerprint) {
        if (!fingerprint)
            return;
        const fingerprintHash = this.hashToken(fingerprint);
        let blockedDevice = null;
        try {
            blockedDevice = await this.prisma.blockedDevice.findFirst({
                where: {
                    userId,
                    fingerprintHash,
                    isBlocked: true,
                },
                select: { id: true },
            });
        }
        catch (error) {
            if (this.isMissingBlockedDevicesTable(error)) {
                return;
            }
            throw error;
        }
        if (blockedDevice) {
            throw new common_1.ForbiddenException(BLOCKED_DEVICE_MESSAGE);
        }
    }
    async generateTokens(payload) {
        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(payload, {
                secret: this.configService.get('JWT_SECRET'),
                expiresIn: '15m',
            }),
            this.jwtService.signAsync(payload, {
                secret: this.configService.get('JWT_REFRESH_SECRET'),
                expiresIn: '7d',
            }),
        ]);
        return { accessToken, refreshToken };
    }
    async revokeAllUserSessions(userId, exceptSessionId) {
        const where = {
            userId,
            status: client_1.SessionStatus.ACTIVE,
        };
        if (exceptSessionId) {
            where.NOT = { id: exceptSessionId };
        }
        const sessions = await this.prisma.userSession.findMany({ where });
        if (sessions.length > 0) {
            await this.prisma.sessionEvent.createMany({
                data: sessions.map((s) => ({
                    sessionId: s.id,
                    eventType: client_1.SessionEventType.FORCED_LOGOUT,
                    metadata: { reason: 'new_login_from_another_device' },
                })),
            });
            await this.prisma.userSession.updateMany({
                where,
                data: {
                    status: client_1.SessionStatus.REVOKED,
                    revokedAt: new Date(),
                },
            });
        }
    }
    async createSession(user, ctx) {
        await this.revokeAllUserSessions(user.id);
        const session = await this.prisma.userSession.create({
            data: {
                userId: user.id,
                refreshTokenHash: 'pending',
                deviceName: ctx.deviceName || null,
                fingerprintHash: ctx.fingerprint
                    ? this.hashToken(ctx.fingerprint)
                    : null,
                ipFirstSeen: ctx.ip || null,
                ipLastSeen: ctx.ip || null,
                userAgent: ctx.userAgent || null,
                status: client_1.SessionStatus.ACTIVE,
            },
        });
        const tokens = await this.generateTokens({
            sub: user.id,
            phone: user.phone,
            role: user.role,
            sessionId: session.id,
        });
        const refreshTokenHash = this.hashToken(tokens.refreshToken);
        await this.prisma.userSession.update({
            where: { id: session.id },
            data: { refreshTokenHash },
        });
        await this.prisma.sessionEvent.create({
            data: {
                sessionId: session.id,
                eventType: client_1.SessionEventType.LOGIN,
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
    async register(dto, ctx = {}) {
        const existing = await this.prisma.user.findUnique({
            where: { phone: dto.phone },
        });
        if (existing) {
            throw new common_1.ConflictException('Phone number already registered');
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
        const session = await this.createSession({ id: user.id, phone: user.phone, role: user.role }, ctx);
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
    async getOtpLink(phone) {
        const existing = await this.prisma.user.findUnique({
            where: { phone },
        });
        if (existing) {
            throw new common_1.ConflictException('Phone number already registered');
        }
        const deepLink = this.telegramService.getDeepLink(phone);
        const botUsername = this.telegramService.getBotUsername();
        return {
            deepLink,
            botUsername,
            message: 'Open the Telegram link to receive your verification code.',
        };
    }
    async verifyOtp(phone, code) {
        const result = await this.telegramService.verifyOtp(phone, code);
        if (!result.valid) {
            throw new common_1.BadRequestException(result.message);
        }
        return { verified: true, message: result.message };
    }
    async registerWithOtp(dto, ctx = {}) {
        const otpResult = await this.telegramService.verifyOtp(dto.phone, dto.otpCode);
        if (!otpResult.valid) {
            throw new common_1.BadRequestException(otpResult.message);
        }
        const existing = await this.prisma.user.findUnique({
            where: { phone: dto.phone },
        });
        if (existing) {
            throw new common_1.ConflictException('Phone number already registered');
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
        const session = await this.createSession({ id: user.id, phone: user.phone, role: user.role }, ctx);
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
    async login(dto, ctx = {}) {
        const user = await this.prisma.user.findUnique({
            where: { phone: dto.phone },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        if (!user.isActive) {
            if (user.role === client_1.Role.ADMIN) {
                await this.prisma.user.update({
                    where: { id: user.id },
                    data: { isActive: true },
                });
            }
            else {
                throw new common_1.UnauthorizedException(ACCOUNT_BLOCKED_MESSAGE);
            }
        }
        const passwordValid = await bcrypt.compare(dto.password, user.password);
        if (!passwordValid) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        await this.assertDeviceNotBlocked(user.id, ctx.fingerprint);
        const session = await this.createSession({ id: user.id, phone: user.phone, role: user.role }, ctx);
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
    async getProfile(userId) {
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
            throw new common_1.UnauthorizedException('User not found');
        }
        if (!user.isActive) {
            if (user.role === client_1.Role.ADMIN) {
                await this.prisma.user.update({
                    where: { id: user.id },
                    data: { isActive: true },
                });
            }
            else {
                throw new common_1.UnauthorizedException(ACCOUNT_BLOCKED_MESSAGE);
            }
        }
        return user;
    }
    async refreshToken(oldRefreshToken, ctx = {}) {
        let payload;
        try {
            payload = await this.jwtService.verifyAsync(oldRefreshToken, {
                secret: this.configService.get('JWT_REFRESH_SECRET'),
            });
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid or expired refresh token');
        }
        const user = await this.prisma.user.findUnique({
            where: { id: payload.sub },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('User not found');
        }
        if (!user.isActive) {
            throw new common_1.UnauthorizedException(ACCOUNT_BLOCKED_MESSAGE);
        }
        await this.assertDeviceNotBlocked(user.id, ctx.fingerprint);
        const oldHash = this.hashToken(oldRefreshToken);
        const session = await this.prisma.userSession.findFirst({
            where: {
                refreshTokenHash: oldHash,
                userId: user.id,
                status: client_1.SessionStatus.ACTIVE,
            },
        });
        if (!session) {
            const anySession = await this.prisma.userSession.findFirst({
                where: { userId: user.id },
                orderBy: { createdAt: 'desc' },
            });
            if (anySession) {
                await this.prisma.sessionEvent.create({
                    data: {
                        sessionId: anySession.id,
                        eventType: client_1.SessionEventType.FINGERPRINT_MISMATCH,
                        ip: ctx.ip || null,
                        metadata: { reason: 'refresh_token_reuse_detected' },
                    },
                });
            }
            throw new common_1.UnauthorizedException('Session expired. Please log in again.');
        }
        if (session.fingerprintHash) {
            let blockedDevice = null;
            try {
                blockedDevice = await this.prisma.blockedDevice.findFirst({
                    where: {
                        userId: user.id,
                        fingerprintHash: session.fingerprintHash,
                        isBlocked: true,
                    },
                    select: { id: true },
                });
            }
            catch (error) {
                if (!this.isMissingBlockedDevicesTable(error)) {
                    throw error;
                }
            }
            if (blockedDevice) {
                await this.prisma.userSession.update({
                    where: { id: session.id },
                    data: { status: client_1.SessionStatus.REVOKED, revokedAt: new Date() },
                });
                throw new common_1.ForbiddenException(BLOCKED_DEVICE_MESSAGE);
            }
        }
        if (session.fingerprintHash && ctx.fingerprint) {
            const newFpHash = this.hashToken(ctx.fingerprint);
            if (newFpHash !== session.fingerprintHash) {
                await this.prisma.sessionEvent.create({
                    data: {
                        sessionId: session.id,
                        eventType: client_1.SessionEventType.FINGERPRINT_MISMATCH,
                        ip: ctx.ip || null,
                        metadata: {
                            reason: 'fingerprint_changed_during_refresh',
                            oldFp: session.fingerprintHash.slice(0, 8),
                            newFp: newFpHash.slice(0, 8),
                        },
                    },
                });
            }
        }
        if (session.ipLastSeen && ctx.ip && session.ipLastSeen !== ctx.ip) {
            await this.prisma.sessionEvent.create({
                data: {
                    sessionId: session.id,
                    eventType: client_1.SessionEventType.SUSPICIOUS_IP_CHANGE,
                    ip: ctx.ip,
                    metadata: {
                        previousIp: session.ipLastSeen,
                        newIp: ctx.ip,
                    },
                },
            });
        }
        const newTokens = await this.generateTokens({
            sub: user.id,
            phone: user.phone,
            role: user.role,
            sessionId: session.id,
        });
        const newRefreshHash = this.hashToken(newTokens.refreshToken);
        await this.prisma.userSession.update({
            where: { id: session.id },
            data: {
                refreshTokenHash: newRefreshHash,
                lastSeenAt: new Date(),
                ipLastSeen: ctx.ip || session.ipLastSeen,
            },
        });
        await this.prisma.sessionEvent.create({
            data: {
                sessionId: session.id,
                eventType: client_1.SessionEventType.REFRESH,
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
    async logout(refreshToken, sessionId) {
        let session = null;
        if (refreshToken) {
            const hash = this.hashToken(refreshToken);
            session = await this.prisma.userSession.findFirst({
                where: { refreshTokenHash: hash, status: client_1.SessionStatus.ACTIVE },
            });
        }
        if (!session && sessionId) {
            session = await this.prisma.userSession.findFirst({
                where: { id: sessionId, status: client_1.SessionStatus.ACTIVE },
            });
        }
        if (!session)
            return { message: 'Logged out' };
        await this.prisma.userSession.update({
            where: { id: session.id },
            data: { status: client_1.SessionStatus.REVOKED, revokedAt: new Date() },
        });
        await this.prisma.sessionEvent.create({
            data: {
                sessionId: session.id,
                eventType: client_1.SessionEventType.LOGOUT,
            },
        });
        return { message: 'Logged out successfully' };
    }
    async logoutAllDevices(userId) {
        await this.revokeAllUserSessions(userId);
        return { message: 'All sessions revoked' };
    }
    async getActiveSessions(userId) {
        return this.prisma.userSession.findMany({
            where: { userId, status: client_1.SessionStatus.ACTIVE },
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
    async revokeSession(userId, sessionId) {
        const session = await this.prisma.userSession.findFirst({
            where: { id: sessionId, userId, status: client_1.SessionStatus.ACTIVE },
        });
        if (!session) {
            throw new common_1.BadRequestException('Session not found or already revoked');
        }
        await this.prisma.userSession.update({
            where: { id: sessionId },
            data: { status: client_1.SessionStatus.REVOKED, revokedAt: new Date() },
        });
        await this.prisma.sessionEvent.create({
            data: {
                sessionId,
                eventType: client_1.SessionEventType.FORCED_LOGOUT,
                metadata: { reason: 'manual_revoke_by_user' },
            },
        });
        return { message: 'Session revoked' };
    }
    async validateSession(userId, sessionId) {
        if (!sessionId)
            return false;
        const session = await this.prisma.userSession.findFirst({
            where: {
                id: sessionId,
                userId,
                status: client_1.SessionStatus.ACTIVE,
            },
        });
        return !!session;
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService,
        jwt_1.JwtService,
        config_1.ConfigService,
        telegram_service_js_1.TelegramService])
], AuthService);
//# sourceMappingURL=auth.service.js.map