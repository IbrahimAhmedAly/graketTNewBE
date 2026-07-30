import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const NEW_EMAIL = process.env.NEW_ADMIN_EMAIL ?? 'graketcompany@gmail.com';
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

  if (admin.email === newEmail) {
    console.log(`Admin ${admin.id} already uses ${newEmail}. Nothing to do.`);
    return;
  }

  const taken = await prisma.admin.findUnique({ where: { email: newEmail } });
  if (taken) {
    throw new Error(`Email ${newEmail} is already used by admin ${taken.id}`);
  }

  const updated = await prisma.admin.update({
    where: { id: admin.id },
    data: { email: newEmail },
    select: { id: true, email: true, name: true },
  });

  console.log(`Updated admin ${updated.id} (${updated.name ?? 'no name'})`);
  console.log(`  ${admin.email} -> ${updated.email}`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
