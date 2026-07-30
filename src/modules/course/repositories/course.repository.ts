import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

export interface CourseFilterParams {
  search?: string;
  categoryId?: string;
  instructorId?: string;
  /** Scope to a single education level */
  educationLevelId?: string;
  /**
   * Scope to a single grade. Courses with no grade (aimed at the whole
   * level) are included alongside it when a level is also supplied.
   */
  gradeId?: string;
}

@Injectable()
export class CourseRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Shared where-clause for the public catalogue. Kept in one place so the
   * list and its count can never drift apart.
   */
  private buildWhere(params: CourseFilterParams): Prisma.CourseWhereInput {
    const { search, categoryId, instructorId, educationLevelId, gradeId } =
      params;

    return {
      isPublished: true,
      ...(categoryId && { categoryId }),
      ...(instructorId && { instructorId }),
      ...this.educationWhere({ educationLevelId, gradeId }),
      ...(search && {
        AND: [
          {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
              { category: { name: { contains: search, mode: 'insensitive' } } },
              {
                instructor: {
                  name: { contains: search, mode: 'insensitive' },
                },
              },
            ],
          },
        ],
      }),
    };
  }

  async findAll(
    params: CourseFilterParams & {
      skip: number;
      take: number;
    },
  ) {
    const { skip, take, ...filters } = params;
    const where = this.buildWhere(filters);

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
        educationLevel: {
          select: {
            id: true,
            name: true,
          },
        },
        grade: {
          select: {
            id: true,
            name: true,
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

  async count(params: CourseFilterParams) {
    return this.prisma.course.count({ where: this.buildWhere(params) });
  }

  /** The education targeting the catalogue is scoped to for a given student */
  async findUserEducation(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { educationLevelId: true, gradeId: true },
    });
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
        educationLevel: {
          select: {
            id: true,
            name: true,
          },
        },
        grade: {
          select: {
            id: true,
            name: true,
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

  /**
   * Education scoping as a where-fragment, for the curated lists (popular,
   * recommended) that don't go through buildWhere.
   */
  private educationWhere(
    params: Pick<CourseFilterParams, 'educationLevelId' | 'gradeId'>,
  ): Prisma.CourseWhereInput {
    const { educationLevelId, gradeId } = params;
    if (gradeId && educationLevelId) {
      return { OR: [{ gradeId }, { educationLevelId, gradeId: null }] };
    }
    if (gradeId) return { gradeId };
    if (educationLevelId) return { educationLevelId };
    return {};
  }

  async getRecommended(
    userId: string,
    take: number = 10,
    education: Pick<
      CourseFilterParams,
      'educationLevelId' | 'gradeId'
    > = {},
  ) {
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
        ...this.educationWhere(education),
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
        educationLevel: {
          select: { id: true, name: true },
        },
        grade: {
          select: { id: true, name: true },
        },
        reviews: {
          select: { rating: true },
        },
      },
      take,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPopular(
    take: number = 10,
    education: Pick<
      CourseFilterParams,
      'educationLevelId' | 'gradeId'
    > = {},
  ) {
    return this.prisma.course.findMany({
      where: { isPublished: true, ...this.educationWhere(education) },
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
        educationLevel: {
          select: { id: true, name: true },
        },
        grade: {
          select: { id: true, name: true },
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
