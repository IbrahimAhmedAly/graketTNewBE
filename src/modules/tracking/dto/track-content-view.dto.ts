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

  /**
   * Device UTC offset in minutes.
   *
   * Recorded here for symmetry with the other ingest DTOs, but `ContentView`
   * has no column to carry it to the moment credit is awarded, so the offset
   * that actually decides the day is the one on `EndContentViewDto`.
   */
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

  /**
   * Device UTC offset in minutes, repeated from `start` because this is where
   * the PDF read is credited and the view row cannot carry it across.
   *
   * A read at 01:00 in Cairo belongs to that day on the student's heat map,
   * not to UTC's previous one. Optional so the deployed app keeps working:
   * without it the server falls back to the offset of the study session that
   * was open when the view was opened.
   */
  @IsOptional()
  @IsInt()
  tzOffsetMinutes?: number;
}
