import { Injectable, NotFoundException } from '@nestjs/common';
import { ReportingRepository } from './repositories/reporting.repository';
import {
  calculateSuccessIndex,
  percentileBand,
  successBand,
  SuccessIndexInputs,
} from './utils/success-index.util';
import {
  addDays,
  effectiveStreak,
  formatDay,
  toLocalDay,
} from '../tracking/utils/local-day.util';

/** Days of history behind the weekly chart. */
const WEEKLY_WINDOW_DAYS = 7;

/** Days shown on the activity heat map. */
const HEATMAP_WINDOW_DAYS = 30;

/** Window over which daily commitment is judged for the Success Index. */
const COMMITMENT_WINDOW_DAYS = 30;

/** A video is counted watched at this share, matching ingestion. */
const VIDEO_COMPLETE_THRESHOLD = 90;

/**
 * Playback that satisfies today's "watch a lecture" task.
 *
 * Deliberately far below a full video: the task should reward showing up and
 * studying today, which is what a daily mission is for, not finishing a
 * two-hour lecture in one sitting.
 */
const MISSION_WATCH_SECONDS = 5 * 60;

/** Minimum attempts on a topic before it is called out as weak. */
const MIN_ATTEMPTS_FOR_WEAK_TOPIC = 3;

/** Accuracy at or below which a topic is suggested for review. */
const WEAK_TOPIC_ACCURACY_THRESHOLD = 60;

@Injectable()
export class ReportingService {
  constructor(private readonly repository: ReportingRepository) {}

  /**
   * The student's full dashboard.
   *
   * Assembled in one call because the sections share the same underlying rows;
   * fetching them per-section would issue the same queries repeatedly.
   */
  async getStudentDashboard(userId: string, tzOffsetMinutes = 0) {
    const user = await this.repository.findUser(userId);
    if (!user) throw new NotFoundException('Student not found');

    const today = toLocalDay(new Date(), tzOffsetMinutes);

    const [enrollments, watchProgress, attempts, stats, dailyRange] =
      await Promise.all([
        this.repository.findActiveEnrollments(userId),
        this.repository.findWatchProgress(userId),
        this.repository.findQuizAttempts(userId),
        this.repository.findStats(userId),
        this.repository.findDailyActivity(
          userId,
          addDays(today, -(COMMITMENT_WINDOW_DAYS - 1)),
          today,
        ),
      ]);

    const courseIds = enrollments.map((e) => e.courseId);
    const contents = await this.repository.findCourseContents(courseIds);
    const contentIds = contents.map((c) => c.id);
    const progress = await this.repository.findProgressForContents(
      userId,
      contentIds,
    );

    const completedContentIds = new Set(
      progress.filter((p) => p.completed).map((p) => p.contentId),
    );

    const overview = this.buildOverview({
      contents,
      completedContentIds,
      watchProgress,
      attempts,
      dailyRange,
      stats,
      today,
    });

    const subjects = this.buildSubjectProgress({
      enrollments,
      contents,
      completedContentIds,
    });

    const successIndex = await this.computeAndPersistSuccessIndex({
      userId,
      watchProgress,
      attempts,
      dailyRange,
      subjects,
    });

    const ranking = await this.buildRanking(userId, user.grade?.id ?? null);

    return {
      message: 'Dashboard retrieved',
      data: {
        student: {
          id: user.id,
          name: user.name,
          educationLevel: user.educationLevel?.name ?? null,
          grade: user.grade?.name ?? null,
          today: formatDay(today),
        },
        overview,
        circularProgress: {
          percent: overview.overallProgressPercent,
          label: 'Completed',
        },
        subjects,
        weeklyActivity: this.buildWeeklyActivity(dailyRange, today),
        heatmap: this.buildHeatmap(dailyRange, today),
        successIndex,
        ranking,
      },
    };
  }

  // ============================================
  // Section 2 — progress overview
  // ============================================

