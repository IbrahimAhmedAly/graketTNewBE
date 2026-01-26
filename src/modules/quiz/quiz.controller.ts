import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { QuizService } from './quiz.service';
import { SubmitQuizDto } from './dto/quiz.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('quiz')
@UseGuards(JwtAuthGuard)
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  /**
   * Get quiz by ID with questions (for taking the quiz)
   * GET /quiz/:quizId
   */
  @Get(':quizId')
  async getQuiz(
    @Request() req: { user: { id: string } },
    @Param('quizId') quizId: string,
  ) {
    return this.quizService.getQuiz(req.user.id, quizId);
  }

  /**
   * Get quiz by content ID
   * GET /quiz/content/:contentId
   */
  @Get('content/:contentId')
  async getQuizByContentId(
    @Request() req: { user: { id: string } },
    @Param('contentId') contentId: string,
  ) {
    return this.quizService.getQuizByContentId(req.user.id, contentId);
  }

  /**
   * Submit quiz answers
   * POST /quiz/submit
   */
  @Post('submit')
  @HttpCode(HttpStatus.OK)
  async submitQuiz(
    @Request() req: { user: { id: string } },
    @Body() dto: SubmitQuizDto,
  ) {
    return this.quizService.submitQuiz(req.user.id, dto);
  }

  /**
   * Get a specific attempt result
   * GET /quiz/attempt/:attemptId
   */
  @Get('attempt/:attemptId')
  async getAttemptResult(
    @Request() req: { user: { id: string } },
    @Param('attemptId') attemptId: string,
  ) {
    return this.quizService.getAttemptResult(req.user.id, attemptId);
  }

  /**
   * Get all attempts for a quiz
   * GET /quiz/:quizId/attempts
   */
  @Get(':quizId/attempts')
  async getQuizAttempts(
    @Request() req: { user: { id: string } },
    @Param('quizId') quizId: string,
  ) {
    return this.quizService.getQuizAttempts(req.user.id, quizId);
  }
}
