import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SendNotificationDto, QueryNotificationDto } from '../dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class AdminNotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createNotification(userId: string, data: Omit<SendNotificationDto, 'target' | 'userIds' | 'courseId' | 'userStatus'>) {
    return this.prisma.notification.create({
      data: {
        userId,
        type: data.type,
        icon: data.icon,
        title: data.title,
        description: data.description,
        data: data.data ? JSON.parse(JSON.stringify(data.data)) : null,
      },
    });
  }

  async createBulkNotifications(
    userIds: string[],
    data: Omit<SendNotificationDto, 'target' | 'userIds' | 'courseId' | 'userStatus'>,
  ) {
    const notifications = userIds.map((userId) => ({
      userId,
      type: data.type,
      icon: data.icon,
      title: data.title,
      description: data.description,
      data: data.data ? JSON.parse(JSON.stringify(data.data)) : null,
    }));

    return this.prisma.notification.createMany({
      data: notifications,
    });
  }

  async getAllUsers() {
    return this.prisma.user.findMany({
      select: { id: true },
    });
  }

  async getUsersByStatus(status: string) {
    return this.prisma.user.findMany({
      where: { status: status as any },
      select: { id: true },
    });
  }

  async getUsersEnrolledInCourse(courseId: string) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { courseId },
      select: { userId: true },
      distinct: ['userId'],
    });

    return enrollments.map((e) => ({ id: e.userId }));
  }

  async findAll(query: QueryNotificationDto) {
    const { page = 1, limit = 10, search, type, userId, isRead } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = {};

    // Search by title or description
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Filter by type
    if (type) {
      where.type = type;
    }

    // Filter by user
    if (userId) {
      where.userId = userId;
    }

    // Filter by read status
    if (isRead !== undefined) {
      where.isRead = isRead;
    }

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      notifications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string) {
    return this.prisma.notification.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            status: true,
          },
        },
      },
    });
  }

  async delete(id: string) {
    return this.prisma.notification.delete({
      where: { id },
    });
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.notification.count({
      where: { id },
    });
    return count > 0;
  }

  async courseExists(courseId: string): Promise<boolean> {
    const count = await this.prisma.course.count({
      where: { id: courseId },
    });
    return count > 0;
  }

  async getStatistics() {
    const [total, read, unread, byType] = await Promise.all([
      this.prisma.notification.count(),
      this.prisma.notification.count({ where: { isRead: true } }),
      this.prisma.notification.count({ where: { isRead: false } }),
      this.prisma.notification.groupBy({
        by: ['type'],
        _count: {
          type: true,
        },
      }),
    ]);

    return {
      total,
      read,
      unread,
      byType: byType.reduce((acc, item) => {
        acc[item.type] = item._count.type;
        return acc;
      }, {} as Record<string, number>),
    };
  }
}
