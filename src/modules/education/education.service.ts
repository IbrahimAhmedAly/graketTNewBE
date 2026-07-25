import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EducationRepository } from './repositories/education.repository';

@Injectable()
export class EducationService {
  constructor(private readonly repository: EducationRepository) {}

  /**
   * Verifies an education level exists and that the grade (when given)
   * belongs to it. Shared by course and user creation so a record can never
   * end up with a mismatched pair such as "University / Grade 7".
   *
   * @param educationLevelId level to check, or undefined to skip
   * @param gradeId grade to check, or null/undefined to skip
   */
  async assertValidTargeting(
    educationLevelId?: string,
    gradeId?: string | null,
  ): Promise<void> {
    if (educationLevelId) {
      const exists = await this.repository.levelExists(educationLevelId);
      if (!exists) {
        throw new NotFoundException('Education level not found');
      }
    }

    if (gradeId) {
      const gradeLevelId = await this.repository.findGradeLevelId(gradeId);
      if (!gradeLevelId) {
        throw new NotFoundException('Grade not found');
      }
      if (educationLevelId && gradeLevelId !== educationLevelId) {
        throw new BadRequestException(
          'The selected grade does not belong to the selected education level',
        );
      }
    }
  }

  async findAllLevels() {
    const levels = await this.repository.findAllLevels();
    return {
      message: 'تم جلب المراحل التعليمية بنجاح',
      data: levels,
    };
  }

  async findGradesByLevel(educationLevelId: string) {
    const exists = await this.repository.levelExists(educationLevelId);
    if (!exists) {
      throw new NotFoundException('المرحلة التعليمية غير موجودة');
    }

    const grades = await this.repository.findGradesByLevel(educationLevelId);
    return {
      message: 'تم جلب الصفوف الدراسية بنجاح',
      data: grades,
    };
  }
}
