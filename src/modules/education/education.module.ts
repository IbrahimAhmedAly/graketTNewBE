import { Module } from '@nestjs/common';
import { EducationService } from './education.service';
import { EducationController } from './education.controller';
import { EducationRepository } from './repositories/education.repository';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [EducationController],
  providers: [EducationService, EducationRepository],
  exports: [EducationService, EducationRepository],
})
export class EducationModule {}
