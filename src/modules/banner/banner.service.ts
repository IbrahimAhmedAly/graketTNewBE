import { Injectable } from '@nestjs/common';
import { BannerRepository } from './repositories/banner.repository';

@Injectable()
export class BannerService {
  constructor(private readonly repository: BannerRepository) {}

  async findActive() {
    const banners = await this.repository.findActive();
    return {
      message: 'تم جلب البانرات بنجاح',
      data: banners,
    };
  }
}
