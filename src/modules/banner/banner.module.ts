import { Module } from '@nestjs/common';
import { BannerController } from './banner.controller';
import { BannerService } from './banner.service';
import { BannerRepository } from './repositories/banner.repository';

@Module({
  controllers: [BannerController],
  providers: [BannerService, BannerRepository],
  exports: [BannerService, BannerRepository],
})
export class BannerModule {}
