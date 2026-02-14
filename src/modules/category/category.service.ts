import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';

// Repository
import { CategoryRepository } from './repositories/category.repository';

// DTOs
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryResponseDto,
} from './dto';

// Utils
import { PaginationUtil } from '../../utils/pagination/pagination.util';
import { SlugUtil } from '../../utils/slug/slug.util';

/**
 * Category Service
 * Handles all category business logic
 */
@Injectable()
export class CategoryService {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  /**
   * Create a new category
   */
  async create(
    createCategoryDto: CreateCategoryDto,
  ): Promise<{ message: string; data: CategoryResponseDto }> {
    const { name, ...rest } = createCategoryDto;

    // Check if name already exists
    const existingByName = await this.categoryRepository.findByName(name);
    if (existingByName) {
      throw new ConflictException('اسم التصنيف مستخدم بالفعل');
    }

    // Auto-generate slug from name
    let slug = SlugUtil.generate(name);

    // Check if slug already exists, if so, make it unique
    let slugExists = await this.categoryRepository.findBySlug(slug);
    let counter = 1;
    while (slugExists) {
      slug = `${SlugUtil.generate(name)}-${counter}`;
      slugExists = await this.categoryRepository.findBySlug(slug);
      counter++;
    }

    const category = await this.categoryRepository.create({
      name,
      slug,
      ...rest,
    });

    return {
      message: 'تم إنشاء التصنيف بنجاح',
      data: category,
    };
  }

  /**
   * Get all categories with pagination and search
   */
  async findAll(page: number = 1, limit: number = 10, search?: string) {
    const params = PaginationUtil.getPaginationParams(page, limit);
    const skip = PaginationUtil.getSkip(params.page, params.limit);

    // Get categories and total count
    const [categories, totalItems] = await Promise.all([
      this.categoryRepository.findAll({
        skip,
        take: params.limit,
        search,
      }),
      this.categoryRepository.count(search),
    ]);

    const paginatedResult = PaginationUtil.paginate(
      categories,
      totalItems,
      params,
    );

    return {
      message: 'تم جلب قائمة التصنيفات بنجاح',
      ...paginatedResult,
    };
  }

  /**
   * Get category by ID
   */
  async findOne(
    id: string,
  ): Promise<{ message: string; data: CategoryResponseDto }> {
    const category = await this.categoryRepository.findById(id);

    if (!category) {
      throw new NotFoundException('التصنيف غير موجود');
    }

    return {
      message: 'تم جلب بيانات التصنيف بنجاح',
      data: category,
    };
  }

  /**
   * Get category by slug
   */
  async findBySlug(
    slug: string,
  ): Promise<{ message: string; data: CategoryResponseDto }> {
    const category = await this.categoryRepository.findBySlug(slug);

    if (!category) {
      throw new NotFoundException('التصنيف غير موجود');
    }

    return {
      message: 'تم جلب بيانات التصنيف بنجاح',
      data: category,
    };
  }

  /**
   * Update category by ID
   */
  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<{ message: string; data: CategoryResponseDto }> {
    // Check if category exists
    const existingCategory = await this.categoryRepository.findById(id);
    if (!existingCategory) {
      throw new NotFoundException('التصنيف غير موجود');
    }

    // Prepare update data
    const updateData: any = { ...updateCategoryDto };

    // Check if name is being updated
    if ('name' in updateCategoryDto && updateCategoryDto.name) {
      const nameExists = await this.categoryRepository.existsByNameExcludingId(
        updateCategoryDto.name,
        id,
      );
      if (nameExists) {
        throw new ConflictException('اسم التصنيف مستخدم بالفعل');
      }

      // Auto-generate new slug from updated name
      let newSlug = SlugUtil.generate(updateCategoryDto.name);

      // Check if slug already exists, if so, make it unique
      let slugExists = await this.categoryRepository.existsBySlugExcludingId(
        newSlug,
        id,
      );
      let counter = 1;
      while (slugExists) {
        newSlug = `${SlugUtil.generate(updateCategoryDto.name)}-${counter}`;
        slugExists = await this.categoryRepository.existsBySlugExcludingId(
          newSlug,
          id,
        );
        counter++;
      }

      updateData.slug = newSlug;
    }

    const updatedCategory = await this.categoryRepository.update(
      id,
      updateData,
    );

    return {
      message: 'تم تحديث بيانات التصنيف بنجاح',
      data: updatedCategory,
    };
  }

  /**
   * Delete category by ID
   */
  async remove(id: string): Promise<{ message: string }> {
    // Check if category exists
    const category = await this.categoryRepository.findById(id);
    if (!category) {
      throw new NotFoundException('التصنيف غير موجود');
    }

    await this.categoryRepository.delete(id);

    return {
      message: 'تم حذف التصنيف بنجاح',
    };
  }
}
