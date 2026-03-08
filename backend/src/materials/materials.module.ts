import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MaterialsService } from './materials.service.js';
import { MaterialsController } from './materials.controller.js';
import { MaterialProcessingProcessor } from './processors/material-processing.processor.js';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'material-processing',
    }),
  ],
  controllers: [MaterialsController],
  providers: [MaterialsService, MaterialProcessingProcessor],
  exports: [MaterialsService],
})
export class MaterialsModule {}
