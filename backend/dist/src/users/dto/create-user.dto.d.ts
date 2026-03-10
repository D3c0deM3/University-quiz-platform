import { Role } from '@prisma/client';
export declare class CreateUserDto {
    phone: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: Role;
}
