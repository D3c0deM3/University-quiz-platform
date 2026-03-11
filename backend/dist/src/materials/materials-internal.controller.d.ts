import { ConfigService } from '@nestjs/config';
import { MaterialsService } from './materials.service.js';
declare class UpdateProcessingProgressDto {
    materialId: string;
    progress: number;
    stage?: string;
}
export declare class MaterialsInternalController {
    private readonly materialsService;
    private readonly configService;
    constructor(materialsService: MaterialsService, configService: ConfigService);
    updateProgress(body: UpdateProcessingProgressDto, key?: string): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.MaterialStatus;
        processingProgress: number;
        processingStage: string | null;
    }>;
}
export {};
