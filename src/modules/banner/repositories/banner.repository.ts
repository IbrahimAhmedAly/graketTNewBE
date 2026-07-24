import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class BannerRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns only active banners, newest first.
   */
  async findActive() {
    return this.prisma.banner.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        image: true,
        isActive: true,
        createdAt: true,
      },
    });
  }
}
