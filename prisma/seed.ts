import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Seed Admin
  await seedAdmin();

  console.log('✅ Database seeding completed!');
}

/**
 * Seed Admin User
 */
async function seedAdmin() {
  const adminEmail = 'graket@admin.com';
  const adminPassword = 'Admin@123';

  console.log('\n👤 Seeding Admin...');

  // Check if admin already exists
  const existingAdmin = await prisma.admin.findUnique({
    where: { email: adminEmail },
  });

  if (existingAdmin) {
    console.log(`⚠️  Admin with email ${adminEmail} already exists. Skipping...`);
    return;
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  // Create admin
  const admin = await prisma.admin.create({
    data: {
      email: adminEmail,
      password: hashedPassword,
      name: 'Graket Admin',
    },
  });

  console.log(`✅ Admin created successfully!`);
  console.log(`   Email: ${admin.email}`);
  console.log(`   ID: ${admin.id}`);
  console.log(`   Password: ${adminPassword} (for development only)`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
