import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  MinLength,
  IsEnum,
  IsUUID,
} from 'class-validator';
import { UserStatus } from '@prisma/client';

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  serial: string;

  /** The student's education level (University / Middle / Primary) */
  @IsUUID('4')
  @IsNotEmpty()
  educationLevelId: string;

  /** The student's year/grade within that level */
  @IsUUID('4')
  @IsNotEmpty()
  gradeId: string;

  @IsEnum(UserStatus)
  @IsOptional()
  status?: UserStatus;
}
