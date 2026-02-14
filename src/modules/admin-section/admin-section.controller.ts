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
import { AdminSectionService } from './admin-section.service';
import { CreateSectionDto, UpdateSectionDto, ReorderSectionsDto } from './dto';
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
   * Update section
   * PATCH /admin/sections/:id
   */
  @Patch('sections/:id')
  update(
    @Param('id') id: string,
    @Body() updateSectionDto: UpdateSectionDto,
  ) {
    return this.adminSectionService.update(id, updateSectionDto);
  }

  /**
   * Delete section
   * DELETE /admin/sections/:id
   */
  @Delete('sections/:id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string) {
    return this.adminSectionService.remove(id);
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
