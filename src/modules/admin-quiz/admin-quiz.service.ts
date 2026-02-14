import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { AdminQuizRepository } from './repositories/admin-quiz.repository';
import {
  CreateQuizDto,
  UpdateQuizDto,
  CreateQuestionDto,
  UpdateQuestionDto,
  BulkUpdateQuizzesDto,
  BulkDeleteQuizzesDto,
  BulkUpdateQuestionsDto,
  BulkDeleteQuestionsDto,
} from './dto';
import { PrismaService } from '../../prisma/prisma.service';
import { CourseStatusUtil } from '../../utils/course-status';

@Injectable()
export class AdminQuizService {
  constructor(
    private readonly repository: AdminQuizRepository,
    private readonly prisma: PrismaService,
  ) {}

  // Quiz operations
  async createQuiz(contentId: string, createQuizDto: CreateQuizDto) {
    // Check if content exists
    const contentExists = await this.repository.contentExists(contentId);
    if (!contentExists) {
      throw new NotFoundException('Content not found');
    }

    const quiz = await this.repository.createQuiz(contentId, createQuizDto);

    return {
      message: 'Quiz created successfully',
      data: quiz,
    };
  }

  async findQuiz(id: string) {
    const quiz = await this.repository.findQuizById(id);

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    return {
      message: 'Quiz details retrieved successfully',
      data: quiz,
    };
  }

  async updateQuiz(id: string, updateQuizDto: UpdateQuizDto) {
    // Check if quiz exists
    const exists = await this.repository.quizExists(id);
    if (!exists) {
      throw new NotFoundException('Quiz not found');
    }

    const quiz = await this.repository.updateQuiz(id, updateQuizDto);

    return {
      message: 'Quiz updated successfully',
      data: quiz,
    };
  }

  async deleteQuiz(id: string) {
    // Check if quiz exists
    const exists = await this.repository.quizExists(id);
    if (!exists) {
      throw new NotFoundException('Quiz not found');
    }

    await this.repository.deleteQuiz(id);

    return {
      message: 'Quiz deleted successfully',
    };
  }

  // Question operations
  async createQuestion(quizId: string, items: CreateQuestionDto[]) {
    // Check if quiz exists
    const quiz = await this.repository.findQuizById(quizId);
    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    // Validate correctOptionIndex for each question
    for (const item of items) {
      if (item.correctOptionIndex >= item.options.length) {
        throw new BadRequestException(
          `Correct option index is out of bounds for question: "${item.questionText}"`,
        );
      }
    }

    const questions =
      items.length === 1
        ? [await this.repository.createQuestion(quizId, items[0])]
        : await this.repository.createManyQuestions(quizId, items);

    // Update course status automatically
    const courseId = quiz.content.section.course.id;
    await CourseStatusUtil.updateCourseStatus(this.prisma, courseId);

    return {
      message:
        items.length === 1
          ? 'Question created successfully'
          : `${questions.length} questions created successfully`,
      data: items.length === 1 ? questions[0] : questions,
    };
  }

  async findQuestion(id: string) {
    const question = await this.repository.findQuestionById(id);

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    return {
      message: 'Question details retrieved successfully',
      data: question,
    };
  }

  async updateQuestion(id: string, updateQuestionDto: UpdateQuestionDto) {
    // Check if question exists
    const exists = await this.repository.questionExists(id);
    if (!exists) {
      throw new NotFoundException('Question not found');
    }

    // Validate correctOptionIndex if provided
    if (
      updateQuestionDto.correctOptionIndex !== undefined &&
      updateQuestionDto.options &&
      updateQuestionDto.correctOptionIndex >= updateQuestionDto.options.length
    ) {
      throw new BadRequestException('Correct option index is out of bounds');
    }

    const question = await this.repository.updateQuestion(
      id,
      updateQuestionDto,
    );

    return {
      message: 'Question updated successfully',
      data: question,
    };
  }

  async deleteQuestion(id: string) {
    // Check if question exists
    const question = await this.repository.findQuestionById(id);
    if (!question) {
      throw new NotFoundException('Question not found');
    }

    // Get quiz to find course
    const quiz = await this.repository.findQuizById(question.quiz.id);
    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    await this.repository.deleteQuestion(id);

    // Update course status after deletion
    const courseId = quiz.content.section.course.id;
    await CourseStatusUtil.updateCourseStatus(this.prisma, courseId);

    return {
      message: 'Question deleted successfully',
    };
  }

