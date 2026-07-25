import { Controller, Get, Param } from '@nestjs/common';
import { EducationService } from './education.service';

/**
 * Public education controller — serves the level/grade pickers.
 * No auth: the student must choose a level and grade before/while registering.
 */
@Controller('education-levels')
export class EducationController {
  constructor(private readonly educationService: EducationService) {}

  /**
   * Get all education levels, each with its grades nested
   * GET /education-levels
   */
  @Get()
  findAllLevels() {
    return this.educationService.findAllLevels();
  }

  /**
   * Get the grades of a single education level
   * GET /education-levels/:id/grades
   */
  @Get(':id/grades')
  findGradesByLevel(@Param('id') id: string) {
    return this.educationService.findGradesByLevel(id);
  }
}
