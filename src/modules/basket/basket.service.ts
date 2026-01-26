import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { BasketRepository } from './repositories/basket.repository';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BasketService {
  constructor(
    private readonly basketRepository: BasketRepository,
    private readonly prisma: PrismaService,
  ) {}

  async getBasket(userId: string) {
    const items = await this.basketRepository.findByUserId(userId);

    const transformedItems = items.map((item) => {
      const totalReviews = item.course.reviews.length;
      const averageRating =
        totalReviews > 0
          ? item.course.reviews.reduce((sum, r) => sum + r.rating, 0) /
            totalReviews
          : 0;

      const { reviews, ...courseData } = item.course;
      return {
        id: item.id,
        addedAt: item.createdAt,
        course: {
          ...courseData,
          averageRating: Math.round(averageRating * 10) / 10,
          totalReviews,
        },
      };
    });

    // Calculate totals
    const totalPrice = transformedItems.reduce(
      (sum, item) => sum + item.course.price,
      0,
    );
    const totalDiscountPrice = transformedItems.reduce(
      (sum, item) => sum + (item.course.discountPrice || item.course.price),
      0,
    );

    return {
      message: 'تم جلب السلة بنجاح',
      data: {
        items: transformedItems,
        itemCount: transformedItems.length,
        totalPrice,
        totalDiscountPrice,
        savings: totalPrice - totalDiscountPrice,
      },
    };
  }

  async addToBasket(userId: string, courseId: string) {
    // Check if course exists and is published
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('الدورة غير موجودة');
    }

    if (!course.isPublished) {
      throw new BadRequestException('هذه الدورة غير متاحة حالياً');
    }

    // Check if already in basket
    const existingItem = await this.basketRepository.findOne(userId, courseId);
    if (existingItem) {
      throw new ConflictException('الدورة موجودة بالفعل في السلة');
    }

    // Check if already enrolled
    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        userId_courseId: { userId, courseId },
      },
    });

    if (enrollment) {
      throw new ConflictException('أنت مسجل بالفعل في هذه الدورة');
    }

    // Check if already purchased
    const purchase = await this.prisma.purchase.findFirst({
      where: {
        userId,
        courseId,
        type: 'COURSE',
      },
    });

    if (purchase) {
      throw new ConflictException('لقد قمت بشراء هذه الدورة مسبقاً');
    }

    const item = await this.basketRepository.add(userId, courseId);

    return {
      message: 'تمت إضافة الدورة إلى السلة بنجاح',
      data: item,
    };
  }

  async removeFromBasket(userId: string, courseId: string) {
    const existingItem = await this.basketRepository.findOne(userId, courseId);
    if (!existingItem) {
      throw new NotFoundException('الدورة غير موجودة في السلة');
    }

    await this.basketRepository.remove(userId, courseId);

    return {
      message: 'تمت إزالة الدورة من السلة بنجاح',
    };
  }

  async clearBasket(userId: string) {
    await this.basketRepository.clear(userId);

    return {
      message: 'تم إفراغ السلة بنجاح',
    };
  }

  async getBasketCount(userId: string) {
    const count = await this.basketRepository.count(userId);

    return {
      message: 'تم جلب عدد العناصر بنجاح',
      data: { count },
    };
  }
}
