import { IsArray, IsString, IsNotEmpty, ArrayMinSize } from 'class-validator';

export class BulkDeleteContentsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  contentIds: string[];
}
