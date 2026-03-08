import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service.js';
import { QuestionStatus, Role } from '@prisma/client';
import { CreateQuestionDto, UpdateQuestionDto, GenerateQuizFromQADto } from './dto/index.js';
import { unlink } from 'fs/promises';

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

interface GeneratedMCQ {
  question: string;
  options: Array<{ text: string; isCorrect: boolean }>;
  explanation?: string;
}

@Injectable()
export class QuestionsService {
  private readonly logger = new Logger(QuestionsService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  /**
   * Create a manual question. Students create as PENDING, admins as APPROVED.
   */
  async create(dto: CreateQuestionDto, userId: string, userRole: Role, imagePath?: string) {
    // Verify subject exists
    const subject = await this.prisma.subject.findUnique({
      where: { id: dto.subjectId },
    });
    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    const status = userRole === Role.ADMIN || userRole === Role.TEACHER
      ? QuestionStatus.APPROVED
      : QuestionStatus.PENDING;

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

  /**
   * Get all questions with filters.
   */
  async findAll(
    page = 1,
    limit = 20,
    filters: {
      subjectId?: string;
      status?: QuestionStatus;
      createdById?: string;
      search?: string;
    } = {},
  ) {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.subjectId) where.subjectId = filters.subjectId;
    if (filters.status) where.status = filters.status;
    if (filters.createdById) where.createdById = filters.createdById;
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

  /**
   * Get a single question by ID.
   */
  async findOne(id: string) {
    const question = await this.prisma.manualQuestion.findUnique({
      where: { id },
      include: {
        subject: { select: { id: true, name: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    return question;
  }

  /**
   * Update a question. Only the creator or admin/teacher can update.
   */
  async update(id: string, dto: UpdateQuestionDto, userId: string, userRole: Role, imagePath?: string) {
    const question = await this.findOne(id);

    if (
      question.createdById !== userId &&
      userRole !== Role.ADMIN &&
      userRole !== Role.TEACHER
    ) {
      throw new ForbiddenException('You can only edit your own questions');
    }

    // If subject is being changed, verify it exists
    if (dto.subjectId) {
      const subject = await this.prisma.subject.findUnique({
        where: { id: dto.subjectId },
      });
      if (!subject) {
        throw new NotFoundException('Subject not found');
      }
    }

    const data: any = {};
    if (dto.questionText) data.questionText = dto.questionText;
    if (dto.answerText) data.answerText = dto.answerText;
    if (dto.subjectId) data.subjectId = dto.subjectId;
    if (imagePath) {
      // Delete old image if exists
      if (question.imagePath) {
        try {
          await unlink(question.imagePath);
        } catch {
          // Ignore if old file doesn't exist
        }
      }
      data.imagePath = imagePath;
    }

    // If student edits, reset to pending
    if (userRole === Role.STUDENT) {
      data.status = QuestionStatus.PENDING;
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

  /**
   * Delete a question. Only the creator or admin/teacher can delete.
   */
  async remove(id: string, userId: string, userRole: Role) {
    const question = await this.findOne(id);

    if (
      question.createdById !== userId &&
      userRole !== Role.ADMIN &&
      userRole !== Role.TEACHER
    ) {
      throw new ForbiddenException('You can only delete your own questions');
    }

    // Delete associated image
    if (question.imagePath) {
      try {
        await unlink(question.imagePath);
      } catch {
        // Ignore
      }
    }

    await this.prisma.manualQuestion.delete({ where: { id } });
    return { message: 'Question deleted successfully' };
  }

  /**
   * Admin review: approve or reject a question.
   */
  async review(id: string, status: QuestionStatus) {
    await this.findOne(id);

    if (status !== QuestionStatus.APPROVED && status !== QuestionStatus.REJECTED) {
      throw new BadRequestException('Status must be APPROVED or REJECTED');
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

  /**
   * Generate a quiz from approved Q&A pairs using Gemini AI.
   */
  async generateQuizFromQA(dto: GenerateQuizFromQADto) {
    // Get approved questions for this subject
    const questions = await this.prisma.manualQuestion.findMany({
      where: {
        subjectId: dto.subjectId,
        status: QuestionStatus.APPROVED,
      },
      include: {
        subject: { select: { id: true, name: true } },
      },
    });

    if (questions.length < 3) {
      throw new BadRequestException(
        `Need at least 3 approved questions to generate a quiz. Currently have ${questions.length}.`,
      );
    }

    // Get subject info
    const subject = await this.prisma.subject.findUnique({
      where: { id: dto.subjectId },
    });
    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    // Call Gemini AI to generate MCQs
    const mcqs = await this.callGeminiForMCQs(questions, subject.name);

    if (!mcqs || mcqs.length === 0) {
      throw new BadRequestException('AI failed to generate quiz questions. Please try again.');
    }

    // Create quiz with generated questions in a transaction
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

  /**
   * Call Gemini AI REST API to generate MCQ questions from Q&A pairs.
   */
  private async callGeminiForMCQs(
    qaPairs: Array<{ questionText: string; answerText: string }>,
    subjectName: string,
  ): Promise<GeneratedMCQ[]> {
    const apiKey = this.configService.get<string>('AI_API_KEY');
    if (!apiKey) {
      throw new BadRequestException('AI API key not configured');
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
      const model = this.configService.get<string>('AI_MODEL', 'gemini-2.0-flash');
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

      if (!response.ok) {
        const errorBody = await response.text();
        this.logger.error(`Gemini API error: ${response.status} - ${errorBody}`);
        throw new BadRequestException('AI service returned an error');
      }

      const data = (await response.json()) as GeminiResponse;
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        this.logger.error('Empty response from Gemini');
        throw new BadRequestException('AI service returned empty response');
      }

      // Clean up the response (remove markdown code fences if present)
      const cleaned = text.replace(/```json\s*\n?/g, '').replace(/```\s*\n?/g, '').trim();

      const parsed: GeneratedMCQ[] = JSON.parse(cleaned);

      // Validate structure
      return parsed.filter((mcq) => {
        return (
          mcq.question &&
          Array.isArray(mcq.options) &&
          mcq.options.length >= 2 &&
          mcq.options.some((o) => o.isCorrect) &&
          mcq.options.every((o) => o.text)
        );
      });
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error(`Failed to generate MCQs from Gemini: ${error}`);
      throw new BadRequestException('Failed to generate quiz from AI. Please try again.');
    }
  }

  /**
   * Get counts per status for admin dashboard.
   */
  async getStatusCounts(subjectId?: string) {
    const where: any = {};
    if (subjectId) where.subjectId = subjectId;

    const [pending, approved, rejected, total] = await Promise.all([
      this.prisma.manualQuestion.count({ where: { ...where, status: QuestionStatus.PENDING } }),
      this.prisma.manualQuestion.count({ where: { ...where, status: QuestionStatus.APPROVED } }),
      this.prisma.manualQuestion.count({ where: { ...where, status: QuestionStatus.REJECTED } }),
      this.prisma.manualQuestion.count({ where }),
    ]);

    return { pending, approved, rejected, total };
  }
}
