import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class EducationRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** All education levels with their grades — powers the signup picker */
  async findAllLevels() {
    return this.prisma.educationLevel.findMany({
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        order: true,
        grades: {
          orderBy: [{ order: 'asc' }, { name: 'asc' }],
          select: { id: true, name: true, order: true },
        },
      },
    });
  }

  /** Grades of a single level — for a dependent "grade" dropdown */
  async findGradesByLevel(educationLevelId: string) {
    return this.prisma.grade.findMany({
      where: { educationLevelId },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, order: true, educationLevelId: true },
    });
  }

  async levelExists(id: string): Promise<boolean> {
    const count = await this.prisma.educationLevel.count({ where: { id } });
    return count > 0;
  }

  /** The level a grade belongs to, or null when the grade doesn't exist */
  async findGradeLevelId(gradeId: string): Promise<string | null> {
    const grade = await this.prisma.grade.findUnique({
      where: { id: gradeId },
      select: { educationLevelId: true },
    });
    return grade?.educationLevelId ?? null;
  }
}
