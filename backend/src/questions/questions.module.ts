import { Module } from '@nestjs/common';
import { QuestionsService } from './questions.service.js';
import { QuestionsController } from './questions.controller.js';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module.js';

@Module({
  imports: [SubscriptionsModule],
  controllers: [QuestionsController],
  providers: [QuestionsService],
  exports: [QuestionsService],
})
export class QuestionsModule {}
