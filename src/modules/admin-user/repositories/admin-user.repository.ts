import { Injectable } from '@nestjs/common';
import { randomInt } from 'crypto';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto, QueryUserDto } from '../dto';
import { EnrollmentStatus, Prisma, PurchaseType } from '@prisma/client';

const GRANT_CODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

@Injectable()
export class AdminUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Shared user projection: identity + education targeting */
  private static readonly baseSelect = {
    id: true,
    email: true,
    name: true,
    serial: true,
    desktopSerial: true,
    status: true,
    educationLevelId: true,
    educationLevel: { select: { id: true, name: true } },
    gradeId: true,
    grade: { select: { id: true, name: true } },
    createdAt: true,
    updatedAt: true,
  } satisfies Prisma.UserSelect;

  async create(data: CreateUserDto, hashedPassword: string) {
    return this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: hashedPassword,
        serial: data.serial,
        educationLevelId: data.educationLevelId,
        gradeId: data.gradeId,
        status: data.status || 'PENDING',
      },
      select: AdminUserRepository.baseSelect,
    });
  }

  async findAll(query: QueryUserDto) {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;
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

    return Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
        select: {
          ...AdminUserRepository.baseSelect,
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
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        ...AdminUserRepository.baseSelect,
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
        ...(data.desktopSerial !== undefined && {
          desktopSerial: data.desktopSerial,
        }),
        ...(data.educationLevelId && {
          educationLevelId: data.educationLevelId,
        }),
        ...(data.gradeId && { gradeId: data.gradeId }),
        ...(data.status && { status: data.status }),
      },
      select: AdminUserRepository.baseSelect,
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

  async findCoursesByIds(ids: string[]) {
    return this.prisma.course.findMany({
      where: { id: { in: ids } },
      select: { id: true, title: true },
    });
  }

  /**
   * Gives the student each course the way redeeming a code does: a COURSE
   * purchase, an ONGOING enrollment and no basket item. The purchase points
   * at a GRANT- code that is created already used, so nobody can redeem it.
   * A course the student has bought and is enrolled in is left untouched.
   * One transaction: either every course is assigned or none is.
   * Returns the ids of the courses it assigned.
   */
  async assignCourses(userId: string, adminId: string, courseIds: string[]) {
    return this.prisma.$transaction(async (tx) => {
      const purchases = await tx.purchase.findMany({
        where: {
          userId,
          type: PurchaseType.COURSE,
          courseId: { in: courseIds },
        },
        select: { courseId: true },
      });
      const enrollments = await tx.enrollment.findMany({
        where: { userId, courseId: { in: courseIds } },
        select: { id: true, courseId: true, status: true },
      });
      const purchased = new Set(purchases.map((purchase) => purchase.courseId));
      const enrollmentByCourse = new Map(
        enrollments.map((enrollment) => [enrollment.courseId, enrollment]),
      );

      const now = new Date();
      const assigned: string[] = [];

      // Always the same order, so two assignments running at once wait for
      // each other instead of deadlocking.
      for (const courseId of [...courseIds].sort()) {
        const enrollment = enrollmentByCourse.get(courseId);

        // SAVED is the wishlist, not an enrollment.
        if (
          purchased.has(courseId) &&
          enrollment &&
          enrollment.status !== EnrollmentStatus.SAVED
        ) {
          continue;
        }

        if (!purchased.has(courseId)) {
          const purchaseCode = await tx.purchaseCode.create({
            data: {
              code: await this.generateUniqueGrantCode(tx),
              type: PurchaseType.COURSE,
              courseId,
              createdBy: adminId,
              maxUses: 1,
              usedCount: 1,
              isUsed: true,
              usedBy: userId,
              usedAt: now,
            },
            select: { id: true },
          });

          await tx.purchase.create({
            data: {
              type: PurchaseType.COURSE,
              userId,
              courseId,
              purchaseCodeId: purchaseCode.id,
            },
          });
        }

        if (!enrollment) {
          await tx.enrollment.create({
            data: {
              userId,
              courseId,
              status: EnrollmentStatus.ONGOING,
              progress: 0,
            },
          });
        } else if (enrollment.status === EnrollmentStatus.SAVED) {
          // Wishlisted until now: enrolled from today, progress kept.
          await tx.enrollment.update({
            where: { id: enrollment.id },
            data: { status: EnrollmentStatus.ONGOING, enrolledAt: now },
          });
        }

        await tx.basketItem.deleteMany({
          where: { userId, courseId },
        });

        assigned.push(courseId);
      }

      return assigned;
    });
  }

  /**
   * GRANT- followed by 12 random characters, checked against existing codes
   * because the column is unique. Runs inside the assignment transaction so
   * codes made earlier in the same request count too.
   */
  private async generateUniqueGrantCode(
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    const maxAttempts = 10;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      let code = 'GRANT-';
      for (let i = 0; i < 12; i++) {
        code += GRANT_CODE_CHARS[randomInt(GRANT_CODE_CHARS.length)];
      }

      const exists = await tx.purchaseCode.count({ where: { code } });
      if (!exists) {
        return code;
      }
    }

    throw new Error('Failed to generate unique code after maximum attempts');
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
