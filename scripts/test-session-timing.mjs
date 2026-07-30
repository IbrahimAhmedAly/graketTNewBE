/**
 * Session-duration correctness with a controlled clock.
 *
 * The main suite can only assert "duration < 60s" because a test runs in
 * milliseconds. Here the session's startedAt is backdated directly in the
 * database, so elapsed time is known exactly and the credited seconds can be
 * compared against a hand-computed number rather than a plausible range.
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
    console.log(`  ✗ ${label}\n      expected ${JSON.stringify(expected)}\n      actual   ${JSON.stringify(actual)}`);
  }
}

const BASE = 'http://localhost:3050/api/v1';
const STAMP = Date.now();
const EMAIL = `sess.test.${STAMP}@gmail.com`;
const PASSWORD = 'password123';
const SERIAL = `SN-SESS-${STAMP}`;

const bcrypt = await import('bcrypt');
const user = await prisma.user.create({
  data: {
    email: EMAIL,
    name: 'Session Fixture',
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

console.log('\n── EXACT DURATION (backdated clock) ──────────────────────');

// Open a session, then backdate it by exactly 25 minutes = 1500 seconds.
let s = await post('/tracking/session/start', { tzOffsetMinutes: 0 });
let sessionId = s.data.data.sessionId;

const backdate = (id, seconds) =>
  prisma.studySession.update({
    where: { id },
    data: {
      startedAt: new Date(Date.now() - seconds * 1000),
      lastHeartbeatAt: new Date(),
    },
  });

await backdate(sessionId, 1500);
let ended = await post('/tracking/session/end', { sessionId });

// Hand-computed: 1500s elapsed => 1500s credited (±1s for round-trip latency).
const d1 = ended.data.data.durationSec;
eq('25-minute session credits ~1500s exactly', Math.abs(d1 - 1500) <= 1, true);

let daily = await prisma.dailyActivity.findFirst({ where: { userId: user.id } });
eq('daily rollup received the same 1500s', Math.abs(daily.studySeconds - 1500) <= 1, true);

let stats = await prisma.studentStats.findUnique({ where: { userId: user.id } });
eq('lifetime total received the same 1500s', Math.abs(stats.totalStudySeconds - 1500) <= 1, true);

console.log('\n── ACCUMULATION ACROSS SESSIONS ──────────────────────────');

// A second 10-minute session the same day: 1500 + 600 = 2100s total.
s = await post('/tracking/session/start', { tzOffsetMinutes: 0 });
sessionId = s.data.data.sessionId;
await backdate(sessionId, 600);
await post('/tracking/session/end', { sessionId });

daily = await prisma.dailyActivity.findFirst({ where: { userId: user.id } });
eq('two sessions sum to 2100s (35 min)', Math.abs(daily.studySeconds - 2100) <= 2, true);

console.log('\n── THE CAP: runaway session cannot bank phantom hours ────');

// Backdate 9 hours. The 4h cap must apply: 32400s elapsed -> 14400s credited.
s = await post('/tracking/session/start', { tzOffsetMinutes: 0 });
sessionId = s.data.data.sessionId;
await backdate(sessionId, 9 * 3600);
ended = await post('/tracking/session/end', { sessionId });

eq('9-hour session capped at exactly 4h (14400s)', ended.data.data.durationSec, 14400);

daily = await prisma.dailyActivity.findFirst({ where: { userId: user.id } });
eq('rollup credited the capped value, not 9h', Math.abs(daily.studySeconds - (2100 + 14400)) <= 2, true);

console.log('\n── IDLE SWEEP: abandoned session credited to last heartbeat ──');

// Open a session, backdate start by 1 hour but heartbeat by 10 minutes: the
// student was last seen 10 min ago, so only the first 50 min are vouched for.
s = await post('/tracking/session/start', { tzOffsetMinutes: 0 });
sessionId = s.data.data.sessionId;
await prisma.studySession.update({
  where: { id: sessionId },
  data: {
    startedAt: new Date(Date.now() - 3600 * 1000),
    lastHeartbeatAt: new Date(Date.now() - 600 * 1000),
  },
});

// Starting a new session finds the stale one and closes it at its heartbeat.
const beforeSweep = (await prisma.dailyActivity.findFirst({ where: { userId: user.id } })).studySeconds;
const s2 = await post('/tracking/session/start', { tzOffsetMinutes: 0 });
const afterSweep = (await prisma.dailyActivity.findFirst({ where: { userId: user.id } })).studySeconds;

// Hand-computed: startedAt -3600s, heartbeat -600s => 3000s credited, not 3600.
eq('abandoned session credits 3000s (to heartbeat), not 3600s', Math.abs((afterSweep - beforeSweep) - 3000) <= 2, true);

const stale = await prisma.studySession.findUnique({ where: { id: sessionId } });
eq('stale session marked as NOT client-closed', stale.closedByClient, false);
eq('stale session has an end time', stale.endedAt !== null, true);

// cleanup
await post('/tracking/session/end', { sessionId: s2.data.data.sessionId });
await prisma.studySession.deleteMany({ where: { userId: user.id } });
await prisma.dailyActivity.deleteMany({ where: { userId: user.id } });
await prisma.studentStats.deleteMany({ where: { userId: user.id } });
await prisma.user.delete({ where: { id: user.id } });

console.log(`\n${'='.repeat(58)}\n  PASS ${pass}   FAIL ${fail}\n${'='.repeat(58)}`);
await prisma.$disconnect();
process.exit(fail === 0 ? 0 : 1);
