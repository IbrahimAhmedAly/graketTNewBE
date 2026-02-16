import { Module } from '@nestjs/common';
import { CourseController } from './course.controller';
import { CourseService } from './course.service';
import { CourseRepository } from './repositories/course.repository';
import { JwtModule } from '../jwt/jwt.module';
import { PurchaseModule } from '../purchase/purchase.module';

@Module({
  imports: [JwtModule, PurchaseModule],
  controllers: [CourseController],
  providers: [CourseService, CourseRepository],
  exports: [CourseService, CourseRepository],
})
export class CourseModule {}
