import { Module } from '@nestjs/common';
import { AdminNotificationService } from './admin-notification.service';
import { AdminNotificationController } from './admin-notification.controller';
import { AdminNotificationRepository } from './repositories/admin-notification.repository';
import { PrismaModule } from '../../prisma/prisma.module';
import { JwtModule } from '../jwt/jwt.module';

@Module({
  imports: [PrismaModule, JwtModule],
  controllers: [AdminNotificationController],
  providers: [AdminNotificationService, AdminNotificationRepository],
  exports: [AdminNotificationService, AdminNotificationRepository],
})
export class AdminNotificationModule {}
