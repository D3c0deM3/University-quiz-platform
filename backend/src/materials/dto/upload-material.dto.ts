import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class UploadMaterialDto {
  @IsUUID()
  @IsNotEmpty()
  subjectId: string;
}
