import { IsString, IsNotEmpty, IsOptional, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateCategoryDto {
  @IsString({ message: 'الاسم يجب أن يكون نصاً' })
  @IsNotEmpty({ message: 'الاسم مطلوب' })
  name: string;

  @IsString({ message: 'الرابط التعريفي يجب أن يكون نصاً' })
  @IsNotEmpty({ message: 'الرابط التعريفي مطلوب' })
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'الرابط التعريفي يجب أن يحتوي على أحرف صغيرة وأرقام وشرطات فقط',
  })
  @Transform(({ value }) => value?.toLowerCase().trim())
  slug: string;

  @IsOptional()
  @IsString({ message: 'الوصف يجب أن يكون نصاً' })
  description?: string;

  @IsOptional()
  @IsString({ message: 'الأيقونة يجب أن تكون نصاً' })
  icon?: string;
}
