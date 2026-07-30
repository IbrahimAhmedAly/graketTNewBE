import {
  PrismaClient,
  UserStatus,
  ContentType,
  EnrollmentStatus,
  PurchaseType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { seedBadges } from './seeds/badges.seed';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...\n');

  // Clear existing data (in correct order to avoid foreign key constraints)
  console.log('🗑️  Cleaning existing data...');
  // Activity tracking first — these reference users and contents.
  await prisma.studentBadge.deleteMany();
  await prisma.badge.deleteMany();
  await prisma.dailyActivity.deleteMany();
  await prisma.studySession.deleteMany();
  await prisma.contentView.deleteMany();
  await prisma.videoWatchProgress.deleteMany();
  await prisma.studentStats.deleteMany();
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
  await prisma.grade.deleteMany();
  await prisma.educationLevel.deleteMany();
  console.log('✅ Existing data cleaned\n');

  await seedBadges(prisma);

  // ============================================
  // 0. CREATE EDUCATION LEVELS AND GRADES
  // Students pick a level, then a grade within it. Courses target the same
  // pair, so the catalogue can be scoped to each student.
  // ============================================
  console.log('🎓 Creating education levels and grades...');

  const university = await prisma.educationLevel.create({
    data: {
      name: 'University',
      order: 1,
      grades: {
        create: [
          { name: 'Year 1', order: 1 },
          { name: 'Year 2', order: 2 },
          { name: 'Year 3', order: 3 },
          { name: 'Year 4', order: 4 },
        ],
      },
    },
    include: { grades: { orderBy: { order: 'asc' } } },
  });

  const middleSchool = await prisma.educationLevel.create({
    data: {
      name: 'Middle School',
      order: 2,
      grades: {
        create: [
          { name: 'Grade 7', order: 1 },
          { name: 'Grade 8', order: 2 },
          { name: 'Grade 9', order: 3 },
        ],
      },
    },
    include: { grades: { orderBy: { order: 'asc' } } },
  });

  const primarySchool = await prisma.educationLevel.create({
    data: {
      name: 'Primary School',
      order: 3,
      grades: {
        create: [
          { name: 'Grade 1', order: 1 },
          { name: 'Grade 2', order: 2 },
          { name: 'Grade 3', order: 3 },
          { name: 'Grade 4', order: 4 },
          { name: 'Grade 5', order: 5 },
          { name: 'Grade 6', order: 6 },
        ],
      },
    },
    include: { grades: { orderBy: { order: 'asc' } } },
  });

  console.log(
    `✅ Created 3 education levels with ${
      university.grades.length +
      middleSchool.grades.length +
      primarySchool.grades.length
    } grades\n`,
  );

  // Hash password for all users
  const hashedPassword = await bcrypt.hash('password123', 10);

  // ============================================
  // 1. CREATE ADMINS
  // ============================================
  console.log('👤 Creating admins...');
  const admin = await prisma.admin.create({
    data: {
      email: 'ibrahim.zagglol@gmail.com',
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
        educationLevelId: university.id,
        gradeId: university.grades[0].id, // University / Year 1
      },
    }),
    prisma.user.create({
      data: {
        email: 'fatima.ali@example.com',
        name: 'Fatima Ali',
        password: hashedPassword,
        serial: 'SN002',
        status: UserStatus.ACTIVE,
        educationLevelId: university.id,
        gradeId: university.grades[1].id, // University / Year 2
      },
    }),
    prisma.user.create({
      data: {
        email: 'omar.hassan@example.com',
        name: 'Omar Hassan',
        password: hashedPassword,
        serial: 'SN003',
        status: UserStatus.ACTIVE,
        educationLevelId: middleSchool.id,
        gradeId: middleSchool.grades[0].id, // Middle School / Grade 7
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
      educationLevelId: university.id,
      gradeId: university.grades[0].id, // University / Year 1
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
      educationLevelId: university.id,
      gradeId: university.grades[1].id, // University / Year 2
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
      educationLevelId: university.id,
      gradeId: null, // Whole-level course: open to every university year
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
      educationLevelId: middleSchool.id,
      gradeId: middleSchool.grades[0].id, // Middle School / Grade 7
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
      educationLevelId: primarySchool.id,
      gradeId: primarySchool.grades[0].id, // Primary School / Grade 1
      price: 399.99,
      totalDuration: 2700, // 45 hours
      totalVideos: 100,
      totalQuizzes: 7,
      isPublished: false, // Draft course
    },
  });

  // Course 6: JavaScript Mastery — Full Stack Development (YouTube videos)
  const jsMasteryCourse = await prisma.course.create({
    data: {
      title: 'JavaScript Mastery — Full Stack Development',
      slug: 'javascript-mastery-full-stack',
      description:
        'A comprehensive full-stack JavaScript course covering modern ES6+, React, Node.js, Express, and MongoDB. Build real-world projects from scratch and master both frontend and backend development. Ideal for developers who want to become job-ready full-stack engineers.',
      thumbnail: 'https://images.unsplash.com/photo-1627398242454-45a1465c2479',
      instructorId: instructors[0].id,
      categoryId: categories[0].id,
      educationLevelId: university.id,
      gradeId: university.grades[0].id, // University / Year 1
      price: 549.99,
      discountPrice: 349.99,
      totalDuration: 4800, // 80 hours
      totalVideos: 12,
      totalQuizzes: 2,
      isPublished: true,
    },
  });

  // Section 6.1: JavaScript Fundamentals
  const jsSection1 = await prisma.section.create({
    data: {
      title: 'Section 1: JavaScript Fundamentals',
      order: 1,
      courseId: jsMasteryCourse.id,
    },
  });

  await prisma.content.createMany({
    data: [
      {
        title: 'Lecture 1: JavaScript Crash Course for Beginners',
        type: ContentType.VIDEO,
        order: 1,
        duration: 60,
        sectionId: jsSection1.id,
        videoUrl: 'https://www.youtube.com/watch?v=hdI2bqOjy3c',
      },
      {
        title: 'Lecture 2: JavaScript DOM Manipulation',
        type: ContentType.VIDEO,
        order: 2,
        duration: 45,
        sectionId: jsSection1.id,
        videoUrl: 'https://www.youtube.com/watch?v=5fb2aPlgoys',
      },
      {
        title: 'Lecture 3: JavaScript ES6+ Features',
        type: ContentType.VIDEO,
        order: 3,
        duration: 50,
        sectionId: jsSection1.id,
        videoUrl: 'https://www.youtube.com/watch?v=NCwa_xi0Uuc',
      },
      {
        title: 'JavaScript ES6 Cheat Sheet',
        type: ContentType.PDF,
        order: 4,
        sectionId: jsSection1.id,
        pdfUrl: 'https://example.com/pdfs/js-es6-cheatsheet.pdf',
        fileSize: 1536000, // 1.5 MB
      },
    ],
  });

  // JS Fundamentals Quiz
  const jsQuizContent = await prisma.content.create({
    data: {
      title: 'JavaScript Fundamentals Quiz',
      type: ContentType.QUIZ,
      order: 5,
      duration: 20,
      sectionId: jsSection1.id,
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
      {
        questionId: jsQ2.id,
        text: 'Expands an iterable into individual elements',
        isCorrect: true,
        order: 1,
      },
      {
        questionId: jsQ2.id,
        text: 'Declares a rest parameter',
        isCorrect: false,
        order: 2,
      },
      {
        questionId: jsQ2.id,
        text: 'Multiplies array values',
        isCorrect: false,
        order: 3,
      },
      {
        questionId: jsQ2.id,
        text: 'Merges two functions',
        isCorrect: false,
        order: 4,
      },
    ],
  });

  // Section 6.2: React.js
  const jsSection2 = await prisma.section.create({
    data: {
      title: 'Section 2: React.js — Building Modern UIs',
      order: 2,
      courseId: jsMasteryCourse.id,
    },
  });

  await prisma.content.createMany({
    data: [
      {
        title: 'Lecture 1: React JS Full Course for Beginners',
        type: ContentType.VIDEO,
        order: 1,
        duration: 90,
        sectionId: jsSection2.id,
        videoUrl: 'https://www.youtube.com/watch?v=RVFAyFWO4go',
      },
      {
        title: 'Lecture 2: React Hooks — useState & useEffect',
        type: ContentType.VIDEO,
        order: 2,
        duration: 55,
        sectionId: jsSection2.id,
        videoUrl: 'https://www.youtube.com/watch?v=O6P86uwfdR0',
      },
      {
        title: 'Lecture 3: React Context API and State Management',
        type: ContentType.VIDEO,
        order: 3,
        duration: 48,
        sectionId: jsSection2.id,
        videoUrl: 'https://www.youtube.com/watch?v=35lXWvCuM8o',
      },
      {
        title: 'React Components Cheat Sheet',
        type: ContentType.PDF,
        order: 4,
        sectionId: jsSection2.id,
        pdfUrl: 'https://example.com/pdfs/react-components-cheatsheet.pdf',
        fileSize: 2048000, // 2 MB
      },
    ],
  });

  // React Quiz
  const reactQuizContent = await prisma.content.create({
    data: {
      title: 'React.js Quiz',
      type: ContentType.QUIZ,
      order: 5,
      duration: 20,
      sectionId: jsSection2.id,
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
      {
        questionId: reactQ2.id,
        text: 'A JavaScript library for styling',
        isCorrect: false,
        order: 1,
      },
      {
        questionId: reactQ2.id,
        text: 'A syntax extension that allows HTML-like code in JavaScript',
        isCorrect: true,
        order: 2,
      },
      {
        questionId: reactQ2.id,
        text: 'A package manager for React',
        isCorrect: false,
        order: 3,
      },
      {
        questionId: reactQ2.id,
        text: 'A database query language',
        isCorrect: false,
        order: 4,
      },
    ],
  });

  // Section 6.3: Node.js & Express
  const jsSection3 = await prisma.section.create({
    data: {
      title: 'Section 3: Node.js & Express — Backend Development',
      order: 3,
      courseId: jsMasteryCourse.id,
    },
  });

  await prisma.content.createMany({
    data: [
      {
        title: 'Lecture 1: Node.js Crash Course',
        type: ContentType.VIDEO,
        order: 1,
        duration: 75,
        sectionId: jsSection3.id,
        videoUrl: 'https://www.youtube.com/watch?v=fBNz5xF-Kx4',
      },
      {
        title: 'Lecture 2: Express.js REST API Tutorial',
        type: ContentType.VIDEO,
        order: 2,
        duration: 65,
        sectionId: jsSection3.id,
        videoUrl: 'https://www.youtube.com/watch?v=l8WPWK9mS5M',
      },
      {
        title: 'Lecture 3: MongoDB & Mongoose with Node.js',
        type: ContentType.VIDEO,
        order: 3,
        duration: 70,
        sectionId: jsSection3.id,
        videoUrl: 'https://www.youtube.com/watch?v=DZBGEVgL2eE',
      },
      {
        title: 'Node.js & Express API Reference',
        type: ContentType.PDF,
        order: 4,
        sectionId: jsSection3.id,
        pdfUrl: 'https://example.com/pdfs/nodejs-express-reference.pdf',
        fileSize: 2560000, // 2.5 MB
      },
    ],
  });

  console.log(`✅ Created 6 courses with sections and content\n`);

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

  // JavaScript Mastery course — single-use code
  await prisma.purchaseCode.create({
    data: {
      code: 'JSMASTERY-2026-001',
      type: PurchaseType.COURSE,
      courseId: jsMasteryCourse.id,
      isUsed: false,
      createdBy: admin.id,
      maxUses: 1,
      usedCount: 0,
      expiresAt: new Date('2026-12-31'),
    },
  });

  // JavaScript Mastery course — multi-use code (up to 50 students)
  await prisma.purchaseCode.create({
    data: {
      code: 'JSMASTERY-BATCH-50',
      type: PurchaseType.COURSE,
      courseId: jsMasteryCourse.id,
      isUsed: false,
      createdBy: admin.id,
      maxUses: 50,
      usedCount: 0,
      expiresAt: new Date('2026-12-31'),
    },
  });

  console.log('✅ Created 10 purchase codes\n');

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
  console.log(`   - Courses: 6 (5 published, 1 draft)`);
  console.log(`   - Sections: Multiple per course`);
  console.log(`   - Content: Videos (incl. YouTube), PDFs, and Quizzes`);
  console.log(`   - Enrollments: ${enrollments.length}`);
  console.log(`   - Reviews: 4`);
  console.log(`   - Purchase Codes: 10 (3 used, 6 unused, 1 expired)`);
  console.log(`   - Purchases: 3 (1 course, 2 videos)\n`);
  console.log('🔐 Login credentials:');
  console.log('   Admin: ibrahim.zagglol@gmail.com / password123');
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
  console.log('   - PROMO-MULTI-USE-10 (Web Dev Course - multi-use, 0/10 used)');
  console.log('   - JSMASTERY-2026-001 (JS Mastery Course - single-use)');
  console.log('   - JSMASTERY-BATCH-50 (JS Mastery Course - multi-use, 0/50 used)\n');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
