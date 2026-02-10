import {
  IsEnum,
  IsNotEmpty,
  IsUUID,
  IsOptional,
  IsNumber,
  IsDateString,
  ValidateIf,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PurchaseType } from '@prisma/client';

export class GenerateCodeDto {
  @IsEnum(PurchaseType)
  @IsNotEmpty()
  type: PurchaseType;

  // For COURSE type
  @ValidateIf((o) => o.type === PurchaseType.COURSE)
  @IsUUID()
  @IsNotEmpty()
  courseId?: string;

  // For VIDEO type
  @ValidateIf((o) => o.type === PurchaseType.VIDEO)
  @IsUUID()
  @IsNotEmpty()
  contentId?: string;

  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @IsOptional()
  maxUses?: number;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @IsOptional()
  quantity?: number; // For bulk generation
}
