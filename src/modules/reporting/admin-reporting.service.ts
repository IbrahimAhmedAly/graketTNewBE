import { Injectable, NotFoundException } from '@nestjs/common';
import { ReportingRepository } from './repositories/reporting.repository';
import { ReportingService } from './reporting.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionsService } from './student-profile/subscriptions.service';
import {
  addDays,
  effectiveStreak,
  toLocalDay,
} from '../tracking/utils/local-day.util';

/** Months of history behind the monthly activity chart. */
const MONTHLY_WINDOW_MONTHS = 12;

/**
 * Admin-facing reporting.
 *
 * Deliberately reuses ReportingService for anything a student also sees, so
 * the two views cannot drift — an admin and a student looking at the same
 * course must never be shown different completion figures.
 */
@Injectable()
export class AdminReportingService {
  constructor(
    private readonly repository: ReportingRepository,
    private readonly reportingService: ReportingService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Everything known about one student's activity.
   */
  async getStudentReport(userId: string) {
    const user = await this.repository.findUser(userId);
    if (!user) throw new NotFoundException('Student not found');

    const today = toLocalDay(new Date(), 0);

    const [
      dashboard,
      quizAnalytics,
      watchProgress,
      views,
      sessions,
      stats,
      subscriptions,
      ranking,
      documentTotals,
      monthlyDays,
    ] = await Promise.all([
      this.reportingService.getStudentDashboard(userId, 0),
      this.reportingService.getQuizAnalytics(userId),
      this.repository.findWatchProgress(userId),
      this.repository.findContentViews(userId, 100),
      this.repository.findSessions(userId, undefined, 20),
      this.repository.findStats(userId),
      this.subscriptionsService.getSubscriptions(userId),
      // Admins see the raw position; students deliberately never do.
      this.reportingService.computeRanking(userId, user.grade?.id ?? null),
      // Open counts come from a grouped aggregate, not from `views` above,
      // which is capped and would silently undercount an active student.
      this.repository.groupContentViewCounts(userId, 'PDF'),
      this.repository.findDailyActivitySince(
        userId,
        addDays(today, -(MONTHLY_WINDOW_MONTHS * 31)),
      ),
    ]);

    // Titles for the per-video and per-document breakdowns.
    const contentIds = [
      ...new Set([
        ...watchProgress.map((w) => w.contentId),
        ...views.map((v) => v.contentId),
        ...documentTotals.map((d) => d.contentId),
      ]),
    ];

    const contents = await this.prisma.content.findMany({
      where: { id: { in: contentIds } },
      select: {
        id: true,
        title: true,
        type: true,
        section: {
          select: { title: true, course: { select: { id: true, title: true } } },
        },
      },
    });
    const contentById = new Map(contents.map((c) => [c.id, c]));

    const lastSession = sessions[0] ?? null;

    return {
      message: 'Student report retrieved',
      data: {
        profile: {
          id: user.id,
          name: user.name,
          email: user.email,
          serial: user.serial,
          parentPhone: user.parentPhone,
          educationLevel: user.educationLevel?.name ?? null,
          grade: user.grade?.name ?? null,
          joinedAt: user.createdAt,
          lastLoginAt: user.lastLoginAt,
        },

        activity: {
          totalStudySeconds: stats?.totalStudySeconds ?? 0,
          totalStudyHours:
            Math.round(((stats?.totalStudySeconds ?? 0) / 3600) * 10) / 10,
          currentStreak: effectiveStreak(
            stats?.currentStreak ?? 0,
            stats?.lastActiveDate ?? null,
            today,
          ),
          longestStreak: stats?.longestStreak ?? 0,
          totalPoints: stats?.totalPoints ?? 0,
          lastSessionAt: lastSession?.startedAt ?? null,
          lastSessionSeconds: lastSession?.durationSec ?? null,
          sessionsRecorded: sessions.length,
        },

        overview: dashboard.data.overview,
        successIndex: dashboard.data.successIndex,
        subjects: dashboard.data.subjects,
        weeklyActivity: dashboard.data.weeklyActivity,
        heatmap: dashboard.data.heatmap,
        quizAnalytics: quizAnalytics.data,

        // Per-video detail: what admins asked for — watch %, where they
        // stopped, and how often they replayed it.
        videoBreakdown: watchProgress
          .map((w) => {
            const content = contentById.get(w.contentId);
            return {
              contentId: w.contentId,
              title: content?.title ?? 'Unknown',
              course: content?.section?.course?.title ?? null,
              watchPercent: w.watchPercent,
              watchedSeconds: w.watchedSeconds,
              durationSec: w.durationSec,
              lastPositionSec: w.lastPositionSec,
              replayCount: w.replayCount,
              completed: !!w.completedAt,
              lastWatchedAt: w.lastWatchedAt,
            };
          })
          .sort((a, b) => b.watchPercent - a.watchPercent),

        // Per-document detail, including how far they read.
        //
        // Built from a grouped aggregate rather than from the capped `views`
        // list: "opened 100 times" and "opened 400 times" must not collapse
        // into the same figure just because the query had a ceiling.
        documentBreakdown: documentTotals
          .map((row) => {
            const content = contentById.get(row.contentId);
            const deepest = row._max.pagesRead ?? 0;
            const totalPages = row._max.totalPages ?? null;

            return {
              contentId: row.contentId,
              title: content?.title ?? 'Unknown',
              course: content?.section?.course?.title ?? null,
              timesOpened: row._count._all,
              totalSeconds: row._sum.durationSec ?? 0,
              pagesRead: deepest,
              totalPages,
              // Null, not 0, when the viewer never reported a page count —
              // "we don't know how long the document is" is not "they read
              // none of it".
              readPercent:
                totalPages && totalPages > 0
                  ? Math.round((deepest * 100) / totalPages)
                  : null,
              lastOpenedAt: row._max.openedAt ?? null,
            };
          })
          .sort((a, b) => b.timesOpened - a.timesOpened),

        // Courses the student is subscribed to. Summary only — the full
        // enrollment and purchase lists have their own endpoint.
        subscriptions: subscriptions.data.summary,

        ranking,

        monthlyActivity: this.buildMonthlyActivity(monthlyDays, today),

        // Recent activity timeline, newest first.
        timeline: this.buildTimeline(views, sessions, contentById),

        sessions: sessions.map((s) => ({
          startedAt: s.startedAt,
          endedAt: s.endedAt,
          durationSec: s.durationSec,
          // False means the session was closed by the idle sweep rather than
          // by the app — useful when a duration looks surprising.
          closedByClient: s.closedByClient,
        })),
      },
    };
  }

  /**
   * Platform-wide figures for the admin overview.
   *
   * Replaces the hard-coded numbers the dashboard shipped with. Every value
   * here is a real count; where there is nothing to average, the field is null
   * rather than a flattering zero.
   */
  async getPlatformOverview() {
    const today = toLocalDay(new Date(), 0);
    const weekAgo = new Date(today.getTime() - 7 * 86_400_000);
    const monthAgo = new Date(today.getTime() - 30 * 86_400_000);

    const [
      totalStudents,
      activeStudents,
      totalCourses,
      publishedCourses,
      totalInstructors,
      activeEnrollments,
      completedEnrollments,
      quizAttempts,
      activeThisWeek,
      studySum,
      enrollmentProgress,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { status: 'ACTIVE' } }),
      this.prisma.course.count(),
      this.prisma.course.count({ where: { isPublished: true } }),
      this.prisma.instructor.count(),
      // SAVED is the wishlist, not an enrollment.
      this.prisma.enrollment.count({ where: { status: 'ONGOING' } }),
      this.prisma.enrollment.count({ where: { status: 'COMPLETED' } }),
      this.prisma.quizAttempt.aggregate({
        _count: { _all: true },
        _avg: { score: true },
      }),
      this.prisma.dailyActivity.findMany({
        where: { date: { gte: weekAgo } },
        select: { userId: true },
        distinct: ['userId'],
      }),
      this.prisma.dailyActivity.aggregate({
        where: { date: { gte: monthAgo } },
        _sum: { studySeconds: true },
      }),
      this.prisma.enrollment.aggregate({
        where: { status: { not: 'SAVED' } },
        _avg: { progress: true },
      }),
    ]);

    const dailyTrend = await this.prisma.dailyActivity.groupBy({
      by: ['date'],
      where: { date: { gte: monthAgo } },
      _sum: { studySeconds: true, videosWatched: true, quizzesTaken: true },
      orderBy: { date: 'asc' },
    });

    return {
      message: 'Platform overview retrieved',
      data: {
        students: {
          total: totalStudents,
          active: activeStudents,
          activeThisWeek: activeThisWeek.length,
        },
        courses: { total: totalCourses, published: publishedCourses },
        instructors: { total: totalInstructors },
        enrollments: {
          ongoing: activeEnrollments,
          completed: completedEnrollments,
          // Null when nobody is enrolled — an average over nothing is not 0%.
          averageProgress:
            enrollmentProgress._avg.progress !== null
              ? Math.round(enrollmentProgress._avg.progress)
              : null,
        },
        quizzes: {
          totalAttempts: quizAttempts._count._all,
          averageScore:
            quizAttempts._avg.score !== null
              ? Math.round(quizAttempts._avg.score)
              : null,
        },
        study: {
          totalHoursLast30Days:
            Math.round(((studySum._sum.studySeconds ?? 0) / 3600) * 10) / 10,
        },
        dailyTrend: dailyTrend.map((d) => ({
          date: d.date.toISOString().slice(0, 10),
          studyMinutes: Math.round((d._sum.studySeconds ?? 0) / 60),
          videos: d._sum.videosWatched ?? 0,
          quizzes: d._sum.quizzesTaken ?? 0,
        })),
      },
    };
  }

  /**
   * Daily rollups aggregated into calendar months, oldest first.
   *
   * Zero-filled across the whole window: a month with no activity must render
   * as an empty bar rather than be dropped, which would compress the axis and
   * make a three-month gap look like continuous study.
   *
   * Seconds are accumulated and converted to minutes once at the end. Rounding
   * each day before summing would drift by up to half a minute per active day —
   * around a quarter-hour across a busy month.
   */
  private buildMonthlyActivity(
    days: Awaited<ReturnType<ReportingRepository['findDailyActivitySince']>>,
    today: Date,
  ) {
    const buckets = new Map<
      string,
      {
        month: string;
        studySeconds: number;
        videos: number;
        quizzes: number;
        pdfsOpened: number;
        activeDays: number;
      }
    >();

    for (let i = MONTHLY_WINDOW_MONTHS - 1; i >= 0; i--) {
      const start = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - i, 1),
      );
      const month = start.toISOString().slice(0, 7);

      buckets.set(month, {
        month,
        studySeconds: 0,
        videos: 0,
        quizzes: 0,
        pdfsOpened: 0,
        activeDays: 0,
      });
    }

    for (const day of days) {
      const bucket = buckets.get(day.date.toISOString().slice(0, 7));

      // Older than the window. The query reaches back a little further than 12
      // months because months are uneven, so a few such rows are expected.
      if (!bucket) continue;

      bucket.studySeconds += day.studySeconds;
      bucket.videos += day.videosWatched;
      bucket.quizzes += day.quizzesTaken;
      bucket.pdfsOpened += day.pdfsOpened;

      if (
        day.studySeconds > 0 ||
        day.videosWatched > 0 ||
        day.quizzesTaken > 0 ||
        day.pdfsOpened > 0
      ) {
        bucket.activeDays += 1;
      }
    }

    return [...buckets.values()].map(({ studySeconds, ...rest }) => ({
      ...rest,
      studyMinutes: Math.round(studySeconds / 60),
    }));
  }

  /** Interleaves views and sessions into one reverse-chronological feed. */
  private buildTimeline(
    views: Awaited<ReturnType<ReportingRepository['findContentViews']>>,
    sessions: Awaited<ReturnType<ReportingRepository['findSessions']>>,
    contentById: Map<string, { title: string; type: string }>,
  ) {
    const events: {
      type: string;
      at: Date;
      label: string;
      detail: string | null;
    }[] = [];

    for (const view of views.slice(0, 40)) {
      const content = contentById.get(view.contentId);
      events.push({
        type: view.type.toLowerCase(),
        at: view.openedAt,
        label: content?.title ?? 'Unknown content',
        detail:
          view.durationSec > 0
            ? `${Math.round(view.durationSec / 60)} min`
            : null,
      });
    }

    for (const session of sessions.slice(0, 20)) {
      events.push({
        type: 'session',
        at: session.startedAt,
        label: 'Study session',
        detail: session.durationSec
          ? `${Math.round(session.durationSec / 60)} min`
          : null,
      });
    }

    return events
      .sort((a, b) => b.at.getTime() - a.at.getTime())
      .slice(0, 50);
  }
}
