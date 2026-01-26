import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ProgressRepository } from './repositories/progress.repository';
import { MarkContentCompleteDto } from './dto/progress.dto';

@Injectable()
export class ProgressService {
  constructor(private readonly progressRepository: ProgressRepository) {}

  async markContentComplete(userId: string, dto: MarkContentCompleteDto) {
    const { contentId, completed = true } = dto;

    // Get content with course info
    const content =
      await this.progressRepository.getContentWithCourseInfo(contentId);

    if (!content) {
      throw new NotFoundException('المحتوى غير موجود');
    }

    const courseId = content.section.course.id;

    // Check if user is enrolled in the course
    const enrollment = await this.progressRepository.getEnrollment(
      userId,
      courseId,
    );

    if (!enrollment) {
      throw new ForbiddenException('يجب التسجيل في الدورة أولاً');
    }

    // Update or create progress
    const progress = await this.progressRepository.upsertProgress(
      userId,
      contentId,
      completed,
    );

    // Calculate and update overall course progress
    const contentIds =
      await this.progressRepository.getCourseContentIds(courseId);
    const userProgress = await this.progressRepository.getUserProgressForCourse(
      userId,
      courseId,
    );

    const completedCount = userProgress.filter((p) => p.completed).length;
    const totalCount = contentIds.length;
    const progressPercentage =
      totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    // Update enrollment progress
    const updatedEnrollment =
      await this.progressRepository.updateEnrollmentProgress(
        userId,
        courseId,
        progressPercentage,
      );

    return {
      message: completed
        ? 'تم تحديث المحتوى كمكتمل'
        : 'تم تحديث حالة المحتوى',
      data: {
        progress,
        courseProgress: {
          completed: completedCount,
          total: totalCount,
          percentage: progressPercentage,
          status: updatedEnrollment.status,
          isCompleted: progressPercentage >= 100,
        },
      },
    };
  }

  async getContentProgress(userId: string, contentId: string) {
    const content =
      await this.progressRepository.getContentWithCourseInfo(contentId);

    if (!content) {
      throw new NotFoundException('المحتوى غير موجود');
    }

    const progress = await this.progressRepository.findProgress(
      userId,
      contentId,
    );

    return {
      message: 'تم جلب حالة المحتوى',
      data: {
        contentId,
        contentTitle: content.title,
        contentType: content.type,
        completed: progress?.completed || false,
        completedAt: progress?.completedAt || null,
      },
    };
  }

  async getCourseProgress(userId: string, courseId: string) {
    const enrollment = await this.progressRepository.getEnrollment(
      userId,
      courseId,
    );

    if (!enrollment) {
      throw new NotFoundException('لم يتم العثور على التسجيل في هذه الدورة');
    }

    const contentIds =
      await this.progressRepository.getCourseContentIds(courseId);
    const userProgress = await this.progressRepository.getUserProgressForCourse(
      userId,
      courseId,
    );

    const completedCount = userProgress.filter((p) => p.completed).length;
    const totalCount = contentIds.length;
    const progressPercentage =
      totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    // Get completed content IDs
    const completedContentIds = userProgress
      .filter((p) => p.completed)
      .map((p) => p.contentId);

    return {
      message: 'تم جلب تقدم الدورة',
      data: {
        courseId,
        enrollmentId: enrollment.id,
        status: enrollment.status,
        progress: {
          completed: completedCount,
          total: totalCount,
          percentage: progressPercentage,
        },
        completedContentIds,
        enrolledAt: enrollment.enrolledAt,
        completedAt: enrollment.completedAt,
      },
    };
  }
}
