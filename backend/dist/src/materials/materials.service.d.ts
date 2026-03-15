import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service.js';
import { MaterialStatus } from '@prisma/client';
import { UpdateMetadataDto } from './dto/update-metadata.dto.js';
import { UpdateQuizDto } from './dto/update-quiz.dto.js';
import { CreateQuizQuestionDto, UpdateSingleQuestionDto } from './dto/quiz-question.dto.js';
export declare class MaterialsService {
    private prisma;
    private configService;
    constructor(prisma: PrismaService, configService: ConfigService);
    validateFile(file: Express.Multer.File): void;
    upload(file: Express.Multer.File, subjectId: string, uploadedById: string): Promise<{
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
        fileName: string;
        originalName: string;
        filePath: string;
        fileType: string;
        fileSize: number;
        status: import("@prisma/client").$Enums.MaterialStatus;
        processingProgress: number;
        processingStage: string | null;
        errorMessage: string | null;
        createdAt: Date;
        updatedAt: Date;
        subjectId: string;
        uploadedById: string;
    }>;
    uploadFromText(filePath: string, fileName: string, fileSize: number, subjectId: string, uploadedById: string): Promise<{
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
        fileName: string;
        originalName: string;
        filePath: string;
        fileType: string;
        fileSize: number;
        status: import("@prisma/client").$Enums.MaterialStatus;
        processingProgress: number;
        processingStage: string | null;
        errorMessage: string | null;
        createdAt: Date;
        updatedAt: Date;
        subjectId: string;
        uploadedById: string;
    }>;
    findAll(page?: number, limit?: number, status?: MaterialStatus, subjectId?: string): Promise<{
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
            fileName: string;
            originalName: string;
            filePath: string;
            fileType: string;
            fileSize: number;
            status: import("@prisma/client").$Enums.MaterialStatus;
            processingProgress: number;
            processingStage: string | null;
            errorMessage: string | null;
            createdAt: Date;
            updatedAt: Date;
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
    findAllForStudent(page: number | undefined, limit: number | undefined, userId: string, status?: MaterialStatus, subjectId?: string): Promise<{
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
            fileName: string;
            originalName: string;
            filePath: string;
            fileType: string;
            fileSize: number;
            status: import("@prisma/client").$Enums.MaterialStatus;
            processingProgress: number;
            processingStage: string | null;
            errorMessage: string | null;
            createdAt: Date;
            updatedAt: Date;
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
    findOne(id: string): Promise<{
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
        fileName: string;
        originalName: string;
        filePath: string;
        fileType: string;
        fileSize: number;
        status: import("@prisma/client").$Enums.MaterialStatus;
        processingProgress: number;
        processingStage: string | null;
        errorMessage: string | null;
        createdAt: Date;
        updatedAt: Date;
        subjectId: string;
        uploadedById: string;
    }>;
    updateStatus(id: string, status: MaterialStatus, errorMessage?: string): Promise<{
        id: string;
        fileName: string;
        originalName: string;
        filePath: string;
        fileType: string;
        fileSize: number;
        status: import("@prisma/client").$Enums.MaterialStatus;
        processingProgress: number;
        processingStage: string | null;
        errorMessage: string | null;
        createdAt: Date;
        updatedAt: Date;
        subjectId: string;
        uploadedById: string;
    }>;
    updateProcessingProgress(materialId: string, progress: number, stage?: string): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.MaterialStatus;
        processingProgress: number;
        processingStage: string | null;
    }>;
    remove(id: string): Promise<{
        message: string;
    }>;
    getMetadata(materialId: string): Promise<{
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
    updateMetadata(materialId: string, dto: UpdateMetadataDto): Promise<{
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
    getQuizzes(materialId: string): Promise<({
        _count: {
            questions: number;
            attempts: number;
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
        createdAt: Date;
        updatedAt: Date;
        subjectId: string;
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
        createdAt: Date;
        updatedAt: Date;
        subjectId: string;
        description: string | null;
        materialId: string | null;
        title: string;
        isPublished: boolean;
    }) | null>;
    reviewMaterial(materialId: string, action: 'approve' | 'reject', reason?: string): Promise<{
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
        fileName: string;
        originalName: string;
        filePath: string;
        fileType: string;
        fileSize: number;
        status: import("@prisma/client").$Enums.MaterialStatus;
        processingProgress: number;
        processingStage: string | null;
        errorMessage: string | null;
        createdAt: Date;
        updatedAt: Date;
        subjectId: string;
        uploadedById: string;
    }>;
    publishMaterial(materialId: string, publish: boolean): Promise<{
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
        fileName: string;
        originalName: string;
        filePath: string;
        fileType: string;
        fileSize: number;
        status: import("@prisma/client").$Enums.MaterialStatus;
        processingProgress: number;
        processingStage: string | null;
        errorMessage: string | null;
        createdAt: Date;
        updatedAt: Date;
        subjectId: string;
        uploadedById: string;
    }>;
    reprocessMaterial(materialId: string): Promise<{
        id: string;
        fileName: string;
        originalName: string;
        filePath: string;
        fileType: string;
        fileSize: number;
        status: import("@prisma/client").$Enums.MaterialStatus;
        processingProgress: number;
        processingStage: string | null;
        errorMessage: string | null;
        createdAt: Date;
        updatedAt: Date;
        subjectId: string;
        uploadedById: string;
    }>;
    getQuizQuestions(quizId: string): Promise<({
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
    })[]>;
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
    deleteQuiz(quizId: string): Promise<{
        message: string;
    }>;
    changeStatus(materialId: string, status: MaterialStatus): Promise<{
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
        fileName: string;
        originalName: string;
        filePath: string;
        fileType: string;
        fileSize: number;
        status: import("@prisma/client").$Enums.MaterialStatus;
        processingProgress: number;
        processingStage: string | null;
        errorMessage: string | null;
        createdAt: Date;
        updatedAt: Date;
        subjectId: string;
        uploadedById: string;
    }>;
    listStoredFiles(page?: number, limit?: number, search?: string): Promise<{
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
    getStoredFileForDownload(relativePath: string): Promise<{
        absolutePath: string;
        fileName: string;
    }>;
    deleteStoredFile(relativePath: string): Promise<{
        message: string;
        materialDeleted: boolean;
    }>;
    private collectStoredFiles;
    private resolveManagedFilePath;
    private toRelativeMaterialPath;
    private resolveMaterialFilePath;
    private normalizeRelativePath;
    private getProgressByStatus;
}
