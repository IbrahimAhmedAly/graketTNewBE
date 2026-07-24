import { PrismaClient, LegalDocumentType } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seeds the Privacy Policy and Terms & Conditions documents.
 *
 * Idempotent: uses upsert keyed on `type`, so it can be re-run safely and
 * will not delete or duplicate anything. The bodies are stored as HTML —
 * the same format the dashboard's Tiptap editor produces and the mobile app
 * renders.
 */

const PRIVACY_POLICY_EN = `
<h1>Privacy Policy</h1>
<p>This Privacy Policy explains how <strong>Graket Academy</strong> collects, uses, and protects your personal information when you use our platform.</p>

<h2>1. Information We Collect</h2>
<ul>
  <li><strong>Account information</strong> — your name, email address, and phone number.</li>
  <li><strong>Usage data</strong> — the courses you enroll in, your progress, and quiz results.</li>
  <li><strong>Device information</strong> — device type and app version, used to improve reliability.</li>
</ul>

<h2>2. How We Use Your Information</h2>
<p>We use the information we collect to:</p>
<ul>
  <li>Provide and personalize your learning experience.</li>
  <li>Track your course progress and issue completion records.</li>
  <li>Send you important notifications about your account and courses.</li>
</ul>

<h2>3. Data Protection</h2>
<p>We apply reasonable technical and organizational measures to protect your data against unauthorized access, alteration, or disclosure. Passwords are stored using industry-standard hashing.</p>

<h2>4. Sharing of Information</h2>
<p>We do <strong>not</strong> sell your personal data. We only share information with service providers who help us operate the platform, and only to the extent necessary.</p>

<h2>5. Your Rights</h2>
<p>You may request access to, correction of, or deletion of your personal data at any time by contacting our support team.</p>

<h2>6. Contact Us</h2>
<p>If you have any questions about this Privacy Policy, contact us at <a href="mailto:support@graketacademy.com">support@graketacademy.com</a>.</p>

<p><em>Last updated: July 2026.</em></p>
`.trim();

const PRIVACY_POLICY_AR = `
<h1>سياسة الخصوصية</h1>
<p>توضّح سياسة الخصوصية هذه كيف تقوم <strong>أكاديمية جراكيت</strong> بجمع معلوماتك الشخصية واستخدامها وحمايتها عند استخدامك لمنصّتنا.</p>

<h2>١. المعلومات التي نجمعها</h2>
<ul>
  <li><strong>معلومات الحساب</strong> — الاسم والبريد الإلكتروني ورقم الهاتف.</li>
  <li><strong>بيانات الاستخدام</strong> — الدورات التي تشترك بها وتقدّمك ونتائج الاختبارات.</li>
  <li><strong>معلومات الجهاز</strong> — نوع الجهاز وإصدار التطبيق، لتحسين الأداء.</li>
</ul>

<h2>٢. كيف نستخدم معلوماتك</h2>
<p>نستخدم المعلومات التي نجمعها من أجل:</p>
<ul>
  <li>تقديم تجربة تعليمية مخصّصة لك.</li>
  <li>متابعة تقدّمك في الدورات وإصدار سجلات الإنجاز.</li>
  <li>إرسال الإشعارات المهمة المتعلقة بحسابك ودوراتك.</li>
</ul>

<h2>٣. حماية البيانات</h2>
<p>نطبّق إجراءات تقنية وتنظيمية معقولة لحماية بياناتك من الوصول غير المصرّح به أو التعديل أو الإفصاح. تُخزَّن كلمات المرور باستخدام تقنيات التشفير المعيارية.</p>

<h2>٤. مشاركة المعلومات</h2>
<p><strong>لا</strong> نبيع بياناتك الشخصية. نشارك المعلومات فقط مع مزوّدي الخدمات الذين يساعدوننا في تشغيل المنصّة، وبالقدر الضروري فقط.</p>

<h2>٥. حقوقك</h2>
<p>يمكنك طلب الوصول إلى بياناتك الشخصية أو تصحيحها أو حذفها في أي وقت عبر التواصل مع فريق الدعم.</p>

<h2>٦. تواصل معنا</h2>
<p>إذا كان لديك أي استفسار حول سياسة الخصوصية هذه، تواصل معنا على <a href="mailto:support@graketacademy.com">support@graketacademy.com</a>.</p>

<p><em>آخر تحديث: يوليو ٢٠٢٦.</em></p>
`.trim();

