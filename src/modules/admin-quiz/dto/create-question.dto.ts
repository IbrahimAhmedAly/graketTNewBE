import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsArray,
  IsOptional,
  IsUrl,
  MaxLength,
  ValidateNested,
  ArrayMinSize,
  Min,
  isURL,
  maxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

// http(s) only. No top-level domain required, so localhost works in development.
export const QUESTION_IMAGE_URL_OPTIONS = {
  protocols: ['http', 'https'],
  require_protocol: true,
  require_tld: false,
};
export const QUESTION_IMAGE_URL_MAX_LENGTH = 2048;

/**
 * The imageUrl rule of CreateQuestionDto as a plain check, for the PATCH
 * question routes: their @Body() is a union type, which the global
 * ValidationPipe does not validate.
 */
export function isValidQuestionImageUrl(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    (isURL(value as string, QUESTION_IMAGE_URL_OPTIONS) &&
      maxLength(value, QUESTION_IMAGE_URL_MAX_LENGTH))
  );
}

export class OptionDto {
  @IsString()
  @IsNotEmpty()
  text: string;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  order: number;
}

export class CreateQuestionDto {
  @IsString()
  @IsNotEmpty()
  questionText: string;

  // S3 public URL (uploaded via /upload/generate-url first), shown above the
  // question text. Optional; null removes it.
  @IsUrl(QUESTION_IMAGE_URL_OPTIONS)
  @MaxLength(QUESTION_IMAGE_URL_MAX_LENGTH)
  @IsOptional()
  imageUrl?: string | null;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  order: number;

  @IsNumber()
  @Type(() => Number)
  @Min(1)
  points: number;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(2)
  @Type(() => OptionDto)
  options: OptionDto[];

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  correctOptionIndex: number; // Index of the correct option in the options array
}
