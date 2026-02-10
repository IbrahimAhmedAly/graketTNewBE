import {
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
  IsUUID,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PurchaseType } from '@prisma/client';

export enum CodeStatus {
  ALL = 'all',
  USED = 'used',
  UNUSED = 'unused',
  EXPIRED = 'expired',
  ACTIVE = 'active',
}

export class QueryCodeDto {
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
  search?: string; // Search by code

  @IsEnum(PurchaseType)
  @IsOptional()
  type?: PurchaseType;

  @IsUUID()
  @IsOptional()
  courseId?: string;

  @IsUUID()
  @IsOptional()
  contentId?: string;

  @IsEnum(CodeStatus)
  @IsOptional()
  status?: CodeStatus;

  @IsBoolean()
  @Type(() => Boolean)
  @IsOptional()
  isUsed?: boolean;
}
