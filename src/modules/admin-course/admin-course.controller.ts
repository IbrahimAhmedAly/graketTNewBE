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
}
