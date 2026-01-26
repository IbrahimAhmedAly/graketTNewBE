import { Injectable, NotFoundException } from '@nestjs/common';
import { UserCourseRepository } from './repositories/user-course.repository';
import { UserCourseQueryDto } from './dto/user-course-query.dto';
import { PaginationUtil } from '../../utils/pagination/pagination.util';
import { EnrollmentStatus } from '@prisma/client';

@Injectable()
export class UserCourseService {
  constructor(private readonly userCourseRepository: UserCourseRepository) {}

  async getMyCourses(userId: string, query: UserCourseQueryDto) {
    const { page = 1, limit = 10, status } = query;
    const skip = PaginationUtil.getSkip(page, limit);

    const [enrollments, totalItems] = await Promise.all([
      this.userCourseRepository.findUserEnrollments({
        userId,
        skip,
        take: limit,
        status,
      }),
      this.userCourseRepository.countUserEnrollments(userId, status),
    ]);

    const transformedEnrollments = enrollments.map((enrollment) => {
      const totalReviews = enrollment.course.reviews.length;
      const averageRating =
        totalReviews > 0
          ? enrollment.course.reviews.reduce((sum, r) => sum + r.rating, 0) /
            totalReviews
          : 0;

      const { reviews, _count, ...courseData } = enrollment.course;
      return {
        id: enrollment.id,
        status: enrollment.status,
        progress: enrollment.progress,
        enrolledAt: enrollment.enrolledAt,
        completedAt: enrollment.completedAt,
        course: {
          ...courseData,
          averageRating: Math.round(averageRating * 10) / 10,
          totalReviews,
          totalSections: _count.sections,
        },
      };
    });

    return {
      message: 'تم جلب دوراتي بنجاح',
      data: PaginationUtil.paginate(transformedEnrollments, totalItems, {
        page,
        limit,
      }),
    };
  }

  async getCourseProgress(userId: string, courseId: string) {
    const enrollment = await this.userCourseRepository.findEnrollment(
      userId,
      courseId,
    );

    if (!enrollment) {
      throw new NotFoundException('لم يتم العثور على التسجيل في هذه الدورة');
    }

    const contentProgress =
      await this.userCourseRepository.getUserContentProgress(userId, courseId);

    const progressMap = new Map(contentProgress.map((p) => [p.contentId, p]));

    // Build sections with progress
    const sectionsWithProgress = enrollment.course.sections.map((section) => ({
      id: section.id,
      title: section.title,
      order: section.order,
      contents: section.contents.map((content) => {
        const progress = progressMap.get(content.id);
        return {
          ...content,
          completed: progress?.completed || false,
          completedAt: progress?.completedAt || null,
        };
      }),
    }));

    const totalContents = enrollment.course.sections.reduce(
      (sum, section) => sum + section.contents.length,
      0,
    );
    const completedContents = contentProgress.filter((p) => p.completed).length;
    const progressPercentage =
      totalContents > 0
        ? Math.round((completedContents / totalContents) * 100)
        : 0;

    return {
      message: 'تم جلب تقدم الدورة بنجاح',
      data: {
        enrollment: {
          id: enrollment.id,
          status: enrollment.status,
          progress: progressPercentage,
          enrolledAt: enrollment.enrolledAt,
          completedAt: enrollment.completedAt,
        },
        course: {
          id: enrollment.course.id,
          title: enrollment.course.title,
          thumbnail: enrollment.course.thumbnail,
          instructor: enrollment.course.instructor,
          category: enrollment.course.category,
        },
        stats: {
          totalContents,
          completedContents,
          progressPercentage,
        },
        sections: sectionsWithProgress,
      },
    };
  }
}
