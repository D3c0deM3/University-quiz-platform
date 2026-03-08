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
exports.MaterialsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_js_1 = require("../prisma/prisma.service.js");
const client_1 = require("@prisma/client");
const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/png',
    'image/jpeg',
    'image/jpg',
];
let MaterialsService = class MaterialsService {
    prisma;
    configService;
    constructor(prisma, configService) {
        this.prisma = prisma;
        this.configService = configService;
    }
    validateFile(file) {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            throw new common_1.BadRequestException(`File type ${file.mimetype} is not supported. Allowed: PDF, DOCX, PPTX, PNG, JPG`);
        }
        const maxSize = this.configService.get('MAX_FILE_SIZE', 52428800);
        if (file.size > maxSize) {
            throw new common_1.BadRequestException(`File size exceeds the maximum allowed size of ${Math.round(maxSize / 1048576)}MB`);
        }
    }
    async upload(file, subjectId, uploadedById) {
        const subject = await this.prisma.subject.findUnique({
            where: { id: subjectId },
        });
        if (!subject) {
            throw new common_1.NotFoundException('Subject not found');
        }
        this.validateFile(file);
        const fileTypeMap = {
            'application/pdf': 'PDF',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
            'image/png': 'PNG',
            'image/jpeg': 'JPG',
            'image/jpg': 'JPG',
        };
        const material = await this.prisma.material.create({
            data: {
                fileName: file.filename,
                originalName: file.originalname,
                filePath: file.path,
                fileType: fileTypeMap[file.mimetype] || file.mimetype,
                fileSize: file.size,
                status: client_1.MaterialStatus.PENDING,
                subjectId,
                uploadedById,
            },
            include: {
                subject: { select: { id: true, name: true } },
                uploadedBy: { select: { id: true, email: true, firstName: true, lastName: true } },
            },
        });
        return material;
    }
    async findAll(page = 1, limit = 20, status, subjectId) {
        const skip = (page - 1) * limit;
        const where = {};
        if (status)
            where.status = status;
        if (subjectId)
            where.subjectId = subjectId;
        const [materials, total] = await Promise.all([
            this.prisma.material.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    subject: { select: { id: true, name: true } },
                    uploadedBy: { select: { id: true, email: true, firstName: true, lastName: true } },
                    metadata: {
                        select: { title: true, summary: true, keywords: true, tags: true },
                    },
                },
            }),
            this.prisma.material.count({ where }),
        ]);
        return {
            data: materials,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async findOne(id) {
        const material = await this.prisma.material.findUnique({
            where: { id },
            include: {
                subject: true,
                uploadedBy: { select: { id: true, email: true, firstName: true, lastName: true } },
                metadata: true,
                textChunks: { orderBy: { chunkIndex: 'asc' } },
            },
        });
        if (!material) {
            throw new common_1.NotFoundException('Material not found');
        }
        return material;
    }
    async updateStatus(id, status, errorMessage) {
        const material = await this.prisma.material.findUnique({ where: { id } });
        if (!material) {
            throw new common_1.NotFoundException('Material not found');
        }
        return this.prisma.material.update({
            where: { id },
            data: { status, errorMessage: errorMessage || null },
        });
    }
    async remove(id) {
        const material = await this.prisma.material.findUnique({ where: { id } });
        if (!material) {
            throw new common_1.NotFoundException('Material not found');
        }
        await this.prisma.material.delete({ where: { id } });
        return { message: 'Material deleted successfully' };
    }
    async getMetadata(materialId) {
        const metadata = await this.prisma.materialMetadata.findUnique({
            where: { materialId },
        });
        if (!metadata) {
            throw new common_1.NotFoundException('Metadata not found for this material');
        }
        return metadata;
    }
    async updateMetadata(materialId, dto) {
        const metadata = await this.prisma.materialMetadata.findUnique({
            where: { materialId },
        });
        if (!metadata) {
            throw new common_1.NotFoundException('Metadata not found for this material');
        }
        return this.prisma.materialMetadata.update({
            where: { materialId },
            data: {
                title: dto.title ?? metadata.title,
                summary: dto.summary ?? metadata.summary,
                keywords: dto.keywords ?? metadata.keywords,
                topics: dto.topics ?? metadata.topics,
                tags: dto.tags ?? metadata.tags,
                difficultyLevel: dto.difficultyLevel ?? metadata.difficultyLevel,
                contentType: dto.contentType ?? metadata.contentType,
            },
        });
    }
    async getQuizzes(materialId) {
        const material = await this.prisma.material.findUnique({
            where: { id: materialId },
        });
        if (!material) {
            throw new common_1.NotFoundException('Material not found');
        }
        return this.prisma.quiz.findMany({
            where: { materialId },
            include: {
                questions: {
                    orderBy: { orderIndex: 'asc' },
                    include: {
                        options: { orderBy: { orderIndex: 'asc' } },
                    },
                },
                _count: { select: { questions: true, attempts: true } },
            },
        });
    }
    async updateQuiz(quizId, dto) {
        const quiz = await this.prisma.quiz.findUnique({ where: { id: quizId } });
        if (!quiz) {
            throw new common_1.NotFoundException('Quiz not found');
        }
        return this.prisma.$transaction(async (tx) => {
            const updatedQuiz = await tx.quiz.update({
                where: { id: quizId },
                data: {
                    title: dto.title ?? quiz.title,
                    description: dto.description ?? quiz.description,
                    isPublished: dto.isPublished ?? quiz.isPublished,
                },
            });
            if (dto.questions) {
                await tx.quizQuestion.deleteMany({ where: { quizId } });
                for (let i = 0; i < dto.questions.length; i++) {
                    const q = dto.questions[i];
                    const question = await tx.quizQuestion.create({
                        data: {
                            quizId,
                            questionText: q.questionText,
                            questionType: q.questionType,
                            explanation: q.explanation || null,
                            orderIndex: q.orderIndex ?? i,
                        },
                    });
                    if (q.options && q.options.length > 0) {
                        await tx.quizOption.createMany({
                            data: q.options.map((opt, optIdx) => ({
                                questionId: question.id,
                                optionText: opt.optionText,
                                isCorrect: opt.isCorrect,
                                orderIndex: opt.orderIndex ?? optIdx,
                            })),
                        });
                    }
                }
            }
            return tx.quiz.findUnique({
                where: { id: quizId },
                include: {
                    questions: {
                        orderBy: { orderIndex: 'asc' },
                        include: { options: { orderBy: { orderIndex: 'asc' } } },
                    },
                },
            });
        });
    }
    async reviewMaterial(materialId, action, reason) {
        const material = await this.prisma.material.findUnique({
            where: { id: materialId },
        });
        if (!material) {
            throw new common_1.NotFoundException('Material not found');
        }
        if (material.status !== client_1.MaterialStatus.PROCESSED) {
            throw new common_1.BadRequestException(`Material must be in PROCESSED status to review. Current: ${material.status}`);
        }
        const newStatus = action === 'approve' ? client_1.MaterialStatus.REVIEWED : client_1.MaterialStatus.FAILED;
        return this.prisma.material.update({
            where: { id: materialId },
            data: {
                status: newStatus,
                errorMessage: action === 'reject' ? (reason || 'Rejected by admin') : null,
            },
            include: {
                metadata: true,
            },
        });
    }
    async publishMaterial(materialId, publish) {
        const material = await this.prisma.material.findUnique({
            where: { id: materialId },
        });
        if (!material) {
            throw new common_1.NotFoundException('Material not found');
        }
        if (publish && material.status !== client_1.MaterialStatus.REVIEWED) {
            throw new common_1.BadRequestException(`Material must be REVIEWED before publishing. Current: ${material.status}`);
        }
        const newStatus = publish ? client_1.MaterialStatus.PUBLISHED : client_1.MaterialStatus.REVIEWED;
        if (publish) {
            await this.prisma.quiz.updateMany({
                where: { materialId },
                data: { isPublished: true },
            });
        }
        return this.prisma.material.update({
            where: { id: materialId },
            data: { status: newStatus },
            include: {
                metadata: true,
            },
        });
    }
    async reprocessMaterial(materialId) {
        const material = await this.prisma.material.findUnique({
            where: { id: materialId },
        });
        if (!material) {
            throw new common_1.NotFoundException('Material not found');
        }
        if (material.status !== client_1.MaterialStatus.FAILED) {
            throw new common_1.BadRequestException(`Only FAILED materials can be reprocessed. Current: ${material.status}`);
        }
        return this.prisma.material.update({
            where: { id: materialId },
            data: {
                status: client_1.MaterialStatus.PENDING,
                errorMessage: null,
            },
        });
    }
    async getQuizQuestions(quizId) {
        const quiz = await this.prisma.quiz.findUnique({ where: { id: quizId } });
        if (!quiz) {
            throw new common_1.NotFoundException('Quiz not found');
        }
        return this.prisma.quizQuestion.findMany({
            where: { quizId },
            orderBy: { orderIndex: 'asc' },
            include: { options: { orderBy: { orderIndex: 'asc' } } },
        });
    }
    async createQuizQuestion(dto) {
        const quiz = await this.prisma.quiz.findUnique({ where: { id: dto.quizId } });
        if (!quiz) {
            throw new common_1.NotFoundException('Quiz not found');
        }
        const maxOrder = await this.prisma.quizQuestion.aggregate({
            where: { quizId: dto.quizId },
            _max: { orderIndex: true },
        });
        const question = await this.prisma.quizQuestion.create({
            data: {
                quizId: dto.quizId,
                questionText: dto.questionText,
                questionType: dto.questionType,
                explanation: dto.explanation || null,
                orderIndex: dto.orderIndex ?? (maxOrder._max.orderIndex ?? -1) + 1,
            },
        });
        if (dto.options && dto.options.length > 0) {
            await this.prisma.quizOption.createMany({
                data: dto.options.map((opt, idx) => ({
                    questionId: question.id,
                    optionText: opt.optionText,
                    isCorrect: opt.isCorrect,
                    orderIndex: opt.orderIndex ?? idx,
                })),
            });
        }
        return this.prisma.quizQuestion.findUnique({
            where: { id: question.id },
            include: { options: { orderBy: { orderIndex: 'asc' } } },
        });
    }
    async updateQuizQuestion(questionId, dto) {
        const question = await this.prisma.quizQuestion.findUnique({
            where: { id: questionId },
        });
        if (!question) {
            throw new common_1.NotFoundException('Quiz question not found');
        }
        const updated = await this.prisma.quizQuestion.update({
            where: { id: questionId },
            data: {
                questionText: dto.questionText ?? question.questionText,
                questionType: dto.questionType ?? question.questionType,
                explanation: dto.explanation !== undefined ? dto.explanation : question.explanation,
                orderIndex: dto.orderIndex ?? question.orderIndex,
            },
        });
        if (dto.options) {
            await this.prisma.quizOption.deleteMany({ where: { questionId } });
            if (dto.options.length > 0) {
                await this.prisma.quizOption.createMany({
                    data: dto.options.map((opt, idx) => ({
                        questionId,
                        optionText: opt.optionText,
                        isCorrect: opt.isCorrect,
                        orderIndex: opt.orderIndex ?? idx,
                    })),
                });
            }
        }
        return this.prisma.quizQuestion.findUnique({
            where: { id: questionId },
            include: { options: { orderBy: { orderIndex: 'asc' } } },
        });
    }
    async deleteQuizQuestion(questionId) {
        const question = await this.prisma.quizQuestion.findUnique({
            where: { id: questionId },
        });
        if (!question) {
            throw new common_1.NotFoundException('Quiz question not found');
        }
        await this.prisma.quizQuestion.delete({ where: { id: questionId } });
        return { message: 'Question deleted successfully' };
    }
    async deleteQuiz(quizId) {
        const quiz = await this.prisma.quiz.findUnique({ where: { id: quizId } });
        if (!quiz) {
            throw new common_1.NotFoundException('Quiz not found');
        }
        await this.prisma.quiz.delete({ where: { id: quizId } });
        return { message: 'Quiz deleted successfully' };
    }
    async changeStatus(materialId, status) {
        const material = await this.prisma.material.findUnique({
            where: { id: materialId },
        });
        if (!material) {
            throw new common_1.NotFoundException('Material not found');
        }
        return this.prisma.material.update({
            where: { id: materialId },
            data: { status },
            include: { metadata: true },
        });
    }
};
exports.MaterialsService = MaterialsService;
exports.MaterialsService = MaterialsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService,
        config_1.ConfigService])
], MaterialsService);
//# sourceMappingURL=materials.service.js.map