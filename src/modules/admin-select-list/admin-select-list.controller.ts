import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminSelectListService } from './admin-select-list.service';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';

@Controller('admin/select-list')
@UseGuards(AdminAuthGuard)
export class AdminSelectListController {
  constructor(
    private readonly adminSelectListService: AdminSelectListService,
  ) {}

  /**
   * Get all instructors (id + name)
   * GET /admin/select-list/instructors
   */
  @Get('instructors')
  getInstructors() {
    return this.adminSelectListService.getInstructors();
  }

  /**
   * Get all categories (id + name)
   * GET /admin/select-list/categories
   */
  @Get('categories')
  getCategories() {
    return this.adminSelectListService.getCategories();
  }

  /**
   * Get all courses (id + title)
   * GET /admin/select-list/courses
   */
  @Get('courses')
  getCourses() {
    return this.adminSelectListService.getCourses();
  }
}
