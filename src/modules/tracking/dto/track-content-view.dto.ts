import { ContentType } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';

/** Opens a view row when a student enters a content item. */
export class StartContentViewDto {
  @IsUUID('4', { message: 'contentId must be a valid id' })
  contentId: string;

  @IsEnum(ContentType, { message: 'type must be VIDEO, PDF or QUIZ' })
  type: ContentType;

  /** Total pages, from the PDF viewer's render callback. */
  @IsOptional()
  @IsInt()
  @Min(0)
  totalPages?: number;

  @IsOptional()
  @IsInt()
  tzOffsetMinutes?: number;
}

/** Closes a view row, recording dwell time and PDF read depth. */
export class EndContentViewDto {
  @IsUUID('4', { message: 'viewId must be a valid id' })
  viewId: string;

  /**
   * Foreground seconds on this item. Server-clamped: a client cannot claim
   * more time than has elapsed since the view was opened.
   */
  @IsInt()
  @Min(0)
  durationSec: number;

  /** Highest page reached, from the PDF viewer's page-change callback. */
  @IsOptional()
  @IsInt()
  @Min(0)
  pagesRead?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  totalPages?: number;
}
