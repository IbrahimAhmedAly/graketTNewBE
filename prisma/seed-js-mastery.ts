import { PrismaClient, ContentType, PurchaseType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Adding JavaScript Mastery course...\n');

  // Find an existing admin, instructor, and category (required for FK relations)
  const admin = await prisma.admin.findFirst();
  if (!admin) {
    throw new Error('No admin found. Run the main seed first or create an admin.');
  }

  const instructor = await prisma.instructor.findFirst({
    where: { email: 'ahlam.said@graket.com' },
  }) ?? await prisma.instructor.findFirst();
  if (!instructor) {
    throw new Error('No instructor found. Create one first.');
  }

  const category = await prisma.category.findFirst({
    where: { slug: 'web-development' },
  }) ?? await prisma.category.findFirst();
  if (!category) {
    throw new Error('No category found. Create one first.');
  }

  // Education targeting: University → Year 4.
  // Resolved by name rather than hard-coded id so the script survives a
  // database reset, which regenerates every uuid.
  const universityLevel = await prisma.educationLevel.findUnique({
    where: { name: 'University' },
  });
  if (!universityLevel) {
    throw new Error(
      'Education level "University" not found. Run the main seed first.',
    );
  }

  const year4 = await prisma.grade.findUnique({
    where: {
      educationLevelId_name: {
        educationLevelId: universityLevel.id,
        name: 'Year 4',
      },
    },
  });
  if (!year4) {
    throw new Error(
      'Grade "Year 4" not found under University. Run the main seed first.',
    );
  }

  // Idempotency: if the course already exists, skip creation
  const existing = await prisma.course.findUnique({
    where: { slug: 'javascript-mastery-full-stack' },
  });
  if (existing) {
    console.log('⚠️  Course already exists — skipping course creation.');
    console.log(`   Course ID: ${existing.id}\n`);

    // Re-apply the education targeting. Without this the script is a no-op on
    // an existing row, so a course seeded before targeting was introduced (or
    // pointed at a different year) would silently keep the old assignment.
    if (
      existing.educationLevelId !== universityLevel.id ||
      existing.gradeId !== year4.id
    ) {
      await prisma.course.update({
        where: { id: existing.id },
        data: { educationLevelId: universityLevel.id, gradeId: year4.id },
      });
      console.log('✅ Updated education targeting → University / Year 4\n');
    }

    // Still ensure the codes exist
    await ensureCodes(existing.id, admin.id);
    return;
  }

  // Create course
  const course = await prisma.course.create({
    data: {
      title: 'JavaScript Mastery — Full Stack Development',
      slug: 'javascript-mastery-full-stack',
      description:
        'A comprehensive full-stack JavaScript course covering modern ES6+, React, Node.js, Express, and MongoDB. Build real-world projects from scratch and master both frontend and backend development. Ideal for developers who want to become job-ready full-stack engineers.',
      thumbnail: 'https://images.unsplash.com/photo-1627398242454-45a1465c2479',
      instructorId: instructor.id,
      categoryId: category.id,
      educationLevelId: universityLevel.id,
      gradeId: year4.id,
      price: 549.99,
      discountPrice: 349.99,
      totalDuration: 4800,
      totalVideos: 12,
      totalQuizzes: 2,
      isPublished: true,
    },
  });
  console.log(`✅ Created course: ${course.title}`);
  console.log(`   Course ID: ${course.id}`);
  console.log(`   Targeting: ${universityLevel.name} / ${year4.name}\n`);

  // Section 1: JavaScript Fundamentals
  const section1 = await prisma.section.create({
    data: {
      title: 'Section 1: JavaScript Fundamentals',
      order: 1,
      courseId: course.id,
    },
  });

  await prisma.content.createMany({
    data: [
      {
        title: 'Lecture 1: JavaScript Crash Course for Beginners',
        type: ContentType.VIDEO,
        order: 1,
        duration: 60,
        sectionId: section1.id,
        videoUrl: 'https://www.youtube.com/watch?v=hdI2bqOjy3c',
      },
      {
        title: 'Lecture 2: JavaScript DOM Manipulation',
        type: ContentType.VIDEO,
        order: 2,
        duration: 45,
        sectionId: section1.id,
        videoUrl: 'https://www.youtube.com/watch?v=5fb2aPlgoys',
      },
      {
        title: 'Lecture 3: JavaScript ES6+ Features',
        type: ContentType.VIDEO,
        order: 3,
        duration: 50,
        sectionId: section1.id,
        videoUrl: 'https://www.youtube.com/watch?v=NCwa_xi0Uuc',
      },
      {
        title: 'JavaScript ES6 Cheat Sheet',
        type: ContentType.PDF,
        order: 4,
        sectionId: section1.id,
        pdfUrl: 'https://example.com/pdfs/js-es6-cheatsheet.pdf',
        fileSize: 1536000,
      },
    ],
  });

  const jsQuizContent = await prisma.content.create({
    data: {
      title: 'JavaScript Fundamentals Quiz',
      type: ContentType.QUIZ,
      order: 5,
      duration: 20,
      sectionId: section1.id,
    },
  });

  const jsQuiz = await prisma.quiz.create({
    data: {
      contentId: jsQuizContent.id,
      timeLimit: 20,
      passingScore: 70,
    },
  });

  const jsQ1 = await prisma.question.create({
    data: {
      quizId: jsQuiz.id,
      questionText: 'Which keyword declares a block-scoped variable in ES6?',
      order: 1,
      points: 1,
    },
  });
  await prisma.option.createMany({
    data: [
      { questionId: jsQ1.id, text: 'var', isCorrect: false, order: 1 },
      { questionId: jsQ1.id, text: 'let', isCorrect: true, order: 2 },
      { questionId: jsQ1.id, text: 'define', isCorrect: false, order: 3 },
      { questionId: jsQ1.id, text: 'static', isCorrect: false, order: 4 },
    ],
  });

  const jsQ2 = await prisma.question.create({
    data: {
      quizId: jsQuiz.id,
      questionText: 'What does the spread operator (...) do in JavaScript?',
      order: 2,
      points: 1,
    },
  });
  await prisma.option.createMany({
    data: [
      { questionId: jsQ2.id, text: 'Expands an iterable into individual elements', isCorrect: true, order: 1 },
      { questionId: jsQ2.id, text: 'Declares a rest parameter', isCorrect: false, order: 2 },
      { questionId: jsQ2.id, text: 'Multiplies array values', isCorrect: false, order: 3 },
      { questionId: jsQ2.id, text: 'Merges two functions', isCorrect: false, order: 4 },
    ],
  });

  // Section 2: React.js
  const section2 = await prisma.section.create({
    data: {
      title: 'Section 2: React.js — Building Modern UIs',
      order: 2,
      courseId: course.id,
    },
  });

  await prisma.content.createMany({
    data: [
      {
        title: 'Lecture 1: React JS Full Course for Beginners',
        type: ContentType.VIDEO,
        order: 1,
        duration: 90,
        sectionId: section2.id,
        videoUrl: 'https://www.youtube.com/watch?v=RVFAyFWO4go',
      },
      {
        title: 'Lecture 2: React Hooks — useState & useEffect',
        type: ContentType.VIDEO,
        order: 2,
        duration: 55,
        sectionId: section2.id,
        videoUrl: 'https://www.youtube.com/watch?v=O6P86uwfdR0',
      },
      {
        title: 'Lecture 3: React Context API and State Management',
        type: ContentType.VIDEO,
        order: 3,
        duration: 48,
        sectionId: section2.id,
        videoUrl: 'https://www.youtube.com/watch?v=35lXWvCuM8o',
      },
      {
        title: 'React Components Cheat Sheet',
        type: ContentType.PDF,
        order: 4,
        sectionId: section2.id,
        pdfUrl: 'https://example.com/pdfs/react-components-cheatsheet.pdf',
        fileSize: 2048000,
      },
    ],
  });

  const reactQuizContent = await prisma.content.create({
    data: {
      title: 'React.js Quiz',
      type: ContentType.QUIZ,
      order: 5,
      duration: 20,
      sectionId: section2.id,
    },
  });

  const reactQuiz = await prisma.quiz.create({
    data: {
      contentId: reactQuizContent.id,
      timeLimit: 20,
      passingScore: 70,
    },
  });

  const reactQ1 = await prisma.question.create({
    data: {
      quizId: reactQuiz.id,
      questionText: 'Which hook is used to manage state in a React functional component?',
      order: 1,
      points: 1,
    },
  });
  await prisma.option.createMany({
    data: [
      { questionId: reactQ1.id, text: 'useEffect', isCorrect: false, order: 1 },
      { questionId: reactQ1.id, text: 'useContext', isCorrect: false, order: 2 },
      { questionId: reactQ1.id, text: 'useState', isCorrect: true, order: 3 },
      { questionId: reactQ1.id, text: 'useReducer', isCorrect: false, order: 4 },
    ],
  });

  const reactQ2 = await prisma.question.create({
    data: {
      quizId: reactQuiz.id,
      questionText: 'What is JSX?',
      order: 2,
      points: 1,
    },
  });
  await prisma.option.createMany({
    data: [
      { questionId: reactQ2.id, text: 'A JavaScript library for styling', isCorrect: false, order: 1 },
      { questionId: reactQ2.id, text: 'A syntax extension that allows HTML-like code in JavaScript', isCorrect: true, order: 2 },
      { questionId: reactQ2.id, text: 'A package manager for React', isCorrect: false, order: 3 },
      { questionId: reactQ2.id, text: 'A database query language', isCorrect: false, order: 4 },
    ],
  });

  // Section 3: Node.js & Express
  const section3 = await prisma.section.create({
    data: {
      title: 'Section 3: Node.js & Express — Backend Development',
      order: 3,
      courseId: course.id,
    },
  });

  await prisma.content.createMany({
    data: [
      {
        title: 'Lecture 1: Node.js Crash Course',
        type: ContentType.VIDEO,
        order: 1,
        duration: 75,
        sectionId: section3.id,
        videoUrl: 'https://www.youtube.com/watch?v=fBNz5xF-Kx4',
      },
      {
        title: 'Lecture 2: Express.js REST API Tutorial',
        type: ContentType.VIDEO,
        order: 2,
        duration: 65,
        sectionId: section3.id,
        videoUrl: 'https://www.youtube.com/watch?v=l8WPWK9mS5M',
      },
      {
        title: 'Lecture 3: MongoDB & Mongoose with Node.js',
        type: ContentType.VIDEO,
        order: 3,
        duration: 70,
        sectionId: section3.id,
        videoUrl: 'https://www.youtube.com/watch?v=DZBGEVgL2eE',
      },
      {
        title: 'Node.js & Express API Reference',
        type: ContentType.PDF,
        order: 4,
        sectionId: section3.id,
        pdfUrl: 'https://example.com/pdfs/nodejs-express-reference.pdf',
        fileSize: 2560000,
      },
    ],
  });

  console.log('✅ Created 3 sections with 12 videos, 3 PDFs, and 2 quizzes\n');

  await ensureCodes(course.id, admin.id);
}

async function ensureCodes(courseId: string, adminId: string) {
  console.log('🎫 Creating purchase codes...');

  const codes = [
    { code: 'JSMASTERY-2026-001', maxUses: 1 },
    { code: 'JSMASTERY-BATCH-50', maxUses: 50 },
  ];

  for (const c of codes) {
    const existing = await prisma.purchaseCode.findUnique({ where: { code: c.code } });
    if (existing) {
      console.log(`   ⚠️  ${c.code} already exists — skipping`);
      continue;
    }

    await prisma.purchaseCode.create({
      data: {
        code: c.code,
        type: PurchaseType.COURSE,
        courseId,
        isUsed: false,
        createdBy: adminId,
        maxUses: c.maxUses,
        usedCount: 0,
        expiresAt: new Date('2026-12-31'),
      },
    });
    console.log(`   ✅ ${c.code} (max uses: ${c.maxUses})`);
  }

  console.log('\n🎉 Done!\n');
  console.log('Ready-to-use codes:');
  console.log('   - JSMASTERY-2026-001 (single-use)');
  console.log('   - JSMASTERY-BATCH-50 (up to 50 uses)');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
