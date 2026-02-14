import { Injectable, NotFoundException } from '@nestjs/common';
import { AdminContentRepository } from './repositories/admin-content.repository';
import { CreateContentDto, UpdateContentDto } from './dto';
import { PrismaService } from '../../prisma/prisma.service';
import { CourseStatusUtil } from '../../utils/course-status';

@Injectable()
export class AdminContentService {
  constructor(
    private readonly repository: AdminContentRepository,
    private readonly prisma: PrismaService,
  ) {}

  async create(sectionId: string, items: CreateContentDto[]) {
    // Check if section exists
    const sectionExists = await this.repository.sectionExists(sectionId);
    if (!sectionExists) {
      throw new NotFoundException('Section not found');
    }

    const contents = items.length === 1
      ? [await this.repository.create(sectionId, items[0])]
      : await this.repository.createMany(sectionId, items);

    // Update course status automatically
    const courseId = contents[0].section.courseId;
    await CourseStatusUtil.updateCourseStatus(this.prisma, courseId);

    return {
      message: items.length === 1
        ? 'Content created successfully'
        : `${contents.length} contents created successfully`,
      data: items.length === 1 ? contents[0] : contents,
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
    const content = await this.repository.findById(id);
    if (!content) {
      throw new NotFoundException('Content not found');
    }

    const courseId = content.section.course.id;
    await this.repository.delete(id);

    // Update course status after deletion
    await CourseStatusUtil.updateCourseStatus(this.prisma, courseId);

    return {
      message: 'Content deleted successfully',
    };
  }
}
