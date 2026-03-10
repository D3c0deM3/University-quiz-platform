import { IsString } from 'class-validator';

export class CheckAnswerDto {
  @IsString()
  questionId: string;

  @IsString()
  selectedOptionId: string;
}
