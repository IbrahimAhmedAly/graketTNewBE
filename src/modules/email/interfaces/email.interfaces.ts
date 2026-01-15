export interface EmailOptions {
  to: string;
  subject?: string;
  templateId?: string;
  dynamicTemplateData?: Record<string, any>;
}

export interface VerificationEmailData {
  name: string;
  verification_link: string;
}

export interface EmailTemplate {
  subject: string;
  html: string;
}
