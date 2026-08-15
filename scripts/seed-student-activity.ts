/**
 * Seeds a dedicated student with realistic, HAND-COMPUTED activity, then prints
 * the exact figures every report should now produce for that student.
 *
 * Run:  npx ts-node scripts/seed-student-activity.ts
 *
 * Why HTTP and not Prisma inserts
 * -------------------------------
 * Every signal here is driven through the real ingestion endpoints, so the
 * verification that follows exercises the whole pipeline — segment union
 * merging, replay counting, PDF read-depth clamping, session crediting, daily
 * rollups, streaks and points — not just the read queries. Prisma is used only
 * for things that have no student-facing endpoint: creating the seeded account,
 * resetting that account between runs, granting enrollments, and reading a
 * verification snapshot back.
 *
 * Why it resets first
 * -------------------
 * Several ingest paths are additive by design: `replayCount` increments per
 * report, every content view is a new row, and quiz attempts stack. Re-running
 * without a reset would therefore change the answers, and the whole point of
 * this script is that the answers are known in advance. The reset is scoped to
 * the seeded student's own rows and touches no other account.
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { writeFileSync } from 'fs';

const prisma = new PrismaClient();

const API_BASE = process.env.SEED_API_BASE ?? 'http://localhost:3050/api/v1';
const EXPECTATIONS_PATH =
  process.env.SEED_EXPECTATIONS_PATH ?? '/tmp/graket_seed_expectations.json';

/** Matches the cost factor every hash site in src/ uses (bcrypt.hash(pw, 10)). */
const SALT_ROUNDS = 10;

/**
 * Everything is reported at UTC+0 so that video, session, PDF and quiz events
 * all land in the same `DailyActivity` bucket. The PDF credit path hardcodes an
 * offset of 0 (tracking.service.ts), so any other offset would split a single
 * run's activity across two day rows for no benefit.
 */
const TZ_OFFSET_MINUTES = 0;

// ============================================
// The seeded student
// ============================================

const STUDENT = {
  /** Fixed so the id is stable across runs and machines. */
  id: '5eed0000-0000-4000-8000-000000000001',
  email: 'seed.activity@graket.test',
  password: 'SeedPass@123',
  serial: 'SN-SEED-ACTIVITY',
  name: 'Seed Activity Student',
  /** University / Year 4 — the cohort with the most other students, so ranking has something to rank against. */
  educationLevelId: 'fa422004-dbab-498a-ba0f-31bf3dbe4e83',
  gradeId: '5234d7d2-d5d6-4b6c-90c1-ee2bbf520f36',
};

const COURSE = {
  jsMastery: '10550141-dba8-4b94-9d74-7ebd3b0804a8',
  fixtureMath: '3365bab3-7c6c-4cef-80b2-70857caf1b82',
  fixturePhysics: '1e7052fd-3dbd-4277-8cf7-55cd718e2d93',
  webDev: 'a980f394-08a8-45f0-a266-142b8872eb18',
};

/**
 * Enrollments granted directly. Dates are fixed so `firstEnrolledAt` /
 * `lastEnrolledAt` are reproducible. SAVED is included on purpose: it is the
 * wishlist, and reports must never count it as a subscription — nor allow
 * tracking against it.
 */
const ENROLLMENTS: Array<{
  courseId: string;
  status: 'ONGOING' | 'COMPLETED' | 'SAVED';
  enrolledAt: string;
}> = [
  { courseId: COURSE.jsMastery, status: 'ONGOING', enrolledAt: '2026-06-01T09:00:00.000Z' },
  { courseId: COURSE.fixtureMath, status: 'ONGOING', enrolledAt: '2026-06-10T09:00:00.000Z' },
  { courseId: COURSE.fixturePhysics, status: 'SAVED', enrolledAt: '2026-06-15T09:00:00.000Z' },
];

/** Redeemed over HTTP so the purchase + auto-enrollment path is exercised too. */
const PURCHASE_CODE = 'SEED-ACTIVITY-WEBDEV';

// ============================================
// The plan — every expected value is a literal, computed by hand
// ============================================

interface VideoCall {
  segments: Array<{ start: number; end: number }>;
  positionSec: number;
  isReplay?: boolean;
  /** State the server must report AFTER this call. */
  expect: {
    watchedSeconds: number;
    watchPercent: number;
    lastPositionSec: number;
    replayCount: number;
    isCompleted: boolean;
  };
  why: string;
}

interface VideoPlan {
  contentId: string;
  title: string;
  durationSec: number;
  calls: VideoCall[];
}

