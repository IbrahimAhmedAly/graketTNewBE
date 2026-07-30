/**
 * Integration test for activity ingestion.
 *
 * Every assertion compares a live HTTP response against a value computed by
 * hand in the comment above it. A statistic that merely "looks plausible" is
 * the failure mode this suite exists to catch.
 */
import { PrismaClient } from '@prisma/client';

const BASE = 'http://localhost:3050/api/v1';
const prisma = new PrismaClient();

let pass = 0;
let fail = 0;

function eq(label, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    pass++;
    console.log(`  ✓ ${label}`);
  } else {
    fail++;
    console.log(`  ✗ ${label}\n      expected ${e}\n      actual   ${a}`);
  }
}

function section(title) {
  console.log(`\n${'─'.repeat(60)}\n  ${title}\n${'─'.repeat(60)}`);
}

// ── fixture ────────────────────────────────────────────────────────────
const STAMP = Date.now();
const EMAIL = `track.test.${STAMP}@gmail.com`;
const PASSWORD = 'password123';
const SERIAL = `SN-TRACK-${STAMP}`;

const level = await prisma.educationLevel.findFirst({ include: { grades: true } });

const user = await prisma.user.create({
  data: {
    email: EMAIL,
    name: 'Tracking Fixture',
    password: '$2b$10$K7L1OJ0/9Y8sWvBhFZ7ZuOQxJhVvxJZ8XqYqZ8XqYqZ8XqYqZ8XqY',
    serial: SERIAL,
    status: 'ACTIVE',
    educationLevelId: level?.id ?? null,
    gradeId: level?.grades?.[0]?.id ?? null,
  },
});

// Set a known bcrypt hash for PASSWORD so we can log in over HTTP.
const bcrypt = await import('bcrypt');
await prisma.user.update({
  where: { id: user.id },
  data: { password: await bcrypt.hash(PASSWORD, 10) },
});

// A course with a 10-minute video (600s) and a PDF, enrolled.
const instructor = await prisma.instructor.findFirst();
const category = await prisma.category.findFirst();

