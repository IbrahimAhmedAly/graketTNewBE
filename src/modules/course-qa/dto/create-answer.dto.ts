import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateAnswerDto {
  @IsString({ message: 'المحتوى يجب أن يكون نصاً' })
  @IsNotEmpty({ message: 'المحتوى مطلوب' })
  @MinLength(1)
  @MaxLength(5000)
  body: string;
}
