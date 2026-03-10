import { Role } from '@prisma/client';
export declare class UpdateUserDto {
    email?: string;
    phone?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    role?: Role;
    isActive?: boolean;
}
