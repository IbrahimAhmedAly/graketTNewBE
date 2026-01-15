import { Module } from '@nestjs/common';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';
import { JwtModule } from '../jwt/jwt.module';

// Repositories
import { CategoryRepository } from './repositories/category.repository';

@Module({
  imports: [JwtModule],
  controllers: [CategoryController],
  providers: [CategoryService, CategoryRepository],
  exports: [CategoryService, CategoryRepository],
})
export class CategoryModule {}
