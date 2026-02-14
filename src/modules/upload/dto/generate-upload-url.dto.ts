import { IsString, IsEnum, IsOptional, IsInt, Min, Max } from 'class-validator';

export enum FileType {
  IMAGE = 'image',
  PDF = 'pdf',
  DOCUMENT = 'document',
  VIDEO = 'video',
  ANY = 'any',
}

export class GenerateUploadUrlDto {
  @IsString()
  fileName: string;

  @IsString()
  contentType: string;

  @IsEnum(FileType)
  @IsOptional()
  fileType?: FileType;

  @IsInt()
  @Min(1)
  @Max(100 * 1024 * 1024) // 100MB max
  @IsOptional()
  fileSize?: number;
}
