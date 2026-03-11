import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  ParseIntPipe,
  DefaultValuePipe,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FileFieldsInterceptor } from '@nestjs/platform-express';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { diskStorage } from 'multer';
import { extname, join, isAbsolute } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { MaterialsService } from './materials.service.js';
import { JwtAuthGuard, RolesGuard } from '../auth/guards/index.js';
import { Roles, CurrentUser } from '../auth/decorators/index.js';
import { Role, MaterialStatus } from '@prisma/client';
import { ForbiddenException } from '@nestjs/common';
import { SubscriptionsService } from '../subscriptions/subscriptions.service.js';
import { UpdateMetadataDto } from './dto/update-metadata.dto.js';
import { UpdateQuizDto } from './dto/update-quiz.dto.js';
import { CreateQuizQuestionDto, UpdateSingleQuestionDto } from './dto/quiz-question.dto.js';
import type { MaterialProcessingJobData } from './processors/material-processing.processor.js';

const uploadDir = process.env.UPLOAD_DIR || '../uploads';
const resolvedUploadDir = isAbsolute(uploadDir) ? uploadDir : join(process.cwd(), uploadDir);

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xlsx', '.xls', '.txt'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

const storage = diskStorage({
  destination: resolvedUploadDir,
  filename: (_req, file, callback) => {
    const ext = extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return callback(new Error(`File type ${ext} is not allowed. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`), '');
    }
    const uniqueName = `${uuidv4()}${ext}`;
    callback(null, uniqueName);
  },
});

const multerOptions = {
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
};

