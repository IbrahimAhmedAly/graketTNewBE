import { Injectable } from '@nestjs/common';
import { EnrollmentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class UserCourseRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findUserEnrollments(params: {
    userId: string;
    skip: number;
    take: number;
    status?: EnrollmentStatus;
  }) {
    const { userId, skip, take, status } = params;

    const where: Prisma.EnrollmentWhereInput = {
      userId,
      ...(status && { status }),
    };

    return this.prisma.enrollment.findMany({
      where,
      skip,
      take,
      include: {
        course: {
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
              select: {
                sections: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async countUserEnrollments(userId: string, status?: EnrollmentStatus) {
    return this.prisma.enrollment.count({
      where: {
        userId,
        ...(status && { status }),
      },
    });
  }

  async findOngoingCourses(userId: string, skip: number, take: number) {
    return this.prisma.enrollment.findMany({
      where: {
        userId,
        status: EnrollmentStatus.ONGOING,
      },
      skip,
      take,
      include: {
        course: {
          include: {
            instructor: {
              select: { id: true, name: true, avatar: true },
            },
            category: {
              select: { id: true, name: true },
            },
            sections: {
              include: {
                contents: {
                  select: { id: true },
                },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async countOngoingCourses(userId: string) {
    return this.prisma.enrollment.count({
      where: {
        userId,
        status: EnrollmentStatus.ONGOING,
      },
    });
  }

  async findCompletedCourses(userId: string, skip: number, take: number) {
    return this.prisma.enrollment.findMany({
      where: {
        userId,
        status: EnrollmentStatus.COMPLETED,
      },
      skip,
      take,
      include: {
        course: {
          include: {
            instructor: {
              select: { id: true, name: true, avatar: true },
            },
            category: {
              select: { id: true, name: true },
            },
            reviews: {
              select: { rating: true },
            },
          },
        },
      },
      orderBy: { completedAt: 'desc' },
    });
  }

  async countCompletedCourses(userId: string) {
    return this.prisma.enrollment.count({
      where: {
        userId,
        status: EnrollmentStatus.COMPLETED,
      },
    });
  }

  async findEnrollment(userId: string, courseId: string) {
    return this.prisma.enrollment.findUnique({
      where: {
        userId_courseId: { userId, courseId },
      },
      include: {
        course: {
          include: {
            instructor: true,
            category: true,
            sections: {
              orderBy: { order: 'asc' },
              include: {
                contents: {
                  orderBy: { order: 'asc' },
                },
              },
            },
          },
        },
      },
    });
  }

  /**
   * Lightweight enrollment lookup returning only the row (no course join).
   * Used by wishlist save/unsave where we just need the status + id.
   */
  async findEnrollmentRow(userId: string, courseId: string) {
    return this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      select: { id: true, status: true },
    });
  }

  async findCourseById(courseId: string) {
    return this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, isPublished: true },
    });
  }

  async createSavedEnrollment(userId: string, courseId: string) {
    return this.prisma.enrollment.create({
      data: {
        userId,
        courseId,
        status: EnrollmentStatus.SAVED,
        progress: 0,
      },
    });
  }

  async deleteEnrollmentById(id: string) {
    return this.prisma.enrollment.delete({ where: { id } });
  }

  async getUserContentProgress(userId: string, courseId: string) {
    return this.prisma.progress.findMany({
      where: {
        userId,
        content: {
          section: {
            courseId,
          },
        },
      },
      select: {
        contentId: true,
        completed: true,
        completedAt: true,
      },
    });
  }
}
