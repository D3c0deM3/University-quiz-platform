import { Module } from '@nestjs/common';
import { SubjectsService } from './subjects.service.js';
import { SubjectsController } from './subjects.controller.js';

@Module({
  controllers: [SubjectsController],
  providers: [SubjectsService],
  exports: [SubjectsService],
})
export class SubjectsModule {}
