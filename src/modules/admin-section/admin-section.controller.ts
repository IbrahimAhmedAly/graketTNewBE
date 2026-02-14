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
import { AdminSectionService } from './admin-section.service';
import {
  CreateSectionDto,
  UpdateSectionDto,
  ReorderSectionsDto,
  BulkUpdateSectionsDto,
  BulkDeleteSectionsDto,
} from './dto';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';
import { ArrayOrSinglePipe } from '../../common/pipes/array-or-single.pipe';

@Controller('admin')
@UseGuards(AdminAuthGuard)
export class AdminSectionController {
  constructor(private readonly adminSectionService: AdminSectionService) {}

  /**
   * Create section(s) in a course
   * POST /admin/courses/:courseId/sections
   * Accepts a single object or an array of objects
   */
  @Post('courses/:courseId/sections')
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('courseId') courseId: string,
    @Body(new ArrayOrSinglePipe(CreateSectionDto)) items: CreateSectionDto[],
  ) {
    return this.adminSectionService.create(courseId, items);
  }

  /**
   * Get section details by ID
   * GET /admin/sections/:id
   */
  @Get('sections/:id')
  findOne(@Param('id') id: string) {
    return this.adminSectionService.findOne(id);
  }

  /**
   * Update section(s)
   * PATCH /admin/sections/:id - Update single section
   * PATCH /admin/sections - Bulk update sections
   */
  @Patch('sections/:id?')
  update(
    @Param('id') id: string | undefined,
    @Body() updateDto: UpdateSectionDto | BulkUpdateSectionsDto,
  ) {
    // If ID is provided, it's a single update
    if (id) {
      return this.adminSectionService.update(id, updateDto as UpdateSectionDto);
    }

    // If no ID but body has 'sections' array, it's bulk update
    if ('sections' in updateDto) {
      return this.adminSectionService.bulkUpdate(
        updateDto as BulkUpdateSectionsDto,
      );
    }

    throw new HttpException(
      'Invalid request: Provide either section ID or sections array',
      HttpStatus.BAD_REQUEST,
    );
  }

  /**
   * Delete section(s)
   * DELETE /admin/sections/:id - Delete single section
   * DELETE /admin/sections - Bulk delete sections
   */
  @Delete('sections/:id?')
  @HttpCode(HttpStatus.OK)
  remove(
    @Param('id') id: string | undefined,
    @Body() deleteDto?: BulkDeleteSectionsDto,
  ) {
    // If ID is provided, it's a single delete
    if (id) {
      return this.adminSectionService.remove(id);
    }

    // If no ID but body has 'sectionIds' array, it's bulk delete
    if (deleteDto && 'sectionIds' in deleteDto) {
      return this.adminSectionService.bulkDelete(deleteDto);
    }

    throw new HttpException(
      'Invalid request: Provide either section ID or sectionIds array',
      HttpStatus.BAD_REQUEST,
    );
  }

  /**
   * Reorder sections
   * PATCH /admin/sections/reorder
   */
  @Patch('sections/reorder')
  reorder(@Body() reorderDto: ReorderSectionsDto) {
    return this.adminSectionService.reorder(reorderDto);
  }
}
