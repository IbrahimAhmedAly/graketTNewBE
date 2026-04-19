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
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('course')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  /**
   * Get all published courses with filters
   * GET /course?page=1&limit=10&search=web&categoryId=xxx
   */
  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  async findAll(
    @Query() query: CourseQueryDto,
    @CurrentUser() user: { id: string } | null,
  ) {
    console.log('user:', user);
    return this.courseService.findAll(query, user?.id);
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
   * Get course by ID with full details
   * GET /course/:id
   */
  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  async findById(
    @Param('id') id: string,
    @CurrentUser() user?: { id: string },
  ) {
    return this.courseService.findById(id, user?.id);
  }

  /**
   * Get all reviews for a course (paginated)
   * GET /course/:id/reviews?page=1&limit=20
   */
  @Get(':id/reviews')
  async getReviews(
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.courseService.getReviews(id, page || 1, limit || 20);
  }

  /**
   * Get related courses (same category, excluding the current one)
   * GET /course/:id/related?limit=6
   */
  @Get(':id/related')
  async getRelated(
    @Param('id') id: string,
    @Query('limit') limit?: number,
  ) {
    return this.courseService.getRelated(id, limit || 6);
  }
}
