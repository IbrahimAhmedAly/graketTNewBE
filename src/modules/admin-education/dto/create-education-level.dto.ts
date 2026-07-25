import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateEducationLevelDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  order?: number;
}
