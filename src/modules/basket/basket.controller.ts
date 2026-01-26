import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BasketService } from './basket.service';
import { AddToBasketDto } from './dto/basket.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('basket')
@UseGuards(JwtAuthGuard)
export class BasketController {
  constructor(private readonly basketService: BasketService) {}

  /**
   * Get user's basket
   * GET /basket
   */
  @Get()
  async getBasket(@Request() req: { user: { id: string } }) {
    return this.basketService.getBasket(req.user.id);
  }

  /**
   * Get basket item count
   * GET /basket/count
   */
  @Get('count')
  async getBasketCount(@Request() req: { user: { id: string } }) {
    return this.basketService.getBasketCount(req.user.id);
  }

  /**
   * Add course to basket
   * POST /basket
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async addToBasket(
    @Request() req: { user: { id: string } },
    @Body() dto: AddToBasketDto,
  ) {
    return this.basketService.addToBasket(req.user.id, dto.courseId);
  }

  /**
   * Remove course from basket
   * DELETE /basket/:courseId
   */
  @Delete(':courseId')
  @HttpCode(HttpStatus.OK)
  async removeFromBasket(
    @Request() req: { user: { id: string } },
    @Param('courseId') courseId: string,
  ) {
    return this.basketService.removeFromBasket(req.user.id, courseId);
  }

  /**
   * Clear entire basket
   * DELETE /basket
   */
  @Delete()
  @HttpCode(HttpStatus.OK)
  async clearBasket(@Request() req: { user: { id: string } }) {
    return this.basketService.clearBasket(req.user.id);
  }
}
