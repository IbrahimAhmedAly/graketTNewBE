import { PrismaClient, UserStatus } from '@prisma/client';

const prisma = new PrismaClient();

const DELETED_EMAIL_DOMAIN = '@gmail.com';

function sanitizeLocalPart(email: string): string {
  const local = email.split('@')[0] || 'user';
  const cleaned = local.replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase();
  return cleaned || 'user';
}

async function main() {
  const purchaseCodesDeleted = await prisma.purchaseCode.deleteMany({});
  console.log(`Deleted ${purchaseCodesDeleted.count} purchase codes`);

  const users = await prisma.user.findMany({
    where: { NOT: { status: UserStatus.DELETED } },
    select: { id: true, email: true },
  });
  console.log(`Soft-deleting ${users.length} users...`);

  let updated = 0;
  for (const { id, email } of users) {
    const local = sanitizeLocalPart(email);
    await prisma.user.update({
      where: { id },
      data: {
        status: UserStatus.DELETED,
        email: `${local}-delete-${id}${DELETED_EMAIL_DOMAIN}`,
      },
    });
    updated += 1;
  }
  console.log(`Soft-deleted ${updated} users`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
