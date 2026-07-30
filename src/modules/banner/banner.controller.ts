import { Controller, Get } from '@nestjs/common';
import { BannerService } from './banner.service';

/**
 * Public banner controller — serves active home-screen banners to the app.
 * No auth: banners are public marketing images.
 */
@Controller('banners')
export class BannerController {
  constructor(private readonly bannerService: BannerService) {}

  /**
   * Get active banners (newest first)
   * GET /banners
   */
  @Get()
  findActive() {
    return this.bannerService.findActive();
  }
}
