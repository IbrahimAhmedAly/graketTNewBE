import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Read-side queries for student reporting.
 *
 * Two rules hold throughout:
 *   - `Enrollment.status = SAVED` is the WISHLIST. It is excluded everywhere,
 *     because a wishlisted course is not something the student is studying and
 *     counting it inflates every progress figure.
 *   - Nothing here estimates. If a number cannot be derived from recorded
 *     rows, the caller reports it as unavailable rather than inventing it.
 */
@Injectable()
export class ReportingRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Enrollments the student is actually studying (wishlist excluded). */
  async findActiveEnrollments(userId: string) {
    return this.prisma.enrollment.findMany({
      where: { userId, status: { not: 'SAVED' } },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            thumbnail: true,
            totalVideos: true,
            totalQuizzes: true,
            category: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    });
  }

  /** Every content row belonging to the given courses. */
  async findCourseContents(courseIds: string[]) {
    if (courseIds.length === 0) return [];

    return this.prisma.content.findMany({
      where: { section: { courseId: { in: courseIds } } },
      select: {
        id: true,
        title: true,
        type: true,
        duration: true,
        section: { select: { id: true, title: true, courseId: true } },
      },
    });
  }

  /** Completion rows for a student across the given contents. */
  async findProgressForContents(userId: string, contentIds: string[]) {
    if (contentIds.length === 0) return [];

    return this.prisma.progress.findMany({
      where: { userId, contentId: { in: contentIds } },
      select: { contentId: true, completed: true, completedAt: true },
    });
  }

  /** Per-video watch state for a student. */
  async findWatchProgress(userId: string) {
    return this.prisma.videoWatchProgress.findMany({
      where: { userId },
      select: {
        contentId: true,
        watchedSeconds: true,
        watchPercent: true,
        lastPositionSec: true,
        durationSec: true,
        replayCount: true,
        completedAt: true,
        lastWatchedAt: true,
      },
    });
  }

  /** Content-view rows, newest first. */
  async findContentViews(userId: string, take?: number) {
    return this.prisma.contentView.findMany({
      where: { userId },
      orderBy: { openedAt: 'desc' },
      ...(take ? { take } : {}),
      select: {
        id: true,
        contentId: true,
        type: true,
        durationSec: true,
        pagesRead: true,
        totalPages: true,
        openedAt: true,
        closedAt: true,
      },
    });
  }

  /** Distinct PDFs the student has opened at least once. */
  async countDistinctPdfsOpened(userId: string): Promise<number> {
    const rows = await this.prisma.contentView.findMany({
      where: { userId, type: 'PDF' },
      select: { contentId: true },
      distinct: ['contentId'],
    });
    return rows.length;
  }

  /** Quiz attempts with the quiz and its owning content/section. */
  async findQuizAttempts(userId: string) {
    return this.prisma.quizAttempt.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        quizId: true,
        score: true,
        passed: true,
        timeTaken: true,
        createdAt: true,
        completedAt: true,
        quiz: {
          select: {
            id: true,
            passingScore: true,
            content: {
              select: {
                id: true,
                title: true,
                section: {
                  select: {
                    id: true,
                    title: true,
                    course: { select: { id: true, title: true } },
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  /**
   * Individual answers, used for weak-topic analysis.
   *
   * `Question.topic` is optional; when absent the caller groups by lesson
   * instead, so untagged content still yields a usable report.
   */
  async findUserAnswers(userId: string) {
    return this.prisma.userAnswer.findMany({
      where: { attempt: { userId } },
      select: {
        id: true,
        isCorrect: true,
        createdAt: true,
        question: {
          select: {
            id: true,
            questionText: true,
            topic: true,
            quiz: {
              select: {
                content: {
                  select: {
                    id: true,
                    title: true,
                    section: {
                      select: {
                        id: true,
                        title: true,
                        course: { select: { id: true, title: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  /** Daily rollups within an inclusive date range. */
  async findDailyActivity(userId: string, from: Date, to: Date) {
    return this.prisma.dailyActivity.findMany({
      where: { userId, date: { gte: from, lte: to } },
      orderBy: { date: 'asc' },
    });
  }

  async findStats(userId: string) {
    return this.prisma.studentStats.findUnique({ where: { userId } });
  }

  async findUser(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        serial: true,
        parentPhone: true,
        lastLoginAt: true,
        createdAt: true,
        educationLevel: { select: { id: true, name: true } },
        grade: { select: { id: true, name: true } },
      },
    });
  }

  /** Badges the student has earned, newest first. */
  async findEarnedBadges(userId: string) {
    return this.prisma.studentBadge.findMany({
      where: { userId },
      orderBy: { earnedAt: 'desc' },
      include: { badge: true },
    });
  }

  async findActiveBadges() {
    return this.prisma.badge.findMany({
      where: { isActive: true },
      orderBy: { points: 'asc' },
    });
  }

  async awardBadge(userId: string, badgeId: string) {
    return this.prisma.studentBadge.upsert({
      where: { userId_badgeId: { userId, badgeId } },
      update: {},
      create: { userId, badgeId },
    });
  }

  /**
   * Ranking inputs for a cohort.
   *
   * Restricted to students in the same grade when one is known: comparing a
   * first-year against a final-year is not a meaningful ranking. Only ACTIVE
   * students count, so deleted or suspended accounts do not pad the cohort and
   * flatter everyone's position.
   */
  async findCohortStats(gradeId?: string | null) {
    return this.prisma.studentStats.findMany({
      where: {
        successIndex: { not: null },
        user: {
          status: 'ACTIVE',
          ...(gradeId ? { gradeId } : {}),
        },
      },
      select: { userId: true, successIndex: true, totalPoints: true },
      orderBy: { successIndex: 'desc' },
    });
  }

  async updateSuccessIndex(userId: string, successIndex: number | null) {
    return this.prisma.studentStats.upsert({
      where: { userId },
      update: { successIndex, successIndexAt: new Date() },
      create: { userId, successIndex, successIndexAt: new Date() },
    });
  }

  /** Sessions overlapping a range, for admin session reporting. */
  async findSessions(userId: string, from?: Date, take = 50) {
    return this.prisma.studySession.findMany({
      where: { userId, ...(from ? { startedAt: { gte: from } } : {}) },
      orderBy: { startedAt: 'desc' },
      take,
      select: {
        id: true,
        startedAt: true,
        endedAt: true,
        durationSec: true,
        closedByClient: true,
      },
    });
  }
}
