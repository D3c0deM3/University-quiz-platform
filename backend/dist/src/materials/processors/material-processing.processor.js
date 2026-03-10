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
var MaterialProcessingProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaterialProcessingProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const prisma_service_js_1 = require("../../prisma/prisma.service.js");
const client_1 = require("@prisma/client");
let MaterialProcessingProcessor = MaterialProcessingProcessor_1 = class MaterialProcessingProcessor extends bullmq_1.WorkerHost {
    prisma;
    logger = new common_1.Logger(MaterialProcessingProcessor_1.name);
    constructor(prisma) {
        super();
        this.prisma = prisma;
    }
    async process(job) {
        const { materialId, filePath, fileType, originalName, numQuestions, uploadedById } = job.data;
        this.logger.log(`Processing material ${materialId} (${originalName})`);
        try {
            await this.prisma.material.update({
                where: { id: materialId },
                data: { status: client_1.MaterialStatus.PROCESSING },
            });
            const pythonUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';
            const response = await fetch(`${pythonUrl}/process/material`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    material_id: materialId,
                    file_path: filePath,
                    file_type: fileType,
                    num_questions: numQuestions || 10,
                }),
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Python service error (${response.status}): ${errorText}`);
            }
            const result = await response.json();
            if (result.error && result.status !== 'success') {
                throw new Error(result.error);
            }
            await this.prisma.$transaction(async (tx) => {
                if (result.metadata) {
                    await tx.materialMetadata.upsert({
                        where: { materialId },
                        create: {
                            materialId,
                            title: result.metadata.title || originalName,
                            summary: result.metadata.summary || null,
                            keywords: result.metadata.keywords || [],
                            topics: result.metadata.topics || [],
                            tags: result.metadata.tags || [],
                            difficultyLevel: this.mapDifficulty(result.metadata.difficulty_level),
                            contentType: result.metadata.content_type || fileType,
                        },
                        update: {
                            title: result.metadata.title || originalName,
                            summary: result.metadata.summary || null,
                            keywords: result.metadata.keywords || [],
                            topics: result.metadata.topics || [],
                            tags: result.metadata.tags || [],
                            difficultyLevel: this.mapDifficulty(result.metadata.difficulty_level),
                            contentType: result.metadata.content_type || fileType,
                        },
                    });
                }
                if (result.text_chunks && result.text_chunks.length > 0) {
                    await tx.materialTextChunk.deleteMany({ where: { materialId } });
                    await tx.materialTextChunk.createMany({
                        data: result.text_chunks.map((chunk, index) => ({
                            materialId,
                            chunkIndex: index,
                            content: chunk,
                        })),
                    });
                }
                if (result.quiz_questions && result.quiz_questions.length > 0) {
                    const material = await tx.material.findUnique({
                        where: { id: materialId },
                        select: { subjectId: true },
                    });
                    if (material) {
                        const quiz = await tx.quiz.create({
                            data: {
                                title: `Quiz: ${result.metadata?.title || originalName}`,
                                description: `Auto-generated quiz from ${originalName}`,
                                subjectId: material.subjectId,
                                materialId,
                                isPublished: false,
                            },
                        });
                        for (let i = 0; i < result.quiz_questions.length; i++) {
                            const q = result.quiz_questions[i];
                            const question = await tx.quizQuestion.create({
                                data: {
                                    quizId: quiz.id,
                                    questionText: q.question_text,
                                    questionType: this.mapQuestionType(q.question_type),
                                    explanation: q.explanation || null,
                                    orderIndex: i,
                                },
                            });
                            if (q.options && q.options.length > 0) {
                                await tx.quizOption.createMany({
                                    data: q.options.map((opt, optIndex) => ({
                                        questionId: question.id,
                                        optionText: opt.text,
                                        isCorrect: opt.is_correct || false,
                                        orderIndex: optIndex,
                                    })),
                                });
                            }
                        }
                        if (uploadedById) {
                            for (const q of result.quiz_questions) {
                                const correctOption = q.options?.find((opt) => opt.is_correct);
                                const answerText = correctOption?.text || q.explanation || '';
                                if (q.question_text && answerText) {
                                    await tx.manualQuestion.create({
                                        data: {
                                            questionText: q.question_text,
                                            answerText,
                                            subjectId: material.subjectId,
                                            createdById: uploadedById,
                                            status: client_1.QuestionStatus.APPROVED,
                                        },
                                    });
                                }
                            }
                        }
                    }
                }
                await tx.material.update({
                    where: { id: materialId },
                    data: { status: client_1.MaterialStatus.PROCESSED, errorMessage: null },
                });
            });
            this.logger.log(`Material ${materialId} processed successfully`);
        }
        catch (error) {
            this.logger.error(`Failed to process material ${materialId}: ${error.message}`);
            await this.prisma.material.update({
                where: { id: materialId },
                data: {
                    status: client_1.MaterialStatus.FAILED,
                    errorMessage: error.message || 'Unknown processing error',
                },
            });
            throw error;
        }
    }
    mapDifficulty(level) {
        if (!level)
            return null;
        const upper = level.toUpperCase();
        if (upper === 'BEGINNER')
            return client_1.DifficultyLevel.BEGINNER;
        if (upper === 'INTERMEDIATE')
            return client_1.DifficultyLevel.INTERMEDIATE;
        if (upper === 'ADVANCED')
            return client_1.DifficultyLevel.ADVANCED;
        return null;
    }
    mapQuestionType(type) {
        if (!type)
            return client_1.QuestionType.MCQ;
        const upper = type.toUpperCase();
        if (upper === 'TRUE_FALSE' || upper === 'TRUEFALSE' || upper === 'TF')
            return client_1.QuestionType.TRUE_FALSE;
        if (upper === 'SHORT_ANSWER' || upper === 'SHORTANSWER' || upper === 'SHORT')
            return client_1.QuestionType.SHORT_ANSWER;
        return client_1.QuestionType.MCQ;
    }
};
exports.MaterialProcessingProcessor = MaterialProcessingProcessor;
exports.MaterialProcessingProcessor = MaterialProcessingProcessor = MaterialProcessingProcessor_1 = __decorate([
    (0, bullmq_1.Processor)('material-processing'),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService])
], MaterialProcessingProcessor);
//# sourceMappingURL=material-processing.processor.js.map