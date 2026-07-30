import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { TrackingRepository } from './repositories/tracking.repository';
import {
  EndContentViewDto,
  EndSessionDto,
  HeartbeatDto,
  StartContentViewDto,
  StartSessionDto,
  TrackVideoProgressDto,
} from './dto';
import {
  accumulateSegments,
  parseStoredSegments,
  WatchSegment,
} from './utils/watch-segments.util';
import {
  normalizeTzOffset,
  nextStreak,
  toLocalDay,
} from './utils/local-day.util';

/**
 * A video counts as watched once the student has seen this share of it.
 * Below 100% because trailing credits and outros are routinely skipped, and
 * requiring the literal final second would leave genuinely-finished videos
 * marked incomplete.
 */
const VIDEO_COMPLETE_THRESHOLD = 90;

/**
 * A session with no heartbeat for this long is treated as abandoned. Chosen to
 * be comfortably longer than the client's 30s heartbeat so ordinary network
 * blips don't sever a live session, but short enough that a phone dying
 * mid-lesson doesn't bank hours of phantom study time.
 */
const SESSION_IDLE_TIMEOUT_SEC = 150;

/**
 * Ceiling on a single session's credited time. A session longer than this is
 * almost certainly a client that failed to close rather than an unbroken
 * study marathon, and study hours are the metric most easily inflated by
 * accident.
 */
const SESSION_MAX_DURATION_SEC = 4 * 60 * 60;

/** Points awarded per event. Small and flat; the index does the real scoring. */
const POINTS = {
  VIDEO_COMPLETED: 10,
  PDF_READ: 5,
};

@Injectable()
export class TrackingService {
  private readonly logger = new Logger(TrackingService.name);

  constructor(private readonly repository: TrackingRepository) {}

  // ============================================
  // Video watch progress
  // ============================================

  /**
   * Folds newly played intervals into the stored union for a video.
   *
   * Deliberately idempotent: replaying the same request, or a client retrying
   * after a timeout, cannot increase watched time, because the segments are
   * merged rather than summed.
   */
  async trackVideoProgress(userId: string, dto: TrackVideoProgressDto) {
    const content = await this.assertAccessibleContent(userId, dto.contentId);

    const existing = await this.repository.findWatchProgress(
      userId,
      dto.contentId,
    );

    // Prefer the player-reported duration; fall back to the admin-entered
    // minutes on Content, which is the only other source and is often absent.
    const durationSec =
      dto.durationSec ??
      existing?.durationSec ??
      (content.duration ? content.duration * 60 : undefined);

    const stored = parseStoredSegments(existing?.segments);
    const incoming: WatchSegment[] = dto.segments.map((s) => ({
      start: s.start,
      end: s.end,
    }));

    const { segments, watchedSeconds, percent } = accumulateSegments(
      stored,
      incoming,
      durationSec,
    );

    const wasComplete =
      (existing?.watchPercent ?? 0) >= VIDEO_COMPLETE_THRESHOLD;
    const isComplete = percent >= VIDEO_COMPLETE_THRESHOLD;
    const justCompleted = isComplete && !wasComplete;

    const record = await this.repository.upsertWatchProgress({
      userId,
      contentId: dto.contentId,
      segments: segments as unknown as Prisma.InputJsonValue,
      watchedSeconds,
      lastPositionSec: dto.positionSec,
      durationSec,
      watchPercent: percent,
      replayIncrement: dto.isReplay ? 1 : 0,
      completedAt: justCompleted ? new Date() : null,
    });

    const day = toLocalDay(new Date(), dto.tzOffsetMinutes);

    // Credit the *growth* in merged watch time, never the raw segment sum. The
    // union may absorb a re-sent or overlapping segment and grow by less than
    // was posted — or not at all — and crediting the payload instead would let
    // a client replay one request to manufacture watch time.
    const watchedDelta = Math.max(
      0,
      watchedSeconds - (existing?.watchedSeconds ?? 0),
    );

    if (watchedDelta > 0) {
      await this.repository.incrementDailyActivity(userId, day, {
        videoSeconds: watchedDelta,
      });
      await this.updateStreak(userId, day);
    }

    // Only credit the daily rollup on the transition, so re-watching a
    // finished video doesn't keep incrementing "videos watched today".
    if (justCompleted) {
      await this.repository.incrementDailyActivity(userId, day, {
        videosWatched: 1,
        pointsEarned: POINTS.VIDEO_COMPLETED,
      });
      await this.repository.incrementStatTotals(userId, {
        points: POINTS.VIDEO_COMPLETED,
      });
      await this.updateStreak(userId, day);
    }

    return {
      message: 'Watch progress recorded',
      data: {
        contentId: record.contentId,
        watchedSeconds: record.watchedSeconds,
        watchPercent: record.watchPercent,
        lastPositionSec: record.lastPositionSec,
        durationSec: record.durationSec,
        replayCount: record.replayCount,
        isCompleted: !!record.completedAt,
      },
    };
  }

