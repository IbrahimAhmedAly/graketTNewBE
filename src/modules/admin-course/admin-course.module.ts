import { Module } from '@nestjs/common';
import { AdminCourseService } from './admin-course.service';
import { AdminCourseController } from './admin-course.controller';
import { AdminCourseRepository } from './repositories/admin-course.repository';
import { PrismaModule } from '../../prisma/prisma.module';
import { JwtModule } from '../jwt/jwt.module';
import { EducationModule } from '../education/education.module';

@Module({
  imports: [PrismaModule, JwtModule, EducationModule],
  controllers: [AdminCourseController],
  providers: [AdminCourseService, AdminCourseRepository],
  exports: [AdminCourseService, AdminCourseRepository],
})
export class AdminCourseModule {}
