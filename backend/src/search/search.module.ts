import { Module } from '@nestjs/common';
import { SearchService } from './search.service.js';
import { SearchController } from './search.controller.js';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module.js';

@Module({
  imports: [SubscriptionsModule],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
