import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ContentType, UserStatus } from '@prisma/client';
import axios from 'axios';
import { Readable } from 'stream';
import { S3Service } from '../upload/services/s3.service';
import { ContentKeyService } from './content-key.service';
import { LicenseRequestDto } from './dto';
import { ProtectedContentRepository } from './repositories/protected-content.repository';
import {
  InvalidClientKeyError,
  sealLicense,
} from './utils/license-crypto.util';
import {
  parseProtectedHeader,
  PROTECTED_MAX_HEADER_LENGTH,
  ProtectedFileHeader,
  ProtectedHeaderError,
  ProtectedKind,
} from './utils/protected-header.util';

/** Parsed headers kept in memory. Every upload gets a new URL, so they never go stale. */
const HEADER_CACHE_SIZE = 1000;

@Injectable()
export class ProtectedContentService {
  private readonly logger = new Logger(ProtectedContentService.name);
  private readonly headerCache = new Map<string, ProtectedFileHeader>();

  constructor(
    private readonly repository: ProtectedContentRepository,
    private readonly contentKeys: ContentKeyService,
    private readonly s3Service: S3Service,
  ) {}

  /**
   * Hands the desktop player the key for one protected file, sealed so only
   * the requesting player can open it.
   */
  async issueLicense(
    userId: string,
    contentId: string,
    dto: LicenseRequestDto,
  ) {
    if (!this.contentKeys.isConfigured()) {
      throw new ServiceUnavailableException(
        'تشغيل المحتوى على الكمبيوتر غير متاح حالياً',
      );
    }

    const student = await this.repository.findStudent(userId);
    if (!student) {
      throw new UnauthorizedException('المستخدم غير موجود');
    }
    if (student.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('الحساب غير مفعل');
    }
    if (!student.desktopSerial || student.desktopSerial !== dto.serial) {
      throw new ForbiddenException('لا يمكنك تشغيل المحتوى من هذا الجهاز');
    }

    const content = await this.repository.findContent(contentId);
    if (!content?.encryptedFileUrl) {
      throw new NotFoundException('هذا المحتوى غير متاح على تطبيق الكمبيوتر');
    }

    const hasAccess = await this.repository.hasPurchased(
      userId,
      content.section.courseId,
      content.id,
    );
    if (!hasAccess) {
      throw new ForbiddenException('يجب شراء المحتوى أولاً');
    }

    const header = await this.loadHeader(content.encryptedFileUrl);

    const expectedKind =
      content.type === ContentType.VIDEO
        ? ProtectedKind.VIDEO
        : content.type === ContentType.PDF
          ? ProtectedKind.PDF
          : null;
    if (header.kind !== expectedKind) {
      throw new UnprocessableEntityException(
        'الملف المحمي لا يطابق نوع المحتوى',
      );
    }

    if (!this.contentKeys.matchesKeyId(header.keyId)) {
      this.logger.error(
        `Content ${content.id} was encrypted for key ${header.keyId.toString('hex')}, which is not the key on this server`,
      );
      throw new UnprocessableEntityException(
        'الملف المحمي مشفر بمفتاح مختلف، يجب إعادة تشفيره',
      );
    }

    let contentKey: Buffer;
    try {
      contentKey = this.contentKeys.unwrap(header.wrappedKey);
    } catch (error) {
      this.logger.error(
        `Content ${content.id}: content key could not be unwrapped: ${String(error)}`,
      );
      throw new UnprocessableEntityException(
        'الملف المحمي تالف، يجب إعادة تشفيره',
      );
    }

    try {
      const license = sealLicense(
        contentKey,
        header.fileId,
        content.id,
        dto.clientPublicKey,
        (message) => this.contentKeys.signLicense(message),
      );

      return {
        message: 'تم إصدار ترخيص التشغيل بنجاح',
        data: {
          contentId: content.id,
          ...license,
          issuedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      if (error instanceof InvalidClientKeyError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    } finally {
      contentKey.fill(0);
    }
  }

  private async loadHeader(url: string): Promise<ProtectedFileHeader> {
    const cached = this.headerCache.get(url);
    if (cached) return cached;

    let header: ProtectedFileHeader;
    try {
      header = parseProtectedHeader(await this.readFilePrefix(url));
    } catch (error) {
      if (error instanceof ProtectedHeaderError) {
        throw new UnprocessableEntityException(
          'الملف المرفوع ليس ملفاً محمياً صالحاً',
        );
      }
      this.logger.error(
        `Protected file header could not be read from ${url}: ${String(error)}`,
      );
      throw new ServiceUnavailableException(
        'تعذر تحميل ملف المحتوى، حاول مرة أخرى',
      );
    }

    if (this.headerCache.size >= HEADER_CACHE_SIZE) {
      const oldest = this.headerCache.keys().next().value;
      if (oldest !== undefined) this.headerCache.delete(oldest);
    }
    this.headerCache.set(url, header);
    return header;
  }

  /** The first bytes of a file, which hold the whole header. */
  private async readFilePrefix(url: string): Promise<Buffer> {
    const length = PROTECTED_MAX_HEADER_LENGTH;

    const fileKey = this.s3Service.extractFileKeyFromUrl(url);
    if (fileKey) {
      return this.s3Service.getObjectRange(fileKey, 0, length - 1);
    }

    // Files hosted outside the bucket (a CDN, or /uploads in development).
    const { protocol } = new URL(url);
    if (protocol !== 'https:' && protocol !== 'http:') {
      throw new ProtectedHeaderError('Unsupported file URL');
    }

    const response = await axios.get<Readable>(url, {
      headers: { Range: `bytes=0-${length - 1}` },
      responseType: 'stream',
      timeout: 15_000,
      maxRedirects: 3,
    });

    // A server that ignores Range sends the whole file, so stop reading
    // once the header is in.
    const chunks: Buffer[] = [];
    let received = 0;
    for await (const chunk of response.data) {
      chunks.push(chunk as Buffer);
      received += (chunk as Buffer).length;
      if (received >= length) break;
    }
    response.data.destroy();

    return Buffer.concat(chunks).subarray(0, length);
  }
}
