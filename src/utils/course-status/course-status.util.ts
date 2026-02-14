import { CourseStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Utility class for managing course status progression
 */
export class CourseStatusUtil {
  /**
   * Automatically determine and update course status based on its content
   * This is called after creating/updating sections, content, or quizzes
   */
  static async updateCourseStatus(
    prisma: PrismaService,
    courseId: string,
  ): Promise<CourseStatus> {
    // Get course with its sections, contents, and quizzes
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        sections: {
          include: {
            contents: {
              include: {
                quiz: {
                  include: {
                    questions: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!course) {
      throw new Error('Course not found');
    }

    let newStatus: CourseStatus = CourseStatus.DRAFT;

    // Check if course has sections
    const hasSections = course.sections.length > 0;

    if (!hasSections) {
      newStatus = CourseStatus.DRAFT;
    } else {
      // Check if any section has content
      const hasContent = course.sections.some(
        (section) => section.contents.length > 0,
      );

      if (!hasContent) {
        newStatus = CourseStatus.SECTIONS_ADDED;
      } else {
        // Check if any content is a quiz with questions
        const hasQuizWithQuestions = course.sections.some((section) =>
          section.contents.some(
            (content) =>
              content.quiz && content.quiz.questions.length > 0,
          ),
        );

        if (hasQuizWithQuestions) {
          // If published flag is true, set to PUBLISHED, otherwise QUIZ_ADDED
          newStatus = course.isPublished
            ? CourseStatus.PUBLISHED
            : CourseStatus.QUIZ_ADDED;
        } else {
          newStatus = CourseStatus.CONTENT_ADDED;
        }
      }
    }

    // Only update if status has changed
    if (course.status !== newStatus) {
      await prisma.course.update({
        where: { id: courseId },
        data: { status: newStatus },
      });
    }

    return newStatus;
  }

  /**
   * Manually set course status
   * Used when admin wants to override automatic status
   */
  static async setCourseStatus(
    prisma: PrismaService,
    courseId: string,
    status: CourseStatus,
  ): Promise<void> {
    await prisma.course.update({
      where: { id: courseId },
      data: { status },
    });
  }

  /**
   * Check if a course can be published
   * A course can only be published if it has all required content
   */
  static async canPublish(
    prisma: PrismaService,
    courseId: string,
  ): Promise<{ canPublish: boolean; reason?: string }> {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        sections: {
          include: {
            contents: true,
          },
        },
      },
    });

    if (!course) {
      return { canPublish: false, reason: 'Course not found' };
    }

    if (course.sections.length === 0) {
      return {
        canPublish: false,
        reason: 'Course must have at least one section',
      };
    }

    const hasContent = course.sections.some(
      (section) => section.contents.length > 0,
    );

    if (!hasContent) {
      return {
        canPublish: false,
        reason: 'Course must have at least one content item',
      };
    }

    return { canPublish: true };
  }

  /**
   * Publish a course
   * Sets isPublished to true and updates status to PUBLISHED
   */
  static async publishCourse(
    prisma: PrismaService,
    courseId: string,
  ): Promise<void> {
    const { canPublish, reason } = await this.canPublish(prisma, courseId);

    if (!canPublish) {
      throw new Error(`Cannot publish course: ${reason}`);
    }

    await prisma.course.update({
      where: { id: courseId },
      data: {
        isPublished: true,
        status: CourseStatus.PUBLISHED,
      },
    });
  }

  /**
   * Unpublish a course
   * Sets isPublished to false and reverts status based on content
   */
  static async unpublishCourse(
    prisma: PrismaService,
    courseId: string,
  ): Promise<void> {
    await prisma.course.update({
      where: { id: courseId },
      data: {
        isPublished: false,
      },
    });

    // Update status based on current content
    await this.updateCourseStatus(prisma, courseId);
  }
}
