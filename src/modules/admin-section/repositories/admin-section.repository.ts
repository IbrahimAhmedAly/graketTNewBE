import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateSectionDto, UpdateSectionDto } from '../dto';

@Injectable()
export class AdminSectionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(courseId: string, data: CreateSectionDto) {
    return this.prisma.section.create({
      data: {
        title: data.title,
        order: data.order,
        courseId,
      },
      include: {
        _count: {
          select: {
            contents: true,
          },
        },
      },
    });
  }

  async findById(id: string) {
    return this.prisma.section.findUnique({
      where: { id },
      include: {
        course: {
          select: {
            id: true,
            title: true,
          },
        },
        contents: {
          orderBy: { order: 'asc' },
          include: {
            quiz: {
              select: {
                id: true,
                timeLimit: true,
                passingScore: true,
                _count: {
                  select: {
                    questions: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async update(id: string, data: UpdateSectionDto) {
    return this.prisma.section.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.order !== undefined && { order: data.order }),
      },
      include: {
        _count: {
          select: {
            contents: true,
          },
        },
      },
    });
  }

  async delete(id: string) {
    return this.prisma.section.delete({
      where: { id },
    });
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.section.count({
      where: { id },
    });
    return count > 0;
  }

  async courseExists(courseId: string): Promise<boolean> {
    const count = await this.prisma.course.count({
      where: { id: courseId },
    });
    return count > 0;
  }

  async reorderSections(sectionIds: string[]) {
    // Update each section's order based on its position in the array
    const updates = sectionIds.map((sectionId, index) =>
      this.prisma.section.update({
        where: { id: sectionId },
        data: { order: index },
      }),
    );

    return this.prisma.$transaction(updates);
  }
}
