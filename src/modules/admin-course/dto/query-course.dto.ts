import { IsOptional, IsString, IsNumber, IsBoolean, IsUUID, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export enum SortBy {
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  TITLE = 'title',
  PRICE = 'price',
}

export class QueryCourseDto {
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
  search?: string;

  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @IsUUID()
  @IsOptional()
  instructorId?: string;

  @IsUUID()
  @IsOptional()
  educationLevelId?: string;

  @IsUUID()
  @IsOptional()
  gradeId?: string;

  @IsBoolean()
  @Type(() => Boolean)
  @IsOptional()
  isPublished?: boolean;

  @IsEnum(SortBy)
  @IsOptional()
  sortBy?: SortBy = SortBy.CREATED_AT;

  @IsEnum(SortOrder)
  @IsOptional()
  sortOrder?: SortOrder = SortOrder.DESC;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  minPrice?: number;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  maxPrice?: number;
}
