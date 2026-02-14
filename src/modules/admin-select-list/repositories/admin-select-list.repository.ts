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
}
