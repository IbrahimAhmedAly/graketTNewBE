import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Attempt ids per grouping query.
 *
 * Postgres allows 32767 bind variables in one prepared statement and an `IN`
 * list spends one per element, so the list is split well short of that.
 */
const ATTEMPT_ID_BATCH = 20_000;

/**
 * Read-side queries behind the admin's quiz drill-down for one student.
 *
 * The page and the summary are deliberately separate queries. A page holds at
 * most `limit` rows, so any figure reduced from it would describe that page
 * rather than the student — every summary-shaped number here is aggregated by
 * the database across the student's whole history instead.
 *
 * Per-answer tallies are grouped on `isCorrect` as well as their parent key, so
 * the answered count and the correct count come back from one round trip rather
 * than one query per attempt or per question.
 */
@Injectable()
export class QuizDetailRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Existence check, so a report is never assembled for an unknown id. */
  async findStudent(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
  }

  /** One page of attempts, newest first. */
  async findAttemptsPage(userId: string, skip: number, take: number) {
    return this.prisma.quizAttempt.findMany({
      where: { userId },
      // `id` breaks ties: attempts submitted in the same instant would
      // otherwise be free to reshuffle between requests, which on a paginated
      // list means a row appearing twice or not at all.
      orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
      skip,
      take,
      select: {
        id: true,
        quizId: true,
        score: true,
        passed: true,
        timeTaken: true,
        startedAt: true,
        completedAt: true,
        quiz: {
          select: {
            // Carried so the client can explain a `passed` flag rather than
            // asking the reader to trust it.
            passingScore: true,
            content: {
              select: {
                title: true,
                section: {
                  select: {
                    title: true,
                    course: { select: { title: true } },
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  /** Score and date extremes across EVERY attempt the student has made. */
  async aggregateAttempts(userId: string) {
    return this.prisma.quizAttempt.aggregate({
      where: { userId },
      _count: { _all: true },
      _avg: { score: true },
      _max: { score: true, startedAt: true },
      _min: { score: true, startedAt: true },
    });
  }

  /** How many of those attempts were passes. */
  async countPassedAttempts(userId: string): Promise<number> {
    return this.prisma.quizAttempt.count({ where: { userId, passed: true } });
  }

  /** Answered/correct tallies for a page of attempts, in one query. */
  async groupAnswersByAttempt(attemptIds: string[]) {
    if (attemptIds.length === 0) return [];

    return this.prisma.userAnswer.groupBy({
      by: ['attemptId', 'isCorrect'],
      where: { attemptId: { in: attemptIds } },
      _count: { _all: true },
    });
  }

  /** Ids of every attempt the student has made. */
  async findAttemptIds(userId: string): Promise<string[]> {
    const attempts = await this.prisma.quizAttempt.findMany({
      where: { userId },
      select: { id: true },
    });
    return attempts.map((a) => a.id);
  }

  /**
   * Every question the student has ever answered, tallied by outcome.
   *
   * Unpaginated on purpose: the caller ranks questions by a wrong-answer count
   * the database cannot order on, so it needs the complete set of buckets. Two
   * rows per question with no relations attached is a far smaller read than the
   * answer rows themselves. `_max.createdAt` per bucket is what tells the
   * caller whether the most recent attempt at that question went right.
   *
   * Scoped by attempt id rather than the equivalent `attempt: { userId }`
   * filter, which is what you would expect to write here: that filter makes
   * Prisma 6.16 join QuizAttempt in and then emit an unqualified
   * `MAX("createdAt")`, and both tables have that column — Postgres rejects the
   * query as ambiguous (42702). Filtering on the ids selects the same rows
   * without the join.
   *
   * That workaround is what forces the batching below. The id list must not be
   * capped — a partial list would quietly make the totals partial too — so it
   * is spent a batch at a time instead, because every id costs one bind
   * variable and a prepared statement may carry only 32767 of them. Batches run
   * in sequence: this only engages for a student with tens of thousands of
   * attempts, and firing that many id-laden queries at once to save a few
   * milliseconds on an unreachable case is a poor trade.
   */
  async groupAnswersByQuestion(attemptIds: string[]) {
    const merged = new Map<
      string,
      {
        questionId: string;
        isCorrect: boolean;
        _count: { _all: number };
        _max: { createdAt: Date };
      }
    >();

    for (let i = 0; i < attemptIds.length; i += ATTEMPT_ID_BATCH) {
      const rows = await this.prisma.userAnswer.groupBy({
        by: ['questionId', 'isCorrect'],
        where: { attemptId: { in: attemptIds.slice(i, i + ATTEMPT_ID_BATCH) } },
        _count: { _all: true },
        _max: { createdAt: true },
      });

      // Folded back to one bucket per question per outcome, so the batching
      // stays invisible to the caller and its ranking arithmetic.
      for (const row of rows) {
        const key = `${row.questionId}:${row.isCorrect}`;
        const bucket = merged.get(key);

        if (!bucket) {
          merged.set(key, {
            questionId: row.questionId,
            isCorrect: row.isCorrect,
            _count: { _all: row._count._all },
            _max: { createdAt: row._max.createdAt },
          });
          continue;
        }

        bucket._count._all += row._count._all;
        if (row._max.createdAt > bucket._max.createdAt) {
          bucket._max.createdAt = row._max.createdAt;
        }
      }
    }

    return [...merged.values()];
  }

  /** Text and placement for the questions actually being reported. */
  async findQuestions(questionIds: string[]) {
    if (questionIds.length === 0) return [];

    return this.prisma.question.findMany({
      where: { id: { in: questionIds } },
      select: {
        id: true,
        questionText: true,
        topic: true,
        quiz: {
          select: {
            content: {
              select: {
                title: true,
                section: { select: { course: { select: { title: true } } } },
              },
            },
          },
        },
      },
    });
  }
}
