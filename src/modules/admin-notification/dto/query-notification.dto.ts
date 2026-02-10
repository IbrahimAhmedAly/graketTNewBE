import {
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  IsUUID,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { NotificationType } from '@prisma/client';

export class QueryNotificationDto {
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  limit?: number = 10;

  @IsString()
  @IsOptional()
  search?: string; // Search by title or description

  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType;

  @IsUUID()
  @IsOptional()
  userId?: string; // Filter by specific user

  @IsBoolean()
  @Type(() => Boolean)
  @IsOptional()
  isRead?: boolean;
}
