/**
 * Contract check between the reporting API and the Flutter models.
 *
 * `flutter analyze` proves the Dart compiles; it cannot prove the JSON the
 * server sends matches the keys the models read. This walks the real responses
 * and asserts every field the mobile code depends on is present with the
 * expected type — including the nullable ones, where the UI's whole behaviour
 * (show a dash, not a zero) hinges on receiving a genuine null.
 */
import { PrismaClient } from '@prisma/client';

const BASE = 'http://localhost:3050/api/v1';
const prisma = new PrismaClient();

let pass = 0;
let fail = 0;

function ok(label, condition, detail = '') {
  if (condition) {
    pass++;
    console.log(`  ✓ ${label}`);
  } else {
    fail++;
    console.log(`  ✗ ${label}${detail ? `\n      ${detail}` : ''}`);
  }
}

function section(t) {
  console.log(`\n${'─'.repeat(60)}\n  ${t}\n${'─'.repeat(60)}`);
}

/** Mirrors the Dart `_int` helper: must survive int, num and string. */
const parsesAsInt = (v) =>
  typeof v === 'number' || (typeof v === 'string' && !Number.isNaN(+v));

const STAMP = Date.now();
const bcrypt = await import('bcrypt');

const email = `ui.contract.${STAMP}@gmail.com`;
const serial = `SN-UI-${STAMP}`;
const user = await prisma.user.create({
  data: {
    email,
    name: 'UI Contract',
    password: await bcrypt.hash('password123', 10),
    serial,
    status: 'ACTIVE',
  },
});

const login = await (
  await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'password123', serial }),
  })
).json();
const token = login?.data?.data?.accessToken ?? login?.data?.accessToken;
const H = { Authorization: `Bearer ${token}` };
const get = async (p) => (await fetch(`${BASE}${p}`, { headers: H })).json();

// ═══════════════════════════════════════════════════════════════════════
section('ENVELOPE — the shape the Dart controller unwraps');

let raw = await get('/reports/dashboard?tzOffsetMinutes=120');
ok('top level has data', raw?.data !== undefined);
ok('nested data.data present (double unwrap)', raw?.data?.data !== undefined);

const d = raw.data.data;

section('DashboardData.fromJson — required keys');
for (const key of [
  'student',
  'overview',
  'circularProgress',
  'subjects',
  'weeklyActivity',
  'heatmap',
  'successIndex',
  'ranking',
]) {
  ok(`"${key}" present`, d[key] !== undefined);
}

ok('circularProgress.percent is numeric', parsesAsInt(d.circularProgress?.percent));
ok('subjects is a list', Array.isArray(d.subjects));
ok('weeklyActivity is a list', Array.isArray(d.weeklyActivity));
ok('heatmap is a list', Array.isArray(d.heatmap));

section('ProgressOverview — every field the tiles read');
const o = d.overview;
for (const key of [
  'overallProgressPercent',
  'videosWatched',
  'videosRemaining',
  'totalVideos',
  'pdfsOpened',
  'totalPdfs',
  'quizzesTaken',
  'studyHours',
  'currentStreak',
  'longestStreak',
  'totalPoints',
]) {
  ok(`overview.${key} numeric`, parsesAsInt(o[key]), `got ${JSON.stringify(o[key])}`);
}

// The nullable one. The UI shows "—" on null; a 0 here would render as a real
// average of zero, which is a different and false claim.
ok(
  'overview.averageQuizScore is NULL for a student with no attempts',
  o.averageQuizScore === null,
  `got ${JSON.stringify(o.averageQuizScore)}`,
);

section('SuccessIndex — the null-score contract');
const si = d.successIndex;
ok('successIndex.score is null for a new student', si.score === null);
ok('successIndex.reason is a string', typeof si.reason === 'string');
ok('successIndex.band is null when unscored', si.band === null);
ok('components is a list', Array.isArray(si.components));
ok('four components returned', si.components.length === 4);

