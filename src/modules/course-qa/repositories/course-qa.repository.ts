import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class CourseQaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async courseExists(courseId: string): Promise<boolean> {
    const c = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true },
    });
    return !!c;
  }

  async createQuestion(params: {
    userId: string;
    courseId: string;
    title: string;
    body: string;
  }) {
    return this.prisma.courseQuestion.create({
      data: params,
      include: {
        user: { select: { id: true, name: true } },
      },
    });
  }

  async findQuestions(params: {
    courseId: string;
    skip: number;
    take: number;
  }) {
    const { courseId, skip, take } = params;
    const [questions, total] = await Promise.all([
      this.prisma.courseQuestion.findMany({
        where: { courseId },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true } },
          _count: { select: { answers: true } },
        },
      }),
      this.prisma.courseQuestion.count({ where: { courseId } }),
    ]);
    return { questions, total };
  }

  async findQuestionById(id: string) {
    return this.prisma.courseQuestion.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true } },
        answers: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: { select: { id: true, name: true } },
          },
        },
      },
    });
  }

  async createAnswer(params: {
    questionId: string;
    userId: string;
    body: string;
  }) {
    return this.prisma.courseAnswer.create({
      data: params,
      include: {
        user: { select: { id: true, name: true } },
      },
    });
  }

  async deleteQuestion(id: string, userId: string) {
    // Only allow the author to delete their own question
    return this.prisma.courseQuestion.deleteMany({
      where: { id, userId },
    });
  }

  async deleteAnswer(id: string, userId: string) {
    return this.prisma.courseAnswer.deleteMany({
      where: { id, userId },
    });
  }
}
