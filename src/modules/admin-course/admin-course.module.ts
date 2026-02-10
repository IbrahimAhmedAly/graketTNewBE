import { Module } from '@nestjs/common';
import { AdminCourseService } from './admin-course.service';
import { AdminCourseController } from './admin-course.controller';
import { AdminCourseRepository } from './repositories/admin-course.repository';
import { PrismaModule } from '../../prisma/prisma.module';
import { JwtModule } from '../jwt/jwt.module';

@Module({
  imports: [PrismaModule, JwtModule],
  controllers: [AdminCourseController],
  providers: [AdminCourseService, AdminCourseRepository],
  exports: [AdminCourseService, AdminCourseRepository],
})
export class AdminCourseModule {}
