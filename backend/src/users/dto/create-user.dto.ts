import { IsEnum, IsNotEmpty, IsOptional, IsString, MinLength, IsBoolean, Matches } from 'class-validator';
import { Role } from '@prisma/client';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[0-9]{9,15}$/, { message: 'Phone number must be 9-15 digits' })
  phone: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsEnum(Role)
  @IsOptional()
  role?: Role;
}
