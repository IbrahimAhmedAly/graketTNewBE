import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateBannerDto {
  @IsString()
  @IsNotEmpty()
  image: string; // S3 public URL (uploaded via /upload/generate-url first)

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
