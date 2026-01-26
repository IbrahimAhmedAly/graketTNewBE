import {
  IsEmail,
  IsString,
  IsNotEmpty,
  MinLength,
  IsOptional,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class RegisterDto {
  @IsEmail({}, { message: 'البريد الإلكتروني غير صالح' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @IsOptional()
  @IsString({ message: 'الاسم يجب أن يكون نصاً' })
  name?: string;

  @IsString({ message: 'كلمة المرور يجب أن تكون نصاً' })
  @IsNotEmpty({ message: 'كلمة المرور مطلوبة' })
  @MinLength(6, { message: 'يجب أن تكون كلمة المرور 6 أحرف على الأقل' })
  password: string;

  @IsString({ message: 'الرقم التسلسلي يجب أن يكون نصاً' })
  @IsNotEmpty({ message: 'الرقم التسلسلي مطلوب' })
  serial: string;
}
