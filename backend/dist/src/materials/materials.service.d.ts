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
    uploadJson(file: Express.Multer.File, subjectId: string, uploadedById: string, title?: string): Promise<{
        material: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.MaterialStatus;
            uploadedById: string;
            fileName: string;
            originalName: string;
            filePath: string;
            fileType: string;
            fileSize: number;
            processingProgress: number;
            processingStage: string | null;
            errorMessage: string | null;
            subjectId: string;
        };
        quiz: {
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
                quizId: string;
                orderIndex: number;
                questionText: string;
                questionType: import("@prisma/client").$Enums.QuestionType;
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
        };
    }>;
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
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.MaterialStatus;
        uploadedById: string;
        fileName: string;
        originalName: string;
        filePath: string;
        fileType: string;
        fileSize: number;
        processingProgress: number;
        processingStage: string | null;
        errorMessage: string | null;
        subjectId: string;
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
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.MaterialStatus;
        uploadedById: string;
        fileName: string;
        originalName: string;
        filePath: string;
        fileType: string;
        fileSize: number;
        processingProgress: number;
        processingStage: string | null;
        errorMessage: string | null;
        subjectId: string;
    }>;
    findAll(page?: number, limit?: number, status?: MaterialStatus, subjectId?: string): Promise<{
        data: ({
            subject: {
                id: string;
                name: string;
            };
            metadata: {
                title: string | null;
                summary: string | null;
                keywords: string[];
                tags: string[];
            } | null;
            uploadedBy: {
                id: string;
                firstName: string;
                lastName: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.MaterialStatus;
            uploadedById: string;
            fileName: string;
            originalName: string;
            filePath: string;
            fileType: string;
            fileSize: number;
            processingProgress: number;
            processingStage: string | null;
            errorMessage: string | null;
            subjectId: string;
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
            metadata: {
                title: string | null;
                summary: string | null;
                keywords: string[];
                tags: string[];
            } | null;
            uploadedBy: {
                id: string;
                firstName: string;
                lastName: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.MaterialStatus;
            uploadedById: string;
            fileName: string;
            originalName: string;
            filePath: string;
            fileType: string;
            fileSize: number;
            processingProgress: number;
            processingStage: string | null;
            errorMessage: string | null;
            subjectId: string;
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
            code: string | null;
            description: string | null;
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
        uploadedBy: {
            id: string;
            firstName: string;
            lastName: string;
        };
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
        status: import("@prisma/client").$Enums.MaterialStatus;
        uploadedById: string;
        fileName: string;
        originalName: string;
        filePath: string;
        fileType: string;
        fileSize: number;
        processingProgress: number;
        processingStage: string | null;
        errorMessage: string | null;
        subjectId: string;
    }>;
    updateStatus(id: string, status: MaterialStatus, QuestionStatus: any, errorMessage?: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.MaterialStatus;
        uploadedById: string;
        fileName: string;
        originalName: string;
        filePath: string;
        fileType: string;
        fileSize: number;
        processingProgress: number;
        processingStage: string | null;
        errorMessage: string | null;
        subjectId: string;
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
        title: string | null;
        summary: string | null;
        keywords: string[];
        topics: string[];
        tags: string[];
        difficultyLevel: import("@prisma/client").$Enums.DifficultyLevel | null;
        contentType: string | null;
        materialId: string;
    }>;
    updateMetadata(materialId: string, dto: UpdateMetadataDto): Promise<{
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
    getQuizzes(materialId: string): Promise<({
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
            quizId: string;
            orderIndex: number;
            questionText: string;
            questionType: import("@prisma/client").$Enums.QuestionType;
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
            quizId: string;
            orderIndex: number;
            questionText: string;
            questionType: import("@prisma/client").$Enums.QuestionType;
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
    reviewMaterial(materialId: string, action: 'approve' | 'reject', reason?: string): Promise<{
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
        status: import("@prisma/client").$Enums.MaterialStatus;
        uploadedById: string;
        fileName: string;
        originalName: string;
        filePath: string;
        fileType: string;
        fileSize: number;
        processingProgress: number;
        processingStage: string | null;
        errorMessage: string | null;
        subjectId: string;
    }>;
    publishMaterial(materialId: string, publish: boolean): Promise<{
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
        status: import("@prisma/client").$Enums.MaterialStatus;
        uploadedById: string;
        fileName: string;
        originalName: string;
        filePath: string;
        fileType: string;
        fileSize: number;
        processingProgress: number;
        processingStage: string | null;
        errorMessage: string | null;
        subjectId: string;
    }>;
    reprocessMaterial(materialId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.MaterialStatus;
        uploadedById: string;
        fileName: string;
        originalName: string;
        filePath: string;
        fileType: string;
        fileSize: number;
        processingProgress: number;
        processingStage: string | null;
        errorMessage: string | null;
        subjectId: string;
    }>;
    getQuizQuestions(quizId: string): Promise<({
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
        quizId: string;
        orderIndex: number;
        questionText: string;
        questionType: import("@prisma/client").$Enums.QuestionType;
    })[]>;
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
        quizId: string;
        orderIndex: number;
        questionText: string;
        questionType: import("@prisma/client").$Enums.QuestionType;
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
        quizId: string;
        orderIndex: number;
        questionText: string;
        questionType: import("@prisma/client").$Enums.QuestionType;
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
        status: import("@prisma/client").$Enums.MaterialStatus;
        uploadedById: string;
        fileName: string;
        originalName: string;
        filePath: string;
        fileType: string;
        fileSize: number;
        processingProgress: number;
        processingStage: string | null;
        errorMessage: string | null;
        subjectId: string;
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
