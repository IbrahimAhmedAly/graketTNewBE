import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { AdminPurchaseCodeService } from './admin-purchase-code.service';
import { GenerateCodeDto, UpdateCodeDto, QueryCodeDto } from './dto';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';

@Controller('admin/purchase-codes')
@UseGuards(AdminAuthGuard)
export class AdminPurchaseCodeController {
  constructor(
    private readonly adminPurchaseCodeService: AdminPurchaseCodeService,
  ) {}

  /**
   * Generate purchase code(s)
   * POST /admin/purchase-codes
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  generateCode(
    @Request() req: { admin: { id: string } },
    @Body() generateCodeDto: GenerateCodeDto,
  ) {
    return this.adminPurchaseCodeService.generateCode(req.admin.id, generateCodeDto);
  }

  /**
   * Get all purchase codes with filters
   * GET /admin/purchase-codes
   */
  @Get()
  findAll(@Query() query: QueryCodeDto) {
    return this.adminPurchaseCodeService.findAll(query);
  }

  /**
   * Get purchase code statistics
   * GET /admin/purchase-codes/statistics
   */
  @Get('statistics')
  getStatistics() {
    return this.adminPurchaseCodeService.getStatistics();
  }

  /**
   * Get purchase code by ID
   * GET /admin/purchase-codes/:id
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.adminPurchaseCodeService.findOne(id);
  }

  /**
   * Update purchase code
   * PATCH /admin/purchase-codes/:id
   */
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCodeDto: UpdateCodeDto) {
    return this.adminPurchaseCodeService.update(id, updateCodeDto);
  }

  /**
   * Expire purchase code immediately
   * POST /admin/purchase-codes/:id/expire
   */
  @Post(':id/expire')
  expireCode(@Param('id') id: string) {
    return this.adminPurchaseCodeService.expireCode(id);
  }

  /**
   * Delete purchase code
   * DELETE /admin/purchase-codes/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string) {
    return this.adminPurchaseCodeService.remove(id);
  }
}
