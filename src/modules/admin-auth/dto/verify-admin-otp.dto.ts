import { IsString, IsNotEmpty, Length } from 'class-validator';

/**
 * Verify Admin OTP DTO
 * Used for verifying the OTP code sent to admin email
 */
export class VerifyAdminOtpDto {
  @IsString({ message: 'رمز التحقق مطلوب' })
  @IsNotEmpty({ message: 'رمز التحقق مطلوب' })
  verificationToken: string;

  @IsString({ message: 'الرمز مطلوب' })
  @IsNotEmpty({ message: 'الرمز مطلوب' })
  @Length(6, 6, { message: 'الرمز يجب أن يكون 6 أرقام' })
  code: string;
}
