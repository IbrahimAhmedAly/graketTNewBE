import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationType, Prisma } from '@prisma/client';

@Injectable()
export class NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(params: {
    userId: string;
    skip: number;
    take: number;
    unreadOnly?: boolean;
  }) {
    const { userId, skip, take, unreadOnly } = params;

    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(unreadOnly && { isRead: false }),
    };

    return this.prisma.notification.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
  }

  async count(userId: string, unreadOnly?: boolean) {
    return this.prisma.notification.count({
      where: {
        userId,
        ...(unreadOnly && { isRead: false }),
      },
    });
  }

  async findById(id: string) {
    return this.prisma.notification.findUnique({
      where: { id },
    });
  }

  async markAsRead(id: string) {
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async create(data: {
    userId: string;
    type: NotificationType;
    icon?: string;
    title: string;
    description?: string;
    data?: Prisma.JsonValue;
  }) {
    return this.prisma.notification.create({
      data,
    });
  }

  async delete(id: string) {
    return this.prisma.notification.delete({
      where: { id },
    });
  }

  async deleteAllRead(userId: string) {
    return this.prisma.notification.deleteMany({
      where: { userId, isRead: true },
    });
  }

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  // Group notifications by date for display
  async findGroupedByDate(userId: string, skip: number, take: number) {
    const notifications = await this.prisma.notification.findMany({
      where: { userId },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });

    // Group by date
    const grouped = notifications.reduce(
      (acc, notification) => {
        const date = notification.createdAt.toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = [];
        }
        acc[date].push(notification);
        return acc;
      },
      {} as Record<string, typeof notifications>,
    );

    return grouped;
  }
}
