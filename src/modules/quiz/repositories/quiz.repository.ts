import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class QuizRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(quizId: string) {
    return this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        content: {
          include: {
            section: {
              include: {
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
              select: {
                id: true,
                text: true,
                order: true,
                // Don't expose isCorrect here - will be shown after submission
              },
            },
          },
        },
      },
    });
  }

  async findByIdWithAnswers(quizId: string) {
    return this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        content: {
          include: {
            section: {
              include: {
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

  async findByContentId(contentId: string) {
    return this.prisma.quiz.findUnique({
      where: { contentId },
      include: {
        content: {
          include: {
            section: {
              include: {
                course: {
                  select: { id: true, title: true },
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
              select: {
                id: true,
                text: true,
                order: true,
              },
            },
          },
        },
      },
    });
  }

  async createAttempt(data: {
    userId: string;
    quizId: string;
    score: number;
    passed: boolean;
    timeTaken?: number;
  }) {
    return this.prisma.quizAttempt.create({
      data: {
        ...data,
        completedAt: new Date(),
      },
      include: {
        quiz: {
          include: {
            content: {
              select: { id: true, title: true },
            },
          },
        },
      },
    });
  }

  async createUserAnswers(
    attemptId: string,
    answers: {
      questionId: string;
      selectedOptionId: string;
      isCorrect: boolean;
    }[],
  ) {
    return this.prisma.userAnswer.createMany({
      data: answers.map((answer) => ({
        attemptId,
        ...answer,
      })),
    });
  }

  async findUserAttempts(userId: string, quizId: string) {
    return this.prisma.quizAttempt.findMany({
      where: { userId, quizId },
      orderBy: { createdAt: 'desc' },
      include: {
        userAnswers: {
          include: {
            question: true,
            selectedOption: true,
          },
        },
      },
    });
  }

  async findLatestAttempt(userId: string, quizId: string) {
    return this.prisma.quizAttempt.findFirst({
      where: { userId, quizId },
      orderBy: { createdAt: 'desc' },
      include: {
        userAnswers: {
          include: {
            question: {
              include: {
                options: true,
              },
            },
            selectedOption: true,
          },
        },
      },
    });
  }

  async getQuestionCorrectOptions(questionIds: string[]) {
    return this.prisma.option.findMany({
      where: {
        questionId: { in: questionIds },
        isCorrect: true,
      },
      select: {
        id: true,
        questionId: true,
      },
    });
  }

  async findAttemptById(attemptId: string) {
    return this.prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        quiz: {
          include: {
            content: {
              select: { id: true, title: true },
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
        },
        userAnswers: {
          include: {
            question: true,
            selectedOption: true,
          },
        },
      },
    });
  }
}
