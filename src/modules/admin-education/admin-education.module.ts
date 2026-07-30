import { Module } from '@nestjs/common';
import { AdminEducationService } from './admin-education.service';
import { AdminEducationController } from './admin-education.controller';
import { AdminEducationRepository } from './repositories/admin-education.repository';
import { PrismaModule } from '../../prisma/prisma.module';
import { JwtModule } from '../jwt/jwt.module';

@Module({
  imports: [PrismaModule, JwtModule],
  controllers: [AdminEducationController],
  providers: [AdminEducationService, AdminEducationRepository],
  exports: [AdminEducationService, AdminEducationRepository],
})
export class AdminEducationModule {}
