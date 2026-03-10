import { PrismaService } from '../prisma/prisma.service.js';
import { SubscriptionStatus } from '@prisma/client';
import { AssignSubscriptionDto, BulkAssignDto, UpdateSubscriptionDto } from './dto/index.js';
export declare class SubscriptionsService {
    private prisma;
    constructor(prisma: PrismaService);
    assign(dto: AssignSubscriptionDto): Promise<{
        user: {
            id: string;
            phone: string;
            firstName: string;
            lastName: string;
        };
        subject: {
            id: string;
            name: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        expiresAt: Date | null;
        userId: string;
        status: import("@prisma/client").$Enums.SubscriptionStatus;
        subjectId: string;
    }>;
    bulkAssign(dto: BulkAssignDto): Promise<({
        user: {
            id: string;
            phone: string;
            firstName: string;
            lastName: string;
        };
        subject: {
            id: string;
            name: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        expiresAt: Date | null;
        userId: string;
        status: import("@prisma/client").$Enums.SubscriptionStatus;
        subjectId: string;
    })[]>;
    revoke(subscriptionId: string): Promise<{
        user: {
            id: string;
            phone: string;
            firstName: string;
            lastName: string;
        };
        subject: {
            id: string;
            name: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        expiresAt: Date | null;
        userId: string;
        status: import("@prisma/client").$Enums.SubscriptionStatus;
        subjectId: string;
    }>;
    update(subscriptionId: string, dto: UpdateSubscriptionDto): Promise<{
        user: {
            id: string;
            phone: string;
            firstName: string;
            lastName: string;
        };
        subject: {
            id: string;
            name: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        expiresAt: Date | null;
        userId: string;
        status: import("@prisma/client").$Enums.SubscriptionStatus;
        subjectId: string;
    }>;
    findAll(page?: number, limit?: number, userId?: string, subjectId?: string, status?: SubscriptionStatus): Promise<{
        data: ({
            user: {
                id: string;
                phone: string;
                firstName: string;
                lastName: string;
                role: import("@prisma/client").$Enums.Role;
            };
            subject: {
                id: string;
                name: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            expiresAt: Date | null;
            userId: string;
            status: import("@prisma/client").$Enums.SubscriptionStatus;
            subjectId: string;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    findByUser(userId: string): Promise<({
        subject: {
            id: string;
            name: string;
            code: string | null;
            description: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        expiresAt: Date | null;
        userId: string;
        status: import("@prisma/client").$Enums.SubscriptionStatus;
        subjectId: string;
    })[]>;
    getMySubscriptions(userId: string): Promise<{
        subscriptions: ({
            subject: {
                id: string;
                name: string;
                code: string | null;
                description: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            expiresAt: Date | null;
            userId: string;
            status: import("@prisma/client").$Enums.SubscriptionStatus;
            subjectId: string;
        })[];
        subjectIds: string[];
    }>;
    hasAccess(userId: string, subjectId: string): Promise<boolean>;
}
