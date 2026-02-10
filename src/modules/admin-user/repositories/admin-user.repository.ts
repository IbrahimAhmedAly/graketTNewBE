import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto, QueryUserDto } from '../dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class AdminUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateUserDto, hashedPassword: string) {
    return this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: hashedPassword,
        serial: data.serial,
        status: data.status || 'PENDING',
      },
      select: {
        id: true,
        email: true,
        name: true,
        serial: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findAll(query: QueryUserDto) {
    const { page = 1, limit = 10, search, status, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};

    // Search by email, name, or serial
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { serial: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Filter by status
    if (status) {
      where.status = status;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
        select: {
          id: true,
          email: true,
          name: true,
          serial: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              enrollments: true,
              purchases: true,
              reviews: true,
              notifications: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        serial: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        enrollments: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
                slug: true,
                thumbnail: true,
              },
            },
          },
          orderBy: {
            enrolledAt: 'desc',
          },
        },
        purchases: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
              },
            },
            content: {
              select: {
                id: true,
                title: true,
                type: true,
              },
            },
          },
          orderBy: {
            purchasedAt: 'desc',
          },
        },
        reviews: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        _count: {
          select: {
            enrollments: true,
            purchases: true,
            reviews: true,
            notifications: true,
            basketItems: true,
          },
        },
      },
    });
  }

  async update(id: string, data: UpdateUserDto, hashedPassword?: string) {
    return this.prisma.user.update({
      where: { id },
      data: {
        ...(data.email && { email: data.email }),
        ...(data.name !== undefined && { name: data.name }),
        ...(hashedPassword && { password: hashedPassword }),
        ...(data.serial && { serial: data.serial }),
        ...(data.status && { status: data.status }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        serial: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async delete(id: string) {
    return this.prisma.user.delete({
      where: { id },
    });
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: { id },
    });
    return count > 0;
  }

  async emailExists(email: string, excludeId?: string): Promise<boolean> {
    const where: Prisma.UserWhereInput = { email };
    if (excludeId) {
      where.id = { not: excludeId };
    }
    const count = await this.prisma.user.count({ where });
    return count > 0;
  }

  async serialExists(serial: string, excludeId?: string): Promise<boolean> {
    const where: Prisma.UserWhereInput = { serial };
    if (excludeId) {
      where.id = { not: excludeId };
    }
    const count = await this.prisma.user.count({ where });
    return count > 0;
  }

  async getStatistics() {
    const [total, active, pending, suspended] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { status: 'ACTIVE' } }),
      this.prisma.user.count({ where: { status: 'PENDING' } }),
      this.prisma.user.count({ where: { status: 'SUSPENDED' } }),
    ]);

    return {
      total,
      active,
      pending,
      suspended,
    };
  }
}
