import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedLanguages() {
  console.log('Seeding languages...');

  await prisma.language.deleteMany();

  const languages = [
    {
      id: 'ar',
      code: 'ar',
      name: 'Arabic',
      isActive: true,
      isDefault: true,
    },
    {
      id: 'en',
      code: 'en',
      name: 'English',
      isActive: true,
      isDefault: false,
    },
  ];

  for (const language of languages) {
    await prisma.language.create({
      data: language,
    });
    console.log(`Created language: ${language.name}`);
  }

  console.log('Languages seeded successfully!');
}

seedLanguages()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
