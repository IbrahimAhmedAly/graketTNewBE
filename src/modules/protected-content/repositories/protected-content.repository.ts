import { Injectable } from '@nestjs/common';
import { PurchaseType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ProtectedContentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findStudent(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, status: true, desktopSerial: true },
    });
  }

  async findContent(contentId: string) {
    return this.prisma.content.findUnique({
      where: { id: contentId },
      select: {
        id: true,
        type: true,
        encryptedFileUrl: true,
        section: { select: { courseId: true } },
      },
    });
  }

  /**
   * Same rule as the course details endpoint: the whole course was bought,
   * or this one item was.
   */
  async hasPurchased(
    userId: string,
    courseId: string,
    contentId: string,
  ): Promise<boolean> {
    const count = await this.prisma.purchase.count({
      where: {
        userId,
        OR: [
          { type: PurchaseType.COURSE, courseId },
          { type: PurchaseType.VIDEO, contentId },
        ],
      },
    });
    return count > 0;
  }
}
