import { SubscriptionsService } from './subscriptions.service.js';
import { Role, SubscriptionStatus } from '@prisma/client';
import { AssignSubscriptionDto, BulkAssignDto, UpdateSubscriptionDto } from './dto/index.js';
export declare class SubscriptionsController {
    private subscriptionsService;
    constructor(subscriptionsService: SubscriptionsService);
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
        userId: string;
        subjectId: string;
        status: import("@prisma/client").$Enums.SubscriptionStatus;
        expiresAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
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
        userId: string;
        subjectId: string;
        status: import("@prisma/client").$Enums.SubscriptionStatus;
        expiresAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    })[]>;
    findAll(page: number, limit: number, userId?: string, subjectId?: string, status?: SubscriptionStatus): Promise<{
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
            userId: string;
            subjectId: string;
            status: import("@prisma/client").$Enums.SubscriptionStatus;
            expiresAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
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
        userId: string;
        subjectId: string;
        status: import("@prisma/client").$Enums.SubscriptionStatus;
        expiresAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    })[]>;
    getMySubscriptions(userId: string, role: Role): Promise<{
        subscriptions: ({
            subject: {
                id: string;
                name: string;
                description: string | null;
                code: string | null;
            };
        } & {
            id: string;
            userId: string;
            subjectId: string;
            status: import("@prisma/client").$Enums.SubscriptionStatus;
            expiresAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
        })[];
        subjectIds: string[];
    } | {
        trialAvailable: boolean;
        subscriptions: ({
            subject: {
                id: string;
                name: string;
                description: string | null;
                code: string | null;
            };
        } & {
            id: string;
            userId: string;
            subjectId: string;
            status: import("@prisma/client").$Enums.SubscriptionStatus;
            expiresAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
        })[];
        subjectIds: string[];
    }>;
    checkAccess(userId: string, role: Role, subjectId: string): Promise<{
        hasAccess: boolean;
        isTrial: boolean;
        trialUsed: boolean;
    }>;
    trialStatus(userId: string, role: Role): Promise<{
        trialAvailable: boolean;
        trialUsed: boolean;
    }>;
    update(id: string, dto: UpdateSubscriptionDto): Promise<{
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
        userId: string;
        subjectId: string;
        status: import("@prisma/client").$Enums.SubscriptionStatus;
        expiresAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    revoke(id: string): Promise<{
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
        userId: string;
        subjectId: string;
        status: import("@prisma/client").$Enums.SubscriptionStatus;
        expiresAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