for (const c of si.components) {
  ok(
    `component "${c.key}" has label/weight/raw/contribution/hasData`,
    typeof c.label === 'string' &&
      parsesAsInt(c.weight) &&
      parsesAsInt(c.raw) &&
      parsesAsInt(c.contribution) &&
      typeof c.hasData === 'boolean',
  );
}

section('RankingInfo');
ok('ranking.available is a boolean', typeof d.ranking.available === 'boolean');
ok('ranking.cohortSize numeric', parsesAsInt(d.ranking.cohortSize));
ok(
  'ranking exposes NO raw position field',
  d.ranking.rank === undefined && d.ranking.position === undefined,
  `unexpected keys: ${Object.keys(d.ranking).join(', ')}`,
);

section('Weekly + heatmap cell shape');
ok('weekly has 7 entries', d.weeklyActivity.length === 7);
const w0 = d.weeklyActivity[0];
ok(
  'weekly cell has date/studyMinutes/videos/quizzes',
  typeof w0.date === 'string' &&
    parsesAsInt(w0.studyMinutes) &&
    parsesAsInt(w0.videos) &&
    parsesAsInt(w0.quizzes),
);
// DayActivity.weekdayLabel does DateTime.parse on this.
ok('weekly date parses as a date', !Number.isNaN(Date.parse(w0.date)));

ok('heatmap has 30 cells', d.heatmap.length === 30);
const h0 = d.heatmap[0];
ok(
  'heatmap cell has date/studyMinutes/level',
  typeof h0.date === 'string' &&
    parsesAsInt(h0.studyMinutes) &&
    parsesAsInt(h0.level),
);
ok(
  'heatmap level within 0..4 (widget switches on this)',
  d.heatmap.every((c) => c.level >= 0 && c.level <= 4),
);

section('Mission / insights / rewards / suggestions / quiz payloads');

raw = await get('/reports/mission?tzOffsetMinutes=120');
const mission = raw.data.data;
ok('mission.tasks is a list', Array.isArray(mission.tasks));
ok('mission has 4 tasks', mission.tasks.length === 4);
ok(
  'each task has key/label/done',
  mission.tasks.every(
    (t) =>
      typeof t.key === 'string' &&
      typeof t.label === 'string' &&
      typeof t.done === 'boolean',
  ),
);

raw = await get('/reports/insights?tzOffsetMinutes=120');
ok('insights.insights is a list', Array.isArray(raw.data.data.insights));

raw = await get('/reports/rewards');
const rw = raw.data.data;
ok('rewards.totalPoints numeric', parsesAsInt(rw.totalPoints));
ok('rewards.badgesEarned numeric', parsesAsInt(rw.badgesEarned));
ok('rewards.badgesAvailable numeric', parsesAsInt(rw.badgesAvailable));
ok('rewards.latestBadge null when none earned', rw.latestBadge === null);
ok(
  'rewards.nextBadge has name/icon/pointsRemaining',
  rw.nextBadge === null ||
    (typeof rw.nextBadge.name === 'string' &&
      typeof rw.nextBadge.icon === 'string' &&
      parsesAsInt(rw.nextBadge.pointsRemaining)),
);

raw = await get('/reports/suggestions');
ok('suggestions.suggestions is a list', Array.isArray(raw.data.data.suggestions));
ok('suggestions.basis is a string', typeof raw.data.data.basis === 'string');

raw = await get('/reports/quiz-analytics');
const qa = raw.data.data;
ok('quiz.totalAttempts numeric', parsesAsInt(qa.totalAttempts));
ok('quiz.averageScore null with no attempts', qa.averageScore === null);
ok('quiz.highestScore null with no attempts', qa.highestScore === null);
ok('quiz.weakestSubject null with no attempts', qa.weakestSubject === null);

// cleanup
await prisma.studentStats.deleteMany({ where: { userId: user.id } });
await prisma.user.delete({ where: { id: user.id } });

console.log(`\n${'='.repeat(60)}\n  PASS ${pass}   FAIL ${fail}\n${'='.repeat(60)}`);
await prisma.$disconnect();
process.exit(fail === 0 ? 0 : 1);
