import { IsString, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateSectionDto } from './update-section.dto';

export class BulkUpdateSectionItemDto extends UpdateSectionDto {
  @IsString()
  @IsNotEmpty()
  id: string;
}

export class BulkUpdateSectionsDto {
  @ValidateNested({ each: true })
  @Type(() => BulkUpdateSectionItemDto)
  sections: BulkUpdateSectionItemDto[];
}
