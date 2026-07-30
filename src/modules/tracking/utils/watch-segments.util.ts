/**
 * Watch-segment arithmetic.
 *
 * A student's "percent watched" is the measure of the UNION of the intervals
 * they actually played — not the furthest point they reached. The difference
 * matters: dragging the scrubber to the end of a 10-minute video would score
 * 100% under a furthest-point rule while nothing was watched.
 *
 * Every function here is pure so the arithmetic can be tested directly,
 * without a database or an HTTP round trip.
 */

/** A closed interval of playback, in seconds from the start of the video. */
export interface WatchSegment {
  start: number;
  end: number;
}

/** Discards malformed, zero-length, or out-of-range intervals. */
function sanitize(segments: WatchSegment[], durationSec?: number): WatchSegment[] {
  const maxEnd = durationSec && durationSec > 0 ? durationSec : Number.MAX_SAFE_INTEGER;

  return segments
    .filter(
      (s) =>
        s &&
        Number.isFinite(s.start) &&
        Number.isFinite(s.end) &&
        s.end > s.start &&
        s.end > 0,
    )
    .map((s) => ({
      // Clamp into [0, duration] so a bad client clock or a seek past the end
      // can never inflate watched time beyond the length of the video.
      start: Math.max(0, Math.min(s.start, maxEnd)),
      end: Math.max(0, Math.min(s.end, maxEnd)),
    }))
    .filter((s) => s.end > s.start);
}

/**
 * Merges overlapping and adjacent intervals into a sorted, disjoint set.
 *
 * Re-watching the same 30 seconds ten times still counts once — which is the
 * whole point: watched time must not be inflatable by replaying a segment.
 */
export function mergeSegments(
  segments: WatchSegment[],
  durationSec?: number,
): WatchSegment[] {
  const clean = sanitize(segments, durationSec);
  if (clean.length === 0) return [];

  clean.sort((a, b) => a.start - b.start || a.end - b.end);

  const merged: WatchSegment[] = [{ ...clean[0] }];

  for (let i = 1; i < clean.length; i++) {
    const current = clean[i];
    const last = merged[merged.length - 1];

    // `<=` so [0,10] and [10,20] become [0,20]: contiguous playback across a
    // heartbeat boundary is one stretch, not two.
    if (current.start <= last.end) {
      last.end = Math.max(last.end, current.end);
    } else {
      merged.push({ ...current });
    }
  }

  return merged;
}

/** Total seconds covered by a set of intervals, counting overlap once. */
export function totalWatchedSeconds(
  segments: WatchSegment[],
  durationSec?: number,
): number {
  return mergeSegments(segments, durationSec).reduce(
    (sum, s) => sum + (s.end - s.start),
    0,
  );
}

/**
 * Watched percentage, 0-100, rounded to the nearest integer.
 *
 * Returns 0 rather than NaN when the duration is unknown or zero — an
 * unknown-length video reports "no progress", never a divide-by-zero artifact
 * rendered as a percentage.
 */
export function watchPercent(watchedSeconds: number, durationSec?: number | null): number {
  if (!durationSec || durationSec <= 0) return 0;
  const pct = (watchedSeconds / durationSec) * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

/**
 * Folds newly reported intervals into the stored set.
 *
 * The caller persists `segments` so the next event extends a true union rather
 * than adding to a running total that would double-count re-watches.
 */
export function accumulateSegments(
  stored: WatchSegment[],
  incoming: WatchSegment[],
  durationSec?: number,
): { segments: WatchSegment[]; watchedSeconds: number; percent: number } {
  const segments = mergeSegments([...stored, ...incoming], durationSec);
  const watchedSeconds = segments.reduce((sum, s) => sum + (s.end - s.start), 0);

  return {
    segments,
    watchedSeconds,
    percent: watchPercent(watchedSeconds, durationSec),
  };
}

/**
 * Reads segments off a Prisma `Json` column.
 *
 * Tolerates null, legacy shapes, and hand-edited rows: anything unparseable
 * degrades to "no segments recorded" instead of throwing inside an ingest
 * request that the client would then retry forever.
 */
export function parseStoredSegments(value: unknown): WatchSegment[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(
      (s): s is WatchSegment =>
        !!s &&
        typeof s === 'object' &&
        typeof (s as WatchSegment).start === 'number' &&
        typeof (s as WatchSegment).end === 'number',
    )
    .map((s) => ({ start: s.start, end: s.end }));
}
