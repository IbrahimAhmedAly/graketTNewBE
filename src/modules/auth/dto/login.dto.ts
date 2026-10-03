import {
  IsEmail,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
} from 'class-validator';
import { Transform } from 'class-transformer';

export const LOGIN_DEVICE_TYPES = ['mobile', 'desktop'] as const;
export type LoginDeviceType = (typeof LOGIN_DEVICE_TYPES)[number];

export class LoginDto {
  @IsEmail({}, { message: 'البريد الإلكتروني غير صالح' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @IsString({ message: 'كلمة المرور يجب أن تكون نصاً' })
  @IsNotEmpty({ message: 'كلمة المرور مطلوبة' })
  password: string;

  @IsString({ message: 'الرقم التسلسلي يجب أن يكون نصاً' })
  @IsNotEmpty({ message: 'الرقم التسلسلي مطلوب' })
  serial: string;

  /**
   * Which kind of device is signing in. The mobile app does not send it, so
   * absent means mobile. A desktop login is checked against the student's
   * separate desktop device instead of their phone.
   */
  @IsOptional()
  @IsIn(LOGIN_DEVICE_TYPES, { message: 'نوع الجهاز غير صالح' })
  deviceType?: LoginDeviceType;
}