  /** Resume state for a video, or nulls when it has never been opened. */
  async getVideoProgress(userId: string, contentId: string) {
    const record = await this.repository.findWatchProgress(userId, contentId);

    if (!record) {
      return {
        message: 'No watch progress yet',
        data: {
          contentId,
          watchedSeconds: 0,
          watchPercent: 0,
          lastPositionSec: 0,
          durationSec: null,
          replayCount: 0,
          isCompleted: false,
        },
      };
    }

    return {
      message: 'Watch progress retrieved',
      data: {
        contentId: record.contentId,
        watchedSeconds: record.watchedSeconds,
        watchPercent: record.watchPercent,
        lastPositionSec: record.lastPositionSec,
        durationSec: record.durationSec,
        replayCount: record.replayCount,
        isCompleted: !!record.completedAt,
      },
    };
  }

  // ============================================
  // Content views
  // ============================================

  async startContentView(userId: string, dto: StartContentViewDto) {
    await this.assertAccessibleContent(userId, dto.contentId);

    const view = await this.repository.createContentView({
      userId,
      contentId: dto.contentId,
      type: dto.type,
      totalPages: dto.totalPages,
    });

    return {
      message: 'Content view started',
      data: { viewId: view.id, openedAt: view.openedAt },
    };
  }

  /**
   * Closes a view and credits dwell time.
   *
   * The client's reported duration is capped at the real elapsed time since
   * the view opened — a client cannot claim more minutes than have passed.
   */
  async endContentView(userId: string, dto: EndContentViewDto) {
    const view = await this.repository.findContentView(dto.viewId);

    if (!view) {
      throw new NotFoundException('Content view not found');
    }

    if (view.userId !== userId) {
      throw new ForbiddenException('This view belongs to another student');
    }

    const elapsedSec = Math.max(
      0,
      Math.floor((Date.now() - view.openedAt.getTime()) / 1000),
    );
    const durationSec = Math.min(dto.durationSec, elapsedSec);

    // Read depth cannot exceed the document.
    const totalPages = dto.totalPages ?? view.totalPages ?? null;
    const pagesRead =
      dto.pagesRead != null && totalPages != null
        ? Math.min(dto.pagesRead, totalPages)
        : dto.pagesRead;

    const closed = await this.repository.closeContentView({
      viewId: dto.viewId,
      durationSec,
      pagesRead,
      totalPages,
    });

    // Credit a PDF read once per document per day.
    //
    // Deliberately not gated on dwell time: clamping against elapsed seconds
    // legitimately yields 0 for a quick open, and "no measurable dwell" is not
    // the same as "didn't read it". The anti-gaming guard belongs on repeat
    // crediting instead — reopening the same file ten times is still one read,
    // which is what `alreadyCredited` enforces.
    if (view.type === 'PDF') {
      const day = toLocalDay(view.openedAt, 0);

      const alreadyCredited = await this.repository.hasCreditedContentToday({
        userId,
        contentId: view.contentId,
        day,
        excludeViewId: view.id,
      });

      if (!alreadyCredited) {
        await this.repository.incrementDailyActivity(userId, day, {
          pdfsOpened: 1,
          pointsEarned: POINTS.PDF_READ,
        });
        await this.repository.incrementStatTotals(userId, {
          points: POINTS.PDF_READ,
        });
      }
    }

    return {
      message: 'Content view recorded',
      data: {
        viewId: closed.id,
        durationSec: closed.durationSec,
        pagesRead: closed.pagesRead,
        totalPages: closed.totalPages,
      },
    };
  }

