import { IsString, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateQuestionDto } from './create-question.dto';

export class BulkCreateQuestionItemDto extends CreateQuestionDto {
  @IsString()
  @IsNotEmpty()
  quizId: string;
}

export class BulkCreateQuestionsDto {
  @ValidateNested({ each: true })
  @Type(() => BulkCreateQuestionItemDto)
  questions: BulkCreateQuestionItemDto[];
}
