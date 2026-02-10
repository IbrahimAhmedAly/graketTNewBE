import { Module } from '@nestjs/common';
import { AdminSectionService } from './admin-section.service';
import { AdminSectionController } from './admin-section.controller';
import { AdminSectionRepository } from './repositories/admin-section.repository';
import { PrismaModule } from '../../prisma/prisma.module';
import { JwtModule } from '../jwt/jwt.module';

@Module({
  imports: [PrismaModule, JwtModule],
  controllers: [AdminSectionController],
  providers: [AdminSectionService, AdminSectionRepository],
  exports: [AdminSectionService, AdminSectionRepository],
})
export class AdminSectionModule {}
