import { Module } from '@nestjs/common';
import { UserCourseController } from './user-course.controller';
import { UserCourseService } from './user-course.service';
import { UserCourseRepository } from './repositories/user-course.repository';
import { JwtModule } from '../jwt/jwt.module';

@Module({
  imports: [JwtModule],
  controllers: [UserCourseController],
  providers: [UserCourseService, UserCourseRepository],
  exports: [UserCourseService],
})
export class UserCourseModule {}
