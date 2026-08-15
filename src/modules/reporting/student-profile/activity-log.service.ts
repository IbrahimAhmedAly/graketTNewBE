import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ActivityLogRepository } from './activity-log.repository';

/** Every kind of event the log can emit. */
export type ActivityEventType =
  | 'video'
  | 'pdf'
  | 'quiz'
  | 'session'
  | 'login'
  | 'enrollment'
  | 'purchase';

export const ACTIVITY_EVENT_TYPES: readonly ActivityEventType[] = [
  'video',
  'pdf',
  'quiz',
  'session',
  'login',
  'enrollment',
  'purchase',
];

export interface ActivityLogOptions {
  page?: number;
  limit?: number;
  types?: ActivityEventType[];
}

/** Machine-readable payload of an event; the shape varies by type. */
export type ActivityEventMeta = Record<
  string,
  string | number | boolean | null
>;

export interface ActivityLogEvent {
  type: ActivityEventType;
  at: Date;
  title: string;
  course: string | null;
  detail: string | null;
  meta: ActivityEventMeta;
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

/**
 * Fixed rank used to break timestamp ties between two different sources.
 *
 * Any stable order would do; what matters is that it never changes, because
 * pagination correctness depends on two requests seeing the same order.
 */
const TYPE_RANK: Record<ActivityEventType, number> = {
  video: 0,
  pdf: 1,
  quiz: 2,
  session: 3,
  login: 4,
  enrollment: 5,
  purchase: 6,
};

/**
 * An event before its human label is known.
 *
 * Titles are attached only to the rows that survive the page slice, so the
 * merge stage carries the ids needed to look one up instead of the label.
 */
interface ActivityCandidate {
  type: ActivityEventType;
  at: Date;
  /** Source row id — identity for the tie-break, and for nothing else. */
  id: string;
  contentId: string | null;
  quizId: string | null;
  courseId: string | null;
  /** Fixed label for events that name no content, e.g. a study session. */
  fixedTitle: string | null;
  detail: string | null;
  meta: ActivityEventMeta;
}

interface ContentLabel {
  title: string;
  course: string | null;
}

/**
 * Cumulative watch state, from whichever half of the video source supplied it —
 * looked up by content for an open, carried by the row itself for a watch with
 * no open. Both describe the same thing and are shaped the same way.
 */
interface VideoWatchState {
  watchPercent: number;
  watchedSeconds: number;
  lastPositionSec: number;
  replayCount: number;
  completedAt: Date | null;
}

/**
 * The complete log of a student's activity on the platform.
 *
 * Assembled by union over the tables that already record behaviour rather than
 * from an event table: an event table would start empty at deploy time and
 * would show every existing student a blank history, while a derived log is
 * correct retroactively.
 */
@Injectable()
export class ActivityLogService {
  constructor(private readonly repository: ActivityLogRepository) {}

  /**
   * One page of the merged, reverse-chronological activity log.
   *
   * Counting and paging are kept apart on purpose. Nothing can sort across
   * seven differently-shaped tables inside the database without a hand-written
   * UNION, so the merge happens here — and the obvious way to do that is
   * wrong. Taking `limit` rows from each source, merging and slicing reports a
   * total that is the sum of truncated reads, and drops real events whenever
   * one source dominates the page. Instead:
   *
   *   - `total` comes from a `count()` per source, which no `take` can distort.
   *   - Each source contributes its newest `page * limit` rows. An event that
   *     lands at merged position < page*limit has fewer than page*limit events
   *     ahead of it overall, so it has fewer than page*limit events ahead of it
   *     *within its own source* too — meaning it is inside that source's newest
   *     page*limit rows. Fetching that many from every source therefore
   *     provably contains the entire prefix this page is cut from, and slicing
   *     the merged prefix yields exactly the same rows a single sorted query
   *     would have.
   *
   * That argument holds for any partition of the events into sources, which is
   * why `video` can be served by two bounded queries — opens, and watches with
   * no open — with no special handling: each is a source in its own right and
   * each fetches its own page*limit rows.
   *
   * The read grows with page depth, which is the honest price of a union with
   * no shared index to seek on. `limit` is capped for that reason.
   */
  async getActivityLog(userId: string, options: ActivityLogOptions) {
    const student = await this.repository.findStudent(userId);
    if (!student) throw new NotFoundException('Student not found');

    const types = this.resolveTypes(options.types);
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, Math.floor(options.limit) || DEFAULT_LIMIT),
    );
    const page = Math.max(1, Math.floor(options.page) || 1);

