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
  ],
  controllers: [],
  providers: [],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
