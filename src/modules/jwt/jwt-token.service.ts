import { Injectable, UnauthorizedException } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as jwt from 'jsonwebtoken';
import { envConfig } from '../../config/env.config';
import {
  JwtPayload,
  AuthTokens,
  TokenUser,
  TokenType,
  TokenVerificationOptions,
} from './interfaces/jwt.interfaces';

@Injectable()
export class JwtTokenService {
  private readonly JWT_PRIVATE_KEY: string;
  private readonly JWT_PUBLIC_KEY: string;

  constructor() {
    try {
      this.JWT_PRIVATE_KEY = readFileSync(
        join(process.cwd(), 'private.key'),
        'utf8',
      );
      this.JWT_PUBLIC_KEY = readFileSync(
        join(process.cwd(), 'public.key'),
        'utf8',
      );
    } catch (_error) {
      throw new Error(
        'JWT keys not found. Generate them with: npm run generate:keys',
      );
    }
  }

  /**
   * Generate a JWT token
   */
  generateToken(payload: any, expiresIn: string, type: TokenType): string {
    if (!expiresIn || typeof expiresIn !== 'string') {
      throw new Error(`Invalid expiresIn value: ${expiresIn}`);
    }

    const tokenPayload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: payload,
      type,
    };

    const signOptions: jwt.SignOptions = {
      expiresIn: expiresIn as any,
      algorithm: 'RS256',
    };

    try {
      return jwt.sign(tokenPayload, this.JWT_PRIVATE_KEY, signOptions);
    } catch (error) {
      console.error('JWT sign error:', error);
      throw new Error(`Failed to generate JWT token: ${error.message}`);
    }
  }

  /**
   * Verify a JWT token
   */
  async verifyToken(
    token: string,
    expectedType: TokenType,
    options?: TokenVerificationOptions,
  ): Promise<JwtPayload> {
    try {
      const decoded = jwt.verify(token, this.JWT_PUBLIC_KEY, {
        algorithms: ['RS256'],
        ignoreExpiration: options?.ignoreExpiration || false,
      }) as JwtPayload;

      if (decoded.type !== expectedType) {
        throw new UnauthorizedException('Invalid token type');
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        const message = options?.expiredTokenMessage || 'Token has expired';
        throw new UnauthorizedException(message);
      }

      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedException('Invalid token');
      }

      throw error;
    }
  }

  async generateAuthTokens(
    user: TokenUser,
    includeRefreshToken: boolean = true,
  ): Promise<AuthTokens> {
    try {
      const result: AuthTokens = {
        access: {
          token: this.generateToken(
            user,
            envConfig.jwt.accessTokenExpiry,
            TokenType.ACCESS,
          ),
          expires: this.getExpirationDate(envConfig.jwt.accessTokenExpiry),
        },
      };

      if (includeRefreshToken) {
        result.refresh = {
          token: this.generateToken(
            { id: user.id },
            envConfig.jwt.refreshTokenExpiry,
            TokenType.REFRESH,
          ),
          expires: this.getExpirationDate(envConfig.jwt.refreshTokenExpiry),
        };
      }

      return result;
    } catch (error) {
      console.error('Error generating auth tokens:', error);
      throw error;
    }
  }

  /**
   * Generate email verification token (15 minutes expiration)
   */
  generateEmailVerificationToken(userId: string, email: string): string {
    return this.generateToken(
      { id: userId, email },
      '15m',
      TokenType.EMAIL_VERIFICATION,
    );
  }

  /**
   * Generate forgot password token (30 minutes expiration)
   */
  generateForgotPasswordToken(userId: string, email: string): string {
    return this.generateToken(
      { id: userId, email },
      '30m',
      TokenType.FORGOT_PASSWORD,
    );
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
