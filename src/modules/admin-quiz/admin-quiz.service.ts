import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { AdminQuizRepository } from './repositories/admin-quiz.repository';
import { CreateQuizDto, UpdateQuizDto, CreateQuestionDto, UpdateQuestionDto } from './dto';
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

    const questions = items.length === 1
      ? [await this.repository.createQuestion(quizId, items[0])]
      : await this.repository.createManyQuestions(quizId, items);

    // Update course status automatically
    const courseId = quiz.content.section.course.id;
    await CourseStatusUtil.updateCourseStatus(this.prisma, courseId);

    return {
      message: items.length === 1
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

    const question = await this.repository.updateQuestion(id, updateQuestionDto);

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
}
