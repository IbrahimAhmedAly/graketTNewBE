import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { EmailModule } from '../email/email.module';
import { JwtModule } from '../jwt/jwt.module';

// Repositories
import { UserRepository } from './repositories/user.repository';
import { VerificationCodeRepository } from './repositories/verification-code.repository';

@Module({
  imports: [EmailModule, JwtModule],
  controllers: [AuthController],
  providers: [AuthService, UserRepository, VerificationCodeRepository],
  exports: [AuthService, UserRepository],
})
export class AuthModule {}
