import { randomInt } from 'crypto';
import { OTP_CONFIG } from './otp.constants';

/**
 * OTP Utility Class
 * Handles OTP generation and validation logic
 */
export class OTPUtil {
  /**
   * Generate a random 6-digit OTP code
   * @returns {string} 6-digit OTP code
   */
  static generateCode(): string {
    const code = randomInt(OTP_CONFIG.MIN_VALUE, OTP_CONFIG.MAX_VALUE + 1);
    return String(code);
  }

  /**
   * Calculate expiration date for OTP
   * @returns {Date} Expiration date (30 minutes from now)
   */
  static getExpirationDate(): Date {
    const now = new Date();
    const expiryMilliseconds = OTP_CONFIG.EXPIRY_MINUTES * 60 * 1000;
    return new Date(now.getTime() + expiryMilliseconds);
  }

  /**
   * Calculate expiration date for Admin OTP
   * @returns {Date} Expiration date (10 minutes from now)
   */
  static getAdminExpirationDate(): Date {
    const now = new Date();
    const expiryMilliseconds = OTP_CONFIG.ADMIN_EXPIRY_MINUTES * 60 * 1000;
    return new Date(now.getTime() + expiryMilliseconds);
  }

  /**
   * Check if OTP is expired
   * @param {Date} expiresAt - Expiration date
   * @returns {boolean} True if expired, false otherwise
   */
  static isExpired(expiresAt: Date): boolean {
    return new Date() > new Date(expiresAt);
  }

  /**
   * Validate OTP code format
   * @param {string} code - OTP code to validate
   * @returns {boolean} True if valid format, false otherwise
   */
  static isValidFormat(code: string): boolean {
    if (!code || typeof code !== 'string') {
      return false;
    }

    const codeNum = parseInt(code, 10);
    return (
      !isNaN(codeNum) &&
      codeNum >= OTP_CONFIG.MIN_VALUE &&
      codeNum <= OTP_CONFIG.MAX_VALUE
    );
  }
}
