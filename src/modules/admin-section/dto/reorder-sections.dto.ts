import { IsArray, IsUUID, ArrayMinSize } from 'class-validator';

export class ReorderSectionsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  sectionIds: string[];
}
