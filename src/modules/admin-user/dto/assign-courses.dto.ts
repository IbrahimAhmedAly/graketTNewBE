import {
  IsArray,
  IsUUID,
  ArrayMinSize,
  ArrayMaxSize,
  ArrayUnique,
} from 'class-validator';

export class AssignCoursesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  courseIds: string[];
}
