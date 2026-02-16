import { Injectable, NotFoundException } from '@nestjs/common';
import { CourseRepository } from './repositories/course.repository';
import { CourseQueryDto } from './dto/course-query.dto';
import { PaginationUtil } from '../../utils/pagination/pagination.util';
import { PurchaseRepository } from '../purchase/repositories/purchase.repository';

@Injectable()
export class CourseService {
  constructor(
    private readonly courseRepository: CourseRepository,
    private readonly purchaseRepository: PurchaseRepository,
  ) {}

  async findAll(query: CourseQueryDto, userId?: string) {
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

    // Get purchase info if user is authenticated
    const purchaseMap = new Map<
      string,
      {
        isPurchased: boolean;
        purchaseType: 'COURSE' | 'VIDEO';
        purchasedVideosCount?: number;
        totalVideos?: number;
      }
    >();

    if (userId && courses.length > 0) {
      const courseIds = courses.map((c) => c.id);
      const purchases =
        await this.purchaseRepository.findUserPurchasesByCourses(
          userId,
          courseIds,
        );

      // Build purchase info for each course
      const coursePurchases = new Map<string, 'COURSE' | 'VIDEO'>();
      const videoPurchases = new Map<string, Set<string>>(); // courseId -> Set of purchased video IDs

      for (const purchase of purchases) {
        if (purchase.type === 'COURSE' && purchase.courseId) {
          coursePurchases.set(purchase.courseId, 'COURSE');
        } else if (purchase.type === 'VIDEO' && purchase.content) {
          const courseId = purchase.content.section.courseId;
          if (!videoPurchases.has(courseId)) {
            videoPurchases.set(courseId, new Set());
          }
          videoPurchases.get(courseId)!.add(purchase.content.id);
        }
      }

      // Build final purchase map
      for (const course of courses) {
        if (coursePurchases.has(course.id)) {
          purchaseMap.set(course.id, {
            isPurchased: true,
            purchaseType: 'COURSE',
          });
        } else if (videoPurchases.has(course.id)) {
          const totalVideos = course.sections.reduce(
            (sum, section) => sum + section.contents.length,
            0,
          );
          purchaseMap.set(course.id, {
            isPurchased: true,
            purchaseType: 'VIDEO',
            purchasedVideosCount: videoPurchases.get(course.id)!.size,
            totalVideos,
          });
        }
      }
    }

    // Transform courses to include average rating and purchase info
    const transformedCourses = courses.map((course) => {
      const totalReviews = course.reviews.length;
      const averageRating =
        totalReviews > 0
          ? course.reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
          : 0;

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { reviews, sections, ...courseData } = course;
      const purchaseInfo = purchaseMap.get(course.id);

      return {
        ...courseData,
        averageRating: Math.round(averageRating * 10) / 10,
        totalReviews,
        // Include purchase info for authenticated users
        ...(userId && {
          isPurchased: purchaseInfo?.isPurchased ?? false,
          ...(purchaseInfo?.purchaseType && {
            purchaseType: purchaseInfo.purchaseType,
          }),
          ...(purchaseInfo?.purchasedVideosCount !== undefined && {
            purchasedVideosCount: purchaseInfo.purchasedVideosCount,
            totalVideos: purchaseInfo.totalVideos,
          }),
        }),
      };
    });

    return {
      message: 'تم جلب الدورات بنجاح',
      ...PaginationUtil.paginate(transformedCourses, totalItems, {
        page,
        limit,
      }),
    };
  }

  async findById(id: string, userId?: string) {
    const course = await this.courseRepository.findById(id);

    if (!course) {
      throw new NotFoundException('الدورة غير موجودة');
    }

    const totalReviews = course.reviews.length;
    const averageRating =
      totalReviews > 0
        ? course.reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
        : 0;

    // Check purchase access if user is authenticated
    let hasFullCourseAccess = false;
    const purchasedVideoIds = new Set<string>();

    if (userId) {
      const purchases =
        await this.purchaseRepository.findUserPurchasesByCourses(userId, [id]);

      for (const purchase of purchases) {
        if (purchase.type === 'COURSE' && purchase.courseId === id) {
          hasFullCourseAccess = true;
          break;
        } else if (purchase.type === 'VIDEO' && purchase.content) {
          purchasedVideoIds.add(purchase.content.id);
        }
      }
    }

    // Transform sections with access control
    const transformedSections = course.sections.map((section) => ({
      ...section,
      contents: section.contents.map((content) => {
        const hasAccess =
          hasFullCourseAccess || purchasedVideoIds.has(content.id);

        return {
          ...content,
          hasAccess,
          // Only include URLs if user has access
          videoUrl: hasAccess ? content.videoUrl : undefined,
          pdfUrl: hasAccess ? content.pdfUrl : undefined,
        };
      }),
    }));

    return {
      message: 'تم جلب تفاصيل الدورة بنجاح',
      data: {
        ...course,
        sections: transformedSections,
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