const course = await prisma.course.create({
  data: {
    title: `Tracking Fixture Course ${STAMP}`,
    slug: `tracking-fixture-${STAMP}`,
    description: 'Fixture course for verifying activity ingestion.',
    instructorId: instructor.id,
    categoryId: category.id,
    isPublished: true,
    status: 'PUBLISHED',
    sections: {
      create: {
        title: 'Section 1',
        order: 1,
        contents: {
          create: [
            { title: 'Video A (10 min)', type: 'VIDEO', order: 1, duration: 10 },
            { title: 'Doc B', type: 'PDF', order: 2 },
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

// A second course the student is NOT enrolled in, for the access check.
const otherCourse = await prisma.course.create({
  data: {
    title: `Unenrolled Course ${STAMP}`,
    slug: `unenrolled-${STAMP}`,
    description: 'Student has no enrollment here.',
    instructorId: instructor.id,
    categoryId: category.id,
    sections: {
      create: {
        title: 'S1',
        order: 1,
        contents: { create: [{ title: 'Locked Video', type: 'VIDEO', order: 1, duration: 5 }] },
      },
    },
  },
  include: { sections: { include: { contents: true } } },
});
const lockedVideo = otherCourse.sections[0].contents[0];

// ── auth ───────────────────────────────────────────────────────────────
const loginRes = await fetch(`${BASE}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD, serial: SERIAL }),
});
const loginJson = await loginRes.json();
const TOKEN = loginJson?.data?.data?.accessToken ?? loginJson?.data?.accessToken;

if (!TOKEN) {
  console.error('LOGIN FAILED:', JSON.stringify(loginJson, null, 2));
  process.exit(1);
}

const H = { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` };
const post = async (path, body) =>
  (await fetch(`${BASE}${path}`, { method: 'POST', headers: H, body: JSON.stringify(body) })).json();
const get = async (path) => (await fetch(`${BASE}${path}`, { headers: H })).json();

// ═══════════════════════════════════════════════════════════════════════
section('LAST LOGIN — stamped on authenticate');
const afterLogin = await prisma.user.findUnique({
  where: { id: user.id },
  select: { lastLoginAt: true },
});
eq('lastLoginAt is set by login', afterLogin.lastLoginAt !== null, true);

// ═══════════════════════════════════════════════════════════════════════
section('VIDEO WATCH — the anti-inflation rules');

// Watch 0-180s of a 600s video. Hand-computed: 180/600 = 30%.
let r = await post('/tracking/video-progress', {
  contentId: video.id,
  segments: [{ start: 0, end: 180 }],
  positionSec: 180,
  durationSec: 600,
});
eq('180s of 600s => watchedSeconds 180', r.data.data.watchedSeconds, 180);
eq('180s of 600s => 30%', r.data.data.watchPercent, 30);
eq('not complete at 30%', r.data.data.isCompleted, false);

// Re-send the SAME interval. A retry must not add time: still 180s / 30%.
r = await post('/tracking/video-progress', {
  contentId: video.id,
  segments: [{ start: 0, end: 180 }],
  positionSec: 180,
  durationSec: 600,
});
eq('duplicate report does NOT inflate (still 180s)', r.data.data.watchedSeconds, 180);
eq('duplicate report does NOT inflate (still 30%)', r.data.data.watchPercent, 30);

// Re-watch an overlapping stretch 120-240. Union = [0,240] => 240s = 40%.
r = await post('/tracking/video-progress', {
  contentId: video.id,
  segments: [{ start: 120, end: 240 }],
  positionSec: 240,
  durationSec: 600,
});
eq('overlap counted once => 240s', r.data.data.watchedSeconds, 240);
eq('overlap counted once => 40%', r.data.data.watchPercent, 40);

// Skip to the very end and watch 5s: [0,240] + [595,600] = 245s => 41%.
// The critical case: reaching the end must NOT read as 100%.
r = await post('/tracking/video-progress', {
  contentId: video.id,
  segments: [{ start: 595, end: 600 }],
  positionSec: 600,
  durationSec: 600,
});
eq('skip-to-end does NOT jump to 100% (245s)', r.data.data.watchedSeconds, 245);
eq('skip-to-end does NOT jump to 100% (41%)', r.data.data.watchPercent, 41);
eq('still not complete', r.data.data.isCompleted, false);

// Fill the gap 240-595. Union = [0,600] => 600s => 100%, now complete.
r = await post('/tracking/video-progress', {
  contentId: video.id,
  segments: [{ start: 240, end: 595 }],
  positionSec: 600,
  durationSec: 600,
});
eq('genuine full watch => 600s', r.data.data.watchedSeconds, 600);
eq('genuine full watch => 100%', r.data.data.watchPercent, 100);
eq('marked complete', r.data.data.isCompleted, true);

// Resume position is independent of progress: seek back to 10s.
r = await post('/tracking/video-progress', {
  contentId: video.id,
  segments: [],
  positionSec: 10,
  durationSec: 600,
  isReplay: true,
});
eq('resume position updates to 10s', r.data.data.lastPositionSec, 10);
eq('watched stays 100% after seeking back', r.data.data.watchPercent, 100);
eq('replay counted', r.data.data.replayCount, 1);
eq('completion is not revoked by re-watching', r.data.data.isCompleted, true);

// GET resume state.
r = await get(`/tracking/video-progress/${video.id}`);
eq('GET returns stored percent', r.data.data.watchPercent, 100);
eq('GET returns resume position', r.data.data.lastPositionSec, 10);

// Zero state for an untouched video must be 0, never null/NaN.
r = await get(`/tracking/video-progress/${pdf.id}`);
eq('untouched content => 0% not null', r.data.data.watchPercent, 0);
eq('untouched content => 0 seconds', r.data.data.watchedSeconds, 0);

// ═══════════════════════════════════════════════════════════════════════
section('DAILY ROLLUP — counted once, on transition only');
const dailyAfterVideo = await prisma.dailyActivity.findFirst({ where: { userId: user.id } });
eq('exactly 1 video credited (not once per report)', dailyAfterVideo.videosWatched, 1);
eq('points credited once (10)', dailyAfterVideo.pointsEarned, 10);

// ═══════════════════════════════════════════════════════════════════════
section('ACCESS CONTROL');
const locked = await post('/tracking/video-progress', {
  contentId: lockedVideo.id,
  segments: [{ start: 0, end: 60 }],
  positionSec: 60,
  durationSec: 300,
});
eq('unenrolled course rejected 403', locked.statusCode, 403);

const missing = await post('/tracking/video-progress', {
  contentId: '00000000-0000-4000-8000-000000000000',
  segments: [{ start: 0, end: 10 }],
  positionSec: 10,
});
eq('unknown content rejected 404', missing.statusCode, 404);

// ═══════════════════════════════════════════════════════════════════════
section('CONTENT VIEW — PDF read depth');
const started = await post('/tracking/content-view/start', {
  contentId: pdf.id,
  type: 'PDF',
  totalPages: 20,
});
const viewId = started.data.data.viewId;
eq('view opened', typeof viewId, 'string');

// Claim 9999s of reading after ~0s elapsed. Server must clamp to elapsed.
const ended = await post('/tracking/content-view/end', {
  viewId,
  durationSec: 9999,
  pagesRead: 12,
  totalPages: 20,
});
eq('inflated dwell time clamped to elapsed', ended.data.data.durationSec < 60, true);
eq('pages read recorded', ended.data.data.pagesRead, 12);

// Claim more pages than the document has: must clamp to totalPages.
const v2 = await post('/tracking/content-view/start', { contentId: pdf.id, type: 'PDF', totalPages: 20 });
const e2 = await post('/tracking/content-view/end', {
  viewId: v2.data.data.viewId,
  durationSec: 5,
  pagesRead: 999,
  totalPages: 20,
});
eq('pagesRead cannot exceed totalPages', e2.data.data.pagesRead, 20);

// A DIFFERENT document must still earn its own credit — the once-per-day rule
// is per content, not a blanket daily cap.
const pdf2 = await prisma.content.create({
  data: { title: 'Doc C', type: 'PDF', order: 3, sectionId: course.sections[0].id },
});
const v3 = await post('/tracking/content-view/start', { contentId: pdf2.id, type: 'PDF', totalPages: 4 });
await post('/tracking/content-view/end', {
  viewId: v3.data.data.viewId,
  durationSec: 3,
  pagesRead: 4,
  totalPages: 4,
});
const dailyTwoPdfs = await prisma.dailyActivity.findFirst({
  where: { userId: user.id },
  orderBy: { date: 'desc' },
});
eq('a second distinct PDF does earn credit', dailyTwoPdfs.pdfsOpened, 2);

// Another student's view must be refused.
const foreign = await prisma.contentView.create({
  data: { userId: (await prisma.user.findFirst({ where: { id: { not: user.id } } })).id, contentId: pdf.id, type: 'PDF' },
});
const foreignEnd = await post('/tracking/content-view/end', { viewId: foreign.id, durationSec: 10 });
eq("another student's view rejected 403", foreignEnd.statusCode, 403);

// ═══════════════════════════════════════════════════════════════════════
section('STUDY SESSION — no double-counting, no phantom hours');
const s1 = await post('/tracking/session/start', { tzOffsetMinutes: 120 });
const sessionId = s1.data.data.sessionId;
eq('session opened', s1.data.data.resumed, false);

// Starting again must REUSE the open session, not create a second one that
// would double-count the same wall-clock minutes.
const s2 = await post('/tracking/session/start', { tzOffsetMinutes: 120 });
eq('second start reuses open session', s2.data.data.resumed, true);
eq('same session id', s2.data.data.sessionId, sessionId);

const openCount = await prisma.studySession.count({ where: { userId: user.id, endedAt: null } });
eq('exactly one open session exists', openCount, 1);

const hb = await post('/tracking/session/heartbeat', { sessionId });
eq('heartbeat accepted', hb.data.data.active, true);

const endRes = await post('/tracking/session/end', { sessionId });
eq('session closed', typeof endRes.data.data.durationSec, 'number');
eq('duration is plausible (< 60s for this test)', endRes.data.data.durationSec < 60, true);

// Ending twice must be harmless, not double-credit.
const dailyBefore = await prisma.dailyActivity.findFirst({ where: { userId: user.id }, orderBy: { date: 'desc' } });
await post('/tracking/session/end', { sessionId });
const dailyAfter = await prisma.dailyActivity.findFirst({ where: { userId: user.id }, orderBy: { date: 'desc' } });
eq('double-end does not double-credit study time', dailyAfter.studySeconds, dailyBefore.studySeconds);

// Another student's session must be refused.
const otherUser = await prisma.user.findFirst({ where: { id: { not: user.id } } });
const foreignSession = await prisma.studySession.create({ data: { userId: otherUser.id } });
const fs = await post('/tracking/session/heartbeat', { sessionId: foreignSession.id });
eq("another student's session rejected 403", fs.statusCode, 403);

// ═══════════════════════════════════════════════════════════════════════
section('STREAK');
const stats = await prisma.studentStats.findUnique({ where: { userId: user.id } });
eq('streak started at 1', stats.currentStreak, 1);
eq('longest streak tracked', stats.longestStreak, 1);
// 10 (video completed) + 5 (Doc B, opened twice → paid once) + 5 (Doc C).
// Reopening one document must not pay twice; a different one must.
eq('points: video 10 + 2 distinct pdfs 10', stats.totalPoints, 20);

const dailyFinal = await prisma.dailyActivity.findFirst({
  where: { userId: user.id },
  orderBy: { date: 'desc' },
});
eq('2 distinct PDFs read (Doc B twice = 1)', dailyFinal.pdfsOpened, 2);

// ═══════════════════════════════════════════════════════════════════════
section('VALIDATION');
const badSeg = await post('/tracking/video-progress', {
  contentId: video.id,
  segments: [{ start: -5, end: 'abc' }],
  positionSec: 0,
});
eq('malformed segment rejected 400', badSeg.statusCode, 400);

const badUuid = await post('/tracking/session/heartbeat', { sessionId: 'not-a-uuid' });
eq('malformed uuid rejected 400', badUuid.statusCode, 400);

// ── cleanup ────────────────────────────────────────────────────────────
await prisma.studySession.deleteMany({ where: { userId: { in: [user.id, otherUser.id] } } });
await prisma.contentView.deleteMany({ where: { contentId: { in: [pdf.id, video.id] } } });
await prisma.videoWatchProgress.deleteMany({ where: { userId: user.id } });
await prisma.dailyActivity.deleteMany({ where: { userId: user.id } });
await prisma.studentStats.deleteMany({ where: { userId: user.id } });
await prisma.enrollment.deleteMany({ where: { userId: user.id } });
await prisma.course.deleteMany({ where: { id: { in: [course.id, otherCourse.id] } } });
await prisma.user.delete({ where: { id: user.id } });

console.log(`\n${'='.repeat(60)}\n  PASS ${pass}   FAIL ${fail}\n${'='.repeat(60)}`);
await prisma.$disconnect();
process.exit(fail === 0 ? 0 : 1);
