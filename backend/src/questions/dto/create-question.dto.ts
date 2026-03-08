import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateQuestionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  questionText: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  answerText: string;

  @IsUUID()
  @IsNotEmpty()
  subjectId: string;
}
