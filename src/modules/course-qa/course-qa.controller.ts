import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { CourseQaService } from './course-qa.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { CreateAnswerDto } from './dto/create-answer.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller()
export class CourseQaController {
  constructor(private readonly service: CourseQaService) {}

  /** GET /course/:courseId/questions — public list */
  @Get('course/:courseId/questions')
  list(
    @Param('courseId') courseId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.service.listQuestions(courseId, page || 1, limit || 20);
  }

  /** POST /course/:courseId/questions — auth required */
  @UseGuards(JwtAuthGuard)
  @Post('course/:courseId/questions')
  ask(
    @Request() req: { user: { id: string } },
    @Param('courseId') courseId: string,
    @Body() dto: CreateQuestionDto,
  ) {
    return this.service.askQuestion(req.user.id, courseId, dto);
  }

  /** GET /questions/:id — public, returns question + all answers */
  @Get('questions/:id')
  getOne(@Param('id') id: string) {
    return this.service.getQuestion(id);
  }

  /** POST /questions/:id/answers — auth required */
  @UseGuards(JwtAuthGuard)
  @Post('questions/:id/answers')
  answer(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() dto: CreateAnswerDto,
  ) {
    return this.service.answerQuestion(req.user.id, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('questions/:id')
  removeQuestion(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.service.deleteQuestion(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('answers/:id')
  removeAnswer(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.service.deleteAnswer(id, req.user.id);
  }
}
