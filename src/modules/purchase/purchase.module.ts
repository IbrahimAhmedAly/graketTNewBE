import { Module } from '@nestjs/common';
import { PurchaseController } from './purchase.controller';
import { PurchaseService } from './purchase.service';
import { PurchaseRepository } from './repositories/purchase.repository';
import { JwtModule } from '../jwt/jwt.module';

@Module({
  imports: [JwtModule],
  controllers: [PurchaseController],
  providers: [PurchaseService, PurchaseRepository],
  exports: [PurchaseService, PurchaseRepository],
})
export class PurchaseModule {}
