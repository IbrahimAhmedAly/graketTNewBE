/**
 * Verification for the admin reporting endpoints.
 *
 * Two things are checked that nothing else covers:
 *   1. The per-student figures an admin sees are IDENTICAL to the ones the
 *      student sees. Two views of the same fact must never disagree.
 *   2. The platform overview reports real counts, replacing the hard-coded
 *      sample numbers the dashboard shipped with.
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

// ── admin token ────────────────────────────────────────────────────────
const ADMIN_EMAIL = 'ibrahim.zagglol@gmail.com';
const loginRes = await (
  await fetch(`${BASE}/admin-auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: 'password123' }),
  })
).json();

const admin = await prisma.admin.findUnique({ where: { email: ADMIN_EMAIL } });
const vc = await prisma.verificationCode.findFirst({
  where: { adminId: admin.id },
  orderBy: { createdAt: 'desc' },
});
const otpRes = await (
  await fetch(`${BASE}/admin-auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      verificationToken: loginRes.data.verificationToken,
      code: vc.code,
    }),
  })
).json();
const ADMIN_TOKEN = otpRes?.data?.accessToken;

if (!ADMIN_TOKEN) {
  console.error('ADMIN LOGIN FAILED:', JSON.stringify(otpRes, null, 2));
  process.exit(1);
}

const AH = { Authorization: `Bearer ${ADMIN_TOKEN}` };
const adminGet = async (p) => (await fetch(`${BASE}${p}`, { headers: AH })).json();

// ── fixture student with known activity ────────────────────────────────
const email = `admin.rep.${STAMP}@gmail.com`;
const serial = `SN-ADM-${STAMP}`;
const user = await prisma.user.create({
  data: {
    email,
    name: 'Admin Report Fixture',
    password: await bcrypt.hash('password123', 10),
    serial,
    status: 'ACTIVE',
    parentPhone: '+201234567890',
  },
});

const instructor = await prisma.instructor.findFirst();
const category = await prisma.category.findFirst();

// 4 videos + 1 PDF.
const course = await prisma.course.create({
  data: {
    title: `Admin Fixture ${STAMP}`,
    slug: `admin-fixture-${STAMP}`,
    description: 'Fixture for verifying admin reporting.',
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
            { title: 'Vid 1', type: 'VIDEO', order: 1, duration: 10 },
            { title: 'Vid 2', type: 'VIDEO', order: 2, duration: 10 },
            { title: 'Vid 3', type: 'VIDEO', order: 3, duration: 10 },
            { title: 'Vid 4', type: 'VIDEO', order: 4, duration: 10 },
            { title: 'Doc 1', type: 'PDF', order: 5 },
          ],
        },
      },
    },
  },
  include: { sections: { include: { contents: { orderBy: { order: 'asc' } } } } },
});
const contents = course.sections[0].contents;

await prisma.enrollment.create({
  data: { userId: user.id, courseId: course.id, status: 'ONGOING' },
});

// 2 of 5 contents complete => 40%.
await prisma.progress.createMany({
  data: contents.slice(0, 2).map((c) => ({
    userId: user.id,
    contentId: c.id,
    completed: true,
    completedAt: new Date(),
  })),
});

// Watch state: 100%, 75%, 25% — with known replay counts and stop positions.
await prisma.videoWatchProgress.createMany({
  data: [
    {
      userId: user.id,
      contentId: contents[0].id,
      watchedSeconds: 600,
      durationSec: 600,
      watchPercent: 100,
      lastPositionSec: 600,
      replayCount: 3,
      completedAt: new Date(),
    },
    {
      userId: user.id,
      contentId: contents[1].id,
      watchedSeconds: 450,
      durationSec: 600,
      watchPercent: 75,
      lastPositionSec: 450,
      replayCount: 1,
    },
    {
      userId: user.id,
      contentId: contents[2].id,
      watchedSeconds: 150,
      durationSec: 600,
      watchPercent: 25,
      lastPositionSec: 150,
      replayCount: 0,
    },
  ],
});

// PDF opened 3 times, deepest read 14 of 20 pages => 70%.
const pdfId = contents[4].id;
for (const pages of [4, 14, 9]) {
  await prisma.contentView.create({
    data: {
      userId: user.id,
      contentId: pdfId,
      type: 'PDF',
      durationSec: 120,
      pagesRead: pages,
      totalPages: 20,
      closedAt: new Date(),
    },
  });
}

await prisma.studentStats.create({
  data: {
    userId: user.id,
    totalPoints: 180,
    totalStudySeconds: 7200, // 2 hours
    currentStreak: 4,
    longestStreak: 11,
    lastActiveDate: new Date(
      Date.UTC(
        new Date().getUTCFullYear(),
        new Date().getUTCMonth(),
        new Date().getUTCDate(),
      ),
    ),
  },
});

// ═══════════════════════════════════════════════════════════════════════
section('PER-STUDENT REPORT — identity and activity');

let r = await adminGet(`/admin/reports/student/${user.id}`);
const report = r.data.data;

eq('profile.serial matches', report.profile.serial, serial);
eq('guardian phone surfaced', report.profile.parentPhone, '+201234567890');
eq('total study hours = 2', report.activity.totalStudyHours, 2);
eq('current streak = 4', report.activity.currentStreak, 4);
eq('longest streak = 11', report.activity.longestStreak, 11);
eq('points = 180', report.activity.totalPoints, 180);

section('PROGRESS — 2 of 5 contents complete');
eq('overall progress = 40%', report.overview.overallProgressPercent, 40);
eq('one course listed', report.subjects.length, 1);
eq('course progress = 40%', report.subjects[0].progressPercent, 40);

section('VIDEO BREAKDOWN — per-video watch %, stop position, replays');
eq('3 videos with recorded watch state', report.videoBreakdown.length, 3);
// Sorted by watchPercent descending.
eq('highest first = 100%', report.videoBreakdown[0].watchPercent, 100);
eq('second = 75%', report.videoBreakdown[1].watchPercent, 75);
eq('third = 25%', report.videoBreakdown[2].watchPercent, 25);
eq('replay count preserved', report.videoBreakdown[0].replayCount, 3);
eq('stop position preserved', report.videoBreakdown[1].lastPositionSec, 450);
eq('completed flag on the 100% video', report.videoBreakdown[0].completed, true);
eq('75% video not marked complete', report.videoBreakdown[1].completed, false);

section('DOCUMENT BREAKDOWN — reopen count and read depth');
eq('one document tracked', report.documentBreakdown.length, 1);
eq('opened 3 times', report.documentBreakdown[0].timesOpened, 3);
// Deepest of 4/14/9 is 14; 14 of 20 = 70%.
eq('deepest page reached = 14 (not the last visit, 9)', report.documentBreakdown[0].pagesRead, 14);
eq('read percent = 70%', report.documentBreakdown[0].readPercent, 70);
// 3 views x 120s = 360s.
eq('total time = 360s', report.documentBreakdown[0].totalSeconds, 360);

section('TIMELINE');
eq('timeline is populated', report.timeline.length > 0, true);
eq(
  'timeline is newest-first',
  report.timeline.every(
    (e, i) =>
      i === 0 ||
      new Date(report.timeline[i - 1].at) >= new Date(e.at),
  ),
  true,
);

section('ADMIN AND STUDENT MUST AGREE');

// Log in as the student and compare the same figures.
const studentLogin = await (
  await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'password123', serial }),
  })
).json();
const studentToken =
  studentLogin?.data?.data?.accessToken ?? studentLogin?.data?.accessToken;

const studentDash = await (
  await fetch(`${BASE}/reports/dashboard?tzOffsetMinutes=0`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  })
).json();
const sd = studentDash.data.data;

eq(
  'overall progress identical',
  report.overview.overallProgressPercent,
  sd.overview.overallProgressPercent,
);
eq(
  'videos watched identical',
  report.overview.videosWatched,
  sd.overview.videosWatched,
);
eq(
  'success index identical',
  report.successIndex.score,
  sd.successIndex.score,
);
eq('streak identical', report.overview.currentStreak, sd.overview.currentStreak);
eq(
  'subject progress identical',
  report.subjects[0].progressPercent,
  sd.subjects[0].progressPercent,
);

section('PLATFORM OVERVIEW — real counts, not the old hard-coded numbers');

r = await adminGet('/admin/reports/overview');
const ov = r.data.data;

const [dbStudents, dbCourses, dbPublished, dbInstructors] = await Promise.all([
  prisma.user.count(),
  prisma.course.count(),
  prisma.course.count({ where: { isPublished: true } }),
  prisma.instructor.count(),
]);

eq('student total matches the database', ov.students.total, dbStudents);
eq('course total matches the database', ov.courses.total, dbCourses);
eq('published count matches', ov.courses.published, dbPublished);
eq('instructor count matches', ov.instructors.total, dbInstructors);

// The values the page used to hard-code.
eq('NOT the mock 1247 students', ov.students.total === 1247, false);
eq('NOT the mock 48 courses', ov.courses.total === 48, false);

// SAVED is the wishlist and must not be counted as an enrollment.
const savedCount = await prisma.enrollment.count({ where: { status: 'SAVED' } });
const ongoingCount = await prisma.enrollment.count({
  where: { status: 'ONGOING' },
});
eq('ongoing excludes wishlist rows', ov.enrollments.ongoing, ongoingCount);
eq(
  'wishlist rows exist but are not counted',
  ov.enrollments.ongoing !== ongoingCount + savedCount || savedCount === 0,
  true,
);

eq('dailyTrend is an array', Array.isArray(ov.dailyTrend), true);
eq(
  'averageProgress is a number or null (never NaN)',
  ov.enrollments.averageProgress === null ||
    Number.isFinite(ov.enrollments.averageProgress),
  true,
);
eq(
  'averageScore is a number or null (never NaN)',
  ov.quizzes.averageScore === null || Number.isFinite(ov.quizzes.averageScore),
  true,
);

section('AUTHORISATION');
const noAuth = await (await fetch(`${BASE}/admin/reports/overview`)).json();
eq('overview requires admin auth', noAuth.statusCode, 401);

const asStudent = await (
  await fetch(`${BASE}/admin/reports/student/${user.id}`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  })
).json();
// 403, not 401: the token is valid, it simply is not an admin's. Asserting
// the exact code guards the distinction — a 401 here would suggest the guard
// failed to recognise the token at all.
eq('student token rejected on admin route (403)', asStudent.statusCode, 403);
eq(
  'student cannot read another student report',
  asStudent.data === undefined,
  true,
);

// ── cleanup ────────────────────────────────────────────────────────────
await prisma.contentView.deleteMany({ where: { userId: user.id } });
await prisma.videoWatchProgress.deleteMany({ where: { userId: user.id } });
await prisma.dailyActivity.deleteMany({ where: { userId: user.id } });
await prisma.studentStats.deleteMany({ where: { userId: user.id } });
await prisma.progress.deleteMany({ where: { userId: user.id } });
await prisma.enrollment.deleteMany({ where: { userId: user.id } });
await prisma.course.delete({ where: { id: course.id } });
await prisma.user.delete({ where: { id: user.id } });

console.log(`\n${'='.repeat(62)}\n  PASS ${pass}   FAIL ${fail}\n${'='.repeat(62)}`);
await prisma.$disconnect();
process.exit(fail === 0 ? 0 : 1);
