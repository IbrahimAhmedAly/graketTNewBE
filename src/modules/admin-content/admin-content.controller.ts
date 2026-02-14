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
  HttpException,
} from '@nestjs/common';
import { AdminContentService } from './admin-content.service';
import {
  UpdateContentDto,
  BulkCreateContentsDto,
  BulkUpdateContentsDto,
  BulkDeleteContentsDto,
} from './dto';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';

@Controller('admin')
@UseGuards(AdminAuthGuard)
export class AdminContentController {
  constructor(private readonly adminContentService: AdminContentService) {}

  /**
   * Create content(s) across sections
   * POST /admin/content/bulk
   * Body: { contents: [{ sectionId, title, type, ... }] } - for bulk
   * Body: { contents: [{ sectionId, title, type, ... }] } - for single (array with one item)
   */
  @Post('content/bulk')
  @HttpCode(HttpStatus.CREATED)
  bulkCreate(@Body() bulkCreateDto: BulkCreateContentsDto) {
    return this.adminContentService.bulkCreate(bulkCreateDto);
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
   * Update content(s)
   * PATCH /admin/content/:id - Update single content
   * PATCH /admin/content - Bulk update contents
   */
  @Patch('content/:id?')
  update(
    @Param('id') id: string | undefined,
    @Body() updateDto: UpdateContentDto | BulkUpdateContentsDto,
  ) {
    // If ID is provided, it's a single update
    if (id) {
      return this.adminContentService.update(id, updateDto as UpdateContentDto);
    }

    // If no ID but body has 'contents' array, it's bulk update
    if ('contents' in updateDto) {
      return this.adminContentService.bulkUpdate(
        updateDto as BulkUpdateContentsDto,
      );
    }

    throw new HttpException(
      'Invalid request: Provide either content ID or contents array',
      HttpStatus.BAD_REQUEST,
    );
  }

  /**
   * Delete content(s)
   * DELETE /admin/content/:id - Delete single content
   * DELETE /admin/content - Bulk delete contents
   */
  @Delete('content/:id?')
  @HttpCode(HttpStatus.OK)
  remove(
    @Param('id') id: string | undefined,
    @Body() deleteDto?: BulkDeleteContentsDto,
  ) {
    // If ID is provided, it's a single delete
    if (id) {
      return this.adminContentService.remove(id);
    }

    // If no ID but body has 'contentIds' array, it's bulk delete
    if (deleteDto && 'contentIds' in deleteDto) {
      return this.adminContentService.bulkDelete(deleteDto);
    }

    throw new HttpException(
      'Invalid request: Provide either content ID or contentIds array',
      HttpStatus.BAD_REQUEST,
    );
  }
}
