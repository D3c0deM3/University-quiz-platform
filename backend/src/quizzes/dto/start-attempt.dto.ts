import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class StartAttemptDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  questionCount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  rangeStart?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  rangeEnd?: number;
}
