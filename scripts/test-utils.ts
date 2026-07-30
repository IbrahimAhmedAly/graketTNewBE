import {
  mergeSegments, totalWatchedSeconds, watchPercent, accumulateSegments, parseStoredSegments,
} from '../src/modules/tracking/utils/watch-segments.util';
import {
  toLocalDay, daysBetween, nextStreak, isStreakStale, effectiveStreak, formatDay, eachDay, normalizeTzOffset,
} from '../src/modules/tracking/utils/local-day.util';

let pass = 0, fail = 0;
function eq(label: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.log(`  ✗ ${label}\n      expected ${e}\n      actual   ${a}`); }
}

console.log('\n=== WATCH SEGMENTS ===');
eq('disjoint stay separate', mergeSegments([{start:0,end:10},{start:20,end:30}]), [{start:0,end:10},{start:20,end:30}]);
eq('overlapping merge', mergeSegments([{start:0,end:10},{start:5,end:15}]), [{start:0,end:15}]);
eq('adjacent merge (heartbeat boundary)', mergeSegments([{start:0,end:10},{start:10,end:20}]), [{start:0,end:20}]);
eq('unsorted input handled', mergeSegments([{start:20,end:30},{start:0,end:10}]), [{start:0,end:10},{start:20,end:30}]);
eq('fully contained swallowed', mergeSegments([{start:0,end:100},{start:10,end:20}]), [{start:0,end:100}]);
eq('zero-length dropped', mergeSegments([{start:5,end:5}]), []);
eq('reversed dropped', mergeSegments([{start:10,end:5}]), []);
eq('clamped to duration', mergeSegments([{start:0,end:9999}], 600), [{start:0,end:600}]);
eq('negative start clamped', mergeSegments([{start:-50,end:10}], 600), [{start:0,end:10}]);

console.log('\n  -- the anti-inflation cases --');
eq('rewatching same 30s counts once', totalWatchedSeconds([
  {start:0,end:30},{start:0,end:30},{start:0,end:30},{start:0,end:30}]), 30);
eq('skip-to-end does NOT give 100%', watchPercent(totalWatchedSeconds([{start:595,end:600}], 600), 600), 1);
eq('genuine full watch gives 100%', watchPercent(totalWatchedSeconds([{start:0,end:600}], 600), 600), 100);

console.log('\n  -- percent --');
eq('3 of 10 min => 30%', watchPercent(180, 600), 30);
eq('unknown duration => 0 not NaN', watchPercent(180, null), 0);
eq('zero duration => 0 not Infinity', watchPercent(180, 0), 0);
eq('over-watch capped at 100', watchPercent(9999, 600), 100);
eq('rounds to nearest', watchPercent(1, 3), 33);

console.log('\n  -- accumulate across events --');
const acc1 = accumulateSegments([{start:0,end:60}], [{start:60,end:120}], 600);
eq('contiguous extends', acc1.segments, [{start:0,end:120}]);
eq('  watched', acc1.watchedSeconds, 120);
eq('  percent', acc1.percent, 20);
const acc2 = accumulateSegments([{start:0,end:60}], [{start:30,end:90}], 600);
eq('overlap not double-counted', acc2.watchedSeconds, 90);

console.log('\n  -- parse stored --');
eq('null => []', parseStoredSegments(null), []);
eq('garbage => []', parseStoredSegments('nonsense'), []);
eq('partial garbage filtered', parseStoredSegments([{start:0,end:10},{bad:1},null]), [{start:0,end:10}]);

console.log('\n=== LOCAL DAY / TIMEZONE ===');
const cairo = 120; // UTC+2
eq('Cairo 21:00 stays same local day', formatDay(toLocalDay(new Date('2026-07-25T19:00:00Z'), cairo)), '2026-07-25');
// 21:30Z + 2h = 23:30 local, still the 25th — the last moment of the local day.
eq('Cairo 23:30 local is still same day', formatDay(toLocalDay(new Date('2026-07-25T21:30:00Z'), cairo)), '2026-07-25');
// 22:30Z + 2h = 00:30 local on the 26th — crossing the student's midnight.
eq('Cairo 00:30 local rolls to next day', formatDay(toLocalDay(new Date('2026-07-25T22:30:00Z'), cairo)), '2026-07-26');
// The exact boundary: 22:00Z is precisely 00:00 local on the 26th.
eq('Cairo exact local midnight', formatDay(toLocalDay(new Date('2026-07-25T22:00:00Z'), cairo)), '2026-07-26');
eq('Cairo one second before midnight', formatDay(toLocalDay(new Date('2026-07-25T21:59:59Z'), cairo)), '2026-07-25');
eq('UTC midnight boundary', formatDay(toLocalDay(new Date('2026-07-25T00:00:00Z'), 0)), '2026-07-25');
eq('negative offset (UTC-5) rolls back', formatDay(toLocalDay(new Date('2026-07-25T02:00:00Z'), -300)), '2026-07-24');
eq('bogus offset clamped', normalizeTzOffset(99999), 840);

console.log('\n  -- streaks --');
const d = (s: string) => new Date(s + 'T00:00:00Z');
eq('first ever activity => 1', nextStreak(null, d('2026-07-25'), 0), 1);
eq('same day twice => unchanged', nextStreak(d('2026-07-25'), d('2026-07-25'), 5), 5);
eq('consecutive => +1', nextStreak(d('2026-07-24'), d('2026-07-25'), 5), 6);
eq('gap of 2 => reset to 1', nextStreak(d('2026-07-23'), d('2026-07-25'), 5), 1);
eq('out-of-order never shrinks', nextStreak(d('2026-07-26'), d('2026-07-25'), 5), 5);
eq('stale after 2 days', isStreakStale(d('2026-07-23'), d('2026-07-25')), true);
eq('not stale yesterday', isStreakStale(d('2026-07-24'), d('2026-07-25')), false);
eq('lapsed streak shows 0', effectiveStreak(10, d('2026-06-01'), d('2026-07-25')), 0);
eq('live streak shows stored', effectiveStreak(10, d('2026-07-25'), d('2026-07-25')), 10);

console.log('\n  -- ranges --');
eq('eachDay inclusive', eachDay(d('2026-07-23'), d('2026-07-25')).map(formatDay), ['2026-07-23','2026-07-24','2026-07-25']);
eq('daysBetween', daysBetween(d('2026-07-01'), d('2026-07-25')), 24);
eq('spans month end', daysBetween(d('2026-07-30'), d('2026-08-02')), 3);

console.log(`\n${'='.repeat(40)}\n  PASS ${pass}   FAIL ${fail}\n${'='.repeat(40)}`);
process.exit(fail === 0 ? 0 : 1);
