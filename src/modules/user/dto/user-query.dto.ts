import { IsOptional, IsString, IsNumber, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { UserStatus } from '@prisma/client';

export enum UserSortBy {
  CREATED_AT = 'createdAt',
  NAME = 'name',
  EMAIL = 'email',
}

export enum UserSortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class UserQueryDto {
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  limit?: number = 10;

  @IsString()
  @IsOptional()
  search?: string;

  @IsEnum(UserStatus)
  @IsOptional()
  status?: UserStatus;

  @IsEnum(UserSortBy)
  @IsOptional()
  sortBy?: UserSortBy = UserSortBy.CREATED_AT;

  @IsEnum(UserSortOrder)
  @IsOptional()
  sortOrder?: UserSortOrder = UserSortOrder.DESC;
}
