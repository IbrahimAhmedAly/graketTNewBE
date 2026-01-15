import { Global, Module } from '@nestjs/common';
import { JwtModule as NestJwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { readFileSync } from 'fs';
import { join } from 'path';

import { JwtTokenService } from './jwt.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Global()
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    NestJwtModule.register({
      publicKey: readFileSync(join(process.cwd(), 'public.key'), 'utf8'),
      signOptions: {
        algorithm: 'RS256',
      },
    }),
  ],
  providers: [JwtTokenService, JwtStrategy],
  exports: [JwtTokenService, PassportModule],
})
export class JwtModule {}
