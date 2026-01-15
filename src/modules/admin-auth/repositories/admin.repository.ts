import { Injectable } from '@nestjs/common';
import { Admin, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Admin Repository
 * Handles all database operations for Admin entity
 */
@Injectable()
export class AdminRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find admin by ID
   */
  async findById(id: string): Promise<Admin | null> {
    return this.prisma.admin.findUnique({
      where: { id },
    });
  }

  /**
   * Find admin by email
   */
  async findByEmail(email: string): Promise<Admin | null> {
    return this.prisma.admin.findUnique({
      where: { email },
    });
  }

  /**
   * Create a new admin
   */
  async create(data: Prisma.AdminCreateInput): Promise<Admin> {
    return this.prisma.admin.create({
      data,
    });
  }

  /**
   * Update admin by ID
   */
  async update(id: string, data: Prisma.AdminUpdateInput): Promise<Admin> {
    return this.prisma.admin.update({
      where: { id },
      data,
    });
  }

  /**
   * Update admin password
   */
  async updatePassword(id: string, hashedPassword: string): Promise<Admin> {
    return this.prisma.admin.update({
      where: { id },
      data: { password: hashedPassword },
    });
  }

  /**
   * Delete admin by ID
   */
  async delete(id: string): Promise<Admin> {
    return this.prisma.admin.delete({
      where: { id },
    });
  }

  /**
   * Check if email exists
   */
  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.prisma.admin.count({
      where: { email },
    });
    return count > 0;
  }
}
