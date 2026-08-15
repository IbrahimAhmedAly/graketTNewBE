import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AdminReportingService } from './admin-reporting.service';
import { SubscriptionsService } from './student-profile/subscriptions.service';
import { QuizDetailService } from './student-profile/quiz-detail.service';
import {
  ActivityEventType,
  ActivityLogService,
} from './student-profile/activity-log.service';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';

/**
 * Admin reporting.
 *
 * Reuses the student-facing aggregation underneath, so an admin viewing a
 * student's progress sees exactly the figures that student sees.
 */
@Controller('admin/reports')
@UseGuards(AdminAuthGuard)
export class AdminReportingController {
  constructor(
    private readonly adminReportingService: AdminReportingService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly quizDetailService: QuizDetailService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  /**
   * Platform-wide figures for the admin overview.
   * GET /admin/reports/overview
   */
  @Get('overview')
  async getOverview() {
    return this.adminReportingService.getPlatformOverview();
  }

  /**
   * Full activity report for one student.
   * GET /admin/reports/student/:id
   */
  @Get('student/:id')
  async getStudentReport(@Param('id') id: string) {
    return this.adminReportingService.getStudentReport(id);
  }

  /**
   * Courses the student is subscribed to, and the codes behind them.
   * GET /admin/reports/student/:id/subscriptions
   */
  @Get('student/:id/subscriptions')
  async getSubscriptions(@Param('id') id: string) {
    return this.subscriptionsService.getSubscriptions(id);
  }

  /**
   * Every quiz attempt, paginated.
   *
   * Separate from the main report because "all results" is unbounded — a
   * long-running student can have hundreds, and the summary block on the main
   * report is not a substitute for the list.
   *
   * GET /admin/reports/student/:id/quizzes?page=1&limit=25
   */
  @Get('student/:id/quizzes')
  async getQuizzes(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    // The service clamps and coerces; passing the raw strings through keeps a
    // malformed page from 400-ing a report an admin is trying to read.
    return this.quizDetailService.getAllAttempts(
      id,
      Number(page) || undefined,
      Number(limit) || undefined,
    );
  }

  /**
   * The questions this student gets wrong most often.
   * GET /admin/reports/student/:id/missed-questions?limit=20
   */
  @Get('student/:id/missed-questions')
  async getMissedQuestions(
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    return this.quizDetailService.getMissedQuestions(
      id,
      Number(limit) || undefined,
    );
  }

  /**
   * Full activity log, paginated and filterable by event type.
   * GET /admin/reports/student/:id/activity-log?page=1&limit=50&types=pdf,quiz
   */
  @Get('student/:id/activity-log')
  async getActivityLog(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('types') types?: string,
  ) {
    // An unrecognised type is rejected by the service rather than silently
    // widened to "everything" — a filter that quietly does nothing is worse
    // than an error.
    const parsedTypes = types
      ? (types
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean) as ActivityEventType[])
      : undefined;

    return this.activityLogService.getActivityLog(id, {
      page: Number(page) || undefined,
      limit: Number(limit) || undefined,
      types: parsedTypes,
    });
  }
}
