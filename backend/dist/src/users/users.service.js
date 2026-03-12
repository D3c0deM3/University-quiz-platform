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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = __importStar(require("bcrypt"));
const crypto = __importStar(require("crypto"));
const prisma_service_js_1 = require("../prisma/prisma.service.js");
const client_1 = require("@prisma/client");
const MAX_ALLOWED_RECENT_DEVICES = 2;
const DEVICE_WINDOW_DAYS = 7;
let UsersService = class UsersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    isAutomatedUserAgent(userAgent) {
        if (!userAgent)
            return false;
        return /(curl|postmanruntime|insomnia|httpie|python-requests|wget|go-http-client|node-fetch)/i.test(userAgent);
    }
    shouldCountSession(session) {
        return !this.isAutomatedUserAgent(session.userAgent);
    }
    isMissingBlockedDevicesTable(error) {
        if (!error || typeof error !== 'object')
            return false;
        const e = error;
        if (e.code !== 'P2021')
            return false;
        const serialized = JSON.stringify(e.meta ?? e);
        return serialized.includes('blocked_devices');
    }
    async create(dto) {
        const existingByPhone = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
        if (existingByPhone)
            throw new common_1.ConflictException('Phone number already registered');
        const hashedPassword = await bcrypt.hash(dto.password, 10);
        const user = await this.prisma.user.create({
            data: {
                phone: dto.phone,
                password: hashedPassword,
                firstName: dto.firstName,
                lastName: dto.lastName,
                role: dto.role ?? client_1.Role.STUDENT,
            },
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
        return user;
    }
    async findAll(page = 1, limit = 20, role, search) {
        const skip = (page - 1) * limit;
        const where = {};
        if (role)
            where.role = role;
        if (search) {
            where.OR = [
                { phone: { contains: search, mode: 'insensitive' } },
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
            ];
        }
        const [users, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    phone: true,
                    firstName: true,
                    lastName: true,
                    role: true,
                    isActive: true,
                    createdAt: true,
                },
            }),
            this.prisma.user.count({ where }),
        ]);
        return {
            data: users,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async getSuspiciousUsers(page = 1, limit = 20, search) {
        const where = {};
        if (search) {
            where.OR = [
                { phone: { contains: search, mode: 'insensitive' } },
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
            ];
        }
        let users = [];
        try {
            users = await this.prisma.user.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    phone: true,
                    firstName: true,
                    lastName: true,
                    role: true,
                    isActive: true,
                    createdAt: true,
                    sessions: {
                        select: {
                            id: true,
                            fingerprintHash: true,
                            deviceName: true,
                            userAgent: true,
                            ipFirstSeen: true,
                            ipLastSeen: true,
                            status: true,
                            createdAt: true,
                            lastSeenAt: true,
                        },
                    },
                    blockedDevices: {
                        where: { isBlocked: true },
                        select: {
                            id: true,
                            fingerprintHash: true,
                            blockedAt: true,
                        },
                    },
                },
            });
        }
        catch (error) {
            if (!this.isMissingBlockedDevicesTable(error)) {
                throw error;
            }
            const fallbackUsers = await this.prisma.user.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    phone: true,
                    firstName: true,
                    lastName: true,
                    role: true,
                    isActive: true,
                    createdAt: true,
                    sessions: {
                        select: {
                            id: true,
                            fingerprintHash: true,
                            deviceName: true,
                            userAgent: true,
                            ipFirstSeen: true,
                            ipLastSeen: true,
                            status: true,
                            createdAt: true,
                            lastSeenAt: true,
                        },
                    },
                },
            });
            users = fallbackUsers.map((user) => ({
                ...user,
                blockedDevices: [],
            }));
        }
        const recentCutoff = new Date(Date.now() - DEVICE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
        const suspicious = users
            .map((user) => {
            const countableSessions = user.sessions.filter((session) => this.shouldCountSession(session));
            const countableRecentSessions = countableSessions.filter((session) => session.createdAt >= recentCutoff);
            const recentDeviceCount = this.countDistinctDevicesRelaxed(countableRecentSessions);
            const activeSessionCount = countableSessions.filter((session) => session.status === client_1.SessionStatus.ACTIVE).length;
            return {
                id: user.id,
                phone: user.phone,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                isActive: user.isActive,
                createdAt: user.createdAt,
                deviceCount: this.countDistinctDevicesRelaxed(countableSessions),
                recentDeviceCount,
                activeSessionCount,
                blockedDeviceCount: user.blockedDevices.length,
                autoBlocked: false,
            };
        })
            .filter((user) => {
            return (user.recentDeviceCount > MAX_ALLOWED_RECENT_DEVICES ||
                !user.isActive ||
                user.blockedDeviceCount > 0);
        });
        const start = (page - 1) * limit;
        const pagedData = suspicious.slice(start, start + limit);
        return {
            data: pagedData,
            meta: {
                total: suspicious.length,
                page,
                limit,
                totalPages: Math.ceil(suspicious.length / limit),
                maxAllowedDevices: MAX_ALLOWED_RECENT_DEVICES,
                deviceWindowDays: DEVICE_WINDOW_DAYS,
            },
        };
    }
    async getUserDevices(userId) {
        let user = null;
        try {
            user = await this.prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    phone: true,
                    firstName: true,
                    lastName: true,
                    isActive: true,
                    sessions: {
                        orderBy: { lastSeenAt: 'desc' },
                        select: {
                            id: true,
                            fingerprintHash: true,
                            deviceName: true,
                            userAgent: true,
                            ipFirstSeen: true,
                            ipLastSeen: true,
                            status: true,
                            createdAt: true,
                            lastSeenAt: true,
                        },
                    },
                    blockedDevices: {
                        where: { isBlocked: true },
                        select: {
                            fingerprintHash: true,
                            reason: true,
                            blockedAt: true,
                        },
                    },
                },
            });
        }
        catch (error) {
            if (!this.isMissingBlockedDevicesTable(error)) {
                throw error;
            }
            const fallbackUser = await this.prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    phone: true,
                    firstName: true,
                    lastName: true,
                    isActive: true,
                    sessions: {
                        orderBy: { lastSeenAt: 'desc' },
                        select: {
                            id: true,
                            fingerprintHash: true,
                            deviceName: true,
                            userAgent: true,
                            ipFirstSeen: true,
                            ipLastSeen: true,
                            status: true,
                            createdAt: true,
                            lastSeenAt: true,
                        },
                    },
                },
            });
            user = fallbackUser
                ? {
                    ...fallbackUser,
                    blockedDevices: [],
                }
                : null;
        }
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const blockedMap = new Map(user.blockedDevices.map((device) => [device.fingerprintHash, device]));
        const countableSessions = user.sessions.filter((session) => this.shouldCountSession(session));
        const devices = this.aggregateDevices(countableSessions).map((device) => {
            const blockedInfo = device.fingerprintHash
                ? blockedMap.get(device.fingerprintHash)
                : undefined;
            return {
                ...device,
                blocked: !!blockedInfo,
                blockedReason: blockedInfo?.reason || null,
                blockedAt: blockedInfo?.blockedAt || null,
            };
        });
        return {
            user: {
                id: user.id,
                phone: user.phone,
                firstName: user.firstName,
                lastName: user.lastName,
                isActive: user.isActive,
            },
            devices,
        };
    }
    async blockUserAccount(userId, blockedById, reason) {
        await this.findOne(userId);
        const activeSessions = await this.prisma.userSession.findMany({
            where: {
                userId,
                status: client_1.SessionStatus.ACTIVE,
            },
            select: { id: true },
        });
        if (activeSessions.length > 0) {
            await this.prisma.sessionEvent.createMany({
                data: activeSessions.map((session) => ({
                    sessionId: session.id,
                    eventType: client_1.SessionEventType.FORCED_LOGOUT,
                    metadata: {
                        reason: 'admin_blocked_account',
                        blockedById,
                        note: reason || null,
                    },
                })),
            });
            await this.prisma.userSession.updateMany({
                where: {
                    userId,
                    status: client_1.SessionStatus.ACTIVE,
                },
                data: {
                    status: client_1.SessionStatus.REVOKED,
                    revokedAt: new Date(),
                },
            });
        }
        const user = await this.prisma.user.update({
            where: { id: userId },
            data: { isActive: false },
            select: {
                id: true,
                phone: true,
                firstName: true,
                lastName: true,
                role: true,
                isActive: true,
            },
        });
        return {
            message: 'User account blocked successfully',
            user,
        };
    }
    async unblockUserAccount(userId) {
        await this.findOne(userId);
        const user = await this.prisma.user.update({
            where: { id: userId },
            data: { isActive: true },
            select: {
                id: true,
                phone: true,
                firstName: true,
                lastName: true,
                role: true,
                isActive: true,
            },
        });
        return {
            message: 'User account unblocked successfully',
            user,
        };
    }
    async blockDevice(userId, fingerprintRaw, blockedById, reason) {
        await this.findOne(userId);
        if (!fingerprintRaw?.trim()) {
            throw new common_1.BadRequestException('fingerprintHash is required');
        }
        const fingerprintHash = this.normalizeFingerprint(fingerprintRaw);
        const latestSession = await this.prisma.userSession.findFirst({
            where: { userId, fingerprintHash },
            orderBy: { lastSeenAt: 'desc' },
            select: { deviceName: true },
        });
        let blockedDevice;
        try {
            blockedDevice = await this.prisma.blockedDevice.upsert({
                where: {
                    userId_fingerprintHash: {
                        userId,
                        fingerprintHash,
                    },
                },
                update: {
                    isBlocked: true,
                    unblockedAt: null,
                    blockedAt: new Date(),
                    reason: reason || null,
                    blockedById,
                    deviceName: latestSession?.deviceName || null,
                },
                create: {
                    userId,
                    fingerprintHash,
                    deviceName: latestSession?.deviceName || null,
                    reason: reason || null,
                    blockedById,
                    isBlocked: true,
                },
            });
        }
        catch (error) {
            if (this.isMissingBlockedDevicesTable(error)) {
                throw new common_1.BadRequestException('Device blocking is unavailable until blocked_devices migration is applied');
            }
            throw error;
        }
        const activeSessions = await this.prisma.userSession.findMany({
            where: {
                userId,
                fingerprintHash,
                status: client_1.SessionStatus.ACTIVE,
            },
            select: { id: true },
        });
        if (activeSessions.length > 0) {
            await this.prisma.sessionEvent.createMany({
                data: activeSessions.map((session) => ({
                    sessionId: session.id,
                    eventType: client_1.SessionEventType.FORCED_LOGOUT,
                    metadata: {
                        reason: 'admin_blocked_device',
                        blockedById,
                    },
                })),
            });
            await this.prisma.userSession.updateMany({
                where: {
                    userId,
                    fingerprintHash,
                    status: client_1.SessionStatus.ACTIVE,
                },
                data: {
                    status: client_1.SessionStatus.REVOKED,
                    revokedAt: new Date(),
                },
            });
        }
        return {
            message: 'Device blocked successfully',
            blockedDevice,
        };
    }
    async unblockDevice(userId, fingerprintRaw) {
        await this.findOne(userId);
        if (!fingerprintRaw?.trim()) {
            throw new common_1.BadRequestException('fingerprintHash is required');
        }
        const fingerprintHash = this.normalizeFingerprint(fingerprintRaw);
        let existing = null;
        try {
            existing = await this.prisma.blockedDevice.findUnique({
                where: {
                    userId_fingerprintHash: {
                        userId,
                        fingerprintHash,
                    },
                },
                select: { id: true },
            });
        }
        catch (error) {
            if (this.isMissingBlockedDevicesTable(error)) {
                throw new common_1.BadRequestException('Device unblocking is unavailable until blocked_devices migration is applied');
            }
            throw error;
        }
        if (!existing) {
            throw new common_1.NotFoundException('Blocked device not found');
        }
        let blockedDevice;
        try {
            blockedDevice = await this.prisma.blockedDevice.update({
                where: {
                    userId_fingerprintHash: {
                        userId,
                        fingerprintHash,
                    },
                },
                data: {
                    isBlocked: false,
                    unblockedAt: new Date(),
                },
            });
        }
        catch (error) {
            if (this.isMissingBlockedDevicesTable(error)) {
                throw new common_1.BadRequestException('Device unblocking is unavailable until blocked_devices migration is applied');
            }
            throw error;
        }
        return {
            message: 'Device unblocked successfully',
            blockedDevice,
        };
    }
    async findOne(id) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                phone: true,
                firstName: true,
                lastName: true,
                role: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return user;
    }
    async update(id, dto) {
        await this.findOne(id);
        const data = { ...dto };
        if (dto.password) {
            data.password = await bcrypt.hash(dto.password, 10);
        }
        const user = await this.prisma.user.update({
            where: { id },
            data,
            select: {
                id: true,
                phone: true,
                firstName: true,
                lastName: true,
                role: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        return user;
    }
    async remove(id) {
        await this.findOne(id);
        await this.prisma.user.delete({ where: { id } });
        return { message: 'User deleted successfully' };
    }
    async assignRole(id, dto) {
        await this.findOne(id);
        const user = await this.prisma.user.update({
            where: { id },
            data: { role: dto.role },
            select: {
                id: true,
                phone: true,
                firstName: true,
                lastName: true,
                role: true,
            },
        });
        return user;
    }
    normalizeFingerprint(fingerprintRaw) {
        const normalized = fingerprintRaw.trim();
        if (/^[a-f0-9]{64}$/i.test(normalized)) {
            return normalized.toLowerCase();
        }
        return crypto.createHash('sha256').update(normalized).digest('hex');
    }
    aggregateDevices(sessions) {
        const byDevice = new Map();
        for (const session of sessions) {
            const deviceKey = this.getDeviceKey(session);
            const existing = byDevice.get(deviceKey);
            if (!existing) {
                byDevice.set(deviceKey, {
                    deviceKey,
                    fingerprintHash: session.fingerprintHash,
                    deviceName: session.deviceName,
                    userAgent: session.userAgent,
                    firstSeenAt: session.createdAt,
                    lastSeenAt: session.lastSeenAt,
                    lastIp: session.ipLastSeen || session.ipFirstSeen,
                    totalSessions: 1,
                    activeSessions: session.status === client_1.SessionStatus.ACTIVE ? 1 : 0,
                });
                continue;
            }
            existing.totalSessions += 1;
            if (session.status === client_1.SessionStatus.ACTIVE) {
                existing.activeSessions += 1;
            }
            if (session.createdAt < existing.firstSeenAt) {
                existing.firstSeenAt = session.createdAt;
            }
            if (session.lastSeenAt > existing.lastSeenAt) {
                existing.lastSeenAt = session.lastSeenAt;
                existing.lastIp = session.ipLastSeen || session.ipFirstSeen;
            }
            if (!existing.deviceName && session.deviceName) {
                existing.deviceName = session.deviceName;
            }
            if (!existing.userAgent && session.userAgent) {
                existing.userAgent = session.userAgent;
            }
            if (!existing.fingerprintHash && session.fingerprintHash) {
                existing.fingerprintHash = session.fingerprintHash;
            }
        }
        return Array.from(byDevice.values()).sort((a, b) => b.lastSeenAt.getTime() - a.lastSeenAt.getTime());
    }
    getDeviceKey(session) {
        if (session.fingerprintHash) {
            return `fp:${session.fingerprintHash}`;
        }
        const fallback = `${session.deviceName || 'unknown'}|${session.userAgent || 'unknown'}|${session.ipFirstSeen || 'unknown'}`;
        return `legacy:${fallback}`;
    }
    countDistinctDevicesRelaxed(sessions) {
        const signatures = new Set();
        for (const session of sessions) {
            signatures.add(this.getRelaxedDeviceSignature(session));
        }
        return signatures.size;
    }
    getRelaxedDeviceSignature(session) {
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
    normalizeUserAgent(userAgent) {
        if (!userAgent)
            return '';
        return userAgent
            .toLowerCase()
            .replace(/[0-9._]+/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 120);
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map