  private buildOverview(params: {
    contents: Awaited<ReturnType<ReportingRepository['findCourseContents']>>;
    completedContentIds: Set<string>;
    watchProgress: Awaited<ReturnType<ReportingRepository['findWatchProgress']>>;
    attempts: Awaited<ReturnType<ReportingRepository['findQuizAttempts']>>;
    dailyRange: Awaited<ReturnType<ReportingRepository['findDailyActivity']>>;
    stats: Awaited<ReturnType<ReportingRepository['findStats']>>;
    today: Date;
  }) {
    const {
      contents,
      completedContentIds,
      watchProgress,
      attempts,
      dailyRange,
      stats,
      today,
    } = params;

    const videos = contents.filter((c) => c.type === 'VIDEO');
    const pdfs = contents.filter((c) => c.type === 'PDF');

    const watchByContent = new Map(watchProgress.map((w) => [w.contentId, w]));

    // A video counts as watched when it is either marked complete or watched
    // past the threshold — the two can diverge, since a student may mark a
    // lesson done without playing it to the end.
    const videosWatched = videos.filter((v) => {
      const watch = watchByContent.get(v.id);
      return (
        completedContentIds.has(v.id) ||
        (watch?.watchPercent ?? 0) >= VIDEO_COMPLETE_THRESHOLD
      );
    }).length;

    // Videos actually played past the threshold, ignoring the manual "mark as
    // complete" flag. Reported alongside videosWatched because the two answer
    // different questions: a student who ticks every lesson without playing
    // them has videosWatched = all, videosActuallyWatched = 0. Showing only the
    // first would let the dashboard claim a student watched everything while
    // the Success Index — which scores real playback — reads zero.
    const videosActuallyWatched = videos.filter(
      (v) =>
        (watchByContent.get(v.id)?.watchPercent ?? 0) >=
        VIDEO_COMPLETE_THRESHOLD,
    ).length;

    const videoSeconds = dailyRange.reduce(
      (sum, d) => sum + (d.videoSeconds ?? 0),
      0,
    );

    const pdfsOpened = pdfs.filter((p) => completedContentIds.has(p.id)).length;

    const totalContents = contents.length;
    const completedContents = contents.filter((c) =>
      completedContentIds.has(c.id),
    ).length;

    const scores = attempts.map((a) => a.score);
    const totalStudySeconds = dailyRange.reduce(
      (sum, d) => sum + d.studySeconds,
      0,
    );

    return {
      overallProgressPercent: this.percent(completedContents, totalContents),
      videosWatched,
      videosActuallyWatched,
      videosRemaining: Math.max(0, videos.length - videosWatched),
      totalVideos: videos.length,
      videoSeconds,
      pdfsOpened,
      totalPdfs: pdfs.length,
      quizzesTaken: attempts.length,
      // Null rather than 0 when nothing has been attempted: "no average" and
      // "averaged zero" are different claims about a student.
      averageQuizScore: scores.length ? this.mean(scores) : null,
      studyHours: Math.round((totalStudySeconds / 3600) * 10) / 10,
      studySeconds: totalStudySeconds,
      currentStreak: effectiveStreak(
        stats?.currentStreak ?? 0,
        stats?.lastActiveDate ?? null,
        today,
      ),
      longestStreak: stats?.longestStreak ?? 0,
      totalPoints: stats?.totalPoints ?? 0,
    };
  }

  // ============================================
  // Section 4 — per-subject progress
  // ============================================

  private buildSubjectProgress(params: {
    enrollments: Awaited<
      ReturnType<ReportingRepository['findActiveEnrollments']>
    >;
    contents: Awaited<ReturnType<ReportingRepository['findCourseContents']>>;
    completedContentIds: Set<string>;
  }) {
    const { enrollments, contents, completedContentIds } = params;

    const byCourse = new Map<string, { total: number; done: number }>();
    for (const content of contents) {
      const courseId = content.section.courseId;
      const bucket = byCourse.get(courseId) ?? { total: 0, done: 0 };
      bucket.total += 1;
      if (completedContentIds.has(content.id)) bucket.done += 1;
      byCourse.set(courseId, bucket);
    }

    return enrollments.map((enrollment) => {
      const counts = byCourse.get(enrollment.courseId) ?? { total: 0, done: 0 };

      return {
        courseId: enrollment.courseId,
        title: enrollment.course.title,
        thumbnail: enrollment.course.thumbnail,
        category: enrollment.course.category?.name ?? null,
        totalContents: counts.total,
        completedContents: counts.done,
        // Derived from actual content completion rather than the denormalized
        // Enrollment.progress, which can drift if content is added later.
        progressPercent: this.percent(counts.done, counts.total),
        status: enrollment.status,
      };
    });
  }

