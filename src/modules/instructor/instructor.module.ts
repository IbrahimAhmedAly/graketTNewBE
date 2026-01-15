import { Module } from '@nestjs/common';
import { InstructorController } from './instructor.controller';
import { InstructorService } from './instructor.service';

// Repositories
import { InstructorRepository } from './repositories/instructor.repository';

@Module({
  controllers: [InstructorController],
  providers: [InstructorService, InstructorRepository],
  exports: [InstructorService, InstructorRepository],
})
export class InstructorModule {}
