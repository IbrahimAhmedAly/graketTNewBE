import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { AdminCourseRepository } from './repositories/admin-course.repository';
import { CreateCourseDto, UpdateCourseDto, QueryCourseDto } from './dto';
import { PrismaService } from '../../prisma/prisma.service';
import { CourseStatusUtil } from '../../utils/course-status';
import { PaginationUtil } from '../../utils/pagination/pagination.util';
import { EducationService } from '../education/education.service';

@Injectable()
export class AdminCourseService {
  constructor(
    private readonly repository: AdminCourseRepository,
    private readonly prisma: PrismaService,
    private readonly educationService: EducationService,
  ) {}

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
      throw new BadRequestException(
        'Discount price must be less than regular price',
      );
    }

    await this.educationService.assertValidTargeting(
      createCourseDto.educationLevelId,
      createCourseDto.gradeId,
    );

    const course = await this.repository.create(createCourseDto);

    return {
      message: 'Course created successfully',
      data: course,
    };
  }

  async findAll(query: QueryCourseDto) {
    const { page = 1, limit = 10 } = query;
    const params = PaginationUtil.getPaginationParams(page, limit);

    const [courses, total] = await this.repository.findAll(query);

    const paginatedResult = PaginationUtil.paginate(courses, total, params);

    return {
      message: 'Courses retrieved successfully',
      ...paginatedResult,
    };
  }

  async findOne(id: string) {
    const course = await this.repository.findById(id);

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Extract all questions from course into a separate array
    const questions = this.extractQuestionsFromCourse(course);

    return {
      message: 'Course details retrieved successfully',
      data: {
        ...course,
        questions,
      },
    };
  }

  /**
   * Extract all questions from a course's sections/contents/quizzes
   * into a flat array with contextual information
   */
  private extractQuestionsFromCourse(course: any) {
    const questions: any[] = [];

    if (!course.sections) return questions;

    for (const section of course.sections) {
      if (!section.contents) continue;

      for (const content of section.contents) {
        if (!content.quiz?.questions) continue;

        for (const question of content.quiz.questions) {
          questions.push({
            ...question,
            quizId: content.quiz.id,
            contentId: content.id,
            contentTitle: content.title,
            sectionId: section.id,
            sectionTitle: section.title,
          });
        }
      }
    }

    return questions;
  }

  async update(id: string, updateCourseDto: UpdateCourseDto) {
    // Check if course exists
    const exists = await this.repository.exists(id);
    if (!exists) {
      throw new NotFoundException('Course not found');
    }

    // Check slug uniqueness if updating slug
    if (updateCourseDto.slug) {
      const slugExists = await this.repository.slugExists(
        updateCourseDto.slug,
        id,
      );
      if (slugExists) {
        throw new ConflictException('Course with this slug already exists');
      }
    }

    // Validate discount price
    if (
      updateCourseDto.discountPrice !== undefined &&
      updateCourseDto.price !== undefined
    ) {
      if (updateCourseDto.discountPrice >= updateCourseDto.price) {
        throw new BadRequestException(
          'Discount price must be less than regular price',
        );
      }
    }

    // Validate against the level the course will actually have after the
    // update: the incoming one, or the existing one when it isn't changing.
    if (
      updateCourseDto.educationLevelId !== undefined ||
      updateCourseDto.gradeId !== undefined
    ) {
      const current = await this.prisma.course.findUnique({
        where: { id },
        select: { educationLevelId: true },
      });
      const effectiveLevelId =
        updateCourseDto.educationLevelId ?? current?.educationLevelId ?? undefined;

      await this.educationService.assertValidTargeting(
        effectiveLevelId,
        updateCourseDto.gradeId,
      );
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

  async publish(id: string) {
    // Check if course exists
    const exists = await this.repository.exists(id);
    if (!exists) {
      throw new NotFoundException('Course not found');
    }

    try {
      await CourseStatusUtil.publishCourse(this.prisma, id);
    } catch (error) {
      throw new BadRequestException(error.message);
    }

    return {
      message: 'Course published successfully',
    };
  }

  async unpublish(id: string) {
    // Check if course exists
    const exists = await this.repository.exists(id);
    if (!exists) {
      throw new NotFoundException('Course not found');
    }

    await CourseStatusUtil.unpublishCourse(this.prisma, id);

    return {
      message: 'Course unpublished successfully',
    };
  }

  async canPublish(id: string) {
    // Check if course exists
    const exists = await this.repository.exists(id);
    if (!exists) {
      throw new NotFoundException('Course not found');
    }

    const result = await CourseStatusUtil.canPublish(this.prisma, id);

    return {
      message: result.canPublish
        ? 'Course can be published'
        : 'Course cannot be published',
      data: result,
    };
  }
}
