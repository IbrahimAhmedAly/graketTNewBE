import { Module } from '@nestjs/common';
import { AdminSelectListService } from './admin-select-list.service';
import { AdminSelectListController } from './admin-select-list.controller';
import { AdminSelectListRepository } from './repositories/admin-select-list.repository';
import { PrismaModule } from '../../prisma/prisma.module';
import { JwtModule } from '../jwt/jwt.module';

@Module({
  imports: [PrismaModule, JwtModule],
  controllers: [AdminSelectListController],
  providers: [AdminSelectListService, AdminSelectListRepository],
})
export class AdminSelectListModule {}
