import { Module } from '@nestjs/common';
import {
  LegalDocumentPublicController,
  LegalDocumentAdminController,
} from './legal-document.controller';
import { LegalDocumentService } from './legal-document.service';
import { JwtModule } from '../jwt/jwt.module';

// Repositories
import { LegalDocumentRepository } from './repositories/legal-document.repository';

@Module({
  imports: [JwtModule], // required by AdminAuthGuard (JwtTokenService)
  controllers: [LegalDocumentPublicController, LegalDocumentAdminController],
  providers: [LegalDocumentService, LegalDocumentRepository],
  exports: [LegalDocumentService, LegalDocumentRepository],
})
export class LegalDocumentModule {}
