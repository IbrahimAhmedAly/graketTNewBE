import { IsString, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateContentDto } from './update-content.dto';

export class BulkUpdateContentItemDto extends UpdateContentDto {
  @IsString()
  @IsNotEmpty()
  id: string;
}

export class BulkUpdateContentsDto {
  @ValidateNested({ each: true })
  @Type(() => BulkUpdateContentItemDto)
  contents: BulkUpdateContentItemDto[];
}
