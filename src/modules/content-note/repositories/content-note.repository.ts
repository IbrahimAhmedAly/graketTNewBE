import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ContentNoteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async contentExists(contentId: string): Promise<boolean> {
    const c = await this.prisma.content.findUnique({
      where: { id: contentId },
      select: { id: true },
    });
    return !!c;
  }

  async findByUserAndContent(userId: string, contentId: string) {
    return this.prisma.contentNote.findUnique({
      where: { userId_contentId: { userId, contentId } },
    });
  }

  async upsert(userId: string, contentId: string, body: string) {
    return this.prisma.contentNote.upsert({
      where: { userId_contentId: { userId, contentId } },
      create: { userId, contentId, body },
      update: { body },
    });
  }

  async delete(userId: string, contentId: string) {
    return this.prisma.contentNote.deleteMany({
      where: { userId, contentId },
    });
  }

  async findAllForCourse(userId: string, courseId: string) {
    // Return all notes for this user on any content belonging to courseId,
    // ordered by content order within section, then section order.
    return this.prisma.contentNote.findMany({
      where: {
        userId,
        content: {
          section: { courseId },
        },
      },
      include: {
        content: {
          select: {
            id: true,
            title: true,
            type: true,
            order: true,
            section: {
              select: { id: true, title: true, order: true },
            },
          },
        },
      },
      orderBy: [{ updatedAt: 'desc' }],
    });
  }
}
