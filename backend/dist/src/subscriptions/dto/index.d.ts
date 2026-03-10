import { SubscriptionStatus } from '@prisma/client';
export declare class AssignSubscriptionDto {
    userId: string;
    subjectId: string;
    expiresAt?: string;
}
export declare class BulkAssignDto {
    userId: string;
    subjectIds: string[];
    expiresAt?: string;
}
export declare class UpdateSubscriptionDto {
    status?: SubscriptionStatus;
    expiresAt?: string;
}
