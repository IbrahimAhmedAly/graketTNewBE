import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtTokenService } from '../../modules/jwt/jwt.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(
    private readonly jwtTokenService: JwtTokenService,
    private readonly prisma: PrismaService,
  ) {}

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
      const decoded = await this.jwtTokenService.verifyAccessToken(token);

      // Check if the user is an admin
      const admin = await this.prisma.admin.findUnique({
        where: { id: decoded.id },
        select: { id: true, email: true, name: true },
      });

      if (!admin) {
        throw new ForbiddenException('Access denied. Admin privileges required');
      }

      // Add admin info to request
      request.admin = admin;
      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
