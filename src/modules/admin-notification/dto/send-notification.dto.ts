import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  IsUUID,
  ValidateIf,
} from 'class-validator';
import { NotificationType } from '@prisma/client';

export enum NotificationTarget {
  ALL_USERS = 'all_users',
  SPECIFIC_USERS = 'specific_users',
  COURSE_ENROLLED = 'course_enrolled',
  STATUS_BASED = 'status_based',
}

export class SendNotificationDto {
  @IsEnum(NotificationTarget)
  @IsNotEmpty()
  target: NotificationTarget;

  @IsEnum(NotificationType)
  @IsNotEmpty()
  type: NotificationType;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsOptional()
  data?: any; // JSON data

  // For SPECIFIC_USERS target
  @ValidateIf((o) => o.target === NotificationTarget.SPECIFIC_USERS)
  @IsArray()
  @IsUUID('4', { each: true })
  userIds?: string[];

  // For COURSE_ENROLLED target
  @ValidateIf((o) => o.target === NotificationTarget.COURSE_ENROLLED)
  @IsUUID()
  courseId?: string;

  // For STATUS_BASED target
  @ValidateIf((o) => o.target === NotificationTarget.STATUS_BASED)
  @IsString()
  userStatus?: string; // ACTIVE, PENDING, SUSPENDED
}
