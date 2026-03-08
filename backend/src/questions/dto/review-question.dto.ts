import { IsEnum, IsNotEmpty } from 'class-validator';
import { QuestionStatus } from '@prisma/client';

export class ReviewQuestionDto {
  @IsEnum(QuestionStatus)
  @IsNotEmpty()
  status: QuestionStatus;
}
