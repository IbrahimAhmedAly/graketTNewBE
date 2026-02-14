import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsUUID,
  MinLength,
  Min,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CourseStatus } from '@prisma/client';

export class CreateCourseDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  title: string;

  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  description: string;

  @IsString()
  @IsOptional()
  thumbnail?: string;

  @IsUUID()
  @IsNotEmpty()
  instructorId: string;

  @IsUUID()
  @IsNotEmpty()
  categoryId: string;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @IsOptional()
  price?: number;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @IsOptional()
  discountPrice?: number;

  @IsEnum(CourseStatus)
  @IsOptional()
  status?: CourseStatus;

  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @IsOptional()
  totalDuration?: number;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @IsOptional()
  totalVideos?: number;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @IsOptional()
  totalQuizzes?: number;
}
