import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

// Repositories
import { AdminRepository } from './repositories/admin.repository';
import { VerificationCodeRepository } from '../auth/repositories/verification-code.repository';

// Services
import { JwtTokenService } from '../jwt/jwt.service';
import { EmailService } from '../email/email.service';

// DTOs
import { AdminLoginDto, VerifyAdminOtpDto } from './dto';

// Utils
import { OTPUtil } from '../../utils/otp/otp.util';
import { OTPPurpose } from '../../utils/otp/otp.constants';

/**
 * Admin Auth Service
 * Handles admin authentication with OTP verification
 */
@Injectable()
export class AdminAuthService {
  constructor(
    private readonly adminRepository: AdminRepository,
    private readonly verificationCodeRepository: VerificationCodeRepository,
    private readonly jwtTokenService: JwtTokenService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Admin Login - Step 1
   * Verify credentials and send OTP to admin email
   */
  async login(adminLoginDto: AdminLoginDto) {
    const { email, password } = adminLoginDto;

    // Find admin by email
    const admin = await this.adminRepository.findByEmail(email);
    if (!admin) {
      throw new UnauthorizedException(
        'البريد الإلكتروني أو كلمة المرور غير صحيحة',
      );
    }

    // Validate password
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException(
        'البريد الإلكتروني أو كلمة المرور غير صحيحة',
      );
    }

    // Generate OTP code with 10-minute expiry
    const otpCode = OTPUtil.generateCode();
    const expiresAt = OTPUtil.getAdminExpirationDate();

    // Save OTP to database
    await this.verificationCodeRepository.upsertForAdmin(
      admin.id,
      OTPPurpose.ADMIN_LOGIN,
      otpCode,
      expiresAt,
    );

    // Generate verification token
    const verificationToken = this.jwtTokenService.generateVerificationToken(
      admin.id,
      OTPPurpose.ADMIN_LOGIN,
      '10m', // Match OTP expiry time
    );

    // Send the OTP by email (same mechanism as the user-facing auth flow)
    await this.emailService.sendVerificationEmail(email, otpCode);

    return {
      message: 'تم إرسال رمز التحقق إلى بريدك الإلكتروني',
      verificationToken,
      expiresIn: '10 minutes',
    };
  }

  /**
   * Verify Admin OTP - Step 2
   * Verify OTP code and return access tokens
   */
  async verifyOtp(verifyAdminOtpDto: VerifyAdminOtpDto) {
    const { verificationToken, code } = verifyAdminOtpDto;

    // Verify token and get admin ID
    let adminId: string;
    try {
      adminId = await this.jwtTokenService.verifyVerificationToken(
        verificationToken,
        OTPPurpose.ADMIN_LOGIN,
      );
    } catch (error) {
      throw new UnauthorizedException('رمز التحقق غير صالح أو منتهي الصلاحية');
    }

    // Find admin
    const admin = await this.adminRepository.findById(adminId);
    if (!admin) {
      throw new NotFoundException('المسؤول غير موجود');
    }

    // Find verification code
    const codeEntry =
      await this.verificationCodeRepository.findByAdminAndPurpose(
        admin.id,
        OTPPurpose.ADMIN_LOGIN,
      );

    if (!codeEntry) {
      throw new NotFoundException('رمز التحقق غير موجود');
    }

    // Check if code is expired
    if (OTPUtil.isExpired(codeEntry.expiresAt)) {
      await this.verificationCodeRepository.deleteByAdminAndPurpose(
        admin.id,
        OTPPurpose.ADMIN_LOGIN,
      );
      throw new BadRequestException(
        'انتهت صلاحية رمز التحقق. يرجى تسجيل الدخول مرة أخرى',
      );
    }

    // Check if code matches
    if (codeEntry.code !== code) {
      throw new BadRequestException('رمز التحقق غير صحيح');
    }

    // Delete verification code after successful verification
    await this.verificationCodeRepository.deleteByAdminAndPurpose(
      admin.id,
      OTPPurpose.ADMIN_LOGIN,
    );

    // Generate auth tokens
    const tokens = await this.jwtTokenService.generateAuthTokens({
      id: admin.id,
      email: admin.email,
    });

    // Return admin data without password
    const { password, ...adminData } = admin;

    return {
      ...adminData,
      accessToken: tokens.access.token,
      refreshToken: tokens.refresh?.token,
      message: 'تم تسجيل الدخول بنجاح',
    };
  }

  /**
   * Resend OTP code
   * Allows admin to request a new OTP if previous one expired
   */
  async resendOtp(verificationToken: string) {
    // Verify token and get admin ID
    let adminId: string;
    try {
      adminId = await this.jwtTokenService.verifyVerificationToken(
        verificationToken,
        OTPPurpose.ADMIN_LOGIN,
      );
    } catch (error) {
      throw new UnauthorizedException(
        'رمز التحقق غير صالح. يرجى تسجيل الدخول مرة أخرى',
      );
    }

    // Find admin
    const admin = await this.adminRepository.findById(adminId);
    if (!admin) {
      throw new NotFoundException('المسؤول غير موجود');
    }

    // Generate new OTP code
    const otpCode = OTPUtil.generateCode();
    const expiresAt = OTPUtil.getAdminExpirationDate();

    // Update OTP in database
    await this.verificationCodeRepository.upsertForAdmin(
      admin.id,
      OTPPurpose.ADMIN_LOGIN,
      otpCode,
      expiresAt,
    );

    // Generate new verification token
    const newVerificationToken = this.jwtTokenService.generateVerificationToken(
      admin.id,
      OTPPurpose.ADMIN_LOGIN,
      '10m',
    );

    // Send the new OTP by email
    await this.emailService.sendVerificationEmail(admin.email, otpCode);

    return {
      message: 'تم إرسال رمز تحقق جديد إلى بريدك الإلكتروني',
      verificationToken: newVerificationToken,
      expiresIn: '10 minutes',
    };
  }
}
