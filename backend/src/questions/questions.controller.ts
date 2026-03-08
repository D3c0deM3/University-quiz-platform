import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  DefaultValuePipe,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { QuestionsService } from './questions.service.js';
import { JwtAuthGuard, RolesGuard } from '../auth/guards/index.js';
import { Roles, CurrentUser } from '../auth/decorators/index.js';
import { Role, QuestionStatus } from '@prisma/client';
import { CreateQuestionDto, UpdateQuestionDto, ReviewQuestionDto, GenerateQuizFromQADto } from './dto/index.js';

const uploadDir = process.env.UPLOAD_DIR || '../uploads';

const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB

const imageStorage = diskStorage({
  destination: join(process.cwd(), uploadDir, 'question-images'),
  filename: (_req, file, callback) => {
    const ext = extname(file.originalname).toLowerCase();
    if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
      return callback(
        new Error(`Image type ${ext} is not allowed. Allowed: ${ALLOWED_IMAGE_EXTENSIONS.join(', ')}`),
        '',
      );
    }
    const uniqueName = `${uuidv4()}${ext}`;
    callback(null, uniqueName);
  },
});

const imageMulterOptions = {
  storage: imageStorage,
  limits: { fileSize: MAX_IMAGE_SIZE },
  fileFilter: (_req: any, file: any, callback: any) => {
    if (!file.mimetype.startsWith('image/')) {
      return callback(new BadRequestException('Only image files are allowed'), false);
    }
    callback(null, true);
  },
};

@Controller('questions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QuestionsController {
  constructor(private questionsService: QuestionsService) {}

  /**
   * POST /questions — Create a new Q&A entry (with optional image)
   * Students: created as PENDING
   * Admin/Teacher: created as APPROVED
   */
  @Post()
  @UseInterceptors(FileInterceptor('image', imageMulterOptions))
  async create(
    @Body() dto: CreateQuestionDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: Role,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    const imagePath = image ? image.path : undefined;
    return this.questionsService.create(dto, userId, userRole, imagePath);
  }

  /**
   * GET /questions — List questions with filters
   * Admin sees all, students see approved + their own
   */
  @Get()
  async findAll(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: Role,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('subjectId') subjectId?: string,
    @Query('status') status?: QuestionStatus,
    @Query('search') search?: string,
    @Query('mine') mine?: string,
  ) {
    const filters: any = {};
    if (subjectId) filters.subjectId = subjectId;
    if (search) filters.search = search;

    if (userRole === Role.ADMIN || userRole === Role.TEACHER) {
      // Admin/teacher can filter by status
      if (status) filters.status = status;
    } else {
      // Students see only approved questions, or their own
      if (mine === 'true') {
        filters.createdById = userId;
        if (status) filters.status = status;
      } else {
        filters.status = QuestionStatus.APPROVED;
      }
    }

    return this.questionsService.findAll(page, limit, filters);
  }

  /**
   * GET /questions/counts — Get question status counts
   */
  @Get('counts')
  @Roles(Role.ADMIN, Role.TEACHER)
  async getCounts(@Query('subjectId') subjectId?: string) {
    return this.questionsService.getStatusCounts(subjectId);
  }

  /**
   * GET /questions/:id — Get a single question
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.questionsService.findOne(id);
  }

  /**
   * PUT /questions/:id — Update a question (with optional new image)
   */
  @Put(':id')
  @UseInterceptors(FileInterceptor('image', imageMulterOptions))
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateQuestionDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: Role,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    const imagePath = image ? image.path : undefined;
    return this.questionsService.update(id, dto, userId, userRole, imagePath);
  }

  /**
   * DELETE /questions/:id — Delete a question
   */
  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: Role,
  ) {
    return this.questionsService.remove(id, userId, userRole);
  }

  /**
   * PATCH /questions/:id/review — Approve or reject a question (admin only)
   */
  @Patch(':id/review')
  @Roles(Role.ADMIN, Role.TEACHER)
  async review(@Param('id') id: string, @Body() dto: ReviewQuestionDto) {
    return this.questionsService.review(id, dto.status);
  }

  /**
   * POST /questions/generate-quiz — Generate an MCQ quiz from approved questions (admin only)
   */
  @Post('generate-quiz')
  @Roles(Role.ADMIN, Role.TEACHER)
  async generateQuiz(@Body() dto: GenerateQuizFromQADto) {
    return this.questionsService.generateQuizFromQA(dto);
  }
}
