import { IsString, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateQuizDto } from './create-quiz.dto';

export class BulkCreateQuizItemDto extends CreateQuizDto {
  @IsString()
  @IsNotEmpty()
  contentId: string;
}

export class BulkCreateQuizzesDto {
  @ValidateNested({ each: true })
  @Type(() => BulkCreateQuizItemDto)
  quizzes: BulkCreateQuizItemDto[];
}
