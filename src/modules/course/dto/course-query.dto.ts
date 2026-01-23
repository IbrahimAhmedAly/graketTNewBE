import { IsOptional, IsString, IsInt, Min, IsUUID } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CourseQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  search?: string;

  @IsOptional()
  @IsUUID('4', { message: 'معرف التصنيف غير صالح' })
  categoryId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'معرف المدرب غير صالح' })
  instructorId?: string;
}
