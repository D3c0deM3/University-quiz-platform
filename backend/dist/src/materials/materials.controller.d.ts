import { Queue } from 'bullmq';
import { MaterialsService } from './materials.service.js';
import { Role, MaterialStatus } from '@prisma/client';
import { SubscriptionsService } from '../subscriptions/subscriptions.service.js';
import { UpdateMetadataDto } from './dto/update-metadata.dto.js';
import { UpdateQuizDto } from './dto/update-quiz.dto.js';
import { CreateQuizQuestionDto, UpdateSingleQuestionDto } from './dto/quiz-question.dto.js';
export declare class MaterialsController {
    private materialsService;
    private processingQueue;
    private subscriptionsService;
    constructor(materialsService: MaterialsService, processingQueue: Queue, subscriptionsService: SubscriptionsService);
    upload(file: Express.Multer.File, subjectId: string, userId: string): Promise<{
        message: string;
        material: {
            subject: {
                name: string;
                id: string;
            };
            uploadedBy: {
                id: string;
                email: string;
                firstName: string;
                lastName: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            fileName: string;
            originalName: string;
            filePath: string;
            fileType: string;
            fileSize: number;
            status: import("@prisma/client").$Enums.MaterialStatus;
            errorMessage: string | null;
            subjectId: string;
            uploadedById: string;
        };
    }>;
    findAll(page: number, limit: number, status?: MaterialStatus, subjectId?: string, userId?: string, role?: Role): Promise<{
        data: ({
            subject: {
                name: string;
                id: string;
            };
            uploadedBy: {
                id: string;
                email: string;
                firstName: string;
                lastName: string;
            };
            metadata: {
                title: string | null;
                summary: string | null;
                keywords: string[];
                tags: string[];
            } | null;
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            fileName: string;
            originalName: string;
            filePath: string;
            fileType: string;
            fileSize: number;
            status: import("@prisma/client").$Enums.MaterialStatus;
            errorMessage: string | null;
            subjectId: string;
            uploadedById: string;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    findOne(id: string, userId: string, role: Role): Promise<{
        subject: {
            description: string | null;
            name: string;
            id: string;
            code: string | null;
            createdAt: Date;
            updatedAt: Date;
        };
        uploadedBy: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        };
        metadata: {
            title: string | null;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            materialId: string;
            summary: string | null;
            keywords: string[];
            topics: string[];
            tags: string[];
            difficultyLevel: import("@prisma/client").$Enums.DifficultyLevel | null;
            contentType: string | null;
        } | null;
        textChunks: {
            id: string;
            createdAt: Date;
            materialId: string;
            chunkIndex: number;
            content: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        fileName: string;
        originalName: string;
        filePath: string;
        fileType: string;
        fileSize: number;
        status: import("@prisma/client").$Enums.MaterialStatus;
        errorMessage: string | null;
        subjectId: string;
        uploadedById: string;
    }>;
    remove(id: string): Promise<{
        message: string;
    }>;
    getMetadata(id: string): Promise<{
        title: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        materialId: string;
        summary: string | null;
        keywords: string[];
        topics: string[];
        tags: string[];
        difficultyLevel: import("@prisma/client").$Enums.DifficultyLevel | null;
        contentType: string | null;
    }>;
    updateMetadata(id: string, dto: UpdateMetadataDto): Promise<{
        title: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        materialId: string;
        summary: string | null;
        keywords: string[];
        topics: string[];
        tags: string[];
        difficultyLevel: import("@prisma/client").$Enums.DifficultyLevel | null;
        contentType: string | null;
    }>;
    getQuizzes(id: string): Promise<({
        _count: {
            attempts: number;
            questions: number;
        };
        questions: ({
            options: {
                id: string;
                createdAt: Date;
                orderIndex: number;
                questionId: string;
                optionText: string;
                isCorrect: boolean;
            }[];
        } & {
            explanation: string | null;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            orderIndex: number;
            quizId: string;
            questionText: string;
            questionType: import("@prisma/client").$Enums.QuestionType;
        })[];
    } & {
        title: string;
        description: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        subjectId: string;
        materialId: string | null;
        isPublished: boolean;
    })[]>;
    updateQuiz(quizId: string, dto: UpdateQuizDto): Promise<({
        questions: ({
            options: {
                id: string;
                createdAt: Date;
                orderIndex: number;
                questionId: string;
                optionText: string;
                isCorrect: boolean;
            }[];
        } & {
            explanation: string | null;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            orderIndex: number;
            quizId: string;
            questionText: string;
            questionType: import("@prisma/client").$Enums.QuestionType;
        })[];
    } & {
        title: string;
        description: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        subjectId: string;
        materialId: string | null;
        isPublished: boolean;
    }) | null>;
    deleteQuiz(quizId: string): Promise<{
        message: string;
    }>;
    reviewMaterial(id: string, body: {
        action: 'approve' | 'reject';
        reason?: string;
    }): Promise<{
        metadata: {
            title: string | null;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            materialId: string;
            summary: string | null;
            keywords: string[];
            topics: string[];
            tags: string[];
            difficultyLevel: import("@prisma/client").$Enums.DifficultyLevel | null;
            contentType: string | null;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        fileName: string;
        originalName: string;
        filePath: string;
        fileType: string;
        fileSize: number;
        status: import("@prisma/client").$Enums.MaterialStatus;
        errorMessage: string | null;
        subjectId: string;
        uploadedById: string;
    }>;
    publishMaterial(id: string, body: {
        publish: boolean;
    }): Promise<{
        metadata: {
            title: string | null;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            materialId: string;
            summary: string | null;
            keywords: string[];
            topics: string[];
            tags: string[];
            difficultyLevel: import("@prisma/client").$Enums.DifficultyLevel | null;
            contentType: string | null;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        fileName: string;
        originalName: string;
        filePath: string;
        fileType: string;
        fileSize: number;
        status: import("@prisma/client").$Enums.MaterialStatus;
        errorMessage: string | null;
        subjectId: string;
        uploadedById: string;
    }>;
    reprocessMaterial(id: string, userId: string): Promise<{
        message: string;
        material: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            fileName: string;
            originalName: string;
            filePath: string;
            fileType: string;
            fileSize: number;
            status: import("@prisma/client").$Enums.MaterialStatus;
            errorMessage: string | null;
            subjectId: string;
            uploadedById: string;
        };
    }>;
    createQuizQuestion(dto: CreateQuizQuestionDto): Promise<({
        options: {
            id: string;
            createdAt: Date;
            orderIndex: number;
            questionId: string;
            optionText: string;
            isCorrect: boolean;
        }[];
    } & {
        explanation: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        orderIndex: number;
        quizId: string;
        questionText: string;
        questionType: import("@prisma/client").$Enums.QuestionType;
    }) | null>;
    updateQuizQuestion(questionId: string, dto: UpdateSingleQuestionDto): Promise<({
        options: {
            id: string;
            createdAt: Date;
            orderIndex: number;
            questionId: string;
            optionText: string;
            isCorrect: boolean;
        }[];
    } & {
        explanation: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        orderIndex: number;
        quizId: string;
        questionText: string;
        questionType: import("@prisma/client").$Enums.QuestionType;
    }) | null>;
    deleteQuizQuestion(questionId: string): Promise<{
        message: string;
    }>;
    changeStatus(id: string, body: {
        status: MaterialStatus;
    }): Promise<{
        metadata: {
            title: string | null;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            materialId: string;
            summary: string | null;
            keywords: string[];
            topics: string[];
            tags: string[];
            difficultyLevel: import("@prisma/client").$Enums.DifficultyLevel | null;
            contentType: string | null;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        fileName: string;
        originalName: string;
        filePath: string;
        fileType: string;
        fileSize: number;
        status: import("@prisma/client").$Enums.MaterialStatus;
        errorMessage: string | null;
        subjectId: string;
        uploadedById: string;
    }>;
}
