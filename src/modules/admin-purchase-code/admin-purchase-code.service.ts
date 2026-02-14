import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { AdminPurchaseCodeRepository } from './repositories/admin-purchase-code.repository';
import { GenerateCodeDto, UpdateCodeDto, QueryCodeDto } from './dto';
import { PurchaseType } from '@prisma/client';
import { PaginationUtil } from '../../utils/pagination/pagination.util';

@Injectable()
export class AdminPurchaseCodeService {
  constructor(private readonly repository: AdminPurchaseCodeRepository) {}

  /**
   * Generate a random purchase code
   */
  private generateRandomCode(type: PurchaseType, length: number = 12): string {
    const prefix = type === PurchaseType.COURSE ? 'COURSE' : 'VIDEO';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';

    for (let i = 0; i < length; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return `${prefix}-${code}`;
  }

  /**
   * Generate unique code (retry if exists)
   */
  private async generateUniqueCode(type: PurchaseType): Promise<string> {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const code = this.generateRandomCode(type);
      const exists = await this.repository.codeExists(code);

      if (!exists) {
        return code;
      }

      attempts++;
    }

    throw new Error('Failed to generate unique code after maximum attempts');
  }

  async generateCode(adminId: string, generateCodeDto: GenerateCodeDto) {
    // Validate that either courseId or contentId is provided based on type
    if (
      generateCodeDto.type === PurchaseType.COURSE &&
      !generateCodeDto.courseId
    ) {
      throw new BadRequestException('courseId is required for COURSE type');
    }

    if (
      generateCodeDto.type === PurchaseType.VIDEO &&
      !generateCodeDto.contentId
    ) {
      throw new BadRequestException('contentId is required for VIDEO type');
    }

    // Validate that the course or content exists
    if (generateCodeDto.courseId) {
      const courseExists = await this.repository.courseExists(
        generateCodeDto.courseId,
      );
      if (!courseExists) {
        throw new NotFoundException('Course not found');
      }
    }

    if (generateCodeDto.contentId) {
      const contentExists = await this.repository.contentExists(
        generateCodeDto.contentId,
      );
      if (!contentExists) {
        throw new NotFoundException('Content not found');
      }
    }

    // Validate expiration date
    if (generateCodeDto.expiresAt) {
      const expirationDate = new Date(generateCodeDto.expiresAt);
      if (expirationDate <= new Date()) {
        throw new BadRequestException('Expiration date must be in the future');
      }
    }

    const quantity = generateCodeDto.quantity || 1;

    // Generate single code
    if (quantity === 1) {
      const code = await this.generateUniqueCode(generateCodeDto.type);
      const purchaseCode = await this.repository.generateCode(
        adminId,
        generateCodeDto,
        code,
      );

      return {
        message: 'Purchase code generated successfully',
        data: purchaseCode,
      };
    }

    // Generate multiple codes (bulk)
    const codes = [];
    for (let i = 0; i < quantity; i++) {
      const code = await this.generateUniqueCode(generateCodeDto.type);
      const purchaseCode = await this.repository.generateCode(
        adminId,
        generateCodeDto,
        code,
      );
      codes.push(purchaseCode);
    }

    return {
      message: `${quantity} purchase codes generated successfully`,
      data: codes,
    };
  }

  async findAll(query: QueryCodeDto) {
    const { page = 1, limit = 10 } = query;
    const params = PaginationUtil.getPaginationParams(page, limit);

    const [codes, total] = await this.repository.findAll(query);

    // Add status flags to each code
    const now = new Date();
    const codesWithStatus = codes.map((code) => {
      const isExpired = code.expiresAt && new Date(code.expiresAt) < now;
      const isActive = !code.isUsed && !isExpired;
      const remainingUses = code.maxUses - code.usedCount;

      return {
        ...code,
        isExpired,
        isActive,
        remainingUses,
      };
    });

    const paginatedResult = PaginationUtil.paginate(
      codesWithStatus,
      total,
      params,
    );

    return {
      message: 'Purchase codes retrieved successfully',
      data: paginatedResult,
    };
  }

  async findOne(id: string) {
    const code = await this.repository.findById(id);

    if (!code) {
      throw new NotFoundException('Purchase code not found');
    }

    // Add status flags
    const now = new Date();
    const isExpired = code.expiresAt && new Date(code.expiresAt) < now;
    const isActive = !code.isUsed && !isExpired;
    const remainingUses = code.maxUses - code.usedCount;

    return {
      message: 'Purchase code details retrieved successfully',
      data: {
        ...code,
        isExpired,
        isActive,
        remainingUses,
      },
    };
  }

  async update(id: string, updateCodeDto: UpdateCodeDto) {
    // Check if code exists
    const exists = await this.repository.exists(id);
    if (!exists) {
      throw new NotFoundException('Purchase code not found');
    }

    // Validate expiration date if provided
    if (updateCodeDto.expiresAt) {
      const expirationDate = new Date(updateCodeDto.expiresAt);
      if (expirationDate <= new Date()) {
        throw new BadRequestException('Expiration date must be in the future');
      }
    }

    const code = await this.repository.update(id, updateCodeDto);

    return {
      message: 'Purchase code updated successfully',
      data: code,
    };
  }

  async remove(id: string) {
    // Check if code exists
    const exists = await this.repository.exists(id);
    if (!exists) {
      throw new NotFoundException('Purchase code not found');
    }

    // Check if code has been used
    const code = await this.repository.findById(id);
    if (code && code.usedCount > 0) {
      throw new BadRequestException(
        'Cannot delete a purchase code that has been used',
      );
    }

    await this.repository.delete(id);

    return {
      message: 'Purchase code deleted successfully',
    };
  }

  async getStatistics() {
    const stats = await this.repository.getStatistics();

    return {
      message: 'Purchase code statistics retrieved successfully',
      data: stats,
    };
  }

  async expireCode(id: string) {
    // Check if code exists
    const exists = await this.repository.exists(id);
    if (!exists) {
      throw new NotFoundException('Purchase code not found');
    }

    // Set expiration to now
    const code = await this.repository.update(id, {
      expiresAt: new Date().toISOString(),
    });

    return {
      message: 'Purchase code expired successfully',
      data: code,
    };
  }
}
