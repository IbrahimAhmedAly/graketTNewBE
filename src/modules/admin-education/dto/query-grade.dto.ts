import { IsOptional, IsNumber, IsString, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryGradeDto {
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

  /** Restrict the list to grades under a single education level */
  @IsUUID('4')
  @IsOptional()
  educationLevelId?: string;
}
