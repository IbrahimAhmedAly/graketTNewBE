/**
 * Local-day bucketing for streaks, heat maps, and daily rollups.
 *
 * "Consecutive days" and "activity on a given square" are claims about the
 * STUDENT's calendar, not the server's. A 21:00 session in Cairo (UTC+2) is
 * 19:00 UTC the same day, but a 23:00 session is 21:00 UTC — and a naive UTC
 * bucket would file a late-night study session under tomorrow, silently
 * breaking a streak the student actually earned.
 *
 * The device sends its UTC offset in minutes; every day boundary in the
 * reporting layer is derived here so the rule lives in exactly one place.
 */

/** Minutes in a day, used to normalise offsets and day arithmetic. */
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_MINUTE = 60 * 1000;

/**
 * Clamps a client-supplied offset to the range of real world timezones
 * (UTC-12:00 … UTC+14:00). A malformed offset must not shift a student's
 * activity into a different day.
 */
export function normalizeTzOffset(offsetMinutes?: number | null): number {
  if (typeof offsetMinutes !== 'number' || !Number.isFinite(offsetMinutes)) return 0;
  return Math.max(-720, Math.min(840, Math.trunc(offsetMinutes)));
}

/**
 * The student's local calendar day for an instant, as a UTC-midnight Date.
 *
 * Stored in a `@db.Date` column, so only the date component survives; pinning
 * it to UTC midnight keeps every row comparable regardless of where the
 * student was when the row was written.
 */
export function toLocalDay(instant: Date, offsetMinutes?: number | null): Date {
  const offset = normalizeTzOffset(offsetMinutes);
  const shifted = new Date(instant.getTime() + offset * MS_PER_MINUTE);

  return new Date(
    Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()),
  );
}

/** Whole days from `a` to `b`; both are expected to be local-day values. */
export function daysBetween(a: Date, b: Date): number {
  return Math.round((stripTime(b).getTime() - stripTime(a).getTime()) / MS_PER_DAY);
}

/** Drops any time component, normalising to UTC midnight. */
export function stripTime(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** Shifts a local-day value by whole days. */
export function addDays(date: Date, days: number): Date {
  return new Date(stripTime(date).getTime() + days * MS_PER_DAY);
}

/**
 * Recomputes a streak given the last active day and the new activity day.
 *
 * Rules:
 *   - same day        → streak unchanged (studying twice today is still 1 day)
 *   - exactly +1 day  → streak extends
 *   - any larger gap  → streak resets to 1 (today itself counts)
 *   - no prior day    → streak starts at 1
 *
 * Note this is only ever called when there IS activity. A streak going stale
 * is decided at read time by `isStreakStale`, because nothing writes to a
 * student's row on a day they never opened the app.
 */
export function nextStreak(
  lastActiveDay: Date | null | undefined,
  activityDay: Date,
  currentStreak: number,
): number {
  if (!lastActiveDay) return 1;

  const gap = daysBetween(lastActiveDay, activityDay);

  if (gap === 0) return Math.max(1, currentStreak);
  if (gap === 1) return Math.max(1, currentStreak) + 1;
  if (gap < 0) return Math.max(1, currentStreak); // out-of-order event; never shrink

  return 1;
}

/**
 * Whether a stored streak has lapsed as of `today`.
 *
 * A streak is live only if the student was active today or yesterday. Without
 * this check a student who studied 10 days straight and then vanished for a
 * month would still be shown "10 day streak" — a stale number presented as
 * current.
 */
export function isStreakStale(lastActiveDay: Date | null | undefined, today: Date): boolean {
  if (!lastActiveDay) return true;
  return daysBetween(lastActiveDay, today) > 1;
}

/**
 * The streak to display: the stored value, or 0 once it has lapsed.
 */
export function effectiveStreak(
  storedStreak: number,
  lastActiveDay: Date | null | undefined,
  today: Date,
): number {
  return isStreakStale(lastActiveDay, today) ? 0 : storedStreak;
}

/** Inclusive list of local days spanning a range, for zero-filling charts. */
export function eachDay(from: Date, to: Date): Date[] {
  const days: Date[] = [];
  const total = daysBetween(from, to);

  for (let i = 0; i <= total; i++) {
    days.push(addDays(from, i));
  }

  return days;
}

/** `YYYY-MM-DD` for a local-day value — the wire format for chart payloads. */
export function formatDay(date: Date): string {
  return stripTime(date).toISOString().slice(0, 10);
}
