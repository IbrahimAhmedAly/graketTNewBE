import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { GenerateCodeDto, UpdateCodeDto, QueryCodeDto, CodeStatus } from '../dto';
import { Prisma, PurchaseType } from '@prisma/client';

@Injectable()
export class AdminPurchaseCodeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async generateCode(adminId: string, data: GenerateCodeDto, code: string) {
    return this.prisma.purchaseCode.create({
      data: {
        code,
        type: data.type,
        courseId: data.courseId,
        contentId: data.contentId,
        maxUses: data.maxUses || 1,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        createdBy: adminId,
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
            price: true,
          },
        },
        content: {
          select: {
            id: true,
            title: true,
            type: true,
          },
        },
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async findAll(query: QueryCodeDto) {
    const { page = 1, limit = 10, search, type, courseId, contentId, status, isUsed } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.PurchaseCodeWhereInput = {};

    // Search by code
    if (search) {
      where.code = {
        contains: search,
        mode: 'insensitive',
      };
    }

    // Filter by type
    if (type) {
      where.type = type;
    }

    // Filter by course
    if (courseId) {
      where.courseId = courseId;
    }

    // Filter by content (video)
    if (contentId) {
      where.contentId = contentId;
    }

    // Filter by usage status
    if (isUsed !== undefined) {
      where.isUsed = isUsed;
    }

    // Filter by status (active, expired, used, unused)
    if (status) {
      const now = new Date();

      switch (status) {
        case CodeStatus.USED:
          where.isUsed = true;
          break;
        case CodeStatus.UNUSED:
          where.isUsed = false;
          break;
        case CodeStatus.EXPIRED:
          where.expiresAt = {
            lt: now,
          };
          break;
        case CodeStatus.ACTIVE:
          where.isUsed = false;
          where.OR = [
            { expiresAt: null },
            { expiresAt: { gte: now } },
          ];
          break;
      }
    }

    const [codes, total] = await Promise.all([
      this.prisma.purchaseCode.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          course: {
            select: {
              id: true,
              title: true,
              slug: true,
              price: true,
            },
          },
          content: {
            select: {
              id: true,
              title: true,
              type: true,
            },
          },
          admin: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              purchases: true,
            },
          },
        },
      }),
      this.prisma.purchaseCode.count({ where }),
    ]);

    return {
      codes,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string) {
    return this.prisma.purchaseCode.findUnique({
      where: { id },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
            price: true,
            thumbnail: true,
          },
        },
        content: {
          select: {
            id: true,
            title: true,
            type: true,
            videoUrl: true,
            pdfUrl: true,
          },
        },
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        purchases: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });
  }

  async findByCode(code: string) {
    return this.prisma.purchaseCode.findUnique({
      where: { code },
    });
  }

  async update(id: string, data: UpdateCodeDto) {
    return this.prisma.purchaseCode.update({
      where: { id },
      data: {
        ...(data.maxUses !== undefined && { maxUses: data.maxUses }),
        ...(data.expiresAt !== undefined && { expiresAt: new Date(data.expiresAt) }),
        ...(data.isUsed !== undefined && { isUsed: data.isUsed }),
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
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
    });
  }

  async delete(id: string) {
    return this.prisma.purchaseCode.delete({
      where: { id },
    });
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.purchaseCode.count({
      where: { id },
    });
    return count > 0;
  }

  async codeExists(code: string): Promise<boolean> {
    const count = await this.prisma.purchaseCode.count({
      where: { code },
    });
    return count > 0;
  }

  async courseExists(courseId: string): Promise<boolean> {
    const count = await this.prisma.course.count({
      where: { id: courseId },
    });
    return count > 0;
  }

  async contentExists(contentId: string): Promise<boolean> {
    const count = await this.prisma.content.count({
      where: { id: contentId },
    });
    return count > 0;
  }

  async getStatistics() {
    const now = new Date();

    const [total, used, unused, expired, active] = await Promise.all([
      this.prisma.purchaseCode.count(),
      this.prisma.purchaseCode.count({ where: { isUsed: true } }),
      this.prisma.purchaseCode.count({ where: { isUsed: false } }),
      this.prisma.purchaseCode.count({
        where: {
          expiresAt: {
            lt: now,
          },
        },
      }),
      this.prisma.purchaseCode.count({
        where: {
          isUsed: false,
          OR: [
            { expiresAt: null },
            { expiresAt: { gte: now } },
          ],
        },
      }),
    ]);

    return {
      total,
      used,
      unused,
      expired,
      active,
    };
  }
}
