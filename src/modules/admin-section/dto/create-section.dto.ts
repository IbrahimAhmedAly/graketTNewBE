import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSectionDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  order: number;
}
