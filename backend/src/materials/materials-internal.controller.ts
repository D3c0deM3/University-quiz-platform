import {
  Body,
  Controller,
  Headers,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { MaterialsService } from './materials.service.js';

class UpdateProcessingProgressDto {
  @IsUUID()
  materialId!: string;

  @IsInt()
  @Min(0)
  @Max(100)
  progress!: number;

  @IsOptional()
  @IsString()
  stage?: string;
}

@Controller('materials/internal')
export class MaterialsInternalController {
  constructor(
    private readonly materialsService: MaterialsService,
    private readonly configService: ConfigService,
  ) {}

  @Post('progress')
  async updateProgress(
    @Body() body: UpdateProcessingProgressDto,
    @Headers('x-processing-key') key?: string,
  ) {
    const configuredKey = this.configService.get<string>(
      'INTERNAL_PROCESSING_KEY',
      'local-processing-key',
    );
    if (!key || key !== configuredKey) {
      throw new UnauthorizedException('Invalid processing key');
    }

    return this.materialsService.updateProcessingProgress(
      body.materialId,
      body.progress,
      body.stage,
    );
  }
}

