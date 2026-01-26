import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { QuizRepository } from './repositories/quiz.repository';
import { SubmitQuizDto } from './dto/quiz.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class QuizService {
  constructor(
    private readonly quizRepository: QuizRepository,
    private readonly prisma: PrismaService,
  ) {}

  async getQuiz(userId: string, quizId: string) {
    const quiz = await this.quizRepository.findById(quizId);

    if (!quiz) {
      throw new NotFoundException('الاختبار غير موجود');
    }

    // Check if user is enrolled in the course
    const courseId = quiz.content.section.course.id;
    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        userId_courseId: { userId, courseId },
      },
    });

    if (!enrollment) {
      throw new ForbiddenException('يجب التسجيل في الدورة أولاً');
    }

    // Get previous attempts
    const attempts = await this.quizRepository.findUserAttempts(userId, quizId);
    const bestScore =
      attempts.length > 0
        ? Math.max(...attempts.map((a) => a.score))
        : null;

    return {
      message: 'تم جلب الاختبار بنجاح',
      data: {
        id: quiz.id,
        title: quiz.content.title,
        section: quiz.content.section.title,
        course: quiz.content.section.course,
        timeLimit: quiz.timeLimit,
        passingScore: quiz.passingScore,
        totalQuestions: quiz.questions.length,
        totalPoints: quiz.questions.reduce((sum, q) => sum + q.points, 0),
        questions: quiz.questions.map((q) => ({
          id: q.id,
          questionText: q.questionText,
          order: q.order,
          points: q.points,
          options: q.options,
        })),
        previousAttempts: attempts.length,
        bestScore,
      },
    };
  }

  async getQuizByContentId(userId: string, contentId: string) {
    const quiz = await this.quizRepository.findByContentId(contentId);

    if (!quiz) {
      throw new NotFoundException('الاختبار غير موجود');
    }

    return this.getQuiz(userId, quiz.id);
  }

  async submitQuiz(userId: string, dto: SubmitQuizDto) {
    const { quizId, answers, timeTaken } = dto;

    // Get quiz with correct answers
    const quiz = await this.quizRepository.findByIdWithAnswers(quizId);

    if (!quiz) {
      throw new NotFoundException('الاختبار غير موجود');
    }

    // Check if user is enrolled
    const courseId = quiz.content.section.course.id;
    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        userId_courseId: { userId, courseId },
      },
    });

    if (!enrollment) {
      throw new ForbiddenException('يجب التسجيل في الدورة أولاً');
    }

    // Validate answers
    if (answers.length !== quiz.questions.length) {
      throw new BadRequestException('يجب الإجابة على جميع الأسئلة');
    }

    // Build a map of questionId -> correctOptionId
    const correctAnswersMap = new Map<string, string>();
    for (const question of quiz.questions) {
      const correctOption = question.options.find((o) => o.isCorrect);
      if (correctOption) {
        correctAnswersMap.set(question.id, correctOption.id);
      }
    }

    // Calculate score
    let correctCount = 0;
    let totalPoints = 0;
    let earnedPoints = 0;

    const processedAnswers = answers.map((answer) => {
      const question = quiz.questions.find((q) => q.id === answer.questionId);
      if (!question) {
        throw new BadRequestException(
          `السؤال ${answer.questionId} غير موجود`,
        );
      }

      totalPoints += question.points;
      const isCorrect =
        correctAnswersMap.get(answer.questionId) === answer.selectedOptionId;

      if (isCorrect) {
        correctCount++;
        earnedPoints += question.points;
      }

      return {
        questionId: answer.questionId,
        selectedOptionId: answer.selectedOptionId,
        isCorrect,
      };
    });

    // Calculate percentage score
    const score =
      totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    const passed = score >= quiz.passingScore;

    // Create attempt and answers in transaction
    const attempt = await this.prisma.$transaction(async (tx) => {
      // Create attempt
      const newAttempt = await tx.quizAttempt.create({
        data: {
          userId,
          quizId,
          score,
          passed,
          timeTaken,
          completedAt: new Date(),
        },
      });

      // Create user answers
      await tx.userAnswer.createMany({
        data: processedAnswers.map((answer) => ({
          attemptId: newAttempt.id,
          ...answer,
        })),
      });

      // Mark quiz content as completed if passed
      if (passed) {
        await tx.progress.upsert({
          where: {
            userId_contentId: { userId, contentId: quiz.contentId },
          },
          update: {
            completed: true,
            completedAt: new Date(),
          },
          create: {
            userId,
            contentId: quiz.contentId,
            completed: true,
            completedAt: new Date(),
          },
        });

        // Update course progress
        const sections = await tx.section.findMany({
          where: { courseId },
          include: { contents: { select: { id: true } } },
        });

        const allContentIds = sections.flatMap((s) =>
          s.contents.map((c) => c.id),
        );
        const completedProgress = await tx.progress.count({
          where: {
            userId,
            contentId: { in: allContentIds },
            completed: true,
          },
        });

        const progressPercentage = Math.round(
          (completedProgress / allContentIds.length) * 100,
        );

        await tx.enrollment.update({
          where: { userId_courseId: { userId, courseId } },
          data: {
            progress: progressPercentage,
            status: progressPercentage >= 100 ? 'COMPLETED' : 'ONGOING',
            completedAt: progressPercentage >= 100 ? new Date() : null,
          },
        });
      }

      return newAttempt;
    });

    // Build detailed results
    const results = quiz.questions.map((question) => {
      const userAnswer = processedAnswers.find(
        (a) => a.questionId === question.id,
      );
      const correctOption = question.options.find((o) => o.isCorrect);
      const selectedOption = question.options.find(
        (o) => o.id === userAnswer?.selectedOptionId,
      );

      return {
        questionId: question.id,
        questionText: question.questionText,
        points: question.points,
        isCorrect: userAnswer?.isCorrect || false,
        selectedOption: selectedOption
          ? { id: selectedOption.id, text: selectedOption.text }
          : null,
        correctOption: correctOption
          ? { id: correctOption.id, text: correctOption.text }
          : null,
        options: question.options.map((o) => ({
          id: o.id,
          text: o.text,
          isCorrect: o.isCorrect,
          isSelected: o.id === userAnswer?.selectedOptionId,
        })),
      };
    });

    return {
      message: passed ? 'تهانينا! لقد اجتزت الاختبار' : 'لم تجتز الاختبار',
      data: {
        attemptId: attempt.id,
        score,
        passed,
        passingScore: quiz.passingScore,
        correctAnswers: correctCount,
        totalQuestions: quiz.questions.length,
        earnedPoints,
        totalPoints,
        timeTaken,
        results,
      },
    };
  }

  async getAttemptResult(userId: string, attemptId: string) {
    const attempt = await this.quizRepository.findAttemptById(attemptId);

    if (!attempt) {
      throw new NotFoundException('نتيجة الاختبار غير موجودة');
    }

    if (attempt.userId !== userId) {
      throw new ForbiddenException('لا يمكنك الوصول إلى هذه النتيجة');
    }

    // Build detailed results
    const results = attempt.quiz.questions.map((question) => {
      const userAnswer = attempt.userAnswers.find(
        (a) => a.questionId === question.id,
      );
      const correctOption = question.options.find((o) => o.isCorrect);

      return {
        questionId: question.id,
        questionText: question.questionText,
        points: question.points,
        isCorrect: userAnswer?.isCorrect || false,
        selectedOption: userAnswer?.selectedOption
          ? {
              id: userAnswer.selectedOption.id,
              text: userAnswer.selectedOption.text,
            }
          : null,
        correctOption: correctOption
          ? { id: correctOption.id, text: correctOption.text }
          : null,
        options: question.options.map((o) => ({
          id: o.id,
          text: o.text,
          isCorrect: o.isCorrect,
          isSelected: o.id === userAnswer?.selectedOptionId,
        })),
      };
    });

    const totalPoints = attempt.quiz.questions.reduce(
      (sum, q) => sum + q.points,
      0,
    );
    const earnedPoints = results
      .filter((r) => r.isCorrect)
      .reduce((sum, r) => sum + r.points, 0);

    return {
      message: 'تم جلب نتيجة الاختبار',
      data: {
        attemptId: attempt.id,
        quiz: {
          id: attempt.quiz.id,
          title: attempt.quiz.content.title,
        },
        score: attempt.score,
        passed: attempt.passed,
        passingScore: attempt.quiz.passingScore,
        correctAnswers: results.filter((r) => r.isCorrect).length,
        totalQuestions: attempt.quiz.questions.length,
        earnedPoints,
        totalPoints,
        timeTaken: attempt.timeTaken,
        completedAt: attempt.completedAt,
        results,
      },
    };
  }

  async getQuizAttempts(userId: string, quizId: string) {
    const quiz = await this.quizRepository.findById(quizId);

    if (!quiz) {
      throw new NotFoundException('الاختبار غير موجود');
    }

    const attempts = await this.quizRepository.findUserAttempts(userId, quizId);

    return {
      message: 'تم جلب محاولات الاختبار',
      data: {
        quizId,
        quizTitle: quiz.content.title,
        passingScore: quiz.passingScore,
        attempts: attempts.map((attempt) => ({
          id: attempt.id,
          score: attempt.score,
          passed: attempt.passed,
          timeTaken: attempt.timeTaken,
          completedAt: attempt.completedAt,
          createdAt: attempt.createdAt,
        })),
        bestScore:
          attempts.length > 0
            ? Math.max(...attempts.map((a) => a.score))
            : null,
        totalAttempts: attempts.length,
      },
    };
  }
}
