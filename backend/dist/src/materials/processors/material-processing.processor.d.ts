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
    mode?: 'standard' | 'questions_with_material';
    questionsFilePath?: string;
    questionsFileType?: string;
    additionalMaterialFilePaths?: string[];
    additionalMaterialFileTypes?: string[];
}
export declare class MaterialProcessingProcessor extends WorkerHost {
    private prisma;
    private readonly logger;
    private static readonly PYTHON_REQUEST_TIMEOUT_MS;
    constructor(prisma: PrismaService);
    process(job: Job<MaterialProcessingJobData>): Promise<void>;
    private mapDifficulty;
    private mapQuestionType;
    private postJson;
    private isMissingRecordError;
    private parsePythonResult;
    private errorMessage;
}
