import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateQuestionDto {
  @IsString({ message: 'العنوان يجب أن يكون نصاً' })
  @IsNotEmpty({ message: 'العنوان مطلوب' })
  @MinLength(3, { message: 'العنوان قصير جداً' })
  @MaxLength(200, { message: 'العنوان طويل جداً' })
  title: string;

  @IsString({ message: 'المحتوى يجب أن يكون نصاً' })
  @IsNotEmpty({ message: 'المحتوى مطلوب' })
  @MinLength(1)
  @MaxLength(5000)
  body: string;
}
