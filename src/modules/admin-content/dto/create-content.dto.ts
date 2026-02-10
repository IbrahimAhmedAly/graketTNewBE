import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsOptional,
  Min,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ContentType } from '@prisma/client';

export class CreateContentDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsEnum(ContentType)
  @IsNotEmpty()
  type: ContentType;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  order: number;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @IsOptional()
  duration?: number;

  // For VIDEO type
  @ValidateIf((o) => o.type === ContentType.VIDEO)
  @IsString()
  @IsNotEmpty()
  videoUrl?: string;

  // For PDF type
  @ValidateIf((o) => o.type === ContentType.PDF)
  @IsString()
  @IsNotEmpty()
  pdfUrl?: string;

  @ValidateIf((o) => o.type === ContentType.PDF)
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  fileSize?: number;
}