  // ============================================
  // Sections 5 & 6 — weekly chart and heat map
  // ============================================

  private buildWeeklyActivity(
    daily: Awaited<ReturnType<ReportingRepository['findDailyActivity']>>,
    today: Date,
  ) {
    const byDay = new Map(daily.map((d) => [formatDay(d.date), d]));
    const days: {
      date: string;
      studyMinutes: number;
      videos: number;
      quizzes: number;
    }[] = [];

    // Zero-filled so a quiet day renders as an empty bar rather than being
    // dropped, which would silently compress the axis.
    for (let i = WEEKLY_WINDOW_DAYS - 1; i >= 0; i--) {
      const day = addDays(today, -i);
      const key = formatDay(day);
      const row = byDay.get(key);

      days.push({
        date: key,
        studyMinutes: row ? Math.round(row.studySeconds / 60) : 0,
        videos: row?.videosWatched ?? 0,
        quizzes: row?.quizzesTaken ?? 0,
      });
    }

    return days;
  }

  private buildHeatmap(
    daily: Awaited<ReturnType<ReportingRepository['findDailyActivity']>>,
    today: Date,
  ) {
    const byDay = new Map(daily.map((d) => [formatDay(d.date), d]));
    const cells: { date: string; studyMinutes: number; level: number }[] = [];

    for (let i = HEATMAP_WINDOW_DAYS - 1; i >= 0; i--) {
      const day = addDays(today, -i);
      const key = formatDay(day);
      const minutes = Math.round((byDay.get(key)?.studySeconds ?? 0) / 60);

      // Fixed thresholds rather than relative-to-peak shading: a student's
      // quiet week should look quiet, not get rescaled into looking busy.
      let level = 0;
      if (minutes > 0) level = 1;
      if (minutes >= 15) level = 2;
      if (minutes >= 45) level = 3;
      if (minutes >= 90) level = 4;

      cells.push({ date: key, studyMinutes: minutes, level });
    }

    return cells;
  }

  // ============================================
  // Section 7 — quiz analytics
  // ============================================

  async getQuizAnalytics(userId: string) {
    const attempts = await this.repository.findQuizAttempts(userId);

    if (attempts.length === 0) {
      return {
        message: 'No quiz attempts yet',
        data: {
          totalAttempts: 0,
          averageScore: null,
          highestScore: null,
          lowestScore: null,
          passRate: null,
          weakestSubject: null,
          weakestLesson: null,
          recentAttempts: [],
        },
      };
    }

    const scores = attempts.map((a) => a.score);

    // Weakest subject/lesson by mean score, not by count of failures: a course
    // with more quizzes would otherwise always look like the weakest.
    const byCourse = new Map<string, { title: string; scores: number[] }>();
    const byLesson = new Map<string, { title: string; scores: number[] }>();

    for (const attempt of attempts) {
      const course = attempt.quiz?.content?.section?.course;
      const lesson = attempt.quiz?.content;

      if (course) {
        const bucket = byCourse.get(course.id) ?? {
          title: course.title,
          scores: [],
        };
        bucket.scores.push(attempt.score);
        byCourse.set(course.id, bucket);
      }

      if (lesson) {
        const bucket = byLesson.get(lesson.id) ?? {
          title: lesson.title,
          scores: [],
        };
        bucket.scores.push(attempt.score);
        byLesson.set(lesson.id, bucket);
      }
    }

    return {
      message: 'Quiz analytics retrieved',
      data: {
        totalAttempts: attempts.length,
        averageScore: this.mean(scores),
        highestScore: Math.max(...scores),
        lowestScore: Math.min(...scores),
        passRate: this.percent(
          attempts.filter((a) => a.passed).length,
          attempts.length,
        ),
        weakestSubject: this.lowestMean(byCourse),
        weakestLesson: this.lowestMean(byLesson),
        recentAttempts: attempts.slice(0, 10).map((a) => ({
          attemptId: a.id,
          lesson: a.quiz?.content?.title ?? null,
          course: a.quiz?.content?.section?.course?.title ?? null,
          score: a.score,
          passed: a.passed,
          timeTakenSec: a.timeTaken,
          takenAt: a.createdAt,
        })),
      },
    };
  }

