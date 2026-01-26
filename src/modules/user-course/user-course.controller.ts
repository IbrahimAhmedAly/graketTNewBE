import {
  Controller,
  Get,
  Param,
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
