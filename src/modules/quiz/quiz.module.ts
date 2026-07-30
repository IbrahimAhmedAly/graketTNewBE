import { Module } from '@nestjs/common';
import { QuizController } from './quiz.controller';
import { QuizService } from './quiz.service';
import { QuizRepository } from './repositories/quiz.repository';
import { JwtModule } from '../jwt/jwt.module';
import { TrackingModule } from '../tracking/tracking.module';

@Module({
  // TrackingModule supplies the daily-rollup writer, so a submitted quiz shows
  // up in the activity chart and streak alongside videos and PDFs.
  imports: [JwtModule, TrackingModule],
  controllers: [QuizController],
  providers: [QuizService, QuizRepository],
  exports: [QuizService],
})
export class QuizModule {}
