import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { QuestionType } from '@prisma/client';
import { SubmitQuizDto } from './dto/submit-quiz.dto.js';

@Injectable()
export class QuizzesService {
  constructor(private prisma: PrismaService) {}

  /**
   * List available (published) quizzes for a subject.
   */
  async findBySubject(subjectId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const subject = await this.prisma.subject.findUnique({
      where: { id: subjectId },
    });
    if (!subject) {
      throw new NotFoundException('Subject not found');
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

  /**
   * Get quiz details with questions (WITHOUT correct answers for students).
   */
  async findOne(quizId: string) {
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
                // isCorrect is NOT selected — hidden from students
              },
            },
          },
        },
        _count: { select: { questions: true } },
      },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    if (!quiz.isPublished) {
      throw new ForbiddenException('This quiz is not yet published');
    }

    return quiz;
  }

  /**
   * Start a quiz attempt (creates attempt record).
   */
  async startAttempt(quizId: string, userId: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: { _count: { select: { questions: true } } },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }
    if (!quiz.isPublished) {
      throw new ForbiddenException('This quiz is not yet published');
    }

    const attempt = await this.prisma.quizAttempt.create({
      data: {
        quizId,
        userId,
        totalPoints: quiz._count.questions,
      },
      include: {
        quiz: {
          select: {
            id: true,
            title: true,
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
          },
        },
      },
    });

    return attempt;
  }

  /**
   * Submit answers for an attempt, auto-grade MCQ/true-false, store results.
   */
  async submitAttempt(attemptId: string, userId: string, dto: SubmitQuizDto) {
    const attempt = await this.prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
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
      throw new NotFoundException('Quiz attempt not found');
    }

    if (attempt.userId !== userId) {
      throw new ForbiddenException('This is not your attempt');
    }

    if (attempt.completedAt) {
      throw new BadRequestException('This attempt has already been submitted');
    }

    // Build a question map for grading
    const questionMap = new Map<string, typeof attempt.quiz.questions[0]>();
    for (const q of attempt.quiz.questions) {
      questionMap.set(q.id, q);
    }

    let correctCount = 0;
    const answerRecords: Array<{
      attemptId: string;
      questionId: string;
      selectedOptionId: string | null;
      textAnswer: string | null;
      isCorrect: boolean | null;
    }> = [];

    for (const answer of dto.answers) {
      const question = questionMap.get(answer.questionId);
      if (!question) continue;

      let isCorrect: boolean | null = null;

      if (question.questionType === QuestionType.MCQ || question.questionType === QuestionType.TRUE_FALSE) {
        // Auto-grade: check if selected option is correct
        if (answer.selectedOptionId) {
          const correctOption = question.options.find((o) => o.isCorrect);
          isCorrect = correctOption?.id === answer.selectedOptionId;
          if (isCorrect) correctCount++;
        } else {
          isCorrect = false;
        }
      } else if (question.questionType === QuestionType.SHORT_ANSWER) {
        // Short answers need manual review or simple comparison
        // For now, leave isCorrect as null (manual review required)
        isCorrect = null;
      }

      answerRecords.push({
        attemptId,
        questionId: answer.questionId,
        selectedOptionId: answer.selectedOptionId || null,
        textAnswer: answer.textAnswer || null,
        isCorrect,
      });
    }

    // Calculate score as percentage
    const totalQuestions = attempt.quiz.questions.length;
    const gradableQuestions = attempt.quiz.questions.filter(
      (q) => q.questionType !== QuestionType.SHORT_ANSWER,
    ).length;
    const score = gradableQuestions > 0 ? (correctCount / gradableQuestions) * 100 : 0;

    // Save everything in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Save answers
      if (answerRecords.length > 0) {
        await tx.quizAttemptAnswer.createMany({ data: answerRecords });
      }

      // Update attempt with score and completion time
      return tx.quizAttempt.update({
        where: { id: attemptId },
        data: {
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

  /**
   * View results of a completed attempt with correct answers and explanations.
   */
  async getAttemptResults(attemptId: string, userId: string) {
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
      throw new NotFoundException('Quiz attempt not found');
    }

    if (attempt.userId !== userId) {
      throw new ForbiddenException('This is not your attempt');
    }

    if (!attempt.completedAt) {
      throw new BadRequestException('This attempt has not been submitted yet');
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

  // ────── Quiz History (Step 18) ──────

  /**
   * Get student's quiz attempt history.
   */
  async getMyAttempts(userId: string, page = 1, limit = 20) {
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
        // Nested quiz object (matches frontend Quiz type)
        quiz: {
          id: a.quiz.id,
          title: a.quiz.title,
          subject: a.quiz.subject,
          _count: a.quiz._count,
        },
        // Flat convenience fields
        quizTitle: a.quiz.title,
        subjectName: a.quiz.subject.name,
        totalQuestions: a.quiz._count.questions,
        status: a.completedAt ? 'completed' : 'in_progress',
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Get student's statistics across all quizzes.
   */
  async getMyStats(userId: string) {
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
    const averageScore = totalAttempts > 0 ? Math.round((totalScore / totalAttempts) * 100) / 100 : 0;

    // Per-subject stats
    const subjectMap = new Map<string, { name: string; scores: number[]; count: number }>();
    for (const attempt of completedAttempts) {
      const subjectId = attempt.quiz.subjectId;
      if (!subjectMap.has(subjectId)) {
        subjectMap.set(subjectId, {
          name: attempt.quiz.subject.name,
          scores: [],
          count: 0,
        });
      }
      const entry = subjectMap.get(subjectId)!;
      entry.scores.push(attempt.score ?? 0);
      entry.count++;
    }

    const subjectStats = Array.from(subjectMap.entries()).map(([id, data]) => ({
      subjectId: id,
      subjectName: data.name,
      totalAttempts: data.count,
      averageScore:
        data.scores.length > 0
          ? Math.round((data.scores.reduce((a, b) => a + b, 0) / data.scores.length) * 100) / 100
          : 0,
      bestScore: Math.max(...data.scores, 0),
    }));

    return {
      totalAttempts,
      averageScore,
      subjectStats,
    };
  }

  /**
   * Delete a quiz (admin/teacher only).
   */
  async deleteQuiz(quizId: string) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }
    await this.prisma.quiz.delete({ where: { id: quizId } });
    return { message: 'Quiz deleted successfully' };
  }
}
