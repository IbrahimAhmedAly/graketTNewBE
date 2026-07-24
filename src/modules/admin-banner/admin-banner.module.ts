import { Module } from '@nestjs/common';
import { AdminBannerService } from './admin-banner.service';
import { AdminBannerController } from './admin-banner.controller';
import { AdminBannerRepository } from './repositories/admin-banner.repository';
import { PrismaModule } from '../../prisma/prisma.module';
import { JwtModule } from '../jwt/jwt.module';

@Module({
  imports: [PrismaModule, JwtModule],
  controllers: [AdminBannerController],
  providers: [AdminBannerService, AdminBannerRepository],
  exports: [AdminBannerService, AdminBannerRepository],
})
export class AdminBannerModule {}
