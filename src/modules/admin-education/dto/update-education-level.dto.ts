import { PartialType } from '@nestjs/mapped-types';
import { CreateEducationLevelDto } from './create-education-level.dto';

export class UpdateEducationLevelDto extends PartialType(
  CreateEducationLevelDto,
) {}
