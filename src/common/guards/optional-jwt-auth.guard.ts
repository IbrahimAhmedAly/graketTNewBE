import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtTokenService } from '../../modules/jwt/jwt.service';

/**
 * Optional JWT Auth Guard
 * Allows both authenticated and unauthenticated requests.
 * If a valid JWT token is provided, attaches user to request.
 * If no token or invalid token, continues without error.
 */
@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(private readonly jwtTokenService: JwtTokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    // No auth header - continue without user
    if (!authHeader) {
      return true;
    }

    const token = this.jwtTokenService.extractFromHeader(authHeader);
    if (!token) {
      return true;
    }

    try {
      const decoded = await this.jwtTokenService.verifyAccessToken(token);
      request.user = decoded;
    } catch {
      // Invalid token - continue without user
    }

    return true;
  }
}
