import { Module } from '@nestjs/common';
import { AdminUserService } from './admin-user.service';
import { AdminUserController } from './admin-user.controller';
import { AdminUserRepository } from './repositories/admin-user.repository';
import { PrismaModule } from '../../prisma/prisma.module';
import { JwtModule } from '../jwt/jwt.module';

@Module({
  imports: [PrismaModule, JwtModule],
  controllers: [AdminUserController],
  providers: [AdminUserService, AdminUserRepository],
  exports: [AdminUserService, AdminUserRepository],
})
export class AdminUserModule {}
