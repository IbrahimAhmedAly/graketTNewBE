import { IsEmail, IsString, IsNotEmpty, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * Admin Login DTO
 * Used for initial admin login (email + password)
 */
export class AdminLoginDto {
  @IsEmail({}, { message: 'البريد الإلكتروني غير صالح' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @IsString({ message: 'كلمة المرور مطلوبة' })
  @IsNotEmpty({ message: 'كلمة المرور مطلوبة' })
  @MinLength(6, { message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' })
  password: string;
}
