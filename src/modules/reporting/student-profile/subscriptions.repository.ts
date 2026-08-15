import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Read-side queries behind the student subscriptions report.
 *
 * `Enrollment.status = SAVED` is the WISHLIST. This repository deliberately
 * returns SAVED rows — an admin asking what a student signed up for also wants
 * to see what they bookmarked — but every row carries its status so the caller
 * can keep the wishlist out of the subscription counts.
 *
 * Course completion is read from `Content`/`Progress` rows, never from the
 * denormalized `Enrollment.progress` column: that column is written at the
 * moment a lesson is finished and goes stale the next time content is added to
 * the course.
 */
@Injectable()
export class SubscriptionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Existence check, so a report is never assembled for an unknown id. */
  async findStudent(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
  }

  /** Every enrollment including the wishlist, newest first. */
  async findEnrollments(userId: string) {
    return this.prisma.enrollment.findMany({
      where: { userId },
      orderBy: { enrolledAt: 'desc' },
      select: {
        courseId: true,
        status: true,
        enrolledAt: true,
        completedAt: true,
        course: {
          select: {
            title: true,
            thumbnail: true,
            category: { select: { name: true } },
          },
        },
      },
    });
  }

  /**
   * Content rows for the given courses, each tagged with its owning course.
   *
   * One query covering every course at once; per-course totals are tallied in
   * memory rather than by issuing a query per enrollment.
   */
  async findCourseContents(courseIds: string[]) {
    if (courseIds.length === 0) return [];

    return this.prisma.content.findMany({
      where: { section: { courseId: { in: courseIds } } },
      select: { id: true, section: { select: { courseId: true } } },
    });
  }

  /** Which of the given contents the student has finished. */
  async findCompletedContentIds(userId: string, contentIds: string[]) {
    if (contentIds.length === 0) return [];

    return this.prisma.progress.findMany({
      where: { userId, contentId: { in: contentIds }, completed: true },
      select: { contentId: true },
    });
  }

  /**
   * Purchases, carrying enough of each relation to name what was bought.
   *
   * Course and content titles are both pulled here because which one applies
   * depends on `Purchase.type`; resolving the title afterwards would mean a
   * lookup per purchase.
   */
  async findPurchases(userId: string) {
    return this.prisma.purchase.findMany({
      where: { userId },
      orderBy: { purchasedAt: 'desc' },
      select: {
        id: true,
        type: true,
        courseId: true,
        contentId: true,
        purchasedAt: true,
        course: { select: { title: true } },
        content: { select: { title: true } },
        purchaseCode: { select: { code: true } },
      },
    });
  }

  /**
   * Codes this student redeemed.
   *
   * Counted from Purchase rows, which are the redemption ledger: one row is
   * appended per redemption and never rewritten.
   *
   * `PurchaseCode.usedBy` is NOT a ledger and must not be used here. It is a
   * single column that redemption overwrites with the latest redeemer (see
   * PurchaseService), so on any code with `maxUses > 1` every earlier redeemer
   * is erased from it — and the report would then claim a student bought
   * something without redeeming anything.
   *
   * Distinct so a code that ever backs more than one of this student's
   * purchases is still counted as one code redeemed.
   */
  async countRedeemedCodes(userId: string): Promise<number> {
    const codes = await this.prisma.purchase.findMany({
      where: { userId },
      select: { purchaseCodeId: true },
      distinct: ['purchaseCodeId'],
    });
    return codes.length;
  }
}
