import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CourseService } from './course.service';
import { CourseQueryDto } from './dto/course-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('course')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  /**
   * Get all published courses with filters
   * GET /course?page=1&limit=10&search=web&categoryId=xxx
   */
  @Get()
  async findAll(@Query() query: CourseQueryDto) {
    return this.courseService.findAll(query);
  }

  /**
   * Get popular courses
   * GET /course/popular
   */
  @Get('popular')
  async getPopular(@Query('limit') limit?: number) {
    return this.courseService.getPopular(limit || 10);
  }

  /**
   * Get recommended courses for authenticated user
   * GET /course/recommended
   */
  @Get('recommended')
  @UseGuards(JwtAuthGuard)
  async getRecommended(
    @Request() req: { user: { id: string } },
    @Query('limit') limit?: number,
  ) {
    return this.courseService.getRecommended(req.user.id, limit || 10);
  }

  /**
   * Get course by slug
   * GET /course/slug/:slug
   */
  @Get('slug/:slug')
  async findBySlug(@Param('slug') slug: string) {
    return this.courseService.findBySlug(slug);
  }

  /**
   * Get course by ID with full details
   * GET /course/:id
   */
  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.courseService.findById(id);
  }
}
