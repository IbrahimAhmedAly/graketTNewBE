import { IsArray, IsString, IsNotEmpty, ArrayMinSize } from 'class-validator';

export class BulkDeleteQuizzesDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  quizIds: string[];
}
