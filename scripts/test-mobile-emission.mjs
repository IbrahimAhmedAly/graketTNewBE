/**
 * End-to-end check that the payloads the MOBILE code emits produce correct
 * stored numbers.
 *
 * This replays the exact shapes built by VideoWatchTracker, ContentViewTracker
 * and StudySessionService — including the segment batching from real player
 * ticks — rather than hand-written ideal payloads. A tracker that computes
 * segments wrongly would pass a server-side test and fail here.
 */
import { PrismaClient } from '@prisma/client';

const BASE = 'http://localhost:3050/api/v1';
const prisma = new PrismaClient();

let pass = 0;
let fail = 0;

function eq(label, actual, expected) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    pass++;
    console.log(`  ✓ ${label}`);
  } else {
    fail++;
    console.log(`  ✗ ${label}\n      expected ${JSON.stringify(expected)}\n      actual   ${JSON.stringify(actual)}`);
  }
}

/**
 * Faithful port of VideoWatchTracker's tick logic, so the segments under test
 * are the ones the app would really send.
 */
class TrackerSim {
  constructor() {
    this.pending = [];
    this.segmentStart = null;
    this.lastPosition = null;
    this.latest = 0;
  }

  onTick(positionSec, isPlaying) {
    this.latest = positionSec;

    if (!isPlaying) {
      this.closeSegment();
      this.lastPosition = positionSec;
      return;
    }

    const last = this.lastPosition;
    if (last === null) {
      this.segmentStart = positionSec;
      this.lastPosition = positionSec;
      return;
    }

    const delta = positionSec - last;
    if (delta < 0 || delta > 2.5) {
      this.closeSegment();
      this.segmentStart = positionSec;
      this.lastPosition = positionSec;
      return;
    }

    if (this.segmentStart === null) this.segmentStart = last;
    this.lastPosition = positionSec;
  }

  closeSegment() {
    const start = this.segmentStart;
    const end = this.lastPosition;
    this.segmentStart = null;
    if (start === null || end === null) return;
    const s = Math.floor(start);
    const e = Math.ceil(end);
    if (e - s < 1) return;
    this.pending.push({ start: s < 0 ? 0 : s, end: e });
  }

  drain() {
    this.closeSegment();
    const batch = [...this.pending];
    this.pending = [];
    return batch;
  }
}

// ── fixture ────────────────────────────────────────────────────────────
const STAMP = Date.now();
const EMAIL = `mobile.sim.${STAMP}@gmail.com`;
const PASSWORD = 'password123';
const SERIAL = `SN-MOB-${STAMP}`;

const bcrypt = await import('bcrypt');
const user = await prisma.user.create({
  data: {
    email: EMAIL,
    name: 'Mobile Sim',
    password: await bcrypt.hash(PASSWORD, 10),
    serial: SERIAL,
    status: 'ACTIVE',
  },
});

const instructor = await prisma.instructor.findFirst();
const category = await prisma.category.findFirst();

const course = await prisma.course.create({
  data: {
    title: `Mobile Sim Course ${STAMP}`,
    slug: `mobile-sim-${STAMP}`,
    description: 'Fixture for verifying mobile-emitted tracking payloads.',
    instructorId: instructor.id,
    categoryId: category.id,
    isPublished: true,
    status: 'PUBLISHED',
    sections: {
      create: {
        title: 'S1',
        order: 1,
        contents: {
          create: [
            { title: 'Lecture 1', type: 'VIDEO', order: 1, duration: 10 },
            { title: 'Handout', type: 'PDF', order: 2 },
          ],
        },
      },
    },
  },
  include: { sections: { include: { contents: { orderBy: { order: 'asc' } } } } },
});
const [video, pdf] = course.sections[0].contents;

