import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateQuizDto,
  UpdateQuizDto,
  CreateQuestionDto,
  UpdateQuestionDto,
} from '../dto';

@Injectable()
export class AdminQuizRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Quiz operations
  async createQuiz(contentId: string, data: CreateQuizDto) {
    return this.prisma.quiz.create({
      data: {
        contentId,
        timeLimit: data.timeLimit,
        passingScore: data.passingScore || 70,
      },
      include: {
        content: {
          select: {
            id: true,
            title: true,
            type: true,
          },
        },
        _count: {
          select: {
            questions: true,
          },
        },
      },
    });
  }

  async findQuizById(id: string) {
    return this.prisma.quiz.findUnique({
      where: { id },
      include: {
        content: {
          select: {
            id: true,
            title: true,
            type: true,
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
        },
        questions: {
          orderBy: { order: 'asc' },
          include: {
            options: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });
  }

  async updateQuiz(id: string, data: UpdateQuizDto) {
    return this.prisma.quiz.update({
      where: { id },
      data: {
        ...(data.timeLimit !== undefined && { timeLimit: data.timeLimit }),
        ...(data.passingScore !== undefined && {
          passingScore: data.passingScore,
        }),
      },
      include: {
        _count: {
          select: {
            questions: true,
          },
        },
      },
    });
  }

  async deleteQuiz(id: string) {
    return this.prisma.quiz.delete({
      where: { id },
    });
  }

  async quizExists(id: string): Promise<boolean> {
    const count = await this.prisma.quiz.count({
      where: { id },
    });
    return count > 0;
  }

  async contentExists(contentId: string): Promise<boolean> {
    const count = await this.prisma.content.count({
      where: { id: contentId },
    });
    return count > 0;
  }

  // Question operations
  async createQuestion(quizId: string, data: CreateQuestionDto) {
    // Create question with options in a transaction
    return this.prisma.$transaction(async (tx) => {
      // Create question
      const question = await tx.question.create({
        data: {
          quizId,
          questionText: data.questionText,
          order: data.order,
          points: data.points,
        },
      });

      // Create options
      const options = await Promise.all(
        data.options.map((option, index) =>
          tx.option.create({
            data: {
              questionId: question.id,
              text: option.text,
              order: option.order,
              isCorrect: index === data.correctOptionIndex,
            },
          }),
        ),
      );

      return {
        ...question,
        options,
      };
    });
  }

  async createManyQuestions(quizId: string, items: CreateQuestionDto[]) {
    return this.prisma.$transaction(async (tx) => {
      const results = [];
      for (const data of items) {
        const question = await tx.question.create({
          data: {
            quizId,
            questionText: data.questionText,
            order: data.order,
            points: data.points,
          },
        });

        const options = await Promise.all(
          data.options.map((option, index) =>
            tx.option.create({
              data: {
                questionId: question.id,
                text: option.text,
                order: option.order,
                isCorrect: index === data.correctOptionIndex,
              },
            }),
          ),
        );

        results.push({ ...question, options });
      }
      return results;
    });
  }

  async findQuestionById(id: string) {
    return this.prisma.question.findUnique({
      where: { id },
      include: {
        quiz: {
          select: {
            id: true,
            content: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
        options: {
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  async updateQuestion(id: string, data: UpdateQuestionDto) {
    return this.prisma.$transaction(async (tx) => {
      // Update question
      const question = await tx.question.update({
        where: { id },
        data: {
          ...(data.questionText && { questionText: data.questionText }),
          ...(data.order !== undefined && { order: data.order }),
          ...(data.points !== undefined && { points: data.points }),
        },
      });

      // If options are provided, delete old options and create new ones
      if (data.options && data.options.length > 0) {
        // Delete old options
        await tx.option.deleteMany({
          where: { questionId: id },
        });

        // Create new options
        const options = await Promise.all(
          data.options.map((option, index) =>
            tx.option.create({
              data: {
                questionId: id,
                text: option.text,
                order: option.order,
                isCorrect: index === data.correctOptionIndex!,
              },
            }),
          ),
        );

        return {
          ...question,
          options,
        };
      }

      // If no options provided, just return question with existing options
      const options = await tx.option.findMany({
        where: { questionId: id },
        orderBy: { order: 'asc' },
      });

      return {
        ...question,
        options,
      };
    });
  }

  async deleteQuestion(id: string) {
    return this.prisma.question.delete({
      where: { id },
    });
  }

  async questionExists(id: string): Promise<boolean> {
    const count = await this.prisma.question.count({
      where: { id },
    });
    return count > 0;
  }

  // Bulk operations for quizzes
  async findManyQuizzesByIds(ids: string[]) {
    return this.prisma.quiz.findMany({
      where: {
        id: { in: ids },
      },
      select: {
        id: true,
        contentId: true,
      },
    });
  }

  async findCourseIdsByQuizzes(quizIds: string[]) {
    const quizzes = await this.prisma.quiz.findMany({
      where: {
        id: { in: quizIds },
      },
      select: {
        content: {
          select: {
            section: {
              select: {
                courseId: true,
              },
            },
          },
        },
      },
    });

    return [...new Set(quizzes.map((q) => q.content.section.courseId))];
  }

  async updateManyQuizzes(quizzes: Array<{ id: string; data: UpdateQuizDto }>) {
    return this.prisma.$transaction(
      quizzes.map(({ id, data }) =>
        this.prisma.quiz.update({
          where: { id },
          data: {
            ...(data.timeLimit !== undefined && { timeLimit: data.timeLimit }),
            ...(data.passingScore !== undefined && {
              passingScore: data.passingScore,
            }),
          },
          include: {
            _count: {
              select: {
                questions: true,
              },
            },
          },
        }),
      ),
    );
  }

  async deleteManyQuizzes(ids: string[]) {
    return this.prisma.quiz.deleteMany({
      where: {
        id: { in: ids },
      },
    });
  }

  // Bulk operations for questions
  async findManyQuestionsByIds(ids: string[]) {
    return this.prisma.question.findMany({
      where: {
        id: { in: ids },
      },
      select: {
        id: true,
        quizId: true,
      },
    });
  }

  async findCourseIdsByQuestions(questionIds: string[]) {
    const questions = await this.prisma.question.findMany({
      where: {
        id: { in: questionIds },
      },
      select: {
        quiz: {
          select: {
            content: {
              select: {
                section: {
                  select: {
                    courseId: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return [...new Set(questions.map((q) => q.quiz.content.section.courseId))];
  }

  async updateManyQuestions(
    questions: Array<{ id: string; data: UpdateQuestionDto }>,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const results = [];

      for (const { id, data } of questions) {
        // Update question
        const question = await tx.question.update({
          where: { id },
          data: {
            ...(data.questionText && { questionText: data.questionText }),
            ...(data.order !== undefined && { order: data.order }),
            ...(data.points !== undefined && { points: data.points }),
          },
        });

        // If options are provided, delete old options and create new ones
        if (data.options && data.options.length > 0) {
          // Delete old options
          await tx.option.deleteMany({
            where: { questionId: id },
          });

          // Create new options
          const options = await Promise.all(
            data.options.map((option, index) =>
              tx.option.create({
                data: {
                  questionId: id,
                  text: option.text,
                  order: option.order,
                  isCorrect: index === data.correctOptionIndex!,
                },
              }),
            ),
          );

          results.push({ ...question, options });
        } else {
          // If no options provided, just return question with existing options
          const options = await tx.option.findMany({
            where: { questionId: id },
            orderBy: { order: 'asc' },
          });

          results.push({ ...question, options });
        }
      }

      return results;
    });
  }

  async deleteManyQuestions(ids: string[]) {
    return this.prisma.question.deleteMany({
      where: {
        id: { in: ids },
      },
    });
  }
}
