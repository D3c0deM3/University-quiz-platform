import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SearchService } from './search.service.js';
import { JwtAuthGuard } from '../auth/guards/index.js';
import { SearchQueryDto } from './dto/search-query.dto.js';

@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private searchService: SearchService) {}

  /**
   * GET /search?q=...&subject=...&tags=...&topic=...&type=...&difficulty=...&dateFrom=...&dateTo=...&sort=...&order=...&page=...&limit=...
   * Search across PUBLISHED materials' metadata.
   */
  @Get()
  async search(@Query() query: SearchQueryDto) {
    return this.searchService.search(query);
  }

  /**
   * GET /search/deep?q=...&page=...&limit=...
   * Deep search across text chunks content.
   */
  @Get('deep')
  async deepSearch(
    @Query('q') q: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.searchService.deepSearch(
      q,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }
}
