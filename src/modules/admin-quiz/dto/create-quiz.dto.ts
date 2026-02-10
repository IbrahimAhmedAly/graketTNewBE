import { IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateQuizDto {
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @IsOptional()
  timeLimit?: number;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @IsOptional()
  passingScore?: number;
}
