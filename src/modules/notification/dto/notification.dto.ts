import { IsOptional, IsInt, Min, IsBoolean, IsUUID } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class NotificationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  unreadOnly?: boolean = false;
}

export class MarkNotificationReadDto {
  @IsUUID('4', { message: 'معرف الإشعار غير صالح' })
  notificationId: string;
}
