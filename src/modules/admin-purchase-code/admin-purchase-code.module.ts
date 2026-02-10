import { Module } from '@nestjs/common';
import { AdminPurchaseCodeService } from './admin-purchase-code.service';
import { AdminPurchaseCodeController } from './admin-purchase-code.controller';
import { AdminPurchaseCodeRepository } from './repositories/admin-purchase-code.repository';
import { PrismaModule } from '../../prisma/prisma.module';
import { JwtModule } from '../jwt/jwt.module';

@Module({
  imports: [PrismaModule, JwtModule],
  controllers: [AdminPurchaseCodeController],
  providers: [AdminPurchaseCodeService, AdminPurchaseCodeRepository],
  exports: [AdminPurchaseCodeService, AdminPurchaseCodeRepository],
})
export class AdminPurchaseCodeModule {}
