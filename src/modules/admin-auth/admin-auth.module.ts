import { Module } from '@nestjs/common';
import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthService } from './admin-auth.service';
import { EmailModule } from '../email/email.module';

// Repositories
import { AdminRepository } from './repositories/admin.repository';
import { VerificationCodeRepository } from '../auth/repositories/verification-code.repository';

/**
 * Admin Auth Module
 * Handles admin authentication with OTP verification
 */
@Module({
  imports: [EmailModule],
  controllers: [AdminAuthController],
  providers: [AdminAuthService, AdminRepository, VerificationCodeRepository],
  exports: [AdminAuthService, AdminRepository],
})
export class AdminAuthModule {}
