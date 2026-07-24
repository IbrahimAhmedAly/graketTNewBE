import { Injectable } from '@nestjs/common';
import { LegalDocument, LegalDocumentType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Legal Document Repository
 * Handles all database operations for the LegalDocument entity.
 * There is at most one row per LegalDocumentType.
 */
@Injectable()
export class LegalDocumentRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find the single legal document of a given type
   */
  async findByType(type: LegalDocumentType): Promise<LegalDocument | null> {
    return this.prisma.legalDocument.findUnique({
      where: { type },
    });
  }

  /**
   * Create the document if it does not exist for the type, otherwise update it.
   */
  async upsertByType(
    type: LegalDocumentType,
    data: { contentAr: string; contentEn: string },
  ): Promise<LegalDocument> {
    return this.prisma.legalDocument.upsert({
      where: { type },
      create: { type, ...data },
      update: { ...data },
    });
  }
}
