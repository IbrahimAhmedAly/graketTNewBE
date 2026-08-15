import {
  IsOptional,
  IsString,
  IsUUID,
  Length,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * `@IsOptional()` skips every downstream validator for BOTH `undefined` and
 * `null`, which would let an explicit `null` slip past `@IsUUID`/`@Length` and
 * reach the repository — which writes any key that is `!== undefined`. For the
 * fields below `null` is not a legal value, so gate on `undefined` alone and
 * let the validators run on `null`. Only `parentPhone` is genuinely nullable.
 */
const IsPresent = () => ValidateIf((_object, value) => value !== undefined);

/**
 * Body of PATCH /user/me — student self-service profile edit.
 *
 * Every field is optional, but the global ValidationPipe runs with
 * `forbidNonWhitelisted`, so anything not declared here is rejected with 400.
 * Sensitive columns (email, password, serial, status) are intentionally absent:
 * a student may never change them through this endpoint.
 */
export class UpdateProfileDto {
  @IsPresent()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'الاسم يجب أن يكون نصاً' })
  @Length(2, 60, { message: 'الاسم يجب أن يكون بين 2 و 60 حرفاً' })
  name?: string;

  /**
   * Guardian contact. Send `null` (or an empty string, which is normalised to
   * `null`) to clear it.
   */
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  })
  @IsString({ message: 'رقم هاتف ولي الأمر يجب أن يكون نصاً' })
  parentPhone?: string | null;

  @IsPresent()
  @IsUUID('4', { message: 'معرف المرحلة التعليمية غير صالح' })
  educationLevelId?: string;

  @IsPresent()
  @IsUUID('4', { message: 'معرف الصف الدراسي غير صالح' })
  gradeId?: string;
}
