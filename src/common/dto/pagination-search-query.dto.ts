import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from './pagination-query.dto';

export class PaginationSearchQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;
}
