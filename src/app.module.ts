import { Module, MiddlewareConsumer } from '@nestjs/common';
import { I18nModule } from 'nestjs-i18n';
import { i18nConfig } from './config/i18n.config';
import { PrismaModule } from './prisma/prisma.module';
import { LoggerMiddleware } from './middlewares/logger.middleware';
import { JwtModule } from './modules/jwt/jwt.module';
import { AuthModule } from './modules/auth/auth.module';
import { AdminAuthModule } from './modules/admin-auth/admin-auth.module';
import { EmailModule } from './modules/email/email.module';
import { InstructorModule } from './modules/instructor/instructor.module';
import { CategoryModule } from './modules/category/category.module';
import { CourseModule } from './modules/course/course.module';
import { BasketModule } from './modules/basket/basket.module';
import { PurchaseModule } from './modules/purchase/purchase.module';
import { UserCourseModule } from './modules/user-course/user-course.module';
import { NotificationModule } from './modules/notification/notification.module';
import { ProgressModule } from './modules/progress/progress.module';
import { QuizModule } from './modules/quiz/quiz.module';
import { AdminCourseModule } from './modules/admin-course/admin-course.module';
import { AdminSectionModule } from './modules/admin-section/admin-section.module';
import { AdminContentModule } from './modules/admin-content/admin-content.module';
import { AdminQuizModule } from './modules/admin-quiz/admin-quiz.module';
import { AdminPurchaseCodeModule } from './modules/admin-purchase-code/admin-purchase-code.module';
import { AdminUserModule } from './modules/admin-user/admin-user.module';
import { AdminNotificationModule } from './modules/admin-notification/admin-notification.module';
import { UploadModule } from './modules/upload/upload.module';
import { AdminSelectListModule } from './modules/admin-select-list/admin-select-list.module';
import { CourseQaModule } from './modules/course-qa/course-qa.module';
import { ContentNoteModule } from './modules/content-note/content-note.module';
@Module({
  imports: [
    I18nModule.forRoot(i18nConfig),
    PrismaModule,
    JwtModule,
    EmailModule,
    AuthModule,
    AdminAuthModule,
    InstructorModule,
    CategoryModule,
    CourseModule,
    BasketModule,
    PurchaseModule,
    UserCourseModule,
    NotificationModule,
    ProgressModule,
    QuizModule,
    AdminCourseModule,
    AdminSectionModule,
    AdminContentModule,
    AdminQuizModule,
    AdminPurchaseCodeModule,
    AdminUserModule,
    AdminNotificationModule,
    UploadModule,
    AdminSelectListModule,
    CourseQaModule,
    ContentNoteModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