  // ============================================
  // Study sessions
  // ============================================

  /**
   * Opens a session, or returns the one already open.
   *
   * Reuse matters: backgrounding and foregrounding the app repeatedly would
   * otherwise open overlapping sessions that each count the same minutes.
   */
  async startSession(userId: string, dto: StartSessionDto) {
    const tzOffsetMinutes = normalizeTzOffset(dto.tzOffsetMinutes);

    const open = await this.repository.findOpenSession(userId);

    if (open) {
      const idleSec = Math.floor(
        (Date.now() - open.lastHeartbeatAt.getTime()) / 1000,
      );

      if (idleSec <= SESSION_IDLE_TIMEOUT_SEC) {
        await this.repository.touchSession(open.id);
        return {
          message: 'Resumed existing session',
          data: { sessionId: open.id, resumed: true },
        };
      }

      // Stale: close it at its last heartbeat, crediting only the time we can
      // actually vouch for, then start fresh.
      await this.finalizeSession(open, open.lastHeartbeatAt, false);
    }

    const session = await this.repository.createSession(
      userId,
      tzOffsetMinutes,
    );

    return {
      message: 'Session started',
      data: { sessionId: session.id, resumed: false },
    };
  }

  async heartbeat(userId: string, dto: HeartbeatDto) {
    const session = await this.assertOwnSession(userId, dto.sessionId);

    if (session.endedAt) {
      return {
        message: 'Session already ended',
        data: { sessionId: session.id, active: false },
      };
    }

    await this.repository.touchSession(session.id);

    // Credit the time elapsed so far, rather than waiting for the session to
    // close. A student studying right now should see today's minutes climb;
    // before this, a session that was never cleanly ended credited nothing at
    // all, so the week chart and heat map stayed empty despite real study.
    const creditedSec = await this.creditElapsed(session, new Date());

    return {
      message: 'Heartbeat recorded',
      data: { sessionId: session.id, active: true, creditedSec },
    };
  }

  /**
   * Banks study time up to [asOf], counting only what has not been banked yet.
   *
   * Shared by the heartbeat, the client-sent end and the idle sweep, so all
   * three roads to crediting a session obey the same watermark and cannot
   * double-count the same seconds.
   */
  private async creditElapsed(
    session: {
      id: string;
      userId: string;
      startedAt: Date;
      tzOffsetMinutes: number;
    },
    asOf: Date,
  ) {
    const rawSec = Math.floor(
      (asOf.getTime() - session.startedAt.getTime()) / 1000,
    );
    const elapsedSec = Math.max(0, Math.min(rawSec, SESSION_MAX_DURATION_SEC));

    const addedSec = await this.repository.creditSessionTime(
      session.id,
      elapsedSec,
    );

    if (addedSec > 0) {
      const day = toLocalDay(session.startedAt, session.tzOffsetMinutes);

      await this.repository.incrementDailyActivity(session.userId, day, {
        studySeconds: addedSec,
      });
      await this.repository.incrementStatTotals(session.userId, {
        studySeconds: addedSec,
      });
      await this.updateStreak(session.userId, day);
    }

    return addedSec;
  }

  async endSession(userId: string, dto: EndSessionDto) {
    const session = await this.assertOwnSession(userId, dto.sessionId);

    if (session.endedAt) {
      return {
        message: 'Session already ended',
        data: { sessionId: session.id, durationSec: session.durationSec },
      };
    }

    const result = await this.finalizeSession(session, new Date(), true);

    return {
      message: 'Session ended',
      data: { sessionId: session.id, durationSec: result.durationSec },
    };
  }

