import { PrismaClient, ContentType, PurchaseType } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seeds 10 additional University / Year 4 courses, modelled on the
 * JavaScript Mastery course (see seed-js-mastery.ts).
 *
 * Each course gets 3 sections, 3 videos + 1 PDF per section, a quiz with
 * 2 questions in section 1, and 2 purchase codes (single-use + batch).
 *
 * Safe to re-run: courses are keyed by slug and skipped if they already
 * exist, and education targeting is re-applied to pre-existing rows.
 */

type QuestionSpec = {
  questionText: string;
  options: { text: string; isCorrect: boolean }[];
};

type SectionSpec = {
  title: string;
  videos: { title: string; duration: number; videoUrl: string }[];
  pdf: { title: string; pdfUrl: string; fileSize: number };
  quiz?: { title: string; timeLimit: number; questions: QuestionSpec[] };
};

type CourseSpec = {
  title: string;
  slug: string;
  description: string;
  thumbnail: string;
  categorySlug: string;
  instructorEmail: string;
  price: number;
  discountPrice?: number;
  codePrefix: string;
  sections: SectionSpec[];
};

// Real YouTube lecture URLs, reused across courses where topics overlap.
const COURSES: CourseSpec[] = [
  {
    title: 'TypeScript for Professional Developers',
    slug: 'typescript-professional-developers',
    description:
      'Master TypeScript from the type system up: generics, decorators, utility types, and strict-mode configuration. Learn to migrate large JavaScript codebases and build type-safe applications that scale across teams.',
    thumbnail: 'https://images.unsplash.com/photo-1687603921109-46401b201195',
    categorySlug: 'web-development',
    instructorEmail: 'ahlam.said@graket.com',
    price: 499.99,
    discountPrice: 329.99,
    codePrefix: 'TYPESCRIPT',
    sections: [
      {
        title: 'Section 1: TypeScript Foundations',
        videos: [
          { title: 'Lecture 1: TypeScript Full Course for Beginners', duration: 85, videoUrl: 'https://www.youtube.com/watch?v=SpwzRDUQ1GI' },
          { title: 'Lecture 2: Types, Interfaces and Type Aliases', duration: 52, videoUrl: 'https://www.youtube.com/watch?v=d56mG7DezGs' },
          { title: 'Lecture 3: Union, Intersection and Literal Types', duration: 44, videoUrl: 'https://www.youtube.com/watch?v=nViEqpgwxHE' },
        ],
        pdf: { title: 'TypeScript Type System Cheat Sheet', pdfUrl: 'https://example.com/pdfs/typescript-types-cheatsheet.pdf', fileSize: 1740800 },
        quiz: {
          title: 'TypeScript Foundations Quiz',
          timeLimit: 20,
          questions: [
            {
              questionText: 'Which TypeScript type accepts any value but preserves type safety at usage sites?',
              options: [
                { text: 'any', isCorrect: false },
                { text: 'unknown', isCorrect: true },
                { text: 'never', isCorrect: false },
                { text: 'void', isCorrect: false },
              ],
            },
            {
              questionText: 'What does the "readonly" modifier do on a property?',
              options: [
                { text: 'Prevents reassignment after initialisation', isCorrect: true },
                { text: 'Makes the property optional', isCorrect: false },
                { text: 'Hides the property from JSON output', isCorrect: false },
                { text: 'Freezes the entire object at runtime', isCorrect: false },
              ],
            },
          ],
        },
      },
      {
        title: 'Section 2: Generics and Advanced Types',
        videos: [
          { title: 'Lecture 1: TypeScript Generics Explained', duration: 58, videoUrl: 'https://www.youtube.com/watch?v=nViEqpgwxHE' },
          { title: 'Lecture 2: Utility Types — Partial, Pick, Omit', duration: 46, videoUrl: 'https://www.youtube.com/watch?v=EU0TB_8KHpY' },
          { title: 'Lecture 3: Conditional and Mapped Types', duration: 50, videoUrl: 'https://www.youtube.com/watch?v=SpwzRDUQ1GI' },
        ],
        pdf: { title: 'Generics and Utility Types Reference', pdfUrl: 'https://example.com/pdfs/typescript-generics-reference.pdf', fileSize: 2048000 },
      },
      {
        title: 'Section 3: TypeScript in Production',
        videos: [
          { title: 'Lecture 1: Configuring tsconfig for Strict Mode', duration: 40, videoUrl: 'https://www.youtube.com/watch?v=d56mG7DezGs' },
          { title: 'Lecture 2: Migrating a JavaScript Codebase', duration: 62, videoUrl: 'https://www.youtube.com/watch?v=EU0TB_8KHpY' },
          { title: 'Lecture 3: Testing TypeScript Applications', duration: 55, videoUrl: 'https://www.youtube.com/watch?v=SpwzRDUQ1GI' },
        ],
        pdf: { title: 'Production TypeScript Checklist', pdfUrl: 'https://example.com/pdfs/typescript-production-checklist.pdf', fileSize: 1536000 },
      },
    ],
  },
  {
    title: 'Advanced React Patterns and Performance',
    slug: 'advanced-react-patterns-performance',
    description:
      'Go beyond the basics of React: compound components, render props, custom hooks, memoisation strategies, and profiling. Learn how to diagnose re-render problems and architect component libraries used by large teams.',
    thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee',
    categorySlug: 'web-development',
    instructorEmail: 'ahlam.said@graket.com',
    price: 549.99,
    discountPrice: 379.99,
    codePrefix: 'REACTADV',
    sections: [
      {
        title: 'Section 1: Advanced Component Patterns',
        videos: [
          { title: 'Lecture 1: Compound Components Pattern', duration: 55, videoUrl: 'https://www.youtube.com/watch?v=RVFAyFWO4go' },
          { title: 'Lecture 2: Custom Hooks in Depth', duration: 60, videoUrl: 'https://www.youtube.com/watch?v=O6P86uwfdR0' },
          { title: 'Lecture 3: Render Props and Higher-Order Components', duration: 48, videoUrl: 'https://www.youtube.com/watch?v=35lXWvCuM8o' },
        ],
        pdf: { title: 'React Patterns Reference Guide', pdfUrl: 'https://example.com/pdfs/react-patterns-guide.pdf', fileSize: 2252800 },
        quiz: {
          title: 'Advanced React Patterns Quiz',
          timeLimit: 20,
          questions: [
            {
              questionText: 'Which hook memoises an expensive computed value between renders?',
              options: [
                { text: 'useCallback', isCorrect: false },
                { text: 'useMemo', isCorrect: true },
                { text: 'useRef', isCorrect: false },
                { text: 'useLayoutEffect', isCorrect: false },
              ],
            },
            {
              questionText: 'What problem does React.memo primarily solve?',
              options: [
                { text: 'Unnecessary re-renders of a component when props are unchanged', isCorrect: true },
                { text: 'Memory leaks from uncleaned effects', isCorrect: false },
                { text: 'Slow initial bundle download', isCorrect: false },
                { text: 'Prop drilling through deep trees', isCorrect: false },
              ],
            },
          ],
        },
      },
      {
        title: 'Section 2: State Management at Scale',
        videos: [
          { title: 'Lecture 1: Context API vs External Stores', duration: 52, videoUrl: 'https://www.youtube.com/watch?v=35lXWvCuM8o' },
          { title: 'Lecture 2: useReducer for Complex State', duration: 47, videoUrl: 'https://www.youtube.com/watch?v=O6P86uwfdR0' },
          { title: 'Lecture 3: Server State and Data Fetching', duration: 58, videoUrl: 'https://www.youtube.com/watch?v=RVFAyFWO4go' },
        ],
        pdf: { title: 'State Management Decision Matrix', pdfUrl: 'https://example.com/pdfs/react-state-management.pdf', fileSize: 1843200 },
      },
      {
        title: 'Section 3: Performance and Profiling',
        videos: [
          { title: 'Lecture 1: React DevTools Profiler Deep Dive', duration: 50, videoUrl: 'https://www.youtube.com/watch?v=RVFAyFWO4go' },
          { title: 'Lecture 2: Code Splitting and Lazy Loading', duration: 44, videoUrl: 'https://www.youtube.com/watch?v=35lXWvCuM8o' },
          { title: 'Lecture 3: Virtualising Long Lists', duration: 42, videoUrl: 'https://www.youtube.com/watch?v=O6P86uwfdR0' },
        ],
        pdf: { title: 'React Performance Optimisation Checklist', pdfUrl: 'https://example.com/pdfs/react-performance-checklist.pdf', fileSize: 1638400 },
      },
    ],
  },
  {
    title: 'Node.js Backend Architecture',
    slug: 'nodejs-backend-architecture',
    description:
      'Design production-grade Node.js services: layered architecture, dependency injection, authentication, background jobs, caching, and observability. Includes patterns for structuring codebases that stay maintainable as they grow.',
    thumbnail: 'https://images.unsplash.com/photo-1618477388954-7852f32655ec',
    categorySlug: 'web-development',
    instructorEmail: 'khaled.ibrahim@graket.com',
    price: 579.99,
    discountPrice: 399.99,
    codePrefix: 'NODEARCH',
    sections: [
      {
        title: 'Section 1: Node.js Core and Async Patterns',
        videos: [
          { title: 'Lecture 1: Node.js Crash Course', duration: 75, videoUrl: 'https://www.youtube.com/watch?v=fBNz5xF-Kx4' },
          { title: 'Lecture 2: The Event Loop Explained', duration: 48, videoUrl: 'https://www.youtube.com/watch?v=8aGhZQkoFbQ' },
          { title: 'Lecture 3: Streams and Buffers', duration: 54, videoUrl: 'https://www.youtube.com/watch?v=l8WPWK9mS5M' },
        ],
        pdf: { title: 'Node.js Async Patterns Reference', pdfUrl: 'https://example.com/pdfs/nodejs-async-patterns.pdf', fileSize: 2048000 },
        quiz: {
          title: 'Node.js Core Quiz',
          timeLimit: 20,
          questions: [
            {
              questionText: 'Node.js executes JavaScript on how many threads by default?',
              options: [
                { text: 'One thread, with a thread pool for I/O', isCorrect: true },
                { text: 'One thread per incoming request', isCorrect: false },
                { text: 'One thread per CPU core automatically', isCorrect: false },
                { text: 'Two threads — read and write', isCorrect: false },
              ],
            },
            {
              questionText: 'Which module is used to spawn worker threads for CPU-bound work?',
              options: [
                { text: 'cluster', isCorrect: false },
                { text: 'worker_threads', isCorrect: true },
                { text: 'child_env', isCorrect: false },
                { text: 'async_hooks', isCorrect: false },
              ],
            },
          ],
        },
      },
      {
        title: 'Section 2: Building Robust APIs',
        videos: [
          { title: 'Lecture 1: Express.js REST API Tutorial', duration: 65, videoUrl: 'https://www.youtube.com/watch?v=l8WPWK9mS5M' },
          { title: 'Lecture 2: Authentication with JWT', duration: 58, videoUrl: 'https://www.youtube.com/watch?v=mbsmsi7l3r4' },
          { title: 'Lecture 3: Validation and Error Handling', duration: 45, videoUrl: 'https://www.youtube.com/watch?v=fBNz5xF-Kx4' },
        ],
        pdf: { title: 'REST API Design Guidelines', pdfUrl: 'https://example.com/pdfs/rest-api-guidelines.pdf', fileSize: 1945600 },
      },
      {
        title: 'Section 3: Scaling and Observability',
        videos: [
          { title: 'Lecture 1: Caching with Redis', duration: 50, videoUrl: 'https://www.youtube.com/watch?v=jgpVdJB2sKQ' },
          { title: 'Lecture 2: Background Jobs and Queues', duration: 52, videoUrl: 'https://www.youtube.com/watch?v=l8WPWK9mS5M' },
          { title: 'Lecture 3: Logging, Metrics and Tracing', duration: 47, videoUrl: 'https://www.youtube.com/watch?v=fBNz5xF-Kx4' },
        ],
        pdf: { title: 'Production Readiness Checklist', pdfUrl: 'https://example.com/pdfs/nodejs-production-checklist.pdf', fileSize: 1740800 },
      },
    ],
  },
  {
    title: 'Database Design and SQL Optimisation',
    slug: 'database-design-sql-optimisation',
    description:
      'Model relational data properly and make it fast. Covers normalisation, indexing strategy, query planning, transactions and isolation levels, and diagnosing slow queries with EXPLAIN on real workloads.',
    thumbnail: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d',
    categorySlug: 'data-science',
    instructorEmail: 'khaled.ibrahim@graket.com',
    price: 529.99,
    discountPrice: 359.99,
    codePrefix: 'DBDESIGN',
    sections: [
      {
        title: 'Section 1: Relational Modelling',
        videos: [
          { title: 'Lecture 1: SQL Full Course for Beginners', duration: 90, videoUrl: 'https://www.youtube.com/watch?v=HXV3zeQKqGY' },
          { title: 'Lecture 2: Normalisation to Third Normal Form', duration: 55, videoUrl: 'https://www.youtube.com/watch?v=GFQaEYEc8_8' },
          { title: 'Lecture 3: Keys, Constraints and Relationships', duration: 48, videoUrl: 'https://www.youtube.com/watch?v=ztHopE5Wnpc' },
        ],
        pdf: { title: 'Database Normalisation Guide', pdfUrl: 'https://example.com/pdfs/database-normalisation.pdf', fileSize: 2150400 },
        quiz: {
          title: 'Relational Modelling Quiz',
          timeLimit: 20,
          questions: [
            {
              questionText: 'Which normal form eliminates transitive dependencies on the primary key?',
              options: [
                { text: 'First Normal Form', isCorrect: false },
                { text: 'Second Normal Form', isCorrect: false },
                { text: 'Third Normal Form', isCorrect: true },
                { text: 'Boyce-Codd Normal Form', isCorrect: false },
              ],
            },
            {
              questionText: 'What does a FOREIGN KEY constraint enforce?',
              options: [
                { text: 'That referenced rows exist in the parent table', isCorrect: true },
                { text: 'That all values in the column are unique', isCorrect: false },
                { text: 'That the column can never be null', isCorrect: false },
                { text: 'That the table is automatically indexed', isCorrect: false },
              ],
            },
          ],
        },
      },
      {
        title: 'Section 2: Query Performance',
        videos: [
          { title: 'Lecture 1: Indexing Strategies Explained', duration: 58, videoUrl: 'https://www.youtube.com/watch?v=HubezKbFL7E' },
          { title: 'Lecture 2: Reading Query Plans with EXPLAIN', duration: 52, videoUrl: 'https://www.youtube.com/watch?v=ztHopE5Wnpc' },
          { title: 'Lecture 3: Joins, Subqueries and CTEs', duration: 60, videoUrl: 'https://www.youtube.com/watch?v=HXV3zeQKqGY' },
        ],
        pdf: { title: 'SQL Query Optimisation Handbook', pdfUrl: 'https://example.com/pdfs/sql-optimisation-handbook.pdf', fileSize: 2560000 },
      },
      {
        title: 'Section 3: Transactions and Reliability',
        videos: [
          { title: 'Lecture 1: ACID and Isolation Levels', duration: 50, videoUrl: 'https://www.youtube.com/watch?v=GFQaEYEc8_8' },
          { title: 'Lecture 2: Deadlocks and Locking Behaviour', duration: 45, videoUrl: 'https://www.youtube.com/watch?v=HubezKbFL7E' },
          { title: 'Lecture 3: Backups, Replication and Recovery', duration: 48, videoUrl: 'https://www.youtube.com/watch?v=ztHopE5Wnpc' },
        ],
        pdf: { title: 'Transaction Isolation Reference', pdfUrl: 'https://example.com/pdfs/transaction-isolation.pdf', fileSize: 1638400 },
      },
    ],
  },
  {
    title: 'DevOps and CI/CD with Docker',
    slug: 'devops-cicd-docker',
    description:
      'Ship software reliably: containerise applications with Docker, orchestrate multi-service stacks, and build automated pipelines that test and deploy on every commit. Includes secrets handling and rollback strategy.',
    thumbnail: 'https://images.unsplash.com/photo-1605745341112-85968b19335b',
    categorySlug: 'web-development',
    instructorEmail: 'mohamed.farouk@graket.com',
    price: 599.99,
    discountPrice: 419.99,
    codePrefix: 'DEVOPS',
    sections: [
      {
        title: 'Section 1: Docker Fundamentals',
        videos: [
          { title: 'Lecture 1: Docker Tutorial for Beginners', duration: 80, videoUrl: 'https://www.youtube.com/watch?v=pTFZFxd4hOI' },
          { title: 'Lecture 2: Writing Efficient Dockerfiles', duration: 50, videoUrl: 'https://www.youtube.com/watch?v=3c-iBn73dDE' },
          { title: 'Lecture 3: Volumes, Networks and Compose', duration: 55, videoUrl: 'https://www.youtube.com/watch?v=HG6yIjZapSA' },
        ],
        pdf: { title: 'Docker Command Reference', pdfUrl: 'https://example.com/pdfs/docker-command-reference.pdf', fileSize: 1843200 },
        quiz: {
          title: 'Docker Fundamentals Quiz',
          timeLimit: 20,
          questions: [
            {
              questionText: 'What is the main advantage of a multi-stage Docker build?',
              options: [
                { text: 'Smaller final images by discarding build-time dependencies', isCorrect: true },
                { text: 'Running multiple containers from one Dockerfile', isCorrect: false },
                { text: 'Automatic horizontal scaling', isCorrect: false },
                { text: 'Built-in secret encryption', isCorrect: false },
              ],
            },
            {
              questionText: 'Which Docker feature persists data beyond a container’s lifetime?',
              options: [
                { text: 'Layer cache', isCorrect: false },
                { text: 'Named volume', isCorrect: true },
                { text: 'Bridge network', isCorrect: false },
                { text: 'Entrypoint script', isCorrect: false },
              ],
            },
          ],
        },
      },
      {
        title: 'Section 2: Continuous Integration',
        videos: [
          { title: 'Lecture 1: CI/CD Pipeline Concepts', duration: 52, videoUrl: 'https://www.youtube.com/watch?v=scEDHsr3APg' },
          { title: 'Lecture 2: Automated Testing in Pipelines', duration: 48, videoUrl: 'https://www.youtube.com/watch?v=R8_veQiYBjI' },
          { title: 'Lecture 3: Building and Publishing Images', duration: 45, videoUrl: 'https://www.youtube.com/watch?v=pTFZFxd4hOI' },
        ],
        pdf: { title: 'CI/CD Pipeline Blueprint', pdfUrl: 'https://example.com/pdfs/cicd-pipeline-blueprint.pdf', fileSize: 2048000 },
      },
      {
        title: 'Section 3: Deployment and Operations',
        videos: [
          { title: 'Lecture 1: Deployment Strategies — Blue/Green and Canary', duration: 50, videoUrl: 'https://www.youtube.com/watch?v=HG6yIjZapSA' },
          { title: 'Lecture 2: Managing Secrets and Configuration', duration: 42, videoUrl: 'https://www.youtube.com/watch?v=3c-iBn73dDE' },
          { title: 'Lecture 3: Monitoring and Incident Response', duration: 47, videoUrl: 'https://www.youtube.com/watch?v=scEDHsr3APg' },
        ],
        pdf: { title: 'Deployment Runbook Template', pdfUrl: 'https://example.com/pdfs/deployment-runbook.pdf', fileSize: 1536000 },
      },
    ],
  },
  {
    title: 'Machine Learning with Python',
    slug: 'machine-learning-python',
    description:
      'Build and evaluate machine learning models end to end: data preparation, feature engineering, supervised and unsupervised algorithms, and honest model evaluation. Practical work in scikit-learn and pandas.',
    thumbnail: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c',
    categorySlug: 'data-science',
    instructorEmail: 'sarah.ahmed@graket.com',
    price: 649.99,
    discountPrice: 449.99,
    codePrefix: 'MLPYTHON',
    sections: [
      {
        title: 'Section 1: Foundations and Data Preparation',
        videos: [
          { title: 'Lecture 1: Machine Learning Full Course', duration: 95, videoUrl: 'https://www.youtube.com/watch?v=7eh4d6sabA0' },
          { title: 'Lecture 2: Data Cleaning with pandas', duration: 60, videoUrl: 'https://www.youtube.com/watch?v=vmEHCJofslg' },
          { title: 'Lecture 3: Feature Engineering Techniques', duration: 55, videoUrl: 'https://www.youtube.com/watch?v=GduT2ZCc26E' },
        ],
        pdf: { title: 'Data Preparation Workflow Guide', pdfUrl: 'https://example.com/pdfs/ml-data-preparation.pdf', fileSize: 2355200 },
        quiz: {
          title: 'ML Foundations Quiz',
          timeLimit: 20,
          questions: [
            {
              questionText: 'Why is a dataset split into training and test sets?',
              options: [
                { text: 'To estimate performance on data the model has not seen', isCorrect: true },
                { text: 'To reduce the size of the training data', isCorrect: false },
                { text: 'To remove outliers automatically', isCorrect: false },
                { text: 'To speed up feature scaling', isCorrect: false },
              ],
            },
            {
              questionText: 'What characterises an overfitted model?',
              options: [
                { text: 'High training accuracy but poor test accuracy', isCorrect: true },
                { text: 'Poor accuracy on both training and test data', isCorrect: false },
                { text: 'Identical accuracy on training and test data', isCorrect: false },
                { text: 'It always predicts the majority class', isCorrect: false },
              ],
            },
          ],
        },
      },
      {
        title: 'Section 2: Supervised Learning',
        videos: [
          { title: 'Lecture 1: Linear and Logistic Regression', duration: 62, videoUrl: 'https://www.youtube.com/watch?v=7ArmBVF2dCs' },
          { title: 'Lecture 2: Decision Trees and Random Forests', duration: 58, videoUrl: 'https://www.youtube.com/watch?v=GduT2ZCc26E' },
          { title: 'Lecture 3: Model Evaluation Metrics', duration: 50, videoUrl: 'https://www.youtube.com/watch?v=7eh4d6sabA0' },
        ],
        pdf: { title: 'Supervised Algorithms Comparison Chart', pdfUrl: 'https://example.com/pdfs/ml-supervised-comparison.pdf', fileSize: 2560000 },
      },
      {
        title: 'Section 3: Unsupervised Learning and Deployment',
        videos: [
          { title: 'Lecture 1: Clustering with K-Means', duration: 48, videoUrl: 'https://www.youtube.com/watch?v=vmEHCJofslg' },
          { title: 'Lecture 2: Dimensionality Reduction with PCA', duration: 45, videoUrl: 'https://www.youtube.com/watch?v=7ArmBVF2dCs' },
          { title: 'Lecture 3: Serving Models in Production', duration: 52, videoUrl: 'https://www.youtube.com/watch?v=GduT2ZCc26E' },
        ],
        pdf: { title: 'Model Deployment Checklist', pdfUrl: 'https://example.com/pdfs/ml-deployment-checklist.pdf', fileSize: 1740800 },
      },
    ],
  },
  {
    title: 'Flutter Mobile Development',
    slug: 'flutter-mobile-development',
    description:
      'Build cross-platform mobile applications with Flutter and Dart. Covers widget composition, navigation, state management, REST integration, local persistence, and publishing to the app stores.',
    thumbnail: 'https://images.unsplash.com/photo-1607252650355-f7fd0460ccdb',
    categorySlug: 'mobile-development',
    instructorEmail: 'mohamed.farouk@graket.com',
    price: 559.99,
    discountPrice: 389.99,
    codePrefix: 'FLUTTER',
    sections: [
      {
        title: 'Section 1: Dart and Flutter Basics',
        videos: [
          { title: 'Lecture 1: Flutter Course for Beginners', duration: 95, videoUrl: 'https://www.youtube.com/watch?v=VPvVD8t02U8' },
          { title: 'Lecture 2: Dart Language Essentials', duration: 58, videoUrl: 'https://www.youtube.com/watch?v=Ej_Pcr4uC2Q' },
          { title: 'Lecture 3: Widgets, Layouts and Styling', duration: 62, videoUrl: 'https://www.youtube.com/watch?v=1gDhl4leEzA' },
        ],
        pdf: { title: 'Flutter Widget Catalogue', pdfUrl: 'https://example.com/pdfs/flutter-widget-catalogue.pdf', fileSize: 2662400 },
        quiz: {
          title: 'Flutter Basics Quiz',
          timeLimit: 20,
          questions: [
            {
              questionText: 'What is the difference between StatelessWidget and StatefulWidget?',
              options: [
                { text: 'StatefulWidget can rebuild itself when its internal state changes', isCorrect: true },
                { text: 'StatelessWidget cannot render text', isCorrect: false },
                { text: 'StatefulWidget renders only once', isCorrect: false },
                { text: 'They are functionally identical', isCorrect: false },
              ],
            },
            {
              questionText: 'Which method triggers a rebuild of a StatefulWidget?',
              options: [
                { text: 'rebuild()', isCorrect: false },
                { text: 'setState()', isCorrect: true },
                { text: 'refresh()', isCorrect: false },
                { text: 'notify()', isCorrect: false },
              ],
            },
          ],
        },
      },
      {
        title: 'Section 2: State Management and Navigation',
        videos: [
          { title: 'Lecture 1: Navigation and Routing', duration: 50, videoUrl: 'https://www.youtube.com/watch?v=1gDhl4leEzA' },
          { title: 'Lecture 2: State Management with Provider', duration: 55, videoUrl: 'https://www.youtube.com/watch?v=Ej_Pcr4uC2Q' },
          { title: 'Lecture 3: Forms and Input Validation', duration: 46, videoUrl: 'https://www.youtube.com/watch?v=VPvVD8t02U8' },
        ],
        pdf: { title: 'Flutter State Management Guide', pdfUrl: 'https://example.com/pdfs/flutter-state-management.pdf', fileSize: 2048000 },
      },
      {
        title: 'Section 3: Data, Storage and Release',
        videos: [
          { title: 'Lecture 1: Consuming REST APIs in Flutter', duration: 54, videoUrl: 'https://www.youtube.com/watch?v=Ej_Pcr4uC2Q' },
          { title: 'Lecture 2: Local Storage and Caching', duration: 48, videoUrl: 'https://www.youtube.com/watch?v=1gDhl4leEzA' },
          { title: 'Lecture 3: Building and Publishing Your App', duration: 50, videoUrl: 'https://www.youtube.com/watch?v=VPvVD8t02U8' },
        ],
        pdf: { title: 'App Store Release Checklist', pdfUrl: 'https://example.com/pdfs/flutter-release-checklist.pdf', fileSize: 1638400 },
      },
    ],
  },
  {
    title: 'Cybersecurity Essentials for Developers',
    slug: 'cybersecurity-essentials-developers',
    description:
      'Write software that resists attack. Covers the OWASP Top 10, secure authentication and session handling, cryptography fundamentals, dependency risk, and practical threat modelling for web applications.',
    thumbnail: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b',
    categorySlug: 'web-development',
    instructorEmail: 'khaled.ibrahim@graket.com',
    price: 619.99,
    discountPrice: 429.99,
    codePrefix: 'SECURITY',
    sections: [
      {
        title: 'Section 1: Web Application Threats',
        videos: [
          { title: 'Lecture 1: Cybersecurity Full Course', duration: 88, videoUrl: 'https://www.youtube.com/watch?v=hXSFdwIOfnE' },
          { title: 'Lecture 2: The OWASP Top 10 Explained', duration: 60, videoUrl: 'https://www.youtube.com/watch?v=rWHvp7rUka8' },
          { title: 'Lecture 3: SQL Injection and XSS in Practice', duration: 55, videoUrl: 'https://www.youtube.com/watch?v=2eqNvsE_kZ4' },
        ],
        pdf: { title: 'OWASP Top 10 Field Guide', pdfUrl: 'https://example.com/pdfs/owasp-top-10-guide.pdf', fileSize: 2355200 },
        quiz: {
          title: 'Web Security Quiz',
          timeLimit: 20,
          questions: [
            {
              questionText: 'What is the most reliable defence against SQL injection?',
              options: [
                { text: 'Parameterised queries / prepared statements', isCorrect: true },
                { text: 'Hiding database error messages', isCorrect: false },
                { text: 'Escaping output in the browser', isCorrect: false },
                { text: 'Rate limiting the endpoint', isCorrect: false },
              ],
            },
            {
              questionText: 'Why should passwords be stored using a slow hash such as bcrypt?',
              options: [
                { text: 'It makes large-scale brute-force cracking impractical', isCorrect: true },
                { text: 'It allows the original password to be recovered', isCorrect: false },
                { text: 'It compresses the password for storage', isCorrect: false },
                { text: 'It encrypts the password reversibly', isCorrect: false },
              ],
            },
          ],
        },
      },
      {
        title: 'Section 2: Authentication and Cryptography',
        videos: [
          { title: 'Lecture 1: Secure Authentication and Sessions', duration: 56, videoUrl: 'https://www.youtube.com/watch?v=mbsmsi7l3r4' },
          { title: 'Lecture 2: Hashing, Encryption and TLS', duration: 52, videoUrl: 'https://www.youtube.com/watch?v=rWHvp7rUka8' },
          { title: 'Lecture 3: Managing Secrets Safely', duration: 44, videoUrl: 'https://www.youtube.com/watch?v=hXSFdwIOfnE' },
        ],
        pdf: { title: 'Applied Cryptography Primer', pdfUrl: 'https://example.com/pdfs/applied-cryptography-primer.pdf', fileSize: 2150400 },
      },
      {
        title: 'Section 3: Secure Development Lifecycle',
        videos: [
          { title: 'Lecture 1: Threat Modelling Fundamentals', duration: 50, videoUrl: 'https://www.youtube.com/watch?v=2eqNvsE_kZ4' },
          { title: 'Lecture 2: Dependency and Supply Chain Risk', duration: 46, videoUrl: 'https://www.youtube.com/watch?v=hXSFdwIOfnE' },
          { title: 'Lecture 3: Security Testing and Code Review', duration: 48, videoUrl: 'https://www.youtube.com/watch?v=rWHvp7rUka8' },
        ],
        pdf: { title: 'Secure Code Review Checklist', pdfUrl: 'https://example.com/pdfs/secure-code-review-checklist.pdf', fileSize: 1740800 },
      },
    ],
  },
  {
    title: 'UI/UX Design Systems in Figma',
    slug: 'uiux-design-systems-figma',
    description:
      'Design at scale with reusable systems: typography and colour tokens, component libraries with variants, auto-layout, prototyping, and handoff to engineering teams. Build a complete design system from scratch.',
    thumbnail: 'https://images.unsplash.com/photo-1561070791-2526d30994b5',
    categorySlug: 'design',
    instructorEmail: 'sarah.ahmed@graket.com',
    price: 479.99,
    discountPrice: 319.99,
    codePrefix: 'DESIGNSYS',
    sections: [
      {
        title: 'Section 1: Design Foundations',
        videos: [
          { title: 'Lecture 1: Figma Tutorial for Beginners', duration: 78, videoUrl: 'https://www.youtube.com/watch?v=FTFaQWZBqQ8' },
          { title: 'Lecture 2: Typography and Colour Theory', duration: 52, videoUrl: 'https://www.youtube.com/watch?v=_KJ8_s5nWEA' },
          { title: 'Lecture 3: Layout, Spacing and Visual Hierarchy', duration: 48, videoUrl: 'https://www.youtube.com/watch?v=c9Wg6Cb_YlU' },
        ],
        pdf: { title: 'Design Principles Handbook', pdfUrl: 'https://example.com/pdfs/design-principles-handbook.pdf', fileSize: 2662400 },
        quiz: {
          title: 'Design Foundations Quiz',
          timeLimit: 20,
          questions: [
            {
              questionText: 'What is the primary purpose of a design system?',
              options: [
                { text: 'Consistent, reusable design decisions across products', isCorrect: true },
                { text: 'Making files render faster in the browser', isCorrect: false },
                { text: 'Replacing the need for user research', isCorrect: false },
                { text: 'Automatically generating production code', isCorrect: false },
              ],
            },
            {
              questionText: 'In Figma, what does Auto Layout provide?',
              options: [
                { text: 'Frames that resize and reflow as content changes', isCorrect: true },
                { text: 'Automatic colour palette generation', isCorrect: false },
                { text: 'Version control for design files', isCorrect: false },
                { text: 'Conversion of designs into Flutter code', isCorrect: false },
              ],
            },
          ],
        },
      },
      {
        title: 'Section 2: Components and Tokens',
        videos: [
          { title: 'Lecture 1: Components, Variants and Properties', duration: 58, videoUrl: 'https://www.youtube.com/watch?v=c9Wg6Cb_YlU' },
          { title: 'Lecture 2: Design Tokens and Styles', duration: 50, videoUrl: 'https://www.youtube.com/watch?v=_KJ8_s5nWEA' },
          { title: 'Lecture 3: Building a Component Library', duration: 62, videoUrl: 'https://www.youtube.com/watch?v=FTFaQWZBqQ8' },
        ],
        pdf: { title: 'Component Library Structure Guide', pdfUrl: 'https://example.com/pdfs/component-library-guide.pdf', fileSize: 2252800 },
      },
      {
        title: 'Section 3: Prototyping and Handoff',
        videos: [
          { title: 'Lecture 1: Interactive Prototyping', duration: 52, videoUrl: 'https://www.youtube.com/watch?v=FTFaQWZBqQ8' },
          { title: 'Lecture 2: Usability Testing Basics', duration: 45, videoUrl: 'https://www.youtube.com/watch?v=c9Wg6Cb_YlU' },
          { title: 'Lecture 3: Developer Handoff and Documentation', duration: 44, videoUrl: 'https://www.youtube.com/watch?v=_KJ8_s5nWEA' },
        ],
        pdf: { title: 'Design Handoff Checklist', pdfUrl: 'https://example.com/pdfs/design-handoff-checklist.pdf', fileSize: 1536000 },
      },
    ],
  },
  {
    title: 'Cloud Computing with AWS',
    slug: 'cloud-computing-aws',
    description:
      'Deploy and operate applications on AWS: core compute and storage services, networking and IAM, serverless architectures, infrastructure as code, and designing for cost efficiency and high availability.',
    thumbnail: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa',
    categorySlug: 'web-development',
    instructorEmail: 'mohamed.farouk@graket.com',
    price: 629.99,
    discountPrice: 439.99,
    codePrefix: 'AWSCLOUD',
    sections: [
      {
        title: 'Section 1: AWS Core Services',
        videos: [
          { title: 'Lecture 1: AWS Full Course for Beginners', duration: 92, videoUrl: 'https://www.youtube.com/watch?v=ulprqHHWlng' },
          { title: 'Lecture 2: EC2, S3 and Core Storage', duration: 60, videoUrl: 'https://www.youtube.com/watch?v=k1RI5locZE4' },
          { title: 'Lecture 3: IAM, Roles and Permissions', duration: 52, videoUrl: 'https://www.youtube.com/watch?v=SGgxAr9Ve_A' },
        ],
        pdf: { title: 'AWS Core Services Overview', pdfUrl: 'https://example.com/pdfs/aws-core-services.pdf', fileSize: 2457600 },
        quiz: {
          title: 'AWS Fundamentals Quiz',
          timeLimit: 20,
          questions: [
            {
              questionText: 'Which AWS service provides object storage?',
              options: [
                { text: 'S3', isCorrect: true },
                { text: 'EC2', isCorrect: false },
                { text: 'RDS', isCorrect: false },
                { text: 'Route 53', isCorrect: false },
              ],
            },
            {
              questionText: 'What is the purpose of an IAM role?',
              options: [
                { text: 'Granting temporary permissions to a service or user without long-lived keys', isCorrect: true },
                { text: 'Storing encrypted database backups', isCorrect: false },
                { text: 'Distributing traffic across instances', isCorrect: false },
                { text: 'Caching static assets at edge locations', isCorrect: false },
              ],
            },
          ],
        },
      },
      {
        title: 'Section 2: Serverless and Databases',
        videos: [
          { title: 'Lecture 1: Lambda and Serverless Architecture', duration: 58, videoUrl: 'https://www.youtube.com/watch?v=eOBq__h4OJ4' },
          { title: 'Lecture 2: API Gateway and Event-Driven Design', duration: 50, videoUrl: 'https://www.youtube.com/watch?v=k1RI5locZE4' },
          { title: 'Lecture 3: RDS, DynamoDB and Data Choices', duration: 55, videoUrl: 'https://www.youtube.com/watch?v=SGgxAr9Ve_A' },
        ],
        pdf: { title: 'Serverless Architecture Patterns', pdfUrl: 'https://example.com/pdfs/aws-serverless-patterns.pdf', fileSize: 2150400 },
      },
      {
        title: 'Section 3: Operations and Cost',
        videos: [
          { title: 'Lecture 1: Infrastructure as Code', duration: 54, videoUrl: 'https://www.youtube.com/watch?v=ulprqHHWlng' },
          { title: 'Lecture 2: Monitoring with CloudWatch', duration: 46, videoUrl: 'https://www.youtube.com/watch?v=eOBq__h4OJ4' },
          { title: 'Lecture 3: Cost Optimisation and Well-Architected Review', duration: 50, videoUrl: 'https://www.youtube.com/watch?v=k1RI5locZE4' },
        ],
        pdf: { title: 'AWS Cost Optimisation Guide', pdfUrl: 'https://example.com/pdfs/aws-cost-optimisation.pdf', fileSize: 1843200 },
      },
    ],
  },
];

