/**
 * Verification for every reported statistic.
 *
 * A deterministic fixture is built so that each expected value can be computed
 * by hand, in the comment above its assertion. "Looks about right" is exactly
 * the failure this suite exists to prevent — a wrong percentage renders
 * perfectly and misleads silently.
 *
 * FIXTURE (all numbers chosen to divide cleanly):
 *   Course A: 10 contents — 6 VIDEO, 2 PDF, 2 QUIZ
 *   Course B:  5 contents — 5 VIDEO
 *   Wishlisted course C: 4 contents  (must be EXCLUDED everywhere)
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

function section(t) {
  console.log(`\n${'─'.repeat(62)}\n  ${t}\n${'─'.repeat(62)}`);
}

const STAMP = Date.now();
const bcrypt = await import('bcrypt');

async function makeStudent(tag) {
  const email = `rep.${tag}.${STAMP}@gmail.com`;
  const serial = `SN-REP-${tag}-${STAMP}`;
  const user = await prisma.user.create({
    data: {
      email,
      name: `Report ${tag}`,
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
  return { user, token };
}

const instructor = await prisma.instructor.findFirst();
const category = await prisma.category.findFirst();

async function makeCourse(title, spec) {
  return prisma.course.create({
    data: {
      title,
      slug: `${title.toLowerCase().replace(/\s+/g, '-')}-${STAMP}`,
      description: 'Reporting fixture course.',
      instructorId: instructor.id,
      categoryId: category.id,
      isPublished: true,
      status: 'PUBLISHED',
      sections: {
        create: {
          title: 'S1',
          order: 1,
          contents: { create: spec },
        },
      },
    },
    include: { sections: { include: { contents: { orderBy: { order: 'asc' } } } } },
  });
}

// ── the main fixture student ───────────────────────────────────────────
const { user, token } = await makeStudent('main');
const H = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
const get = async (p) => (await fetch(`${BASE}${p}`, { headers: H })).json();

const courseA = await makeCourse('Fixture Math', [
  ...Array.from({ length: 6 }, (_, i) => ({
    title: `Math Video ${i + 1}`,
    type: 'VIDEO',
    order: i + 1,
    duration: 10,
  })),
  { title: 'Math PDF 1', type: 'PDF', order: 7 },
  { title: 'Math PDF 2', type: 'PDF', order: 8 },
  { title: 'Math Quiz 1', type: 'QUIZ', order: 9 },
  { title: 'Math Quiz 2', type: 'QUIZ', order: 10 },
]);

const courseB = await makeCourse('Fixture Physics', [
  ...Array.from({ length: 5 }, (_, i) => ({
    title: `Physics Video ${i + 1}`,
    type: 'VIDEO',
    order: i + 1,
    duration: 10,
  })),
]);

const courseC = await makeCourse('Fixture Wishlisted', [
  ...Array.from({ length: 4 }, (_, i) => ({
    title: `Wish Video ${i + 1}`,
    type: 'VIDEO',
    order: i + 1,
    duration: 10,
  })),
]);

await prisma.enrollment.createMany({
  data: [
    { userId: user.id, courseId: courseA.id, status: 'ONGOING' },
    { userId: user.id, courseId: courseB.id, status: 'ONGOING' },
    // Wishlist: must not appear in any statistic.
    { userId: user.id, courseId: courseC.id, status: 'SAVED' },
  ],
});

const aContents = courseA.sections[0].contents;
const bContents = courseB.sections[0].contents;

// Complete 5 of course A's 10 contents, and 1 of course B's 5.
const aCompleted = aContents.slice(0, 5);
const bCompleted = bContents.slice(0, 1);

await prisma.progress.createMany({
  data: [...aCompleted, ...bCompleted].map((c) => ({
    userId: user.id,
    contentId: c.id,
    completed: true,
    completedAt: new Date(),
  })),
});

// Watch state: 3 videos at 100%, 1 at 50%. Mean over STARTED videos = 87.5 -> 88.
const aVideos = aContents.filter((c) => c.type === 'VIDEO');
await prisma.videoWatchProgress.createMany({
  data: [
    ...aVideos.slice(0, 3).map((c) => ({
      userId: user.id,
      contentId: c.id,
      watchedSeconds: 600,
      durationSec: 600,
      watchPercent: 100,
      lastPositionSec: 600,
      completedAt: new Date(),
    })),
    {
      userId: user.id,
      contentId: aVideos[3].id,
      watchedSeconds: 300,
      durationSec: 600,
      watchPercent: 50,
      lastPositionSec: 300,
    },
  ],
});

// Daily activity across a known window.
const today = new Date();
const dayOnly = (d) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
const addDays = (d, n) => new Date(dayOnly(d).getTime() + n * 86400000);

// 4 active days: today 60min, -1 30min, -2 0min (inactive), -3 15min, -6 45min
const activityPlan = [
  { offset: 0, minutes: 60, videos: 2, quizzes: 1, pdfs: 1 },
  { offset: -1, minutes: 30, videos: 1, quizzes: 0, pdfs: 0 },
  { offset: -3, minutes: 15, videos: 0, quizzes: 1, pdfs: 1 },
  { offset: -6, minutes: 45, videos: 1, quizzes: 0, pdfs: 0 },
];

await prisma.dailyActivity.createMany({
  data: activityPlan.map((p) => ({
    userId: user.id,
    date: addDays(today, p.offset),
    studySeconds: p.minutes * 60,
    videosWatched: p.videos,
    quizzesTaken: p.quizzes,
    pdfsOpened: p.pdfs,
    pointsEarned: 0,
  })),
});

await prisma.studentStats.create({
  data: {
    userId: user.id,
    totalPoints: 250,
    totalStudySeconds: 150 * 60,
    currentStreak: 2,
    longestStreak: 9,
    lastActiveDate: dayOnly(today),
  },
});

// ═══════════════════════════════════════════════════════════════════════
section('OVERVIEW — hand-computed from the fixture');
let r = await get('/reports/dashboard?tzOffsetMinutes=0');
let d = r.data.data;

// Contents in NON-wishlisted courses: 10 (A) + 5 (B) = 15. Completed: 5 + 1 = 6.
// 6/15 = 40%.
eq('overall progress = 40% (6 of 15)', d.overview.overallProgressPercent, 40);

// Videos in A and B = 6 + 5 = 11. The wishlisted course's 4 must be excluded.
eq('total videos = 11 (wishlist excluded)', d.overview.totalVideos, 11);

// Watched = completed OR past the 90% threshold.
//   Course A videos 1-5 are all marked complete (video 4 only 50% watched, but
//   an explicit completion still counts); video 6 is untouched => 5.
//   Course B's single completed content is also a VIDEO             => 1.
// Total 6 of 11 videos; 11 - 6 = 5 remaining.
eq('videos watched = 6 (5 in A + 1 in B)', d.overview.videosWatched, 6);
eq('videos remaining = 5', d.overview.videosRemaining, 5);

// PDFs in A = 2; both are in the completed slice (indices 0-4 cover 6 videos?
// no: slice(0,5) = 5 videos). So 0 PDFs completed.
eq('total PDFs = 2', d.overview.totalPdfs, 2);

// Study seconds over the 30-day window: 60+30+15+45 = 150 min = 2.5 h.
eq('study hours = 2.5', d.overview.studyHours, 2.5);
eq('study seconds = 9000', d.overview.studySeconds, 9000);

// Streak: lastActiveDate is today, so it is live and shows the stored value.
eq('current streak = 2 (live)', d.overview.currentStreak, 2);
eq('longest streak = 9', d.overview.longestStreak, 9);
eq('total points = 250', d.overview.totalPoints, 250);

// No quiz attempts exist for this student.
eq('average quiz score is NULL, not 0', d.overview.averageQuizScore, null);
eq('quizzes taken = 0', d.overview.quizzesTaken, 0);

section('WISHLIST EXCLUSION');
eq('only 2 subjects listed (SAVED excluded)', d.subjects.length, 2);
eq(
  'wishlisted course absent',
  d.subjects.some((s) => s.courseId === courseC.id),
  false,
);

section('PER-SUBJECT PROGRESS');
const subjA = d.subjects.find((s) => s.courseId === courseA.id);
const subjB = d.subjects.find((s) => s.courseId === courseB.id);
// A: 5 of 10 = 50%.  B: 1 of 5 = 20%.
eq('course A = 50% (5 of 10)', subjA.progressPercent, 50);
eq('course B = 20% (1 of 5)', subjB.progressPercent, 20);

section('WEEKLY ACTIVITY — zero-filled, correct buckets');
eq('exactly 7 days returned', d.weeklyActivity.length, 7);
const wkToday = d.weeklyActivity[6];
const wkMinus2 = d.weeklyActivity[4];
eq('today = 60 study minutes', wkToday.studyMinutes, 60);
eq('inactive day zero-filled, not omitted', wkMinus2.studyMinutes, 0);
const weekTotal = d.weeklyActivity.reduce((s, x) => s + x.studyMinutes, 0);
// Within the 7-day window: 60 + 30 + 15 + 45 = 150.
eq('7-day total = 150 minutes', weekTotal, 150);

section('HEAT MAP — fixed intensity thresholds');
eq('30 cells returned', d.heatmap.length, 30);
const hToday = d.heatmap[29];
// 60 min lands in the 45-89 band => level 3.
eq('60 min => level 3', hToday.level, 3);
const h15 = d.heatmap.find((c) => c.studyMinutes === 15);
// 15 min lands in the 15-44 band => level 2.
eq('15 min => level 2', h15.level, 2);
const hZero = d.heatmap.find((c) => c.studyMinutes === 0);
eq('0 min => level 0', hZero.level, 0);

section('SUCCESS INDEX — renormalised weights, exact arithmetic');
// Components:
//   video watching: mean over STARTED videos = (100+100+100+50)/4 = 87.5 -> 88
//   quiz scores:    no attempts => 0
//   commitment:     4 active days / 30-day window = 13.33% -> 13
//   completion:     mean(50, 20) = 35
// Weighted: 87.5*.33 + 0*.28 + 13.33*.22 + 35*.17
//         = 28.875 + 0 + 2.933 + 5.95 = 37.76 -> 38
eq('success index = 38', d.successIndex.score, 38);
eq('band is red (<40)', d.successIndex.band, 'red');
eq('four components returned', d.successIndex.components.length, 4);
const wsum = d.successIndex.components.reduce((s, c) => s + c.weight, 0);
eq('weights sum to exactly 100', wsum, 100);
const quizComp = d.successIndex.components.find((c) => c.key === 'quizScores');
eq('quiz component flagged as having no data', quizComp.hasData, false);

section("TODAY'S MISSION");
r = await get('/reports/mission?tzOffsetMinutes=0');
d = r.data.data;
// Today's row: 2 videos, 1 quiz, 1 pdf, 3600s study.
eq('watch video task done', d.tasks.find((t) => t.key === 'watch_video').done, true);
eq('quiz task done', d.tasks.find((t) => t.key === 'take_quiz').done, true);
eq('pdf task done', d.tasks.find((t) => t.key === 'read_pdf').done, true);
eq('15-min study task done (60 min)', d.tasks.find((t) => t.key === 'study_15_min').done, true);
eq('4 of 4 complete', d.completed, 4);
eq('allDone true', d.allDone, true);

section('REWARDS');
r = await get('/reports/rewards');
d = r.data.data;
eq('points reported = 250', d.totalPoints, 250);
eq('no badges earned yet', d.badgesEarned, 0);
eq('catalogue is seeded', d.badgesAvailable > 0, true);
// Cheapest unearned badge costing MORE than 250 points is STREAK_30
// ("Unstoppable") at 300 — not Course Champion at 400.
eq('next badge = Unstoppable (cheapest above 250)', d.nextBadge?.name, 'Unstoppable');
eq('points remaining = 50 (300 - 250)', d.nextBadge?.pointsRemaining, 50);

section('ZERO STATE — a brand-new student');
const fresh = await makeStudent('fresh');
const FH = { 'Content-Type': 'application/json', Authorization: `Bearer ${fresh.token}` };
const freshGet = async (p) => (await fetch(`${BASE}${p}`, { headers: FH })).json();

r = await freshGet('/reports/dashboard?tzOffsetMinutes=0');
d = r.data.data;
eq('progress 0, not NaN', d.overview.overallProgressPercent, 0);
eq('avg quiz score NULL, not 0', d.overview.averageQuizScore, null);
eq('study hours 0', d.overview.studyHours, 0);
eq('streak 0', d.overview.currentStreak, 0);
eq('no subjects', d.subjects.length, 0);
// The critical one: a new student must NOT be shown a red 0/100.
eq('SUCCESS INDEX IS NULL, not 0', d.successIndex.score, null);
eq('index explains why', typeof d.successIndex.reason, 'string');
eq('no band assigned', d.successIndex.band, null);
eq('weekly still 7 days (all zero)', d.weeklyActivity.length, 7);
eq('heatmap still 30 cells', d.heatmap.length, 30);
eq('ranking unavailable', d.ranking.available, false);

r = await freshGet('/reports/quiz-analytics');
eq('quiz analytics: 0 attempts', r.data.data.totalAttempts, 0);
eq('quiz analytics: average NULL not 0', r.data.data.averageScore, null);
eq('quiz analytics: highest NULL not 0', r.data.data.highestScore, null);
eq('quiz analytics: passRate NULL not 0', r.data.data.passRate, null);

r = await freshGet('/reports/suggestions');
eq('suggestions: none, with a note', r.data.data.suggestions.length, 0);
eq('suggestions: basis is none', r.data.data.basis, 'none');

section('STALE STREAK — must not show a lapsed number as current');
const stale = await makeStudent('stale');
await prisma.studentStats.create({
  data: {
    userId: stale.user.id,
    totalPoints: 500,
    currentStreak: 12,
    longestStreak: 12,
    // Last active a month ago: the 12-day streak is over.
    lastActiveDate: addDays(today, -30),
  },
});
const SH = { 'Content-Type': 'application/json', Authorization: `Bearer ${stale.token}` };
r = await (await fetch(`${BASE}/reports/dashboard?tzOffsetMinutes=0`, { headers: SH })).json();
eq('lapsed streak shows 0, not 12', r.data.data.overview.currentStreak, 0);
eq('longest streak still remembered', r.data.data.overview.longestStreak, 12);

// ── cleanup ────────────────────────────────────────────────────────────
const ids = [user.id, fresh.user.id, stale.user.id];
await prisma.dailyActivity.deleteMany({ where: { userId: { in: ids } } });
await prisma.videoWatchProgress.deleteMany({ where: { userId: { in: ids } } });
await prisma.contentView.deleteMany({ where: { userId: { in: ids } } });
await prisma.studySession.deleteMany({ where: { userId: { in: ids } } });
await prisma.studentBadge.deleteMany({ where: { userId: { in: ids } } });
await prisma.studentStats.deleteMany({ where: { userId: { in: ids } } });
await prisma.progress.deleteMany({ where: { userId: { in: ids } } });
await prisma.enrollment.deleteMany({ where: { userId: { in: ids } } });
await prisma.course.deleteMany({
  where: { id: { in: [courseA.id, courseB.id, courseC.id] } },
});
await prisma.user.deleteMany({ where: { id: { in: ids } } });

console.log(`\n${'='.repeat(62)}\n  PASS ${pass}   FAIL ${fail}\n${'='.repeat(62)}`);
await prisma.$disconnect();
process.exit(fail === 0 ? 0 : 1);
