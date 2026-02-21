import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { UserQueryDto } from './dto';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';

@Controller('admin/users')
@UseGuards(AdminAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * Get all users with pagination and filters
   * GET /users?page=1&limit=10&search=john&status=ACTIVE
   */
  @Get()
  async findAll(@Query() query: UserQueryDto) {
    return this.userService.findAll(query);
  }

  /**
   * Get user by ID
   * GET /users/:id
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }
}
