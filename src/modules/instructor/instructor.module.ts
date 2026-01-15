import { Module } from '@nestjs/common';
import { InstructorController } from './instructor.controller';
import { InstructorService } from './instructor.service';
import { JwtModule } from '../jwt/jwt.module';

// Repositories
import { InstructorRepository } from './repositories/instructor.repository';

@Module({
  imports: [JwtModule],
  controllers: [InstructorController],
  providers: [InstructorService, InstructorRepository],
  exports: [InstructorService, InstructorRepository],
})
export class InstructorModule {}
