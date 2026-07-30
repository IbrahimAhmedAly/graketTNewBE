import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AdminBannerService } from './admin-banner.service';
import { CreateBannerDto, UpdateBannerDto, QueryBannerDto } from './dto';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';

@Controller('admin/banners')
@UseGuards(AdminAuthGuard)
export class AdminBannerController {
  constructor(private readonly adminBannerService: AdminBannerService) {}

  /**
   * Create a banner
   * POST /admin/banners
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createBannerDto: CreateBannerDto) {
    return this.adminBannerService.create(createBannerDto);
  }

  /**
   * Get all banners (active + inactive) with pagination
   * GET /admin/banners
   */
  @Get()
  findAll(@Query() query: QueryBannerDto) {
    return this.adminBannerService.findAll(query);
  }

  /**
   * Get a banner by id
   * GET /admin/banners/:id
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.adminBannerService.findOne(id);
  }

  /**
   * Update a banner
   * PATCH /admin/banners/:id
   */
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateBannerDto: UpdateBannerDto) {
    return this.adminBannerService.update(id, updateBannerDto);
  }

  /**
   * Delete a banner
   * DELETE /admin/banners/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string) {
    return this.adminBannerService.remove(id);
  }
}
