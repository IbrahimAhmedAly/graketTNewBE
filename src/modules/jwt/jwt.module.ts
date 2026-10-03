import { Global, Module } from '@nestjs/common';
import { JwtModule as NestJwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { envConfig } from '../../config/env.config';
import { JwtTokenService } from './jwt.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Global()
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    NestJwtModule.register({
      secret: envConfig.jwt.secret,
      signOptions: {
        algorithm: 'HS256',
      },
    }),
  ],
  providers: [JwtTokenService, JwtStrategy],
  exports: [JwtTokenService, PassportModule],
})
export class JwtModule {}
