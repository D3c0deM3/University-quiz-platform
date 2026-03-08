"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuizzesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_js_1 = require("../prisma/prisma.service.js");
const client_1 = require("@prisma/client");
let QuizzesService = class QuizzesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findBySubject(subjectId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const subject = await this.prisma.subject.findUnique({
            where: { id: subjectId },
        });
        if (!subject) {
            throw new common_1.NotFoundException('Subject not found');
        }
        const [quizzes, total] = await Promise.all([
            this.prisma.quiz.findMany({
                where: { subjectId, isPublished: true },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    _count: { select: { questions: true, attempts: true } },
                },
            }),
            this.prisma.quiz.count({ where: { subjectId, isPublished: true } }),
        ]);
        return {
            data: quizzes,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }
    async findOne(quizId) {
        const quiz = await this.prisma.quiz.findUnique({
            where: { id: quizId },
            include: {
                subject: { select: { id: true, name: true } },
                questions: {
                    orderBy: { orderIndex: 'asc' },
                    select: {
                        id: true,
                        questionText: true,
                        questionType: true,
                        orderIndex: true,
                        options: {
                            orderBy: { orderIndex: 'asc' },
                            select: {
                                id: true,
                                optionText: true,
                                orderIndex: true,
                            },
                        },
                    },
                },
                _count: { select: { questions: true } },
            },
        });
        if (!quiz) {
            throw new common_1.NotFoundException('Quiz not found');
        }
        if (!quiz.isPublished) {
            throw new common_1.ForbiddenException('This quiz is not yet published');
        }
        return quiz;
    }
    async startAttempt(quizId, userId) {
        const quiz = await this.prisma.quiz.findUnique({
            where: { id: quizId },
            include: { _count: { select: { questions: true } } },
        });
        if (!quiz) {
            throw new common_1.NotFoundException('Quiz not found');
        }
        if (!quiz.isPublished) {
            throw new common_1.ForbiddenException('This quiz is not yet published');
        }
        const attempt = await this.prisma.quizAttempt.create({
            data: {
                quizId,
                userId,
                totalPoints: quiz._count.questions,
            },
            include: {
                quiz: {
                    select: {
                        id: true,
                        title: true,
                        questions: {
                            orderBy: { orderIndex: 'asc' },
                            select: {
                                id: true,
                                questionText: true,
                                questionType: true,
                                orderIndex: true,
                                options: {
                                    orderBy: { orderIndex: 'asc' },
                                    select: {
                                        id: true,
                                        optionText: true,
                                        orderIndex: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
        return attempt;
    }
    async submitAttempt(attemptId, userId, dto) {
        const attempt = await this.prisma.quizAttempt.findUnique({
            where: { id: attemptId },
            include: {
                quiz: {
                    include: {
                        questions: {
                            include: {
                                options: true,
                            },
                        },
                    },
                },
            },
        });
        if (!attempt) {
            throw new common_1.NotFoundException('Quiz attempt not found');
        }
        if (attempt.userId !== userId) {
            throw new common_1.ForbiddenException('This is not your attempt');
        }
        if (attempt.completedAt) {
            throw new common_1.BadRequestException('This attempt has already been submitted');
        }
        const questionMap = new Map();
        for (const q of attempt.quiz.questions) {
            questionMap.set(q.id, q);
        }
        let correctCount = 0;
        const answerRecords = [];
        for (const answer of dto.answers) {
            const question = questionMap.get(answer.questionId);
            if (!question)
                continue;
            let isCorrect = null;
            if (question.questionType === client_1.QuestionType.MCQ || question.questionType === client_1.QuestionType.TRUE_FALSE) {
                if (answer.selectedOptionId) {
                    const correctOption = question.options.find((o) => o.isCorrect);
                    isCorrect = correctOption?.id === answer.selectedOptionId;
                    if (isCorrect)
                        correctCount++;
                }
                else {
                    isCorrect = false;
                }
            }
            else if (question.questionType === client_1.QuestionType.SHORT_ANSWER) {
                isCorrect = null;
            }
            answerRecords.push({
                attemptId,
                questionId: answer.questionId,
                selectedOptionId: answer.selectedOptionId || null,
                textAnswer: answer.textAnswer || null,
                isCorrect,
            });
        }
        const totalQuestions = attempt.quiz.questions.length;
        const gradableQuestions = attempt.quiz.questions.filter((q) => q.questionType !== client_1.QuestionType.SHORT_ANSWER).length;
        const score = gradableQuestions > 0 ? (correctCount / gradableQuestions) * 100 : 0;
        const result = await this.prisma.$transaction(async (tx) => {
            if (answerRecords.length > 0) {
                await tx.quizAttemptAnswer.createMany({ data: answerRecords });
            }
            return tx.quizAttempt.update({
                where: { id: attemptId },
                data: {
                    score: Math.round(score * 100) / 100,
                    completedAt: new Date(),
                },
                include: {
                    quiz: { select: { id: true, title: true } },
                },
            });
        });
        return {
            attemptId: result.id,
            quizTitle: result.quiz.title,
            score: result.score,
            totalPoints: result.totalPoints,
            correctCount,
            gradableQuestions,
            totalQuestions,
            completedAt: result.completedAt,
        };
    }
    async getAttemptResults(attemptId, userId) {
        const attempt = await this.prisma.quizAttempt.findUnique({
            where: { id: attemptId },
            include: {
                quiz: {
                    select: { id: true, title: true, description: true },
                },
                answers: {
                    include: {
                        question: {
                            include: {
                                options: { orderBy: { orderIndex: 'asc' } },
                            },
                        },
                        selectedOption: true,
                    },
                },
            },
        });
        if (!attempt) {
            throw new common_1.NotFoundException('Quiz attempt not found');
        }
        if (attempt.userId !== userId) {
            throw new common_1.ForbiddenException('This is not your attempt');
        }
        if (!attempt.completedAt) {
            throw new common_1.BadRequestException('This attempt has not been submitted yet');
        }
        return {
            attemptId: attempt.id,
            quiz: attempt.quiz,
            score: attempt.score,
            totalPoints: attempt.totalPoints,
            startedAt: attempt.startedAt,
            completedAt: attempt.completedAt,
            answers: attempt.answers.map((a) => ({
                questionId: a.questionId,
                questionText: a.question.questionText,
                questionType: a.question.questionType,
                explanation: a.question.explanation,
                selectedOptionId: a.selectedOptionId,
                selectedOptionText: a.selectedOption?.optionText || null,
                textAnswer: a.textAnswer,
                isCorrect: a.isCorrect,
                options: a.question.options.map((o) => ({
                    id: o.id,
                    optionText: o.optionText,
                    isCorrect: o.isCorrect,
                })),
            })),
        };
    }
    async getMyAttempts(userId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [attempts, total] = await Promise.all([
            this.prisma.quizAttempt.findMany({
                where: { userId },
                skip,
                take: limit,
                orderBy: { startedAt: 'desc' },
                include: {
                    quiz: {
                        select: {
                            id: true,
                            title: true,
                            subject: { select: { id: true, name: true } },
                            _count: { select: { questions: true } },
                        },
                    },
                },
            }),
            this.prisma.quizAttempt.count({ where: { userId } }),
        ]);
        return {
            data: attempts.map((a) => ({
                id: a.id,
                quizId: a.quizId,
                quizTitle: a.quiz.title,
                subjectName: a.quiz.subject.name,
                score: a.score,
                totalPoints: a.totalPoints,
                totalQuestions: a.quiz._count.questions,
                startedAt: a.startedAt,
                completedAt: a.completedAt,
                status: a.completedAt ? 'completed' : 'in_progress',
            })),
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }
    async getMyStats(userId) {
        const completedAttempts = await this.prisma.quizAttempt.findMany({
            where: { userId, completedAt: { not: null } },
            include: {
                quiz: {
                    select: {
                        subjectId: true,
                        subject: { select: { name: true } },
                    },
                },
            },
        });
        const totalAttempts = completedAttempts.length;
        const totalScore = completedAttempts.reduce((sum, a) => sum + (a.score ?? 0), 0);
        const averageScore = totalAttempts > 0 ? Math.round((totalScore / totalAttempts) * 100) / 100 : 0;
        const subjectMap = new Map();
        for (const attempt of completedAttempts) {
            const subjectId = attempt.quiz.subjectId;
            if (!subjectMap.has(subjectId)) {
                subjectMap.set(subjectId, {
                    name: attempt.quiz.subject.name,
                    scores: [],
                    count: 0,
                });
            }
            const entry = subjectMap.get(subjectId);
            entry.scores.push(attempt.score ?? 0);
            entry.count++;
        }
        const subjectStats = Array.from(subjectMap.entries()).map(([id, data]) => ({
            subjectId: id,
            subjectName: data.name,
            totalAttempts: data.count,
            averageScore: data.scores.length > 0
                ? Math.round((data.scores.reduce((a, b) => a + b, 0) / data.scores.length) * 100) / 100
                : 0,
            bestScore: Math.max(...data.scores, 0),
        }));
        return {
            totalAttempts,
            averageScore,
            subjectStats,
        };
    }
};
exports.QuizzesService = QuizzesService;
exports.QuizzesService = QuizzesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService])
], QuizzesService);
//# sourceMappingURL=quizzes.service.js.map