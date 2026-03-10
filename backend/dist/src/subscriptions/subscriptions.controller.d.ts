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
    checkAccess(userId: string, role: Role, subjectId: string): Promise<{
        hasAccess: boolean;
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
        createdAt: Date;
        updatedAt: Date;
        expiresAt: Date | null;
        userId: string;
        status: import("@prisma/client").$Enums.SubscriptionStatus;
        subjectId: string;
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
        createdAt: Date;
        updatedAt: Date;
        expiresAt: Date | null;
        userId: string;
        status: import("@prisma/client").$Enums.SubscriptionStatus;
        subjectId: string;
    }>;
}