async function main() {
  console.log('🌱 Adding 10 University / Year 4 courses...\n');

  const admin = await prisma.admin.findFirst();
  if (!admin) {
    throw new Error('No admin found. Run the main seed first or create an admin.');
  }

  // Education targeting: University → Year 4. Resolved by name rather than
  // hard-coded id so the script survives a database reset, which regenerates
  // every uuid.
  const universityLevel = await prisma.educationLevel.findUnique({
    where: { name: 'University' },
  });
  if (!universityLevel) {
    throw new Error('Education level "University" not found. Run the main seed first.');
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
    throw new Error('Grade "Year 4" not found under University. Run the main seed first.');
  }

  const fallbackInstructor = await prisma.instructor.findFirst();
  const fallbackCategory = await prisma.category.findFirst();
  if (!fallbackInstructor || !fallbackCategory) {
    throw new Error('No instructor/category found. Run the main seed first.');
  }

  let created = 0;
  let skipped = 0;

  for (const spec of COURSES) {
    const existing = await prisma.course.findUnique({ where: { slug: spec.slug } });

    if (existing) {
      console.log(`⚠️  ${spec.title} — already exists, skipping creation`);
      skipped++;

      // Re-apply education targeting so a course seeded earlier (or pointed at
      // a different year) does not silently keep the old assignment.
      if (
        existing.educationLevelId !== universityLevel.id ||
        existing.gradeId !== year4.id
      ) {
        await prisma.course.update({
          where: { id: existing.id },
          data: { educationLevelId: universityLevel.id, gradeId: year4.id },
        });
        console.log('   ✅ Updated education targeting → University / Year 4');
      }

      await ensureCodes(spec.codePrefix, existing.id, admin.id);
      continue;
    }

    const instructor =
      (await prisma.instructor.findFirst({ where: { email: spec.instructorEmail } })) ??
      fallbackInstructor;
    const category =
      (await prisma.category.findFirst({ where: { slug: spec.categorySlug } })) ??
      fallbackCategory;

    // Totals are derived from the spec so they always match the content
    // actually inserted below.
    const totalVideos = spec.sections.reduce((n, s) => n + s.videos.length, 0);
    const totalQuizzes = spec.sections.filter((s) => s.quiz).length;
    const totalDuration = spec.sections.reduce(
      (n, s) =>
        n +
        s.videos.reduce((m, v) => m + v.duration, 0) +
        (s.quiz ? s.quiz.timeLimit : 0),
      0,
    );

    const course = await prisma.course.create({
      data: {
        title: spec.title,
        slug: spec.slug,
        description: spec.description,
        thumbnail: spec.thumbnail,
        instructorId: instructor.id,
        categoryId: category.id,
        educationLevelId: universityLevel.id,
        gradeId: year4.id,
        price: spec.price,
        discountPrice: spec.discountPrice,
        totalDuration,
        totalVideos,
        totalQuizzes,
        isPublished: true,
      },
    });

    for (const [index, sectionSpec] of spec.sections.entries()) {
      const section = await prisma.section.create({
        data: {
          title: sectionSpec.title,
          order: index + 1,
          courseId: course.id,
        },
      });

      await prisma.content.createMany({
        data: sectionSpec.videos.map((v, i) => ({
          title: v.title,
          type: ContentType.VIDEO,
          order: i + 1,
          duration: v.duration,
          sectionId: section.id,
          videoUrl: v.videoUrl,
        })),
      });

      await prisma.content.create({
        data: {
          title: sectionSpec.pdf.title,
          type: ContentType.PDF,
          order: sectionSpec.videos.length + 1,
          sectionId: section.id,
          pdfUrl: sectionSpec.pdf.pdfUrl,
          fileSize: sectionSpec.pdf.fileSize,
        },
      });

      if (sectionSpec.quiz) {
        const quizContent = await prisma.content.create({
          data: {
            title: sectionSpec.quiz.title,
            type: ContentType.QUIZ,
            order: sectionSpec.videos.length + 2,
            duration: sectionSpec.quiz.timeLimit,
            sectionId: section.id,
          },
        });

        const quiz = await prisma.quiz.create({
          data: {
            contentId: quizContent.id,
            timeLimit: sectionSpec.quiz.timeLimit,
            passingScore: 70,
          },
        });

        for (const [qIndex, questionSpec] of sectionSpec.quiz.questions.entries()) {
          const question = await prisma.question.create({
            data: {
              quizId: quiz.id,
              questionText: questionSpec.questionText,
              order: qIndex + 1,
              points: 1,
            },
          });

          await prisma.option.createMany({
            data: questionSpec.options.map((o, oIndex) => ({
              questionId: question.id,
              text: o.text,
              isCorrect: o.isCorrect,
              order: oIndex + 1,
            })),
          });
        }
      }
    }

    console.log(`✅ ${spec.title}`);
    console.log(
      `   ${spec.sections.length} sections · ${totalVideos} videos · ${spec.sections.length} PDFs · ${totalQuizzes} quiz · ${totalDuration} min`,
    );
    created++;

    await ensureCodes(spec.codePrefix, course.id, admin.id);
  }

  console.log('\n🎉 Done!\n');
  console.log('📊 Summary:');
  console.log(`   - Courses created: ${created}`);
  console.log(`   - Courses skipped (already existed): ${skipped}`);
  console.log(`   - Targeting: ${universityLevel.name} / ${year4.name}`);

  const year4Total = await prisma.course.count({
    where: { educationLevelId: universityLevel.id, gradeId: year4.id },
  });
  console.log(`   - Total courses now in University / Year 4: ${year4Total}`);
}

async function ensureCodes(prefix: string, courseId: string, adminId: string) {
  const codes = [
    { code: `${prefix}-2026-001`, maxUses: 1 },
    { code: `${prefix}-BATCH-50`, maxUses: 50 },
  ];

  for (const c of codes) {
    const existing = await prisma.purchaseCode.findUnique({ where: { code: c.code } });
    if (existing) continue;

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
  }

  console.log(`   🎫 Codes: ${prefix}-2026-001 (single-use), ${prefix}-BATCH-50 (50 uses)`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
