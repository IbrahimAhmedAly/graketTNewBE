import { Injectable } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { readFileSync } from 'fs';
import { join } from 'path';
import { envConfig } from '../../config/env.config';

/**
 * Token types
 */
export enum TokenType {
  ACCESS = 'access',
  REFRESH = 'refresh',
  VERIFICATION = 'verification',
}

/**
 * Token structure
 */
export interface Token {
  token: string;
  expires: Date;
}

/**
 * Auth tokens response
 */
export interface AuthTokens {
  access: Token;
  refresh?: Token;
}

/**
 * JWT Service
 * Handles token generation using NestJS JWT module
 */
@Injectable()
export class JwtTokenService {
  private readonly privateKey: string;

  constructor(private readonly jwtService: NestJwtService) {
    try {
      this.privateKey = readFileSync(join(process.cwd(), 'private.key'), 'utf8');
    } catch (error) {
      throw new Error(
        'JWT keys not found. Generate them with: npm run generate:keys',
      );
    }
  }

  /**
   * Generate access and refresh tokens
   */
  async generateAuthTokens(
    user: { id: string; email: string },
    includeRefreshToken: boolean = true,
  ): Promise<AuthTokens> {
    const accessToken = this.jwtService.sign(
      {
        sub: { id: user.id, email: user.email },
        type: TokenType.ACCESS,
      },
      {
        secret: this.privateKey,
        algorithm: 'RS256',
        expiresIn: envConfig.jwt.accessTokenExpiry as any,
      },
    );

    const result: AuthTokens = {
      access: {
        token: accessToken,
        expires: this.getExpirationDate(envConfig.jwt.accessTokenExpiry),
      },
    };

    if (includeRefreshToken) {
      const refreshToken = this.jwtService.sign(
        {
          sub: { id: user.id },
          type: TokenType.REFRESH,
        },
        {
          secret: this.privateKey,
          algorithm: 'RS256',
          expiresIn: envConfig.jwt.refreshTokenExpiry as any,
        },
      );

      result.refresh = {
        token: refreshToken,
        expires: this.getExpirationDate(envConfig.jwt.refreshTokenExpiry),
      };
    }

    return result;
  }

  /**
   * Generate verification token (for email verification, password reset, etc.)
   */
  generateVerificationToken(
    userId: string,
    purpose: string,
    expiresIn: string = '30m',
  ): string {
    return this.jwtService.sign(
      {
        sub: { id: userId },
        type: TokenType.VERIFICATION,
        purpose,
      },
      {
        secret: this.privateKey,
        algorithm: 'RS256',
        expiresIn: expiresIn as any,
      },
    );
  }

  /**
   * Verify verification token
   */
  async verifyVerificationToken(
    token: string,
    expectedPurpose: string,
  ): Promise<string> {
    try {
      const payload = this.jwtService.verify(token, {
        algorithms: ['RS256'],
      });

      if (payload.type !== TokenType.VERIFICATION) {
        throw new Error('Invalid token type');
      }

      if (payload.purpose !== expectedPurpose) {
        throw new Error('Invalid token purpose');
      }

      return payload.sub.id;
    } catch (error) {
      throw new Error('Invalid or expired verification token');
    }
  }

  /**
   * Verify refresh token
   */
  async verifyRefreshToken(token: string): Promise<string> {
    try {
      const payload = this.jwtService.verify(token, {
        algorithms: ['RS256'],
      });

      if (payload.type !== TokenType.REFRESH) {
        throw new Error('Invalid token type');
      }

      return payload.sub.id;
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Verify access token (for guards)
   */
  async verifyAccessToken(token: string): Promise<{ id: string; email: string }> {
    try {
      const payload = this.jwtService.verify(token, {
        algorithms: ['RS256'],
      });

      if (payload.type !== TokenType.ACCESS) {
        throw new Error('Invalid token type');
      }

      return payload.sub;
    } catch (error) {
      throw new Error('Invalid or expired access token');
    }
  }

  /**
   * Extract token from Authorization header
   */
  extractFromHeader(authHeader?: string): string | null {
    return authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
  }

  /**
   * Get expiration date from expiry string
   */
  private getExpirationDate(expiry: string): Date {
    const now = new Date();

    if (!expiry || typeof expiry !== 'string') {
      return new Date(now.getTime() + 60 * 60 * 1000);
    }

    const match = expiry.match(/^(\d+)([smhd])$/);

    if (!match) {
      return new Date(now.getTime() + 60 * 60 * 1000);
    }

    const [, value, unit] = match;
    const num = parseInt(value, 10);

    const multipliers = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return new Date(
      now.getTime() +
        num * (multipliers[unit as keyof typeof multipliers] || multipliers.h),
    );
  }
}
