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
  CreateQuizDto,
  UpdateQuizDto,
  CreateQuestionDto,
  UpdateQuestionDto,
  BulkUpdateQuizzesDto,
  BulkDeleteQuizzesDto,
  BulkUpdateQuestionsDto,
  BulkDeleteQuestionsDto,
} from './dto';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';
import { ArrayOrSinglePipe } from '../../common/pipes/array-or-single.pipe';

@Controller('admin')
@UseGuards(AdminAuthGuard)
export class AdminQuizController {
  constructor(private readonly adminQuizService: AdminQuizService) {}

  // Quiz endpoints
  /**
   * Create a quiz for content
   * POST /admin/content/:contentId/quiz
   */
  @Post('content/:contentId/quiz')
  @HttpCode(HttpStatus.CREATED)
  createQuiz(
    @Param('contentId') contentId: string,
    @Body() createQuizDto: CreateQuizDto,
  ) {
    return this.adminQuizService.createQuiz(contentId, createQuizDto);
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
   * Add question(s) to quiz
   * POST /admin/quiz/:quizId/questions
   * Accepts a single object or an array of objects
   */
  @Post('quiz/:quizId/questions')
  @HttpCode(HttpStatus.CREATED)
  createQuestion(
    @Param('quizId') quizId: string,
    @Body(new ArrayOrSinglePipe(CreateQuestionDto)) items: CreateQuestionDto[],
  ) {
    return this.adminQuizService.createQuestion(quizId, items);
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
