import { Role } from '@prisma/client';
export declare class UpdateUserDto {
    phone?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    role?: Role;
    isActive?: boolean;
}
