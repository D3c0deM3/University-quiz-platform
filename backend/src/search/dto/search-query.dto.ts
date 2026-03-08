import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { Transform } from 'class-transformer';

export enum SearchSortBy {
  RELEVANCE = 'relevance',
  DATE = 'date',
  TITLE = 'title',
}

export enum SearchSortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class SearchQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  tags?: string; // comma-separated

  @IsOptional()
  @IsString()
  topic?: string;

  @IsOptional()
  @IsString()
  type?: string; // file type: PDF, DOCX, PPTX, etc.

  @IsOptional()
  @IsString()
  difficulty?: string; // BEGINNER, INTERMEDIATE, ADVANCED

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsEnum(SearchSortBy)
  sort?: SearchSortBy = SearchSortBy.RELEVANCE;

  @IsOptional()
  @IsEnum(SearchSortOrder)
  order?: SearchSortOrder = SearchSortOrder.DESC;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
