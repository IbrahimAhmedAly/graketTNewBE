import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';

import { AdminAuthService } from './admin-auth.service';
import { AdminLoginDto, VerifyAdminOtpDto } from './dto';

/**
 * Admin Auth Controller
 * Handles admin authentication endpoints with OTP verification
 */
@Controller('admin-auth')
@UseInterceptors(ClassSerializerInterceptor)
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  /**
   * Admin Login - Step 1
   * POST /admin-auth/login
   * Verify credentials and send OTP to admin email
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() adminLoginDto: AdminLoginDto) {
    return await this.adminAuthService.login(adminLoginDto);
  }

  /**
   * Verify Admin OTP - Step 2
   * POST /admin-auth/verify-otp
   * Verify OTP code and return access tokens
   */
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() verifyAdminOtpDto: VerifyAdminOtpDto) {
    return await this.adminAuthService.verifyOtp(verifyAdminOtpDto);
  }

  /**
   * Resend OTP
   * POST /admin-auth/resend-otp
   * Resend OTP code to admin email
   */
  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  async resendOtp(@Body('verificationToken') verificationToken: string) {
    return await this.adminAuthService.resendOtp(verificationToken);
  }
}
