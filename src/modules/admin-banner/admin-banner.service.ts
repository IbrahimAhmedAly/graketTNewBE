import { Injectable, NotFoundException } from '@nestjs/common';
import { AdminBannerRepository } from './repositories/admin-banner.repository';
import { CreateBannerDto, UpdateBannerDto, QueryBannerDto } from './dto';
import { PaginationUtil } from '../../utils/pagination/pagination.util';

@Injectable()
export class AdminBannerService {
  constructor(private readonly repository: AdminBannerRepository) {}

  async create(dto: CreateBannerDto) {
    const banner = await this.repository.create(dto);
    return {
      message: 'Banner created successfully',
      data: banner,
    };
  }

  async findAll(query: QueryBannerDto) {
    const { page = 1, limit = 10 } = query;
    const params = PaginationUtil.getPaginationParams(page, limit);

    const [banners, total] = await this.repository.findAll(query);
    const paginatedResult = PaginationUtil.paginate(banners, total, params);

    return {
      message: 'Banners retrieved successfully',
      ...paginatedResult,
    };
  }

  async findOne(id: string) {
    const banner = await this.repository.findById(id);
    if (!banner) {
      throw new NotFoundException('Banner not found');
    }
    return {
      message: 'Banner details retrieved successfully',
      data: banner,
    };
  }

  async update(id: string, dto: UpdateBannerDto) {
    const exists = await this.repository.exists(id);
    if (!exists) {
      throw new NotFoundException('Banner not found');
    }

    const banner = await this.repository.update(id, dto);
    return {
      message: 'Banner updated successfully',
      data: banner,
    };
  }

  async remove(id: string) {
    const exists = await this.repository.exists(id);
    if (!exists) {
      throw new NotFoundException('Banner not found');
    }

    await this.repository.delete(id);
    return {
      message: 'Banner deleted successfully',
    };
  }
}
