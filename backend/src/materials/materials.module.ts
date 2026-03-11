import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MaterialsService } from './materials.service.js';
import { MaterialsController } from './materials.controller.js';
import { MaterialsInternalController } from './materials-internal.controller.js';
import { SecureFilesController } from './secure-files.controller.js';
import { MaterialProcessingProcessor } from './processors/material-processing.processor.js';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module.js';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'material-processing',
    }),
    SubscriptionsModule,
  ],
  controllers: [MaterialsController, MaterialsInternalController, SecureFilesController],
  providers: [MaterialsService, MaterialProcessingProcessor],
  exports: [MaterialsService],
})
export class MaterialsModule {}
