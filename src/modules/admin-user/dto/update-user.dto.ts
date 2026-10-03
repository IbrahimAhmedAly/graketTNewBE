import {
  IsString,
  IsEmail,
  IsOptional,
  MinLength,
  IsEnum,
  IsUUID,
} from 'class-validator';
import { UserStatus } from '@prisma/client';

export class UpdateUserDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  @MinLength(6)
  password?: string;

  @IsString()
  @IsOptional()
  serial?: string;

  // PC the student is bound to in the desktop player. Send null to let the
  // student sign in from a different PC.
  @IsString()
  @IsOptional()
  desktopSerial?: string | null;

  @IsUUID('4')
  @IsOptional()
  educationLevelId?: string;

  @IsUUID('4')
  @IsOptional()
  gradeId?: string;

  @IsEnum(UserStatus)
  @IsOptional()
  status?: UserStatus;
}
