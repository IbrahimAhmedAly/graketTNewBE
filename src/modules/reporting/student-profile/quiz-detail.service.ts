import { Injectable, NotFoundException } from '@nestjs/common';
import { QuizDetailRepository } from './quiz-detail.repository';

/** Attempts per page when the caller does not say. */
const DEFAULT_ATTEMPTS_LIMIT = 25;

/** Missed questions returned when the caller does not say. */
const DEFAULT_MISSED_LIMIT = 20;

/** Ceiling on any page size, so one request cannot pull a whole history. */
const MAX_LIMIT = 100;

/**
 * Ceiling on `page`.
 *
 * Set so that `(page - 1) * limit` cannot leave the range JavaScript represents
 * integers exactly in, which in turn keeps the OFFSET Prisma sends inside a
 * 64-bit integer. Without it `?page=1e20` reaches the driver as an offset of
 * 2.5e21 and 500s — an absurd page number should read as an empty page, the way
 * `?page=99` already does, not as a server error.
 */
const MAX_PAGE = Math.floor(Number.MAX_SAFE_INTEGER / MAX_LIMIT);

/**
 * Query strings are the normal input here, so both ends need defending:
 * `Number('abc')` is `NaN` and would become `skip: NaN`, while an arbitrarily
 * long digit string parses to a finite number far past anything the database
 * can offset by. Unusable values fall back; oversized ones are clamped.
 */
function toPositiveInt(
  value: unknown,
  fallback: number,
  ceiling: number,
): number {
  const parsed = Math.floor(Number(value));
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, ceiling);
}

/** Per-question tallies accumulated from the outcome buckets. */
interface QuestionTally {
  answered: number;
  wrong: number;
  lastCorrectAt: Date | null;
  lastWrongAt: Date | null;
}

/**
 * The full quiz history for one student.
 *
 * Split out from `ReportingService` because that service answers "how is this
 * student doing" in fixed-size summaries — capped at the ten most recent
 * attempts, with no per-question view at all. This one answers "show me
 * everything", which needs pagination and a different set of queries.
 */
@Injectable()
export class QuizDetailService {
  constructor(private readonly repository: QuizDetailRepository) {}

