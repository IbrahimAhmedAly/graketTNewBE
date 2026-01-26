import { Module } from '@nestjs/common';
import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthService } from './admin-auth.service';
import { EmailModule } from '../email/email.module';
import { JwtModule } from '../jwt/jwt.module';

// Repositories
import { AdminRepository } from './repositories/admin.repository';
import { VerificationCodeRepository } from '../auth/repositories/verification-code.repository';

/**
 * Admin Auth Module
 * Handles admin authentication with OTP verification
 */
@Module({
  imports: [EmailModule, JwtModule],
  controllers: [AdminAuthController],
  providers: [AdminAuthService, AdminRepository, VerificationCodeRepository],
  exports: [AdminAuthService, AdminRepository],
})
export class AdminAuthModule {}
