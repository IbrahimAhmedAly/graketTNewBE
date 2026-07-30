import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateBannerDto, UpdateBannerDto, QueryBannerDto } from '../dto';

@Injectable()
export class AdminBannerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateBannerDto) {
    return this.prisma.banner.create({
      data: {
        image: data.image,
        isActive: data.isActive ?? true,
      },
    });
  }

  async findAll(query: QueryBannerDto) {
    const { page = 1, limit = 10, isActive } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.BannerWhereInput = {};
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    return Promise.all([
      this.prisma.banner.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.banner.count({ where }),
    ]);
  }

  async findById(id: string) {
    return this.prisma.banner.findUnique({ where: { id } });
  }

  async update(id: string, data: UpdateBannerDto) {
    return this.prisma.banner.update({
      where: { id },
      data: {
        ...(data.image !== undefined && { image: data.image }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
  }

  async delete(id: string) {
    return this.prisma.banner.delete({ where: { id } });
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.banner.count({ where: { id } });
    return count > 0;
  }
}
