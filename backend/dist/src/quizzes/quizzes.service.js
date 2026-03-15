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
var QuizzesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuizzesService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_js_1 = require("../prisma/prisma.service.js");
const client_1 = require("@prisma/client");
let QuizzesService = QuizzesService_1 = class QuizzesService {
    prisma;
    configService;
    logger = new common_1.Logger(QuizzesService_1.name);
    constructor(prisma, configService) {
        this.prisma = prisma;
        this.configService = configService;
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
    async startAttempt(quizId, userId, dto = {}) {
        const quiz = await this.prisma.quiz.findUnique({
            where: { id: quizId },
            select: {
                id: true,
                isPublished: true,
                questions: {
                    orderBy: { orderIndex: 'asc' },
                    select: {
                        id: true,
                        orderIndex: true,
                    },
                },
            },
        });
        if (!quiz) {
            throw new common_1.NotFoundException('Quiz not found');
        }
        if (!quiz.isPublished) {
            throw new common_1.ForbiddenException('This quiz is not yet published');
        }
        const selectedQuestions = this.selectQuestionsForAttempt(quiz.questions, dto);
        const selectedQuestionIds = selectedQuestions.map((q) => q.id);
        const attempt = await this.prisma.$transaction(async (tx) => {
            const created = await tx.quizAttempt.create({
                data: {
                    quizId,
                    userId,
                    totalPoints: selectedQuestions.length,
                },
            });
            await tx.quizAttemptAnswer.createMany({
                data: selectedQuestionIds.map((questionId) => ({
                    attemptId: created.id,
                    questionId,
                })),
            });
            return tx.quizAttempt.findUnique({
                where: { id: created.id },
                include: {
                    quiz: {
                        select: {
                            id: true,
                            title: true,
                            questions: {
                                where: { id: { in: selectedQuestionIds } },
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
        });
        if (!attempt) {
            throw new common_1.NotFoundException('Quiz attempt not found');
        }
        return attempt;
    }
    async submitAttempt(attemptId, userId, dto) {
        const attempt = await this.prisma.quizAttempt.findUnique({
            where: { id: attemptId },
            include: {
                answers: {
                    include: {
                        question: {
                            include: {
                                options: true,
                            },
                        },
                    },
                },
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
        const selectedQuestionEntries = attempt.answers.length > 0
            ? attempt.answers.map((a) => ({
                answerId: a.id,
                question: a.question,
            }))
            : attempt.quiz.questions.map((q) => ({
                answerId: null,
                question: q,
            }));
        const selectedQuestionMap = new Map(selectedQuestionEntries.map((entry) => [entry.question.id, entry]));
        const incomingAnswerMap = new Map();
        for (const answer of dto.answers) {
            if (incomingAnswerMap.has(answer.questionId)) {
                throw new common_1.BadRequestException('Duplicate answers are not allowed');
            }
            incomingAnswerMap.set(answer.questionId, answer);
        }
        for (const questionId of incomingAnswerMap.keys()) {
            if (!selectedQuestionMap.has(questionId)) {
                throw new common_1.BadRequestException('One or more answers contain questions outside of this quiz attempt');
            }
        }
        let correctCount = 0;
        const answerUpdates = [];
        for (const entry of selectedQuestionEntries) {
            const question = entry.question;
            const answer = incomingAnswerMap.get(question.id);
            const selectedOptionId = answer?.selectedOptionId ?? null;
            let textAnswer = answer?.textAnswer ?? null;
            let isCorrect = null;
            if (question.questionType === client_1.QuestionType.MCQ ||
                question.questionType === client_1.QuestionType.TRUE_FALSE) {
                if (selectedOptionId &&
                    !question.options.some((o) => o.id === selectedOptionId)) {
                    throw new common_1.BadRequestException('Invalid option selected for one or more questions');
                }
                textAnswer = null;
                if (selectedOptionId) {
                    const correctOption = question.options.find((o) => o.isCorrect);
                    isCorrect = correctOption?.id === selectedOptionId;
                    if (isCorrect)
                        correctCount++;
                }
                else {
                    isCorrect = false;
                }
            }
            else if (question.questionType === client_1.QuestionType.SHORT_ANSWER) {
                if (selectedOptionId) {
                    throw new common_1.BadRequestException('Short-answer questions cannot include option selections');
                }
                isCorrect = null;
            }
            answerUpdates.push({
                answerId: entry.answerId,
                questionId: question.id,
                selectedOptionId,
                textAnswer,
                isCorrect,
            });
        }
        const totalQuestions = selectedQuestionEntries.length;
        const gradableQuestions = selectedQuestionEntries.filter((entry) => entry.question.questionType !== client_1.QuestionType.SHORT_ANSWER).length;
        const score = gradableQuestions > 0 ? (correctCount / gradableQuestions) * 100 : 0;
        const result = await this.prisma.$transaction(async (tx) => {
            if (answerUpdates.length > 0) {
                const existingUpdates = answerUpdates.filter((a) => !!a.answerId);
                const newRecords = answerUpdates.filter((a) => !a.answerId);
                await Promise.all(existingUpdates.map((a) => tx.quizAttemptAnswer.update({
                    where: { id: a.answerId },
                    data: {
                        selectedOptionId: a.selectedOptionId,
                        textAnswer: a.textAnswer,
                        isCorrect: a.isCorrect,
                    },
                })));
                if (newRecords.length > 0) {
                    await tx.quizAttemptAnswer.createMany({
                        data: newRecords.map((a) => ({
                            attemptId,
                            questionId: a.questionId,
                            selectedOptionId: a.selectedOptionId,
                            textAnswer: a.textAnswer,
                            isCorrect: a.isCorrect,
                        })),
                    });
                }
            }
            return tx.quizAttempt.update({
                where: { id: attemptId },
                data: {
                    totalPoints: totalQuestions,
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
            id: attempt.id,
            quizId: attempt.quizId,
            userId: attempt.userId,
            quiz: attempt.quiz,
            score: attempt.score,
            totalPoints: attempt.totalPoints,
            startedAt: attempt.startedAt,
            completedAt: attempt.completedAt,
            createdAt: attempt.createdAt,
            answers: attempt.answers.map((a) => ({
                id: a.id,
                attemptId: a.attemptId,
                questionId: a.questionId,
                selectedOptionId: a.selectedOptionId,
                textAnswer: a.textAnswer,
                isCorrect: a.isCorrect,
                question: {
                    id: a.question.id,
                    quizId: a.question.quizId,
                    questionText: a.question.questionText,
                    questionType: a.question.questionType,
                    explanation: a.question.explanation,
                    orderIndex: a.question.orderIndex,
                    options: a.question.options.map((o) => ({
                        id: o.id,
                        questionId: o.questionId,
                        optionText: o.optionText,
                        isCorrect: o.isCorrect,
                        orderIndex: o.orderIndex,
                    })),
                },
                selectedOption: a.selectedOption
                    ? {
                        id: a.selectedOption.id,
                        questionId: a.selectedOption.questionId,
                        optionText: a.selectedOption.optionText,
                        isCorrect: a.selectedOption.isCorrect,
                        orderIndex: a.selectedOption.orderIndex,
                    }
                    : null,
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
                userId: a.userId,
                score: a.score,
                totalPoints: a.totalPoints,
                startedAt: a.startedAt,
                completedAt: a.completedAt,
                createdAt: a.createdAt,
                quiz: {
                    id: a.quiz.id,
                    title: a.quiz.title,
                    subject: a.quiz.subject,
                    _count: a.quiz._count,
                },
                quizTitle: a.quiz.title,
                subjectName: a.quiz.subject.name,
                totalQuestions: a.totalPoints ?? a.quiz._count.questions,
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
        const averageScore = totalAttempts > 0
            ? Math.round((totalScore / totalAttempts) * 100) / 100
            : 0;
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
                ? Math.round((data.scores.reduce((a, b) => a + b, 0) / data.scores.length) *
                    100) / 100
                : 0,
            bestScore: Math.max(...data.scores, 0),
        }));
        return {
            totalAttempts,
            averageScore,
            subjectStats,
        };
    }
    async checkAnswer(dto, userId, role) {
        const question = await this.prisma.quizQuestion.findUnique({
            where: { id: dto.questionId },
            include: {
                options: { orderBy: { orderIndex: 'asc' } },
                quiz: { select: { id: true, subjectId: true } },
            },
        });
        if (!question) {
            throw new common_1.NotFoundException('Question not found');
        }
        if (role !== client_1.Role.ADMIN && role !== client_1.Role.TEACHER) {
            const attempt = await this.prisma.quizAttempt.findFirst({
                where: {
                    userId,
                    quizId: question.quiz.id,
                },
            });
            if (!attempt) {
                throw new common_1.ForbiddenException('You must have started a quiz attempt to check answers.');
            }
        }
        const correctOption = question.options.find((o) => o.isCorrect);
        const isCorrect = correctOption?.id === dto.selectedOptionId;
        return {
            questionId: dto.questionId,
            selectedOptionId: dto.selectedOptionId,
            correctOptionId: correctOption?.id ?? null,
            isCorrect,
        };
    }
    async createManualQuiz(dto) {
        const subject = await this.prisma.subject.findUnique({
            where: { id: dto.subjectId },
        });
        if (!subject) {
            throw new common_1.NotFoundException('Subject not found');
        }
        for (const q of dto.questions) {
            const correctCount = q.options.filter((o) => o.isCorrect).length;
            if (correctCount !== 1) {
                throw new common_1.BadRequestException(`Each question must have exactly one correct answer. "${q.questionText.substring(0, 50)}..." has ${correctCount}.`);
            }
        }
        const quiz = await this.prisma.$transaction(async (tx) => {
            const quizTitle = dto.title || `${subject.name} - Manual Quiz`;
            const newQuiz = await tx.quiz.create({
                data: {
                    title: quizTitle,
                    description: `Manually created quiz with ${dto.questions.length} questions for ${subject.name}`,
                    subjectId: dto.subjectId,
                    isPublished: true,
                },
            });
            for (let i = 0; i < dto.questions.length; i++) {
                const q = dto.questions[i];
                await tx.quizQuestion.create({
                    data: {
                        quizId: newQuiz.id,
                        questionText: q.questionText,
                        questionType: 'MCQ',
                        explanation: q.explanation || '',
                        orderIndex: i,
                        options: {
                            create: q.options.map((opt, j) => ({
                                optionText: opt.text,
                                isCorrect: opt.isCorrect,
                                orderIndex: j,
                            })),
                        },
                    },
                });
            }
            return tx.quiz.findUnique({
                where: { id: newQuiz.id },
                include: {
                    subject: { select: { id: true, name: true } },
                    _count: { select: { questions: true } },
                },
            });
        });
        return {
            message: `Quiz created successfully with ${dto.questions.length} questions`,
            quiz,
        };
    }
    async createAiManualQuiz(dto) {
        const subject = await this.prisma.subject.findUnique({
            where: { id: dto.subjectId },
        });
        if (!subject) {
            throw new common_1.NotFoundException('Subject not found');
        }
        const aiResults = await this.generateDistractorsWithAI(dto.questions, subject.name);
        const quiz = await this.prisma.$transaction(async (tx) => {
            const quizTitle = dto.title || `${subject.name} - Manual Quiz`;
            const newQuiz = await tx.quiz.create({
                data: {
                    title: quizTitle,
                    description: `AI-assisted quiz with ${dto.questions.length} questions for ${subject.name}`,
                    subjectId: dto.subjectId,
                    isPublished: true,
                },
            });
            for (let i = 0; i < dto.questions.length; i++) {
                const q = dto.questions[i];
                const ai = aiResults[i];
                const options = [
                    { text: q.correctAnswer, isCorrect: true },
                    ...ai.distractors.slice(0, 3).map((d) => ({ text: d, isCorrect: false })),
                ];
                for (let j = options.length - 1; j > 0; j--) {
                    const k = Math.floor(Math.random() * (j + 1));
                    [options[j], options[k]] = [options[k], options[j]];
                }
                await tx.quizQuestion.create({
                    data: {
                        quizId: newQuiz.id,
                        questionText: q.questionText,
                        questionType: 'MCQ',
                        explanation: ai.explanation || '',
                        orderIndex: i,
                        options: {
                            create: options.map((opt, j) => ({
                                optionText: opt.text,
                                isCorrect: opt.isCorrect,
                                orderIndex: j,
                            })),
                        },
                    },
                });
            }
            return tx.quiz.findUnique({
                where: { id: newQuiz.id },
                include: {
                    subject: { select: { id: true, name: true } },
                    _count: { select: { questions: true } },
                },
            });
        });
        return {
            message: `Quiz created successfully with ${dto.questions.length} AI-enhanced questions`,
            quiz,
        };
    }
    async generateDistractorsWithAI(questions, subjectName) {
        const apiKey = this.configService.get('AI_API_KEY');
        if (!apiKey) {
            throw new common_1.BadRequestException('AI API key not configured');
        }
        const questionsText = questions
            .map((q, i) => `${i + 1}. Question: ${q.questionText}\n   Correct Answer: ${q.correctAnswer}`)
            .join('\n\n');
        const prompt = `You are an educational quiz assistant for the subject "${subjectName}".

For each question below, generate exactly 3 plausible but incorrect answer options (distractors) and a brief explanation of why the correct answer is right.

Questions:
${questionsText}

IMPORTANT: Respond ONLY with a valid JSON array (no markdown code blocks, no extra text). Each element must be:
{
  "distractors": ["wrong option 1", "wrong option 2", "wrong option 3"],
  "explanation": "Brief explanation of why the correct answer is right"
}

Rules:
- Each distractor must be plausible and related to the subject but clearly incorrect
- Distractors should be similar in length and style to the correct answer
- The explanation should be 1-2 sentences
- Return exactly ${questions.length} elements in the array, one per question, in the same order`;
        const primaryModel = this.configService.get('AI_MODEL', 'gemini-2.0-flash');
        const fallbackModels = [primaryModel, 'gemini-2.0-flash-lite', 'gemini-1.5-flash'].filter((m, i, arr) => arr.indexOf(m) === i);
        let lastError = null;
        for (const model of fallbackModels) {
            for (let attempt = 0; attempt < 2; attempt++) {
                try {
                    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
                    const response = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: prompt }] }],
                            generationConfig: {
                                temperature: 0.7,
                                maxOutputTokens: 8192,
                            },
                        }),
                    });
                    if (response.status === 429) {
                        const errorBody = await response.text();
                        this.logger.warn(`Rate limited on ${model} (attempt ${attempt + 1}): ${errorBody}`);
                        await new Promise((r) => setTimeout(r, (attempt + 1) * 5000));
                        lastError = new Error(`429 rate limited on ${model}`);
                        continue;
                    }
                    if (!response.ok) {
                        const errorBody = await response.text();
                        this.logger.error(`Gemini API error on ${model}: ${response.status} - ${errorBody}`);
                        lastError = new Error(`Gemini API ${response.status} on ${model}`);
                        break;
                    }
                    const data = (await response.json());
                    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (!text) {
                        this.logger.error(`Empty response from Gemini on ${model}`);
                        lastError = new Error(`Empty response from ${model}`);
                        continue;
                    }
                    const cleaned = text
                        .replace(/```json\s*\n?/g, '')
                        .replace(/```\s*\n?/g, '')
                        .trim();
                    const parsed = JSON.parse(cleaned);
                    const valid = parsed.filter((item) => Array.isArray(item.distractors) &&
                        item.distractors.length >= 3 &&
                        item.distractors.every((d) => typeof d === 'string' && d.trim()) &&
                        typeof item.explanation === 'string');
                    if (valid.length !== questions.length) {
                        this.logger.warn(`AI returned ${valid.length} results for ${questions.length} questions, retrying...`);
                        lastError = new Error('Mismatched result count');
                        continue;
                    }
                    return valid;
                }
                catch (innerErr) {
                    lastError = innerErr;
                    this.logger.warn(`Model ${model} attempt ${attempt + 1} failed: ${lastError.message}`);
                }
            }
            this.logger.warn(`All retries exhausted for model ${model}, trying next fallback...`);
        }
        this.logger.error(`All models exhausted. Last error: ${lastError?.message}`);
        throw new common_1.BadRequestException('AI service is temporarily unavailable. Please try again later.');
    }
    async deleteQuiz(quizId) {
        const quiz = await this.prisma.quiz.findUnique({ where: { id: quizId } });
        if (!quiz) {
            throw new common_1.NotFoundException('Quiz not found');
        }
        await this.prisma.quiz.delete({ where: { id: quizId } });
        return { message: 'Quiz deleted successfully' };
    }
    selectQuestionsForAttempt(questions, dto) {
        if (questions.length === 0) {
            throw new common_1.BadRequestException('This quiz has no questions');
        }
        const rangeStart = dto.rangeStart ?? 1;
        const rangeEnd = dto.rangeEnd ?? questions.length;
        if (rangeStart > rangeEnd) {
            throw new common_1.BadRequestException('Range start cannot be greater than range end');
        }
        if (rangeStart < 1 || rangeEnd > questions.length) {
            throw new common_1.BadRequestException(`Question range must be between 1 and ${questions.length}`);
        }
        const rangeQuestions = questions.slice(rangeStart - 1, rangeEnd);
        if (rangeQuestions.length === 0) {
            throw new common_1.BadRequestException('The selected range contains no questions');
        }
        const questionCount = dto.questionCount ?? rangeQuestions.length;
        if (questionCount < 1) {
            throw new common_1.BadRequestException('Question count must be at least 1');
        }
        if (questionCount > rangeQuestions.length) {
            throw new common_1.BadRequestException(`Question count cannot exceed the selected range (${rangeQuestions.length})`);
        }
        const sampled = this.sampleQuestions(rangeQuestions, questionCount);
        return sampled.sort((a, b) => a.orderIndex - b.orderIndex);
    }
    sampleQuestions(items, count) {
        if (count >= items.length) {
            return [...items];
        }
        const shuffled = [...items];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled.slice(0, count);
    }
};
exports.QuizzesService = QuizzesService;
exports.QuizzesService = QuizzesService = QuizzesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService,
        config_1.ConfigService])
], QuizzesService);
//# sourceMappingURL=quizzes.service.js.map