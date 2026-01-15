import { Injectable } from '@nestjs/common';
import { Category, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Category Repository
 * Handles all database operations for Category entity
 */
@Injectable()
export class CategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find category by ID
   */
  async findById(id: string): Promise<Category | null> {
    return this.prisma.category.findUnique({
      where: { id },
    });
  }

  /**
   * Find category by name
   */
  async findByName(name: string): Promise<Category | null> {
    return this.prisma.category.findUnique({
      where: { name },
    });
  }

  /**
   * Find category by slug
   */
  async findBySlug(slug: string): Promise<Category | null> {
    return this.prisma.category.findUnique({
      where: { slug },
    });
  }

  /**
   * Find all categories with pagination and optional search
   */
  async findAll(params: {
    skip: number;
    take: number;
    search?: string;
  }): Promise<Category[]> {
    const { skip, take, search } = params;

    const where: Prisma.CategoryWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { slug: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    return this.prisma.category.findMany({
      where,
      skip,
      take,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Count total categories with optional search
   */
  async count(search?: string): Promise<number> {
    const where: Prisma.CategoryWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { slug: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    return this.prisma.category.count({ where });
  }

  /**
   * Create a new category
   */
  async create(data: Prisma.CategoryCreateInput): Promise<Category> {
    return this.prisma.category.create({
      data,
    });
  }

  /**
   * Update category by ID
   */
  async update(
    id: string,
    data: Prisma.CategoryUpdateInput,
  ): Promise<Category> {
    return this.prisma.category.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete category by ID
   */
  async delete(id: string): Promise<Category> {
    return this.prisma.category.delete({
      where: { id },
    });
  }

  /**
   * Check if name exists
   */
  async existsByName(name: string): Promise<boolean> {
    const count = await this.prisma.category.count({
      where: { name },
    });
    return count > 0;
  }

  /**
   * Check if slug exists
   */
  async existsBySlug(slug: string): Promise<boolean> {
    const count = await this.prisma.category.count({
      where: { slug },
    });
    return count > 0;
  }

  /**
   * Check if name exists excluding a specific category ID
   */
  async existsByNameExcludingId(
    name: string,
    excludeId: string,
  ): Promise<boolean> {
    const count = await this.prisma.category.count({
      where: {
        name,
        id: { not: excludeId },
      },
    });
    return count > 0;
  }

  /**
   * Check if slug exists excluding a specific category ID
   */
  async existsBySlugExcludingId(
    slug: string,
    excludeId: string,
  ): Promise<boolean> {
    const count = await this.prisma.category.count({
      where: {
        slug,
        id: { not: excludeId },
      },
    });
    return count > 0;
  }
}
