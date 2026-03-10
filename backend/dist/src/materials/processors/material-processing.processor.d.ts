import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service.js';
export interface MaterialProcessingJobData {
    materialId: string;
    filePath: string;
    fileType: string;
    originalName: string;
    numQuestions?: number;
    uploadedById?: string;
}
export declare class MaterialProcessingProcessor extends WorkerHost {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    process(job: Job<MaterialProcessingJobData>): Promise<void>;
    private mapDifficulty;
    private mapQuestionType;
}
