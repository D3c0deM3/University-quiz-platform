import { IsString, IsNotEmpty, IsUUID, IsArray, IsBoolean, IsOptional, ValidateNested, ArrayMinSize, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class ManualQuizOptionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  text: string;

  @IsBoolean()
  isCorrect: boolean;
}

export class ManualQuizQuestionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  questionText: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  explanation?: string;

  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => ManualQuizOptionDto)
  options: ManualQuizOptionDto[];
}

export class CreateManualQuizDto {
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
  @Type(() => ManualQuizQuestionDto)
  questions: ManualQuizQuestionDto[];
}
