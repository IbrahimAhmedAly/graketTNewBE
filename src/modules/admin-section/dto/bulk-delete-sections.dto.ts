import { IsArray, IsString, IsNotEmpty, ArrayMinSize } from 'class-validator';

export class BulkDeleteSectionsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  sectionIds: string[];
}
