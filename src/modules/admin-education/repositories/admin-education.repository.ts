import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateEducationLevelDto,
  UpdateEducationLevelDto,
  QueryEducationLevelDto,
  CreateGradeDto,
  UpdateGradeDto,
  QueryGradeDto,
} from '../dto';

@Injectable()
export class AdminEducationRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================
  // EDUCATION LEVELS
  // ============================================

  async createLevel(data: CreateEducationLevelDto) {
    return this.prisma.educationLevel.create({
      data: {
        name: data.name,
        order: data.order ?? 0,
      },
    });
  }

  async findAllLevels(query: QueryEducationLevelDto) {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.EducationLevelWhereInput = {
      ...(search && { name: { contains: search, mode: 'insensitive' } }),
    };

    return Promise.all([
      this.prisma.educationLevel.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ order: 'asc' }, { name: 'asc' }],
        include: {
          grades: {
            orderBy: [{ order: 'asc' }, { name: 'asc' }],
            select: { id: true, name: true, order: true },
          },
          _count: { select: { grades: true, users: true, courses: true } },
        },
      }),
      this.prisma.educationLevel.count({ where }),
    ]);
  }

  async findLevelById(id: string) {
    return this.prisma.educationLevel.findUnique({
      where: { id },
      include: {
        grades: {
          orderBy: [{ order: 'asc' }, { name: 'asc' }],
          select: { id: true, name: true, order: true },
        },
        _count: { select: { grades: true, users: true, courses: true } },
      },
    });
  }

  async findLevelByName(name: string) {
    return this.prisma.educationLevel.findUnique({ where: { name } });
  }

  async updateLevel(id: string, data: UpdateEducationLevelDto) {
    return this.prisma.educationLevel.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.order !== undefined && { order: data.order }),
      },
    });
  }

  async deleteLevel(id: string) {
    return this.prisma.educationLevel.delete({ where: { id } });
  }

  async levelExists(id: string): Promise<boolean> {
    const count = await this.prisma.educationLevel.count({ where: { id } });
    return count > 0;
  }

  /** Counts of records that would block deleting a level */
  async countLevelDependents(id: string) {
    const [users, courses] = await Promise.all([
      this.prisma.user.count({ where: { educationLevelId: id } }),
      this.prisma.course.count({ where: { educationLevelId: id } }),
    ]);
    return { users, courses };
  }

  // ============================================
  // GRADES
  // ============================================

  async createGrade(data: CreateGradeDto) {
    return this.prisma.grade.create({
      data: {
        name: data.name,
        educationLevelId: data.educationLevelId,
        order: data.order ?? 0,
      },
      include: {
        educationLevel: { select: { id: true, name: true } },
      },
    });
  }

  async findAllGrades(query: QueryGradeDto) {
    const { page = 1, limit = 10, search, educationLevelId } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.GradeWhereInput = {
      ...(educationLevelId && { educationLevelId }),
      ...(search && { name: { contains: search, mode: 'insensitive' } }),
    };

    return Promise.all([
      this.prisma.grade.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ order: 'asc' }, { name: 'asc' }],
        include: {
          educationLevel: { select: { id: true, name: true } },
          _count: { select: { users: true, courses: true } },
        },
      }),
      this.prisma.grade.count({ where }),
    ]);
  }

  async findGradeById(id: string) {
    return this.prisma.grade.findUnique({
      where: { id },
      include: {
        educationLevel: { select: { id: true, name: true } },
        _count: { select: { users: true, courses: true } },
      },
    });
  }

  /** A grade name must be unique within its level */
  async findGradeByNameInLevel(educationLevelId: string, name: string) {
    return this.prisma.grade.findUnique({
      where: { educationLevelId_name: { educationLevelId, name } },
    });
  }

  async updateGrade(id: string, data: UpdateGradeDto) {
    return this.prisma.grade.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.educationLevelId !== undefined && {
          educationLevelId: data.educationLevelId,
        }),
        ...(data.order !== undefined && { order: data.order }),
      },
      include: {
        educationLevel: { select: { id: true, name: true } },
      },
    });
  }

  async deleteGrade(id: string) {
    return this.prisma.grade.delete({ where: { id } });
  }

  async gradeExists(id: string): Promise<boolean> {
    const count = await this.prisma.grade.count({ where: { id } });
    return count > 0;
  }

  /** Counts of records that would block deleting a grade */
  async countGradeDependents(id: string) {
    const [users, courses] = await Promise.all([
      this.prisma.user.count({ where: { gradeId: id } }),
      this.prisma.course.count({ where: { gradeId: id } }),
    ]);
    return { users, courses };
  }
}
