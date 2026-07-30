import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class WatchSegmentDto {
  @IsInt({ message: 'Segment start must be a whole number of seconds' })
  @Min(0, { message: 'Segment start cannot be negative' })
  start: number;

  @IsInt({ message: 'Segment end must be a whole number of seconds' })
  @Min(0, { message: 'Segment end cannot be negative' })
  end: number;
}

export class TrackVideoProgressDto {
  @IsUUID('4', { message: 'contentId must be a valid id' })
  contentId: string;

  /**
   * Intervals played since the last report. The server merges these into the
   * stored union, so a client that retries a request cannot inflate the total.
   */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WatchSegmentDto)
  @ArrayMaxSize(200, {
    message: 'Too many segments in one report; send them more frequently',
  })
  segments: WatchSegmentDto[];

  /** Playhead at report time, used only for resume. */
  @IsInt()
  @Min(0)
  positionSec: number;

  /**
   * Video length as reported by the player. Preferred over the admin-entered
   * `Content.duration` because it reflects the actual media.
   */
  @IsOptional()
  @IsInt()
  @Min(0)
  durationSec?: number;

  /** True when playback restarted after previously reaching the end. */
  @IsOptional()
  @IsBoolean()
  isReplay?: boolean;

  /** Device UTC offset in minutes, for local-day bucketing. */
  @IsOptional()
  @IsInt()
  tzOffsetMinutes?: number;
}