    // Counted before anything is fetched, because the fetch size below is
    // page * limit and a caller is free to ask for page 100000: knowing the
    // real total first bounds the read to rows that exist rather than issuing
    // LIMIT 20000000 against every source.
    //
    // Only the requested sources are touched — a filtered log must not pay for
    // rows it is about to throw away.
    //
    // The count and the page are separate statements with no transaction
    // around them, so a write landing between the two can make `total` and
    // `events` disagree by an event. That is inherent to a union with no shared
    // table to snapshot, and preferable to holding a transaction open across
    // fourteen reads for a report.
    const totals = await Promise.all(
      types.map((type) => this.countSource(type, userId, student.lastLoginAt)),
    );
    const total = totals.reduce((sum, count) => sum + count, 0);
    const totalPages = Math.ceil(total / limit);

    // Past the last page there is nothing to merge. The requested page is
    // echoed back rather than clamped down, so a caller asking for page 900
    // gets an empty page 900 instead of page 7's rows labelled as something
    // they never asked for.
    if (page > totalPages) {
      return {
        message: 'Activity log retrieved',
        data: { page, limit, total, totalPages, events: [] },
      };
    }

    const candidateTake = page * limit;
    const candidates = await Promise.all(
      types.map((type) =>
        this.loadSource(type, userId, candidateTake, student.lastLoginAt),
      ),
    );

    const merged = candidates.flat().sort(compareCandidates);
    const offset = (page - 1) * limit;
    const pageCandidates = merged.slice(offset, offset + limit);

