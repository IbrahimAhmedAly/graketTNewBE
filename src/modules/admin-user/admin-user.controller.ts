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
import { AdminUserService } from './admin-user.service';
import { CreateUserDto, UpdateUserDto, QueryUserDto } from './dto';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';

@Controller('admin/users')
@UseGuards(AdminAuthGuard)
export class AdminUserController {
  constructor(private readonly adminUserService: AdminUserService) {}

  /**
   * Create a new user manually
   * POST /admin/users
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createUserDto: CreateUserDto) {
    return this.adminUserService.create(createUserDto);
  }

  /**
   * Get all users with filters
   * GET /admin/users
   */
  @Get()
  findAll(@Query() query: QueryUserDto) {
    return this.adminUserService.findAll(query);
  }

  /**
   * Get user statistics
   * GET /admin/users/statistics
   */
  @Get('statistics')
  getStatistics() {
    return this.adminUserService.getStatistics();
  }

  /**
   * Get user details by ID
   * GET /admin/users/:id
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.adminUserService.findOne(id);
  }

  /**
   * Update user
   * PATCH /admin/users/:id
   */
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.adminUserService.update(id, updateUserDto);
  }

  /**
   * Suspend user
   * POST /admin/users/:id/suspend
   */
  @Post(':id/suspend')
  suspend(@Param('id') id: string) {
    return this.adminUserService.suspendUser(id);
  }

  /**
   * Activate user
   * POST /admin/users/:id/activate
   */
  @Post(':id/activate')
  activate(@Param('id') id: string) {
    return this.adminUserService.activateUser(id);
  }

  /**
   * Delete user
   * DELETE /admin/users/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string) {
    return this.adminUserService.remove(id);
  }
}
