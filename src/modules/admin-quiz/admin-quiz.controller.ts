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
} from '@nestjs/common';
import { AdminQuizService } from './admin-quiz.service';
import { CreateQuizDto, UpdateQuizDto, CreateQuestionDto, UpdateQuestionDto } from './dto';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';

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
   * Update quiz
   * PATCH /admin/quiz/:id
   */
  @Patch('quiz/:id')
  updateQuiz(@Param('id') id: string, @Body() updateQuizDto: UpdateQuizDto) {
    return this.adminQuizService.updateQuiz(id, updateQuizDto);
  }

  /**
   * Delete quiz
   * DELETE /admin/quiz/:id
   */
  @Delete('quiz/:id')
  @HttpCode(HttpStatus.OK)
  deleteQuiz(@Param('id') id: string) {
    return this.adminQuizService.deleteQuiz(id);
  }

  // Question endpoints
  /**
   * Add question to quiz
   * POST /admin/quiz/:quizId/questions
   */
  @Post('quiz/:quizId/questions')
  @HttpCode(HttpStatus.CREATED)
  createQuestion(
    @Param('quizId') quizId: string,
    @Body() createQuestionDto: CreateQuestionDto,
  ) {
    return this.adminQuizService.createQuestion(quizId, createQuestionDto);
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
   * Update question
   * PATCH /admin/questions/:id
   */
  @Patch('questions/:id')
  updateQuestion(
    @Param('id') id: string,
    @Body() updateQuestionDto: UpdateQuestionDto,
  ) {
    return this.adminQuizService.updateQuestion(id, updateQuestionDto);
  }

  /**
   * Delete question
   * DELETE /admin/questions/:id
   */
  @Delete('questions/:id')
  @HttpCode(HttpStatus.OK)
  deleteQuestion(@Param('id') id: string) {
    return this.adminQuizService.deleteQuestion(id);
  }
}
