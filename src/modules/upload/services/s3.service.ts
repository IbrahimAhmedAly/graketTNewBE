import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { envConfig } from '../../../config/env.config';
import { randomUUID } from 'crypto';
import * as path from 'path';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly region: string;

  constructor() {
    this.bucketName = envConfig.aws.s3BucketName;
    this.region = envConfig.aws.region;

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: envConfig.aws.accessKeyId,
        secretAccessKey: envConfig.aws.secretAccessKey,
      },
    });
  }

  /**
   * Generate a pre-signed URL for uploading a file
   * Returns both the upload URL and the final file URL
   */
  async generatePresignedUploadUrl(
    fileName: string,
    contentType: string,
    expiresIn: number = 3600,
  ): Promise<{
    uploadUrl: string;
    fileKey: string;
    fileUrl: string;
  }> {
    try {
      // Generate unique file key with organized folder structure
      const fileKey = this.generateFileKey(fileName);

      // Validate content type
      this.validateContentType(contentType);

      // Create the PutObject command
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileKey,
        ContentType: contentType,
      });

      // Generate pre-signed URL for upload
      const uploadUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });

      // Generate the public file URL
      const fileUrl = this.getPublicFileUrl(fileKey);

      this.logger.log(`Generated pre-signed upload URL for: ${fileKey}`);

      return {
        uploadUrl,
        fileKey,
        fileUrl,
      };
    } catch (error) {
      this.logger.error('Error generating pre-signed upload URL', error);
      throw new BadRequestException('Failed to generate upload URL');
    }
  }

  /**
   * Generate a pre-signed URL for downloading/viewing a file
   */
  async generatePresignedDownloadUrl(
    fileKey: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: fileKey,
      });

      const downloadUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });

      this.logger.log(`Generated pre-signed download URL for: ${fileKey}`);
      return downloadUrl;
    } catch (error) {
      this.logger.error('Error generating pre-signed download URL', error);
      throw new BadRequestException('Failed to generate download URL');
    }
  }

  /**
   * Delete a file from S3
   */
  async deleteFile(fileKey: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: fileKey,
      });

      await this.s3Client.send(command);
      this.logger.log(`Deleted file from S3: ${fileKey}`);
    } catch (error) {
      this.logger.error(`Error deleting file from S3: ${fileKey}`, error);
      throw new BadRequestException('Failed to delete file');
    }
  }

  /**
   * Generate a unique file key
   * Format: uuid-originalfilename.ext
   */
  private generateFileKey(fileName: string): string {
    // Sanitize filename
    const sanitizedFileName = this.sanitizeFileName(fileName);

    // Generate unique filename
    const uniqueId = randomUUID();
    const ext = path.extname(sanitizedFileName);
    const nameWithoutExt = path.basename(sanitizedFileName, ext);
    const uniqueFileName = `${uniqueId}-${nameWithoutExt}${ext}`;

    return uniqueFileName;
  }

  /**
   * Sanitize filename to remove dangerous characters
   */
  private sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[^a-zA-Z0-9._-]/g, '-')
      .replace(/--+/g, '-')
      .toLowerCase();
  }

  /**
   * Get public URL for a file
   */
  private getPublicFileUrl(fileKey: string): string {
    return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${fileKey}`;
  }

  /**
   * Validate content type
   */
  private validateContentType(contentType: string): void {
    const allowedTypes = [
      // Images
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      // Documents
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
      // Videos
      'video/mp4',
      'video/mpeg',
      'video/quicktime',
      'video/x-msvideo',
      // Archives
      'application/zip',
      'application/x-rar-compressed',
    ];

    if (!allowedTypes.includes(contentType)) {
      throw new BadRequestException(
        `Content type ${contentType} is not allowed`,
      );
    }
  }

  /**
   * Extract file key from S3 URL
   */
  extractFileKeyFromUrl(url: string): string | null {
    try {
      const urlPattern = new RegExp(
        `https://${this.bucketName}\\.s3\\.${this.region}\\.amazonaws\\.com/(.+)`,
      );
      const match = url.match(urlPattern);
      return match ? match[1] : null;
    } catch (error) {
      this.logger.error('Error extracting file key from URL', error);
      return null;
    }
  }
}
