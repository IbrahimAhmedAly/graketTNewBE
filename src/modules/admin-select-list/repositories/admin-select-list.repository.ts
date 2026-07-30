import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AdminSelectListRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllInstructors() {
    return this.prisma.instructor.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findAllCategories() {
    return this.prisma.category.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findAllCourses() {
    return this.prisma.course.findMany({
      select: {
        id: true,
        title: true,
      },
      orderBy: { title: 'asc' },
    });
  }

  async findAllEducationLevels() {
    return this.prisma.educationLevel.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });
  }

  /** Grades for the dependent dropdown; pass a level to scope the list */
  async findAllGrades(educationLevelId?: string) {
    return this.prisma.grade.findMany({
      where: educationLevelId ? { educationLevelId } : {},
      select: {
        id: true,
        name: true,
        educationLevelId: true,
      },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });
  }

  async findAllUsers(search?: string) {
    return this.prisma.user.findMany({
      where: {
        status: { not: 'DELETED' },
        ...(search
          ? {
              OR: [
                { name: { contains: search } },
                { email: { contains: search } },
                { serial: { contains: search } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }
}
