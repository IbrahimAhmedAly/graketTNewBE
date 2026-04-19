import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class UpsertNoteDto {
  @IsString({ message: 'المحتوى يجب أن يكون نصاً' })
  @IsNotEmpty({ message: 'المحتوى مطلوب' })
  @MaxLength(10000, { message: 'الملاحظة طويلة جداً' })
  body: string;
}
