import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSubjectDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  code?: string;
}
