import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { AdminSectionRepository } from './repositories/admin-section.repository';
import { CreateSectionDto, UpdateSectionDto, ReorderSectionsDto } from './dto';
import { PrismaService } from '../../prisma/prisma.service';
import { CourseStatusUtil } from '../../utils/course-status';

@Injectable()
export class AdminSectionService {
  constructor(
    private readonly repository: AdminSectionRepository,
    private readonly prisma: PrismaService,
  ) {}

  async create(courseId: string, items: CreateSectionDto[]) {
    // Check if course exists
    const courseExists = await this.repository.courseExists(courseId);
    if (!courseExists) {
      throw new NotFoundException('Course not found');
    }

    const sections = items.length === 1
      ? [await this.repository.create(courseId, items[0])]
      : await this.repository.createMany(courseId, items);

    // Update course status automatically
    await CourseStatusUtil.updateCourseStatus(this.prisma, courseId);

    return {
      message: items.length === 1
        ? 'Section created successfully'
        : `${sections.length} sections created successfully`,
      data: items.length === 1 ? sections[0] : sections,
    };
  }

  async findOne(id: string) {
    const section = await this.repository.findById(id);

    if (!section) {
      throw new NotFoundException('Section not found');
    }

    return {
      message: 'Section details retrieved successfully',
      data: section,
    };
  }

  async update(id: string, updateSectionDto: UpdateSectionDto) {
    // Check if section exists
    const exists = await this.repository.exists(id);
    if (!exists) {
      throw new NotFoundException('Section not found');
    }

    const section = await this.repository.update(id, updateSectionDto);

    return {
      message: 'Section updated successfully',
      data: section,
    };
  }

  async remove(id: string) {
    // Check if section exists
    const section = await this.repository.findById(id);
    if (!section) {
      throw new NotFoundException('Section not found');
    }

    const courseId = section.course.id;
    await this.repository.delete(id);

    // Update course status after deletion
    await CourseStatusUtil.updateCourseStatus(this.prisma, courseId);

    return {
      message: 'Section deleted successfully',
    };
  }

  async reorder(reorderDto: ReorderSectionsDto) {
    if (!reorderDto.sectionIds || reorderDto.sectionIds.length === 0) {
      throw new BadRequestException('Section IDs array cannot be empty');
    }

    const sections = await this.repository.reorderSections(reorderDto.sectionIds);

    return {
      message: 'Sections reordered successfully',
      data: sections,
    };
  }
}
