import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

// Repositories
import { UserRepository } from './repositories/user.repository';
import { VerificationCodeRepository } from './repositories/verification-code.repository';

// Services
import { JwtTokenService } from '../jwt/jwt.service';
import { EmailService } from '../email/email.service';

// DTOs
import {
  RegisterDto,
  VerifyEmailDto,
  LoginDto,
  ForgotPasswordDto,
  VerifyResetCodeDto,
  ResetPasswordDto,
  RefreshTokenDto,
} from './dto';

// Utils
import { OTPUtil } from '../../utils/otp/otp.util';
import { OTPPurpose } from '../../utils/otp/otp.constants';

/**
 * Auth Service
 * Handles all authentication business logic
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly verificationCodeRepository: VerificationCodeRepository,
    private readonly jwtTokenService: JwtTokenService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Register a new user
   */
  async register(registerDto: RegisterDto) {
    const { email, password, serial } = registerDto;

    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(email);

    if (existingUser) {
      // If user exists and is pending, resend verification
      if (existingUser.status === 0) {
        return await this.resendVerificationCode(existingUser.id, email);
      }

      // User already verified
      throw new ConflictException('هذا البريد الإلكتروني موجود بالفعل');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user with pending status
    const user = await this.userRepository.create({
      email,
      password: hashedPassword,
      serial,
      status: 0, // Pending
    });

    // Generate OTP code
    const otpCode = OTPUtil.generateCode();
    const expiresAt = OTPUtil.getExpirationDate();

    // Save verification code
    await this.verificationCodeRepository.upsert(
      user.id,
      OTPPurpose.EMAIL_VERIFICATION,
      otpCode,
      expiresAt,
    );

    // Generate verification token
    const verificationToken = this.jwtTokenService.generateVerificationToken(
      user.id,
      OTPPurpose.EMAIL_VERIFICATION,
    );

    // TODO: Send verification email
    // await this.emailService.sendVerificationEmail(email, otpCode);
    console.log(`📧 Verification code for ${email}: ${otpCode}`);

    return {
      message:
        'تم إنشاء الحساب بنجاح. يرجى التحقق من بريدك الإلكتروني للتفعيل.',
      verificationToken,
      status: 'pending',
      code: otpCode, // Return OTP in response (remove in production)
    };
  }

  /**
   * Verify email with OTP code
   */
  async verifyEmail(verifyEmailDto: VerifyEmailDto) {
    const { verificationToken, code } = verifyEmailDto;

    // Verify token and get user ID
    let userId: string;
    try {
      userId = await this.jwtTokenService.verifyVerificationToken(
        verificationToken,
        OTPPurpose.EMAIL_VERIFICATION,
      );
    } catch (error) {
      throw new UnauthorizedException('رمز التحقق غير صالح');
    }

    // Find user
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('المستخدم غير موجود');
    }

    // Find verification code
    const codeEntry =
      await this.verificationCodeRepository.findByUserAndPurpose(
        user.id,
        OTPPurpose.EMAIL_VERIFICATION,
      );

    if (!codeEntry) {
      throw new NotFoundException('رمز التحقق غير موجود');
    }

    // Check if code is expired
    if (OTPUtil.isExpired(codeEntry.expiresAt)) {
      await this.verificationCodeRepository.deleteByUserAndPurpose(
        user.id,
        OTPPurpose.EMAIL_VERIFICATION,
      );
      throw new BadRequestException('انتهت صلاحية رمز التحقق');
    }

    // Check if code matches
    if (codeEntry.code !== code) {
      throw new BadRequestException('رمز التحقق غير صحيح');
    }

    // Activate user account
    await this.userRepository.updateStatus(user.id, 1);

    // Delete verification code
    await this.verificationCodeRepository.deleteByUserAndPurpose(
      user.id,
      OTPPurpose.EMAIL_VERIFICATION,
    );

    // Generate auth tokens
    const tokens = await this.jwtTokenService.generateAuthTokens({
      id: user.id,
      email: user.email,
    });

    // Return user data without password
    const { password, ...userData } = user;

    return {
      ...userData,
      status: 1,
      accessToken: tokens.access.token,
      refreshToken: tokens.refresh?.token,
      message: 'تم تفعيل الحساب بنجاح',
    };
  }

  /**
   * Login user
   */
  async login(loginDto: LoginDto) {
    const { email, password, serial } = loginDto;

    // Find user by email
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new NotFoundException(
        'البريد الإلكتروني أو كلمة المرور غير صحيحة',
      );
    }

    // Validate password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException(
        'البريد الإلكتروني أو كلمة المرور غير صحيحة',
      );
    }

    // Check serial match
    if (user.serial !== serial) {
      throw new ForbiddenException('لا يمكنك تسجيل الدخول من هذا الجهاز');
    }

    // Check if user is active
    if (user.status !== 1) {
      throw new ForbiddenException('الحساب غير مفعل');
    }

    // Generate auth tokens
    const tokens = await this.jwtTokenService.generateAuthTokens({
      id: user.id,
      email: user.email,
    });

    // Return user data without password
    const { password: _, ...userData } = user;

    return {
      ...userData,
      accessToken: tokens.access.token,
      refreshToken: tokens.refresh?.token,
    };
  }

  /**
   * Forgot password - send reset code
   */
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;

    // Find user
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new NotFoundException('لا يوجد حساب مرتبط بهذا البريد الإلكتروني');
    }

    // Check if user is active
    if (user.status === 0) {
      throw new BadRequestException('الحساب غير مفعل، يرجى تفعيل الحساب أولاً');
    }

    // Generate OTP code
    const otpCode = OTPUtil.generateCode();
    const expiresAt = OTPUtil.getExpirationDate();

    // Save verification code
    await this.verificationCodeRepository.upsert(
      user.id,
      OTPPurpose.PASSWORD_RESET,
      otpCode,
      expiresAt,
    );

    // Generate verification token
    const verificationToken = this.jwtTokenService.generateVerificationToken(
      user.id,
      OTPPurpose.PASSWORD_RESET,
    );

    // TODO: Send password reset email
    // await this.emailService.sendPasswordResetEmail(email, otpCode);
    console.log(`📧 Password reset code for ${email}: ${otpCode}`);

    return {
      message: 'تم إرسال رمز إعادة تعيين كلمة المرور إلى بريدك الإلكتروني',
      verificationToken,
      code: otpCode, // Return OTP in response (remove in production)
    };
  }

  /**
   * Verify reset code
   */
  async verifyResetCode(verifyResetCodeDto: VerifyResetCodeDto) {
    const { verificationToken, code } = verifyResetCodeDto;

    // Verify token and get user ID
    let userId: string;
    try {
      userId = await this.jwtTokenService.verifyVerificationToken(
        verificationToken,
        OTPPurpose.PASSWORD_RESET,
      );
    } catch (error) {
      throw new UnauthorizedException('رمز التحقق غير صالح');
    }

    // Find user
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('المستخدم غير موجود');
    }

    // Find verification code
    const codeEntry =
      await this.verificationCodeRepository.findByUserAndPurpose(
        user.id,
        OTPPurpose.PASSWORD_RESET,
      );

    if (!codeEntry) {
      throw new NotFoundException('رمز التحقق غير موجود');
    }

    // Check if code is expired
    if (OTPUtil.isExpired(codeEntry.expiresAt)) {
      await this.verificationCodeRepository.deleteByUserAndPurpose(
        user.id,
        OTPPurpose.PASSWORD_RESET,
      );
      throw new BadRequestException('انتهت صلاحية رمز التحقق');
    }

    // Check if code matches
    if (codeEntry.code !== code) {
      throw new BadRequestException('رمز التحقق غير صحيح');
    }

    // Generate reset token (separate from verification token)
    const resetToken = this.jwtTokenService.generateVerificationToken(
      user.id,
      'reset_password_confirm',
      '15m',
    );

    return {
      message: 'تم التحقق من الرمز بنجاح',
      resetToken,
    };
  }

  /**
   * Reset password
   */
  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { resetToken, newPassword, confirmPassword } = resetPasswordDto;

    // Check if passwords match
    if (newPassword !== confirmPassword) {
      throw new BadRequestException('كلمات المرور غير متطابقة');
    }

    // Verify reset token
    let userId: string;
    try {
      userId = await this.jwtTokenService.verifyVerificationToken(
        resetToken,
        'reset_password_confirm',
      );
    } catch (error) {
      throw new UnauthorizedException('رمز إعادة التعيين غير صالح');
    }

    // Find user
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('المستخدم غير موجود');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await this.userRepository.updatePassword(user.id, hashedPassword);

    // Delete verification code
    await this.verificationCodeRepository.deleteByUserAndPurpose(
      user.id,
      OTPPurpose.PASSWORD_RESET,
    );

    // Generate auth tokens
    const tokens = await this.jwtTokenService.generateAuthTokens({
      id: user.id,
      email: user.email,
    });

    return {
      message: 'تم إعادة تعيين كلمة المرور بنجاح',
      accessToken: tokens.access.token,
      refreshToken: tokens.refresh?.token,
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    try {
      // Verify refresh token
      const userId = await this.jwtTokenService.verifyRefreshToken(
        refreshTokenDto.refreshToken,
      );

      // Find user
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Check if user is active
      if (user.status !== 1) {
        throw new UnauthorizedException('Account is not active');
      }

      // Generate new access token only
      const tokens = await this.jwtTokenService.generateAuthTokens(
        {
          id: user.id,
          email: user.email,
        },
        false, // Don't generate new refresh token
      );

      return {
        access: tokens.access,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /**
   * Helper: Resend verification code for pending users
   */
  private async resendVerificationCode(userId: string, email: string) {
    // Generate new OTP code
    const otpCode = OTPUtil.generateCode();
    const expiresAt = OTPUtil.getExpirationDate();

    // Update verification code
    await this.verificationCodeRepository.upsert(
      userId,
      OTPPurpose.EMAIL_VERIFICATION,
      otpCode,
      expiresAt,
    );

    // Generate new verification token
    const verificationToken = this.jwtTokenService.generateVerificationToken(
      userId,
      OTPPurpose.EMAIL_VERIFICATION,
    );

    // TODO: Send verification email
    // await this.emailService.sendVerificationEmail(email, otpCode);
    console.log(`📧 Verification code resent for ${email}: ${otpCode}`);

    return {
      message: 'تم إرسال رمز التحقق إلى بريدك الإلكتروني.',
      verificationToken,
      status: 'pending',
      code: otpCode, // Return OTP in response (remove in production)
    };
  }
}
