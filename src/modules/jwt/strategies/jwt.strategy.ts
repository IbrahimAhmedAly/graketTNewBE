import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { readFileSync } from 'fs';
import { join } from 'path';
import { UserStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * JWT Payload structure
 */
export interface JwtPayload {
  sub: {
    id: string;
    email: string;
  };
  type: string;
  iat: number;
  exp: number;
}

/**
 * JWT Strategy for Passport
 * Validates JWT tokens and extracts user information
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly prisma: PrismaService) {
    const publicKey = readFileSync(join(process.cwd(), 'public.key'), 'utf8');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: publicKey,
      algorithms: ['RS256'],
    });
  }

  /**
   * Validate JWT payload and return user
   * This method is called automatically by Passport after token verification
   */
  async validate(payload: JwtPayload) {
    // Validate token type
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    // Extract user ID from payload
    const userId = payload.sub.id;

    // Find user in database
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        educationLevelId: true,
        gradeId: true,
      },
    });

    // Check if user exists
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Check if user is active
    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Account is not active');
    }

    // Return user object (will be attached to request.user)
    return user;
  }
}
