import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Read-side queries behind the full student activity log.
 *
 * There is no event table: the log is a union over the tables that already
 * record what a student did. Each source therefore gets two queries — a real
 * `count()` for the reported total, and a bounded `findMany` for the rows a
 * page might be cut from — because a truncated fetch can never be counted.
 *
 * Every `findMany` here orders by its own timestamp descending and then by
 * `id`, the same total order the service merges under. That second key is not
 * cosmetic: rows sharing a timestamp must sit in a fixed order inside their
 * source, or the bounded fetch stops being a stable prefix and an event can
 * move across a page boundary between two requests.
 *
 * Titles are deliberately absent from the source queries. Only the rows that
 * survive the merge and the page slice need a human label, so the caller
 * resolves them afterwards through the batched `find*Summaries` lookups below.
 */
@Injectable()
export class ActivityLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Existence check, and the login event in one read.
   *
   * `lastLoginAt` is the only source that is a column rather than a table, so
   * it rides along with the check that stops a log being assembled for an
   * unknown id.
   */
  async findStudent(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, lastLoginAt: true },
    });
  }

  // ============================================
  // Counts — the true total per source
  // ============================================

  /**
   * Watch rows for videos this student has no recorded open for.
   *
   * The one filter behind both the orphan count and the orphan fetch. They must
   * apply exactly the same rule — a count that admits a row the fetch rejects
   * puts `total` permanently out of step with the pages — so neither is allowed
   * to spell it out for itself.
   *
   * Scoped to this student on both sides: another student having opened the
   * video says nothing about whether this one's watch was recorded.
   */
  private orphanWatchWhere(
    userId: string,
  ): Prisma.VideoWatchProgressWhereInput {
    return {
      userId,
      content: { views: { none: { userId, type: 'VIDEO' } } },
    };
  }

  /**
   * Video events: opens, plus watches that never produced an open.
   *
   * `ContentView` is the primary source, one event per viewing. Counting from
   * `VideoWatchProgress` instead would collapse ten viewings of a video into
   * one event, because that table is unique per (user, video) and holds a
   * rolling union of watched intervals.
   *
   * But a client can report playback progress without ever calling
   * content-view/start, and older builds in the field do exactly that, so
   * `ContentView` alone silently loses their video activity from a log that
   * claims to be complete. Those watch rows are therefore added back — only
   * where no open exists for the same video, so a video with both sources
   * yields opens and not a duplicate. Dedupe, not drop.
   */
  async countVideoEvents(userId: string): Promise<number> {
    const [opens, orphans] = await Promise.all([
      this.prisma.contentView.count({ where: { userId, type: 'VIDEO' } }),
      this.prisma.videoWatchProgress.count({
        where: this.orphanWatchWhere(userId),
      }),
    ]);

    return opens + orphans;
  }

  /**
   * PDF opens, one per view.
   *
   * `ContentView` also holds QUIZ rows. Those are left out because a quiz
   * submission is recorded as its own act in `QuizAttempt`; the consequence,
   * accepted deliberately, is that opening a quiz and never submitting it does
   * not appear in the log.
   */
  async countPdfViews(userId: string): Promise<number> {
    return this.prisma.contentView.count({ where: { userId, type: 'PDF' } });
  }

  async countQuizAttempts(userId: string): Promise<number> {
    return this.prisma.quizAttempt.count({ where: { userId } });
  }

  async countSessions(userId: string): Promise<number> {
    return this.prisma.studySession.count({ where: { userId } });
  }

  /**
   * Every enrollment, wishlist included.
   *
   * SAVED is excluded from progress and subscription counts elsewhere, but
   * bookmarking a course is still something the student did on the platform,
   * and this endpoint answers "what did they do". The status travels with the
   * event so a reader can tell the three apart.
   */
  async countEnrollments(userId: string): Promise<number> {
    return this.prisma.enrollment.count({ where: { userId } });
  }

  async countPurchases(userId: string): Promise<number> {
    return this.prisma.purchase.count({ where: { userId } });
  }

  // ============================================
  // Candidate rows — newest `take` per source
  // ============================================

  async findVideoViews(userId: string, take: number) {
    return this.prisma.contentView.findMany({
      where: { userId, type: 'VIDEO' },
      orderBy: [{ openedAt: 'desc' }, { id: 'asc' }],
      take,
      select: {
        id: true,
        contentId: true,
        durationSec: true,
        openedAt: true,
      },
    });
  }

  /**
   * The fallback half of the video source: watches with no open behind them.
   *
   * Ordered and bounded like every other source so it takes part in the merge
   * on identical terms — it is a source in its own right, not a patch applied
   * to another one's results.
   */
  async findOrphanWatches(userId: string, take: number) {
    return this.prisma.videoWatchProgress.findMany({
      where: this.orphanWatchWhere(userId),
      orderBy: [{ lastWatchedAt: 'desc' }, { id: 'asc' }],
      take,
      select: {
        id: true,
        contentId: true,
        watchPercent: true,
        watchedSeconds: true,
        lastPositionSec: true,
        replayCount: true,
        completedAt: true,
        lastWatchedAt: true,
      },
    });
  }

  /**
   * Cumulative watch state for the given videos, keyed by content.
   *
   * One query for every video on the page rather than one per event. What it
   * returns is the state as it stands now, not as it stood at the moment of any
   * particular view: `VideoWatchProgress` keeps a single running row per
   * (user, video), so per-moment state is not reconstructable from the schema.
   */
  async findWatchStateByContent(userId: string, contentIds: string[]) {
    if (contentIds.length === 0) return [];

    return this.prisma.videoWatchProgress.findMany({
      where: { userId, contentId: { in: contentIds } },
      select: {
        contentId: true,
        watchPercent: true,
        watchedSeconds: true,
        lastPositionSec: true,
        replayCount: true,
        completedAt: true,
      },
    });
  }

  async findPdfViews(userId: string, take: number) {
    return this.prisma.contentView.findMany({
      where: { userId, type: 'PDF' },
      orderBy: [{ openedAt: 'desc' }, { id: 'asc' }],
      take,
      select: {
        id: true,
        contentId: true,
        durationSec: true,
        pagesRead: true,
        totalPages: true,
        openedAt: true,
      },
    });
  }

  /**
   * Ordered by `startedAt`, the moment the student began the attempt, not by
   * the `createdAt` audit column. The two agree in every row written today, but
   * only `startedAt` is a domain timestamp — and the sibling quizzes endpoint
   * reports that one, so using `createdAt` here would let the same attempt
   * surface at two different times in two reports.
   */
  async findQuizAttempts(userId: string, take: number) {
    return this.prisma.quizAttempt.findMany({
      where: { userId },
      orderBy: [{ startedAt: 'desc' }, { id: 'asc' }],
      take,
      select: {
        id: true,
        quizId: true,
        score: true,
        passed: true,
        timeTaken: true,
        startedAt: true,
      },
    });
  }

  async findSessions(userId: string, take: number) {
    return this.prisma.studySession.findMany({
      where: { userId },
      orderBy: [{ startedAt: 'desc' }, { id: 'asc' }],
      take,
      select: {
        id: true,
        durationSec: true,
        closedByClient: true,
        startedAt: true,
      },
    });
  }

  async findEnrollments(userId: string, take: number) {
    return this.prisma.enrollment.findMany({
      where: { userId },
      orderBy: [{ enrolledAt: 'desc' }, { id: 'asc' }],
      take,
      select: {
        id: true,
        courseId: true,
        status: true,
        enrolledAt: true,
      },
    });
  }

  /**
   * The redeemed code is joined here rather than resolved later: it is a
   * scalar the event itself carries, one per purchase, so it costs nothing
   * beyond the row already being read.
   */
  async findPurchases(userId: string, take: number) {
    return this.prisma.purchase.findMany({
      where: { userId },
      orderBy: [{ purchasedAt: 'desc' }, { id: 'asc' }],
      take,
      select: {
        id: true,
        type: true,
        courseId: true,
        contentId: true,
        purchasedAt: true,
        purchaseCode: { select: { code: true } },
      },
    });
  }

  // ============================================
  // Batched label lookups for one page of events
  // ============================================

  /** Content titles and their owning course, for the ids on the page. */
  async findContentSummaries(contentIds: string[]) {
    if (contentIds.length === 0) return [];

    return this.prisma.content.findMany({
      where: { id: { in: contentIds } },
      select: {
        id: true,
        title: true,
        section: { select: { course: { select: { title: true } } } },
      },
    });
  }

  /**
   * Quiz labels, reached through the content the quiz belongs to.
   *
   * A quiz has no title of its own; the lesson that owns it is what an admin
   * recognises in a feed.
   */
  async findQuizSummaries(quizIds: string[]) {
    if (quizIds.length === 0) return [];

    return this.prisma.quiz.findMany({
      where: { id: { in: quizIds } },
      select: {
        id: true,
        content: {
          select: {
            title: true,
            section: { select: { course: { select: { title: true } } } },
          },
        },
      },
    });
  }

  /** Course titles for enrollment and course-purchase events on the page. */
  async findCourseSummaries(courseIds: string[]) {
    if (courseIds.length === 0) return [];

    return this.prisma.course.findMany({
      where: { id: { in: courseIds } },
      select: { id: true, title: true },
    });
  }
}