  /**
   * Every quiz attempt, newest first, one page at a time.
   *
   * The summary comes from a database aggregate over all attempts and is never
   * reduced from `attempts` below: that array is a single page, so averaging it
   * would report how page 3 went instead of how the student is doing.
   */
  async getAllAttempts(
    userId: string,
    page = 1,
    limit = DEFAULT_ATTEMPTS_LIMIT,
  ) {
    const student = await this.repository.findStudent(userId);
    if (!student) throw new NotFoundException('Student not found');

    const safePage = toPositiveInt(page, 1, MAX_PAGE);
    const safeLimit = toPositiveInt(limit, DEFAULT_ATTEMPTS_LIMIT, MAX_LIMIT);

    const [totals, passedCount, attempts] = await Promise.all([
      this.repository.aggregateAttempts(userId),
      this.repository.countPassedAttempts(userId),
      this.repository.findAttemptsPage(
        userId,
        (safePage - 1) * safeLimit,
        safeLimit,
      ),
    ]);

    const total = totals._count._all;
    const answers = await this.repository.groupAnswersByAttempt(
      attempts.map((a) => a.id),
    );

    const tallies = new Map<string, { answered: number; correct: number }>();
    for (const row of answers) {
      const bucket = tallies.get(row.attemptId) ?? { answered: 0, correct: 0 };
      bucket.answered += row._count._all;
      if (row.isCorrect) bucket.correct += row._count._all;
      tallies.set(row.attemptId, bucket);
    }

    return {
      message: total === 0 ? 'No quiz attempts yet' : 'Quiz attempts retrieved',
      data: {
        summary: {
          totalAttempts: total,
          // A student with no attempts has no average — reporting 0 would read
          // as "scored zero", which is a different and much worse statement.
          averageScore:
            totals._avg.score !== null ? Math.round(totals._avg.score) : null,
          highestScore: totals._max.score ?? null,
          lowestScore: totals._min.score ?? null,
          passRate: total > 0 ? Math.round((passedCount * 100) / total) : null,
          firstAttemptAt: totals._min.startedAt ?? null,
          lastAttemptAt: totals._max.startedAt ?? null,
        },

        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),

        attempts: attempts.map((attempt) => {
          const tally = tallies.get(attempt.id) ?? { answered: 0, correct: 0 };
          const content = attempt.quiz?.content;

          return {
            attemptId: attempt.id,
            quizId: attempt.quizId,
            lesson: content?.title ?? null,
            section: content?.section?.title ?? null,
            course: content?.section?.course?.title ?? null,
            score: attempt.score,
            passed: attempt.passed,
            passingScore: attempt.quiz?.passingScore ?? null,
            timeTakenSec: attempt.timeTaken,
            correctAnswers: tally.correct,
            totalQuestions: tally.answered,
            startedAt: attempt.startedAt,
            completedAt: attempt.completedAt,
          };
        }),
      },
    };
  }

  /**
   * The questions this student keeps getting wrong.
   *
   * Ranked by how often a question was answered wrongly, then by accuracy, so a
   * question missed four times out of five outranks one missed once. Accuracy
   * alone would put every single-attempt slip at the top of the list.
   */
  async getMissedQuestions(userId: string, limit = DEFAULT_MISSED_LIMIT) {
    const student = await this.repository.findStudent(userId);
    if (!student) throw new NotFoundException('Student not found');

    const safeLimit = toPositiveInt(limit, DEFAULT_MISSED_LIMIT, MAX_LIMIT);

    const attemptIds = await this.repository.findAttemptIds(userId);
    const buckets = await this.repository.groupAnswersByQuestion(attemptIds);

    // These buckets cover every answer the student has given — the grouping is
    // unpaginated — so summing them is the true total, not a total over the
    // questions that happen to make the list below.
    let totalAnswered = 0;
    let totalWrong = 0;

    const byQuestion = new Map<string, QuestionTally>();

    for (const row of buckets) {
      const count = row._count._all;
      totalAnswered += count;
      if (!row.isCorrect) totalWrong += count;

      const tally: QuestionTally = byQuestion.get(row.questionId) ?? {
        answered: 0,
        wrong: 0,
        lastCorrectAt: null,
        lastWrongAt: null,
      };

      tally.answered += count;

      // One bucket per question per outcome, so each side is written at most
      // once — these are assignments, not running maxima.
      if (row.isCorrect) {
        tally.lastCorrectAt = row._max.createdAt;
      } else {
        tally.wrong += count;
        tally.lastWrongAt = row._max.createdAt;
      }

      byQuestion.set(row.questionId, tally);
    }

    const ranked = [...byQuestion.entries()]
      .filter(([, tally]) => tally.wrong >= 1)
      .map(([questionId, tally]) => ({
        questionId,
        timesAnswered: tally.answered,
        timesWrong: tally.wrong,
        accuracy: Math.round(
          ((tally.answered - tally.wrong) * 100) / tally.answered,
        ),
        lastAnsweredAt: this.latest(tally.lastCorrectAt, tally.lastWrongAt),
        // A correct and a wrong answer stamped at the same instant resolves to
        // wrong: this list exists to show what is still going wrong.
        lastWasCorrect:
          tally.lastCorrectAt !== null &&
          (tally.lastWrongAt === null ||
            tally.lastCorrectAt > tally.lastWrongAt),
      }))
      .sort((a, b) => b.timesWrong - a.timesWrong || a.accuracy - b.accuracy)
      .slice(0, safeLimit);

    // Text and placement are fetched only for the questions that made the cut.
    const questions = await this.repository.findQuestions(
      ranked.map((r) => r.questionId),
    );
    const questionById = new Map(questions.map((q) => [q.id, q]));

    return {
      message: ranked.length
        ? 'Missed questions retrieved'
        : 'No missed questions yet',
      data: {
        basis: 'answered',
        totalAnswered,
        totalWrong,
        questions: ranked.map((entry) => {
          const question = questionById.get(entry.questionId);
          const content = question?.quiz?.content;

          return {
            questionId: entry.questionId,
            questionText: question?.questionText ?? null,
            topic: question?.topic ?? null,
            lesson: content?.title ?? null,
            course: content?.section?.course?.title ?? null,
            timesAnswered: entry.timesAnswered,
            timesWrong: entry.timesWrong,
            accuracy: entry.accuracy,
            lastAnsweredAt: entry.lastAnsweredAt,
            lastWasCorrect: entry.lastWasCorrect,
          };
        }),
      },
    };
  }

  /** The later of two timestamps, either of which may be absent. */
  private latest(a: Date | null, b: Date | null): Date | null {
    if (!a) return b ?? null;
    if (!b) return a;
    return a > b ? a : b;
  }
}