const VIDEOS: VideoPlan[] = [
  {
    contentId: '4660403c-a4a5-435b-a046-69db01347489',
    title: 'Lecture 1: JavaScript Crash Course for Beginners',
    durationSec: 3600,
    calls: [
      {
        segments: [{ start: 0, end: 900 }],
        positionSec: 900,
        expect: { watchedSeconds: 900, watchPercent: 25, lastPositionSec: 900, replayCount: 0, isCompleted: false },
        why: '900/3600 = 25%',
      },
      {
        segments: [{ start: 800, end: 1000 }],
        positionSec: 1000,
        expect: { watchedSeconds: 1000, watchPercent: 28, lastPositionSec: 1000, replayCount: 0, isCompleted: false },
        why: 'overlaps [0,900] by 100s — union is 1000, not 1100 (27.78% -> 28)',
      },
      {
        segments: [{ start: 1000, end: 1200 }],
        positionSec: 1200,
        expect: { watchedSeconds: 1200, watchPercent: 33, lastPositionSec: 1200, replayCount: 0, isCompleted: false },
        why: 'abuts the previous segment; 1200/3600 = 33.33% -> 33',
      },
    ],
  },
  {
    contentId: '3c460efc-52f4-4c60-8993-3419e6b2a68e',
    title: 'Lecture 2: JavaScript DOM Manipulation',
    durationSec: 2700,
    calls: [
      {
        segments: [{ start: 0, end: 2500 }],
        positionSec: 2500,
        expect: { watchedSeconds: 2500, watchPercent: 93, lastPositionSec: 2500, replayCount: 0, isCompleted: true },
        why: '2500/2700 = 92.59% -> 93, crosses the 90% completion bar',
      },
      {
        segments: [{ start: 0, end: 100 }],
        positionSec: 100,
        isReplay: true,
        expect: { watchedSeconds: 2500, watchPercent: 93, lastPositionSec: 100, replayCount: 1, isCompleted: true },
        why: 'replay: union already covers [0,100], so watch time must not move; only replayCount and the resume position do',
      },
    ],
  },
  {
    contentId: 'fa34f9fd-39d0-497b-ad5c-0c8bc9a5ebcb',
    title: 'Lecture 3: JavaScript ES6+ Features',
    durationSec: 3000,
    calls: [
      {
        segments: [{ start: 0, end: 1500 }],
        positionSec: 1500,
        expect: { watchedSeconds: 1500, watchPercent: 50, lastPositionSec: 1500, replayCount: 0, isCompleted: false },
        why: 'a clean 50% — the mid-range case',
      },
    ],
  },
  {
    contentId: '9efb66c2-b984-4ccc-b9d3-37385dd8e713',
    title: 'Lecture 1: React JS Full Course for Beginners',
    durationSec: 5400,
    calls: [
      {
        segments: [{ start: 0, end: 4860 }],
        positionSec: 4860,
        expect: { watchedSeconds: 4860, watchPercent: 90, lastPositionSec: 4860, replayCount: 0, isCompleted: true },
        why: 'exactly 90% — the completion boundary itself',
      },
      {
        segments: [{ start: 0, end: 4860 }],
        positionSec: 4860,
        expect: { watchedSeconds: 4860, watchPercent: 90, lastPositionSec: 4860, replayCount: 0, isCompleted: true },
        why: 'byte-identical retry: must change nothing at all, and must not re-award completion points',
      },
      {
        segments: [{ start: 0, end: 600 }],
        positionSec: 600,
        isReplay: true,
        expect: { watchedSeconds: 4860, watchPercent: 90, lastPositionSec: 600, replayCount: 1, isCompleted: true },
        why: 'first replay of an already-finished video',
      },
      {
        segments: [{ start: 600, end: 1200 }],
        positionSec: 1200,
        isReplay: true,
        expect: { watchedSeconds: 4860, watchPercent: 90, lastPositionSec: 1200, replayCount: 2, isCompleted: true },
        why: 'second replay — gives the report a video with replayCount > 1',
      },
    ],
  },
  {
    contentId: 'ba5ffdad-30af-4b91-b8e6-f7193a4ef312',
    title: 'Lecture 2: React Hooks — useState & useEffect',
    durationSec: 3300,
    calls: [
      {
        segments: [
          { start: 100, end: 400 },
          { start: 300, end: 700 },
        ],
        positionSec: 700,
        expect: { watchedSeconds: 600, watchPercent: 18, lastPositionSec: 700, replayCount: 0, isCompleted: false },
        why: 'two overlapping segments in ONE payload: 300+400 posted, 600 union (18.18% -> 18)',
      },
      {
        segments: [{ start: 1500, end: 1800 }],
        positionSec: 1800,
        expect: { watchedSeconds: 900, watchPercent: 27, lastPositionSec: 1800, replayCount: 0, isCompleted: false },
        why: 'disjoint second stretch — union stays two intervals (27.27% -> 27)',
      },
    ],
  },
  {
    contentId: '127da1d2-4f11-42df-8e40-65732df59c8a',
    title: 'Lecture 3: React Context API and State Management',
    durationSec: 2880,
    calls: [
      {
        segments: [{ start: 0, end: 144 }],
        positionSec: 144,
        expect: { watchedSeconds: 144, watchPercent: 5, lastPositionSec: 144, replayCount: 0, isCompleted: false },
        why: 'barely-started video, so the breakdown has a low-percent row too',
      },
    ],
  },
];

interface PdfPlan {
  contentId: string;
  title: string;
  totalPages: number;
  /** One entry per open. `durationSec` is claimed; the server clamps it to real elapsed time. */
  opens: Array<{ pagesRead: number; durationSec: number }>;
}

const PDFS: PdfPlan[] = [
  {
    contentId: '755e467c-09d4-43a2-9e16-7219a7a11f6c',
    title: 'JavaScript ES6 Cheat Sheet',
    totalPages: 20,
    // Deepest page reached is 18 -> readPercent 90. Note the middle open goes
    // deeper than the first and the last deeper still, so "deepest", not "last".
    opens: [
      { pagesRead: 5, durationSec: 1 },
      { pagesRead: 12, durationSec: 2 },
      { pagesRead: 18, durationSec: 1 },
    ],
  },
  {
    contentId: '0f31a15b-0f2c-49cb-b4f1-7afa93273453',
    title: 'React Components Cheat Sheet',
    totalPages: 12,
    // Read to the end on the first open, then skimmed: deepest stays 12 -> 100%.
    opens: [
      { pagesRead: 12, durationSec: 2 },
      { pagesRead: 6, durationSec: 1 },
    ],
  },
  {
    contentId: '0ae3fb75-6156-4156-a803-e65bf5c9147d',
    title: 'Node.js & Express API Reference',
    totalPages: 40,
    // Opened the most times but read the least: 10/40 -> 25%. This is the row
    // that proves timesOpened and readPercent are independent measures.
    opens: [
      { pagesRead: 3, durationSec: 1 },
      { pagesRead: 9, durationSec: 1 },
      { pagesRead: 9, durationSec: 2 },
      { pagesRead: 10, durationSec: 1 },
    ],
  },
];

/**
 * Sessions. Real durations come back from the API — wall clock cannot be
 * predicted, so the expectations record what the server reported.
 *
 * Sized to total a little over three minutes on purpose. Study time passes
 * through three different roundings on the way to a report — `studyMinutes`
 * (round to minutes), `studyHours` (round to one decimal) and the heat-map
 * level bucket — and every one of them collapses to 0 for a run of a few
 * seconds, which would make "aggregation is correct" indistinguishable from
 * "aggregation returns nothing". Above 180s all three are non-zero.
 *
 * Heartbeat gaps stay well under SESSION_IDLE_TIMEOUT_SEC (150s) so the idle
 * sweep never closes a session out from under us.
 */
const SESSIONS: Array<{ heartbeats: number; gapSec: number; tailSec: number }> = [
  { heartbeats: 3, gapSec: 40, tailSec: 20 }, // ~140s
  { heartbeats: 1, gapSec: 30, tailSec: 15 }, // ~45s
  { heartbeats: 0, gapSec: 0, tailSec: 8 }, //  ~8s
];

const QUIZ = {
  jsFundamentals: {
    quizId: '9ae7fd2b-5f69-4115-b971-3040f30940bd',
    title: 'JavaScript Fundamentals Quiz',
    passingScore: 70,
    /** The question the student never gets right until the last try — the intended #1 most-missed. */
    qLet: {
      questionId: '30581680-8cb2-41cf-a92b-a335532230fc',
      correctOptionId: '4d8aba82-90d8-439c-8136-25b9575677f8',
      wrongOptionId: '7cb48ea4-5a5c-4413-bc0e-091bd17e0534',
    },
    qSpread: {
      questionId: '4bce2b45-1a16-4ba1-9cba-20a1c0ead588',
      correctOptionId: '5bc634c9-bf25-496e-ad57-27f009eaf401',
      wrongOptionId: 'bcfbe6a6-af86-4555-9eb7-430940889abc',
    },
  },
  react: {
    quizId: 'a43a1e3e-b626-416a-a43f-efb8241ce40d',
    title: 'React.js Quiz',
    passingScore: 70,
    qHook: {
      questionId: 'b76011d4-dc0f-4c65-8819-6f0cee533398',
      correctOptionId: 'b86e4263-7201-49b3-b373-d6baeeaad16d',
      wrongOptionId: 'e83eae22-d9fb-4eec-9059-0d673a1e2648',
    },
    qJsx: {
      questionId: '7251cb8f-cb2f-432a-9fbb-e043fe386153',
      correctOptionId: '668e838d-0ea2-4396-aab3-b9a04b7112c7',
      wrongOptionId: '5c2ae2f4-2f5b-41a7-85be-d58ee3a602fd',
    },
  },
};

