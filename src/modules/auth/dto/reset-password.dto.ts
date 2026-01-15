import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString({ message: 'رمز إعادة التعيين يجب أن يكون نصاً' })
  @IsNotEmpty({ message: 'رمز إعادة التعيين مطلوب' })
  resetToken: string;

  @IsString({ message: 'كلمة المرور الجديدة يجب أن تكون نصاً' })
  @IsNotEmpty({ message: 'كلمة المرور الجديدة مطلوبة' })
  @MinLength(6, { message: 'يجب أن تكون كلمة المرور 6 أحرف على الأقل' })
  newPassword: string;

  @IsString({ message: 'تأكيد كلمة المرور يجب أن يكون نصاً' })
  @IsNotEmpty({ message: 'تأكيد كلمة المرور مطلوب' })
  confirmPassword: string;
}
