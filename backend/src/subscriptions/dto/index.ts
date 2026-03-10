import { IsString, IsOptional, IsDateString, IsEnum } from 'class-validator';
import { SubscriptionStatus } from '@prisma/client';

export class AssignSubscriptionDto {
  @IsString()
  userId!: string;

  @IsString()
  subjectId!: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class BulkAssignDto {
  @IsString()
  userId!: string;

  @IsString({ each: true })
  subjectIds!: string[];

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class UpdateSubscriptionDto {
  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status?: SubscriptionStatus;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
