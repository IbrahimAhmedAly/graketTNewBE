import { Injectable, NotFoundException } from '@nestjs/common';
import { SubscriptionsRepository } from './subscriptions.repository';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly repository: SubscriptionsRepository) {}

  /**
   * What a student has subscribed to, saved and paid for.
   *
   * The wishlist (`Enrollment.status = SAVED`) is reported on its own line and
   * never folded into the subscription counts: a bookmarked course is not
   * something the student is studying, and counting it inflates every figure an
   * admin uses to judge engagement.
   */
  async getSubscriptions(userId: string) {
    const student = await this.repository.findStudent(userId);
    if (!student) throw new NotFoundException('Student not found');

    const [enrollments, purchases, codesRedeemed] = await Promise.all([
      this.repository.findEnrollments(userId),
      this.repository.findPurchases(userId),
      this.repository.countRedeemedCodes(userId),
    ]);

    // Wishlisted courses are included in the content fetch as well, so a course
    // saved after some of its lessons were already watched reports the progress
    // that actually exists instead of a hard-coded 0.
    const contents = await this.repository.findCourseContents(
      enrollments.map((enrollment) => enrollment.courseId),
    );
    const completed = await this.repository.findCompletedContentIds(
      userId,
      contents.map((content) => content.id),
    );
    const completedContentIds = new Set(completed.map((row) => row.contentId));

    const byCourse = new Map<string, { total: number; done: number }>();
    for (const content of contents) {
      const courseId = content.section.courseId;
      const bucket = byCourse.get(courseId) ?? { total: 0, done: 0 };
      bucket.total += 1;
      if (completedContentIds.has(content.id)) bucket.done += 1;
      byCourse.set(courseId, bucket);
    }

    // Dates come from real enrollments only. A wishlisted course was never
    // subscribed to, so the day it was bookmarked cannot be the day this
    // student's first subscription started.
    const enrolledAt = enrollments
      .filter((enrollment) => enrollment.status !== 'SAVED')
      .map((enrollment) => enrollment.enrolledAt.getTime());

    return {
      message: 'Subscriptions retrieved',
      data: {
        summary: {
          activeCourses: this.countByStatus(enrollments, 'ONGOING'),
          completedCourses: this.countByStatus(enrollments, 'COMPLETED'),
          savedCourses: this.countByStatus(enrollments, 'SAVED'),
          totalPurchases: purchases.length,
          codesRedeemed,
          firstEnrolledAt: enrolledAt.length
            ? new Date(Math.min(...enrolledAt))
            : null,
          lastEnrolledAt: enrolledAt.length
            ? new Date(Math.max(...enrolledAt))
            : null,
        },

        enrollments: enrollments.map((enrollment) => {
          const counts = byCourse.get(enrollment.courseId) ?? {
            total: 0,
            done: 0,
          };

          return {
            courseId: enrollment.courseId,
            courseTitle: enrollment.course.title,
            thumbnail: enrollment.course.thumbnail,
            category: enrollment.course.category?.name ?? null,
            status: enrollment.status,
            // Derived from completed Content rows rather than the denormalized
            // Enrollment.progress, which drifts once lessons are added to a
            // course the student had already finished. Matches how subjects[]
            // is built, so an admin and a student are never shown different
            // completion figures for the same course.
            progressPercent: this.percent(counts.done, counts.total),
            enrolledAt: enrollment.enrolledAt,
            completedAt: enrollment.completedAt,
          };
        }),

        purchases: purchases.map((purchase) => ({
          purchaseId: purchase.id,
          type: purchase.type,
          // A VIDEO purchase buys one lesson, a COURSE purchase the whole
          // course, so the human label comes from a different relation in each
          // case.
          itemTitle:
            (purchase.type === 'VIDEO'
              ? purchase.content?.title
              : purchase.course?.title) ?? 'Unknown item',
          courseId: purchase.courseId,
          contentId: purchase.contentId,
          code: purchase.purchaseCode.code,
          purchasedAt: purchase.purchasedAt,
        })),
      },
    };
  }

  private countByStatus(
    enrollments: { status: string }[],
    status: 'ONGOING' | 'COMPLETED' | 'SAVED',
  ): number {
    return enrollments.filter((enrollment) => enrollment.status === status)
      .length;
  }

  /** Integer percentage; 0 when the denominator is zero, never NaN. */
  private percent(part: number, total: number): number {
    if (!total || total <= 0) return 0;
    // Multiplied before dividing; see ReportingService.percent for why.
    return Math.round((part * 100) / total);
  }
}