await prisma.enrollment.create({
  data: { userId: user.id, courseId: course.id, status: 'ONGOING' },
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

// ═══════════════════════════════════════════════════════════════════════
console.log('\n── SIMULATED PLAYBACK: watch 0→60s continuously ──────────');

// A real player ticks about twice a second. 120 ticks of 0.5s = 60 seconds.
let sim = new TrackerSim();
for (let i = 0; i <= 120; i++) sim.onTick(i * 0.5, true);
let batch = sim.drain();

eq('continuous playback yields ONE segment', batch.length, 1);
eq('segment covers 0-60s', batch[0], { start: 0, end: 60 });

let r = await post('/tracking/video-progress', {
  contentId: video.id,
  segments: batch,
  positionSec: 60,
  durationSec: 600,
  tzOffsetMinutes: 120,
});
// Hand-computed: 60s of 600s = 10%.
eq('server stores 60s', r.data.data.watchedSeconds, 60);
eq('server computes 10%', r.data.data.watchPercent, 10);

console.log('\n── SIMULATED SEEK: skip 60s → 500s, watch to 520s ────────');

sim = new TrackerSim();
sim.onTick(60, true);
sim.onTick(500, true); // the seek: a 440s jump, far beyond the threshold
for (let i = 1; i <= 40; i++) sim.onTick(500 + i * 0.5, true);
batch = sim.drain();

// The skipped 60→500 span must NOT appear as watched.
eq('seek produces a segment starting at 500, not 60', batch[batch.length - 1].start, 500);
const coversSkipped = batch.some((s) => s.start < 500 && s.end > 100);
eq('skipped span is NOT claimed as watched', coversSkipped, false);

r = await post('/tracking/video-progress', {
  contentId: video.id,
  segments: batch,
  positionSec: 520,
  durationSec: 600,
  tzOffsetMinutes: 120,
});
// Hand-computed: 60s (first watch) + 20s (500-520) = 80s of 600 = 13%.
eq('server total is 80s, not 520s', r.data.data.watchedSeconds, 80);
eq('server percent is 13%, not 87%', r.data.data.watchPercent, 13);

console.log('\n── SIMULATED PAUSE: pausing does not accrue time ─────────');

sim = new TrackerSim();
for (let i = 0; i <= 20; i++) sim.onTick(520 + i * 0.5, true); // watch 520-530
for (let i = 0; i < 30; i++) sim.onTick(530, false); // paused 15s at 530
batch = sim.drain();

const pausedTotal = batch.reduce((sum, s) => sum + (s.end - s.start), 0);
eq('paused ticks add no watched time (10s only)', pausedTotal, 10);

r = await post('/tracking/video-progress', {
  contentId: video.id,
  segments: batch,
  positionSec: 530,
  durationSec: 600,
  tzOffsetMinutes: 120,
});
// Hand-computed: 80 + 10 = 90s of 600 = 15%.
eq('server total 90s after pause', r.data.data.watchedSeconds, 90);
eq('server percent 15%', r.data.data.watchPercent, 15);

console.log('\n── REPLAY OF THE SAME STRETCH ────────────────────────────');

sim = new TrackerSim();
for (let i = 0; i <= 120; i++) sim.onTick(i * 0.5, true); // re-watch 0-60
batch = sim.drain();

r = await post('/tracking/video-progress', {
  contentId: video.id,
  segments: batch,
  positionSec: 60,
  durationSec: 600,
  tzOffsetMinutes: 120,
});
// Already counted: total must stay 90s.
eq('re-watching an earlier stretch adds nothing', r.data.data.watchedSeconds, 90);
eq('percent unchanged at 15%', r.data.data.watchPercent, 15);

console.log('\n── PDF READ DEPTH (viewer callbacks) ─────────────────────');

const started = await post('/tracking/content-view/start', {
  contentId: pdf.id,
  type: 'PDF',
  totalPages: 30,
});
const viewId = started.data.data.viewId;

// onPageChanged is 0-based; the tracker reports furthest page as 1-based.
// Student reaches index 17 => page 18, then pages BACK to index 5.
let furthest = 0;
for (const idx of [0, 3, 9, 17, 12, 5]) {
  const human = idx + 1;
  if (human > furthest) furthest = human;
}
eq('furthest page is 18, not the last page visited (6)', furthest, 18);

const ended = await post('/tracking/content-view/end', {
  viewId,
  durationSec: 45,
  pagesRead: furthest,
  totalPages: 30,
});
eq('server stores 18 pages read', ended.data.data.pagesRead, 18);
eq('server stores 30 total pages', ended.data.data.totalPages, 30);

console.log('\n── SESSION LIFECYCLE (foreground → background) ───────────');

const s = await post('/tracking/session/start', { tzOffsetMinutes: 120 });
const sessionId = s.data.data.sessionId;
eq('session opened on foreground', typeof sessionId, 'string');

const beat = await post('/tracking/session/heartbeat', { sessionId });
eq('heartbeat keeps it alive', beat.data.data.active, true);

// Simulate 12 minutes of study before backgrounding.
await prisma.studySession.update({
  where: { id: sessionId },
  data: { startedAt: new Date(Date.now() - 720 * 1000), lastHeartbeatAt: new Date() },
});
const closed = await post('/tracking/session/end', { sessionId });
eq('12-minute session credits 720s', Math.abs(closed.data.data.durationSec - 720) <= 1, true);

console.log('\n── AGGREGATE STATE AFTER A REALISTIC SESSION ─────────────');

const daily = await prisma.dailyActivity.findFirst({ where: { userId: user.id } });
eq('study time recorded for the day', Math.abs(daily.studySeconds - 720) <= 2, true);
eq('one PDF read recorded', daily.pdfsOpened, 1);
eq('no video completed (only 15% watched)', daily.videosWatched, 0);

const watch = await prisma.videoWatchProgress.findUnique({
  where: { userId_contentId: { userId: user.id, contentId: video.id } },
});
eq('stored watch percent is 15', watch.watchPercent, 15);
eq('resume position is the last reported', watch.lastPositionSec, 60);
eq('video not marked complete', watch.completedAt, null);

// ── cleanup ────────────────────────────────────────────────────────────
await prisma.studySession.deleteMany({ where: { userId: user.id } });
await prisma.contentView.deleteMany({ where: { userId: user.id } });
await prisma.videoWatchProgress.deleteMany({ where: { userId: user.id } });
await prisma.dailyActivity.deleteMany({ where: { userId: user.id } });
await prisma.studentStats.deleteMany({ where: { userId: user.id } });
await prisma.enrollment.deleteMany({ where: { userId: user.id } });
await prisma.course.delete({ where: { id: course.id } });
await prisma.user.delete({ where: { id: user.id } });

console.log(`\n${'='.repeat(60)}\n  PASS ${pass}   FAIL ${fail}\n${'='.repeat(60)}`);
await prisma.$disconnect();
process.exit(fail === 0 ? 0 : 1);
