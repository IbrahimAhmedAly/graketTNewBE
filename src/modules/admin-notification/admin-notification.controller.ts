import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AdminNotificationService } from './admin-notification.service';
import { SendNotificationDto, QueryNotificationDto } from './dto';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';

@Controller('admin/notifications')
@UseGuards(AdminAuthGuard)
export class AdminNotificationController {
  constructor(
    private readonly adminNotificationService: AdminNotificationService,
  ) {}

  /**
   * Send notification to users
   * POST /admin/notifications/send
   */
  @Post('send')
  @HttpCode(HttpStatus.CREATED)
  send(@Body() sendNotificationDto: SendNotificationDto) {
    return this.adminNotificationService.sendNotification(sendNotificationDto);
  }

  /**
   * Get all notifications with filters
   * GET /admin/notifications
   */
  @Get()
  findAll(@Query() query: QueryNotificationDto) {
    return this.adminNotificationService.findAll(query);
  }

  /**
   * Get notification statistics
   * GET /admin/notifications/statistics
   */
  @Get('statistics')
  getStatistics() {
    return this.adminNotificationService.getStatistics();
  }

  /**
   * Get notification details by ID
   * GET /admin/notifications/:id
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.adminNotificationService.findOne(id);
  }

  /**
   * Delete notification
   * DELETE /admin/notifications/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string) {
    return this.adminNotificationService.remove(id);
  }
}