  /**
   * Closes out a session and credits its time to the student's local day.
   *
   * Duration is clamped so neither a runaway client nor a clock skew can bank
   * an implausible number of study hours.
   */
  private async finalizeSession(
    session: {
      id: string;
      userId: string;
      startedAt: Date;
      tzOffsetMinutes: number;
    },
    endedAt: Date,
    closedByClient: boolean,
  ) {
    const rawSec = Math.floor(
      (endedAt.getTime() - session.startedAt.getTime()) / 1000,
    );
    const durationSec = Math.max(0, Math.min(rawSec, SESSION_MAX_DURATION_SEC));

    if (rawSec > SESSION_MAX_DURATION_SEC) {
      this.logger.warn(
        `Session ${session.id} ran ${rawSec}s; capped at ${SESSION_MAX_DURATION_SEC}s`,
      );
    }

    // Credit before closing, and only the part not already banked by
    // heartbeats. Crediting the full duration here would count every second
    // twice for any session that sent a heartbeat.
    await this.creditElapsed(session, endedAt);

    await this.repository.closeSession({
      sessionId: session.id,
      endedAt,
      durationSec,
      closedByClient,
    });

    return { durationSec };
  }

  /**
   * Closes sessions abandoned without an end call.
   *
   * Without this, a force-quit leaves a session open forever and its time is
   * never credited — or worse, is credited in full whenever it is finally
   * noticed.
   *
   * Runs every minute. The cutoff is the idle timeout, so a session is only
   * closed once it has missed several heartbeats, and it is closed *at its
   * last heartbeat* — the app being killed at 15:58 credits time up to 15:58,
   * never up to whenever the sweep happened to notice.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async sweepStaleSessions() {
    const cutoff = new Date(Date.now() - SESSION_IDLE_TIMEOUT_SEC * 1000);
    const stale = await this.repository.findStaleSessions(cutoff);

    for (const session of stale) {
      // One bad session must not stop the rest from being closed.
      try {
        await this.finalizeSession(session, session.lastHeartbeatAt, false);
      } catch (error) {
        this.logger.error(
          `Failed to sweep session ${session.id}: ${String(error)}`,
        );
      }
    }

    if (stale.length > 0) {
      this.logger.log(`Swept ${stale.length} stale session(s)`);
    }

    return { message: 'Stale sessions swept', data: { closed: stale.length } };
  }

  // ============================================
  // Shared helpers
  // ============================================

  /** Recomputes the streak from the day this activity belongs to. */
  private async updateStreak(userId: string, activityDay: Date) {
    const stats = await this.repository.findStats(userId);

    const streak = nextStreak(
      stats?.lastActiveDate ?? null,
      activityDay,
      stats?.currentStreak ?? 0,
    );

    const longest = Math.max(streak, stats?.longestStreak ?? 0);

    // Never rewind lastActiveDate: a late-arriving event for an earlier day
    // must not make a student look less recently active than they are.
    const lastActiveDate =
      stats?.lastActiveDate && stats.lastActiveDate > activityDay
        ? stats.lastActiveDate
        : activityDay;

    await this.repository.upsertStats(userId, {
      currentStreak: streak,
      longestStreak: longest,
      lastActiveDate,
    });
  }

  /** Loads content and confirms the student is enrolled in its course. */
  private async assertAccessibleContent(userId: string, contentId: string) {
    const content = await this.repository.getContentWithCourse(contentId);

    if (!content) {
      throw new NotFoundException('Content not found');
    }

    const courseId = content.section.course.id;
    const enrolled = await this.repository.isEnrolled(userId, courseId);

    if (!enrolled) {
      throw new ForbiddenException('You are not enrolled in this course');
    }

    return content;
  }

  private async assertOwnSession(userId: string, sessionId: string) {
    const session = await this.repository.findOpenSessionById(sessionId);

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.userId !== userId) {
      throw new ForbiddenException('This session belongs to another student');
    }

    return session;
  }
}
