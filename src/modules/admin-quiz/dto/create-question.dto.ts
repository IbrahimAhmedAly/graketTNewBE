import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class OptionDto {
  @IsString()
  @IsNotEmpty()
  text: string;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  order: number;
}

export class CreateQuestionDto {
  @IsString()
  @IsNotEmpty()
  questionText: string;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  order: number;

  @IsNumber()
  @Type(() => Number)
  @Min(1)
  points: number;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(2)
  @Type(() => OptionDto)
  options: OptionDto[];

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  correctOptionIndex: number; // Index of the correct option in the options array
}
