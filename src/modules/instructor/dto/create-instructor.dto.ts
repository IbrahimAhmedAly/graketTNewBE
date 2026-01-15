import {
  IsEmail,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUrl,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateInstructorDto {
  @IsString({ message: 'الاسم يجب أن يكون نصاً' })
  @IsNotEmpty({ message: 'الاسم مطلوب' })
  name: string;

  @IsOptional()
  @IsEmail({}, { message: 'البريد الإلكتروني غير صالح' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email?: string;

  @IsOptional()
  @IsUrl({}, { message: 'رابط الصورة غير صالح' })
  avatar?: string;

  @IsOptional()
  @IsString({ message: 'السيرة الذاتية يجب أن تكون نصاً' })
  bio?: string;

  @IsOptional()
  @IsString({ message: 'اللقب يجب أن يكون نصاً' })
  title?: string;
}
