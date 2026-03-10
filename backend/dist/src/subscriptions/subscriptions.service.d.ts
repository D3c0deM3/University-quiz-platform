import { PrismaService } from '../prisma/prisma.service.js';
import { SubscriptionStatus } from '@prisma/client';
import { AssignSubscriptionDto, BulkAssignDto, UpdateSubscriptionDto } from './dto/index.js';
export declare class SubscriptionsService {
    private prisma;
    constructor(prisma: PrismaService);
    assign(dto: AssignSubscriptionDto): Promise<{
        user: {
            phone: string;
            firstName: string;
            lastName: string;
            id: string;
        };
        subject: {
            id: string;
            name: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.SubscriptionStatus;
        subjectId: string;
        userId: string;
        expiresAt: Date | null;
    }>;
    bulkAssign(dto: BulkAssignDto): Promise<({
        user: {
            phone: string;
            firstName: string;
            lastName: string;
            id: string;
        };
        subject: {
            id: string;
            name: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.SubscriptionStatus;
        subjectId: string;
        userId: string;
        expiresAt: Date | null;
    })[]>;
    revoke(subscriptionId: string): Promise<{
        user: {
            phone: string;
            firstName: string;
            lastName: string;
            id: string;
        };
        subject: {
            id: string;
            name: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.SubscriptionStatus;
        subjectId: string;
        userId: string;
        expiresAt: Date | null;
    }>;
    update(subscriptionId: string, dto: UpdateSubscriptionDto): Promise<{
        user: {
            phone: string;
            firstName: string;
            lastName: string;
            id: string;
        };
        subject: {
            id: string;
            name: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.SubscriptionStatus;
        subjectId: string;
        userId: string;
        expiresAt: Date | null;
    }>;
    findAll(page?: number, limit?: number, userId?: string, subjectId?: string, status?: SubscriptionStatus): Promise<{
        data: ({
            user: {
                phone: string;
                firstName: string;
                lastName: string;
                id: string;
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
            status: import("@prisma/client").$Enums.SubscriptionStatus;
            subjectId: string;
            userId: string;
            expiresAt: Date | null;
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
            description: string | null;
            code: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.SubscriptionStatus;
        subjectId: string;
        userId: string;
        expiresAt: Date | null;
    })[]>;
    getMySubscriptions(userId: string): Promise<{
        subscriptions: ({
            subject: {
                id: string;
                name: string;
                description: string | null;
                code: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.SubscriptionStatus;
            subjectId: string;
            userId: string;
            expiresAt: Date | null;
        })[];
        subjectIds: string[];
    }>;
    hasAccess(userId: string, subjectId: string): Promise<boolean>;
}
