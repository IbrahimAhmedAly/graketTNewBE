import { Injectable, NotFoundException } from '@nestjs/common';
import { LegalDocument, LegalDocumentType } from '@prisma/client';

import { LegalDocumentRepository } from './repositories/legal-document.repository';
import {
  UpdateLegalDocumentDto,
  LegalDocumentResponseDto,
  PublicLegalDocumentDto,
} from './dto';

/**
 * Legal Document Service
 * Business logic for privacy policy & terms and conditions.
 */
@Injectable()
export class LegalDocumentService {
  constructor(
    private readonly legalDocumentRepository: LegalDocumentRepository,
  ) {}

  /**
   * Public: get a legal document localized to a single language.
   * `lang` is 'ar' | 'en' (defaults handled by the caller/decorator).
   */
  async getPublic(
    type: LegalDocumentType,
    lang: string,
  ): Promise<{ message: string; data: PublicLegalDocumentDto }> {
    const document = await this.legalDocumentRepository.findByType(type);

    if (!document) {
      throw new NotFoundException('المستند غير موجود');
    }

    const content = lang === 'ar' ? document.contentAr : document.contentEn;

    return {
      message: 'تم جلب المستند بنجاح',
      data: {
        type: document.type,
        content,
        updatedAt: document.updatedAt,
      },
    };
  }

  /**
   * Admin: get the full bilingual document for editing.
   * Returns empty content (never 404) so the dashboard can render an editor
   * for a document that has not been created yet.
   */
  async getForAdmin(
    type: LegalDocumentType,
  ): Promise<{ message: string; data: LegalDocumentResponseDto }> {
    const document = await this.legalDocumentRepository.findByType(type);

    return {
      message: 'تم جلب المستند بنجاح',
      data: document ? this.toResponse(document) : this.emptyDocument(type),
    };
  }

  /**
   * Admin: create or update the document of a given type.
   */
  async upsert(
    type: LegalDocumentType,
    updateDto: UpdateLegalDocumentDto,
  ): Promise<{ message: string; data: LegalDocumentResponseDto }> {
    const document = await this.legalDocumentRepository.upsertByType(type, {
      contentAr: updateDto.contentAr,
      contentEn: updateDto.contentEn,
    });

    return {
      message: 'تم حفظ المستند بنجاح',
      data: this.toResponse(document),
    };
  }

  private toResponse(document: LegalDocument): LegalDocumentResponseDto {
    return {
      id: document.id,
      type: document.type,
      contentAr: document.contentAr,
      contentEn: document.contentEn,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
  }

  private emptyDocument(type: LegalDocumentType): LegalDocumentResponseDto {
    return {
      id: '',
      type,
      contentAr: '',
      contentEn: '',
      createdAt: new Date(0),
      updatedAt: new Date(0),
    };
  }
}
