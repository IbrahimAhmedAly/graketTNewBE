import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { AdminContentRepository } from './repositories/admin-content.repository';
import {
  CreateContentDto,
  UpdateContentDto,
  BulkCreateContentsDto,
  BulkUpdateContentsDto,
  BulkDeleteContentsDto,
} from './dto';
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

    const contents =
      items.length === 1
        ? [await this.repository.create(sectionId, items[0])]
        : await this.repository.createMany(sectionId, items);

    // Update course status automatically
    const courseId = contents[0].section.courseId;
    await CourseStatusUtil.updateCourseStatus(this.prisma, courseId);

    return {
      message:
        items.length === 1
          ? 'Content created successfully'
          : `${contents.length} contents created successfully`,
      data: items.length === 1 ? contents[0] : contents,
    };
  }

  async bulkCreate(bulkCreateDto: BulkCreateContentsDto) {
    const { contents } = bulkCreateDto;

    if (contents.length === 0) {
      throw new BadRequestException('Contents array cannot be empty');
    }

    // Extract unique section IDs
    const sectionIds = [...new Set(contents.map((c) => c.sectionId))];

    // Validate all sections exist
    const existingSections =
      await this.repository.findManySectionsByIds(sectionIds);
    if (existingSections.length !== sectionIds.length) {
      const foundIds = existingSections.map((s) => s.id);
      const notFoundIds = sectionIds.filter((id) => !foundIds.includes(id));
      throw new NotFoundException(
        `Sections not found: ${notFoundIds.join(', ')}`,
      );
    }

    // Create contents across sections
    const contentData = contents.map((content) => ({
      sectionId: content.sectionId,
      data: {
        title: content.title,
        type: content.type,
        order: content.order,
        duration: content.duration,
        videoUrl: content.videoUrl,
        pdfUrl: content.pdfUrl,
        fileSize: content.fileSize,
      },
    }));

    const createdContents =
      await this.repository.createManyAcrossSections(contentData);

    // Update affected course statuses
    const courseIds = [...new Set(existingSections.map((s) => s.courseId))];
    await Promise.all(
      courseIds.map((courseId) =>
        CourseStatusUtil.updateCourseStatus(this.prisma, courseId),
      ),
    );

    return {
      message: `${createdContents.length} contents created successfully`,
      data: createdContents,
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

  async bulkUpdate(bulkUpdateDto: BulkUpdateContentsDto) {
    if (!bulkUpdateDto.contents || bulkUpdateDto.contents.length === 0) {
      throw new BadRequestException('Contents array cannot be empty');
    }

    // Verify all contents exist
    const contentIds = bulkUpdateDto.contents.map((c) => c.id);
    const existingContents =
      await this.repository.findManyContentsByIds(contentIds);

    if (existingContents.length !== contentIds.length) {
      const foundIds = existingContents.map((c) => c.id);
      const notFoundIds = contentIds.filter((id) => !foundIds.includes(id));
      throw new NotFoundException(
        `Contents not found: ${notFoundIds.join(', ')}`,
      );
    }

    // Prepare updates
    const updates = bulkUpdateDto.contents.map((content) => ({
      id: content.id,
      data: {
        title: content.title,
        type: content.type,
        order: content.order,
        duration: content.duration,
        videoUrl: content.videoUrl,
        pdfUrl: content.pdfUrl,
        fileSize: content.fileSize,
      },
    }));

    const updatedContents = await this.repository.updateMany(updates);

    // Get affected course IDs and update their statuses
    const courseIds = await this.repository.findCourseIdsByContents(contentIds);
    await Promise.all(
      courseIds.map((courseId) =>
        CourseStatusUtil.updateCourseStatus(this.prisma, courseId),
      ),
    );

    return {
      message: `${updatedContents.length} contents updated successfully`,
      data: updatedContents,
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

  async bulkDelete(bulkDeleteDto: BulkDeleteContentsDto) {
    if (!bulkDeleteDto.contentIds || bulkDeleteDto.contentIds.length === 0) {
      throw new BadRequestException('Content IDs array cannot be empty');
    }

    // Verify all contents exist and get their course IDs
    const existingContents = await this.repository.findManyContentsByIds(
      bulkDeleteDto.contentIds,
    );

    if (existingContents.length !== bulkDeleteDto.contentIds.length) {
      const foundIds = existingContents.map((c) => c.id);
      const notFoundIds = bulkDeleteDto.contentIds.filter(
        (id) => !foundIds.includes(id),
      );
      throw new NotFoundException(
        `Contents not found: ${notFoundIds.join(', ')}`,
      );
    }

    // Get affected course IDs before deletion
    const courseIds = await this.repository.findCourseIdsByContents(
      bulkDeleteDto.contentIds,
    );

    // Delete contents
    const result = await this.repository.deleteMany(bulkDeleteDto.contentIds);

    // Update course statuses
    await Promise.all(
      courseIds.map((courseId) =>
        CourseStatusUtil.updateCourseStatus(this.prisma, courseId),
      ),
    );

    return {
      message: `${result.count} contents deleted successfully`,
      deletedCount: result.count,
    };
  }
}
