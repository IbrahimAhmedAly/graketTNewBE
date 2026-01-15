import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../../src/utils/auth/password.utility';

const prisma = new PrismaClient();

async function seedUser() {
  console.log('Seeding admin user...');

  // Hash password
  const hashedPassword = await hashPassword('Admin@123');

  // Delete existing user(s) if needed
  await prisma.user.deleteMany({
    where: { email: 'admin@mergaz.com' },
  });

  // Create admin user
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@mergaz.com',
      name: 'Admin',
      password: hashedPassword,
    },
  });

  console.log(`✅ Admin user created: ${adminUser.email}`);
}

seedUser()
  .catch((e) => {
    console.error('❌ Error seeding user:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
