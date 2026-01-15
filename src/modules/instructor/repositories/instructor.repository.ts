import { Injectable } from '@nestjs/common';
import { Instructor, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Instructor Repository
 * Handles all database operations for Instructor entity
 */
@Injectable()
export class InstructorRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find instructor by ID
   */
  async findById(id: string): Promise<Instructor | null> {
    return this.prisma.instructor.findUnique({
      where: { id },
    });
  }

  /**
   * Find instructor by email
   */
  async findByEmail(email: string): Promise<Instructor | null> {
    return this.prisma.instructor.findUnique({
      where: { email },
    });
  }

  /**
   * Find all instructors with pagination and optional search
   */
  async findAll(params: {
    skip: number;
    take: number;
    search?: string;
  }): Promise<Instructor[]> {
    const { skip, take, search } = params;

    const where: Prisma.InstructorWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { title: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    return this.prisma.instructor.findMany({
      where,
      skip,
      take,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Count total instructors with optional search
   */
  async count(search?: string): Promise<number> {
    const where: Prisma.InstructorWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { title: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    return this.prisma.instructor.count({ where });
  }

  /**
   * Create a new instructor
   */
  async create(data: Prisma.InstructorCreateInput): Promise<Instructor> {
    return this.prisma.instructor.create({
      data,
    });
  }

  /**
   * Update instructor by ID
   */
  async update(
    id: string,
    data: Prisma.InstructorUpdateInput,
  ): Promise<Instructor> {
    return this.prisma.instructor.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete instructor by ID
   */
  async delete(id: string): Promise<Instructor> {
    return this.prisma.instructor.delete({
      where: { id },
    });
  }

  /**
   * Check if email exists
   */
  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.prisma.instructor.count({
      where: { email },
    });
    return count > 0;
  }

  /**
   * Check if email exists excluding a specific instructor ID
   */
  async existsByEmailExcludingId(
    email: string,
    excludeId: string,
  ): Promise<boolean> {
    const count = await this.prisma.instructor.count({
      where: {
        email,
        id: { not: excludeId },
      },
    });
    return count > 0;
  }
}
