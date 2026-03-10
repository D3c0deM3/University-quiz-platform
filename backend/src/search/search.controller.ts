import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SearchService } from './search.service.js';
import { JwtAuthGuard } from '../auth/guards/index.js';
import { CurrentUser } from '../auth/decorators/index.js';
import { SearchQueryDto } from './dto/search-query.dto.js';
import { Role } from '@prisma/client';

@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private searchService: SearchService) {}

  /**
   * GET /search?q=...&subject=...&tags=...&topic=...&type=...&difficulty=...&dateFrom=...&dateTo=...&sort=...&order=...&page=...&limit=...
   * Search across PUBLISHED materials' metadata.
   * SECURITY: Students can only search within their subscribed subjects.
   */
  @Get()
  async search(
    @Query() query: SearchQueryDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.searchService.search(query, userId, role);
  }

  /**
   * GET /search/deep?q=...&page=...&limit=...
   * Deep search across text chunks content.
   * SECURITY: Students can only deep-search within their subscribed subjects.
   */
  @Get('deep')
  async deepSearch(
    @Query('q') q: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.searchService.deepSearch(
      q,
      userId,
      role,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }
}
