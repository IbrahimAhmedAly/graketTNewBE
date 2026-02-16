import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { envConfig } from '../../config/env.config';
import { getVerificationEmailHtml } from './templates/verification.template';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend;

  constructor() {
    this.resend = new Resend(envConfig.resend.apiKey);
  }

  /**
   * Send verification email with OTP code
   */
  async sendVerificationEmail(email: string, code: string): Promise<void> {
    try {
      const { error } = await this.resend.emails.send({
        from: 'Graket App <noreply@graketacademy.com>',
        to: email,
        subject: 'Graket App - Verification Code',
        html: getVerificationEmailHtml(code),
      });

      if (error) {
        throw new Error(error.message);
      }

      this.logger.log(`Verification email sent to ${email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send verification email to ${email}:`,
        error,
      );
      throw error;
    }
  }
}
