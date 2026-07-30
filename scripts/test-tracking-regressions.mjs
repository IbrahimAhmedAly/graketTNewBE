/**
 * Regressions for four bugs found against a real student account.
 *
 * Each block reproduces the original broken behaviour, so a revert fails here
 * rather than silently going out. What made these expensive to find is that
 * none of them threw: every one produced a plausible-looking zero, and the
 * dashboard rendered it as fact.
 *
 *  1. A video opened but never played left no progress row at all, so it was
 *     invisible to reporting rather than being counted as 0% watched.
 *  2. Study time was credited only when a session closed, so a session the app
 *     never ended (force-quit, backgrounded) credited nothing — the week chart
 *     and heat map stayed empty despite real study.
 *  3. Crediting incrementally then also crediting on close counted the same
 *     seconds twice.
 *  4. "Watch a lecture" required finishing a video, which on a two-hour lecture
 *     no honest day of study could satisfy.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
let pass = 0;
let fail = 0;

function eq(label, actual, expected) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    pass++;
    console.log(`  ✓ ${label}`);
  } else {
    fail++;
    console.log(
      `  ✗ ${label}\n      expected ${JSON.stringify(expected)}\n      actual   ${JSON.stringify(actual)}`,
    );
  }
}

const BASE = 'http://localhost:3050/api/v1';
const STAMP = Date.now();
const EMAIL = `regr.test.${STAMP}@gmail.com`;
const PASSWORD = 'password123';
const SERIAL = `SN-REGR-${STAMP}`;

const bcrypt = await import('bcrypt');
const user = await prisma.user.create({
  data: {
    email: EMAIL,
    name: 'Regression Fixture',
    password: await bcrypt.hash(PASSWORD, 10),
    serial: SERIAL,
    status: 'ACTIVE',
  },
});

const login = await (
  await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD, serial: SERIAL }),
  })
).json();
const TOKEN = login?.data?.data?.accessToken ?? login?.data?.accessToken;
const H = { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` };
const post = async (p, b) =>
  (await fetch(`${BASE}${p}`, { method: 'POST', headers: H, body: JSON.stringify(b) })).json();
const get = async (p) => (await fetch(`${BASE}${p}`, { headers: H })).json();

// A video the fixture student is enrolled in.
const video = await prisma.content.findFirst({
  where: { type: 'VIDEO' },
  select: { id: true, section: { select: { courseId: true } } },
});
await prisma.enrollment.create({
  data: { userId: user.id, courseId: video.section.courseId, status: 'ONGOING' },
});

const daily = async () =>
  (await prisma.dailyActivity.findFirst({ where: { userId: user.id } })) ?? {
    studySeconds: 0,
    videoSeconds: 0,
  };

// ── 1. opening a video without playing must register it ──────────────
console.log('\n── BUG 1: video opened but never played ──────────────────');

const noRowBefore = await prisma.videoWatchProgress.findFirst({
  where: { userId: user.id, contentId: video.id },
});
eq('no progress row before opening', noRowBefore, null);

const registered = await post('/tracking/video-progress', {
  contentId: video.id,
  segments: [],
  positionSec: 0,
  durationSec: 1800,
  isReplay: false,
  tzOffsetMinutes: 0,
});
eq('empty-segment report is accepted', registered.success, true);

const row = await prisma.videoWatchProgress.findFirst({
  where: { userId: user.id, contentId: video.id },
});
eq('a row now exists (video is visible to reporting)', row !== null, true);
eq('registered at 0 watched seconds — no invented time', row.watchedSeconds, 0);
eq('registered at 0 percent', row.watchPercent, 0);
eq('duration was captured for later percentage maths', row.durationSec, 1800);

const afterRegister = await daily();
eq('registering alone credits no video time', afterRegister.videoSeconds ?? 0, 0);

// ── 2. real playback credits the daily rollup ────────────────────────
console.log('\n── BUG 4a: playback credits videoSeconds ─────────────────');

await post('/tracking/video-progress', {
  contentId: video.id,
  segments: [{ start: 0, end: 120 }],
  positionSec: 120,
  durationSec: 1800,
  isReplay: false,
  tzOffsetMinutes: 0,
});
eq('120s of playback credited to the day', (await daily()).videoSeconds, 120);

// Re-sending the same batch must not inflate: the union cannot grow, so the
// credited delta is zero. This is the guard against a replayed request.
await post('/tracking/video-progress', {
  contentId: video.id,
  segments: [{ start: 0, end: 120 }],
  positionSec: 120,
  durationSec: 1800,
  isReplay: false,
  tzOffsetMinutes: 0,
});
eq('re-sending the identical batch credits nothing extra', (await daily()).videoSeconds, 120);

// Overlapping segments credit only the genuinely new span (120→180 = 60s).
await post('/tracking/video-progress', {
  contentId: video.id,
  segments: [{ start: 60, end: 180 }],
  positionSec: 180,
  durationSec: 1800,
  isReplay: false,
  tzOffsetMinutes: 0,
});
eq('overlapping segment credits only the new 60s', (await daily()).videoSeconds, 180);

// ── 3. mission reflects real watching, not completions ───────────────
console.log('\n── BUG 4b: "Watch a lecture" on a long video ─────────────');

const watchTask = async () =>
  (await get('/reports/mission?tzOffsetMinutes=0')).data.data.tasks.find(
    (t) => t.key === 'watch_video',
  );

eq('3 minutes of a 30-minute video is not yet enough', (await watchTask()).done, false);

const completed = await prisma.videoWatchProgress.findFirst({
  where: { userId: user.id, contentId: video.id },
});
eq('...and the video is nowhere near complete', completed.watchPercent < 90, true);

// Cross the five-minute bar.
await post('/tracking/video-progress', {
  contentId: video.id,
  segments: [{ start: 180, end: 400 }],
  positionSec: 400,
  durationSec: 1800,
  isReplay: false,
  tzOffsetMinutes: 0,
});
eq('videoSeconds now past the 300s bar', (await daily()).videoSeconds >= 300, true);
eq('task completes on real watching, without finishing', (await watchTask()).done, true);

const stillIncomplete = await prisma.videoWatchProgress.findFirst({
  where: { userId: user.id, contentId: video.id },
});
eq('...and the video is still not 90% watched', stillIncomplete.watchPercent < 90, true);

// ── 4. study time is credited while the session is open ──────────────
console.log('\n── BUG 2: open session must still credit study time ──────');

await prisma.dailyActivity.deleteMany({ where: { userId: user.id } });

const s = await post('/tracking/session/start', { tzOffsetMinutes: 0 });
const sessionId = s.data.data.sessionId;

// Backdate 20 minutes: the session is open and has never been closed, which is
// exactly the state that used to credit zero.
await prisma.studySession.update({
  where: { id: sessionId },
  data: { startedAt: new Date(Date.now() - 1200 * 1000) },
});

const beat = await post('/tracking/session/heartbeat', { sessionId });
eq('heartbeat reports what it credited', Math.abs(beat.data.data.creditedSec - 1200) <= 2, true);

const open = await prisma.studySession.findUnique({ where: { id: sessionId } });
eq('session is still open', open.endedAt, null);
eq('...yet its time is already banked', Math.abs((await daily()).studySeconds - 1200) <= 2, true);

const dash = await get('/reports/dashboard?tzOffsetMinutes=0');
const todayCell = dash.data.data.weeklyActivity.at(-1);
eq('the week chart shows ~20 minutes today', Math.abs(todayCell.studyMinutes - 20) <= 1, true);
eq('the mission 15-minute task is satisfied', (await get('/reports/mission?tzOffsetMinutes=0')).data.data.tasks.find((t) => t.key === 'study_15_min').done, true);

// ── 5. closing must not re-credit what heartbeats already banked ─────
console.log('\n── BUG 3: end-of-session double counting ─────────────────');

const beforeEnd = (await daily()).studySeconds;
const ended = await post('/tracking/session/end', { sessionId });
const afterEnd = (await daily()).studySeconds;

eq('end reports the full session duration', Math.abs(ended.data.data.durationSec - 1200) <= 3, true);
eq('but only the uncredited remainder is added', afterEnd - beforeEnd <= 3, true);
eq('total is the real elapsed time, not double', Math.abs(afterEnd - 1200) <= 3, true);

// Repeated heartbeats on one session must each add only new time.
console.log('\n── BUG 3b: repeated heartbeats ───────────────────────────');

await prisma.dailyActivity.deleteMany({ where: { userId: user.id } });
const s2 = await post('/tracking/session/start', { tzOffsetMinutes: 0 });
const id2 = s2.data.data.sessionId;
await prisma.studySession.update({
  where: { id: id2 },
  data: { startedAt: new Date(Date.now() - 600 * 1000) },
});

await post('/tracking/session/heartbeat', { sessionId: id2 });
const afterFirst = (await daily()).studySeconds;

const extra = [];
for (let i = 0; i < 4; i++) {
  const b = await post('/tracking/session/heartbeat', { sessionId: id2 });
  extra.push(b.data.data.creditedSec);
}

eq('first heartbeat credits the elapsed 600s', Math.abs(afterFirst - 600) <= 2, true);
eq('four further heartbeats credit ~nothing', extra.every((n) => n <= 2), true);
eq('total never inflates past real elapsed time', (await daily()).studySeconds <= 610, true);

// cleanup
await prisma.studySession.deleteMany({ where: { userId: user.id } });
await prisma.videoWatchProgress.deleteMany({ where: { userId: user.id } });
await prisma.dailyActivity.deleteMany({ where: { userId: user.id } });
await prisma.studentStats.deleteMany({ where: { userId: user.id } });
await prisma.enrollment.deleteMany({ where: { userId: user.id } });
await prisma.user.delete({ where: { id: user.id } });

console.log(`\n${'='.repeat(58)}\n  PASS ${pass}   FAIL ${fail}\n${'='.repeat(58)}`);
await prisma.$disconnect();
process.exit(fail === 0 ? 0 : 1);
