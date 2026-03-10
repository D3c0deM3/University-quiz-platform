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
                id: string;
                name: string;
            };
            uploadedBy: {
                id: string;
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
                id: string;
                name: string;
            };
            uploadedBy: {
                id: string;
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
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            code: string | null;
            description: string | null;
        };
        uploadedBy: {
            id: string;
            firstName: string;
            lastName: string;
        };
        metadata: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            title: string | null;
            summary: string | null;
            keywords: string[];
            topics: string[];
            tags: string[];
            difficultyLevel: import("@prisma/client").$Enums.DifficultyLevel | null;
            contentType: string | null;
            materialId: string;
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
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string | null;
        summary: string | null;
        keywords: string[];
        topics: string[];
        tags: string[];
        difficultyLevel: import("@prisma/client").$Enums.DifficultyLevel | null;
        contentType: string | null;
        materialId: string;
    }>;
    updateMetadata(id: string, dto: UpdateMetadataDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string | null;
        summary: string | null;
        keywords: string[];
        topics: string[];
        tags: string[];
        difficultyLevel: import("@prisma/client").$Enums.DifficultyLevel | null;
        contentType: string | null;
        materialId: string;
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
                optionText: string;
                isCorrect: boolean;
                orderIndex: number;
                questionId: string;
            }[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            explanation: string | null;
            orderIndex: number;
            questionText: string;
            questionType: import("@prisma/client").$Enums.QuestionType;
            quizId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        description: string | null;
        isPublished: boolean;
        subjectId: string;
        materialId: string | null;
    })[]>;
    updateQuiz(quizId: string, dto: UpdateQuizDto): Promise<({
        questions: ({
            options: {
                id: string;
                createdAt: Date;
                optionText: string;
                isCorrect: boolean;
                orderIndex: number;
                questionId: string;
            }[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            explanation: string | null;
            orderIndex: number;
            questionText: string;
            questionType: import("@prisma/client").$Enums.QuestionType;
            quizId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        description: string | null;
        isPublished: boolean;
        subjectId: string;
        materialId: string | null;
    }) | null>;
    deleteQuiz(quizId: string): Promise<{
        message: string;
    }>;
    reviewMaterial(id: string, body: {
        action: 'approve' | 'reject';
        reason?: string;
    }): Promise<{
        metadata: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            title: string | null;
            summary: string | null;
            keywords: string[];
            topics: string[];
            tags: string[];
            difficultyLevel: import("@prisma/client").$Enums.DifficultyLevel | null;
            contentType: string | null;
            materialId: string;
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
            id: string;
            createdAt: Date;
            updatedAt: Date;
            title: string | null;
            summary: string | null;
            keywords: string[];
            topics: string[];
            tags: string[];
            difficultyLevel: import("@prisma/client").$Enums.DifficultyLevel | null;
            contentType: string | null;
            materialId: string;
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
            optionText: string;
            isCorrect: boolean;
            orderIndex: number;
            questionId: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        explanation: string | null;
        orderIndex: number;
        questionText: string;
        questionType: import("@prisma/client").$Enums.QuestionType;
        quizId: string;
    }) | null>;
    updateQuizQuestion(questionId: string, dto: UpdateSingleQuestionDto): Promise<({
        options: {
            id: string;
            createdAt: Date;
            optionText: string;
            isCorrect: boolean;
            orderIndex: number;
            questionId: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        explanation: string | null;
        orderIndex: number;
        questionText: string;
        questionType: import("@prisma/client").$Enums.QuestionType;
        quizId: string;
    }) | null>;
    deleteQuizQuestion(questionId: string): Promise<{
        message: string;
    }>;
    changeStatus(id: string, body: {
        status: MaterialStatus;
    }): Promise<{
        metadata: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            title: string | null;
            summary: string | null;
            keywords: string[];
            topics: string[];
            tags: string[];
            difficultyLevel: import("@prisma/client").$Enums.DifficultyLevel | null;
            contentType: string | null;
            materialId: string;
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
