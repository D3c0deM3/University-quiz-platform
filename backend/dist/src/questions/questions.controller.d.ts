import { QuestionsService } from './questions.service.js';
import { Role, QuestionStatus } from '@prisma/client';
import { SubscriptionsService } from '../subscriptions/subscriptions.service.js';
import { CreateQuestionDto, UpdateQuestionDto, ReviewQuestionDto, GenerateQuizFromQADto } from './dto/index.js';
export declare class QuestionsController {
    private questionsService;
    private subscriptionsService;
    constructor(questionsService: QuestionsService, subscriptionsService: SubscriptionsService);
    create(dto: CreateQuestionDto, userId: string, userRole: Role, image?: Express.Multer.File): Promise<{
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
    findAll(userId: string, userRole: Role, page: number, limit: number, subjectId?: string, status?: QuestionStatus, search?: string, mine?: string): Promise<{
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
    getCounts(subjectId?: string): Promise<{
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
    findOne(id: string, userId: string, role: Role): Promise<{
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
    update(id: string, dto: UpdateQuestionDto, userId: string, userRole: Role, image?: Express.Multer.File): Promise<{
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
    review(id: string, dto: ReviewQuestionDto): Promise<{
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
    generateQuiz(dto: GenerateQuizFromQADto): Promise<{
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
}
