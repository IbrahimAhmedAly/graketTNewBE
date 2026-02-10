import { IsOptional, IsNumber, IsDateString, IsBoolean, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateCodeDto {
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @IsOptional()
  maxUses?: number;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @IsBoolean()
  @IsOptional()
  isUsed?: boolean;
}
