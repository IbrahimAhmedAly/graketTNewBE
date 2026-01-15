import { Injectable } from '@nestjs/common';
import { VerificationCode, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { OTPPurpose } from '../../../utils/otp/otp.constants';

/**
 * VerificationCode Repository
 * Handles all database operations for VerificationCode entity
 */
@Injectable()
export class VerificationCodeRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find verification code by user ID and purpose
   */
  async findByUserAndPurpose(
    userId: string,
    purpose: OTPPurpose,
  ): Promise<VerificationCode | null> {
    return this.prisma.verificationCode.findUnique({
      where: {
        userId_purpose: {
          userId,
          purpose,
        },
      },
    });
  }

  /**
   * Create or update verification code
   * Uses upsert to handle both create and update scenarios
   */
  async upsert(
    userId: string,
    purpose: OTPPurpose,
    code: string,
    expiresAt: Date,
  ): Promise<VerificationCode> {
    return this.prisma.verificationCode.upsert({
      where: {
        userId_purpose: {
          userId,
          purpose,
        },
      },
      create: {
        userId,
        purpose,
        code,
        expiresAt,
      },
      update: {
        code,
        expiresAt,
      },
    });
  }

  /**
   * Create a new verification code
   */
  async create(
    data: Prisma.VerificationCodeCreateInput,
  ): Promise<VerificationCode> {
    return this.prisma.verificationCode.create({
      data,
    });
  }

  /**
   * Delete verification code by user ID and purpose
   */
  async deleteByUserAndPurpose(
    userId: string,
    purpose: OTPPurpose,
  ): Promise<void> {
    await this.prisma.verificationCode.deleteMany({
      where: {
        userId,
        purpose,
      },
    });
  }

  /**
   * Delete all verification codes for a user
   */
  async deleteAllByUser(userId: string): Promise<void> {
    await this.prisma.verificationCode.deleteMany({
      where: { userId },
    });
  }

  /**
   * Delete expired verification codes (cleanup utility)
   */
  async deleteExpired(): Promise<number> {
    const result = await this.prisma.verificationCode.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
    return result.count;
  }
}
