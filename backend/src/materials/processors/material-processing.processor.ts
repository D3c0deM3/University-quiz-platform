import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { request as httpRequest } from 'http';
import { request as httpsRequest } from 'https';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  MaterialStatus,
  QuestionType,
  DifficultyLevel,
  QuestionStatus,
  Prisma,
} from '@prisma/client';

export interface MaterialProcessingJobData {
  materialId: string;
  filePath: string;
  fileType: string;
  originalName: string;
  numQuestions?: number;
  uploadedById?: string;
  mode?: 'standard' | 'questions_with_material';
  questionsFilePath?: string;
  questionsFileType?: string;
}

interface PythonQuizOption {
  text: string;
  is_correct?: boolean;
}

interface PythonQuizQuestion {
  question_text: string;
  question_type?: string;
  options?: PythonQuizOption[];
  explanation?: string | null;
}

interface PythonMetadata {
  title?: string;
  summary?: string | null;
  keywords?: string[];
  topics?: string[];
  tags?: string[];
  difficulty_level?: string;
  content_type?: string;
}

interface PythonProcessingResult {
  status: 'success' | 'partial_success' | 'failed';
  error?: string;
  metadata?: PythonMetadata;
  text_chunks?: string[];
  quiz_questions?: PythonQuizQuestion[];
}

@Processor('material-processing')
export class MaterialProcessingProcessor extends WorkerHost {
  private readonly logger = new Logger(MaterialProcessingProcessor.name);
  private static readonly PYTHON_REQUEST_TIMEOUT_MS = 30 * 60 * 1000;

  constructor(private prisma: PrismaService) {
    super();
  }

