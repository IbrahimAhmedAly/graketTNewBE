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
} from '@nestjs/common';
import { AdminCourseService } from './admin-course.service';
import { CreateCourseDto, UpdateCourseDto, QueryCourseDto } from './dto';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';

@Controller('admin/courses')
@UseGuards(AdminAuthGuard)
export class AdminCourseController {
  constructor(private readonly adminCourseService: AdminCourseService) {}

  /**
   * Create a new course
   * POST /admin/courses
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createCourseDto: CreateCourseDto) {
    return this.adminCourseService.create(createCourseDto);
  }

  /**
   * Get all courses with filters and pagination
   * GET /admin/courses
   */
  @Get()
  findAll(@Query() query: QueryCourseDto) {
    return this.adminCourseService.findAll(query);
  }

  /**
   * Check if course can be published
   * GET /admin/courses/:id/can-publish
   */
  @Get(':id/can-publish')
  canPublish(@Param('id') id: string) {
    return this.adminCourseService.canPublish(id);
  }

  /**
   * Get course details by ID
   * GET /admin/courses/:id
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.adminCourseService.findOne(id);
  }

  /**
   * Update course
   * PATCH /admin/courses/:id
   */
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCourseDto: UpdateCourseDto) {
    return this.adminCourseService.update(id, updateCourseDto);
  }

  /**
   * Delete course
   * DELETE /admin/courses/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string) {
    return this.adminCourseService.remove(id);
  }

  /**
   * Publish course
   * POST /admin/courses/:id/publish
   */
  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  publish(@Param('id') id: string) {
    return this.adminCourseService.publish(id);
  }

  /**
   * Unpublish course
   * POST /admin/courses/:id/unpublish
   */
  @Post(':id/unpublish')
  @HttpCode(HttpStatus.OK)
  unpublish(@Param('id') id: string) {
    return this.adminCourseService.unpublish(id);
  }
}
