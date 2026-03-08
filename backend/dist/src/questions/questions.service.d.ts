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
            id: string;
            name: string;
        };
        createdBy: {
            id: string;
            firstName: string;
            lastName: string;
            role: import("@prisma/client").$Enums.Role;
        };
    } & {
        id: string;
        questionText: string;
        answerText: string;
        imagePath: string | null;
        status: import("@prisma/client").$Enums.QuestionStatus;
        createdAt: Date;
        updatedAt: Date;
        subjectId: string;
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
                id: string;
                name: string;
            };
            createdBy: {
                id: string;
                firstName: string;
                lastName: string;
                role: import("@prisma/client").$Enums.Role;
            };
        } & {
            id: string;
            questionText: string;
            answerText: string;
            imagePath: string | null;
            status: import("@prisma/client").$Enums.QuestionStatus;
            createdAt: Date;
            updatedAt: Date;
            subjectId: string;
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
            id: string;
            name: string;
        };
        createdBy: {
            id: string;
            firstName: string;
            lastName: string;
            role: import("@prisma/client").$Enums.Role;
        };
    } & {
        id: string;
        questionText: string;
        answerText: string;
        imagePath: string | null;
        status: import("@prisma/client").$Enums.QuestionStatus;
        createdAt: Date;
        updatedAt: Date;
        subjectId: string;
        createdById: string;
    }>;
    update(id: string, dto: UpdateQuestionDto, userId: string, userRole: Role, imagePath?: string): Promise<{
        subject: {
            id: string;
            name: string;
        };
        createdBy: {
            id: string;
            firstName: string;
            lastName: string;
            role: import("@prisma/client").$Enums.Role;
        };
    } & {
        id: string;
        questionText: string;
        answerText: string;
        imagePath: string | null;
        status: import("@prisma/client").$Enums.QuestionStatus;
        createdAt: Date;
        updatedAt: Date;
        subjectId: string;
        createdById: string;
    }>;
    remove(id: string, userId: string, userRole: Role): Promise<{
        message: string;
    }>;
    review(id: string, status: QuestionStatus): Promise<{
        subject: {
            id: string;
            name: string;
        };
        createdBy: {
            id: string;
            firstName: string;
            lastName: string;
            role: import("@prisma/client").$Enums.Role;
        };
    } & {
        id: string;
        questionText: string;
        answerText: string;
        imagePath: string | null;
        status: import("@prisma/client").$Enums.QuestionStatus;
        createdAt: Date;
        updatedAt: Date;
        subjectId: string;
        createdById: string;
    }>;
    generateQuizFromQA(dto: GenerateQuizFromQADto): Promise<{
        message: string;
        quiz: ({
            subject: {
                id: string;
                name: string;
            };
            _count: {
                questions: number;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            subjectId: string;
            description: string | null;
            title: string;
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
