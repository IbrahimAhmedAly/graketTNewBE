import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ProgressService } from './progress.service';
import { MarkContentCompleteDto } from './dto/progress.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('progress')
@UseGuards(JwtAuthGuard)
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  /**
   * Mark content (video/pdf/quiz) as complete
   * POST /progress/complete
   */
  @Post('complete')
  @HttpCode(HttpStatus.OK)
  async markContentComplete(
    @Request() req: { user: { id: string } },
    @Body() dto: MarkContentCompleteDto,
  ) {
    return this.progressService.markContentComplete(req.user.id, dto);
  }

  /**
   * Get progress for a specific content
   * GET /progress/content/:contentId
   */
  @Get('content/:contentId')
  async getContentProgress(
    @Request() req: { user: { id: string } },
    @Param('contentId') contentId: string,
  ) {
    return this.progressService.getContentProgress(req.user.id, contentId);
  }

  /**
   * Get overall progress for a course
   * GET /progress/course/:courseId
   */
  @Get('course/:courseId')
  async getCourseProgress(
    @Request() req: { user: { id: string } },
    @Param('courseId') courseId: string,
  ) {
    return this.progressService.getCourseProgress(req.user.id, courseId);
  }
}
