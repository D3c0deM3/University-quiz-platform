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
var QuestionsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuestionsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_js_1 = require("../prisma/prisma.service.js");
const client_1 = require("@prisma/client");
const promises_1 = require("fs/promises");
let QuestionsService = QuestionsService_1 = class QuestionsService {
    prisma;
    configService;
    logger = new common_1.Logger(QuestionsService_1.name);
    constructor(prisma, configService) {
        this.prisma = prisma;
        this.configService = configService;
    }
    async create(dto, userId, userRole, imagePath) {
        const subject = await this.prisma.subject.findUnique({
            where: { id: dto.subjectId },
        });
        if (!subject) {
            throw new common_1.NotFoundException('Subject not found');
        }
        const status = userRole === client_1.Role.ADMIN || userRole === client_1.Role.TEACHER
            ? client_1.QuestionStatus.APPROVED
            : client_1.QuestionStatus.PENDING;
        return this.prisma.manualQuestion.create({
            data: {
                questionText: dto.questionText,
                answerText: dto.answerText,
                imagePath: imagePath || null,
                subjectId: dto.subjectId,
                createdById: userId,
                status,
            },
            include: {
                subject: { select: { id: true, name: true } },
                createdBy: { select: { id: true, firstName: true, lastName: true, role: true } },
            },
        });
    }
    async findAll(page = 1, limit = 20, filters = {}) {
        const skip = (page - 1) * limit;
        const where = {};
        if (filters.subjectId)
            where.subjectId = filters.subjectId;
        if (filters.status)
            where.status = filters.status;
        if (filters.createdById)
            where.createdById = filters.createdById;
        if (filters.search) {
            where.OR = [
                { questionText: { contains: filters.search, mode: 'insensitive' } },
                { answerText: { contains: filters.search, mode: 'insensitive' } },
            ];
        }
        const [questions, total] = await Promise.all([
            this.prisma.manualQuestion.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    subject: { select: { id: true, name: true } },
                    createdBy: { select: { id: true, firstName: true, lastName: true, role: true } },
                },
            }),
            this.prisma.manualQuestion.count({ where }),
        ]);
        return {
            data: questions,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async findOne(id) {
        const question = await this.prisma.manualQuestion.findUnique({
            where: { id },
            include: {
                subject: { select: { id: true, name: true } },
                createdBy: { select: { id: true, firstName: true, lastName: true, role: true } },
            },
        });
        if (!question) {
            throw new common_1.NotFoundException('Question not found');
        }
        return question;
    }
    async update(id, dto, userId, userRole, imagePath) {
        const question = await this.findOne(id);
        if (question.createdById !== userId &&
            userRole !== client_1.Role.ADMIN &&
            userRole !== client_1.Role.TEACHER) {
            throw new common_1.ForbiddenException('You can only edit your own questions');
        }
        if (dto.subjectId) {
            const subject = await this.prisma.subject.findUnique({
                where: { id: dto.subjectId },
            });
            if (!subject) {
                throw new common_1.NotFoundException('Subject not found');
            }
        }
        const data = {};
        if (dto.questionText)
            data.questionText = dto.questionText;
        if (dto.answerText)
            data.answerText = dto.answerText;
        if (dto.subjectId)
            data.subjectId = dto.subjectId;
        if (imagePath) {
            if (question.imagePath) {
                try {
                    await (0, promises_1.unlink)(question.imagePath);
                }
                catch {
                }
            }
            data.imagePath = imagePath;
        }
        if (userRole === client_1.Role.STUDENT) {
            data.status = client_1.QuestionStatus.PENDING;
        }
        return this.prisma.manualQuestion.update({
            where: { id },
            data,
            include: {
                subject: { select: { id: true, name: true } },
                createdBy: { select: { id: true, firstName: true, lastName: true, role: true } },
            },
        });
    }
    async remove(id, userId, userRole) {
        const question = await this.findOne(id);
        if (question.createdById !== userId &&
            userRole !== client_1.Role.ADMIN &&
            userRole !== client_1.Role.TEACHER) {
            throw new common_1.ForbiddenException('You can only delete your own questions');
        }
        if (question.imagePath) {
            try {
                await (0, promises_1.unlink)(question.imagePath);
            }
            catch {
            }
        }
        await this.prisma.manualQuestion.delete({ where: { id } });
        return { message: 'Question deleted successfully' };
    }
    async review(id, status) {
        await this.findOne(id);
        if (status !== client_1.QuestionStatus.APPROVED && status !== client_1.QuestionStatus.REJECTED) {
            throw new common_1.BadRequestException('Status must be APPROVED or REJECTED');
        }
        return this.prisma.manualQuestion.update({
            where: { id },
            data: { status },
            include: {
                subject: { select: { id: true, name: true } },
                createdBy: { select: { id: true, firstName: true, lastName: true, role: true } },
            },
        });
    }
    async generateQuizFromQA(dto) {
        const questions = await this.prisma.manualQuestion.findMany({
            where: {
                subjectId: dto.subjectId,
                status: client_1.QuestionStatus.APPROVED,
            },
            include: {
                subject: { select: { id: true, name: true } },
            },
        });
        if (questions.length < 3) {
            throw new common_1.BadRequestException(`Need at least 3 approved questions to generate a quiz. Currently have ${questions.length}.`);
        }
        const subject = await this.prisma.subject.findUnique({
            where: { id: dto.subjectId },
        });
        if (!subject) {
            throw new common_1.NotFoundException('Subject not found');
        }
        const mcqs = await this.callGeminiForMCQs(questions, subject.name);
        if (!mcqs || mcqs.length === 0) {
            throw new common_1.BadRequestException('AI failed to generate quiz questions. Please try again.');
        }
        const quiz = await this.prisma.$transaction(async (tx) => {
            const quizTitle = dto.title || `${subject.name} - Q&A Quiz`;
            const newQuiz = await tx.quiz.create({
                data: {
                    title: quizTitle,
                    description: `Auto-generated quiz from ${questions.length} Q&A pairs for ${subject.name}`,
                    subjectId: dto.subjectId,
                    isPublished: true,
                },
            });
            for (let i = 0; i < mcqs.length; i++) {
                const mcq = mcqs[i];
                await tx.quizQuestion.create({
                    data: {
                        quizId: newQuiz.id,
                        questionText: mcq.question,
                        questionType: 'MCQ',
                        explanation: mcq.explanation || '',
                        orderIndex: i,
                        options: {
                            create: mcq.options.map((opt, j) => ({
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
            message: `Quiz generated successfully with ${mcqs.length} questions`,
            quiz,
        };
    }
    async callGeminiForMCQs(qaPairs, subjectName) {
        const apiKey = this.configService.get('AI_API_KEY');
        if (!apiKey) {
            throw new common_1.BadRequestException('AI API key not configured');
        }
        const qaText = qaPairs
            .map((q, i) => `${i + 1}. Q: ${q.questionText}\n   A: ${q.answerText}`)
            .join('\n\n');
        const prompt = `You are an educational quiz generator. Given the following Q&A pairs for the subject "${subjectName}", generate multiple-choice questions (MCQs) based on each Q&A pair. 

For each Q&A pair, create one MCQ with:
- A clear question based on the original question
- 4 options (A, B, C, D) where exactly one is the correct answer based on the provided answer
- The correct answer should be derived from the original answer
- The 3 incorrect options (distractors) should be plausible but wrong
- A brief explanation of why the correct answer is right

Q&A Pairs:
${qaText}

IMPORTANT: Respond ONLY with a valid JSON array (no markdown code blocks, no extra text). Each element should be:
{
  "question": "the question text",
  "options": [
    {"text": "option A text", "isCorrect": true/false},
    {"text": "option B text", "isCorrect": true/false},
    {"text": "option C text", "isCorrect": true/false},
    {"text": "option D text", "isCorrect": true/false}
  ],
  "explanation": "brief explanation"
}

Ensure exactly one option per question has isCorrect: true.`;
        try {
            const primaryModel = this.configService.get('AI_MODEL', 'gemini-3.1-flash-lite-preview');
            const fallbackModels = [primaryModel, 'gemini-2.5-flash-lite'].filter((m, i, arr) => arr.indexOf(m) === i);
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
                            this.logger.error(`Gemini API error: ${response.status} - ${errorBody}`);
                            throw new common_1.BadRequestException('AI service returned an error');
                        }
                        const data = (await response.json());
                        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                        if (!text) {
                            this.logger.error('Empty response from Gemini');
                            throw new common_1.BadRequestException('AI service returned empty response');
                        }
                        const cleaned = text
                            .replace(/```json\s*\n?/g, '')
                            .replace(/```\s*\n?/g, '')
                            .trim();
                        const parsed = JSON.parse(cleaned);
                        return parsed.filter((mcq) => {
                            return (mcq.question &&
                                Array.isArray(mcq.options) &&
                                mcq.options.length >= 2 &&
                                mcq.options.some((o) => o.isCorrect) &&
                                mcq.options.every((o) => o.text));
                        });
                    }
                    catch (innerErr) {
                        if (innerErr instanceof common_1.BadRequestException)
                            throw innerErr;
                        lastError = innerErr;
                        this.logger.warn(`Model ${model} attempt ${attempt + 1} failed: ${lastError.message}`);
                    }
                }
                this.logger.warn(`All retries exhausted for model ${model}, trying next fallback...`);
            }
            this.logger.error(`All models exhausted. Last error: ${lastError?.message}`);
            throw new common_1.BadRequestException('AI service is temporarily unavailable. Please try again later.');
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException)
                throw error;
            this.logger.error(`Failed to generate MCQs from Gemini: ${error}`);
            throw new common_1.BadRequestException('Failed to generate quiz from AI. Please try again.');
        }
    }
    async getStatusCounts(subjectId) {
        const where = {};
        if (subjectId)
            where.subjectId = subjectId;
        const [pending, approved, rejected, total] = await Promise.all([
            this.prisma.manualQuestion.count({ where: { ...where, status: client_1.QuestionStatus.PENDING } }),
            this.prisma.manualQuestion.count({ where: { ...where, status: client_1.QuestionStatus.APPROVED } }),
            this.prisma.manualQuestion.count({ where: { ...where, status: client_1.QuestionStatus.REJECTED } }),
            this.prisma.manualQuestion.count({ where }),
        ]);
        return { pending, approved, rejected, total };
    }
    async getSubjectCounts() {
        const results = await this.prisma.manualQuestion.groupBy({
            by: ['subjectId'],
            where: { status: client_1.QuestionStatus.APPROVED },
            _count: { id: true },
        });
        const subjectIds = results.map((r) => r.subjectId);
        const subjects = await this.prisma.subject.findMany({
            where: { id: { in: subjectIds } },
            select: { id: true, name: true, description: true },
        });
        const subjectMap = new Map(subjects.map((s) => [s.id, s]));
        return results
            .map((r) => {
            const subject = subjectMap.get(r.subjectId);
            return {
                subjectId: r.subjectId,
                subjectName: subject?.name || 'Unknown',
                subjectDescription: subject?.description || null,
                questionCount: r._count.id,
            };
        })
            .sort((a, b) => b.questionCount - a.questionCount);
    }
};
exports.QuestionsService = QuestionsService;
exports.QuestionsService = QuestionsService = QuestionsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService,
        config_1.ConfigService])
], QuestionsService);
//# sourceMappingURL=questions.service.js.map