import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { AdminQuizRepository } from './repositories/admin-quiz.repository';
import { CreateQuizDto, UpdateQuizDto, CreateQuestionDto, UpdateQuestionDto } from './dto';

@Injectable()
export class AdminQuizService {
  constructor(private readonly repository: AdminQuizRepository) {}

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
  async createQuestion(quizId: string, createQuestionDto: CreateQuestionDto) {
    // Check if quiz exists
    const quizExists = await this.repository.quizExists(quizId);
    if (!quizExists) {
      throw new NotFoundException('Quiz not found');
    }

    // Validate correctOptionIndex
    if (createQuestionDto.correctOptionIndex >= createQuestionDto.options.length) {
      throw new BadRequestException('Correct option index is out of bounds');
    }

    const question = await this.repository.createQuestion(quizId, createQuestionDto);

    return {
      message: 'Question created successfully',
      data: question,
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
    const exists = await this.repository.questionExists(id);
    if (!exists) {
      throw new NotFoundException('Question not found');
    }

    await this.repository.deleteQuestion(id);

    return {
      message: 'Question deleted successfully',
    };
  }
}
