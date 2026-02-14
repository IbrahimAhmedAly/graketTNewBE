import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { AdminNotificationRepository } from './repositories/admin-notification.repository';
import {
  SendNotificationDto,
  QueryNotificationDto,
  NotificationTarget,
} from './dto';
import { PaginationUtil } from '../../utils/pagination/pagination.util';

@Injectable()
export class AdminNotificationService {
  constructor(private readonly repository: AdminNotificationRepository) {}

  async sendNotification(sendNotificationDto: SendNotificationDto) {
    let userIds: string[] = [];

    // Determine target users based on target type
    switch (sendNotificationDto.target) {
      case NotificationTarget.ALL_USERS:
        const allUsers = await this.repository.getAllUsers();
        userIds = allUsers.map((u) => u.id);
        break;

      case NotificationTarget.SPECIFIC_USERS:
        if (
          !sendNotificationDto.userIds ||
          sendNotificationDto.userIds.length === 0
        ) {
          throw new BadRequestException(
            'userIds are required for SPECIFIC_USERS target',
          );
        }
        userIds = sendNotificationDto.userIds;
        break;

      case NotificationTarget.COURSE_ENROLLED:
        if (!sendNotificationDto.courseId) {
          throw new BadRequestException(
            'courseId is required for COURSE_ENROLLED target',
          );
        }

        // Check if course exists
        const courseExists = await this.repository.courseExists(
          sendNotificationDto.courseId,
        );
        if (!courseExists) {
          throw new NotFoundException('Course not found');
        }

        const enrolledUsers = await this.repository.getUsersEnrolledInCourse(
          sendNotificationDto.courseId,
        );
        userIds = enrolledUsers.map((u) => u.id);
        break;

      case NotificationTarget.STATUS_BASED:
        if (!sendNotificationDto.userStatus) {
          throw new BadRequestException(
            'userStatus is required for STATUS_BASED target',
          );
        }
        const statusUsers = await this.repository.getUsersByStatus(
          sendNotificationDto.userStatus,
        );
        userIds = statusUsers.map((u) => u.id);
        break;

      default:
        throw new BadRequestException('Invalid target type');
    }

    if (userIds.length === 0) {
      return {
        message: 'No users found for the specified target',
        data: {
          sentCount: 0,
        },
      };
    }

    // Create notifications for all target users
    await this.repository.createBulkNotifications(userIds, {
      type: sendNotificationDto.type,
      icon: sendNotificationDto.icon,
      title: sendNotificationDto.title,
      description: sendNotificationDto.description,
      data: sendNotificationDto.data,
    });

    return {
      message: `Notification sent successfully to ${userIds.length} user(s)`,
      data: {
        sentCount: userIds.length,
        target: sendNotificationDto.target,
      },
    };
  }

  async findAll(query: QueryNotificationDto) {
    const { page = 1, limit = 10 } = query;
    const params = PaginationUtil.getPaginationParams(page, limit);

    const [notifications, total] = await this.repository.findAll(query);

    const paginatedResult = PaginationUtil.paginate(
      notifications,
      total,
      params,
    );

    return {
      message: 'Notifications retrieved successfully',
      ...paginatedResult,
    };
  }

  async findOne(id: string) {
    const notification = await this.repository.findById(id);

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return {
      message: 'Notification details retrieved successfully',
      data: notification,
    };
  }

  async remove(id: string) {
    // Check if notification exists
    const exists = await this.repository.exists(id);
    if (!exists) {
      throw new NotFoundException('Notification not found');
    }

    await this.repository.delete(id);

    return {
      message: 'Notification deleted successfully',
    };
  }

  async getStatistics() {
    const stats = await this.repository.getStatistics();

    return {
      message: 'Notification statistics retrieved successfully',
      data: stats,
    };
  }
}
