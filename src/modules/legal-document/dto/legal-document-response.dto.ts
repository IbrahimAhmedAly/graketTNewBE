import { LegalDocumentType } from '@prisma/client';

/**
 * Full legal document shape returned to the dashboard (both languages).
 */
export class LegalDocumentResponseDto {
  id: string;
  type: LegalDocumentType;
  contentAr: string;
  contentEn: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Localized legal document returned to public clients (mobile app).
 * Only the body matching the requested language is exposed.
 */
export class PublicLegalDocumentDto {
  type: LegalDocumentType;
  content: string;
  updatedAt: Date;
}
