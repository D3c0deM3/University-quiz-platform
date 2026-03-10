import { PrismaService } from '../prisma/prisma.service.js';
import { CreateUserDto, UpdateUserDto, AssignRoleDto } from './dto/index.js';
import { Role } from '@prisma/client';
export declare class UsersService {
    private prisma;
    constructor(prisma: PrismaService);
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
}
