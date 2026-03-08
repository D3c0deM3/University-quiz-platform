import { QuestionsService } from './questions.service.js';
import { Role, QuestionStatus } from '@prisma/client';
import { CreateQuestionDto, UpdateQuestionDto, ReviewQuestionDto, GenerateQuizFromQADto } from './dto/index.js';
export declare class QuestionsController {
    private questionsService;
    constructor(questionsService: QuestionsService);
    create(dto: CreateQuestionDto, userId: string, userRole: Role, image?: Express.Multer.File): Promise<{
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
    findAll(userId: string, userRole: Role, page: number, limit: number, subjectId?: string, status?: QuestionStatus, search?: string, mine?: string): Promise<{
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
    update(id: string, dto: UpdateQuestionDto, userId: string, userRole: Role, image?: Express.Multer.File): Promise<{
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
    review(id: string, dto: ReviewQuestionDto): Promise<{
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
    generateQuiz(dto: GenerateQuizFromQADto): Promise<{
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
}
