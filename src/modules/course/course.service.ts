import { Injectable, NotFoundException } from '@nestjs/common';
import { CourseRepository } from './repositories/course.repository';
import { CourseQueryDto } from './dto/course-query.dto';
import { PaginationUtil } from '../../utils/pagination/pagination.util';

@Injectable()
export class CourseService {
  constructor(private readonly courseRepository: CourseRepository) {}

  async findAll(query: CourseQueryDto) {
    const { page = 1, limit = 10, search, categoryId, instructorId } = query;
    const skip = PaginationUtil.getSkip(page, limit);

    const [courses, totalItems] = await Promise.all([
      this.courseRepository.findAll({
        skip,
        take: limit,
        search,
        categoryId,
        instructorId,
      }),
      this.courseRepository.count({ search, categoryId, instructorId }),
    ]);

    // Transform courses to include average rating
    const transformedCourses = courses.map((course) => {
      const totalReviews = course.reviews.length;
      const averageRating =
        totalReviews > 0
          ? course.reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
          : 0;

      const { reviews, ...courseData } = course;
      return {
        ...courseData,
        averageRating: Math.round(averageRating * 10) / 10,
        totalReviews,
      };
    });

    return {
      message: 'تم جلب الدورات بنجاح',
      data: PaginationUtil.paginate(transformedCourses, totalItems, {
        page,
        limit,
      }),
    };
  }

  async findById(id: string) {
    const course = await this.courseRepository.findById(id);

    if (!course) {
      throw new NotFoundException('الدورة غير موجودة');
    }

    const totalReviews = course.reviews.length;
    const averageRating =
      totalReviews > 0
        ? course.reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
        : 0;

    return {
      message: 'تم جلب تفاصيل الدورة بنجاح',
      data: {
        ...course,
        averageRating: Math.round(averageRating * 10) / 10,
        totalReviews,
      },
    };
  }

  async getRecommended(userId: string, limit: number = 10) {
    const courses = await this.courseRepository.getRecommended(userId, limit);

    // If no recommendations based on categories, get popular courses
    if (courses.length === 0) {
      return this.getPopular(limit);
    }

    const transformedCourses = courses.map((course) => {
      const totalReviews = course.reviews.length;
      const averageRating =
        totalReviews > 0
          ? course.reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
          : 0;

      const { reviews, ...courseData } = course;
      return {
        ...courseData,
        averageRating: Math.round(averageRating * 10) / 10,
        totalReviews,
      };
    });

    return {
      message: 'تم جلب الدورات الموصى بها بنجاح',
      data: transformedCourses,
    };
  }

  async getPopular(limit: number = 10) {
    const courses = await this.courseRepository.getPopular(limit);

    const transformedCourses = courses.map((course) => {
      const totalReviews = course.reviews.length;
      const averageRating =
        totalReviews > 0
          ? course.reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
          : 0;

      const { reviews, _count, ...courseData } = course;
      return {
        ...courseData,
        averageRating: Math.round(averageRating * 10) / 10,
        totalReviews,
        totalEnrollments: _count.enrollments,
      };
    });

    return {
      message: 'تم جلب الدورات الأكثر شعبية بنجاح',
      data: transformedCourses,
    };
  }
}
