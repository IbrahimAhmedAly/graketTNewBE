import { IsUUID, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

export class MarkContentCompleteDto {
  @IsUUID('4', { message: 'معرف المحتوى غير صالح' })
  @IsNotEmpty({ message: 'معرف المحتوى مطلوب' })
  contentId: string;

  @IsOptional()
  @IsBoolean()
  completed?: boolean = true;
}
