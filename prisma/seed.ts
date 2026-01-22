import {
  PrismaClient,
  UserStatus,
  ContentType,
  EnrollmentStatus,
  PurchaseType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...\n');

  // Clear existing data (in correct order to avoid foreign key constraints)
  console.log('🗑️  Cleaning existing data...');
  await prisma.userAnswer.deleteMany();
  await prisma.quizAttempt.deleteMany();
  await prisma.option.deleteMany();
  await prisma.question.deleteMany();
  await prisma.quiz.deleteMany();
  await prisma.progress.deleteMany();
  await prisma.review.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.purchaseCode.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.content.deleteMany();
  await prisma.section.deleteMany();
  await prisma.course.deleteMany();
  await prisma.instructor.deleteMany();
  await prisma.category.deleteMany();
  await prisma.verificationCode.deleteMany();
  await prisma.user.deleteMany();
  await prisma.admin.deleteMany();
  console.log('✅ Existing data cleaned\n');

  // Hash password for all users
  const hashedPassword = await bcrypt.hash('password123', 10);

  // ============================================
  // 1. CREATE ADMINS
  // ============================================
  console.log('👤 Creating admins...');
  const admin = await prisma.admin.create({
    data: {
      email: 'admin@graket.com',
      name: 'Super Admin',
      password: hashedPassword,
    },
  });
  console.log(`✅ Created admin: ${admin.email}\n`);

  // ============================================
  // 2. CREATE USERS
  // ============================================
  console.log('👥 Creating users...');
  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'ahmed.mohamed@example.com',
        name: 'Ahmed Mohamed',
        password: hashedPassword,
        serial: 'SN001',
        status: UserStatus.ACTIVE,
      },
    }),
    prisma.user.create({
      data: {
        email: 'fatima.ali@example.com',
        name: 'Fatima Ali',
        password: hashedPassword,
        serial: 'SN002',
        status: UserStatus.ACTIVE,
      },
    }),
    prisma.user.create({
      data: {
        email: 'omar.hassan@example.com',
        name: 'Omar Hassan',
        password: hashedPassword,
        serial: 'SN003',
        status: UserStatus.ACTIVE,
      },
    }),
  ]);
  console.log(`✅ Created ${users.length} users\n`);

  // ============================================
  // 3. CREATE CATEGORIES
  // ============================================
  console.log('📚 Creating categories...');
  const categories = await Promise.all([
    prisma.category.create({
      data: {
        name: 'Web Development',
        slug: 'web-development',
        description:
          'Learn modern web development technologies including HTML, CSS, JavaScript, and frameworks',
        icon: '💻',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Mobile Development',
        slug: 'mobile-development',
        description:
          'Master mobile app development for iOS and Android platforms',
        icon: '📱',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Data Science',
        slug: 'data-science',
        description:
          'Explore data analysis, machine learning, and artificial intelligence',
        icon: '📊',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Design',
        slug: 'design',
        description: 'UI/UX design, graphic design, and digital art',
        icon: '🎨',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Business',
        slug: 'business',
        description: 'Business strategy, entrepreneurship, and management',
        icon: '💼',
      },
    }),
  ]);
  console.log(`✅ Created ${categories.length} categories\n`);

  // ============================================
  // 4. CREATE INSTRUCTORS
  // ============================================
  console.log('👨‍🏫 Creating instructors...');
  const instructors = await Promise.all([
    prisma.instructor.create({
      data: {
        name: 'Dr. Ahlam Said',
        email: 'ahlam.said@graket.com',
        title: 'PhD in Computer Science',
        bio: 'Dr. Ahlam has over 15 years of experience in software development and teaching. Specializes in web technologies and full-stack development.',
        avatar: 'https://i.pravatar.cc/300?img=1',
      },
    }),
    prisma.instructor.create({
      data: {
        name: 'Prof. Khaled Ibrahim',
        email: 'khaled.ibrahim@graket.com',
        title: 'Professor of Data Science',
        bio: 'Professor Khaled is a renowned data scientist with expertise in machine learning and AI. Published over 50 research papers.',
        avatar: 'https://i.pravatar.cc/300?img=12',
      },
    }),
    prisma.instructor.create({
      data: {
        name: 'Sarah Ahmed',
        email: 'sarah.ahmed@graket.com',
        title: 'Senior UX Designer',
        bio: 'Sarah is an award-winning designer with 10 years of experience creating beautiful and functional user interfaces.',
        avatar: 'https://i.pravatar.cc/300?img=5',
      },
    }),
    prisma.instructor.create({
      data: {
        name: 'Mohamed Farouk',
        email: 'mohamed.farouk@graket.com',
        title: 'Mobile Development Expert',
        bio: 'Mohamed specializes in cross-platform mobile development with React Native and Flutter. Built 50+ mobile apps.',
        avatar: 'https://i.pravatar.cc/300?img=13',
      },
    }),
  ]);
  console.log(`✅ Created ${instructors.length} instructors\n`);

  // ============================================
  // 5. CREATE COURSES WITH SECTIONS AND CONTENT
  // ============================================
  console.log('📖 Creating courses with sections and content...');

  // Course 1: Complete Web Development Bootcamp
  const webDevCourse = await prisma.course.create({
    data: {
      title: 'Complete Web Development Bootcamp',
      slug: 'complete-web-development-bootcamp',
      description:
        'Learn web development from scratch. This comprehensive course covers HTML, CSS, JavaScript, React, Node.js, and database management. Perfect for beginners who want to become full-stack developers.',
      thumbnail: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085',
      instructorId: instructors[0].id,
      categoryId: categories[0].id,
      price: 499.99,
      discountPrice: 299.99,
      totalDuration: 3600, // 60 hours
      totalVideos: 150,
      totalQuizzes: 10,
      isPublished: true,
    },
  });

  // Section 1.1: HTML Fundamentals
  const section1 = await prisma.section.create({
    data: {
      title: 'Section 1: HTML Fundamentals',
      order: 1,
      courseId: webDevCourse.id,
    },
  });

  const content1_1 = await prisma.content.create({
    data: {
      title: 'Lecture 1: Introduction to HTML',
      type: ContentType.VIDEO,
      order: 1,
      duration: 30,
      sectionId: section1.id,
      videoUrl: 'https://example.com/videos/html-intro.mp4',
    },
  });

  const content1_2 = await prisma.content.create({
    data: {
      title: 'Lecture 2: HTML Tags and Elements',
      type: ContentType.VIDEO,
      order: 2,
      duration: 45,
      sectionId: section1.id,
      videoUrl: 'https://example.com/videos/html-tags.mp4',
    },
  });

  const content1_3 = await prisma.content.create({
    data: {
      title: 'HTML Cheat Sheet',
      type: ContentType.PDF,
      order: 3,
      sectionId: section1.id,
      pdfUrl: 'https://example.com/pdfs/html-cheat-sheet.pdf',
      fileSize: 2048000, // 2MB
    },
  });

  const content1_4 = await prisma.content.create({
    data: {
      title: 'HTML Quiz',
      type: ContentType.QUIZ,
      order: 4,
      duration: 15,
      sectionId: section1.id,
    },
  });

  // Create quiz for HTML section
  const quiz1 = await prisma.quiz.create({
    data: {
      contentId: content1_4.id,
      timeLimit: 15,
      passingScore: 70,
    },
  });

  // Quiz questions
  const question1 = await prisma.question.create({
    data: {
      quizId: quiz1.id,
      questionText: 'What does HTML stand for?',
      order: 1,
      points: 1,
    },
  });

  await prisma.option.createMany({
    data: [
      {
        questionId: question1.id,
        text: 'Hyper Text Markup Language',
        isCorrect: true,
        order: 1,
      },
      {
        questionId: question1.id,
        text: 'High Tech Modern Language',
        isCorrect: false,
        order: 2,
      },
      {
        questionId: question1.id,
        text: 'Home Tool Markup Language',
        isCorrect: false,
        order: 3,
      },
      {
        questionId: question1.id,
        text: 'Hyperlinks and Text Markup Language',
        isCorrect: false,
        order: 4,
      },
    ],
  });

  const question2 = await prisma.question.create({
    data: {
      quizId: quiz1.id,
      questionText: 'Which HTML tag is used to define a paragraph?',
      order: 2,
      points: 1,
    },
  });

  await prisma.option.createMany({
    data: [
      { questionId: question2.id, text: '<p>', isCorrect: true, order: 1 },
      { questionId: question2.id, text: '<para>', isCorrect: false, order: 2 },
      {
        questionId: question2.id,
        text: '<paragraph>',
        isCorrect: false,
        order: 3,
      },
      { questionId: question2.id, text: '<text>', isCorrect: false, order: 4 },
    ],
  });

  // Section 1.2: CSS Basics
  const section2 = await prisma.section.create({
    data: {
      title: 'Section 2: CSS Basics',
      order: 2,
      courseId: webDevCourse.id,
    },
  });

  await prisma.content.createMany({
    data: [
      {
        title: 'Lecture 1: Introduction to CSS',
        type: ContentType.VIDEO,
        order: 1,
        duration: 35,
        sectionId: section2.id,
        videoUrl: 'https://example.com/videos/css-intro.mp4',
      },
      {
        title: 'Lecture 2: CSS Selectors',
        type: ContentType.VIDEO,
        order: 2,
        duration: 40,
        sectionId: section2.id,
        videoUrl: 'https://example.com/videos/css-selectors.mp4',
      },
      {
        title: 'Lecture 3: CSS Box Model',
        type: ContentType.VIDEO,
        order: 3,
        duration: 50,
        sectionId: section2.id,
        videoUrl: 'https://example.com/videos/css-box-model.mp4',
      },
    ],
  });

  // Course 2: Data Science with Python
  const dataScienceCourse = await prisma.course.create({
    data: {
      title: 'Data Science with Python',
      slug: 'data-science-with-python',
      description:
        'Master data science using Python. Learn data analysis, visualization, machine learning, and AI. Work with real-world datasets and build predictive models.',
      thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71',
      instructorId: instructors[1].id,
      categoryId: categories[2].id,
      price: 599.99,
      discountPrice: 399.99,
      totalDuration: 4200, // 70 hours
      totalVideos: 180,
      totalQuizzes: 12,
      isPublished: true,
    },
  });

  const dsSection1 = await prisma.section.create({
    data: {
      title: 'Section 1: Python Fundamentals',
      order: 1,
      courseId: dataScienceCourse.id,
    },
  });

  await prisma.content.createMany({
    data: [
      {
        title: 'Lecture 1: Introduction to Python',
        type: ContentType.VIDEO,
        order: 1,
        duration: 40,
        sectionId: dsSection1.id,
        videoUrl: 'https://example.com/videos/python-intro.mp4',
      },
      {
        title: 'Lecture 2: Python Data Types',
        type: ContentType.VIDEO,
        order: 2,
        duration: 45,
        sectionId: dsSection1.id,
        videoUrl: 'https://example.com/videos/python-datatypes.mp4',
      },
      {
        title: 'Python Installation Guide',
        type: ContentType.PDF,
        order: 3,
        sectionId: dsSection1.id,
        pdfUrl: 'https://example.com/pdfs/python-install.pdf',
        fileSize: 1024000, // 1MB
      },
    ],
  });

  // Course 3: Mobile App Development with React Native
  const mobileDevCourse = await prisma.course.create({
    data: {
      title: 'Mobile App Development with React Native',
      slug: 'mobile-app-development-react-native',
      description:
        'Build cross-platform mobile applications using React Native. Learn to create iOS and Android apps with a single codebase. Deploy apps to app stores.',
      thumbnail: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c',
      instructorId: instructors[3].id,
      categoryId: categories[1].id,
      price: 449.99,
      totalDuration: 3000, // 50 hours
      totalVideos: 120,
      totalQuizzes: 8,
      isPublished: true,
    },
  });

  const mobileSection1 = await prisma.section.create({
    data: {
      title: 'Section 1: React Native Basics',
      order: 1,
      courseId: mobileDevCourse.id,
    },
  });

  await prisma.content.createMany({
    data: [
      {
        title: 'Lecture 1: What is React Native?',
        type: ContentType.VIDEO,
        order: 1,
        duration: 25,
        sectionId: mobileSection1.id,
        videoUrl: 'https://example.com/videos/rn-intro.mp4',
      },
      {
        title: 'Lecture 2: Setting Up Your Development Environment',
        type: ContentType.VIDEO,
        order: 2,
        duration: 35,
        sectionId: mobileSection1.id,
        videoUrl: 'https://example.com/videos/rn-setup.mp4',
      },
    ],
  });

  // Course 4: UI/UX Design Fundamentals
  const designCourse = await prisma.course.create({
    data: {
      title: 'UI/UX Design Fundamentals',
      slug: 'ui-ux-design-fundamentals',
      description:
        'Learn the principles of user interface and user experience design. Create beautiful, user-friendly designs using industry-standard tools like Figma and Adobe XD.',
      thumbnail: 'https://images.unsplash.com/photo-1561070791-2526d30994b5',
      instructorId: instructors[2].id,
      categoryId: categories[3].id,
      price: 349.99,
      discountPrice: 249.99,
      totalDuration: 2400, // 40 hours
      totalVideos: 90,
      totalQuizzes: 6,
      isPublished: true,
    },
  });

  const designSection1 = await prisma.section.create({
    data: {
      title: 'Section 1: Design Principles',
      order: 1,
      courseId: designCourse.id,
    },
  });

  await prisma.content.createMany({
    data: [
      {
        title: 'Lecture 1: Introduction to UI/UX',
        type: ContentType.VIDEO,
        order: 1,
        duration: 30,
        sectionId: designSection1.id,
        videoUrl: 'https://example.com/videos/design-intro.mp4',
      },
      {
        title: 'Lecture 2: Color Theory',
        type: ContentType.VIDEO,
        order: 2,
        duration: 40,
        sectionId: designSection1.id,
        videoUrl: 'https://example.com/videos/color-theory.mp4',
      },
      {
        title: 'Design Resources Guide',
        type: ContentType.PDF,
        order: 3,
        sectionId: designSection1.id,
        pdfUrl: 'https://example.com/pdfs/design-resources.pdf',
        fileSize: 3072000, // 3MB
      },
    ],
  });

  // Course 5: Business Strategy and Entrepreneurship (unpublished - draft)
  const businessCourse = await prisma.course.create({
    data: {
      title: 'Business Strategy and Entrepreneurship',
      slug: 'business-strategy-entrepreneurship',
      description:
        'Learn how to start and grow a successful business. Covers business planning, marketing, finance, and leadership.',
      thumbnail: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40',
      instructorId: instructors[0].id,
      categoryId: categories[4].id,
      price: 399.99,
      totalDuration: 2700, // 45 hours
      totalVideos: 100,
      totalQuizzes: 7,
      isPublished: false, // Draft course
    },
  });

  console.log(`✅ Created 5 courses with sections and content\n`);

  // ============================================
  // 6. CREATE ENROLLMENTS
  // ============================================
  console.log('📝 Creating enrollments...');
  const enrollments = await Promise.all([
    // User 1 enrolled in Web Development and Data Science
    prisma.enrollment.create({
      data: {
        userId: users[0].id,
        courseId: webDevCourse.id,
        status: EnrollmentStatus.ONGOING,
        progress: 25,
      },
    }),
    prisma.enrollment.create({
      data: {
        userId: users[0].id,
        courseId: dataScienceCourse.id,
        status: EnrollmentStatus.ONGOING,
        progress: 10,
      },
    }),
    // User 2 enrolled in Mobile Development and Design
    prisma.enrollment.create({
      data: {
        userId: users[1].id,
        courseId: mobileDevCourse.id,
        status: EnrollmentStatus.ONGOING,
        progress: 50,
      },
    }),
    prisma.enrollment.create({
      data: {
        userId: users[1].id,
        courseId: designCourse.id,
        status: EnrollmentStatus.COMPLETED,
        progress: 100,
        completedAt: new Date('2026-01-10'),
      },
    }),
    // User 3 enrolled in Web Development
    prisma.enrollment.create({
      data: {
        userId: users[2].id,
        courseId: webDevCourse.id,
        status: EnrollmentStatus.ONGOING,
        progress: 5,
      },
    }),
  ]);
  console.log(`✅ Created ${enrollments.length} enrollments\n`);

  // ============================================
  // 7. CREATE PROGRESS (Content Completion)
  // ============================================
  console.log('✅ Creating progress records...');
  await prisma.progress.createMany({
    data: [
      // User 1 completed some HTML content
      {
        userId: users[0].id,
        contentId: content1_1.id,
        completed: true,
        completedAt: new Date(),
      },
      {
        userId: users[0].id,
        contentId: content1_2.id,
        completed: true,
        completedAt: new Date(),
      },
      {
        userId: users[0].id,
        contentId: content1_3.id,
        completed: true,
        completedAt: new Date(),
      },
      // User 2 completed design course content
      { userId: users[1].id, contentId: content1_1.id, completed: false },
    ],
  });
  console.log('✅ Created progress records\n');

  // ============================================
  // 8. CREATE REVIEWS
  // ============================================
  console.log('⭐ Creating reviews...');
  await prisma.review.createMany({
    data: [
      {
        userId: users[0].id,
        courseId: webDevCourse.id,
        rating: 5,
        comment:
          'Excellent course! Dr. Ahlam explains everything clearly and the content is very comprehensive. Highly recommended for beginners!',
      },
      {
        userId: users[1].id,
        courseId: designCourse.id,
        rating: 4.5,
        comment:
          'Great course on UI/UX fundamentals. Sarah is an amazing instructor. Would love to see more advanced topics in a follow-up course.',
      },
      {
        userId: users[1].id,
        courseId: mobileDevCourse.id,
        rating: 4,
        comment:
          'Good introduction to React Native. The projects are practical and helpful.',
      },
      {
        userId: users[2].id,
        courseId: webDevCourse.id,
        rating: 5,
        comment:
          'Best web development course I have taken! Very detailed and easy to follow.',
      },
    ],
  });
  console.log('✅ Created 4 reviews\n');

  // ============================================
  // 9. CREATE PURCHASE CODES
  // ============================================
  console.log('🎫 Creating purchase codes...');

  // Course purchase codes
  const webDevCourseCode = await prisma.purchaseCode.create({
    data: {
      code: 'WEBDEV-2026-FULL',
      type: PurchaseType.COURSE,
      courseId: webDevCourse.id,
      isUsed: true,
      usedBy: users[0].id,
      usedAt: new Date('2026-01-15'),
      createdBy: admin.id,
      maxUses: 1,
      usedCount: 1,
    },
  });

  const dataScienceCourseCode = await prisma.purchaseCode.create({
    data: {
      code: 'DATASCI-PROMO-001',
      type: PurchaseType.COURSE,
      courseId: dataScienceCourse.id,
      isUsed: false,
      createdBy: admin.id,
      maxUses: 1,
      usedCount: 0,
      expiresAt: new Date('2026-12-31'), // Valid until end of year
    },
  });

  const mobileDevCourseCode = await prisma.purchaseCode.create({
    data: {
      code: 'MOBILE-DEV-2026',
      type: PurchaseType.COURSE,
      courseId: mobileDevCourse.id,
      isUsed: false,
      createdBy: admin.id,
      maxUses: 1,
      usedCount: 0,
    },
  });

  const designCourseCode = await prisma.purchaseCode.create({
    data: {
      code: 'DESIGN-EXPIRED-001',
      type: PurchaseType.COURSE,
      courseId: designCourse.id,
      isUsed: false,
      createdBy: admin.id,
      maxUses: 1,
      usedCount: 0,
      expiresAt: new Date('2026-01-01'), // Expired
    },
  });

  // Video purchase codes
  const htmlIntroVideoCode = await prisma.purchaseCode.create({
    data: {
      code: 'VIDEO-HTML-INTRO',
      type: PurchaseType.VIDEO,
      contentId: content1_1.id,
      isUsed: true,
      usedBy: users[1].id,
      usedAt: new Date('2026-01-18'),
      createdBy: admin.id,
      maxUses: 1,
      usedCount: 1,
    },
  });

  const htmlTagsVideoCode = await prisma.purchaseCode.create({
    data: {
      code: 'VIDEO-HTML-TAGS',
      type: PurchaseType.VIDEO,
      contentId: content1_2.id,
      isUsed: true,
      usedBy: users[1].id,
      usedAt: new Date('2026-01-19'),
      createdBy: admin.id,
      maxUses: 1,
      usedCount: 1,
    },
  });

  const cssIntroVideoCode = await prisma.purchaseCode.create({
    data: {
      code: 'VIDEO-CSS-INTRO-FREE',
      type: PurchaseType.VIDEO,
      contentId: content1_1.id, // Reusing content for demo
      isUsed: false,
      createdBy: admin.id,
      maxUses: 1,
      usedCount: 0,
    },
  });

  // Multi-use code for promotional purposes
  const promoMultiUseCode = await prisma.purchaseCode.create({
    data: {
      code: 'PROMO-MULTI-USE-10',
      type: PurchaseType.COURSE,
      courseId: webDevCourse.id,
      isUsed: false,
      createdBy: admin.id,
      maxUses: 10,
      usedCount: 0,
      expiresAt: new Date('2026-06-30'),
    },
  });

  console.log('✅ Created 8 purchase codes\n');

  // ============================================
  // 10. CREATE PURCHASES
  // ============================================
  console.log('💰 Creating purchases...');

  // User 1 (Ahmed) purchased the full Web Development course
  await prisma.purchase.create({
    data: {
      type: PurchaseType.COURSE,
      userId: users[0].id,
      courseId: webDevCourse.id,
      purchaseCodeId: webDevCourseCode.id,
      purchasedAt: new Date('2026-01-15'),
    },
  });

  // User 2 (Fatima) purchased individual videos
  await prisma.purchase.create({
    data: {
      type: PurchaseType.VIDEO,
      userId: users[1].id,
      contentId: content1_1.id,
      purchaseCodeId: htmlIntroVideoCode.id,
      purchasedAt: new Date('2026-01-18'),
    },
  });

  await prisma.purchase.create({
    data: {
      type: PurchaseType.VIDEO,
      userId: users[1].id,
      contentId: content1_2.id,
      purchaseCodeId: htmlTagsVideoCode.id,
      purchasedAt: new Date('2026-01-19'),
    },
  });

  // User 3 (Omar) has no purchases yet

  console.log('✅ Created 3 purchases\n');

  // ============================================
  // SUMMARY
  // ============================================
  console.log('🎉 Seeding completed successfully!\n');
  console.log('📊 Summary:');
  console.log(`   - Admins: 1`);
  console.log(`   - Users: ${users.length}`);
  console.log(`   - Categories: ${categories.length}`);
  console.log(`   - Instructors: ${instructors.length}`);
  console.log(`   - Courses: 5 (4 published, 1 draft)`);
  console.log(`   - Sections: Multiple per course`);
  console.log(`   - Content: Videos, PDFs, and Quizzes`);
  console.log(`   - Enrollments: ${enrollments.length}`);
  console.log(`   - Reviews: 4`);
  console.log(`   - Purchase Codes: 8 (3 used, 4 unused, 1 expired)`);
  console.log(`   - Purchases: 3 (1 course, 2 videos)\n`);
  console.log('🔐 Login credentials:');
  console.log('   Admin: admin@graket.com / password123');
  console.log('   User 1 (Ahmed): ahmed.mohamed@example.com / password123');
  console.log('     → Purchased: Web Development Course (full course)');
  console.log('   User 2 (Fatima): fatima.ali@example.com / password123');
  console.log('     → Purchased: 2 individual videos (HTML Intro, HTML Tags)');
  console.log('   User 3 (Omar): omar.hassan@example.com / password123');
  console.log('     → No purchases yet\n');
  console.log('🎫 Available purchase codes:');
  console.log('   - DATASCI-PROMO-001 (Data Science Course - unused)');
  console.log('   - MOBILE-DEV-2026 (Mobile Development Course - unused)');
  console.log('   - VIDEO-CSS-INTRO-FREE (CSS Video - unused)');
  console.log('   - PROMO-MULTI-USE-10 (Web Dev Course - multi-use, 0/10 used)\n');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
