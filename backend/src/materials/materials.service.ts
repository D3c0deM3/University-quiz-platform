import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import { basename, isAbsolute, join, relative, resolve } from 'path';
import { PrismaService } from '../prisma/prisma.service.js';
import { MaterialStatus, DifficultyLevel, QuestionType, SubscriptionStatus } from '@prisma/client';
import { UpdateMetadataDto } from './dto/update-metadata.dto.js';
import { UpdateQuizDto } from './dto/update-quiz.dto.js';
import { CreateQuizQuestionDto, UpdateSingleQuestionDto } from './dto/quiz-question.dto.js';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'image/png',
  'image/jpeg',
  'image/jpg',
];
const uploadDir = process.env.UPLOAD_DIR || '../uploads';
const resolvedUploadDir = isAbsolute(uploadDir)
  ? uploadDir
  : join(process.cwd(), uploadDir);

@Injectable()
export class MaterialsService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  validateFile(file: Express.Multer.File) {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type ${file.mimetype} is not supported. Allowed: PDF, DOCX, PPTX, XLSX, XLS, PNG, JPG`,
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
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
      'application/vnd.ms-excel': 'XLS',
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
        processingProgress: 0,
        processingStage: 'Queued for processing',
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

    const { progress, stage } = this.getProgressByStatus(status);

    return this.prisma.material.update({
      where: { id },
      data: {
        status,
        errorMessage: errorMessage || null,
        processingProgress: progress,
        processingStage: stage,
      },
    });
  }

  async updateProcessingProgress(materialId: string, progress: number, stage?: string) {
    const material = await this.prisma.material.findUnique({ where: { id: materialId } });
    if (!material) {
      throw new NotFoundException('Material not found');
    }

    const clamped = Math.max(0, Math.min(100, Math.round(progress)));
    return this.prisma.material.update({
      where: { id: materialId },
      data: {
        processingProgress: clamped,
        processingStage: stage ?? material.processingStage,
      },
      select: {
        id: true,
        status: true,
        processingProgress: true,
        processingStage: true,
      },
    });
  }

  async remove(id: string) {
    const material = await this.prisma.material.findUnique({ where: { id } });
    if (!material) {
      throw new NotFoundException('Material not found');
    }

    const filePath = this.resolveMaterialFilePath(material.filePath, material.fileName);
    await fs.unlink(filePath).catch(() => undefined);

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
        processingProgress: newStatus === MaterialStatus.REVIEWED ? 100 : material.processingProgress,
        processingStage: newStatus === MaterialStatus.REVIEWED ? 'Reviewed by admin' : 'Rejected by admin',
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
      data: {
        status: newStatus,
        processingProgress: publish ? 100 : material.processingProgress,
        processingStage: publish ? 'Published' : 'Unpublished',
      },
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
        processingProgress: 0,
        processingStage: 'Queued for reprocessing',
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

    const progressMeta = this.getProgressByStatus(status);

    return this.prisma.material.update({
      where: { id: materialId },
      data: {
        status,
        processingProgress: progressMeta.progress,
        processingStage: progressMeta.stage,
      },
      include: { metadata: true },
    });
  }

  async listStoredFiles(page = 1, limit = 20, search?: string) {
    const files = await this.collectStoredFiles(resolvedUploadDir);
    const normalizedSearch = search?.trim().toLowerCase();

    const filtered = normalizedSearch
      ? files.filter((file) =>
          file.relativePath.toLowerCase().includes(normalizedSearch),
        )
      : files;

    const sorted = filtered.sort(
      (a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime(),
    );

    const materials = await this.prisma.material.findMany({
      select: {
        id: true,
        fileName: true,
        originalName: true,
        filePath: true,
        status: true,
        createdAt: true,
        subject: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const materialByPath = new Map<string, (typeof materials)[number]>();
    for (const material of materials) {
      const normalizedPath = this.normalizeRelativePath(
        this.toRelativeMaterialPath(material.filePath, material.fileName),
      );
      materialByPath.set(normalizedPath, material);
      materialByPath.set(this.normalizeRelativePath(material.fileName), material);
    }

    const start = (page - 1) * limit;
    const paged = sorted.slice(start, start + limit).map((file) => {
      const material =
        materialByPath.get(this.normalizeRelativePath(file.relativePath)) ||
        materialByPath.get(this.normalizeRelativePath(basename(file.relativePath)));

      return {
        name: basename(file.relativePath),
        relativePath: file.relativePath,
        size: file.size,
        modifiedAt: file.modifiedAt,
        material: material
          ? {
              id: material.id,
              originalName: material.originalName,
              status: material.status,
              createdAt: material.createdAt,
              subject: material.subject,
            }
          : null,
      };
    });

    return {
      data: paged,
      meta: {
        total: sorted.length,
        page,
        limit,
        totalPages: Math.ceil(sorted.length / limit),
      },
    };
  }

  async getStoredFileForDownload(relativePath: string) {
    if (!relativePath?.trim()) {
      throw new BadRequestException('path is required');
    }

    const { absolutePath, normalizedRelativePath } =
      this.resolveManagedFilePath(relativePath);
    const stat = await fs.stat(absolutePath).catch(() => null);
    if (!stat || !stat.isFile()) {
      throw new NotFoundException('File not found');
    }

    return {
      absolutePath,
      fileName: basename(normalizedRelativePath),
    };
  }

  async deleteStoredFile(relativePath: string) {
    if (!relativePath?.trim()) {
      throw new BadRequestException('path is required');
    }

    const { absolutePath, normalizedRelativePath } =
      this.resolveManagedFilePath(relativePath);
    const stat = await fs.stat(absolutePath).catch(() => null);
    if (!stat || !stat.isFile()) {
      throw new NotFoundException('File not found');
    }

    const fileName = basename(normalizedRelativePath);
    const material = await this.prisma.material.findFirst({
      where: {
        OR: [
          { fileName },
          { filePath: normalizedRelativePath },
          { filePath: absolutePath },
        ],
      },
      select: { id: true },
    });

    if (material) {
      await this.prisma.material.delete({ where: { id: material.id } });
    }

    await fs.unlink(absolutePath);

    return {
      message: 'File deleted successfully',
      materialDeleted: !!material,
    };
  }

  private async collectStoredFiles(dirPath: string): Promise<Array<{
    relativePath: string;
    absolutePath: string;
    size: number;
    modifiedAt: Date;
  }>> {
    const entries = await fs
      .readdir(dirPath, { withFileTypes: true })
      .catch((err: NodeJS.ErrnoException) => {
        if (err.code === 'ENOENT') return [];
        throw err;
      });
    const files: Array<{
      relativePath: string;
      absolutePath: string;
      size: number;
      modifiedAt: Date;
    }> = [];

    for (const entry of entries) {
      const absolutePath = join(dirPath, entry.name);
      if (entry.isDirectory()) {
        const nested = await this.collectStoredFiles(absolutePath);
        files.push(...nested);
        continue;
      }

      if (!entry.isFile()) continue;

      const stat = await fs.stat(absolutePath);
      files.push({
        relativePath: this.normalizeRelativePath(
          relative(resolvedUploadDir, absolutePath),
        ),
        absolutePath,
        size: stat.size,
        modifiedAt: stat.mtime,
      });
    }

    return files;
  }

  private resolveManagedFilePath(relativePath: string) {
    const normalizedRelativePath = this.normalizeRelativePath(relativePath);
    const absolutePath = resolve(resolvedUploadDir, normalizedRelativePath);
    const uploadRoot = resolve(resolvedUploadDir);
    const normalizedAbsolute = absolutePath.replace(/\\/g, '/');
    const normalizedRoot = uploadRoot.replace(/\\/g, '/');
    const uploadRootWithSep = `${normalizedRoot}/`;

    if (
      normalizedAbsolute !== normalizedRoot &&
      !normalizedAbsolute.startsWith(uploadRootWithSep)
    ) {
      throw new BadRequestException('Invalid file path');
    }

    return { absolutePath, normalizedRelativePath };
  }

  private toRelativeMaterialPath(filePath: string, fileName: string) {
    if (!filePath) return fileName;
    if (isAbsolute(filePath)) {
      return relative(resolvedUploadDir, filePath);
    }
    return filePath;
  }

  private resolveMaterialFilePath(filePath: string, fileName: string) {
    if (isAbsolute(filePath)) return filePath;
    return resolve(resolvedUploadDir, filePath || fileName);
  }

  private normalizeRelativePath(pathValue: string) {
    return pathValue.replace(/\\/g, '/').replace(/^\/+/, '');
  }

  private getProgressByStatus(status: MaterialStatus): { progress: number; stage: string } {
    if (status === MaterialStatus.PENDING) {
      return { progress: 0, stage: 'Queued for processing' };
    }
    if (status === MaterialStatus.PROCESSING) {
      return { progress: 5, stage: 'Processing started' };
    }
    if (status === MaterialStatus.PROCESSED) {
      return { progress: 100, stage: 'Processing complete' };
    }
    if (status === MaterialStatus.REVIEWED) {
      return { progress: 100, stage: 'Reviewed by admin' };
    }
    if (status === MaterialStatus.PUBLISHED) {
      return { progress: 100, stage: 'Published' };
    }
    if (status === MaterialStatus.FAILED) {
      return { progress: 0, stage: 'Processing failed' };
    }
    return { progress: 0, stage: 'Unknown' };
  }
}
