import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UserRepository } from './repositories/user.repository';
import { JwtModule } from '../jwt/jwt.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [JwtModule, PrismaModule],
  controllers: [UserController],
  providers: [UserService, UserRepository],
  exports: [UserService, UserRepository],
})
export class UserModule {}
