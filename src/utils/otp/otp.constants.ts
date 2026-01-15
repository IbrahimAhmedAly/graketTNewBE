/**
 * OTP Configuration Constants
 */

export const OTP_CONFIG = {
  // OTP code length (6 digits)
  LENGTH: 6,

  // OTP expiry time in minutes
  EXPIRY_MINUTES: 30,

  // OTP code range
  MIN_VALUE: 100000, // 6-digit minimum
  MAX_VALUE: 999999, // 6-digit maximum
} as const;

export enum OTPPurpose {
  EMAIL_VERIFICATION = 'email_verification',
  PASSWORD_RESET = 'password_reset',
}
