import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { PurchaseType } from '@prisma/client';

@Injectable()
export class PurchaseRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findCodeByCode(code: string) {
    return this.prisma.purchaseCode.findUnique({
      where: { code },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
            thumbnail: true,
            price: true,
            discountPrice: true,
          },
        },
        content: {
          select: {
            id: true,
            title: true,
            type: true,
            section: {
              select: {
                course: {
                  select: {
                    id: true,
                    title: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async createPurchase(data: {
    userId: string;
    type: PurchaseType;
    courseId?: string;
    contentId?: string;
    purchaseCodeId: string;
  }) {
    return this.prisma.purchase.create({
      data,
      include: {
        course: true,
        content: true,
      },
    });
  }

  async updateCodeUsage(
    codeId: string,
    userId: string,
    usedCount: number,
    maxUses: number,
  ) {
    return this.prisma.purchaseCode.update({
      where: { id: codeId },
      data: {
        usedBy: userId,
        usedAt: new Date(),
        usedCount: usedCount + 1,
        isUsed: usedCount + 1 >= maxUses,
      },
    });
  }

  async findUserPurchases(userId: string, type?: PurchaseType) {
    return this.prisma.purchase.findMany({
      where: {
        userId,
        ...(type && { type }),
      },
      include: {
        course: {
          include: {
            instructor: {
              select: { id: true, name: true, avatar: true },
            },
            category: {
              select: { id: true, name: true },
            },
          },
        },
        content: {
          include: {
            section: {
              include: {
                course: {
                  select: { id: true, title: true, thumbnail: true },
                },
              },
            },
          },
        },
      },
      orderBy: { purchasedAt: 'desc' },
    });
  }

  async findPurchaseByUserAndCourse(userId: string, courseId: string) {
    return this.prisma.purchase.findFirst({
      where: {
        userId,
        courseId,
        type: 'COURSE',
      },
    });
  }

  async findPurchaseByUserAndContent(userId: string, contentId: string) {
    return this.prisma.purchase.findFirst({
      where: {
        userId,
        contentId,
        type: 'VIDEO',
      },
    });
  }

  /**
   * Find all purchases for a user for a list of courses
   * Returns both COURSE and VIDEO purchases with course info
   */
  async findUserPurchasesByCourses(userId: string, courseIds: string[]) {
    return this.prisma.purchase.findMany({
      where: {
        userId,
        OR: [
          {
            type: 'COURSE',
            courseId: { in: courseIds },
          },
          {
            type: 'VIDEO',
            content: {
              section: {
                courseId: { in: courseIds },
              },
            },
          },
        ],
      },
      include: {
        course: {
          select: { id: true },
        },
        content: {
          select: {
            id: true,
            section: {
              select: {
                courseId: true,
              },
            },
          },
        },
      },
    });
  }
}
