import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service.js';
import { MaterialStatus, QuestionType, DifficultyLevel } from '@prisma/client';

export interface MaterialProcessingJobData {
  materialId: string;
  filePath: string;
  fileType: string;
  originalName: string;
}

@Processor('material-processing')
export class MaterialProcessingProcessor extends WorkerHost {
  private readonly logger = new Logger(MaterialProcessingProcessor.name);

  constructor(private prisma: PrismaService) {
    super();
  }

  async process(job: Job<MaterialProcessingJobData>): Promise<void> {
    const { materialId, filePath, fileType, originalName } = job.data;

    this.logger.log(`Processing material ${materialId} (${originalName})`);

    try {
      // Update status to PROCESSING
      await this.prisma.material.update({
        where: { id: materialId },
        data: { status: MaterialStatus.PROCESSING },
      });

      // Call Python FastAPI service
      const pythonUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';
      const response = await fetch(`${pythonUrl}/process/material`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          material_id: materialId,
          file_path: filePath,
          file_type: fileType,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Python service error (${response.status}): ${errorText}`);
      }

      const result = await response.json() as any;

      if (result.error && result.status !== 'success') {
        throw new Error(result.error);
      }

      // Save results in a transaction
      await this.prisma.$transaction(async (tx) => {
        // Save metadata
        if (result.metadata) {
          await tx.materialMetadata.upsert({
            where: { materialId },
            create: {
              materialId,
              title: result.metadata.title || originalName,
              summary: result.metadata.summary || null,
              keywords: result.metadata.keywords || [],
              topics: result.metadata.topics || [],
              tags: result.metadata.tags || [],
              difficultyLevel: this.mapDifficulty(result.metadata.difficulty_level),
              contentType: result.metadata.content_type || fileType,
            },
            update: {
              title: result.metadata.title || originalName,
              summary: result.metadata.summary || null,
              keywords: result.metadata.keywords || [],
              topics: result.metadata.topics || [],
              tags: result.metadata.tags || [],
              difficultyLevel: this.mapDifficulty(result.metadata.difficulty_level),
              contentType: result.metadata.content_type || fileType,
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
                  data: q.options.map((opt: any, optIndex: number) => ({
                    questionId: question.id,
                    optionText: opt.text,
                    isCorrect: opt.is_correct || false,
                    orderIndex: optIndex,
                  })),
                });
              }
            }
          }
        }

        // Update material status to PROCESSED
        await tx.material.update({
          where: { id: materialId },
          data: { status: MaterialStatus.PROCESSED, errorMessage: null },
        });
      });

      this.logger.log(`Material ${materialId} processed successfully`);
    } catch (error: any) {
      this.logger.error(`Failed to process material ${materialId}: ${error.message}`);

      await this.prisma.material.update({
        where: { id: materialId },
        data: {
          status: MaterialStatus.FAILED,
          errorMessage: error.message || 'Unknown processing error',
        },
      });

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
    if (upper === 'TRUE_FALSE' || upper === 'TRUEFALSE' || upper === 'TF') return QuestionType.TRUE_FALSE;
    if (upper === 'SHORT_ANSWER' || upper === 'SHORTANSWER' || upper === 'SHORT') return QuestionType.SHORT_ANSWER;
    return QuestionType.MCQ;
  }
}
