import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  ClassSerializerInterceptor,
  UseGuards,
} from '@nestjs/common';

import { InstructorService } from './instructor.service';
import { CreateInstructorDto, UpdateInstructorDto } from './dto';
import { PaginationSearchQueryDto } from '../../common/dto/pagination-search-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

/**
 * Instructor Controller
 * Handles all instructor endpoints
 */
@Controller('instructors')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard) // Protect all routes with JWT authentication
export class InstructorController {
  constructor(private readonly instructorService: InstructorService) {}

  /**
   * Create a new instructor
   * POST /instructors
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createInstructorDto: CreateInstructorDto) {
    return await this.instructorService.create(createInstructorDto);
  }

  /**
   * Get all instructors with pagination and search
   * GET /instructors?page=1&limit=10&search=query
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(@Query() query: PaginationSearchQueryDto) {
    const { page, limit, search } = query;
    return await this.instructorService.findAll(page, limit, search);
  }

  /**
   * Get instructor by ID
   * GET /instructors/:id
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) {
    return await this.instructorService.findOne(id);
  }

  /**
   * Get all published courses taught by an instructor (paginated).
   * GET /instructors/:id/courses?page=1&limit=20
   */
  @Get(':id/courses')
  @HttpCode(HttpStatus.OK)
  async getInstructorCourses(
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return await this.instructorService.findCourses(id, page || 1, limit || 20);
  }

  /**
   * Update instructor by ID
   * PATCH /instructors/:id
   */
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() updateInstructorDto: UpdateInstructorDto,
  ) {
    return await this.instructorService.update(id, updateInstructorDto);
  }

  /**
   * Delete instructor by ID
   * DELETE /instructors/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    return await this.instructorService.remove(id);
  }
}
