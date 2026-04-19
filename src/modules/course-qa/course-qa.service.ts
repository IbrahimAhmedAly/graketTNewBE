import { Injectable, NotFoundException } from '@nestjs/common';
import { CourseQaRepository } from './repositories/course-qa.repository';
import { CreateQuestionDto } from './dto/create-question.dto';
import { CreateAnswerDto } from './dto/create-answer.dto';
import { PaginationUtil } from '../../utils/pagination/pagination.util';

@Injectable()
export class CourseQaService {
  constructor(private readonly repo: CourseQaRepository) {}

  async listQuestions(
    courseId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const exists = await this.repo.courseExists(courseId);
    if (!exists) {
      throw new NotFoundException('الدورة غير موجودة');
    }
    const params = PaginationUtil.getPaginationParams(page, limit);
    const skip = PaginationUtil.getSkip(params.page, params.limit);
    const { questions, total } = await this.repo.findQuestions({
      courseId,
      skip,
      take: params.limit,
    });
    const transformed = questions.map((q) => ({
      id: q.id,
      title: q.title,
      body: q.body,
      answersCount: q._count.answers,
      user: q.user,
      createdAt: q.createdAt,
    }));
    return {
      message: 'تم جلب الأسئلة بنجاح',
      ...PaginationUtil.paginate(transformed, total, params),
    };
  }

  async askQuestion(
    userId: string,
    courseId: string,
    dto: CreateQuestionDto,
  ) {
    const exists = await this.repo.courseExists(courseId);
    if (!exists) {
      throw new NotFoundException('الدورة غير موجودة');
    }
    const q = await this.repo.createQuestion({
      userId,
      courseId,
      title: dto.title.trim(),
      body: dto.body.trim(),
    });
    return {
      message: 'تم إرسال السؤال بنجاح',
      data: {
        id: q.id,
        title: q.title,
        body: q.body,
        answersCount: 0,
        user: q.user,
        createdAt: q.createdAt,
      },
    };
  }

  async getQuestion(id: string) {
    const q = await this.repo.findQuestionById(id);
    if (!q) throw new NotFoundException('السؤال غير موجود');
    return {
      message: 'تم جلب السؤال بنجاح',
      data: q,
    };
  }

  async answerQuestion(
    userId: string,
    questionId: string,
    dto: CreateAnswerDto,
  ) {
    const q = await this.repo.findQuestionById(questionId);
    if (!q) throw new NotFoundException('السؤال غير موجود');
    const a = await this.repo.createAnswer({
      questionId,
      userId,
      body: dto.body.trim(),
    });
    return {
      message: 'تم إرسال الإجابة بنجاح',
      data: a,
    };
  }

  async deleteQuestion(id: string, userId: string) {
    const res = await this.repo.deleteQuestion(id, userId);
    if (res.count === 0) {
      throw new NotFoundException('السؤال غير موجود أو ليس ملكك');
    }
    return { message: 'تم حذف السؤال بنجاح' };
  }

  async deleteAnswer(id: string, userId: string) {
    const res = await this.repo.deleteAnswer(id, userId);
    if (res.count === 0) {
      throw new NotFoundException('الإجابة غير موجودة أو ليست ملكك');
    }
    return { message: 'تم حذف الإجابة بنجاح' };
  }
}
