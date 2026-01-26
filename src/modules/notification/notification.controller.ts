import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationQueryDto } from './dto/notification.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  /**
   * Get user's notifications
   * GET /notifications?page=1&limit=20&unreadOnly=false
   */
  @Get()
  async getNotifications(
    @Request() req: { user: { id: string } },
    @Query() query: NotificationQueryDto,
  ) {
    return this.notificationService.getNotifications(req.user.id, query);
  }

  /**
   * Get notifications grouped by date (Today, Yesterday, etc.)
   * GET /notifications/grouped?page=1&limit=20
   */
  @Get('grouped')
  async getNotificationsGrouped(
    @Request() req: { user: { id: string } },
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.notificationService.getNotificationsGrouped(
      req.user.id,
      page || 1,
      limit || 20,
    );
  }

  /**
   * Get unread notifications count
   * GET /notifications/unread-count
   */
  @Get('unread-count')
  async getUnreadCount(@Request() req: { user: { id: string } }) {
    return this.notificationService.getUnreadCount(req.user.id);
  }

  /**
   * Mark a notification as read
   * POST /notifications/:id/read
   */
  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  async markAsRead(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.notificationService.markAsRead(req.user.id, id);
  }

  /**
   * Mark all notifications as read
   * POST /notifications/read-all
   */
  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  async markAllAsRead(@Request() req: { user: { id: string } }) {
    return this.notificationService.markAllAsRead(req.user.id);
  }

  /**
   * Delete a notification
   * DELETE /notifications/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteNotification(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.notificationService.deleteNotification(req.user.id, id);
  }

  /**
   * Delete all read notifications
   * DELETE /notifications/read
   */
  @Delete('read')
  @HttpCode(HttpStatus.OK)
  async deleteAllRead(@Request() req: { user: { id: string } }) {
    return this.notificationService.deleteAllRead(req.user.id);
  }
}
