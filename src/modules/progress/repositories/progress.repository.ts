import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ProgressRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findProgress(userId: string, contentId: string) {
    return this.prisma.progress.findUnique({
      where: {
        userId_contentId: { userId, contentId },
      },
    });
  }

  async upsertProgress(
    userId: string,
    contentId: string,
    completed: boolean,
  ) {
    return this.prisma.progress.upsert({
      where: {
        userId_contentId: { userId, contentId },
      },
      update: {
        completed,
        completedAt: completed ? new Date() : null,
      },
      create: {
        userId,
        contentId,
        completed,
        completedAt: completed ? new Date() : null,
      },
    });
  }

  async getContentWithCourseInfo(contentId: string) {
    return this.prisma.content.findUnique({
      where: { id: contentId },
      include: {
        section: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
              },
            },
            contents: {
              select: { id: true },
            },
          },
        },
      },
    });
  }

  async getCourseContentIds(courseId: string) {
    const sections = await this.prisma.section.findMany({
      where: { courseId },
      include: {
        contents: {
          select: { id: true },
        },
      },
    });

    return sections.flatMap((section) => section.contents.map((c) => c.id));
  }

  async getUserProgressForCourse(userId: string, courseId: string) {
    const contentIds = await this.getCourseContentIds(courseId);

    return this.prisma.progress.findMany({
      where: {
        userId,
        contentId: { in: contentIds },
      },
    });
  }

  async updateEnrollmentProgress(
    userId: string,
    courseId: string,
    progressPercentage: number,
  ) {
    return this.prisma.enrollment.update({
      where: {
        userId_courseId: { userId, courseId },
      },
      data: {
        progress: progressPercentage,
        status: progressPercentage >= 100 ? 'COMPLETED' : 'ONGOING',
        completedAt: progressPercentage >= 100 ? new Date() : null,
      },
    });
  }

  async getEnrollment(userId: string, courseId: string) {
    return this.prisma.enrollment.findUnique({
      where: {
        userId_courseId: { userId, courseId },
      },
    });
  }
}
