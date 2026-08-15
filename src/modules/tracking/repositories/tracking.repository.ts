import { Injectable } from '@nestjs/common';
import { ContentType, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { normalizeTzOffset } from '../utils/local-day.util';

/** Fields a daily rollup can increment. */
export interface DailyActivityDelta {
  studySeconds?: number;
  videosWatched?: number;
  videoSeconds?: number;
  quizzesTaken?: number;
  pdfsOpened?: number;
  contentsDone?: number;
  pointsEarned?: number;
}

@Injectable()
export class TrackingRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================
  // Content lookups
  // ============================================

  /** Content plus the course it belongs to, for enrollment checks. */
  async getContentWithCourse(contentId: string) {
    return this.prisma.content.findUnique({
      where: { id: contentId },
      select: {
        id: true,
        type: true,
        duration: true,
        section: { select: { course: { select: { id: true } } } },
      },
    });
  }

  /**
   * Whether the student is enrolled in a course.
   *
   * SAVED is excluded deliberately: it is the wishlist state, and a wishlisted
   * course is not something the student has access to study.
   */
  async isEnrolled(userId: string, courseId: string): Promise<boolean> {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      select: { status: true },
    });

    return !!enrollment && enrollment.status !== 'SAVED';
  }

  // ============================================
  // Video watch progress
  // ============================================

  async findWatchProgress(userId: string, contentId: string) {
    return this.prisma.videoWatchProgress.findUnique({
      where: { userId_contentId: { userId, contentId } },
    });
  }

  async upsertWatchProgress(params: {
    userId: string;
    contentId: string;
    segments: Prisma.InputJsonValue;
    watchedSeconds: number;
    lastPositionSec?: number | null;
    durationSec?: number | null;
    watchPercent: number;
    replayIncrement: number;
    completedAt: Date | null;
  }) {
    const {
      userId,
      contentId,
      segments,
      watchedSeconds,
      lastPositionSec,
      durationSec,
      watchPercent,
      replayIncrement,
      completedAt,
    } = params;

    return this.prisma.videoWatchProgress.upsert({
      where: { userId_contentId: { userId, contentId } },
      update: {
        segments,
        watchedSeconds,
        watchPercent,
        lastWatchedAt: new Date(),
        // Both of these are omitted rather than written when the caller has
        // nothing new to say. A report from a player that has not run carries
        // `positionSec: 0` and an admin-entered length, and writing those would
        // throw away the resume point and the real duration behind it.
        ...(lastPositionSec != null ? { lastPositionSec } : {}),
        ...(durationSec ? { durationSec } : {}),
        ...(replayIncrement ? { replayCount: { increment: replayIncrement } } : {}),
        // Only ever set completedAt; never clear it. Re-watching a finished
        // video must not un-complete it.
        ...(completedAt ? { completedAt } : {}),
      },
      create: {
        userId,
        contentId,
        segments,
        watchedSeconds,
        lastPositionSec: lastPositionSec ?? 0,
        watchPercent,
        durationSec: durationSec ?? null,
        replayCount: replayIncrement,
        completedAt,
      },
    });
  }

  // ============================================
  // Content views
  // ============================================

  async createContentView(params: {
    userId: string;
    contentId: string;
    type: ContentType;
    totalPages?: number | null;
  }) {
    return this.prisma.contentView.create({
      data: {
        userId: params.userId,
        contentId: params.contentId,
        type: params.type,
        totalPages: params.totalPages ?? null,
      },
    });
  }

  async findContentView(viewId: string) {
    return this.prisma.contentView.findUnique({ where: { id: viewId } });
  }

  /**
   * Whether this content already earned the student credit on a given day.
   *
   * Keeps reopening the same document from inflating "PDFs read" and points.
   * `excludeViewId` skips the view currently being closed, which is already
   * written by the time this runs.
   */
  async hasCreditedContentToday(params: {
    userId: string;
    contentId: string;
    day: Date;
    tzOffsetMinutes: number;
    excludeViewId: string;
  }): Promise<boolean> {
    // `day` is UTC midnight of the student's LOCAL date, so the instants that
    // belong to it are that window shifted back by the device offset. Scanning
    // the raw UTC day instead would look at the wrong 24 hours for any student
    // not on UTC, and credit a document a second time.
    const offsetMs = normalizeTzOffset(params.tzOffsetMinutes) * 60 * 1000;
    const dayStart = new Date(params.day.getTime() - offsetMs);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    const prior = await this.prisma.contentView.findFirst({
      where: {
        userId: params.userId,
        contentId: params.contentId,
        id: { not: params.excludeViewId },
        closedAt: { not: null },
        openedAt: { gte: dayStart, lt: dayEnd },
      },
      select: { id: true },
    });

    return !!prior;
  }

  /**
   * Closes a view, reporting whether this call is the one that closed it.
   *
   * The `closedAt: null` filter is the idempotency guard: only the first `end`
   * matches a row, so `firstClose` tells the caller whether it may credit.
   * Concurrent ends resolve the same way — the loser matches nothing. A plain
   * `update` credits a retry, a double-tap, or a client checkpointing an open
   * PDF all over again, for one read.
   *
   * An already-closed view still takes the new figures: a read that continued
   * after a checkpoint is longer than the checkpoint saw, and the caller keeps
   * the values monotonic so a late, smaller report cannot erase it.
   */
  async closeContentView(params: {
    viewId: string;
    durationSec: number;
    pagesRead?: number | null;
    totalPages?: number | null;
  }) {
    const { viewId, durationSec, pagesRead, totalPages } = params;

    const data = {
      durationSec,
      closedAt: new Date(),
      ...(pagesRead != null ? { pagesRead } : {}),
      ...(totalPages != null ? { totalPages } : {}),
    };

    const [closed] = await this.prisma.contentView.updateManyAndReturn({
      where: { id: viewId, closedAt: null },
      data,
    });

    if (closed) {
      return { view: closed, firstClose: true };
    }

    const view = await this.prisma.contentView.update({
      where: { id: viewId },
      data,
    });

    return { view, firstClose: false };
  }

  // ============================================
  // Study sessions
  // ============================================

  /**
   * An already-open session for this user, if any.
   *
   * Reused rather than opening a second one: rapid background/foreground
   * cycling would otherwise create overlapping sessions whose durations
   * double-count the same wall-clock minutes.
   */
  async findOpenSession(userId: string) {
    return this.prisma.studySession.findFirst({
      where: { userId, endedAt: null },
      orderBy: { startedAt: 'desc' },
    });
  }

  /** A session by id, regardless of whether it is still open. */
  async findOpenSessionById(sessionId: string) {
    return this.prisma.studySession.findUnique({ where: { id: sessionId } });
  }

  /**
   * The device offset recorded by the session the student was in at [at].
   *
   * `StudySession.tzOffsetMinutes` is the only place a device offset is
   * persisted, and the app opens a session before it opens any content, so
   * this is the nearest record of where the student actually was when a view
   * that carries no offset of its own was opened.
   */
  async findSessionOffsetAt(userId: string, at: Date): Promise<number | null> {
    const session = await this.prisma.studySession.findFirst({
      where: { userId, startedAt: { lte: at } },
      orderBy: { startedAt: 'desc' },
      select: { tzOffsetMinutes: true },
    });

    return session?.tzOffsetMinutes ?? null;
  }

  async createSession(userId: string, tzOffsetMinutes: number) {
    return this.prisma.studySession.create({
      data: { userId, tzOffsetMinutes },
    });
  }

  async touchSession(sessionId: string) {
    return this.prisma.studySession.update({
      where: { id: sessionId },
      data: { lastHeartbeatAt: new Date() },
    });
  }

  /**
   * Raises the credited watermark to [creditedSec] and reports how much that
   * added.
   *
   * The conditional update is the guard: `creditedSec: { lt: creditedSec }`
   * makes the write a no-op when another request has already credited that far,
   * so two concurrent heartbeats cannot both bank the same seconds. A count of
   * 0 means someone else got there first and there is nothing to add.
   */
  async creditSessionTime(sessionId: string, creditedSec: number) {
    const current = await this.prisma.studySession.findUnique({
      where: { id: sessionId },
      select: { creditedSec: true },
    });

    if (!current || creditedSec <= current.creditedSec) return 0;

    const result = await this.prisma.studySession.updateMany({
      where: { id: sessionId, creditedSec: { lt: creditedSec } },
      data: { creditedSec },
    });

    return result.count > 0 ? creditedSec - current.creditedSec : 0;
  }

  async closeSession(params: {
    sessionId: string;
    endedAt: Date;
    durationSec: number;
    closedByClient: boolean;
  }) {
    return this.prisma.studySession.update({
      where: { id: params.sessionId },
      data: {
        endedAt: params.endedAt,
        durationSec: params.durationSec,
        closedByClient: params.closedByClient,
      },
    });
  }

  /** Open sessions whose last heartbeat is older than the cutoff. */
  async findStaleSessions(cutoff: Date) {
    return this.prisma.studySession.findMany({
      where: { endedAt: null, lastHeartbeatAt: { lt: cutoff } },
    });
  }

  // ============================================
  // Daily rollup
  // ============================================

  /**
   * Adds to a student's counters for one local day.
   *
   * Written on ingest so the heat map and weekly chart read a single indexed
   * row per day instead of aggregating raw events at request time.
   */
  async incrementDailyActivity(
    userId: string,
    date: Date,
    delta: DailyActivityDelta,
  ) {
    const increments = {
      ...(delta.studySeconds ? { studySeconds: { increment: delta.studySeconds } } : {}),
      ...(delta.videosWatched ? { videosWatched: { increment: delta.videosWatched } } : {}),
      ...(delta.videoSeconds ? { videoSeconds: { increment: delta.videoSeconds } } : {}),
      ...(delta.quizzesTaken ? { quizzesTaken: { increment: delta.quizzesTaken } } : {}),
      ...(delta.pdfsOpened ? { pdfsOpened: { increment: delta.pdfsOpened } } : {}),
      ...(delta.contentsDone ? { contentsDone: { increment: delta.contentsDone } } : {}),
      ...(delta.pointsEarned ? { pointsEarned: { increment: delta.pointsEarned } } : {}),
    };

    return this.prisma.dailyActivity.upsert({
      where: { userId_date: { userId, date } },
      update: increments,
      create: {
        userId,
        date,
        studySeconds: delta.studySeconds ?? 0,
        videosWatched: delta.videosWatched ?? 0,
        videoSeconds: delta.videoSeconds ?? 0,
        quizzesTaken: delta.quizzesTaken ?? 0,
        pdfsOpened: delta.pdfsOpened ?? 0,
        contentsDone: delta.contentsDone ?? 0,
        pointsEarned: delta.pointsEarned ?? 0,
      },
    });
  }

  async findDailyActivityRange(userId: string, from: Date, to: Date) {
    return this.prisma.dailyActivity.findMany({
      where: { userId, date: { gte: from, lte: to } },
      orderBy: { date: 'asc' },
    });
  }

  // ============================================
  // Student stats
  // ============================================

  async findStats(userId: string) {
    return this.prisma.studentStats.findUnique({ where: { userId } });
  }

  async upsertStats(
    userId: string,
    data: Prisma.StudentStatsUncheckedUpdateInput &
      Partial<Prisma.StudentStatsUncheckedCreateInput>,
  ) {
    const { userId: _ignored, ...rest } = data;

    return this.prisma.studentStats.upsert({
      where: { userId },
      update: rest,
      create: {
        userId,
        totalPoints: (rest.totalPoints as number) ?? 0,
        totalStudySeconds: (rest.totalStudySeconds as number) ?? 0,
        currentStreak: (rest.currentStreak as number) ?? 0,
        longestStreak: (rest.longestStreak as number) ?? 0,
        lastActiveDate: (rest.lastActiveDate as Date) ?? null,
      },
    });
  }

  /** Adds to the running point and study-time totals. */
  async incrementStatTotals(
    userId: string,
    delta: { points?: number; studySeconds?: number },
  ) {
    return this.prisma.studentStats.upsert({
      where: { userId },
      update: {
        ...(delta.points ? { totalPoints: { increment: delta.points } } : {}),
        ...(delta.studySeconds
          ? { totalStudySeconds: { increment: delta.studySeconds } }
          : {}),
      },
      create: {
        userId,
        totalPoints: delta.points ?? 0,
        totalStudySeconds: delta.studySeconds ?? 0,
      },
    });
  }

  async setLastLogin(userId: string, at: Date) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: at },
    });
  }
}
