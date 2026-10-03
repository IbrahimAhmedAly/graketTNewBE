import { Module } from '@nestjs/common';
import { JwtModule } from '../jwt/jwt.module';
import { UploadModule } from '../upload/upload.module';
import { ContentKeyService } from './content-key.service';
import { ProtectedContentController } from './protected-content.controller';
import { ProtectedContentService } from './protected-content.service';
import { ProtectedContentRepository } from './repositories/protected-content.repository';

@Module({
  imports: [JwtModule, UploadModule],
  controllers: [ProtectedContentController],
  providers: [
    ProtectedContentService,
    ProtectedContentRepository,
    ContentKeyService,
  ],
})
export class ProtectedContentModule {}