    return {
      message: 'Activity log retrieved',
      data: {
        page,
        limit,
        total,
        totalPages,
        events: await this.withLabels(pageCandidates),
      },
    };
  }

  /**
   * An unknown type is rejected rather than ignored: silently returning the
   * full log for `?types=vidoe` would look like the filter worked.
   */
  private resolveTypes(requested?: ActivityEventType[]): ActivityEventType[] {
    const wanted = (requested ?? []).filter((type) => !!type);
    if (wanted.length === 0) return [...ACTIVITY_EVENT_TYPES];

    const unknown = wanted.filter(
      (type) => !ACTIVITY_EVENT_TYPES.includes(type),
    );
    if (unknown.length > 0) {
      throw new BadRequestException(
        `Unknown activity type(s): ${unknown.join(', ')}. Valid types: ${ACTIVITY_EVENT_TYPES.join(', ')}`,
      );
    }

    return [...new Set(wanted)];
  }

  private countSource(
    type: ActivityEventType,
    userId: string,
    lastLoginAt: Date | null,
  ): Promise<number> {
    switch (type) {
      case 'video':
        return this.repository.countVideoEvents(userId);
      case 'pdf':
        return this.repository.countPdfViews(userId);
      case 'quiz':
        return this.repository.countQuizAttempts(userId);
      case 'session':
        return this.repository.countSessions(userId);
      case 'enrollment':
        return this.repository.countEnrollments(userId);
      case 'purchase':
        return this.repository.countPurchases(userId);
      // Only the most recent login is recorded, so the source is one event or
      // none — earlier sign-ins were never stored to begin with.
      case 'login':
        return Promise.resolve(lastLoginAt ? 1 : 0);
      default:
        return Promise.resolve(assertUnreachable(type));
    }
  }

  private async loadSource(
    type: ActivityEventType,
    userId: string,
    take: number,
    lastLoginAt: Date | null,
  ): Promise<ActivityCandidate[]> {
    switch (type) {
      /**
       * One event per opening of a video, from `ContentView`, plus a fallback
       * event for each video whose watch was reported without an open.
       *
       * `VideoWatchProgress` cannot be the primary source: it is unique per
       * (user, video) and holds a running aggregate, so emitting from it would
       * report one event for a video opened ten times and lose the other nine.
       * It is read here to say how far the student has got — and, for videos
       * with no recorded open at all, to supply the event nothing else would.
       * The repository restricts that fallback to videos without an open, so a
       * video that has both is never reported twice.
       *
       * The aggregate fields describe the CURRENT cumulative state, not the
       * state at the moment of the view: the schema keeps one rolling row per
       * video, so per-moment progress cannot be reconstructed. `durationSec` is
       * the exception — that is the view's own dwell, and it is null for a
       * fallback event because there was no view to measure.
       */
      case 'video': {
        const [rows, orphans] = await Promise.all([
          this.repository.findVideoViews(userId, take),
          this.repository.findOrphanWatches(userId, take),
        ]);

        const watchState = await this.repository.findWatchStateByContent(
          userId,
          unique(rows.map((row) => row.contentId)),
        );
        const stateByContent = new Map(
          watchState.map((state) => [state.contentId, state]),
        );

        const opened = rows.map((row) => {
          // Null throughout when the player never reported progress: an
          // unreported watch is unknown, not 0%.
          const state = stateByContent.get(row.contentId);

          return {
            type: 'video' as const,
            at: row.openedAt,
            id: row.id,
            contentId: row.contentId,
            quizId: null,
            courseId: null,
            fixedTitle: null,
            // "overall" earns its place: the percentage is the student's total
            // progress on the video, while the dwell beside it belongs to this
            // one opening.
            detail: joinDetail([
              row.durationSec > 0 ? humanDuration(row.durationSec) : null,
              ...videoStateDetail(state),
            ]),
            meta: {
              contentId: row.contentId,
              viewId: row.id,
              durationSec: row.durationSec,
              ...videoStateMeta(state),
            },
          };
        });

        const unopened = orphans.map((row) => ({
          type: 'video' as const,
          at: row.lastWatchedAt,
          id: row.id,
          contentId: row.contentId,
          quizId: null,
          courseId: null,
          fixedTitle: null,
          // Said plainly, because the timestamp means something weaker here:
          // it is when playback was last reported, not when anything was
          // observed to open.
          detail: joinDetail(['no open recorded', ...videoStateDetail(row)]),
          meta: {
            contentId: row.contentId,
            viewId: null,
            durationSec: null,
            ...videoStateMeta(row),
          },
        }));

        return [...opened, ...unopened];
      }

      case 'pdf': {
        const rows = await this.repository.findPdfViews(userId, take);
        return rows.map((row) => {
          // Capped: a viewer that reports more pages read than the document
          // has would otherwise produce a read depth above 100%.
          const readPercent =
            row.totalPages > 0 && row.pagesRead != null
              ? Math.min(
                  100,
                  Math.round((row.pagesRead * 100) / row.totalPages),
                )
              : null;

          return {
            type: 'pdf' as const,
            at: row.openedAt,
            id: row.id,
            contentId: row.contentId,
            quizId: null,
            courseId: null,
            fixedTitle: null,
            detail: joinDetail([
              row.pagesRead != null
                ? row.totalPages
                  ? `read ${row.pagesRead}/${row.totalPages} pages`
                  : `read ${row.pagesRead} pages`
                : null,
              row.durationSec > 0 ? humanDuration(row.durationSec) : null,
            ]),
            meta: {
              contentId: row.contentId,
              viewId: row.id,
              durationSec: row.durationSec,
              pagesRead: row.pagesRead ?? null,
              totalPages: row.totalPages ?? null,
              readPercent,
            },
          };
        });
      }

      case 'quiz': {
        const rows = await this.repository.findQuizAttempts(userId, take);
        return rows.map((row) => ({
          type: 'quiz' as const,
          at: row.startedAt,
          id: row.id,
          contentId: null,
          quizId: row.quizId,
          courseId: null,
          fixedTitle: null,
          detail: `scored ${row.score}% · ${row.passed ? 'passed' : 'failed'}`,
          meta: {
            attemptId: row.id,
            score: row.score,
            passed: row.passed,
            timeTakenSec: row.timeTaken ?? null,
          },
        }));
      }

      case 'session': {
        const rows = await this.repository.findSessions(userId, take);
        return rows.map((row) => ({
          type: 'session' as const,
          at: row.startedAt,
          id: row.id,
          contentId: null,
          quizId: null,
          courseId: null,
          fixedTitle: 'Study session',
          // A session still open, or closed with nothing measured, has no
          // duration worth printing; the timestamp is the whole story.
          detail: row.durationSec > 0 ? humanDuration(row.durationSec) : null,
          meta: {
            sessionId: row.id,
            durationSec: row.durationSec,
            closedByClient: row.closedByClient,
          },
        }));
      }

      case 'enrollment': {
        const rows = await this.repository.findEnrollments(userId, take);
        return rows.map((row) => ({
          type: 'enrollment' as const,
          at: row.enrolledAt,
          id: row.id,
          contentId: null,
          quizId: null,
          courseId: row.courseId,
          fixedTitle: null,
          detail: ENROLLMENT_DETAIL[row.status] ?? null,
          meta: { courseId: row.courseId, status: row.status },
        }));
      }

      case 'purchase': {
        const rows = await this.repository.findPurchases(userId, take);
        return rows.map((row) => ({
          type: 'purchase' as const,
          at: row.purchasedAt,
          id: row.id,
          // A VIDEO purchase names a content row, a COURSE purchase a course;
          // whichever is set is what gets the label.
          contentId: row.contentId ?? null,
          quizId: null,
          courseId: row.courseId ?? null,
          fixedTitle: null,
          detail: row.purchaseCode?.code
            ? `redeemed ${row.purchaseCode.code}`
            : null,
          meta: {
            purchaseId: row.id,
            type: row.type,
            code: row.purchaseCode?.code ?? null,
          },
        }));
      }

      case 'login': {
        if (!lastLoginAt) return [];

        return [
          {
            type: 'login' as const,
            at: lastLoginAt,
            // Synthetic: the source is a column, so there is no row id to
            // tie-break on. One event per student makes it unique anyway.
            id: `login:${userId}`,
            contentId: null,
            quizId: null,
            courseId: null,
            fixedTitle: 'Login',
            detail: null,
            meta: {},
          },
        ];
      }

      default:
        return assertUnreachable(type);
    }
  }

  /**
   * Attaches titles to the events that made the page.
   *
   * Three batched reads for the whole page, never one per event: a 200-row page
   * spanning 200 lessons would otherwise fire 200 queries.
   */
  private async withLabels(
    candidates: ActivityCandidate[],
  ): Promise<ActivityLogEvent[]> {
    const contentIds = unique(candidates.map((c) => c.contentId));
    const quizIds = unique(candidates.map((c) => c.quizId));
    const courseIds = unique(candidates.map((c) => c.courseId));

    const [contents, quizzes, courses] = await Promise.all([
      this.repository.findContentSummaries(contentIds),
      this.repository.findQuizSummaries(quizIds),
      this.repository.findCourseSummaries(courseIds),
    ]);

    const contentById = new Map<string, ContentLabel>(
      contents.map((content) => [
        content.id,
        {
          title: content.title,
          course: content.section?.course?.title ?? null,
        },
      ]),
    );
    const quizById = new Map<string, ContentLabel>(
      quizzes.map((quiz) => [
        quiz.id,
        {
          title: quiz.content?.title ?? 'Quiz',
          course: quiz.content?.section?.course?.title ?? null,
        },
      ]),
    );
    const courseById = new Map<string, string>(
      courses.map((course) => [course.id, course.title]),
    );

    return candidates.map((candidate) => {
      const label = this.labelFor(candidate, contentById, quizById, courseById);

      return {
        type: candidate.type,
        at: candidate.at,
        title: label.title,
        course: label.course,
        detail: candidate.detail,
        meta: candidate.meta,
      };
    });
  }

  /**
   * `title` names the thing acted on; `course` always answers "which course was
   * this in", including when the course itself is the thing acted on. Keeping
   * that meaning uniform is what lets a client group a mixed feed by course.
   */
  private labelFor(
    candidate: ActivityCandidate,
    contentById: Map<string, ContentLabel>,
    quizById: Map<string, ContentLabel>,
    courseById: Map<string, string>,
  ): ContentLabel {
    if (candidate.fixedTitle) {
      return { title: candidate.fixedTitle, course: null };
    }

    if (candidate.quizId) {
      return quizById.get(candidate.quizId) ?? { title: 'Quiz', course: null };
    }

    if (candidate.contentId) {
      return (
        contentById.get(candidate.contentId) ?? {
          title: 'Unknown content',
          course: null,
        }
      );
    }

    if (candidate.courseId) {
      const course = courseById.get(candidate.courseId) ?? 'Unknown course';
      return { title: course, course };
    }

    return { title: 'Activity', course: null };
  }
}

