import { Queue } from 'bullmq';
import { MaterialsService } from './materials.service.js';
import { Role, MaterialStatus } from '@prisma/client';
import { SubscriptionsService } from '../subscriptions/subscriptions.service.js';
import { UpdateMetadataDto } from './dto/update-metadata.dto.js';
import { UpdateQuizDto } from './dto/update-quiz.dto.js';
import { CreateQuizQuestionDto, UpdateSingleQuestionDto } from './dto/quiz-question.dto.js';
import type { Response } from 'express';
export declare class MaterialsController {
    private materialsService;
    private processingQueue;
    private subscriptionsService;
    constructor(materialsService: MaterialsService, processingQueue: Queue, subscriptionsService: SubscriptionsService);
    upload(files: Express.Multer.File[], subjectId: string, numQuestionsRaw: string, userId: string): Promise<{
        message: string;
        materials: ({
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
            subjectId: string;
            status: import("@prisma/client").$Enums.MaterialStatus;
            createdAt: Date;
            updatedAt: Date;
            fileName: string;
            originalName: string;
            filePath: string;
            fileType: string;
            fileSize: number;
            processingProgress: number;
            processingStage: string | null;
            errorMessage: string | null;
            uploadedById: string;
        })[];
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
            subjectId: string;
            status: import("@prisma/client").$Enums.MaterialStatus;
            createdAt: Date;
            updatedAt: Date;
            fileName: string;
            originalName: string;
            filePath: string;
            fileType: string;
            fileSize: number;
            processingProgress: number;
            processingStage: string | null;
            errorMessage: string | null;
            uploadedById: string;
        };
    }>;
    uploadWithQuestions(files: {
        questionsFile?: Express.Multer.File[];
        materialFiles?: Express.Multer.File[];
        materialFile?: Express.Multer.File[];
    }, subjectId: string, numQuestionsRaw: string, userId: string): Promise<{
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
            subjectId: string;
            status: import("@prisma/client").$Enums.MaterialStatus;
            createdAt: Date;
            updatedAt: Date;
            fileName: string;
            originalName: string;
            filePath: string;
            fileType: string;
            fileSize: number;
            processingProgress: number;
            processingStage: string | null;
            errorMessage: string | null;
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
            subjectId: string;
            status: import("@prisma/client").$Enums.MaterialStatus;
            createdAt: Date;
            updatedAt: Date;
            fileName: string;
            originalName: string;
            filePath: string;
            fileType: string;
            fileSize: number;
            processingProgress: number;
            processingStage: string | null;
            errorMessage: string | null;
            uploadedById: string;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    listStoredFiles(page: number, limit: number, search?: string): Promise<{
        data: {
            name: string;
            relativePath: string;
            size: number;
            modifiedAt: Date;
            material: {
                id: string;
                originalName: string;
                status: import("@prisma/client").$Enums.MaterialStatus;
                createdAt: Date;
                subject: {
                    id: string;
                    name: string;
                };
            } | null;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    downloadStoredFile(path: string, res: Response): Promise<void>;
    deleteStoredFile(body: {
        path: string;
    }): Promise<{
        message: string;
        materialDeleted: boolean;
    }>;
    findOne(id: string, userId: string, role: Role): Promise<{
        subject: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string | null;
            code: string | null;
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
            materialId: string;
            title: string | null;
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
        subjectId: string;
        status: import("@prisma/client").$Enums.MaterialStatus;
        createdAt: Date;
        updatedAt: Date;
        fileName: string;
        originalName: string;
        filePath: string;
        fileType: string;
        fileSize: number;
        processingProgress: number;
        processingStage: string | null;
        errorMessage: string | null;
        uploadedById: string;
    }>;
    remove(id: string): Promise<{
        message: string;
    }>;
    getMetadata(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        materialId: string;
        title: string | null;
        summary: string | null;
        keywords: string[];
        topics: string[];
        tags: string[];
        difficultyLevel: import("@prisma/client").$Enums.DifficultyLevel | null;
        contentType: string | null;
    }>;
    updateMetadata(id: string, dto: UpdateMetadataDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        materialId: string;
        title: string | null;
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
            id: string;
            createdAt: Date;
            updatedAt: Date;
            orderIndex: number;
            quizId: string;
            questionText: string;
            questionType: import("@prisma/client").$Enums.QuestionType;
            explanation: string | null;
        })[];
    } & {
        id: string;
        subjectId: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        materialId: string | null;
        title: string;
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
            id: string;
            createdAt: Date;
            updatedAt: Date;
            orderIndex: number;
            quizId: string;
            questionText: string;
            questionType: import("@prisma/client").$Enums.QuestionType;
            explanation: string | null;
        })[];
    } & {
        id: string;
        subjectId: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        materialId: string | null;
        title: string;
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
            id: string;
            createdAt: Date;
            updatedAt: Date;
            materialId: string;
            title: string | null;
            summary: string | null;
            keywords: string[];
            topics: string[];
            tags: string[];
            difficultyLevel: import("@prisma/client").$Enums.DifficultyLevel | null;
            contentType: string | null;
        } | null;
    } & {
        id: string;
        subjectId: string;
        status: import("@prisma/client").$Enums.MaterialStatus;
        createdAt: Date;
        updatedAt: Date;
        fileName: string;
        originalName: string;
        filePath: string;
        fileType: string;
        fileSize: number;
        processingProgress: number;
        processingStage: string | null;
        errorMessage: string | null;
        uploadedById: string;
    }>;
    publishMaterial(id: string, body: {
        publish: boolean;
    }): Promise<{
        metadata: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            materialId: string;
            title: string | null;
            summary: string | null;
            keywords: string[];
            topics: string[];
            tags: string[];
            difficultyLevel: import("@prisma/client").$Enums.DifficultyLevel | null;
            contentType: string | null;
        } | null;
    } & {
        id: string;
        subjectId: string;
        status: import("@prisma/client").$Enums.MaterialStatus;
        createdAt: Date;
        updatedAt: Date;
        fileName: string;
        originalName: string;
        filePath: string;
        fileType: string;
        fileSize: number;
        processingProgress: number;
        processingStage: string | null;
        errorMessage: string | null;
        uploadedById: string;
    }>;
    reprocessMaterial(id: string, userId: string): Promise<{
        message: string;
        material: {
            id: string;
            subjectId: string;
            status: import("@prisma/client").$Enums.MaterialStatus;
            createdAt: Date;
            updatedAt: Date;
            fileName: string;
            originalName: string;
            filePath: string;
            fileType: string;
            fileSize: number;
            processingProgress: number;
            processingStage: string | null;
            errorMessage: string | null;
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
        id: string;
        createdAt: Date;
        updatedAt: Date;
        orderIndex: number;
        quizId: string;
        questionText: string;
        questionType: import("@prisma/client").$Enums.QuestionType;
        explanation: string | null;
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
        id: string;
        createdAt: Date;
        updatedAt: Date;
        orderIndex: number;
        quizId: string;
        questionText: string;
        questionType: import("@prisma/client").$Enums.QuestionType;
        explanation: string | null;
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
            materialId: string;
            title: string | null;
            summary: string | null;
            keywords: string[];
            topics: string[];
            tags: string[];
            difficultyLevel: import("@prisma/client").$Enums.DifficultyLevel | null;
            contentType: string | null;
        } | null;
    } & {
        id: string;
        subjectId: string;
        status: import("@prisma/client").$Enums.MaterialStatus;
        createdAt: Date;
        updatedAt: Date;
        fileName: string;
        originalName: string;
        filePath: string;
        fileType: string;
        fileSize: number;
        processingProgress: number;
        processingStage: string | null;
        errorMessage: string | null;
        uploadedById: string;
    }>;
}
