import { Module } from '@nestjs/common';
import { BasketController } from './basket.controller';
import { BasketService } from './basket.service';
import { BasketRepository } from './repositories/basket.repository';
import { JwtModule } from '../jwt/jwt.module';

@Module({
  imports: [JwtModule],
  controllers: [BasketController],
  providers: [BasketService, BasketRepository],
  exports: [BasketService],
})
export class BasketModule {}
