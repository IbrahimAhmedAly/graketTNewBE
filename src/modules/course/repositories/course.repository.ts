import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class CourseRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: {
    skip: number;
    take: number;
    search?: string;
    categoryId?: string;
    instructorId?: string;
  }) {
    const { skip, take, search, categoryId, instructorId } = params;

    const where: Prisma.CourseWhereInput = {
      isPublished: true,
      ...(categoryId && { categoryId }),
      ...(instructorId && { instructorId }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { category: { name: { contains: search, mode: 'insensitive' } } },
          { instructor: { name: { contains: search, mode: 'insensitive' } } },
        ],
      }),
    };

    return this.prisma.course.findMany({
      where,
      skip,
      take,
      include: {
        instructor: {
          select: {
            id: true,
            name: true,
            avatar: true,
            title: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        reviews: {
          select: {
            rating: true,
          },
        },
        sections: {
          select: {
            contents: {
              where: { type: 'VIDEO' },
              select: { id: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async count(params: {
    search?: string;
    categoryId?: string;
    instructorId?: string;
  }) {
    const { search, categoryId, instructorId } = params;

    const where: Prisma.CourseWhereInput = {
      isPublished: true,
      ...(categoryId && { categoryId }),
      ...(instructorId && { instructorId }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { category: { name: { contains: search, mode: 'insensitive' } } },
          { instructor: { name: { contains: search, mode: 'insensitive' } } },
        ],
      }),
    };

    return this.prisma.course.count({ where });
  }

  async findById(id: string) {
    return this.prisma.course.findUnique({
      where: { id },
      include: {
        instructor: {
          select: {
            id: true,
            name: true,
            avatar: true,
            title: true,
            bio: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        sections: {
          orderBy: { order: 'asc' },
          include: {
            contents: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                title: true,
                type: true,
                order: true,
                duration: true,
                videoUrl: true,
                pdfUrl: true,
              },
            },
          },
        },
        reviews: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
  }

  /**
   * Find published courses in the same category as the given one (excluding it).
   * Used by the "Students also bought" carousel.
   */
  async findRelated(params: { courseId: string; take: number }) {
    const { courseId, take } = params;
    const current = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { categoryId: true },
    });
    if (!current) return [];

    return this.prisma.course.findMany({
      where: {
        isPublished: true,
        id: { not: courseId },
        categoryId: current.categoryId,
      },
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        instructor: {
          select: { id: true, name: true, avatar: true, title: true },
        },
        category: { select: { id: true, name: true, slug: true } },
        reviews: { select: { rating: true } },
      },
    });
  }

  /**
   * Returns full paginated reviews for a course (not limited to 10),
   * used by the dedicated "all reviews" endpoint.
   */
  async findReviewsByCourse(params: {
    courseId: string;
    skip: number;
    take: number;
  }) {
    const { courseId, skip, take } = params;
    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { courseId },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.review.count({ where: { courseId } }),
    ]);
    return { reviews, total };
  }

  async getRecommended(userId: string, take: number = 10) {
    // Get user's enrolled course categories
    const userEnrollments = await this.prisma.enrollment.findMany({
      where: { userId },
      include: {
        course: {
          select: { categoryId: true },
        },
      },
    });

    const enrolledCategoryIds = [
      ...new Set(userEnrollments.map((e) => e.course.categoryId)),
    ];
    const enrolledCourseIds = userEnrollments.map((e) => e.courseId);

    // Recommend courses from same categories but not enrolled
    return this.prisma.course.findMany({
      where: {
        isPublished: true,
        id: { notIn: enrolledCourseIds },
        ...(enrolledCategoryIds.length > 0 && {
          categoryId: { in: enrolledCategoryIds },
        }),
      },
      include: {
        instructor: {
          select: {
            id: true,
            name: true,
            avatar: true,
            title: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        reviews: {
          select: { rating: true },
        },
      },
      take,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPopular(take: number = 10) {
    return this.prisma.course.findMany({
      where: { isPublished: true },
      include: {
        instructor: {
          select: {
            id: true,
            name: true,
            avatar: true,
            title: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        reviews: {
          select: { rating: true },
        },
        _count: {
          select: { enrollments: true },
        },
      },
      take,
      orderBy: {
        enrollments: { _count: 'desc' },
      },
    });
  }
}
