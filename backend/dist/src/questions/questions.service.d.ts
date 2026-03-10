import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service.js';
import { QuestionStatus, Role } from '@prisma/client';
import { CreateQuestionDto, UpdateQuestionDto, GenerateQuizFromQADto } from './dto/index.js';
export declare class QuestionsService {
    private prisma;
    private configService;
    private readonly logger;
    constructor(prisma: PrismaService, configService: ConfigService);
    create(dto: CreateQuestionDto, userId: string, userRole: Role, imagePath?: string): Promise<{
        subject: {
            name: string;
            id: string;
        };
        createdBy: {
            id: string;
            firstName: string;
            lastName: string;
            role: import("@prisma/client").$Enums.Role;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.QuestionStatus;
        subjectId: string;
        questionText: string;
        answerText: string;
        imagePath: string | null;
        createdById: string;
    }>;
    findAll(page?: number, limit?: number, filters?: {
        subjectId?: string;
        status?: QuestionStatus;
        createdById?: string;
        search?: string;
    }): Promise<{
        data: ({
            subject: {
                name: string;
                id: string;
            };
            createdBy: {
                id: string;
                firstName: string;
                lastName: string;
                role: import("@prisma/client").$Enums.Role;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.QuestionStatus;
            subjectId: string;
            questionText: string;
            answerText: string;
            imagePath: string | null;
            createdById: string;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    findOne(id: string): Promise<{
        subject: {
            name: string;
            id: string;
        };
        createdBy: {
            id: string;
            firstName: string;
            lastName: string;
            role: import("@prisma/client").$Enums.Role;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.QuestionStatus;
        subjectId: string;
        questionText: string;
        answerText: string;
        imagePath: string | null;
        createdById: string;
    }>;
    update(id: string, dto: UpdateQuestionDto, userId: string, userRole: Role, imagePath?: string): Promise<{
        subject: {
            name: string;
            id: string;
        };
        createdBy: {
            id: string;
            firstName: string;
            lastName: string;
            role: import("@prisma/client").$Enums.Role;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.QuestionStatus;
        subjectId: string;
        questionText: string;
        answerText: string;
        imagePath: string | null;
        createdById: string;
    }>;
    remove(id: string, userId: string, userRole: Role): Promise<{
        message: string;
    }>;
    review(id: string, status: QuestionStatus): Promise<{
        subject: {
            name: string;
            id: string;
        };
        createdBy: {
            id: string;
            firstName: string;
            lastName: string;
            role: import("@prisma/client").$Enums.Role;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.QuestionStatus;
        subjectId: string;
        questionText: string;
        answerText: string;
        imagePath: string | null;
        createdById: string;
    }>;
    generateQuizFromQA(dto: GenerateQuizFromQADto): Promise<{
        message: string;
        quiz: ({
            subject: {
                name: string;
                id: string;
            };
            _count: {
                questions: number;
            };
        } & {
            title: string;
            description: string | null;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            subjectId: string;
            materialId: string | null;
            isPublished: boolean;
        }) | null;
    }>;
    private callGeminiForMCQs;
    getStatusCounts(subjectId?: string): Promise<{
        pending: number;
        approved: number;
        rejected: number;
        total: number;
    }>;
    getSubjectCounts(): Promise<{
        subjectId: string;
        subjectName: string;
        subjectDescription: string | null;
        questionCount: number;
    }[]>;
}
