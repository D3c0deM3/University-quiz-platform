import { PrismaService } from '../prisma/prisma.service.js';
import { CreateSubjectDto, UpdateSubjectDto } from './dto/index.js';
export declare class SubjectsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(dto: CreateSubjectDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        code: string | null;
    }>;
    findAll(page?: number, limit?: number, search?: string): Promise<{
        data: ({
            _count: {
                materials: number;
                quizzes: number;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string | null;
            code: string | null;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    findOne(id: string): Promise<{
        _count: {
            materials: number;
            quizzes: number;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        code: string | null;
    }>;
    update(id: string, dto: UpdateSubjectDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        code: string | null;
    }>;
    remove(id: string): Promise<{
        message: string;
    }>;
}
