import { Module } from '@nestjs/common';
import { ReportingController } from './reporting.controller';
import { AdminReportingController } from './admin-reporting.controller';
import { ReportingService } from './reporting.service';
import { AdminReportingService } from './admin-reporting.service';
import { ReportingRepository } from './repositories/reporting.repository';
import { SubscriptionsService } from './student-profile/subscriptions.service';
import { SubscriptionsRepository } from './student-profile/subscriptions.repository';
import { QuizDetailService } from './student-profile/quiz-detail.service';
import { QuizDetailRepository } from './student-profile/quiz-detail.repository';
import { ActivityLogService } from './student-profile/activity-log.service';
import { ActivityLogRepository } from './student-profile/activity-log.repository';
import { JwtModule } from '../jwt/jwt.module';

@Module({
  imports: [JwtModule],
  controllers: [ReportingController, AdminReportingController],
  providers: [
    ReportingService,
    AdminReportingService,
    ReportingRepository,
    // Per-student profile detail. Each slice is self-contained so the sections
    // an admin drills into can be paged independently of the main report.
    SubscriptionsService,
    SubscriptionsRepository,
    QuizDetailService,
    QuizDetailRepository,
    ActivityLogService,
    ActivityLogRepository,
  ],
  // Exported so the admin per-student report can reuse the same aggregation
  // rather than re-deriving figures that would then be free to disagree.
  exports: [ReportingService, ReportingRepository],
})
export class ReportingModule {}
