import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { QuizzesService } from './quizzes.service.js';
import { JwtAuthGuard, RolesGuard } from '../auth/guards/index.js';
import { CurrentUser, Roles } from '../auth/decorators/index.js';
import { Role } from '@prisma/client';
import { SubmitQuizDto } from './dto/submit-quiz.dto.js';
import { CheckAnswerDto } from './dto/check-answer.dto.js';
import { SubscriptionsService } from '../subscriptions/subscriptions.service.js';
import { ForbiddenException } from '@nestjs/common';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class QuizzesController {
  constructor(
    private quizzesService: QuizzesService,
    private subscriptionsService: SubscriptionsService,
  ) {}

  // ────── Quiz Delivery (Step 17) ──────

  /**
   * GET /subjects/:id/quizzes — list available quizzes for a subject
   */
  @Get('subjects/:id/quizzes')
  async findBySubject(
    @Param('id') subjectId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    if (role === Role.STUDENT) {
      const hasAccess = await this.subscriptionsService.hasAccess(userId, subjectId);
      if (!hasAccess) throw new ForbiddenException('You do not have a subscription for this subject');
    }
    return this.quizzesService.findBySubject(subjectId, page, limit);
  }

  /**
   * GET /quizzes/:id — get quiz details with questions (without answers)
   */
  @Get('quizzes/:id')
  async findOne(
    @Param('id') quizId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    const quiz = await this.quizzesService.findOne(quizId);
    if (role === Role.STUDENT && quiz.subjectId) {
      const hasAccess = await this.subscriptionsService.hasAccess(userId, quiz.subjectId);
      if (!hasAccess) throw new ForbiddenException('You do not have a subscription for this subject');
    }
    return quiz;
  }

  /**
   * POST /quizzes/:id/attempts — start a quiz attempt
   */
  @Post('quizzes/:id/attempts')
  async startAttempt(
    @Param('id') quizId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    if (role === Role.STUDENT) {
      const quiz = await this.quizzesService.findOne(quizId);
      if (quiz.subjectId) {
        const hasAccess = await this.subscriptionsService.hasAccess(userId, quiz.subjectId);
        if (!hasAccess) throw new ForbiddenException('You do not have a subscription for this subject');
      }
    }
    return this.quizzesService.startAttempt(quizId, userId);
  }

  /**
   * POST /quiz-attempts/:id/submit — submit answers, auto-grade, store results
   */
  @Post('quiz-attempts/:id/submit')
  async submitAttempt(
    @Param('id') attemptId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: SubmitQuizDto,
  ) {
    return this.quizzesService.submitAttempt(attemptId, userId, dto);
  }

  /**
   * POST /quizzes/check-answer — check a single answer for instant feedback
   */
  @Post('quizzes/check-answer')
  async checkAnswer(@Body() dto: CheckAnswerDto) {
    return this.quizzesService.checkAnswer(dto);
  }

  /**
   * GET /quiz-attempts/:id/results — view results with correct answers
   */
  @Get('quiz-attempts/:id/results')
  async getAttemptResults(
    @Param('id') attemptId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.quizzesService.getAttemptResults(attemptId, userId);
  }

  // ────── Quiz History (Step 18) ──────

  /**
   * GET /my/quiz-attempts — student's quiz history
   */
  @Get('my/quiz-attempts')
  async getMyAttempts(
    @CurrentUser('id') userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.quizzesService.getMyAttempts(userId, page, limit);
  }

  /**
   * GET /my/quiz-attempts/:id — detailed attempt review
   */
  @Get('my/quiz-attempts/:id')
  async getMyAttemptDetail(
    @Param('id') attemptId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.quizzesService.getAttemptResults(attemptId, userId);
  }

  /**
   * GET /my/quiz-stats — student's statistics (avg score per subject, total attempts, etc.)
   */
  @Get('my/quiz-stats')
  async getMyStats(@CurrentUser('id') userId: string) {
    return this.quizzesService.getMyStats(userId);
  }

  /**
   * DELETE /quizzes/:id — delete a quiz (admin/teacher only)
   */
  @Delete('quizzes/:id')
  @Roles(Role.ADMIN, Role.TEACHER)
  async deleteQuiz(@Param('id') quizId: string) {
    return this.quizzesService.deleteQuiz(quizId);
  }
}
