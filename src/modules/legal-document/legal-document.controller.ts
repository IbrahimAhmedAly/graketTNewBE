import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { LegalDocumentType } from '@prisma/client';

import { LegalDocumentService } from './legal-document.service';
import { UpdateLegalDocumentDto } from './dto';
import { AcceptLanguage } from '../../common/decorators/accept-language.decorator';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';

/**
 * Resolve the requested language, preferring an explicit `?lang=` query
 * (the mobile client sends its own `language` header, not Accept-Language)
 * and falling back to the parsed Accept-Language value.
 */
function resolveLang(queryLang: string | undefined, headerLang: string): string {
  const candidate = (queryLang || headerLang || 'ar').toLowerCase();
  return candidate === 'ar' ? 'ar' : 'en';
}

/**
 * Public Legal Documents Controller
 * Read-only endpoints consumed by the mobile app. No authentication required.
 * Paths (`/privacy`, `/terms`) match the mobile app's AppApis constants.
 */
@Controller()
export class LegalDocumentPublicController {
  constructor(private readonly legalDocumentService: LegalDocumentService) {}

  /**
   * Get the privacy policy localized to the caller's language.
   * GET /privacy?lang=ar|en
   */
  @Get('privacy')
  @HttpCode(HttpStatus.OK)
  async getPrivacy(
    @AcceptLanguage() headerLang: string,
    @Query('lang') queryLang?: string,
  ) {
    return this.legalDocumentService.getPublic(
      LegalDocumentType.PRIVACY_POLICY,
      resolveLang(queryLang, headerLang),
    );
  }

  /**
   * Get the terms and conditions localized to the caller's language.
   * GET /terms?lang=ar|en
   */
  @Get('terms')
  @HttpCode(HttpStatus.OK)
  async getTerms(
    @AcceptLanguage() headerLang: string,
    @Query('lang') queryLang?: string,
  ) {
    return this.legalDocumentService.getPublic(
      LegalDocumentType.TERMS_AND_CONDITIONS,
      resolveLang(queryLang, headerLang),
    );
  }
}

/**
 * Admin Legal Documents Controller
 * Bilingual read + upsert. Protected by AdminAuthGuard.
 */
@Controller('admin/legal-documents')
@UseGuards(AdminAuthGuard)
export class LegalDocumentAdminController {
  constructor(private readonly legalDocumentService: LegalDocumentService) {}

  /**
   * Get the full bilingual document for editing.
   * GET /admin/legal-documents/:type
   */
  @Get(':type')
  @HttpCode(HttpStatus.OK)
  async getForAdmin(@Param('type') type: string) {
    return this.legalDocumentService.getForAdmin(this.parseType(type));
  }

  /**
   * Create or update a document.
   * PUT /admin/legal-documents/:type
   */
  @Put(':type')
  @HttpCode(HttpStatus.OK)
  async upsert(
    @Param('type') type: string,
    @Body() updateDto: UpdateLegalDocumentDto,
  ) {
    return this.legalDocumentService.upsert(this.parseType(type), updateDto);
  }

  /**
   * Map a URL-friendly slug to the LegalDocumentType enum.
   * Accepts both "privacy-policy" / "privacy" and "terms" / "terms-and-conditions".
   */
  private parseType(type: string): LegalDocumentType {
    switch (type) {
      case 'privacy':
      case 'privacy-policy':
        return LegalDocumentType.PRIVACY_POLICY;
      case 'terms':
      case 'terms-and-conditions':
        return LegalDocumentType.TERMS_AND_CONDITIONS;
      default:
        throw new BadRequestException('نوع المستند غير صالح');
    }
  }
}
