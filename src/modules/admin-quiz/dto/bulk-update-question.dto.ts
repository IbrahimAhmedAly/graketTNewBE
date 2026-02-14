import { IsString, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateQuestionDto } from './update-question.dto';

export class BulkUpdateQuestionItemDto extends UpdateQuestionDto {
  @IsString()
  @IsNotEmpty()
  id: string;
}

export class BulkUpdateQuestionsDto {
  @ValidateNested({ each: true })
  @Type(() => BulkUpdateQuestionItemDto)
  questions: BulkUpdateQuestionItemDto[];
}
