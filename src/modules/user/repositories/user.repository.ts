import { Injectable } from '@nestjs/common';
import { Prisma, UserStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      enrollments: true,
      purchases: true,
    },
  },
} satisfies Prisma.UserSelect;

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: {
    skip: number;
    take: number;
    search?: string;
    status?: UserStatus;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const { skip, take, search, status, sortBy = 'createdAt', sortOrder = 'desc' } = params;

    const where: Prisma.UserWhereInput = {
      ...(status && { status }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    return this.prisma.user.findMany({
      where,
      select: USER_SELECT,
      skip,
      take,
      orderBy: { [sortBy]: sortOrder },
    });
  }

  async count(params: { search?: string; status?: UserStatus }) {
    const { search, status } = params;

    const where: Prisma.UserWhereInput = {
      ...(status && { status }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    return this.prisma.user.count({ where });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        ...USER_SELECT,
        enrollments: {
          select: {
            course: {
              select: { id: true, title: true, thumbnail: true },
            },
            enrolledAt: true,
          },
          orderBy: { enrolledAt: 'desc' },
          take: 5,
        },
      },
    });
  }
}
