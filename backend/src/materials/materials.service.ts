import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service.js';
import { MaterialStatus, DifficultyLevel, QuestionType, SubscriptionStatus } from '@prisma/client';
import { UpdateMetadataDto } from './dto/update-metadata.dto.js';
import { UpdateQuizDto } from './dto/update-quiz.dto.js';
import { CreateQuizQuestionDto, UpdateSingleQuestionDto } from './dto/quiz-question.dto.js';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/png',
  'image/jpeg',
  'image/jpg',
];

@Injectable()
export class MaterialsService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  validateFile(file: Express.Multer.File) {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type ${file.mimetype} is not supported. Allowed: PDF, DOCX, PPTX, PNG, JPG`,
      );
    }

    const maxSize = this.configService.get<number>('MAX_FILE_SIZE', 52428800);
    if (file.size > maxSize) {
      throw new BadRequestException(
        `File size exceeds the maximum allowed size of ${Math.round(maxSize / 1048576)}MB`,
      );
    }
  }

  async upload(
    file: Express.Multer.File,
    subjectId: string,
    uploadedById: string,
  ) {
    // Verify subject exists
    const subject = await this.prisma.subject.findUnique({
      where: { id: subjectId },
    });
    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    this.validateFile(file);

    // Determine file type label
    const fileTypeMap: Record<string, string> = {
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
        status: MaterialStatus.PENDING,
        subjectId,
        uploadedById,
      },
      include: {
        subject: { select: { id: true, name: true } },
        uploadedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return material;
  }

  async findAll(
    page = 1,
    limit = 20,
    status?: MaterialStatus,
    subjectId?: string,
  ) {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (subjectId) where.subjectId = subjectId;

    const [materials, total] = await Promise.all([
      this.prisma.material.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          subject: { select: { id: true, name: true } },
          uploadedBy: { select: { id: true, firstName: true, lastName: true } },
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

  /**
   * List materials restricted to subjects the student is subscribed to.
   * Only PUBLISHED materials are shown.
   */
  async findAllForStudent(
    page = 1,
    limit = 20,
    userId: string,
    status?: MaterialStatus,
    subjectId?: string,
  ) {
    // Get the student's active subscribed subject IDs
    const subs = await this.prisma.userSubscription.findMany({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      select: { subjectId: true },
    });
    const subscribedSubjectIds = subs.map((s) => s.subjectId);

    if (subscribedSubjectIds.length === 0) {
      return { data: [], meta: { total: 0, page, limit, totalPages: 0 } };
    }

    const skip = (page - 1) * limit;

    const where: any = {
      status: status || MaterialStatus.PUBLISHED, // Students only see PUBLISHED by default
      subjectId: subjectId
        ? subjectId // Already verified access in controller
        : { in: subscribedSubjectIds },
    };

    const [materials, total] = await Promise.all([
      this.prisma.material.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          subject: { select: { id: true, name: true } },
          uploadedBy: { select: { id: true, firstName: true, lastName: true } },
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

  async findOne(id: string) {
    const material = await this.prisma.material.findUnique({
      where: { id },
      include: {
        subject: true,
        uploadedBy: { select: { id: true, firstName: true, lastName: true } },
        metadata: true,
        textChunks: { orderBy: { chunkIndex: 'asc' } },
      },
    });

    if (!material) {
      throw new NotFoundException('Material not found');
    }

    return material;
  }

  async updateStatus(id: string, status: MaterialStatus, errorMessage?: string) {
    const material = await this.prisma.material.findUnique({ where: { id } });
    if (!material) {
      throw new NotFoundException('Material not found');
    }

    return this.prisma.material.update({
      where: { id },
      data: { status, errorMessage: errorMessage || null },
    });
  }

  async remove(id: string) {
    const material = await this.prisma.material.findUnique({ where: { id } });
    if (!material) {
      throw new NotFoundException('Material not found');
    }
    await this.prisma.material.delete({ where: { id } });
    return { message: 'Material deleted successfully' };
  }

  // ────── Admin Review Endpoints ──────

  async getMetadata(materialId: string) {
    const metadata = await this.prisma.materialMetadata.findUnique({
      where: { materialId },
    });
    if (!metadata) {
      throw new NotFoundException('Metadata not found for this material');
    }
    return metadata;
  }

  async updateMetadata(materialId: string, dto: UpdateMetadataDto) {
    const metadata = await this.prisma.materialMetadata.findUnique({
      where: { materialId },
    });
    if (!metadata) {
      throw new NotFoundException('Metadata not found for this material');
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

  async getQuizzes(materialId: string) {
    const material = await this.prisma.material.findUnique({
      where: { id: materialId },
    });
    if (!material) {
      throw new NotFoundException('Material not found');
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

  async updateQuiz(quizId: string, dto: UpdateQuizDto) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    return this.prisma.$transaction(async (tx) => {
      // Update quiz fields
      const updatedQuiz = await tx.quiz.update({
        where: { id: quizId },
        data: {
          title: dto.title ?? quiz.title,
          description: dto.description ?? quiz.description,
          isPublished: dto.isPublished ?? quiz.isPublished,
        },
      });

      // Update questions if provided
      if (dto.questions) {
        // Delete existing questions (cascade deletes options)
        await tx.quizQuestion.deleteMany({ where: { quizId } });

        // Create new questions with options
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

      // Return updated quiz with questions
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

  async reviewMaterial(materialId: string, action: 'approve' | 'reject', reason?: string) {
    const material = await this.prisma.material.findUnique({
      where: { id: materialId },
    });
    if (!material) {
      throw new NotFoundException('Material not found');
    }

    if (material.status !== MaterialStatus.PROCESSED) {
      throw new BadRequestException(
        `Material must be in PROCESSED status to review. Current: ${material.status}`,
      );
    }

    const newStatus = action === 'approve' ? MaterialStatus.REVIEWED : MaterialStatus.FAILED;
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

  async publishMaterial(materialId: string, publish: boolean) {
    const material = await this.prisma.material.findUnique({
      where: { id: materialId },
    });
    if (!material) {
      throw new NotFoundException('Material not found');
    }

    if (publish && material.status !== MaterialStatus.REVIEWED) {
      throw new BadRequestException(
        `Material must be REVIEWED before publishing. Current: ${material.status}`,
      );
    }

    const newStatus = publish ? MaterialStatus.PUBLISHED : MaterialStatus.REVIEWED;

    // Also update quiz publish status
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

  async reprocessMaterial(materialId: string) {
    const material = await this.prisma.material.findUnique({
      where: { id: materialId },
    });
    if (!material) {
      throw new NotFoundException('Material not found');
    }

    const reprocessableStatuses: MaterialStatus[] = [MaterialStatus.FAILED, MaterialStatus.REVIEWED, MaterialStatus.PROCESSED];
    if (!reprocessableStatuses.includes(material.status)) {
      throw new BadRequestException(
        `Only FAILED, PROCESSED, or REVIEWED materials can be reprocessed. Current: ${material.status}`,
      );
    }

    return this.prisma.material.update({
      where: { id: materialId },
      data: {
        status: MaterialStatus.PENDING,
        errorMessage: null,
      },
    });
  }

  // ────── Individual Quiz Question CRUD ──────

  async getQuizQuestions(quizId: string) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    return this.prisma.quizQuestion.findMany({
      where: { quizId },
      orderBy: { orderIndex: 'asc' },
      include: { options: { orderBy: { orderIndex: 'asc' } } },
    });
  }

  async createQuizQuestion(dto: CreateQuizQuestionDto) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id: dto.quizId } });
    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    // Get max order index
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

  async updateQuizQuestion(questionId: string, dto: UpdateSingleQuestionDto) {
    const question = await this.prisma.quizQuestion.findUnique({
      where: { id: questionId },
    });
    if (!question) {
      throw new NotFoundException('Quiz question not found');
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

    // Replace options if provided
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

  async deleteQuizQuestion(questionId: string) {
    const question = await this.prisma.quizQuestion.findUnique({
      where: { id: questionId },
    });
    if (!question) {
      throw new NotFoundException('Quiz question not found');
    }

    await this.prisma.quizQuestion.delete({ where: { id: questionId } });
    return { message: 'Question deleted successfully' };
  }

  async deleteQuiz(quizId: string) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }
    await this.prisma.quiz.delete({ where: { id: quizId } });
    return { message: 'Quiz deleted successfully' };
  }

  // ────── Change Material Status ──────

  async changeStatus(materialId: string, status: MaterialStatus) {
    const material = await this.prisma.material.findUnique({
      where: { id: materialId },
    });
    if (!material) {
      throw new NotFoundException('Material not found');
    }

    return this.prisma.material.update({
      where: { id: materialId },
      data: { status },
      include: { metadata: true },
    });
  }
}