  // ============================================
  // Section 8 — study suggestions
  // ============================================

  /**
   * Topics worth revisiting, derived from wrong answers.
   *
   * Presented as suggestions rather than conclusions. The underlying signal is
   * a simple accuracy rate over a handful of questions, which is a thin basis
   * for telling a student they are "weak" at something — so the response
   * carries the evidence (attempts, accuracy) and the UI labels it as advice.
   */
  async getStudySuggestions(userId: string) {
    const answers = await this.repository.findUserAnswers(userId);

    if (answers.length === 0) {
      return {
        message: 'No quiz history yet',
        data: {
          basis: 'none',
          suggestions: [],
          note: 'Answer some quiz questions to get study suggestions.',
        },
      };
    }

    // Group by explicit topic when tagged, otherwise by lesson. Untagged
    // content still produces a usable report, just at coarser granularity.
    const tagged = answers.filter((a) => !!a.question.topic);
    const useTopics = tagged.length >= MIN_ATTEMPTS_FOR_WEAK_TOPIC;
    const source = useTopics ? tagged : answers;

    const groups = new Map<
      string,
      { label: string; correct: number; total: number; courseTitle?: string }
    >();

    for (const answer of source) {
      const content = answer.question.quiz?.content;
      const key = useTopics
        ? (answer.question.topic as string)
        : (content?.id ?? 'unknown');
      const label = useTopics
        ? (answer.question.topic as string)
        : (content?.title ?? 'Unknown lesson');

      const bucket = groups.get(key) ?? {
        label,
        correct: 0,
        total: 0,
        courseTitle: content?.section?.course?.title,
      };
      bucket.total += 1;
      if (answer.isCorrect) bucket.correct += 1;
      groups.set(key, bucket);
    }

    const suggestions = [...groups.values()]
      // Require a minimum sample: one wrong answer is noise, not a weakness.
      .filter((g) => g.total >= MIN_ATTEMPTS_FOR_WEAK_TOPIC)
      .map((g) => ({
        label: g.label,
        course: g.courseTitle ?? null,
        accuracy: this.percent(g.correct, g.total),
        questionsAnswered: g.total,
        questionsCorrect: g.correct,
      }))
      .filter((g) => g.accuracy <= WEAK_TOPIC_ACCURACY_THRESHOLD)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 5);