/**
 * The total order the merged log is sorted by, and the same one every source
 * query applies to itself.
 *
 * The tie-breaks are not decoration. Two events sharing a timestamp — a quiz
 * attempt and the view that opened it, or a bulk enrollment — would otherwise
 * be ordered by whichever source happened to be merged first, and could swap
 * places between the request for page 1 and the request for page 2, returning
 * one event twice and hiding another entirely.
 */
function compareCandidates(a: ActivityCandidate, b: ActivityCandidate): number {
  const byTime = b.at.getTime() - a.at.getTime();
  if (byTime !== 0) return byTime;

  const byType = TYPE_RANK[a.type] - TYPE_RANK[b.type];
  if (byType !== 0) return byType;

  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

const ENROLLMENT_DETAIL: Record<string, string> = {
  ONGOING: 'enrolled',
  COMPLETED: 'completed the course',
  // SAVED is the wishlist, never a subscription — the wording has to say so.
  SAVED: 'saved to wishlist',
};

/**
 * Compile-time guard: adding a member to `ActivityEventType` without handling
 * it in every dispatch below fails the assignment to `never` here, instead of
 * silently returning nothing at runtime.
 */
function assertUnreachable(type: never): never {
  throw new Error(`Unhandled activity event type: ${String(type)}`);
}

/**
 * Shared by both halves of the video source so an open and an orphaned watch
 * can never describe the same state with different keys.
 */
function videoStateMeta(state: VideoWatchState | null): ActivityEventMeta {
  return {
    watchPercent: state?.watchPercent ?? null,
    watchedSeconds: state?.watchedSeconds ?? null,
    lastPositionSec: state?.lastPositionSec ?? null,
    replayCount: state?.replayCount ?? null,
    completed: state ? !!state.completedAt : null,
  };
}

function videoStateDetail(state: VideoWatchState | null): string[] {
  return state
    ? [
        `watched ${state.watchPercent}% overall`,
        `stopped at ${clockTime(state.lastPositionSec)}`,
      ]
    : [];
}

function unique(ids: (string | null)[]): string[] {
  return [...new Set(ids.filter((id): id is string => !!id))];
}

function joinDetail(parts: (string | null)[]): string | null {
  const present = parts.filter((part) => !!part);
  return present.length > 0 ? present.join(' · ') : null;
}

/** Playback position as a viewer reads it off the scrubber, e.g. `12:04`. */
function clockTime(totalSec: number): string {
  const seconds = Math.max(0, Math.floor(totalSec));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;

  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(rest)}`
    : `${minutes}:${pad(rest)}`;
}

/**
 * Elapsed time in the coarsest unit that stays truthful — a 40-second read
 * rounded to minutes reads as "0 min", which looks like a bug.
 */
function humanDuration(totalSec: number): string {
  const seconds = Math.max(0, Math.floor(totalSec));
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours}h ${rest}m` : `${hours}h`;
}

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}
