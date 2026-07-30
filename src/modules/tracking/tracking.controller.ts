import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { TrackingService } from './tracking.service';
import {
  EndContentViewDto,
  EndSessionDto,
  HeartbeatDto,
  StartContentViewDto,
  StartSessionDto,
  TrackVideoProgressDto,
} from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

/**
 * Activity ingestion.
 *
 * Every endpoint here records what a student actually did. The reporting layer
 * only ever aggregates these rows, so anything not captured here cannot appear
 * in a report.
 */
@Controller('tracking')
@UseGuards(JwtAuthGuard)
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  /**
   * Report intervals of a video that were played.
   * POST /tracking/video-progress
   */
  @Post('video-progress')
  @HttpCode(HttpStatus.OK)
  async trackVideoProgress(
    @Request() req: { user: { id: string } },
    @Body() dto: TrackVideoProgressDto,
  ) {
    return this.trackingService.trackVideoProgress(req.user.id, dto);
  }

  /**
   * Resume state for a video.
   * GET /tracking/video-progress/:contentId
   */
  @Get('video-progress/:contentId')
  async getVideoProgress(
    @Request() req: { user: { id: string } },
    @Param('contentId') contentId: string,
  ) {
    return this.trackingService.getVideoProgress(req.user.id, contentId);
  }

  /**
   * Open a content view when the student enters an item.
   * POST /tracking/content-view/start
   */
  @Post('content-view/start')
  @HttpCode(HttpStatus.CREATED)
  async startContentView(
    @Request() req: { user: { id: string } },
    @Body() dto: StartContentViewDto,
  ) {
    return this.trackingService.startContentView(req.user.id, dto);
  }

  /**
   * Close a content view, recording dwell time and PDF read depth.
   * POST /tracking/content-view/end
   */
  @Post('content-view/end')
  @HttpCode(HttpStatus.OK)
  async endContentView(
    @Request() req: { user: { id: string } },
    @Body() dto: EndContentViewDto,
  ) {
    return this.trackingService.endContentView(req.user.id, dto);
  }

  /**
   * Open a study session, or resume the one already open.
   * POST /tracking/session/start
   */
  @Post('session/start')
  @HttpCode(HttpStatus.CREATED)
  async startSession(
    @Request() req: { user: { id: string } },
    @Body() dto: StartSessionDto,
  ) {
    return this.trackingService.startSession(req.user.id, dto);
  }

  /**
   * Keep a session alive. Sent on a timer while the app is in the foreground.
   * POST /tracking/session/heartbeat
   */
  @Post('session/heartbeat')
  @HttpCode(HttpStatus.OK)
  async heartbeat(
    @Request() req: { user: { id: string } },
    @Body() dto: HeartbeatDto,
  ) {
    return this.trackingService.heartbeat(req.user.id, dto);
  }

  /**
   * Close a session when the app is backgrounded.
   * POST /tracking/session/end
   */
  @Post('session/end')
  @HttpCode(HttpStatus.OK)
  async endSession(
    @Request() req: { user: { id: string } },
    @Body() dto: EndSessionDto,
  ) {
    return this.trackingService.endSession(req.user.id, dto);
  }
}
