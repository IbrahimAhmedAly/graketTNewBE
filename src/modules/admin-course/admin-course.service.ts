import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { AdminCourseRepository } from './repositories/admin-course.repository';
import { CreateCourseDto, UpdateCourseDto, QueryCourseDto } from './dto';

@Injectable()
export class AdminCourseService {
  constructor(private readonly repository: AdminCourseRepository) {}

  async create(createCourseDto: CreateCourseDto) {
    // Check if slug already exists
    const slugExists = await this.repository.slugExists(createCourseDto.slug);
    if (slugExists) {
      throw new ConflictException('Course with this slug already exists');
    }

    // Validate discount price
    if (
      createCourseDto.discountPrice &&
      createCourseDto.price &&
      createCourseDto.discountPrice >= createCourseDto.price
    ) {
      throw new BadRequestException('Discount price must be less than regular price');
    }

    const course = await this.repository.create(createCourseDto);

    return {
      message: 'Course created successfully',
      data: course,
    };
  }

  async findAll(query: QueryCourseDto) {
    const result = await this.repository.findAll(query);

    return {
      message: 'Courses retrieved successfully',
      data: result,
    };
  }

  async findOne(id: string) {
    const course = await this.repository.findById(id);

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    return {
      message: 'Course details retrieved successfully',
      data: course,
    };
  }

  async update(id: string, updateCourseDto: UpdateCourseDto) {
    // Check if course exists
    const exists = await this.repository.exists(id);
    if (!exists) {
      throw new NotFoundException('Course not found');
    }

    // Check slug uniqueness if updating slug
    if (updateCourseDto.slug) {
      const slugExists = await this.repository.slugExists(updateCourseDto.slug, id);
      if (slugExists) {
        throw new ConflictException('Course with this slug already exists');
      }
    }

    // Validate discount price
    if (updateCourseDto.discountPrice !== undefined && updateCourseDto.price !== undefined) {
      if (updateCourseDto.discountPrice >= updateCourseDto.price) {
        throw new BadRequestException('Discount price must be less than regular price');
      }
    }

    const course = await this.repository.update(id, updateCourseDto);

    return {
      message: 'Course updated successfully',
      data: course,
    };
  }

  async remove(id: string) {
    // Check if course exists
    const exists = await this.repository.exists(id);
    if (!exists) {
      throw new NotFoundException('Course not found');
    }

    await this.repository.delete(id);

    return {
      message: 'Course deleted successfully',
    };
  }
}
