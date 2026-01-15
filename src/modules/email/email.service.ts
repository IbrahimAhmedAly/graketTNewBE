import { Injectable, Logger } from '@nestjs/common';
import * as sgMail from '@sendgrid/mail';
import { envConfig } from '../../config/env.config';
import { EmailOptions } from './interfaces/email.interfaces';
import { EMAIL_TEMPLATES } from './constants/email-templates.constants';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor() {
    sgMail.setApiKey('YOUR_SENDGRID');
  }

  /**
   * Send email using SendGrid
   */
  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      const msg = {
        to: options.to,
        from: {
          email: 'noreply@mergaz.com',
          name: 'SkillGain',
        },
        subject: options.subject,
        templateId: options.templateId,
        dynamicTemplateData: options.dynamicTemplateData,
      };

      const response = await sgMail.send(msg);
      this.logger.log(
        `Email sent successfully, Status: ${response[0].statusCode}`,
      );
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}:`, error);
      throw new Error(`Email sending failed: ${error.message}`);
    }
  }

  /**
   * Send verification email using SendGrid dynamic template
   */
  async sendVerificationEmail(
    email: string,
    name: string,
    verificationToken: string,
  ): Promise<void> {
    try {
      const verificationLink = `${envConfig.app.websiteUrl}/auth/verify-email?token=${verificationToken}`;

      await this.sendEmail({
        to: email,
        templateId: EMAIL_TEMPLATES.VERIFICATION.id,
        dynamicTemplateData: {
          name: name,
          verification_link: verificationLink,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to send verification email to ${email}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Send forgot password email using SendGrid dynamic template
   */
  async sendForgotPasswordEmail(
    email: string,
    name: string,
    resetToken: string,
  ): Promise<void> {
    try {
      const resetLink = `${envConfig.app.websiteUrl}/forgot-password/reset?token=${resetToken}`;

      // Use SendGrid dynamic template
      await this.sendEmail({
        to: email,
        templateId: EMAIL_TEMPLATES.FORGOT_PASSWORD.id,
        dynamicTemplateData: {
          name: name,
          reset_link: resetLink,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to send forgot password email to ${email}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Send email with dynamic template (generic method)
   */
  async sendDynamicTemplateEmail(
    email: string,
    templateId: string,
    dynamicData: Record<string, any>,
  ): Promise<void> {
    try {
      await this.sendEmail({
        to: email,
        templateId,
        dynamicTemplateData: dynamicData,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send dynamic template email to ${email}:`,
        error,
      );
      throw error;
    }
  }
}
