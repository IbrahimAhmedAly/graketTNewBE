import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PurchaseRepository } from './repositories/purchase.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { PurchaseType } from '@prisma/client';

@Injectable()
export class PurchaseService {
  constructor(
    private readonly purchaseRepository: PurchaseRepository,
    private readonly prisma: PrismaService,
  ) {}

  async redeemCode(userId: string, code: string) {
    // Find the purchase code
    const purchaseCode = await this.purchaseRepository.findCodeByCode(
      code.toUpperCase(),
    );

    if (!purchaseCode) {
      throw new NotFoundException('كود الشراء غير صالح');
    }

    // Check if code is expired
    if (purchaseCode.expiresAt && new Date() > purchaseCode.expiresAt) {
      throw new BadRequestException('كود الشراء منتهي الصلاحية');
    }

    // Check if code has reached max uses
    if (purchaseCode.usedCount >= purchaseCode.maxUses) {
      throw new BadRequestException('كود الشراء تم استخدامه بالكامل');
    }

    // Check if user already has this purchase
    if (purchaseCode.type === PurchaseType.COURSE && purchaseCode.courseId) {
      const existingPurchase =
        await this.purchaseRepository.findPurchaseByUserAndCourse(
          userId,
          purchaseCode.courseId,
        );

      if (existingPurchase) {
        throw new ConflictException('لقد قمت بشراء هذه الدورة مسبقاً');
      }

      // Check if already enrolled
      const enrollment = await this.prisma.enrollment.findUnique({
        where: {
          userId_courseId: { userId, courseId: purchaseCode.courseId },
        },
      });

      if (enrollment) {
        throw new ConflictException('أنت مسجل بالفعل في هذه الدورة');
      }
    }

    if (purchaseCode.type === PurchaseType.VIDEO && purchaseCode.contentId) {
      const existingPurchase =
        await this.purchaseRepository.findPurchaseByUserAndContent(
          userId,
          purchaseCode.contentId,
        );

      if (existingPurchase) {
        throw new ConflictException('لقد قمت بشراء هذا الفيديو مسبقاً');
      }
    }

    // Create the purchase in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create purchase
      const purchase = await tx.purchase.create({
        data: {
          userId,
          type: purchaseCode.type,
          courseId: purchaseCode.courseId,
          contentId: purchaseCode.contentId,
          purchaseCodeId: purchaseCode.id,
        },
        include: {
          course: {
            include: {
              instructor: { select: { id: true, name: true } },
            },
          },
          content: {
            include: {
              section: {
                include: {
                  course: { select: { id: true, title: true } },
                },
              },
            },
          },
        },
      });

      // Update code usage
      await tx.purchaseCode.update({
        where: { id: purchaseCode.id },
        data: {
          usedBy: userId,
          usedAt: new Date(),
          usedCount: purchaseCode.usedCount + 1,
          isUsed: purchaseCode.usedCount + 1 >= purchaseCode.maxUses,
        },
      });

      // If course purchase, auto-enroll user
      if (purchaseCode.type === PurchaseType.COURSE && purchaseCode.courseId) {
        await tx.enrollment.create({
          data: {
            userId,
            courseId: purchaseCode.courseId,
            status: 'ONGOING',
            progress: 0,
          },
        });
      }

      // Remove from basket if exists
      if (purchaseCode.courseId) {
        await tx.basketItem.deleteMany({
          where: {
            userId,
            courseId: purchaseCode.courseId,
          },
        });
      }

      return purchase;
    });

    return {
      message:
        purchaseCode.type === PurchaseType.COURSE
          ? 'تم شراء الدورة بنجاح'
          : 'تم شراء الفيديو بنجاح',
      data: {
        purchase: result,
        type: purchaseCode.type,
        item:
          purchaseCode.type === PurchaseType.COURSE
            ? purchaseCode.course
            : purchaseCode.content,
      },
    };
  }

  async getUserPurchases(userId: string, type?: PurchaseType) {
    const purchases = await this.purchaseRepository.findUserPurchases(
      userId,
      type,
    );

    // Exclude content from response
    const cleanedPurchases = purchases.map(({ content, ...purchase }) => purchase);

    return {
      message: 'تم جلب المشتريات بنجاح',
      data: cleanedPurchases,
    };
  }

  async verifyCode(code: string) {
    const purchaseCode = await this.purchaseRepository.findCodeByCode(
      code.toUpperCase(),
    );

    if (!purchaseCode) {
      throw new NotFoundException('كود الشراء غير صالح');
    }

    const isExpired =
      purchaseCode.expiresAt && new Date() > purchaseCode.expiresAt;
    const isFullyUsed = purchaseCode.usedCount >= purchaseCode.maxUses;

    return {
      message: 'تم التحقق من الكود',
      data: {
        valid: !isExpired && !isFullyUsed,
        type: purchaseCode.type,
        item:
          purchaseCode.type === PurchaseType.COURSE
            ? purchaseCode.course
            : purchaseCode.content,
        isExpired,
        isFullyUsed,
        remainingUses: purchaseCode.maxUses - purchaseCode.usedCount,
      },
    };
  }
}
