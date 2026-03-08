import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class UpdateQuestionDto {
  @IsString()
  @IsOptional()
  @MaxLength(5000)
  questionText?: string;

  @IsString()
  @IsOptional()
  @MaxLength(10000)
  answerText?: string;

  @IsUUID()
  @IsOptional()
  subjectId?: string;
}
