import { IsArray, IsString, IsNotEmpty, ArrayMinSize } from 'class-validator';

export class BulkDeleteQuestionsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  questionIds: string[];
}