  // Bulk operations for quizzes
  async bulkUpdateQuizzes(bulkUpdateQuizzesDto: BulkUpdateQuizzesDto) {
    const { quizzes } = bulkUpdateQuizzesDto;
    const quizIds = quizzes.map((q) => q.id);

    // Validate all quizzes exist
    const existingQuizzes = await this.repository.findManyQuizzesByIds(quizIds);
    if (existingQuizzes.length !== quizIds.length) {
      const foundIds = existingQuizzes.map((q) => q.id);
      const notFoundIds = quizIds.filter((id) => !foundIds.includes(id));
      throw new NotFoundException(
        `Quizzes not found: ${notFoundIds.join(', ')}`,
      );
    }

    // Update quizzes
    const updates = quizzes.map((quiz) => ({
      id: quiz.id,
      data: {
        timeLimit: quiz.timeLimit,
        passingScore: quiz.passingScore,
      },
    }));

    const updatedQuizzes = await this.repository.updateManyQuizzes(updates);

    // Update affected course statuses
    const courseIds = await this.repository.findCourseIdsByQuizzes(quizIds);
    await Promise.all(
      courseIds.map((courseId) =>
        CourseStatusUtil.updateCourseStatus(this.prisma, courseId),
      ),
    );

    return {
      message: `${updatedQuizzes.length} quizzes updated successfully`,
      data: updatedQuizzes,
    };
  }

  async bulkDeleteQuizzes(bulkDeleteQuizzesDto: BulkDeleteQuizzesDto) {
    const { quizIds } = bulkDeleteQuizzesDto;

    // Validate all quizzes exist
    const existingQuizzes = await this.repository.findManyQuizzesByIds(quizIds);
    if (existingQuizzes.length !== quizIds.length) {
      const foundIds = existingQuizzes.map((q) => q.id);
      const notFoundIds = quizIds.filter((id) => !foundIds.includes(id));
      throw new NotFoundException(
        `Quizzes not found: ${notFoundIds.join(', ')}`,
      );
    }

    // Get course IDs before deletion
    const courseIds = await this.repository.findCourseIdsByQuizzes(quizIds);

    // Delete quizzes
    await this.repository.deleteManyQuizzes(quizIds);

    // Update affected course statuses
    await Promise.all(
      courseIds.map((courseId) =>
        CourseStatusUtil.updateCourseStatus(this.prisma, courseId),
      ),
    );

    return {
      message: `${quizIds.length} quizzes deleted successfully`,
    };
  }

  // Bulk operations for questions
  async bulkUpdateQuestions(bulkUpdateQuestionsDto: BulkUpdateQuestionsDto) {
    const { questions } = bulkUpdateQuestionsDto;
    const questionIds = questions.map((q) => q.id);

    // Validate all questions exist
    const existingQuestions =
      await this.repository.findManyQuestionsByIds(questionIds);
    if (existingQuestions.length !== questionIds.length) {
      const foundIds = existingQuestions.map((q) => q.id);
      const notFoundIds = questionIds.filter((id) => !foundIds.includes(id));
      throw new NotFoundException(
        `Questions not found: ${notFoundIds.join(', ')}`,
      );
    }

    // Validate correctOptionIndex for each question if options provided
    for (const question of questions) {
      if (
        question.correctOptionIndex !== undefined &&
        question.options &&
        question.correctOptionIndex >= question.options.length
      ) {
        throw new BadRequestException(
          `Correct option index is out of bounds for question ID: ${question.id}`,
        );
      }
    }

    // Update questions
    const updates = questions.map((question) => ({
      id: question.id,
      data: {
        questionText: question.questionText,
        order: question.order,
        points: question.points,
        options: question.options,
        correctOptionIndex: question.correctOptionIndex,
      },
    }));

    const updatedQuestions = await this.repository.updateManyQuestions(updates);

    // Update affected course statuses
    const courseIds =
      await this.repository.findCourseIdsByQuestions(questionIds);
    await Promise.all(
      courseIds.map((courseId) =>
        CourseStatusUtil.updateCourseStatus(this.prisma, courseId),
      ),
    );

    return {
      message: `${updatedQuestions.length} questions updated successfully`,
      data: updatedQuestions,
    };
  }

  async bulkDeleteQuestions(bulkDeleteQuestionsDto: BulkDeleteQuestionsDto) {
    const { questionIds } = bulkDeleteQuestionsDto;

    // Validate all questions exist
    const existingQuestions =
      await this.repository.findManyQuestionsByIds(questionIds);
    if (existingQuestions.length !== questionIds.length) {
      const foundIds = existingQuestions.map((q) => q.id);
      const notFoundIds = questionIds.filter((id) => !foundIds.includes(id));
      throw new NotFoundException(
        `Questions not found: ${notFoundIds.join(', ')}`,
      );
    }

    // Get course IDs before deletion
    const courseIds =
      await this.repository.findCourseIdsByQuestions(questionIds);

    // Delete questions
    await this.repository.deleteManyQuestions(questionIds);

    // Update affected course statuses
    await Promise.all(
      courseIds.map((courseId) =>
        CourseStatusUtil.updateCourseStatus(this.prisma, courseId),
      ),
    );

    return {
      message: `${questionIds.length} questions deleted successfully`,
    };
  }
}
