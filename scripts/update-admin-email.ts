import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/utils/auth/password.utility';

const prisma = new PrismaClient();

/** Matches the cost factor used by every hash site in src/ (bcrypt.hash(pw, 10)). */
const SALT_ROUNDS = 10;

const NEW_EMAIL = process.env.NEW_ADMIN_EMAIL ?? 'graketcompany@gmail.com';
const NEW_PASSWORD = process.env.NEW_ADMIN_PASSWORD ?? 'passAdmin@123';
const CURRENT_EMAIL = process.env.CURRENT_ADMIN_EMAIL;

function normalize(email: string): string {
  return email.trim().toLowerCase();
}

async function resolveAdmin() {
  if (CURRENT_EMAIL) {
    const admin = await prisma.admin.findUnique({
      where: { email: normalize(CURRENT_EMAIL) },
      select: { id: true, email: true, name: true },
    });
    if (!admin) {
      throw new Error(`No admin found with email ${normalize(CURRENT_EMAIL)}`);
    }
    return admin;
  }

  const admins = await prisma.admin.findMany({
    select: { id: true, email: true, name: true },
    orderBy: { createdAt: 'asc' },
  });

  if (admins.length === 0) {
    throw new Error('No admin accounts exist.');
  }
  if (admins.length > 1) {
    throw new Error(
      `Found ${admins.length} admins (${admins
        .map((a) => a.email)
        .join(', ')}). Set CURRENT_ADMIN_EMAIL to pick one.`,
    );
  }
  return admins[0];
}

async function main() {
  const newEmail = normalize(NEW_EMAIL);
  const admin = await resolveAdmin();

  const emailChanged = admin.email !== newEmail;
  if (emailChanged) {
    const taken = await prisma.admin.findUnique({ where: { email: newEmail } });
    if (taken) {
      throw new Error(`Email ${newEmail} is already used by admin ${taken.id}`);
    }
  }

  const updated = await prisma.admin.update({
    where: { id: admin.id },
    data: {
      email: newEmail,
      password: await hashPassword(NEW_PASSWORD, SALT_ROUNDS),
    },
    select: { id: true, email: true, name: true },
  });

  console.log(`Updated admin ${updated.id} (${updated.name ?? 'no name'})`);
  console.log(
    emailChanged
      ? `  email:    ${admin.email} -> ${updated.email}`
      : `  email:    ${updated.email} (unchanged)`,
  );
  console.log('  password: reset');
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
