import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PurchaseService } from './purchase.service';
import { RedeemCodeDto } from './dto/purchase.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PurchaseType } from '@prisma/client';

@Controller('purchase')
@UseGuards(JwtAuthGuard)
export class PurchaseController {
  constructor(private readonly purchaseService: PurchaseService) {}

  /**
   * Redeem a purchase code
   * POST /purchase/redeem
   */
  @Post('redeem')
  @HttpCode(HttpStatus.CREATED)
  async redeemCode(
    @Request() req: { user: { id: string } },
    @Body() dto: RedeemCodeDto,
  ) {
    return this.purchaseService.redeemCode(req.user.id, dto.code);
  }

  /**
   * Verify a purchase code (check if valid without redeeming)
   * POST /purchase/verify
   */
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verifyCode(@Body() dto: RedeemCodeDto) {
    return this.purchaseService.verifyCode(dto.code);
  }

  /**
   * Get user's purchases
   * GET /purchase?type=COURSE|VIDEO
   */
  @Get()
  async getUserPurchases(
    @Request() req: { user: { id: string } },
    @Query('type') type?: PurchaseType,
  ) {
    return this.purchaseService.getUserPurchases(req.user.id, type);
  }
}
