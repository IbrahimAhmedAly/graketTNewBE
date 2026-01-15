import { IsString, IsNotEmpty } from 'class-validator';

export class VerifyResetCodeDto {
  @IsString({ message: 'رمز التحقق يجب أن يكون نصاً' })
  @IsNotEmpty({ message: 'رمز التحقق مطلوب' })
  verificationToken: string;

  @IsString({ message: 'الرمز يجب أن يكون نصاً' })
  @IsNotEmpty({ message: 'الرمز مطلوب' })
  code: string;
}
