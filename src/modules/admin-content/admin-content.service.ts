import { Injectable, NotFoundException } from '@nestjs/common';
import { AdminContentRepository } from './repositories/admin-content.repository';
import { CreateContentDto, UpdateContentDto } from './dto';

@Injectable()
export class AdminContentService {
  constructor(private readonly repository: AdminContentRepository) {}

  async create(sectionId: string, createContentDto: CreateContentDto) {
    // Check if section exists
    const sectionExists = await this.repository.sectionExists(sectionId);
    if (!sectionExists) {
      throw new NotFoundException('Section not found');
    }

    const content = await this.repository.create(sectionId, createContentDto);

    return {
      message: 'Content created successfully',
      data: content,
    };
  }

  async findOne(id: string) {
    const content = await this.repository.findById(id);

    if (!content) {
      throw new NotFoundException('Content not found');
    }

    return {
      message: 'Content details retrieved successfully',
      data: content,
    };
  }

  async update(id: string, updateContentDto: UpdateContentDto) {
    // Check if content exists
    const exists = await this.repository.exists(id);
    if (!exists) {
      throw new NotFoundException('Content not found');
    }

    const content = await this.repository.update(id, updateContentDto);

    return {
      message: 'Content updated successfully',
      data: content,
    };
  }

  async remove(id: string) {
    // Check if content exists
    const exists = await this.repository.exists(id);
    if (!exists) {
      throw new NotFoundException('Content not found');
    }

    await this.repository.delete(id);

    return {
      message: 'Content deleted successfully',
    };
  }
}
