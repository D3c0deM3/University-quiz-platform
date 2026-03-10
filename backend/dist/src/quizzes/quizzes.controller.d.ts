import { QuizzesService } from './quizzes.service.js';
import { Role } from '@prisma/client';
import { SubmitQuizDto } from './dto/submit-quiz.dto.js';
import { SubscriptionsService } from '../subscriptions/subscriptions.service.js';
export declare class QuizzesController {
    private quizzesService;
    private subscriptionsService;
    constructor(quizzesService: QuizzesService, subscriptionsService: SubscriptionsService);
    findBySubject(subjectId: string, userId: string, role: Role, page: number, limit: number): Promise<{
        data: ({
            _count: {
                attempts: number;
                questions: number;
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
    findOne(quizId: string, userId: string, role: Role): Promise<{
        subject: {
            id: string;
            name: string;
        };
        _count: {
            questions: number;
        };
        questions: {
            id: string;
            options: {
                id: string;
                optionText: string;
                orderIndex: number;
            }[];
            orderIndex: number;
            questionText: string;
            questionType: import("@prisma/client").$Enums.QuestionType;
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
    startAttempt(quizId: string, userId: string, role: Role): Promise<{
        quiz: {
            id: string;
            title: string;
            questions: {
                id: string;
                options: {
                    id: string;
                    optionText: string;
                    orderIndex: number;
                }[];
                orderIndex: number;
                questionText: string;
                questionType: import("@prisma/client").$Enums.QuestionType;
            }[];
        };
    } & {
        id: string;
        createdAt: Date;
        quizId: string;
        userId: string;
        score: number | null;
        totalPoints: number | null;
        startedAt: Date;
        completedAt: Date | null;
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
        id: string;
        quizId: string;
        userId: string;
        quiz: {
            id: string;
            title: string;
            description: string | null;
        };
        score: number | null;
        totalPoints: number | null;
        startedAt: Date;
        completedAt: Date;
        createdAt: Date;
        answers: {
            id: string;
            attemptId: string;
            questionId: string;
            selectedOptionId: string | null;
            textAnswer: string | null;
            isCorrect: boolean | null;
            question: {
                id: string;
                quizId: string;
                questionText: string;
                questionType: import("@prisma/client").$Enums.QuestionType;
                explanation: string | null;
                orderIndex: number;
                options: {
                    id: string;
                    questionId: string;
                    optionText: string;
                    isCorrect: boolean;
                    orderIndex: number;
                }[];
            };
            selectedOption: {
                id: string;
                questionId: string;
                optionText: string;
                isCorrect: boolean;
                orderIndex: number;
            } | null;
        }[];
    }>;
    getMyAttempts(userId: string, page: number, limit: number): Promise<{
        data: {
            id: string;
            quizId: string;
            userId: string;
            score: number | null;
            totalPoints: number | null;
            startedAt: Date;
            completedAt: Date | null;
            createdAt: Date;
            quiz: {
                id: string;
                title: string;
                subject: {
                    id: string;
                    name: string;
                };
                _count: {
                    questions: number;
                };
            };
            quizTitle: string;
            subjectName: string;
            totalQuestions: number;
            status: string;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getMyAttemptDetail(attemptId: string, userId: string): Promise<{
        id: string;
        quizId: string;
        userId: string;
        quiz: {
            id: string;
            title: string;
            description: string | null;
        };
        score: number | null;
        totalPoints: number | null;
        startedAt: Date;
        completedAt: Date;
        createdAt: Date;
        answers: {
            id: string;
            attemptId: string;
            questionId: string;
            selectedOptionId: string | null;
            textAnswer: string | null;
            isCorrect: boolean | null;
            question: {
                id: string;
                quizId: string;
                questionText: string;
                questionType: import("@prisma/client").$Enums.QuestionType;
                explanation: string | null;
                orderIndex: number;
                options: {
                    id: string;
                    questionId: string;
                    optionText: string;
                    isCorrect: boolean;
                    orderIndex: number;
                }[];
            };
            selectedOption: {
                id: string;
                questionId: string;
                optionText: string;
                isCorrect: boolean;
                orderIndex: number;
            } | null;
        }[];
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
    deleteQuiz(quizId: string): Promise<{
        message: string;
    }>;
}
