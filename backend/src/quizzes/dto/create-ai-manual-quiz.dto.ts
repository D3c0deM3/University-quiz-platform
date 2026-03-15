import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsArray,
  IsOptional,
  ValidateNested,
  ArrayMinSize,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AiManualQuestionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  questionText: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  correctAnswer: string;
}

export class CreateAiManualQuizDto {
  @IsUUID()
  @IsNotEmpty()
  subjectId: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  title?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AiManualQuestionDto)
  questions: AiManualQuestionDto[];
}
