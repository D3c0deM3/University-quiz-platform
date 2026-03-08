import { DifficultyLevel } from '@prisma/client';
export declare class UpdateMetadataDto {
    title?: string;
    summary?: string;
    keywords?: string[];
    topics?: string[];
    tags?: string[];
    difficultyLevel?: DifficultyLevel;
    contentType?: string;
}
