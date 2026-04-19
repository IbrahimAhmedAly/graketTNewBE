import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { UserCourseService } from './user-course.service';
import { UserCourseQueryDto } from './dto/user-course-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('my-courses')
@UseGuards(JwtAuthGuard)
export class UserCourseController {
  constructor(private readonly userCourseService: UserCourseService) {}

  /**
   * Get all user's enrolled courses
   * GET /my-courses?page=1&limit=10&status=ONGOING
   */
  @Get()
  async getMyCourses(
    @Request() req: { user: { id: string } },
    @Query() query: UserCourseQueryDto,
  ) {
    return this.userCourseService.getMyCourses(req.user.id, query);
  }

  /**
   * Check if a course is in the user's saved/wishlist
   * GET /my-courses/:courseId/save
   */
  @Get(':courseId/save')
  async isSaved(
    @Request() req: { user: { id: string } },
    @Param('courseId') courseId: string,
  ) {
    return this.userCourseService.isSaved(req.user.id, courseId);
  }

  /**
   * Add a course to the user's wishlist (SAVED enrollment).
   * POST /my-courses/:courseId/save
   */
  @Post(':courseId/save')
  async saveCourse(
    @Request() req: { user: { id: string } },
    @Param('courseId') courseId: string,
  ) {
    return this.userCourseService.saveCourse(req.user.id, courseId);
  }

  /**
   * Remove a course from the user's wishlist.
   * DELETE /my-courses/:courseId/save
   */
  @Delete(':courseId/save')
  async unsaveCourse(
    @Request() req: { user: { id: string } },
    @Param('courseId') courseId: string,
  ) {
    return this.userCourseService.unsaveCourse(req.user.id, courseId);
  }

  /**
   * Get detailed progress for a specific course
   * GET /my-courses/:courseId/progress
   */
  @Get(':courseId/progress')
  async getCourseProgress(
    @Request() req: { user: { id: string } },
    @Param('courseId') courseId: string,
  ) {
    return this.userCourseService.getCourseProgress(req.user.id, courseId);
  }
}
