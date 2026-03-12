import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { QuestionType, Role } from '@prisma/client';
import { SubmitQuizDto } from './dto/submit-quiz.dto.js';
import { CheckAnswerDto } from './dto/check-answer.dto.js';
import { StartAttemptDto } from './dto/start-attempt.dto.js';

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
  async startAttempt(
    quizId: string,
    userId: string,
    dto: StartAttemptDto = {},
  ) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      select: {
        id: true,
        isPublished: true,
        questions: {
          orderBy: { orderIndex: 'asc' },
          select: {
            id: true,
            orderIndex: true,
          },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }
    if (!quiz.isPublished) {
      throw new ForbiddenException('This quiz is not yet published');
    }

    const selectedQuestions = this.selectQuestionsForAttempt(
      quiz.questions,
      dto,
    );
    const selectedQuestionIds = selectedQuestions.map((q) => q.id);

    const attempt = await this.prisma.$transaction(async (tx) => {
      const created = await tx.quizAttempt.create({
        data: {
          quizId,
          userId,
          totalPoints: selectedQuestions.length,
        },
      });

      await tx.quizAttemptAnswer.createMany({
        data: selectedQuestionIds.map((questionId) => ({
          attemptId: created.id,
          questionId,
        })),
      });

      return tx.quizAttempt.findUnique({
        where: { id: created.id },
        include: {
          quiz: {
            select: {
              id: true,
              title: true,
              questions: {
                where: { id: { in: selectedQuestionIds } },
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
    });

    if (!attempt) {
      throw new NotFoundException('Quiz attempt not found');
    }

    return attempt;
  }

  /**
   * Submit answers for an attempt, auto-grade MCQ/true-false, store results.
   */
  async submitAttempt(attemptId: string, userId: string, dto: SubmitQuizDto) {
    const attempt = await this.prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        answers: {
          include: {
            question: {
              include: {
                options: true,
              },
            },
          },
        },
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

    const selectedQuestionEntries =
      attempt.answers.length > 0
        ? attempt.answers.map((a) => ({
            answerId: a.id,
            question: a.question,
          }))
        : attempt.quiz.questions.map((q) => ({
            answerId: null as string | null,
            question: q,
          }));

    const selectedQuestionMap = new Map(
      selectedQuestionEntries.map((entry) => [entry.question.id, entry]),
    );

    const incomingAnswerMap = new Map<
      string,
      SubmitQuizDto['answers'][number]
    >();
    for (const answer of dto.answers) {
      if (incomingAnswerMap.has(answer.questionId)) {
        throw new BadRequestException('Duplicate answers are not allowed');
      }
      incomingAnswerMap.set(answer.questionId, answer);
    }

    for (const questionId of incomingAnswerMap.keys()) {
      if (!selectedQuestionMap.has(questionId)) {
        throw new BadRequestException(
          'One or more answers contain questions outside of this quiz attempt',
        );
      }
    }

    let correctCount = 0;
    const answerUpdates: Array<{
      answerId: string | null;
      questionId: string;
      selectedOptionId: string | null;
      textAnswer: string | null;
      isCorrect: boolean | null;
    }> = [];

    for (const entry of selectedQuestionEntries) {
      const question = entry.question;
      const answer = incomingAnswerMap.get(question.id);
      const selectedOptionId = answer?.selectedOptionId ?? null;
      let textAnswer = answer?.textAnswer ?? null;

      let isCorrect: boolean | null = null;

      if (
        question.questionType === QuestionType.MCQ ||
        question.questionType === QuestionType.TRUE_FALSE
      ) {
        if (
          selectedOptionId &&
          !question.options.some((o) => o.id === selectedOptionId)
        ) {
          throw new BadRequestException(
            'Invalid option selected for one or more questions',
          );
        }

        textAnswer = null;

        // Auto-grade MCQ/true-false
        if (selectedOptionId) {
          const correctOption = question.options.find((o) => o.isCorrect);
          isCorrect = correctOption?.id === selectedOptionId;
          if (isCorrect) correctCount++;
        } else {
          isCorrect = false;
        }
      } else if (question.questionType === QuestionType.SHORT_ANSWER) {
        if (selectedOptionId) {
          throw new BadRequestException(
            'Short-answer questions cannot include option selections',
          );
        }

        // Short answers remain pending for manual review
        isCorrect = null;
      }

      answerUpdates.push({
        answerId: entry.answerId,
        questionId: question.id,
        selectedOptionId,
        textAnswer,
        isCorrect,
      });
    }

    // Calculate score as percentage
    const totalQuestions = selectedQuestionEntries.length;
    const gradableQuestions = selectedQuestionEntries.filter(
      (entry) => entry.question.questionType !== QuestionType.SHORT_ANSWER,
    ).length;
    const score =
      gradableQuestions > 0 ? (correctCount / gradableQuestions) * 100 : 0;

    // Save everything in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      if (answerUpdates.length > 0) {
        const existingUpdates = answerUpdates.filter((a) => !!a.answerId);
        const newRecords = answerUpdates.filter((a) => !a.answerId);

        await Promise.all(
          existingUpdates.map((a) =>
            tx.quizAttemptAnswer.update({
              where: { id: a.answerId! },
              data: {
                selectedOptionId: a.selectedOptionId,
                textAnswer: a.textAnswer,
                isCorrect: a.isCorrect,
              },
            }),
          ),
        );

        if (newRecords.length > 0) {
          await tx.quizAttemptAnswer.createMany({
            data: newRecords.map((a) => ({
              attemptId,
              questionId: a.questionId,
              selectedOptionId: a.selectedOptionId,
              textAnswer: a.textAnswer,
              isCorrect: a.isCorrect,
            })),
          });
        }
      }

      // Update attempt with score and completion time
      return tx.quizAttempt.update({
        where: { id: attemptId },
        data: {
          totalPoints: totalQuestions,
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
        totalQuestions: a.totalPoints ?? a.quiz._count.questions,
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
    const totalScore = completedAttempts.reduce(
      (sum, a) => sum + (a.score ?? 0),
      0,
    );
    const averageScore =
      totalAttempts > 0
        ? Math.round((totalScore / totalAttempts) * 100) / 100
        : 0;

    // Per-subject stats
    const subjectMap = new Map<
      string,
      { name: string; scores: number[]; count: number }
    >();
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
          ? Math.round(
              (data.scores.reduce((a, b) => a + b, 0) / data.scores.length) *
                100,
            ) / 100
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
   * Check a single answer.
   * SECURITY:
   * - Admin/Teacher can check any answer freely (preview mode).
   * - Students can ONLY check answers for questions in their COMPLETED attempts.
   *   This prevents using the endpoint as an answer oracle during a live quiz.
   */
  async checkAnswer(dto: CheckAnswerDto, userId: string, role: string) {
    const question = await this.prisma.quizQuestion.findUnique({
      where: { id: dto.questionId },
      include: {
        options: { orderBy: { orderIndex: 'asc' } },
        quiz: { select: { id: true, subjectId: true } },
      },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    // Admin/Teacher can check freely
    if (role !== Role.ADMIN && role !== Role.TEACHER) {
      // Student: must have a COMPLETED attempt for the quiz containing this question
      const completedAttempt = await this.prisma.quizAttempt.findFirst({
        where: {
          userId,
          quizId: question.quiz.id,
          completedAt: { not: null },
        },
      });

      if (!completedAttempt) {
        throw new ForbiddenException(
          'You can only check answers after submitting a quiz attempt.',
        );
      }
    }

    const correctOption = question.options.find((o) => o.isCorrect);
    const isCorrect = correctOption?.id === dto.selectedOptionId;

    return {
      questionId: dto.questionId,
      selectedOptionId: dto.selectedOptionId,
      correctOptionId: correctOption?.id ?? null,
      isCorrect,
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

  private selectQuestionsForAttempt(
    questions: Array<{ id: string; orderIndex: number }>,
    dto: StartAttemptDto,
  ) {
    if (questions.length === 0) {
      throw new BadRequestException('This quiz has no questions');
    }

    const rangeStart = dto.rangeStart ?? 1;
    const rangeEnd = dto.rangeEnd ?? questions.length;

    if (rangeStart > rangeEnd) {
      throw new BadRequestException(
        'Range start cannot be greater than range end',
      );
    }

    if (rangeStart < 1 || rangeEnd > questions.length) {
      throw new BadRequestException(
        `Question range must be between 1 and ${questions.length}`,
      );
    }

    const rangeQuestions = questions.slice(rangeStart - 1, rangeEnd);
    if (rangeQuestions.length === 0) {
      throw new BadRequestException('The selected range contains no questions');
    }

    const questionCount = dto.questionCount ?? rangeQuestions.length;
    if (questionCount < 1) {
      throw new BadRequestException('Question count must be at least 1');
    }
    if (questionCount > rangeQuestions.length) {
      throw new BadRequestException(
        `Question count cannot exceed the selected range (${rangeQuestions.length})`,
      );
    }

    const sampled = this.sampleQuestions(rangeQuestions, questionCount);
    return sampled.sort((a, b) => a.orderIndex - b.orderIndex);
  }

  private sampleQuestions<T>(items: T[], count: number): T[] {
    if (count >= items.length) {
      return [...items];
    }

    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, count);
  }
}
