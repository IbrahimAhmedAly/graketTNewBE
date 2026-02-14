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

  async delete(id: string) {
    return this.prisma.content.delete({
      where: { id },
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
}