const TERMS_EN = `
<h1>Terms and Conditions</h1>
<p>Welcome to <strong>Graket Academy</strong>. By accessing or using our platform, you agree to be bound by these Terms and Conditions.</p>

<h2>1. Accounts</h2>
<p>You are responsible for keeping your account credentials secure and for all activity that occurs under your account. You must provide accurate information when registering.</p>

<h2>2. Use of the Platform</h2>
<ul>
  <li>Course content is provided for your personal, non-commercial learning only.</li>
  <li>You may not copy, redistribute, or resell any course materials.</li>
  <li>You may not attempt to disrupt or gain unauthorized access to the platform.</li>
</ul>

<h2>3. Purchases and Access Codes</h2>
<p>Access to paid courses is granted through valid purchase or access codes. Codes are single-use unless stated otherwise and are non-transferable.</p>

<h2>4. Content Ownership</h2>
<p>All courses, videos, and materials remain the intellectual property of Graket Academy and its instructors.</p>

<h2>5. Termination</h2>
<p>We reserve the right to suspend or terminate accounts that violate these terms, without prior notice.</p>

<h2>6. Changes to These Terms</h2>
<p>We may update these Terms from time to time. Continued use of the platform after changes means you accept the updated Terms.</p>

<h2>7. Contact Us</h2>
<p>For any questions about these Terms, contact us at <a href="mailto:support@graketacademy.com">support@graketacademy.com</a>.</p>

<p><em>Last updated: July 2026.</em></p>
`.trim();

const TERMS_AR = `
<h1>الشروط والأحكام</h1>
<p>مرحبًا بك في <strong>أكاديمية جراكيت</strong>. بوصولك إلى منصّتنا أو استخدامها، فإنك توافق على الالتزام بهذه الشروط والأحكام.</p>

<h2>١. الحسابات</h2>
<p>أنت مسؤول عن الحفاظ على سرية بيانات حسابك وعن جميع الأنشطة التي تتم من خلاله. يجب تقديم معلومات صحيحة عند التسجيل.</p>

<h2>٢. استخدام المنصّة</h2>
<ul>
  <li>يُقدَّم محتوى الدورات لأغراض التعلّم الشخصي غير التجاري فقط.</li>
  <li>لا يجوز نسخ أي من مواد الدورات أو إعادة توزيعها أو بيعها.</li>
  <li>لا يجوز محاولة تعطيل المنصّة أو الوصول إليها بشكل غير مصرّح به.</li>
</ul>

<h2>٣. المشتريات وأكواد الوصول</h2>
<p>يتم منح الوصول إلى الدورات المدفوعة عبر أكواد شراء أو وصول صالحة. الأكواد للاستخدام مرة واحدة ما لم يُذكر خلاف ذلك وغير قابلة للتحويل.</p>

<h2>٤. ملكية المحتوى</h2>
<p>تظل جميع الدورات والفيديوهات والمواد ملكية فكرية لأكاديمية جراكيت ومدرّبيها.</p>

<h2>٥. إنهاء الحساب</h2>
<p>نحتفظ بالحق في تعليق أو إنهاء الحسابات التي تخالف هذه الشروط دون إشعار مسبق.</p>

<h2>٦. تعديل الشروط</h2>
<p>قد نقوم بتحديث هذه الشروط من وقت لآخر. استمرارك في استخدام المنصّة بعد التعديلات يعني موافقتك على الشروط المحدّثة.</p>

<h2>٧. تواصل معنا</h2>
<p>لأي استفسار حول هذه الشروط، تواصل معنا على <a href="mailto:support@graketacademy.com">support@graketacademy.com</a>.</p>

<p><em>آخر تحديث: يوليو ٢٠٢٦.</em></p>
`.trim();

async function seedLegalDocuments() {
  console.log('📄 Seeding legal documents...');

  const documents = [
    {
      type: LegalDocumentType.PRIVACY_POLICY,
      contentEn: PRIVACY_POLICY_EN,
      contentAr: PRIVACY_POLICY_AR,
    },
    {
      type: LegalDocumentType.TERMS_AND_CONDITIONS,
      contentEn: TERMS_EN,
      contentAr: TERMS_AR,
    },
  ];

  for (const doc of documents) {
    await prisma.legalDocument.upsert({
      where: { type: doc.type },
      create: doc,
      update: { contentEn: doc.contentEn, contentAr: doc.contentAr },
    });
    console.log(`✅ Seeded: ${doc.type}`);
  }

  console.log('✅ Legal documents seeded successfully!');
}

seedLegalDocuments()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
