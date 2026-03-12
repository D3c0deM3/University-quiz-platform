import { PrismaService } from '../prisma/prisma.service.js';
import { CreateUserDto, UpdateUserDto, AssignRoleDto } from './dto/index.js';
import { Role } from '@prisma/client';
export declare class UsersService {
    private prisma;
    constructor(prisma: PrismaService);
    private isAutomatedUserAgent;
    private shouldCountSession;
    private isMissingBlockedDevicesTable;
    create(dto: CreateUserDto): Promise<{
        id: string;
        phone: string;
        firstName: string;
        lastName: string;
        role: import("@prisma/client").$Enums.Role;
        isActive: boolean;
        createdAt: Date;
    }>;
    findAll(page?: number, limit?: number, role?: Role, search?: string): Promise<{
        data: {
            id: string;
            phone: string;
            firstName: string;
            lastName: string;
            role: import("@prisma/client").$Enums.Role;
            isActive: boolean;
            createdAt: Date;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getSuspiciousUsers(page?: number, limit?: number, search?: string): Promise<{
        data: {
            id: string;
            phone: string;
            firstName: string;
            lastName: string;
            role: import("@prisma/client").$Enums.Role;
            isActive: boolean;
            createdAt: Date;
            deviceCount: number;
            recentDeviceCount: number;
            activeSessionCount: number;
            blockedDeviceCount: number;
            autoBlocked: boolean;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
            maxAllowedDevices: number;
            deviceWindowDays: number;
        };
    }>;
    getUserDevices(userId: string): Promise<{
        user: {
            id: string;
            phone: string;
            firstName: string;
            lastName: string;
            isActive: boolean;
        };
        devices: {
            blocked: boolean;
            blockedReason: string | null;
            blockedAt: Date | null;
            deviceKey: string;
            fingerprintHash: string | null;
            deviceName: string | null;
            userAgent: string | null;
            firstSeenAt: Date;
            lastSeenAt: Date;
            lastIp: string | null;
            totalSessions: number;
            activeSessions: number;
        }[];
    }>;
    blockUserAccount(userId: string, blockedById: string, reason?: string): Promise<{
        message: string;
        user: {
            id: string;
            phone: string;
            firstName: string;
            lastName: string;
            role: import("@prisma/client").$Enums.Role;
            isActive: boolean;
        };
    }>;
    unblockUserAccount(userId: string): Promise<{
        message: string;
        user: {
            id: string;
            phone: string;
            firstName: string;
            lastName: string;
            role: import("@prisma/client").$Enums.Role;
            isActive: boolean;
        };
    }>;
    blockDevice(userId: string, fingerprintRaw: string, blockedById: string, reason?: string): Promise<{
        message: string;
        blockedDevice: any;
    }>;
    unblockDevice(userId: string, fingerprintRaw: string): Promise<{
        message: string;
        blockedDevice: any;
    }>;
    findOne(id: string): Promise<{
        id: string;
        phone: string;
        firstName: string;
        lastName: string;
        role: import("@prisma/client").$Enums.Role;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    update(id: string, dto: UpdateUserDto): Promise<{
        id: string;
        phone: string;
        firstName: string;
        lastName: string;
        role: import("@prisma/client").$Enums.Role;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    remove(id: string): Promise<{
        message: string;
    }>;
    assignRole(id: string, dto: AssignRoleDto): Promise<{
        id: string;
        phone: string;
        firstName: string;
        lastName: string;
        role: import("@prisma/client").$Enums.Role;
    }>;
    private normalizeFingerprint;
    private aggregateDevices;
    private getDeviceKey;
    private countDistinctDevicesRelaxed;
    private getRelaxedDeviceSignature;
    private normalizeUserAgent;
}