@Controller('materials')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MaterialsController {
  constructor(
    private materialsService: MaterialsService,
    @InjectQueue('material-processing') private processingQueue: Queue,
    private subscriptionsService: SubscriptionsService,
  ) {}

  @Post('upload')
  @Roles(Role.ADMIN, Role.TEACHER)
  @UseInterceptors(FileInterceptor('file', multerOptions))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('subjectId') subjectId: string,
    @Body('numQuestions') numQuestionsRaw: string,
    @CurrentUser('id') userId: string,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    if (!subjectId) {
      throw new BadRequestException('subjectId is required');
    }

    const numQuestions = parseInt(numQuestionsRaw, 10);
    // 0 means "all questions", otherwise at least 1
    const validNumQuestions = isNaN(numQuestions) ? 10 : (numQuestions === 0 ? 0 : Math.max(numQuestions, 1));

    const material = await this.materialsService.upload(file, subjectId, userId);

    // Enqueue background processing job
    await this.processingQueue.add(
      'process',
      {
        materialId: material.id,
        filePath: material.filePath,
        fileType: material.fileType,
        originalName: material.originalName,
        numQuestions: validNumQuestions,
        uploadedById: userId,
      } satisfies MaterialProcessingJobData,
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    return {
      message: 'Material uploaded successfully. Processing will begin shortly.',
      material,
    };
  }

  @Post('upload-with-questions')
  @Roles(Role.ADMIN, Role.TEACHER)
  @UseInterceptors(FileFieldsInterceptor(
    [
      { name: 'questionsFile', maxCount: 1 },
      { name: 'materialFile', maxCount: 1 },
    ],
    multerOptions,
  ))
  async uploadWithQuestions(
    @UploadedFiles() files: { questionsFile?: Express.Multer.File[]; materialFile?: Express.Multer.File[] },
    @Body('subjectId') subjectId: string,
    @Body('numQuestions') numQuestionsRaw: string,
    @CurrentUser('id') userId: string,
  ) {
    const questionsFile = files?.questionsFile?.[0];
    const materialFile = files?.materialFile?.[0];

    if (!questionsFile) {
      throw new BadRequestException('Questions file is required');
    }
    if (!materialFile) {
      throw new BadRequestException('Study material file is required');
    }
    if (!subjectId) {
      throw new BadRequestException('subjectId is required');
    }

    const numQuestions = parseInt(numQuestionsRaw, 10);
    const validNumQuestions = isNaN(numQuestions) ? 10 : (numQuestions === 0 ? 0 : Math.max(numQuestions, 1));

    // Upload the material file as the primary material
    const material = await this.materialsService.upload(materialFile, subjectId, userId);

    // Enqueue background processing job with dual-file mode
    await this.processingQueue.add(
      'process',
      {
        materialId: material.id,
        filePath: material.filePath,
        fileType: material.fileType,
        originalName: material.originalName,
        numQuestions: validNumQuestions,
        uploadedById: userId,
        mode: 'questions_with_material',
        questionsFilePath: questionsFile.path,
        questionsFileType: extname(questionsFile.originalname).toLowerCase().replace('.', '').toUpperCase(),
      } satisfies MaterialProcessingJobData,
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    return {
      message: 'Questions and material uploaded successfully. Processing will begin shortly.',
      material,
    };
  }

  @Get()
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: MaterialStatus,
    @Query('subjectId') subjectId?: string,
    @CurrentUser('id') userId?: string,
    @CurrentUser('role') role?: Role,
  ) {
    if (role === Role.STUDENT) {
      if (subjectId) {
        // Specific subject requested — verify access
        const hasAccess = await this.subscriptionsService.hasAccess(userId!, subjectId);
        if (!hasAccess) throw new ForbiddenException('You do not have a subscription for this subject');
      }
      // Students can only see materials from their subscribed subjects
      return this.materialsService.findAllForStudent(page, limit, userId!, status, subjectId);
    }
    return this.materialsService.findAll(page, limit, status, subjectId);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    const material = await this.materialsService.findOne(id);
    if (role === Role.STUDENT && material.subjectId) {
      const hasAccess = await this.subscriptionsService.hasAccess(userId, material.subjectId);
      if (!hasAccess) throw new ForbiddenException('You do not have a subscription for this subject');
    }
    return material;
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.TEACHER)
  async remove(@Param('id') id: string) {
    return this.materialsService.remove(id);
  }

  // ────── Admin Review Endpoints ──────

  @Get(':id/metadata')
  async getMetadata(@Param('id') id: string) {
    return this.materialsService.getMetadata(id);
  }

  @Put(':id/metadata')
  @Roles(Role.ADMIN, Role.TEACHER)
  async updateMetadata(@Param('id') id: string, @Body() dto: UpdateMetadataDto) {
    return this.materialsService.updateMetadata(id, dto);
  }

  @Get(':id/quizzes')
  async getQuizzes(@Param('id') id: string) {
    return this.materialsService.getQuizzes(id);
  }

  @Put('quizzes/:quizId')
  @Roles(Role.ADMIN, Role.TEACHER)
  async updateQuiz(@Param('quizId') quizId: string, @Body() dto: UpdateQuizDto) {
    return this.materialsService.updateQuiz(quizId, dto);
  }

  @Delete('quizzes/:quizId')
  @Roles(Role.ADMIN, Role.TEACHER)
  async deleteQuiz(@Param('quizId') quizId: string) {
    return this.materialsService.deleteQuiz(quizId);
  }

  @Patch(':id/review')
  @Roles(Role.ADMIN)
  async reviewMaterial(
    @Param('id') id: string,
    @Body() body: { action: 'approve' | 'reject'; reason?: string },
  ) {
    if (!body.action || !['approve', 'reject'].includes(body.action)) {
      throw new BadRequestException('Action must be "approve" or "reject"');
    }
    return this.materialsService.reviewMaterial(id, body.action, body.reason);
  }

  @Patch(':id/publish')
  @Roles(Role.ADMIN)
  async publishMaterial(
    @Param('id') id: string,
    @Body() body: { publish: boolean },
  ) {
    if (body.publish === undefined) {
      throw new BadRequestException('publish field is required (true/false)');
    }
    return this.materialsService.publishMaterial(id, body.publish);
  }

  @Post(':id/reprocess')
  @Roles(Role.ADMIN, Role.TEACHER)
  async reprocessMaterial(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    const material = await this.materialsService.reprocessMaterial(id);

    // Re-enqueue for processing
    await this.processingQueue.add(
      'process',
      {
        materialId: material.id,
        filePath: material.filePath,
        fileType: material.fileType,
        originalName: material.originalName,
        numQuestions: 10,
        uploadedById: userId,
      } satisfies MaterialProcessingJobData,
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    return {
      message: 'Material queued for reprocessing',
      material,
    };
  }

  // ────── Individual Quiz Question CRUD ──────

  @Post('quiz-questions')
  @Roles(Role.ADMIN, Role.TEACHER)
  async createQuizQuestion(@Body() dto: CreateQuizQuestionDto) {
    return this.materialsService.createQuizQuestion(dto);
  }

  @Put('quiz-questions/:questionId')
  @Roles(Role.ADMIN, Role.TEACHER)
  async updateQuizQuestion(
    @Param('questionId') questionId: string,
    @Body() dto: UpdateSingleQuestionDto,
  ) {
    return this.materialsService.updateQuizQuestion(questionId, dto);
  }

  @Delete('quiz-questions/:questionId')
  @Roles(Role.ADMIN, Role.TEACHER)
  async deleteQuizQuestion(@Param('questionId') questionId: string) {
    return this.materialsService.deleteQuizQuestion(questionId);
  }

  // ────── Change Material Status ──────

  @Patch(':id/status')
  @Roles(Role.ADMIN)
  async changeStatus(
    @Param('id') id: string,
    @Body() body: { status: MaterialStatus },
  ) {
    if (!body.status || !Object.values(MaterialStatus).includes(body.status)) {
      throw new BadRequestException(
        `Invalid status. Must be one of: ${Object.values(MaterialStatus).join(', ')}`,
      );
    }
    return this.materialsService.changeStatus(id, body.status);
  }
}
