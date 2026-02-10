import { Module } from '@nestjs/common';
import { AdminContentService } from './admin-content.service';
import { AdminContentController } from './admin-content.controller';
import { AdminContentRepository } from './repositories/admin-content.repository';
import { PrismaModule } from '../../prisma/prisma.module';
import { JwtModule } from '../jwt/jwt.module';

@Module({
  imports: [PrismaModule, JwtModule],
  controllers: [AdminContentController],
  providers: [AdminContentService, AdminContentRepository],
  exports: [AdminContentService, AdminContentRepository],
})
export class AdminContentModule {}
