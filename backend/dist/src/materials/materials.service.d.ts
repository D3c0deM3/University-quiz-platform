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
            firstName: string;
            lastName: string;
            id: string;
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
    }>;
    findAll(page?: number, limit?: number, status?: MaterialStatus, subjectId?: string): Promise<{
        data: ({
            subject: {
                id: string;
                name: string;
            };
            uploadedBy: {
                firstName: string;
                lastName: string;
                id: string;
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
            firstName: string;
            lastName: string;
            id: string;
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
    updateStatus(id: string, status: MaterialStatus, errorMessage?: string): Promise<{
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
    reprocessMaterial(materialId: string): Promise<{
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
