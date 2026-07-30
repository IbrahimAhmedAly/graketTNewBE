import { Module } from '@nestjs/common';
import { TrackingController } from './tracking.controller';
import { TrackingService } from './tracking.service';
import { TrackingRepository } from './repositories/tracking.repository';
import { JwtModule } from '../jwt/jwt.module';

@Module({
  imports: [JwtModule],
  controllers: [TrackingController],
  providers: [TrackingService, TrackingRepository],
  // Exported so the reporting layer and the quiz module can credit activity
  // through the same rollup path rather than writing counters themselves.
  exports: [TrackingService, TrackingRepository],
})
export class TrackingModule {}
