import { PrismaClient } from '@prisma/client';

/**
 * Badge catalogue.
 *
 * `points` doubles as the unlock cost shown in "points needed for the next
 * badge", so the list is ordered by increasing cost. Criteria are stored as
 * machine-readable JSON so the award rules live with the data rather than
 * being hard-coded in a service.
 */
export const BADGES = [
  {
    code: 'FIRST_STEPS',
    name: 'First Steps',
    description: 'Completed your first lesson',
    icon: '🌱',
    criteria: { type: 'videos_completed', threshold: 1 },
    points: 10,
  },
  {
    code: 'STREAK_3',
    name: 'Getting Consistent',
    description: 'Studied three days in a row',
    icon: '🔥',
    criteria: { type: 'streak', threshold: 3 },
    points: 30,
  },
  {
    code: 'QUIZ_STARTER',
    name: 'Quiz Starter',
    description: 'Completed your first quiz',
    icon: '📝',
    criteria: { type: 'quizzes_taken', threshold: 1 },
    points: 40,
  },
  {
    code: 'STREAK_7',
    name: 'Week Warrior',
    description: 'Studied seven days in a row',
    icon: '⚡',
    criteria: { type: 'streak', threshold: 7 },
    points: 75,
  },
  {
    code: 'BOOKWORM',
    name: 'Bookworm',
    description: 'Read ten PDF documents',
    icon: '📚',
    criteria: { type: 'pdfs_read', threshold: 10 },
    points: 100,
  },
  {
    code: 'HALFWAY',
    name: 'Halfway There',
    description: 'Reached 50% in a course',
    icon: '🎯',
    criteria: { type: 'course_progress', threshold: 50 },
    points: 120,
  },
  {
    code: 'QUIZ_ACE',
    name: 'Quiz Ace',
    description: 'Scored 90% or higher on a quiz',
    icon: '🏅',
    criteria: { type: 'quiz_score', threshold: 90 },
    points: 150,
  },
  {
    code: 'STREAK_30',
    name: 'Unstoppable',
    description: 'Studied thirty days in a row',
    icon: '💎',
    criteria: { type: 'streak', threshold: 30 },
    points: 300,
  },
  {
    code: 'COURSE_COMPLETE',
    name: 'Course Champion',
    description: 'Completed an entire course',
    icon: '🏆',
    criteria: { type: 'course_progress', threshold: 100 },
    points: 400,
  },
] as const;

export async function seedBadges(prisma: PrismaClient) {
  for (const badge of BADGES) {
    await prisma.badge.upsert({
      where: { code: badge.code },
      update: {
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        criteria: badge.criteria,
        points: badge.points,
      },
      create: {
        code: badge.code,
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        criteria: badge.criteria,
        points: badge.points,
      },
    });
  }

  console.log(`✅ Seeded ${BADGES.length} badges`);
}
