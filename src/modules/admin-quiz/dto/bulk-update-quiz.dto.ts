import { IsString, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateQuizDto } from './update-quiz.dto';

export class BulkUpdateQuizItemDto extends UpdateQuizDto {
  @IsString()
  @IsNotEmpty()
  id: string;
}

export class BulkUpdateQuizzesDto {
  @ValidateNested({ each: true })
  @Type(() => BulkUpdateQuizItemDto)
  quizzes: BulkUpdateQuizItemDto[];
}
