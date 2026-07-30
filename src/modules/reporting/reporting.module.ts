import { Module } from '@nestjs/common';
import { ReportingController } from './reporting.controller';
import { AdminReportingController } from './admin-reporting.controller';
import { ReportingService } from './reporting.service';
import { AdminReportingService } from './admin-reporting.service';
import { ReportingRepository } from './repositories/reporting.repository';
import { JwtModule } from '../jwt/jwt.module';

@Module({
  imports: [JwtModule],
  controllers: [ReportingController, AdminReportingController],
  providers: [ReportingService, AdminReportingService, ReportingRepository],
  // Exported so the admin per-student report can reuse the same aggregation
  // rather than re-deriving figures that would then be free to disagree.
  exports: [ReportingService, ReportingRepository],
})
export class ReportingModule {}