/**
 * Attempt schedule. Every question carries 1 point, so the score is simply the
 * share of questions answered correctly.
 *
 * Wrong-answer tally this produces:
 *   qLet   3 wrong of 4  ->  the unambiguous #1 most-missed question
 *   qHook  2 wrong of 3  ->  runner-up
 *   qJsx   1 wrong of 3
 *   qSpread 1 wrong of 4
 */
const ATTEMPTS: Array<{
  quizId: string;
  quizTitle: string;
  timeTaken: number;
  answers: Array<{ questionId: string; selectedOptionId: string; correct: boolean }>;
  expectedScore: number;
  expectedPassed: boolean;
}> = [
  {
    quizId: QUIZ.jsFundamentals.quizId,
    quizTitle: QUIZ.jsFundamentals.title,
    timeTaken: 180,
    answers: [
      { questionId: QUIZ.jsFundamentals.qLet.questionId, selectedOptionId: QUIZ.jsFundamentals.qLet.wrongOptionId, correct: false },
      { questionId: QUIZ.jsFundamentals.qSpread.questionId, selectedOptionId: QUIZ.jsFundamentals.qSpread.wrongOptionId, correct: false },
    ],
    expectedScore: 0,
    expectedPassed: false,
  },
  {
    quizId: QUIZ.jsFundamentals.quizId,
    quizTitle: QUIZ.jsFundamentals.title,
    timeTaken: 150,
    answers: [
      { questionId: QUIZ.jsFundamentals.qLet.questionId, selectedOptionId: QUIZ.jsFundamentals.qLet.wrongOptionId, correct: false },
      { questionId: QUIZ.jsFundamentals.qSpread.questionId, selectedOptionId: QUIZ.jsFundamentals.qSpread.correctOptionId, correct: true },
    ],
    expectedScore: 50,
    expectedPassed: false,
  },
  {
    quizId: QUIZ.jsFundamentals.quizId,
    quizTitle: QUIZ.jsFundamentals.title,
    timeTaken: 120,
    answers: [
      { questionId: QUIZ.jsFundamentals.qLet.questionId, selectedOptionId: QUIZ.jsFundamentals.qLet.wrongOptionId, correct: false },
      { questionId: QUIZ.jsFundamentals.qSpread.questionId, selectedOptionId: QUIZ.jsFundamentals.qSpread.correctOptionId, correct: true },
    ],
    expectedScore: 50,
    expectedPassed: false,
  },
  {
    quizId: QUIZ.jsFundamentals.quizId,
    quizTitle: QUIZ.jsFundamentals.title,
    timeTaken: 90,
    answers: [
      { questionId: QUIZ.jsFundamentals.qLet.questionId, selectedOptionId: QUIZ.jsFundamentals.qLet.correctOptionId, correct: true },
      { questionId: QUIZ.jsFundamentals.qSpread.questionId, selectedOptionId: QUIZ.jsFundamentals.qSpread.correctOptionId, correct: true },
    ],
    expectedScore: 100,
    expectedPassed: true,
  },
  {
    quizId: QUIZ.react.quizId,
    quizTitle: QUIZ.react.title,
    timeTaken: 200,
    answers: [
      { questionId: QUIZ.react.qHook.questionId, selectedOptionId: QUIZ.react.qHook.wrongOptionId, correct: false },
      { questionId: QUIZ.react.qJsx.questionId, selectedOptionId: QUIZ.react.qJsx.correctOptionId, correct: true },
    ],
    expectedScore: 50,
    expectedPassed: false,
  },
  {
    quizId: QUIZ.react.quizId,
    quizTitle: QUIZ.react.title,
    timeTaken: 240,
    answers: [
      { questionId: QUIZ.react.qHook.questionId, selectedOptionId: QUIZ.react.qHook.wrongOptionId, correct: false },
      { questionId: QUIZ.react.qJsx.questionId, selectedOptionId: QUIZ.react.qJsx.wrongOptionId, correct: false },
    ],
    expectedScore: 0,
    expectedPassed: false,
  },
  {
    quizId: QUIZ.react.quizId,
    quizTitle: QUIZ.react.title,
    timeTaken: 110,
    answers: [
      { questionId: QUIZ.react.qHook.questionId, selectedOptionId: QUIZ.react.qHook.correctOptionId, correct: true },
      { questionId: QUIZ.react.qJsx.questionId, selectedOptionId: QUIZ.react.qJsx.correctOptionId, correct: true },
    ],
    expectedScore: 100,
    expectedPassed: true,
  },
];

/** Points, mirrored from tracking.service.ts / quiz.service.ts. */
const POINTS = { VIDEO_COMPLETED: 10, PDF_READ: 5, QUIZ_ATTEMPT: 15 };

// ============================================
// Plumbing
// ============================================

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

class SeedError extends Error {}

function fail(message: string): never {
  throw new SeedError(message);
}

