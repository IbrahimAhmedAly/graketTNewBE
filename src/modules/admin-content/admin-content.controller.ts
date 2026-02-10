import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AdminContentService } from './admin-content.service';
import { CreateContentDto, UpdateContentDto } from './dto';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';

@Controller('admin')
@UseGuards(AdminAuthGuard)
export class AdminContentController {
  constructor(private readonly adminContentService: AdminContentService) {}

  /**
   * Create content in a section
   * POST /admin/sections/:sectionId/content
   */
  @Post('sections/:sectionId/content')
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('sectionId') sectionId: string,
    @Body() createContentDto: CreateContentDto,
  ) {
    return this.adminContentService.create(sectionId, createContentDto);
  }

  /**
   * Get content details by ID
   * GET /admin/content/:id
   */
  @Get('content/:id')
  findOne(@Param('id') id: string) {
    return this.adminContentService.findOne(id);
  }

  /**
   * Update content
   * PATCH /admin/content/:id
   */
  @Patch('content/:id')
  update(
    @Param('id') id: string,
    @Body() updateContentDto: UpdateContentDto,
  ) {
    return this.adminContentService.update(id, updateContentDto);
  }

  /**
   * Delete content
   * DELETE /admin/content/:id
   */
  @Delete('content/:id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string) {
    return this.adminContentService.remove(id);
  }
}
