import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { NotificationRepository } from './repositories/notification.repository';
import { NotificationQueryDto } from './dto/notification.dto';
import { PaginationUtil } from '../../utils/pagination/pagination.util';
import { NotificationType } from '@prisma/client';

@Injectable()
export class NotificationService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
  ) {}

  async getNotifications(userId: string, query: NotificationQueryDto) {
    const { page = 1, limit = 20, unreadOnly = false } = query;
    const skip = PaginationUtil.getSkip(page, limit);

    const [notifications, totalItems] = await Promise.all([
      this.notificationRepository.findByUserId({
        userId,
        skip,
        take: limit,
        unreadOnly,
      }),
      this.notificationRepository.count(userId, unreadOnly),
    ]);

    // Get unread count
    const unreadCount = await this.notificationRepository.getUnreadCount(userId);

    return {
      message: 'تم جلب الإشعارات بنجاح',
      data: {
        ...PaginationUtil.paginate(notifications, totalItems, { page, limit }),
        unreadCount,
      },
    };
  }

  async getNotificationsGrouped(userId: string, page: number = 1, limit: number = 20) {
    const skip = PaginationUtil.getSkip(page, limit);
    const [grouped, totalItems, unreadCount] = await Promise.all([
      this.notificationRepository.findGroupedByDate(userId, skip, limit),
      this.notificationRepository.count(userId),
      this.notificationRepository.getUnreadCount(userId),
    ]);

    // Convert to array format with date labels
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    const groupedArray = Object.entries(grouped).map(([date, items]) => {
      let label: string;
      if (date === today) {
        label = 'اليوم';
      } else if (date === yesterday) {
        label = 'أمس';
      } else {
        label = new Date(date).toLocaleDateString('ar-EG', {
          day: 'numeric',
          month: 'long',
        });
      }

      return { date, label, items };
    });

    return {
      message: 'تم جلب الإشعارات بنجاح',
      data: {
        groups: groupedArray,
        unreadCount,
        metadata: {
          currentPage: page,
          itemsPerPage: limit,
          totalItems,
          totalPages: Math.ceil(totalItems / limit),
        },
      },
    };
  }

  async markAsRead(userId: string, notificationId: string) {
    const notification =
      await this.notificationRepository.findById(notificationId);

    if (!notification) {
      throw new NotFoundException('الإشعار غير موجود');
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException('لا يمكنك الوصول إلى هذا الإشعار');
    }

    await this.notificationRepository.markAsRead(notificationId);

    return {
      message: 'تم تحديث حالة الإشعار',
    };
  }

  async markAllAsRead(userId: string) {
    await this.notificationRepository.markAllAsRead(userId);

    return {
      message: 'تم تحديث جميع الإشعارات كمقروءة',
    };
  }

  async getUnreadCount(userId: string) {
    const count = await this.notificationRepository.getUnreadCount(userId);

    return {
      message: 'تم جلب عدد الإشعارات غير المقروءة',
      data: { count },
    };
  }

  async deleteNotification(userId: string, notificationId: string) {
    const notification =
      await this.notificationRepository.findById(notificationId);

    if (!notification) {
      throw new NotFoundException('الإشعار غير موجود');
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException('لا يمكنك حذف هذا الإشعار');
    }

    await this.notificationRepository.delete(notificationId);

    return {
      message: 'تم حذف الإشعار بنجاح',
    };
  }

  async deleteAllRead(userId: string) {
    await this.notificationRepository.deleteAllRead(userId);

    return {
      message: 'تم حذف جميع الإشعارات المقروءة',
    };
  }

  // Helper method to create notifications (used by other services)
  async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    description?: string,
    icon?: string,
    data?: object,
  ) {
    return this.notificationRepository.create({
      userId,
      type,
      title,
      description,
      icon,
      data,
    });
  }
}
