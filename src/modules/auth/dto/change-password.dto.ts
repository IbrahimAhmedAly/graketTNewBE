import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString({ message: 'كلمة المرور الحالية يجب أن تكون نصاً' })
  @IsNotEmpty({ message: 'كلمة المرور الحالية مطلوبة' })
  currentPassword: string;

  @IsString({ message: 'كلمة المرور الجديدة يجب أن تكون نصاً' })
  @IsNotEmpty({ message: 'كلمة المرور الجديدة مطلوبة' })
  @MinLength(6, { message: 'يجب أن تكون كلمة المرور 6 أحرف على الأقل' })
  // bcrypt silently truncates at 72 bytes. Without this cap, two passwords
  // that differ only past byte 72 hash identically, so the
  // "new must differ from current" check below would pass while the stored
  // hash stayed the same — the user would be told their password changed
  // when it had not.
  @MaxLength(72, { message: 'يجب ألا تزيد كلمة المرور عن 72 حرفاً' })
  newPassword: string;

  @IsString({ message: 'تأكيد كلمة المرور يجب أن يكون نصاً' })
  @IsNotEmpty({ message: 'تأكيد كلمة المرور مطلوب' })
  confirmPassword: string;
}
