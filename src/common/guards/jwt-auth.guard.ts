import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtTokenService } from '../../modules/jwt/jwt-token.service';
import { TokenType } from '../../modules/jwt/interfaces/jwt.interfaces';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtTokenService: JwtTokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is required');
    }

    const token = this.jwtTokenService.extractFromHeader(authHeader);
    if (!token) {
      throw new UnauthorizedException('Invalid authorization format');
    }

    try {
      const decoded = await this.jwtTokenService.verifyToken(
        token,
        TokenType.ACCESS,
      );

      // Add user info to request
      request.user = decoded.sub;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
