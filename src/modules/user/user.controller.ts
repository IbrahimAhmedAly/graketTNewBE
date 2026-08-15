import {
  Body,
  Controller,
  Get,
  Patch,
  Request,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateProfileDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

/**
 * Student self-service profile. Admin user management lives in
 * `admin-user` (admin/users) — nothing admin-facing belongs here.
 */
@Controller('user')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * Get the signed-in student's profile
   * GET /user/me
   */
  @Get('me')
  async getMe(@Request() req: { user: { id: string } }) {
    return this.userService.getProfile(req.user.id);
  }

  /**
   * Update the signed-in student's profile
   * PATCH /user/me
   */
  @Patch('me')
  async updateMe(
    @Request() req: { user: { id: string } },
    @Body() dto: UpdateProfileDto,
  ) {
    return this.userService.updateProfile(req.user.id, dto);
  }
}
