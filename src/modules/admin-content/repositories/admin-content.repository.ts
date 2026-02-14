import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateContentDto, UpdateContentDto } from '../dto';

@Injectable()
export class AdminContentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(sectionId: string, data: CreateContentDto) {
    return this.prisma.content.create({
      data: {
        title: data.title,
        type: data.type,
        order: data.order,
        duration: data.duration,
        videoUrl: data.videoUrl,
        pdfUrl: data.pdfUrl,
        fileSize: data.fileSize,
        sectionId,
      },
      include: {
        section: {
          select: {
            id: true,
            title: true,
            courseId: true,
          },
        },
        quiz: {
          select: {
            id: true,
            timeLimit: true,
            passingScore: true,
          },
        },
      },
    });
  }

  async createMany(sectionId: string, items: CreateContentDto[]) {
    return this.prisma.$transaction(
      items.map((data) =>
        this.prisma.content.create({
          data: {
            title: data.title,
            type: data.type,
            order: data.order,
            duration: data.duration,
            videoUrl: data.videoUrl,
            pdfUrl: data.pdfUrl,
            fileSize: data.fileSize,
            sectionId,
          },
          include: {
            section: {
              select: {
                id: true,
                title: true,
                courseId: true,
              },
            },
            quiz: {
              select: {
                id: true,
                timeLimit: true,
                passingScore: true,
              },
            },
          },
        }),
      ),
    );
  }

  async createManyAcrossSections(
    items: Array<{ sectionId: string; data: CreateContentDto }>,
  ) {
    return this.prisma.$transaction(
      items.map(({ sectionId, data }) =>
        this.prisma.content.create({
          data: {
            title: data.title,
            type: data.type,
            order: data.order,
            duration: data.duration,
            videoUrl: data.videoUrl,
            pdfUrl: data.pdfUrl,
            fileSize: data.fileSize,
            sectionId,
          },
          include: {
            section: {
              select: {
                id: true,
                title: true,
                courseId: true,
              },
            },
            quiz: {
              select: {
                id: true,
                timeLimit: true,
                passingScore: true,
              },
            },
          },
        }),
      ),
    );
  }

  async findById(id: string) {
    return this.prisma.content.findUnique({
      where: { id },
      include: {
        section: {
          select: {
            id: true,
            title: true,
            order: true,
            course: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
        quiz: {
          include: {
            questions: {
              orderBy: { order: 'asc' },
              include: {
                options: {
                  orderBy: { order: 'asc' },
                },
              },
            },
          },
        },
      },
    });
  }

  async update(id: string, data: UpdateContentDto) {
    return this.prisma.content.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.type && { type: data.type }),
        ...(data.order !== undefined && { order: data.order }),
        ...(data.duration !== undefined && { duration: data.duration }),
        ...(data.videoUrl !== undefined && { videoUrl: data.videoUrl }),
        ...(data.pdfUrl !== undefined && { pdfUrl: data.pdfUrl }),
        ...(data.fileSize !== undefined && { fileSize: data.fileSize }),
      },
      include: {
        section: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });
  }

  async updateMany(contents: Array<{ id: string; data: UpdateContentDto }>) {
    const updates = contents.map(({ id, data }) =>
      this.prisma.content.update({
        where: { id },
        data: {
          ...(data.title && { title: data.title }),
          ...(data.type && { type: data.type }),
          ...(data.order !== undefined && { order: data.order }),
          ...(data.duration !== undefined && { duration: data.duration }),
          ...(data.videoUrl !== undefined && { videoUrl: data.videoUrl }),
          ...(data.pdfUrl !== undefined && { pdfUrl: data.pdfUrl }),
          ...(data.fileSize !== undefined && { fileSize: data.fileSize }),
        },
        include: {
          section: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      }),
    );

    return this.prisma.$transaction(updates);
  }

  async delete(id: string) {
    return this.prisma.content.delete({
      where: { id },
    });
  }

  async deleteMany(ids: string[]) {
    return this.prisma.content.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    });
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.content.count({
      where: { id },
    });
    return count > 0;
  }

  async sectionExists(sectionId: string): Promise<boolean> {
    const count = await this.prisma.section.count({
      where: { id: sectionId },
    });
    return count > 0;
  }

  async findManySectionsByIds(sectionIds: string[]) {
    return this.prisma.section.findMany({
      where: {
        id: {
          in: sectionIds,
        },
      },
      select: {
        id: true,
        courseId: true,
      },
    });
  }

  async findManyContentsByIds(ids: string[]) {
    return this.prisma.content.findMany({
      where: {
        id: {
          in: ids,
        },
      },
      include: {
        section: {
          select: {
            id: true,
            title: true,
            course: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
    });
  }

  async findCourseIdsByContents(contentIds: string[]): Promise<string[]> {
    const contents = await this.prisma.content.findMany({
      where: {
        id: {
          in: contentIds,
        },
      },
      select: {
        section: {
          select: {
            courseId: true,
          },
        },
      },
    });

    // Return unique course IDs
    return [...new Set(contents.map((c) => c.section.courseId))];
  }
}
