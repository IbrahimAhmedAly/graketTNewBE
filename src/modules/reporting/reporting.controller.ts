import {
  Controller,
  Get,
  ParseIntPipe,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ReportingService } from './reporting.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

/**
 * Student-facing reporting.
 *
 * Every figure returned here is aggregated from recorded activity. Where the
 * underlying data is absent the response says so explicitly — with a null and
 * a reason — rather than returning a zero that would read as a real measure.
 */
@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  /**
   * The full dashboard.
   * GET /reports/dashboard?tzOffsetMinutes=120
   */
  @Get('dashboard')
  async getDashboard(
    @Request() req: { user: { id: string } },
    @Query('tzOffsetMinutes', new ParseIntPipe({ optional: true }))
    tzOffsetMinutes?: number,
  ) {
    return this.reportingService.getStudentDashboard(
      req.user.id,
      tzOffsetMinutes ?? 0,
    );
  }

  /**
   * Quiz performance breakdown.
   * GET /reports/quiz-analytics
   */
  @Get('quiz-analytics')
  async getQuizAnalytics(@Request() req: { user: { id: string } }) {
    return this.reportingService.getQuizAnalytics(req.user.id);
  }

  /**
   * Areas the student may want to revisit, from their quiz answers.
   * GET /reports/suggestions
   */
  @Get('suggestions')
  async getSuggestions(@Request() req: { user: { id: string } }) {
    return this.reportingService.getStudySuggestions(req.user.id);
  }

  /**
   * Points and badges.
   * GET /reports/rewards
   */
  @Get('rewards')
  async getRewards(@Request() req: { user: { id: string } }) {
    return this.reportingService.getRewards(req.user.id);
  }

  /**
   * Today's tasks.
   * GET /reports/mission?tzOffsetMinutes=120
   */
  @Get('mission')
  async getMission(
    @Request() req: { user: { id: string } },
    @Query('tzOffsetMinutes', new ParseIntPipe({ optional: true }))
    tzOffsetMinutes?: number,
  ) {
    return this.reportingService.getTodaysMission(
      req.user.id,
      tzOffsetMinutes ?? 0,
    );
  }

  /**
   * Activity-derived nudges.
   * GET /reports/insights?tzOffsetMinutes=120
   */
  @Get('insights')
  async getInsights(
    @Request() req: { user: { id: string } },
    @Query('tzOffsetMinutes', new ParseIntPipe({ optional: true }))
    tzOffsetMinutes?: number,
  ) {
    return this.reportingService.getInsights(req.user.id, tzOffsetMinutes ?? 0);
  }
}
