import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * The exact projection both profile endpoints return.
 *
 * `password` and `serial` are deliberately absent — they must never leave the
 * API. Level/grade are exposed as nested `{ id, name }` objects only, so the
 * raw foreign keys never appear in the payload.
 */
const PROFILE_SELECT = {
  id: true,
  email: true,
  name: true,
  parentPhone: true,
  status: true,
  educationLevel: { select: { id: true, name: true } },
  grade: { select: { id: true, name: true } },
  createdAt: true,
  lastLoginAt: true,
} satisfies Prisma.UserSelect;

/** Fields a student is allowed to change on their own profile. */
export interface UpdateProfileData {
  name?: string;
  parentPhone?: string | null;
  educationLevelId?: string;
  gradeId?: string;
}

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** The signed-in student's profile, or null when the row is gone. */
  async findProfileById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: PROFILE_SELECT,
    });
  }

  /**
   * Applies a partial profile update. Only keys present on `data` are written,
   * so an omitted field keeps its current value while an explicit `null`
   * parentPhone clears it.
   */
  async updateProfile(id: string, data: UpdateProfileData) {
    return this.prisma.user.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.parentPhone !== undefined && {
          parentPhone: data.parentPhone,
        }),
        ...(data.educationLevelId !== undefined && {
          educationLevelId: data.educationLevelId,
        }),
        ...(data.gradeId !== undefined && { gradeId: data.gradeId }),
      },
      select: PROFILE_SELECT,
    });
  }
}
