import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { S3Service } from './services/s3.service';
import { JwtTokenService } from '../jwt/jwt-token.service';

@Module({
  controllers: [UploadController],
  providers: [S3Service, JwtTokenService],
  exports: [S3Service],
})
export class UploadModule {}
