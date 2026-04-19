import { Module } from '@nestjs/common';
import { CourseQaController } from './course-qa.controller';
import { CourseQaService } from './course-qa.service';
import { CourseQaRepository } from './repositories/course-qa.repository';

@Module({
  controllers: [CourseQaController],
  providers: [CourseQaService, CourseQaRepository],
})
export class CourseQaModule {}
