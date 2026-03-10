import { SubscriptionsService } from './subscriptions.service.js';
import { Role, SubscriptionStatus } from '@prisma/client';
import { AssignSubscriptionDto, BulkAssignDto, UpdateSubscriptionDto } from './dto/index.js';
export declare class SubscriptionsController {
    private subscriptionsService;
    constructor(subscriptionsService: SubscriptionsService);
    assign(dto: AssignSubscriptionDto): Promise<{
        user: {
            id: string;
            phone: string | null;
            email: string;
            firstName: string;
            lastName: string;
        };
        subject: {
            name: string;
            id: string;
        };
    } & {
        id: string;
        expiresAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.SubscriptionStatus;
        subjectId: string;
        userId: string;
    }>;
    bulkAssign(dto: BulkAssignDto): Promise<({
        user: {
            id: string;
            phone: string | null;
            email: string;
            firstName: string;
            lastName: string;
        };
        subject: {
            name: string;
            id: string;
        };
    } & {
        id: string;
        expiresAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.SubscriptionStatus;
        subjectId: string;
        userId: string;
    })[]>;
    findAll(page: number, limit: number, userId?: string, subjectId?: string, status?: SubscriptionStatus): Promise<{
        data: ({
            user: {
                id: string;
                phone: string | null;
                email: string;
                firstName: string;
                lastName: string;
                role: import("@prisma/client").$Enums.Role;
            };
            subject: {
                name: string;
                id: string;
            };
        } & {
            id: string;
            expiresAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.SubscriptionStatus;
            subjectId: string;
            userId: string;
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
            description: string | null;
            name: string;
            id: string;
            code: string | null;
        };
    } & {
        id: string;
        expiresAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.SubscriptionStatus;
        subjectId: string;
        userId: string;
    })[]>;
    getMySubscriptions(userId: string): Promise<{
        subscriptions: ({
            subject: {
                description: string | null;
                name: string;
                id: string;
                code: string | null;
            };
        } & {
            id: string;
            expiresAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.SubscriptionStatus;
            subjectId: string;
            userId: string;
        })[];
        subjectIds: string[];
    }>;
    checkAccess(userId: string, role: Role, subjectId: string): Promise<{
        hasAccess: boolean;
    }>;
    update(id: string, dto: UpdateSubscriptionDto): Promise<{
        user: {
            id: string;
            phone: string | null;
            email: string;
            firstName: string;
            lastName: string;
        };
        subject: {
            name: string;
            id: string;
        };
    } & {
        id: string;
        expiresAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.SubscriptionStatus;
        subjectId: string;
        userId: string;
    }>;
    revoke(id: string): Promise<{
        user: {
            id: string;
            phone: string | null;
            email: string;
            firstName: string;
            lastName: string;
        };
        subject: {
            name: string;
            id: string;
        };
    } & {
        id: string;
        expiresAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.SubscriptionStatus;
        subjectId: string;
        userId: string;
    }>;
}
