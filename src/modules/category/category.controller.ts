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

import { CategoryService } from './category.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';
import { PaginationSearchQueryDto } from '../../common/dto/pagination-search-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

/**
 * Category Controller
 * Handles all category endpoints
 */
@Controller('categories')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard) // Protect all routes with JWT authentication
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  /**
   * Create a new category
   * POST /categories
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createCategoryDto: CreateCategoryDto) {
    return await this.categoryService.create(createCategoryDto);
  }

  /**
   * Get all categories with pagination and search
   * GET /categories?page=1&limit=10&search=query
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(@Query() query: PaginationSearchQueryDto) {
    const { page, limit, search } = query;
    return await this.categoryService.findAll(page, limit, search);
  }

  /**
   * Get category by slug
   * GET /categories/slug/:slug
   */
  @Get('slug/:slug')
  @HttpCode(HttpStatus.OK)
  async findBySlug(@Param('slug') slug: string) {
    return await this.categoryService.findBySlug(slug);
  }

  /**
   * Get category by ID
   * GET /categories/:id
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) {
    return await this.categoryService.findOne(id);
  }

  /**
   * Update category by ID
   * PATCH /categories/:id
   */
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return await this.categoryService.update(id, updateCategoryDto);
  }

  /**
   * Delete category by ID
   * DELETE /categories/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    return await this.categoryService.remove(id);
  }
}
