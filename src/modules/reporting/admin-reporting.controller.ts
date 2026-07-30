import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AdminReportingService } from './admin-reporting.service';
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
  constructor(private readonly adminReportingService: AdminReportingService) {}

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
}