  async process(job: Job<MaterialProcessingJobData>): Promise<void> {
    const {
      materialId,
      filePath,
      fileType,
      originalName,
      numQuestions,
      uploadedById,
      mode,
      questionsFilePath,
      questionsFileType,
    } = job.data;

    this.logger.log(
      `Processing material ${materialId} (${originalName}) [mode: ${mode || 'standard'}]`,
    );

    const materialExists = await this.prisma.material.findUnique({
      where: { id: materialId },
      select: { id: true },
    });
    if (!materialExists) {
      this.logger.warn(
        `Skipping stale processing job: material ${materialId} no longer exists`,
      );
      return;
    }

    try {
      // Update status to PROCESSING
      await this.prisma.material.update({
        where: { id: materialId },
        data: {
          status: MaterialStatus.PROCESSING,
          processingProgress: 5,
          processingStage: 'Preparing extraction',
          errorMessage: null,
        },
      });

      // Call Python FastAPI service
      const pythonUrl =
        process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';

      // Choose endpoint based on mode
      const endpoint =
        mode === 'questions_with_material'
          ? `${pythonUrl}/process/questions-with-material`
          : `${pythonUrl}/process/material`;

      const requestBody: Record<string, unknown> = {
        material_id: materialId,
        file_path: filePath,
        file_type: fileType,
        // Preserve 0 ("all questions") instead of coercing to default 10.
        num_questions: numQuestions ?? 10,
      };

      // Add questions file info for dual-file mode
      if (
        mode === 'questions_with_material' &&
        questionsFilePath &&
        questionsFileType
      ) {
        requestBody.questions_file_path = questionsFilePath;
        requestBody.questions_file_type = questionsFileType;
      }

      const response = await this.postJson(endpoint, requestBody);

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw new Error(
          `Python service error (${response.statusCode}): ${response.body}`,
        );
      }

      const result = this.parsePythonResult(response.body);

      if (result.status === 'failed') {
        throw new Error(result.error || 'Processing failed with no details');
      }

      // Log partial success warnings but continue saving what we have
      if (result.status === 'partial_success' && result.error) {
        this.logger.warn(
          `Partial processing for material ${materialId}: ${result.error}`,
        );
      }

      // Save results in a transaction
      await this.prisma.$transaction(async (tx) => {
        // Save metadata
        if (result.metadata) {
          await tx.materialMetadata.upsert({
            where: { materialId },
            create: {
              materialId,
              title: result.metadata.title ?? originalName,
              summary: result.metadata.summary ?? null,
              keywords: result.metadata.keywords ?? [],
              topics: result.metadata.topics ?? [],
              tags: result.metadata.tags ?? [],
              difficultyLevel: this.mapDifficulty(
                result.metadata.difficulty_level,
              ),
              contentType: result.metadata.content_type ?? fileType,
            },
            update: {
              title: result.metadata.title ?? originalName,
              summary: result.metadata.summary ?? null,
              keywords: result.metadata.keywords ?? [],
              topics: result.metadata.topics ?? [],
              tags: result.metadata.tags ?? [],
              difficultyLevel: this.mapDifficulty(
                result.metadata.difficulty_level,
              ),
              contentType: result.metadata.content_type ?? fileType,
            },
          });
        }

        // Save text chunks
        if (result.text_chunks && result.text_chunks.length > 0) {
          // Delete existing chunks first
          await tx.materialTextChunk.deleteMany({ where: { materialId } });
          await tx.materialTextChunk.createMany({
            data: result.text_chunks.map((chunk: string, index: number) => ({
              materialId,
              chunkIndex: index,
              content: chunk,
            })),
          });
        }

        // Save quiz questions
        if (result.quiz_questions && result.quiz_questions.length > 0) {
          // Get the material to find subjectId
          const material = await tx.material.findUnique({
            where: { id: materialId },
            select: { subjectId: true },
          });

          if (material) {
            // Create a quiz for this material
            const quiz = await tx.quiz.create({
              data: {
                title: `Quiz: ${result.metadata?.title || originalName}`,
                description: `Auto-generated quiz from ${originalName}`,
                subjectId: material.subjectId,
                materialId,
                isPublished: false,
              },
            });

            // Create questions with options
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

              // Create options for MCQ and TRUE_FALSE
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

            // Also save quiz questions to the Q&A bank (ManualQuestion)
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
                      status: QuestionStatus.APPROVED,
                    },
                  });
                }
              }
            }
          }
        }

        // Update material status to PROCESSED
        await tx.material.update({
          where: { id: materialId },
          data: {
            status: MaterialStatus.PROCESSED,
            errorMessage: null,
            processingProgress: 100,
            processingStage: 'Completed',
          },
        });
      });

      this.logger.log(`Material ${materialId} processed successfully`);
    } catch (error: unknown) {
      if (this.isMissingRecordError(error)) {
        this.logger.warn(
          `Material ${materialId} was removed while processing. Skipping stale job.`,
        );
        return;
      }

      this.logger.error(
        `Failed to process material ${materialId}: ${this.errorMessage(error)}`,
      );

      try {
        await this.prisma.material.update({
          where: { id: materialId },
          data: {
            status: MaterialStatus.FAILED,
            errorMessage: this.errorMessage(error),
            processingProgress: 100,
            processingStage: 'Failed',
          },
        });
      } catch (updateError: unknown) {
        if (this.isMissingRecordError(updateError)) {
          this.logger.warn(
            `Material ${materialId} no longer exists while marking as FAILED`,
          );
          return;
        }
        throw updateError;
      }

      throw error; // Re-throw for BullMQ retry logic
    }
  }

  private mapDifficulty(level?: string): DifficultyLevel | null {
    if (!level) return null;
    const upper = level.toUpperCase();
    if (upper === 'BEGINNER') return DifficultyLevel.BEGINNER;
    if (upper === 'INTERMEDIATE') return DifficultyLevel.INTERMEDIATE;
    if (upper === 'ADVANCED') return DifficultyLevel.ADVANCED;
    return null;
  }

  private mapQuestionType(type?: string): QuestionType {
    if (!type) return QuestionType.MCQ;
    const upper = type.toUpperCase();
    if (upper === 'TRUE_FALSE' || upper === 'TRUEFALSE' || upper === 'TF')
      return QuestionType.TRUE_FALSE;
    if (
      upper === 'SHORT_ANSWER' ||
      upper === 'SHORTANSWER' ||
      upper === 'SHORT'
    )
      return QuestionType.SHORT_ANSWER;
    return QuestionType.MCQ;
  }

  private async postJson(
    endpoint: string,
    body: Record<string, unknown>,
  ): Promise<{ statusCode: number; body: string }> {
    const url = new URL(endpoint);
    const payload = JSON.stringify(body);
    const requestFn = url.protocol === 'https:' ? httpsRequest : httpRequest;

    return new Promise((resolve, reject) => {
      const req = requestFn(
        {
          protocol: url.protocol,
          hostname: url.hostname,
          port: url.port,
          path: `${url.pathname}${url.search}`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
          },
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk) => {
            if (Buffer.isBuffer(chunk)) {
              chunks.push(chunk);
              return;
            }
            if (typeof chunk === 'string' || chunk instanceof Uint8Array) {
              chunks.push(Buffer.from(chunk));
            }
          });
          res.on('end', () => {
            resolve({
              statusCode: res.statusCode ?? 500,
              body: Buffer.concat(chunks).toString('utf8'),
            });
          });
        },
      );

      req.setTimeout(
        MaterialProcessingProcessor.PYTHON_REQUEST_TIMEOUT_MS,
        () => {
          req.destroy(
            new Error(
              `Python request timed out after ${
                MaterialProcessingProcessor.PYTHON_REQUEST_TIMEOUT_MS / 60000
              } minutes`,
            ),
          );
        },
      );

      req.on('error', (error) => reject(error));
      req.write(payload);
      req.end();
    });
  }

  private isMissingRecordError(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    );
  }

  private parsePythonResult(body: string): PythonProcessingResult {
    const parsed: unknown = JSON.parse(body);
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid Python service response format');
    }
    return parsed as PythonProcessingResult;
  }

  private errorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    return 'Unknown processing error';
  }
}
