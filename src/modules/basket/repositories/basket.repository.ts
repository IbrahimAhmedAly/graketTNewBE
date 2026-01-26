import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class BasketRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string) {
    return this.prisma.basketItem.findMany({
      where: { userId },
      include: {
        course: {
          include: {
            instructor: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
            category: {
              select: {
                id: true,
                name: true,
              },
            },
            reviews: {
              select: { rating: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, courseId: string) {
    return this.prisma.basketItem.findUnique({
      where: {
        userId_courseId: { userId, courseId },
      },
    });
  }

  async add(userId: string, courseId: string) {
    return this.prisma.basketItem.create({
      data: { userId, courseId },
      include: {
        course: {
          include: {
            instructor: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }

  async remove(userId: string, courseId: string) {
    return this.prisma.basketItem.delete({
      where: {
        userId_courseId: { userId, courseId },
      },
    });
  }

  async clear(userId: string) {
    return this.prisma.basketItem.deleteMany({
      where: { userId },
    });
  }

  async count(userId: string) {
    return this.prisma.basketItem.count({
      where: { userId },
    });
  }
}
