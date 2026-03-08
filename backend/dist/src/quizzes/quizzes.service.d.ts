import { PrismaService } from '../prisma/prisma.service.js';
import { SubmitQuizDto } from './dto/submit-quiz.dto.js';
export declare class QuizzesService {
    private prisma;
    constructor(prisma: PrismaService);
    findBySubject(subjectId: string, page?: number, limit?: number): Promise<{
        data: ({
            _count: {
                questions: number;
                attempts: number;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            title: string;
            description: string | null;
            isPublished: boolean;
            subjectId: string;
            materialId: string | null;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    findOne(quizId: string): Promise<{
        subject: {
            id: string;
            name: string;
        };
        _count: {
            questions: number;
        };
        questions: {
            id: string;
            orderIndex: number;
            questionText: string;
            questionType: import("@prisma/client").$Enums.QuestionType;
            options: {
                id: string;
                optionText: string;
                orderIndex: number;
            }[];
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        description: string | null;
        isPublished: boolean;
        subjectId: string;
        materialId: string | null;
    }>;
    startAttempt(quizId: string, userId: string): Promise<{
        quiz: {
            id: string;
            title: string;
            questions: {
                id: string;
                orderIndex: number;
                questionText: string;
                questionType: import("@prisma/client").$Enums.QuestionType;
                options: {
                    id: string;
                    optionText: string;
                    orderIndex: number;
                }[];
            }[];
        };
    } & {
        id: string;
        createdAt: Date;
        quizId: string;
        score: number | null;
        totalPoints: number | null;
        startedAt: Date;
        completedAt: Date | null;
        userId: string;
    }>;
    submitAttempt(attemptId: string, userId: string, dto: SubmitQuizDto): Promise<{
        attemptId: string;
        quizTitle: string;
        score: number | null;
        totalPoints: number | null;
        correctCount: number;
        gradableQuestions: number;
        totalQuestions: number;
        completedAt: Date | null;
    }>;
    getAttemptResults(attemptId: string, userId: string): Promise<{
        attemptId: string;
        quiz: {
            id: string;
            title: string;
            description: string | null;
        };
        score: number | null;
        totalPoints: number | null;
        startedAt: Date;
        completedAt: Date;
        answers: {
            questionId: string;
            questionText: string;
            questionType: import("@prisma/client").$Enums.QuestionType;
            explanation: string | null;
            selectedOptionId: string | null;
            selectedOptionText: string | null;
            textAnswer: string | null;
            isCorrect: boolean | null;
            options: {
                id: string;
                optionText: string;
                isCorrect: boolean;
            }[];
        }[];
    }>;
    getMyAttempts(userId: string, page?: number, limit?: number): Promise<{
        data: {
            id: string;
            quizId: string;
            quizTitle: string;
            subjectName: string;
            score: number | null;
            totalPoints: number | null;
            totalQuestions: number;
            startedAt: Date;
            completedAt: Date | null;
            status: string;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getMyStats(userId: string): Promise<{
        totalAttempts: number;
        averageScore: number;
        subjectStats: {
            subjectId: string;
            subjectName: string;
            totalAttempts: number;
            averageScore: number;
            bestScore: number;
        }[];
    }>;
}
