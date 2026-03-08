import { IsEnum, IsNotEmpty } from 'class-validator';
import { Role } from '@prisma/client';

export class AssignRoleDto {
  @IsEnum(Role)
  @IsNotEmpty()
  role: Role;
}
