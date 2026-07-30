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