function assertEqual(actual: unknown, expected: unknown, label: string): void {
  if (actual !== expected) {
    fail(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

let accessToken = '';

/** Blocks until the API answers at all — any status counts, even 401. */
async function waitForApi(timeoutMs = 90_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      await fetch(`${API_BASE}/tracking/session/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      return;
    } catch {
      await sleep(1000);
    }
  }

  fail(`API at ${API_BASE} did not respond within ${timeoutMs / 1000}s.`);
}

/**
 * One HTTP call. Any non-2xx aborts the whole run with the status and body,
 * because a half-seeded student produces expectations that quietly lie.
 *
 * A dropped connection is treated differently from a bad status: the dev
 * server hot-reloads, and a request in flight during a restart dies with no
 * status at all. Those are retried once the server is back. A retry can in
 * principle re-apply a request the server had already processed before it
 * died — the row-count cross-check at the end of the run is what catches that,
 * and re-running the script from scratch is always safe.
 */
async function api<T = any>(
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
  auth = true,
): Promise<T> {
  let res: Response;

  for (let attempt = 1; ; attempt++) {
    try {
      res = await fetch(`${API_BASE}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(auth && accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      break;
    } catch (err) {
      if (attempt >= 3) {
        fail(
          `${method} ${path} -> connection failed ${attempt} times: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
      console.warn(`  ! ${method} ${path} lost its connection (server restarting?); waiting and retrying`);
      await waitForApi();
    }
  }

  const text = await res.text();

  if (!res.ok) {
    fail(
      `${method} ${path} -> HTTP ${res.status} ${res.statusText}\n` +
        `  request: ${body === undefined ? '(no body)' : JSON.stringify(body)}\n` +
        `  response: ${text}`,
    );
  }

  let parsed: any;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    fail(`${method} ${path} -> non-JSON body: ${text}`);
  }

  // ResponseInterceptor wraps everything as {success, statusCode, data, ...};
  // services additionally return {message, data}, so the payload is one level
  // deeper for those. Login returns a bare object and stops at the first level.
  const outer = parsed?.data;
  if (outer && typeof outer === 'object' && 'data' in outer && 'message' in outer) {
    return outer.data as T;
  }
  return outer as T;
}

function log(line: string): void {
  console.log(line);
}

// ============================================
// Setup (Prisma — no endpoint exists for any of this)
// ============================================

async function ensureStudent(): Promise<string> {
  const password = await bcrypt.hash(STUDENT.password, SALT_ROUNDS);

  const existing = await prisma.user.findUnique({
    where: { email: STUDENT.email },
    select: { id: true },
  });

  // Credentials are rewritten on every run so a run is never blocked by a
  // password or serial changed by hand between runs.
  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: {
          password,
          serial: STUDENT.serial,
          name: STUDENT.name,
          status: 'ACTIVE',
          educationLevelId: STUDENT.educationLevelId,
          gradeId: STUDENT.gradeId,
        },
        select: { id: true },
      })
    : await prisma.user.create({
        data: {
          id: STUDENT.id,
          email: STUDENT.email,
          password,
          serial: STUDENT.serial,
          name: STUDENT.name,
          status: 'ACTIVE',
          educationLevelId: STUDENT.educationLevelId,
          gradeId: STUDENT.gradeId,
        },
        select: { id: true },
      });

  log(`  student ${existing ? 'reused' : 'created'}: ${user.id}`);
  return user.id;
}

/**
 * Wipes everything this script produced last time, for this student only.
 *
 * Scoped by userId on every delete: no other account is touched, and no
 * catalogue row (course, content, quiz, question) is ever modified.
 */
async function resetStudentActivity(userId: string): Promise<void> {
  // QuizAttempt cascades to UserAnswer.
  const [attempts, views, sessions, days, watches, progress, purchases] = await prisma.$transaction([
    prisma.quizAttempt.deleteMany({ where: { userId } }),
    prisma.contentView.deleteMany({ where: { userId } }),
    prisma.studySession.deleteMany({ where: { userId } }),
    prisma.dailyActivity.deleteMany({ where: { userId } }),
    prisma.videoWatchProgress.deleteMany({ where: { userId } }),
    prisma.progress.deleteMany({ where: { userId } }),
    prisma.purchase.deleteMany({ where: { userId } }),
  ]);
  await prisma.studentStats.deleteMany({ where: { userId } });

  // The redeem endpoint refuses a course the student is already enrolled in,
  // so the enrollment it created last run has to go with the purchase.
  await prisma.enrollment.deleteMany({ where: { userId, courseId: COURSE.webDev } });

  log(
    `  reset: ${attempts.count} attempts, ${views.count} views, ${sessions.count} sessions, ` +
      `${days.count} daily rows, ${watches.count} watch rows, ${progress.count} progress rows, ` +
      `${purchases.count} purchases`,
  );
}

async function ensureEnrollments(userId: string): Promise<void> {
  for (const e of ENROLLMENTS) {
    await prisma.enrollment.upsert({
      where: { userId_courseId: { userId, courseId: e.courseId } },
      // Reset progress too: a passed quiz rewrites it, so it must start from 0.
      update: { status: e.status, progress: 0, completedAt: null, enrolledAt: new Date(e.enrolledAt) },
      create: {
        userId,
        courseId: e.courseId,
        status: e.status,
        progress: 0,
        enrolledAt: new Date(e.enrolledAt),
      },
    });
  }
  log(`  enrollments: ${ENROLLMENTS.map((e) => `${e.courseId.slice(0, 8)}=${e.status}`).join(', ')}`);
}

/** Recreates an unused code so the redeem endpoint has something to consume. */
async function ensurePurchaseCode(): Promise<void> {
  const admin = await prisma.admin.findFirst({ select: { id: true }, orderBy: { createdAt: 'asc' } });
  if (!admin) fail('No Admin row exists; PurchaseCode.createdBy cannot be satisfied.');

  await prisma.purchaseCode.upsert({
    where: { code: PURCHASE_CODE },
    update: { isUsed: false, usedBy: null, usedAt: null, usedCount: 0, maxUses: 1, expiresAt: null },
    create: {
      code: PURCHASE_CODE,
      type: 'COURSE',
      courseId: COURSE.webDev,
      maxUses: 1,
      createdBy: admin.id,
    },
  });
  log(`  purchase code ready: ${PURCHASE_CODE}`);
}

// ============================================
// Activity generation (HTTP)
// ============================================

async function login(): Promise<void> {
  const data = await api<{ id: string; accessToken: string }>(
    'POST',
    '/auth/login',
    { email: STUDENT.email, password: STUDENT.password, serial: STUDENT.serial },
    false,
  );
  if (!data?.accessToken) fail(`Login returned no accessToken: ${JSON.stringify(data)}`);
  accessToken = data.accessToken;
  log(`  logged in as ${data.id}`);
}

async function redeemPurchase(
  userId: string,
): Promise<{ purchaseId: string; purchasedAt: string; enrolledAt: string }> {
  const data = await api<{ purchase: { id: string; purchasedAt: string } }>('POST', '/purchase/redeem', {
    code: PURCHASE_CODE,
  });

  // The enrollment redeem creates is stamped a few milliseconds after the
  // purchase row, and it is the enrollment date a report reads back — so take
  // the real value rather than assuming the two timestamps are equal.
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId: COURSE.webDev } },
    select: { enrolledAt: true },
  });
  if (!enrollment) fail('Redeeming the code did not create the expected enrollment.');

  log(`  redeemed ${PURCHASE_CODE} -> purchase ${data.purchase.id} (auto-enrolled in Web Dev Bootcamp)`);
  return {
    purchaseId: data.purchase.id,
    purchasedAt: data.purchase.purchasedAt,
    enrolledAt: enrollment.enrolledAt.toISOString(),
  };
}

async function driveVideos(): Promise<void> {
  for (const video of VIDEOS) {
    for (const [i, call] of video.calls.entries()) {
      const record = await api<{
        watchedSeconds: number;
        watchPercent: number;
        lastPositionSec: number;
        replayCount: number;
        isCompleted: boolean;
      }>('POST', '/tracking/video-progress', {
        contentId: video.contentId,
        segments: call.segments,
        positionSec: call.positionSec,
        durationSec: video.durationSec,
        ...(call.isReplay ? { isReplay: true } : {}),
        tzOffsetMinutes: TZ_OFFSET_MINUTES,
      });

      const label = `${video.title} call ${i + 1} (${call.why})`;
      assertEqual(record.watchedSeconds, call.expect.watchedSeconds, `${label} watchedSeconds`);
      assertEqual(record.watchPercent, call.expect.watchPercent, `${label} watchPercent`);
      assertEqual(record.lastPositionSec, call.expect.lastPositionSec, `${label} lastPositionSec`);
      assertEqual(record.replayCount, call.expect.replayCount, `${label} replayCount`);
      assertEqual(record.isCompleted, call.expect.isCompleted, `${label} isCompleted`);
    }

    const final = video.calls[video.calls.length - 1].expect;
    log(
      `  ${video.title}: ${final.watchPercent}% (${final.watchedSeconds}/${video.durationSec}s), ` +
        `replays ${final.replayCount}, stopped at ${final.lastPositionSec}s`,
    );
  }
}

async function drivePdfs(): Promise<Array<{ contentId: string; viewId: string; durationSec: number; pagesRead: number }>> {
  const closed: Array<{ contentId: string; viewId: string; durationSec: number; pagesRead: number }> = [];

  for (const pdf of PDFS) {
    for (const [i, open] of pdf.opens.entries()) {
      const started = await api<{ viewId: string }>('POST', '/tracking/content-view/start', {
        contentId: pdf.contentId,
        type: 'PDF',
        totalPages: pdf.totalPages,
        tzOffsetMinutes: TZ_OFFSET_MINUTES,
      });

      // The server clamps the claimed duration to real elapsed time, so wait
      // slightly longer than we intend to claim. Without this the recorded
      // duration would be 0 and totalSeconds would be unverifiable.
      await sleep(open.durationSec * 1000 + 1200);

      const ended = await api<{
        viewId: string;
        durationSec: number;
        pagesRead: number;
        totalPages: number;
      }>('POST', '/tracking/content-view/end', {
        viewId: started.viewId,
        durationSec: open.durationSec,
        pagesRead: open.pagesRead,
        totalPages: pdf.totalPages,
      });

      const label = `${pdf.title} open ${i + 1}`;
      assertEqual(ended.durationSec, open.durationSec, `${label} durationSec (server clamps to elapsed)`);
      assertEqual(ended.pagesRead, open.pagesRead, `${label} pagesRead`);
      assertEqual(ended.totalPages, pdf.totalPages, `${label} totalPages`);

      closed.push({
        contentId: pdf.contentId,
        viewId: ended.viewId,
        durationSec: ended.durationSec,
        pagesRead: ended.pagesRead,
      });
    }

    const deepest = Math.max(...pdf.opens.map((o) => o.pagesRead));
    log(
      `  ${pdf.title}: ${pdf.opens.length} opens, deepest page ${deepest}/${pdf.totalPages} ` +
        `(${Math.round((deepest / pdf.totalPages) * 100)}%)`,
    );
  }

  return closed;
}

async function driveSessions(): Promise<Array<{ sessionId: string; durationSec: number; heartbeats: number }>> {
  const results: Array<{ sessionId: string; durationSec: number; heartbeats: number }> = [];

  for (const [i, plan] of SESSIONS.entries()) {
    const started = await api<{ sessionId: string; resumed: boolean }>('POST', '/tracking/session/start', {
      tzOffsetMinutes: TZ_OFFSET_MINUTES,
    });

    // A reused session would silently merge two of our sessions into one.
    assertEqual(started.resumed, false, `session ${i + 1} must be new, not resumed`);

    for (let h = 0; h < plan.heartbeats; h++) {
      await sleep(plan.gapSec * 1000);
      const beat = await api<{ active: boolean }>('POST', '/tracking/session/heartbeat', {
        sessionId: started.sessionId,
      });
      assertEqual(beat.active, true, `session ${i + 1} heartbeat ${h + 1} active`);
    }

    await sleep(plan.tailSec * 1000);

    const ended = await api<{ sessionId: string; durationSec: number }>('POST', '/tracking/session/end', {
      sessionId: started.sessionId,
    });

    if (typeof ended.durationSec !== 'number' || ended.durationSec <= 0) {
      fail(`session ${i + 1} closed with a non-positive duration: ${JSON.stringify(ended)}`);
    }

    results.push({ sessionId: started.sessionId, durationSec: ended.durationSec, heartbeats: plan.heartbeats });
    log(`  session ${i + 1}: ${ended.durationSec}s, ${plan.heartbeats} heartbeat(s)`);
  }

  return results;
}

async function driveQuizzes(): Promise<
  Array<{
    attemptId: string;
    quizId: string;
    quizTitle: string;
    score: number;
    passed: boolean;
    timeTakenSec: number;
    correctAnswers: number;
    totalQuestions: number;
  }>
> {
  const results = [];

  for (const [i, attempt] of ATTEMPTS.entries()) {
    const data = await api<{
      attemptId: string;
      score: number;
      passed: boolean;
      correctAnswers: number;
      totalQuestions: number;
    }>('POST', '/quiz/submit', {
      quizId: attempt.quizId,
      answers: attempt.answers.map((a) => ({
        questionId: a.questionId,
        selectedOptionId: a.selectedOptionId,
      })),
      timeTaken: attempt.timeTaken,
      tzOffsetMinutes: TZ_OFFSET_MINUTES,
    });

    const expectedCorrect = attempt.answers.filter((a) => a.correct).length;
    const label = `${attempt.quizTitle} attempt ${i + 1}`;
    assertEqual(data.score, attempt.expectedScore, `${label} score`);
    assertEqual(data.passed, attempt.expectedPassed, `${label} passed`);
    assertEqual(data.correctAnswers, expectedCorrect, `${label} correctAnswers`);
    assertEqual(data.totalQuestions, attempt.answers.length, `${label} totalQuestions`);

    results.push({
      attemptId: data.attemptId,
      quizId: attempt.quizId,
      quizTitle: attempt.quizTitle,
      score: data.score,
      passed: data.passed,
      timeTakenSec: attempt.timeTaken,
      correctAnswers: data.correctAnswers,
      totalQuestions: data.totalQuestions,
    });

    log(`  ${label}: ${data.score}% ${data.passed ? 'PASS' : 'FAIL'}`);
  }

  return results;
}

// ============================================
// Expectations
// ============================================

function utcDay(instant: Date): string {
  return instant.toISOString().slice(0, 10);
}

/** Per-question wrong/right tally across every attempt, from what was sent. */
function tallyQuestions() {
  const byQuestion = new Map<string, { answered: number; wrong: number; lastWasCorrect: boolean }>();

  for (const attempt of ATTEMPTS) {
    for (const answer of attempt.answers) {
      const row = byQuestion.get(answer.questionId) ?? { answered: 0, wrong: 0, lastWasCorrect: false };
      row.answered += 1;
      if (!answer.correct) row.wrong += 1;
      row.lastWasCorrect = answer.correct;
      byQuestion.set(answer.questionId, row);
    }
  }

  const questionText = new Map<string, string>([
    [QUIZ.jsFundamentals.qLet.questionId, 'Which keyword declares a block-scoped variable?'],
    [QUIZ.jsFundamentals.qSpread.questionId, 'What does the spread operator (...) do?'],
    [QUIZ.react.qHook.questionId, 'Which hook is used to manage state in a function component?'],
    [QUIZ.react.qJsx.questionId, 'What is JSX?'],
  ]);

  return [...byQuestion.entries()]
    .filter(([, row]) => row.wrong >= 1)
    .map(([questionId, row]) => ({
      questionId,
      questionText: questionText.get(questionId) ?? null,
      timesAnswered: row.answered,
      timesWrong: row.wrong,
      accuracy: Math.round(((row.answered - row.wrong) / row.answered) * 100),
      lastWasCorrect: row.lastWasCorrect,
    }))
    // Ordered exactly as the missed-questions report is specified to order:
    // timesWrong desc, then accuracy asc.
    .sort((a, b) => b.timesWrong - a.timesWrong || a.accuracy - b.accuracy);
}

async function main(): Promise<void> {
  const startedAt = new Date();

  await waitForApi();

  log('== setup (Prisma: no endpoint exists for any of this) ==');
  const userId = await ensureStudent();
  await resetStudentActivity(userId);
  await ensureEnrollments(userId);
  await ensurePurchaseCode();

  const before = await countRows(userId);
  log(`  rows before activity: ${JSON.stringify(before)}`);

  log('\n== login (HTTP) ==');
  await login();

  log('\n== purchase redeem (HTTP) ==');
  const purchase = await redeemPurchase(userId);

  log('\n== videos (HTTP /tracking/video-progress) ==');
  await driveVideos();

  log('\n== pdfs (HTTP /tracking/content-view/*) ==');
  const pdfViews = await drivePdfs();

  log('\n== study sessions (HTTP /tracking/session/*) ==');
  const sessions = await driveSessions();

  log('\n== quizzes (HTTP /quiz/submit) ==');
  const attempts = await driveQuizzes();

  const finishedAt = new Date();
  if (utcDay(startedAt) !== utcDay(finishedAt)) {
    fail(
      `The run crossed UTC midnight (${utcDay(startedAt)} -> ${utcDay(finishedAt)}); ` +
        `daily rollups are split across two days. Re-run.`,
    );
  }
  const day = utcDay(finishedAt);

  // ---- derived expectations, computed only from what was sent ----

  const videoBreakdown = VIDEOS.map((v) => {
    const final = v.calls[v.calls.length - 1].expect;
    return {
      contentId: v.contentId,
      title: v.title,
      durationSec: v.durationSec,
      watchedSeconds: final.watchedSeconds,
      watchPercent: final.watchPercent,
      lastPositionSec: final.lastPositionSec,
      replayCount: final.replayCount,
      completed: final.isCompleted,
      postedSegmentSeconds: v.calls.reduce(
        (sum, c) => sum + c.segments.reduce((s, seg) => s + (seg.end - seg.start), 0),
        0,
      ),
    };
  });

  const documentBreakdown = PDFS.map((p) => {
    const deepest = Math.max(...p.opens.map((o) => o.pagesRead));
    return {
      contentId: p.contentId,
      title: p.title,
      timesOpened: p.opens.length,
      totalSeconds: p.opens.reduce((s, o) => s + o.durationSec, 0),
      pagesRead: deepest,
      totalPages: p.totalPages,
      readPercent: Math.round((deepest / p.totalPages) * 100),
    };
  });

  const totalStudySeconds = sessions.reduce((s, x) => s + x.durationSec, 0);

  // Below this, studyMinutes, studyHours and the heat-map level all round to
  // zero and stop being able to distinguish a correct aggregation from an
  // empty one — which is the entire point of the seeded data.
  if (totalStudySeconds < 180) {
    fail(`Sessions credited only ${totalStudySeconds}s; expected at least 180s. Check SESSIONS.`);
  }

  const videoSeconds = videoBreakdown.reduce((s, v) => s + v.watchedSeconds, 0);
  const videosCompleted = videoBreakdown.filter((v) => v.completed).length;
  const scores = attempts.map((a) => a.score);
  const passedCount = attempts.filter((a) => a.passed).length;
  const missed = tallyQuestions();

  const pointsEarned =
    videosCompleted * POINTS.VIDEO_COMPLETED +
    PDFS.length * POINTS.PDF_READ + // credited once per document per day
    attempts.length * POINTS.QUIZ_ATTEMPT;

  // ---- read back and cross-check against the database ----

  const snapshot = await readSnapshot(userId, day);
  verifySnapshot(snapshot, {
    videoRows: VIDEOS.length,
    viewRows: pdfViews.length,
    sessionRows: sessions.length,
    attemptRows: attempts.length,
    answerRows: ATTEMPTS.reduce((s, a) => s + a.answers.length, 0),
    totalStudySeconds,
    videoSeconds,
    videosCompleted,
    pointsEarned,
  });

  // ---- structure-dependent report figures ----
  // Read from the catalogue (static facts about the courses, not the thing
  // under test) and combined with the tracking figures above.
  const report = await deriveReportExpectations(userId, {
    videoBreakdown,
    scores,
    totalStudySeconds,
    videoSeconds,
    pointsEarned,
  });

  const expectations = {
    generatedAt: finishedAt.toISOString(),
    apiBase: API_BASE,
    seedScript: 'scripts/seed-student-activity.ts',
    student: {
      id: userId,
      email: STUDENT.email,
      password: STUDENT.password,
      serial: STUDENT.serial,
      name: STUDENT.name,
      educationLevelId: STUDENT.educationLevelId,
      gradeId: STUDENT.gradeId,
    },
    localDay: day,
    tzOffsetMinutes: TZ_OFFSET_MINUTES,

    expectedVideoBreakdown: videoBreakdown,
    expectedPdfOpens: Object.fromEntries(PDFS.map((p) => [p.contentId, p.opens.length])),
    expectedDocumentBreakdown: documentBreakdown,

    expectedSessions: {
      count: sessions.length,
      durationsSec: sessions.map((s) => s.durationSec),
      lastSessionSeconds: sessions[sessions.length - 1].durationSec,
      sessionIds: sessions.map((s) => s.sessionId),
    },
    expectedTotalStudySeconds: totalStudySeconds,
    expectedTotalStudyHours: Math.round((totalStudySeconds / 3600) * 10) / 10,

    expectedQuizAttempts: attempts,
    expectedQuizSummary: {
      totalAttempts: attempts.length,
      averageScore: Math.round(scores.reduce((s, x) => s + x, 0) / scores.length),
      highestScore: Math.max(...scores),
      lowestScore: Math.min(...scores),
      passedCount,
      passRate: Math.round((passedCount / attempts.length) * 100),
    },
    expectedMostMissedQuestionId: missed[0].questionId,
    expectedMissedQuestions: missed,
    expectedTotalAnswered: ATTEMPTS.reduce((s, a) => s + a.answers.length, 0),
    expectedTotalWrong: missed.reduce((s, q) => s + q.timesWrong, 0),

    expectedDailyActivity: {
      date: day,
      studySeconds: totalStudySeconds,
      videosWatched: videosCompleted,
      videoSeconds,
      quizzesTaken: attempts.length,
      // One credit per DOCUMENT per day, not per open — 9 opens, 3 documents.
      pdfsOpened: PDFS.length,
      contentsDone: 0,
      pointsEarned,
    },
    expectedStudentStats: {
      totalPoints: pointsEarned,
      totalStudySeconds,
      currentStreak: 1,
      longestStreak: 1,
      lastActiveDate: day,
    },

    expectedRowCounts: {
      VideoWatchProgress: VIDEOS.length,
      ContentView: pdfViews.length,
      StudySession: sessions.length,
      DailyActivity: 1,
      QuizAttempt: attempts.length,
      UserAnswer: ATTEMPTS.reduce((s, a) => s + a.answers.length, 0),
      Progress: passedCount,
      Purchase: 1,
      Enrollment: ENROLLMENTS.length + 1,
    },

    expectedSubscriptions: {
      activeCourses: ENROLLMENTS.filter((e) => e.status === 'ONGOING').length + 1,
      completedCourses: 0,
      savedCourses: ENROLLMENTS.filter((e) => e.status === 'SAVED').length,
      totalPurchases: 1,
      codesRedeemed: 1,
      firstEnrolledAt: ENROLLMENTS[0].enrolledAt,
      lastEnrolledAt: purchase.enrolledAt,
      enrollments: [
        ...ENROLLMENTS.map((e) => ({ courseId: e.courseId, status: e.status, enrolledAt: e.enrolledAt })),
        { courseId: COURSE.webDev, status: 'ONGOING', enrolledAt: purchase.enrolledAt },
      ],
      purchases: [
        {
          purchaseId: purchase.purchaseId,
          type: 'COURSE',
          courseId: COURSE.webDev,
          code: PURCHASE_CODE,
          purchasedAt: purchase.purchasedAt,
        },
      ],
    },

    expectedReport: report,
    dbSnapshot: snapshot,

    notes: [
      'Every figure above was driven through the real HTTP tracking/quiz/purchase endpoints.',
      'Prisma was used only for: creating the student, resetting the student\'s own rows between runs, granting the three fixed enrollments, minting the purchase code, and reading the snapshot back.',
      'expectedTotalStudySeconds is wall-clock and therefore differs between runs; it is read from the session/end responses and cross-checked against StudentStats.totalStudySeconds.',
      'currentStreak/longestStreak are 1 because the tracking endpoints always credit "now" — a multi-day streak cannot be produced over HTTP without backdating rows.',
      'DailyActivity.pdfsOpened counts DISTINCT documents per day (3), while documentBreakdown[].timesOpened counts raw ContentView rows (9 total). They are meant to differ.',
      'overview.pdfsOpened in the existing report is derived from Progress.completed for PDF contents, not from ContentView, so it is 0 here: nothing marks a PDF complete.',
      'No VIDEO- or QUIZ-typed ContentView rows are created, so every ContentView row for this student is a PDF open.',
      'Enrollment status SAVED (Fixture Physics) is the wishlist: tracking against it is rejected, and it must not be counted as an active subscription.',
    ],
  };

  writeFileSync(EXPECTATIONS_PATH, JSON.stringify(expectations, null, 2));

  log('\n===== EXPECTATIONS =====');
  log(JSON.stringify(expectations, null, 2));
  log('===== END EXPECTATIONS =====');
  log(`\nWritten to ${EXPECTATIONS_PATH}`);
  log(
    `\nStudent -> id: ${userId}\n         email: ${STUDENT.email}\n      password: ${STUDENT.password}\n        serial: ${STUDENT.serial}`,
  );
}

// ============================================
// Read-back (Prisma)
// ============================================

async function countRows(userId: string) {
  const [watch, views, sessions, days, attempts, answers, progress, purchases, enrollments] =
    await Promise.all([
      prisma.videoWatchProgress.count({ where: { userId } }),
      prisma.contentView.count({ where: { userId } }),
      prisma.studySession.count({ where: { userId } }),
      prisma.dailyActivity.count({ where: { userId } }),
      prisma.quizAttempt.count({ where: { userId } }),
      prisma.userAnswer.count({ where: { attempt: { userId } } }),
      prisma.progress.count({ where: { userId } }),
      prisma.purchase.count({ where: { userId } }),
      prisma.enrollment.count({ where: { userId } }),
    ]);

  return {
    VideoWatchProgress: watch,
    ContentView: views,
    StudySession: sessions,
    DailyActivity: days,
    QuizAttempt: attempts,
    UserAnswer: answers,
    Progress: progress,
    Purchase: purchases,
    Enrollment: enrollments,
  };
}

async function readSnapshot(userId: string, day: string) {
  const counts = await countRows(userId);

  const stats = await prisma.studentStats.findUnique({
    where: { userId },
    select: {
      totalPoints: true,
      totalStudySeconds: true,
      currentStreak: true,
      longestStreak: true,
      lastActiveDate: true,
    },
  });

  const daily = await prisma.dailyActivity.findFirst({
    where: { userId, date: new Date(`${day}T00:00:00.000Z`) },
    select: {
      studySeconds: true,
      videosWatched: true,
      videoSeconds: true,
      quizzesTaken: true,
      pdfsOpened: true,
      contentsDone: true,
      pointsEarned: true,
    },
  });

  return {
    counts,
    studentStats: stats
      ? { ...stats, lastActiveDate: stats.lastActiveDate?.toISOString().slice(0, 10) ?? null }
      : null,
    dailyActivity: daily,
  };
}

/** The database must agree with what the API said it did; otherwise stop. */
function verifySnapshot(
  snapshot: Awaited<ReturnType<typeof readSnapshot>>,
  expected: {
    videoRows: number;
    viewRows: number;
    sessionRows: number;
    attemptRows: number;
    answerRows: number;
    totalStudySeconds: number;
    videoSeconds: number;
    videosCompleted: number;
    pointsEarned: number;
  },
): void {
  const c = snapshot.counts;
  assertEqual(c.VideoWatchProgress, expected.videoRows, 'db VideoWatchProgress rows');
  assertEqual(c.ContentView, expected.viewRows, 'db ContentView rows');
  assertEqual(c.StudySession, expected.sessionRows, 'db StudySession rows');
  assertEqual(c.DailyActivity, 1, 'db DailyActivity rows');
  assertEqual(c.QuizAttempt, expected.attemptRows, 'db QuizAttempt rows');
  assertEqual(c.UserAnswer, expected.answerRows, 'db UserAnswer rows');

  if (!snapshot.studentStats) fail('db StudentStats row is missing');
  assertEqual(snapshot.studentStats.totalPoints, expected.pointsEarned, 'db StudentStats.totalPoints');
  assertEqual(
    snapshot.studentStats.totalStudySeconds,
    expected.totalStudySeconds,
    'db StudentStats.totalStudySeconds',
  );
  assertEqual(snapshot.studentStats.currentStreak, 1, 'db StudentStats.currentStreak');
  assertEqual(snapshot.studentStats.longestStreak, 1, 'db StudentStats.longestStreak');

  if (!snapshot.dailyActivity) fail('db DailyActivity row for today is missing');
  const d = snapshot.dailyActivity;
  assertEqual(d.studySeconds, expected.totalStudySeconds, 'db DailyActivity.studySeconds');
  assertEqual(d.videoSeconds, expected.videoSeconds, 'db DailyActivity.videoSeconds');
  assertEqual(d.videosWatched, expected.videosCompleted, 'db DailyActivity.videosWatched');
  assertEqual(d.quizzesTaken, expected.attemptRows, 'db DailyActivity.quizzesTaken');
  assertEqual(d.pdfsOpened, PDFS.length, 'db DailyActivity.pdfsOpened');
  assertEqual(d.pointsEarned, expected.pointsEarned, 'db DailyActivity.pointsEarned');
}

/**
 * Report figures that depend on the course catalogue as well as on the seeded
 * activity. The catalogue counts are read live so these stay correct if a
 * course gains content; the formulas mirror reporting.service.ts.
 */
async function deriveReportExpectations(
  userId: string,
  input: {
    videoBreakdown: Array<{ watchPercent: number; completed: boolean }>;
    scores: number[];
    totalStudySeconds: number;
    videoSeconds: number;
    pointsEarned: number;
  },
) {
  // Ordered so this file is byte-stable between runs. The API does not promise
  // an order for `subjects[]`, so a verifier should compare it as a set.
  const enrolled = await prisma.enrollment.findMany({
    where: { userId, status: { not: 'SAVED' } },
    select: { courseId: true, course: { select: { title: true } } },
    orderBy: { courseId: 'asc' },
  });

  const contents = await prisma.content.findMany({
    where: { section: { courseId: { in: enrolled.map((e) => e.courseId) } } },
    select: { id: true, type: true, section: { select: { courseId: true } } },
  });

  const completedIds = new Set(
    (
      await prisma.progress.findMany({
        where: { userId, completed: true, contentId: { in: contents.map((c) => c.id) } },
        select: { contentId: true },
      })
    ).map((p) => p.contentId),
  );

  const percent = (part: number, total: number) => (!total || total <= 0 ? 0 : Math.round((part / total) * 100));
  const mean = (xs: number[]) => (xs.length === 0 ? 0 : Math.round(xs.reduce((s, x) => s + x, 0) / xs.length));

  const videos = contents.filter((c) => c.type === 'VIDEO');
  const pdfs = contents.filter((c) => c.type === 'PDF');
  const watched = new Set(
    VIDEOS.filter((_, i) => input.videoBreakdown[i].watchPercent >= 90).map((v) => v.contentId),
  );

  const subjects = enrolled.map((e) => {
    const own = contents.filter((c) => c.section.courseId === e.courseId);
    return {
      courseId: e.courseId,
      title: e.course.title,
      progressPercent: percent(own.filter((c) => completedIds.has(c.id)).length, own.length),
    };
  });

  const videosWatched = videos.filter((c) => completedIds.has(c.id) || watched.has(c.id)).length;
  const avgVideoWatchPercent = mean(input.videoBreakdown.map((v) => v.watchPercent));
  const avgQuizScore = mean(input.scores);
  const avgCourseCompletion = mean(subjects.map((s) => s.progressPercent));
  const commitmentRaw = (1 / 30) * 100; // exactly one active day in the 30-day window

  const components = [
    { key: 'videoWatching', weight: 33, raw: avgVideoWatchPercent },
    { key: 'quizScores', weight: 28, raw: avgQuizScore },
    { key: 'dailyCommitment', weight: 22, raw: commitmentRaw },
    { key: 'planCompletion', weight: 17, raw: avgCourseCompletion },
  ].map((c) => ({ ...c, contribution: Math.round((c.raw * c.weight) / 100) }));

  const score = Math.round(components.reduce((sum, c) => sum + (c.raw * c.weight) / 100, 0));

  return {
    note:
      'Derived with the formulas in reporting.service.ts / admin-reporting.service.ts. ' +
      'Catalogue counts read live from Prisma; activity figures come from what this script sent.',
    activity: {
      totalStudySeconds: input.totalStudySeconds,
      totalStudyHours: Math.round((input.totalStudySeconds / 3600) * 10) / 10,
      currentStreak: 1,
      longestStreak: 1,
      totalPoints: input.pointsEarned,
      sessionsRecorded: SESSIONS.length,
    },
    overview: {
      overallProgressPercent: percent(contents.filter((c) => completedIds.has(c.id)).length, contents.length),
      videosWatched,
      videosActuallyWatched: input.videoBreakdown.filter((v) => v.watchPercent >= 90).length,
      videosRemaining: Math.max(0, videos.length - videosWatched),
      totalVideos: videos.length,
      videoSeconds: input.videoSeconds,
      // Derived from Progress.completed for PDF contents, NOT from ContentView.
      pdfsOpened: pdfs.filter((c) => completedIds.has(c.id)).length,
      totalPdfs: pdfs.length,
      quizzesTaken: input.scores.length,
      averageQuizScore: avgQuizScore,
      studyHours: Math.round((input.totalStudySeconds / 3600) * 10) / 10,
      studySeconds: input.totalStudySeconds,
      currentStreak: 1,
      longestStreak: 1,
      totalPoints: input.pointsEarned,
    },
    subjects,
    quizAnalytics: {
      totalAttempts: input.scores.length,
      averageScore: avgQuizScore,
      highestScore: Math.max(...input.scores),
      lowestScore: Math.min(...input.scores),
      passRate: percent(ATTEMPTS.filter((a) => a.expectedPassed).length, ATTEMPTS.length),
      recentAttemptsCapped: Math.min(10, input.scores.length),
    },
    successIndex: { score, band: score >= 70 ? 'green' : score >= 40 ? 'yellow' : 'red', components },
    weeklyActivity: {
      note: 'Seven entries, oldest first: six zero-filled days then today.',
      today: {
        studyMinutes: studyMinutes(input.totalStudySeconds),
        videos: input.videoBreakdown.filter((v) => v.completed).length,
        quizzes: input.scores.length,
      },
    },
    heatmap: {
      note: 'Thirty entries, oldest first: twenty-nine at level 0 then today.',
      today: {
        studyMinutes: studyMinutes(input.totalStudySeconds),
        level: heatmapLevel(studyMinutes(input.totalStudySeconds)),
      },
    },
  };
}

const studyMinutes = (seconds: number) => Math.round(seconds / 60);

/** Fixed thresholds from reporting.service.ts, evaluated so the last match wins. */
function heatmapLevel(minutes: number): number {
  if (minutes === 0) return 0;
  if (minutes >= 90) return 4;
  if (minutes >= 45) return 3;
  if (minutes >= 15) return 2;
  return 1;
}

main()
  .catch((err) => {
    console.error(`\nSEED FAILED: ${err instanceof Error ? err.message : String(err)}`);
    if (!(err instanceof SeedError) && err instanceof Error && err.stack) {
      console.error(err.stack);
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
