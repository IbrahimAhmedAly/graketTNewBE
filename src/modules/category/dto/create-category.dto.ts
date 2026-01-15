import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateCategoryDto {
  @IsString({ message: 'الاسم يجب أن يكون نصاً' })
  @IsNotEmpty({ message: 'الاسم مطلوب' })
  name: string;

  @IsOptional()
  @IsString({ message: 'الوصف يجب أن يكون نصاً' })
  description?: string;

  @IsOptional()
  @IsString({ message: 'الأيقونة يجب أن تكون نصاً' })
  icon?: string;
}
