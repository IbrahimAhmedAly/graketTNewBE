/**
 * The Success Index: a single 0-100 measure of how a student is doing.
 *
 * The originally-specified formula had five inputs — video watching 30%, quiz
 * scores 25%, daily commitment 20%, plan completion 15%, homework speed 10%.
 * The system has no assignment or homework entity (content is only VIDEO, PDF
 * or QUIZ), so the fifth input has no data source and cannot be measured. It
 * is dropped and the remaining four are renormalised to sum to 100 rather than
 * being scored against a denominator that includes something uncollectable —
 * which would cap every student below their real standing.
 *
 * Original → renormalised:
 *   video watching  30 → 33
 *   quiz scores     25 → 28
 *   daily commitment20 → 22
 *   plan completion 15 → 17
 *
 * Every component is pure so the arithmetic can be verified directly.
 */

export const SUCCESS_INDEX_WEIGHTS = {
  videoWatching: 33,
  quizScores: 28,
  dailyCommitment: 22,
  planCompletion: 17,
} as const;

/**
 * Minimum evidence before an index is shown at all.
 *
 * A student who has just signed up would otherwise score 0 and be shown a red
 * "0/100" — a judgement about someone the system knows nothing about. Below
 * this bar the index is reported as null and the UI says "not enough data".
 */
export const MIN_ACTIVITY_FOR_INDEX = {
  /** Any one of these clears the bar. */
  videosStarted: 1,
  quizzesTaken: 1,
  activeDays: 1,
};

export interface SuccessIndexInputs {
  /** Mean watch percentage across videos the student has started, 0-100. */
  avgVideoWatchPercent: number;
  /** Count of videos with any recorded watch time. */
  videosStarted: number;

  /** Mean quiz score, 0-100. */
  avgQuizScore: number;
  quizzesTaken: number;

  /** Days with recorded activity in the commitment window. */
  activeDaysInWindow: number;
  /** Size of that window in days. */
  commitmentWindowDays: number;

  /** Mean completion across enrolled courses, 0-100. */
  avgCourseCompletion: number;
  enrolledCourses: number;
}

export interface SuccessIndexBreakdown {
  /** 0-100, or null when there is too little activity to judge. */
  score: number | null;
  /** Present only when score is null. */
  reason?: string;
  components: {
    key: string;
    label: string;
    weight: number;
    /** The student's raw 0-100 performance on this component. */
    raw: number;
    /** Weighted contribution to the final score. */
    contribution: number;
    /** False when this component has no data and scored 0 by default. */
    hasData: boolean;
  }[];
}

function clamp(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

/**
 * Computes the index and a full breakdown.
 *
 * The breakdown is returned alongside the score deliberately: a single opaque
 * number invites disbelief, and a student who can see "quiz scores 28% of your
 * index, you're at 64" can act on it.
 */
export function calculateSuccessIndex(
  inputs: SuccessIndexInputs,
): SuccessIndexBreakdown {
  const hasEnoughActivity =
    inputs.videosStarted >= MIN_ACTIVITY_FOR_INDEX.videosStarted ||
    inputs.quizzesTaken >= MIN_ACTIVITY_FOR_INDEX.quizzesTaken ||
    inputs.activeDaysInWindow >= MIN_ACTIVITY_FOR_INDEX.activeDays;

  const commitmentRaw =
    inputs.commitmentWindowDays > 0
      ? (inputs.activeDaysInWindow / inputs.commitmentWindowDays) * 100
      : 0;

  const components = [
    {
      key: 'videoWatching',
      label: 'Video watching',
      weight: SUCCESS_INDEX_WEIGHTS.videoWatching,
      raw: clamp(inputs.avgVideoWatchPercent),
      hasData: inputs.videosStarted > 0,
    },
    {
      key: 'quizScores',
      label: 'Quiz scores',
      weight: SUCCESS_INDEX_WEIGHTS.quizScores,
      raw: clamp(inputs.avgQuizScore),
      hasData: inputs.quizzesTaken > 0,
    },
    {
      key: 'dailyCommitment',
      label: 'Daily commitment',
      weight: SUCCESS_INDEX_WEIGHTS.dailyCommitment,
      raw: clamp(commitmentRaw),
      hasData: inputs.commitmentWindowDays > 0,
    },
    {
      key: 'planCompletion',
      label: 'Course completion',
      weight: SUCCESS_INDEX_WEIGHTS.planCompletion,
      raw: clamp(inputs.avgCourseCompletion),
      hasData: inputs.enrolledCourses > 0,
    },
  ].map((c) => ({
    ...c,
    contribution: Math.round((c.raw * c.weight) / 100),
  }));

  if (!hasEnoughActivity) {
    return {
      score: null,
      reason: 'Not enough activity yet to calculate a meaningful score',
      components,
    };
  }

  const score = Math.round(
    components.reduce((sum, c) => sum + (c.raw * c.weight) / 100, 0),
  );

  return { score: clamp(score), components };
}

/** Presentation band for the index. */
export type SuccessBand = 'green' | 'yellow' | 'red';

export function successBand(score: number | null): SuccessBand | null {
  if (score === null) return null;
  if (score >= 70) return 'green';
  if (score >= 40) return 'yellow';
  return 'red';
}

/**
 * The student's standing as a percentile band rather than a raw position.
 *
 * A raw rank tells the student at position 3,199 of 3,200 exactly that, every
 * time they open the app. Bands preserve the motivating signal for those doing
 * well without singling out the bottom of the cohort by name — the same reason
 * mainstream learning products use leagues and tiers rather than absolute
 * placement.
 *
 * Returns null for cohorts too small for a percentile to mean anything.
 */
export function percentileBand(
  rank: number,
  cohortSize: number,
): { label: string; percentile: number } | null {
  if (cohortSize < 5 || rank < 1) return null;

  // Share of the cohort at or below this student.
  const percentile = Math.round(((cohortSize - rank + 1) / cohortSize) * 100);

  let label: string;
  if (percentile >= 99) label = 'Top 1%';
  else if (percentile >= 95) label = 'Top 5%';
  else if (percentile >= 90) label = 'Top 10%';
  else if (percentile >= 75) label = 'Top 25%';
  else if (percentile >= 50) label = 'Top half';
  else label = 'Keep going';

  return { label, percentile };
}
