import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class GenerateQuizFromQADto {
  @IsUUID()
  @IsNotEmpty()
  subjectId: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  title?: string;
}
