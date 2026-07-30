import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsUUID,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateGradeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsUUID('4')
  @IsNotEmpty()
  educationLevelId: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  order?: number;
}
