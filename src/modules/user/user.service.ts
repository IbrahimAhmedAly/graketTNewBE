import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRepository } from './repositories/user.repository';
import { EducationRepository } from '../education/repositories/education.repository';
import { UpdateProfileDto } from './dto';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly educationRepository: EducationRepository,
  ) {}

  /** The signed-in student's own profile. */
  async getProfile(userId: string) {
    const profile = await this.userRepository.findProfileById(userId);

    if (!profile) {
      throw new NotFoundException('المستخدم غير موجود');
    }

    return {
      message: 'تم جلب الملف الشخصي بنجاح',
      data: profile,
    };
  }

  /** Partial self-service update of the signed-in student's profile. */
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const hasChanges =
      dto.name !== undefined ||
      dto.parentPhone !== undefined ||
      dto.educationLevelId !== undefined ||
      dto.gradeId !== undefined;

    if (!hasChanges) {
      throw new BadRequestException('لا توجد بيانات للتحديث');
    }

    const current = await this.userRepository.findProfileById(userId);
    if (!current) {
      throw new NotFoundException('المستخدم غير موجود');
    }

    await this.assertValidTargeting(
      dto,
      current.educationLevel?.id ?? null,
      current.grade?.id ?? null,
    );

    const profile = await this.userRepository.updateProfile(userId, {
      name: dto.name,
      parentPhone: dto.parentPhone,
      educationLevelId: dto.educationLevelId,
      gradeId: dto.gradeId,
    });

    return {
      message: 'تم تحديث الملف الشخصي بنجاح',
      data: profile,
    };
  }

  /**
   * Keeps the level/grade pair consistent after the update, whichever half of
   * it the student sent. A profile must never end up as "University / Grade 7".
   */
  private async assertValidTargeting(
    dto: UpdateProfileDto,
    currentLevelId: string | null,
    currentGradeId: string | null,
  ): Promise<void> {
    const { educationLevelId, gradeId } = dto;

    // Gate on `undefined`, never on truthiness: the repository writes any key
    // that is `!== undefined`, so a falsy-but-present value must still be
    // validated here or the two predicates disagree and a bad pair gets
    // persisted. The DTO already rejects `null` for both fields; this keeps
    // the invariant true even if that ever changes.
    if (educationLevelId === undefined && gradeId === undefined) {
      return;
    }

    if (educationLevelId !== undefined) {
      const levelExists =
        await this.educationRepository.levelExists(educationLevelId);
      if (!levelExists) {
        throw new NotFoundException('المرحلة التعليمية غير موجودة');
      }
    }

    if (gradeId !== undefined) {
      const gradeLevelId =
        await this.educationRepository.findGradeLevelId(gradeId);
      if (!gradeLevelId) {
        throw new NotFoundException('الصف الدراسي غير موجود');
      }

      // Both halves sent: they must match each other.
      if (educationLevelId !== undefined) {
        if (gradeLevelId !== educationLevelId) {
          throw new BadRequestException(
            'الصف الدراسي المحدد لا ينتمي إلى المرحلة التعليمية المحددة',
          );
        }
        return;
      }

      // Grade only: it must fit the level the student already has.
      if (!currentLevelId) {
        throw new BadRequestException(
          'يجب اختيار المرحلة التعليمية أولاً قبل اختيار الصف الدراسي',
        );
      }
      if (gradeLevelId !== currentLevelId) {
        throw new BadRequestException(
          'الصف الدراسي المحدد لا ينتمي إلى مرحلتك التعليمية الحالية',
        );
      }
      return;
    }

    // Level only: the grade the student already has must survive the move.
    if (currentGradeId) {
      const currentGradeLevelId =
        await this.educationRepository.findGradeLevelId(currentGradeId);
      if (currentGradeLevelId !== educationLevelId) {
        throw new BadRequestException(
          'صفك الدراسي الحالي لا ينتمي إلى المرحلة التعليمية الجديدة، يرجى اختيار صف دراسي أيضاً',
        );
      }
    }
  }
}
