import { IsString, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateContentDto } from './create-content.dto';

export class BulkCreateContentItemDto extends CreateContentDto {
  @IsString()
  @IsNotEmpty()
  sectionId: string;
}

export class BulkCreateContentsDto {
  @ValidateNested({ each: true })
  @Type(() => BulkCreateContentItemDto)
  contents: BulkCreateContentItemDto[];
}
