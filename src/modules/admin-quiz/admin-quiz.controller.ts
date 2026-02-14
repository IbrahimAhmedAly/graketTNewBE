import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { AdminQuizService } from './admin-quiz.service';
import {
  UpdateQuizDto,
  UpdateQuestionDto,
  BulkCreateQuizzesDto,
  BulkUpdateQuizzesDto,
  BulkDeleteQuizzesDto,
  BulkCreateQuestionsDto,
  BulkUpdateQuestionsDto,
  BulkDeleteQuestionsDto,
} from './dto';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';

@Controller('admin')
@UseGuards(AdminAuthGuard)
export class AdminQuizController {
  constructor(private readonly adminQuizService: AdminQuizService) {}

  // Quiz endpoints
  /**
   * Bulk create quizzes
   * POST /admin/quiz/bulk
   * Body: { quizzes: [{ contentId, timeLimit, passingScore }, ...] }
   */
  @Post('quiz/bulk')
  @HttpCode(HttpStatus.CREATED)
  bulkCreateQuizzes(@Body() bulkCreateDto: BulkCreateQuizzesDto) {
    return this.adminQuizService.bulkCreateQuizzes(bulkCreateDto);
  }

  /**
   * Get quiz details
   * GET /admin/quiz/:id
   */
  @Get('quiz/:id')
  findQuiz(@Param('id') id: string) {
    return this.adminQuizService.findQuiz(id);
  }

  /**
   * Update quiz (single or bulk)
   * PATCH /admin/quiz/:id (single)
   * PATCH /admin/quiz (bulk with quizzes array in body)
   */
  @Patch('quiz/:id?')
  updateQuiz(
    @Param('id') id: string | undefined,
    @Body() updateQuizDto: UpdateQuizDto | BulkUpdateQuizzesDto,
  ) {
    if (id) {
      return this.adminQuizService.updateQuiz(
        id,
        updateQuizDto as UpdateQuizDto,
      );
    }

    if ('quizzes' in updateQuizDto) {
      return this.adminQuizService.bulkUpdateQuizzes(
        updateQuizDto as BulkUpdateQuizzesDto,
      );
    }

    throw new HttpException(
      'Invalid request: Provide either an id parameter or a quizzes array in the body',
      HttpStatus.BAD_REQUEST,
    );
  }

  /**
   * Delete quiz (single or bulk)
   * DELETE /admin/quiz/:id (single)
   * DELETE /admin/quiz (bulk with quizIds array in body)
   */
  @Delete('quiz/:id?')
  @HttpCode(HttpStatus.OK)
  deleteQuiz(
    @Param('id') id: string | undefined,
    @Body() deleteQuizDto?: BulkDeleteQuizzesDto,
  ) {
    if (id) {
      return this.adminQuizService.deleteQuiz(id);
    }

    if (deleteQuizDto && 'quizIds' in deleteQuizDto) {
      return this.adminQuizService.bulkDeleteQuizzes(deleteQuizDto);
    }

    throw new HttpException(
      'Invalid request: Provide either an id parameter or a quizIds array in the body',
      HttpStatus.BAD_REQUEST,
    );
  }

  // Question endpoints
  /**
   * Bulk create questions
   * POST /admin/questions/bulk
   * Body: { questions: [{ quizId, questionText, order, points, correctOptionIndex, options }, ...] }
   */
  @Post('questions/bulk')
  @HttpCode(HttpStatus.CREATED)
  bulkCreateQuestions(@Body() bulkCreateDto: BulkCreateQuestionsDto) {
    return this.adminQuizService.bulkCreateQuestions(bulkCreateDto);
  }

  /**
   * Get question details
   * GET /admin/questions/:id
   */
  @Get('questions/:id')
  findQuestion(@Param('id') id: string) {
    return this.adminQuizService.findQuestion(id);
  }

  /**
   * Update question (single or bulk)
   * PATCH /admin/questions/:id (single)
   * PATCH /admin/questions (bulk with questions array in body)
   */
  @Patch('questions/:id?')
  updateQuestion(
    @Param('id') id: string | undefined,
    @Body() updateQuestionDto: UpdateQuestionDto | BulkUpdateQuestionsDto,
  ) {
    if (id) {
      return this.adminQuizService.updateQuestion(
        id,
        updateQuestionDto as UpdateQuestionDto,
      );
    }

    if ('questions' in updateQuestionDto) {
      return this.adminQuizService.bulkUpdateQuestions(
        updateQuestionDto as BulkUpdateQuestionsDto,
      );
    }

    throw new HttpException(
      'Invalid request: Provide either an id parameter or a questions array in the body',
      HttpStatus.BAD_REQUEST,
    );
  }

  /**
   * Delete question (single or bulk)
   * DELETE /admin/questions/:id (single)
   * DELETE /admin/questions (bulk with questionIds array in body)
   */
  @Delete('questions/:id?')
  @HttpCode(HttpStatus.OK)
  deleteQuestion(
    @Param('id') id: string | undefined,
    @Body() deleteQuestionDto?: BulkDeleteQuestionsDto,
  ) {
    if (id) {
      return this.adminQuizService.deleteQuestion(id);
    }

    if (deleteQuestionDto && 'questionIds' in deleteQuestionDto) {
      return this.adminQuizService.bulkDeleteQuestions(deleteQuestionDto);
    }

    throw new HttpException(
      'Invalid request: Provide either an id parameter or a questionIds array in the body',
      HttpStatus.BAD_REQUEST,
    );
  }
}