    return {
      message: 'Study suggestions retrieved',
      data: {
        basis: useTopics ? 'topic' : 'lesson',
        suggestions,
        note: suggestions.length
          ? 'Based on your quiz answers. These are areas where revisiting the material may help.'
          : 'No weak areas stand out yet — keep going.',
      },
    };
  }

  // ============================================
  // Section 9 — Success Index
  // ============================================

  private async computeAndPersistSuccessIndex(params: {
    userId: string;
    watchProgress: Awaited<ReturnType<ReportingRepository['findWatchProgress']>>;
    attempts: Awaited<ReturnType<ReportingRepository['findQuizAttempts']>>;
    dailyRange: Awaited<ReturnType<ReportingRepository['findDailyActivity']>>;
    subjects: { progressPercent: number }[];
  }) {
    const { userId, watchProgress, attempts, dailyRange, subjects } = params;

    const started = watchProgress.filter((w) => w.watchedSeconds > 0);
    const activeDays = dailyRange.filter(
      (d) => d.studySeconds > 0 || d.videosWatched > 0 || d.quizzesTaken > 0,
    ).length;

    const inputs: SuccessIndexInputs = {
      avgVideoWatchPercent: started.length
        ? this.mean(started.map((w) => w.watchPercent))
        : 0,
      videosStarted: started.length,
      avgQuizScore: attempts.length
        ? this.mean(attempts.map((a) => a.score))
        : 0,
      quizzesTaken: attempts.length,
      activeDaysInWindow: activeDays,
      commitmentWindowDays: COMMITMENT_WINDOW_DAYS,
      avgCourseCompletion: subjects.length
        ? this.mean(subjects.map((s) => s.progressPercent))
        : 0,
      enrolledCourses: subjects.length,
    };

    const breakdown = calculateSuccessIndex(inputs);

    // Persisted so ranking can compare students without recomputing the index
    // for the whole cohort on every request.
    await this.repository.updateSuccessIndex(userId, breakdown.score);

    return {
      score: breakdown.score,
      band: successBand(breakdown.score),
      reason: breakdown.reason ?? null,
      components: breakdown.components,
    };
  }

  // ============================================
  // Section 10 — ranking
  // ============================================

  private async buildRanking(userId: string, gradeId: string | null) {
    const cohort = await this.repository.findCohortStats(gradeId);
    const index = cohort.findIndex((c) => c.userId === userId);

    if (index === -1) {
      return {
        available: false,
        reason: 'Not enough activity to be ranked yet',
        cohortSize: cohort.length,
        band: null,
        percentile: null,
      };
    }

    const rank = index + 1;
    const band = percentileBand(rank, cohort.length);

    if (!band) {
      return {
        available: false,
        reason: 'Cohort is too small to rank meaningfully',
        cohortSize: cohort.length,
        band: null,
        percentile: null,
      };
    }

    // Deliberately no raw position. See percentileBand for the reasoning.
    return {
      available: true,
      cohortSize: cohort.length,
      band: band.label,
      percentile: band.percentile,
      scope: gradeId ? 'grade' : 'all students',
    };
  }

  // ============================================
  // Section 11 — rewards
  // ============================================

  async getRewards(userId: string) {
    const [stats, earned, catalogue] = await Promise.all([
      this.repository.findStats(userId),
      this.repository.findEarnedBadges(userId),
      this.repository.findActiveBadges(),
    ]);

    const earnedIds = new Set(earned.map((e) => e.badgeId));
    const points = stats?.totalPoints ?? 0;

    // The next badge the student can reach, by point cost.
    const nextBadge =
      catalogue
        .filter((b) => !earnedIds.has(b.id) && b.points > points)
        .sort((a, b) => a.points - b.points)[0] ?? null;

    return {
      message: 'Rewards retrieved',
      data: {
        totalPoints: points,
        badgesEarned: earned.length,
        badgesAvailable: catalogue.length,
        latestBadge: earned[0]
          ? {
              code: earned[0].badge.code,
              name: earned[0].badge.name,
              description: earned[0].badge.description,
              icon: earned[0].badge.icon,
              earnedAt: earned[0].earnedAt,
            }
          : null,
        nextBadge: nextBadge
          ? {
              code: nextBadge.code,
              name: nextBadge.name,
              description: nextBadge.description,
              icon: nextBadge.icon,
              pointsRequired: nextBadge.points,
              pointsRemaining: nextBadge.points - points,
            }
          : null,
        badges: earned.map((e) => ({
          code: e.badge.code,
          name: e.badge.name,
          description: e.badge.description,
          icon: e.badge.icon,
          earnedAt: e.earnedAt,
        })),
      },
    };
  }

  // ============================================
  // Section 12 — today's mission
  // ============================================

  async getTodaysMission(userId: string, tzOffsetMinutes = 0) {
    const today = toLocalDay(new Date(), tzOffsetMinutes);
    const daily = await this.repository.findDailyActivity(userId, today, today);
    const row = daily[0];

    const tasks = [
      {
        key: 'watch_video',
        label: 'Watch a lecture',
        // Satisfied by finishing a video OR by five real minutes of playback.
        // Completion alone is the wrong bar: lectures here run past two hours,
        // so a student can watch solidly all evening and still tick nothing.
        done:
          (row?.videosWatched ?? 0) > 0 ||
          (row?.videoSeconds ?? 0) >= MISSION_WATCH_SECONDS,
      },
      {
        key: 'take_quiz',
        label: 'Solve a quiz',
        done: (row?.quizzesTaken ?? 0) > 0,
      },
      {
        key: 'read_pdf',
        label: 'Read a PDF',
        done: (row?.pdfsOpened ?? 0) > 0,
      },
      {
        key: 'study_15_min',
        label: 'Study for 15 minutes',
        done: (row?.studySeconds ?? 0) >= 15 * 60,
      },
    ];

    return {
      message: "Today's mission retrieved",
      data: {
        date: formatDay(today),
        tasks,
        completed: tasks.filter((t) => t.done).length,
        total: tasks.length,
        allDone: tasks.every((t) => t.done),
      },
    };
  }

  // ============================================
  // Section 13 — insights
  // ============================================

  /**
   * Nudges derived from recorded activity.
   *
   * Each carries the fact it came from, so a student can see why it appeared
   * rather than being told something about themselves with no basis shown.
   */
  async getInsights(userId: string, tzOffsetMinutes = 0) {
    const today = toLocalDay(new Date(), tzOffsetMinutes);

    const [stats, dailyRange, attempts, enrollments] = await Promise.all([
      this.repository.findStats(userId),
      this.repository.findDailyActivity(
        userId,
        addDays(today, -13),
        today,
      ),
      this.repository.findQuizAttempts(userId),
      this.repository.findActiveEnrollments(userId),
    ]);

    const insights: { type: string; message: string; severity: string }[] = [];

    // Inactivity, measured from the last recorded activity.
    const lastActive = stats?.lastActiveDate ?? null;
    if (lastActive) {
      const gap = Math.round(
        (today.getTime() - new Date(lastActive).getTime()) / 86_400_000,
      );
      if (gap >= 2) {
        insights.push({
          type: 'inactivity',
          message: `You haven't studied for ${gap} days. A short session today restarts your streak.`,
          severity: 'warning',
        });
      }
    }

    // Week-over-week study time, only when both weeks have data — otherwise a
    // first-ever week would read as an infinite improvement.
    const thisWeek = dailyRange.slice(-7).reduce((s, d) => s + d.studySeconds, 0);
    const lastWeek = dailyRange
      .slice(0, 7)
      .reduce((s, d) => s + d.studySeconds, 0);

    if (lastWeek > 0 && thisWeek > 0) {
      const change = Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
      if (Math.abs(change) >= 10) {
        insights.push({
          type: 'trend',
          message:
            change > 0
              ? `Your study time is up ${change}% this week.`
              : `Your study time is down ${Math.abs(change)}% this week.`,
          severity: change > 0 ? 'positive' : 'warning',
        });
      }
    }

    // A course close to the finish line is worth surfacing.
    const courseIds = enrollments.map((e) => e.courseId);
    const contents = await this.repository.findCourseContents(courseIds);
    const progress = await this.repository.findProgressForContents(
      userId,
      contents.map((c) => c.id),
    );
    const completed = new Set(
      progress.filter((p) => p.completed).map((p) => p.contentId),
    );

    for (const enrollment of enrollments) {
      const courseContents = contents.filter(
        (c) => c.section.courseId === enrollment.courseId,
      );
      if (courseContents.length === 0) continue;

      const remaining = courseContents.filter((c) => !completed.has(c.id)).length;
      if (remaining > 0 && remaining <= 2) {
        insights.push({
          type: 'almost_done',
          message: `Only ${remaining} lesson${remaining === 1 ? '' : 's'} left in ${enrollment.course.title}.`,
          severity: 'positive',
        });
      }
    }

    // A recent run of failed quizzes.
    const recent = attempts.slice(0, 3);
    if (recent.length === 3 && recent.every((a) => !a.passed)) {
      insights.push({
        type: 'quiz_struggle',
        message:
          'Your last three quizzes were below the pass mark. Reviewing the material may help before the next attempt.',
        severity: 'warning',
      });
    }

    return {
      message: 'Insights retrieved',
      data: { insights },
    };
  }

  // ============================================
  // Helpers
  // ============================================

  /** Integer percentage; 0 when the denominator is zero, never NaN. */
  private percent(part: number, total: number): number {
    if (!total || total <= 0) return 0;
    return Math.round((part / total) * 100);
  }

  /** Integer mean; 0 for an empty set. */
  private mean(values: number[]): number {
    if (values.length === 0) return 0;
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  }

  /** The entry with the lowest mean score, with its average. */
  private lowestMean(
    groups: Map<string, { title: string; scores: number[] }>,
  ): { title: string; averageScore: number; attempts: number } | null {
    let worst: { title: string; averageScore: number; attempts: number } | null =
      null;

    for (const group of groups.values()) {
      const average = this.mean(group.scores);
      if (!worst || average < worst.averageScore) {
        worst = {
          title: group.title,
          averageScore: average,
          attempts: group.scores.length,
        };
      }
    }

    return worst;
  }
}
