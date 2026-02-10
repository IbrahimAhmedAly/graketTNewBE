import { Module } from '@nestjs/common';
import { AdminQuizService } from './admin-quiz.service';
import { AdminQuizController } from './admin-quiz.controller';
import { AdminQuizRepository } from './repositories/admin-quiz.repository';
import { PrismaModule } from '../../prisma/prisma.module';
import { JwtModule } from '../jwt/jwt.module';

@Module({
  imports: [PrismaModule, JwtModule],
  controllers: [AdminQuizController],
  providers: [AdminQuizService, AdminQuizRepository],
  exports: [AdminQuizService, AdminQuizRepository],
})
export class AdminQuizModule {}
