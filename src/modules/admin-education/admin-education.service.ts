import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { AdminEducationRepository } from './repositories/admin-education.repository';
import {
  CreateEducationLevelDto,
  UpdateEducationLevelDto,
  QueryEducationLevelDto,
  CreateGradeDto,
  UpdateGradeDto,
  QueryGradeDto,
} from './dto';
import { PaginationUtil } from '../../utils/pagination/pagination.util';

@Injectable()
export class AdminEducationService {
  constructor(private readonly repository: AdminEducationRepository) {}

  // ============================================
  // EDUCATION LEVELS
  // ============================================

  async createLevel(dto: CreateEducationLevelDto) {
    const existing = await this.repository.findLevelByName(dto.name);
    if (existing) {
      throw new ConflictException('An education level with this name already exists');
    }

    const level = await this.repository.createLevel(dto);
    return {
      message: 'Education level created successfully',
      data: level,
    };
  }

  async findAllLevels(query: QueryEducationLevelDto) {
    const { page = 1, limit = 10 } = query;
    const params = PaginationUtil.getPaginationParams(page, limit);

    const [levels, total] = await this.repository.findAllLevels(query);
    const paginatedResult = PaginationUtil.paginate(levels, total, params);

    return {
      message: 'Education levels retrieved successfully',
      ...paginatedResult,
    };
  }

  async findLevelById(id: string) {
    const level = await this.repository.findLevelById(id);
    if (!level) {
      throw new NotFoundException('Education level not found');
    }
    return {
      message: 'Education level details retrieved successfully',
      data: level,
    };
  }

  async updateLevel(id: string, dto: UpdateEducationLevelDto) {
    const exists = await this.repository.levelExists(id);
    if (!exists) {
      throw new NotFoundException('Education level not found');
    }

    if (dto.name) {
      const duplicate = await this.repository.findLevelByName(dto.name);
      if (duplicate && duplicate.id !== id) {
        throw new ConflictException(
          'An education level with this name already exists',
        );
      }
    }

    const level = await this.repository.updateLevel(id, dto);
    return {
      message: 'Education level updated successfully',
      data: level,
    };
  }

  async removeLevel(id: string) {
    const exists = await this.repository.levelExists(id);
    if (!exists) {
      throw new NotFoundException('Education level not found');
    }

    // Deleting a level cascades to its grades, which would silently detach
    // students and courses. Block it and let the admin reassign first.
    const { users, courses } = await this.repository.countLevelDependents(id);
    if (users > 0 || courses > 0) {
      throw new BadRequestException(
        `Cannot delete this education level: it is still used by ${users} user(s) and ${courses} course(s)`,
      );
    }

    await this.repository.deleteLevel(id);
    return {
      message: 'Education level deleted successfully',
    };
  }

  // ============================================
  // GRADES
  // ============================================

  async createGrade(dto: CreateGradeDto) {
    const levelExists = await this.repository.levelExists(dto.educationLevelId);
    if (!levelExists) {
      throw new NotFoundException('Education level not found');
    }

    const duplicate = await this.repository.findGradeByNameInLevel(
      dto.educationLevelId,
      dto.name,
    );
    if (duplicate) {
      throw new ConflictException(
        'A grade with this name already exists in this education level',
      );
    }

    const grade = await this.repository.createGrade(dto);
    return {
      message: 'Grade created successfully',
      data: grade,
    };
  }

  async findAllGrades(query: QueryGradeDto) {
    const { page = 1, limit = 10 } = query;
    const params = PaginationUtil.getPaginationParams(page, limit);

    const [grades, total] = await this.repository.findAllGrades(query);
    const paginatedResult = PaginationUtil.paginate(grades, total, params);

    return {
      message: 'Grades retrieved successfully',
      ...paginatedResult,
    };
  }

  async findGradeById(id: string) {
    const grade = await this.repository.findGradeById(id);
    if (!grade) {
      throw new NotFoundException('Grade not found');
    }
    return {
      message: 'Grade details retrieved successfully',
      data: grade,
    };
  }

  async updateGrade(id: string, dto: UpdateGradeDto) {
    const current = await this.repository.findGradeById(id);
    if (!current) {
      throw new NotFoundException('Grade not found');
    }

    if (dto.educationLevelId) {
      const levelExists = await this.repository.levelExists(
        dto.educationLevelId,
      );
      if (!levelExists) {
        throw new NotFoundException('Education level not found');
      }
    }

    // Uniqueness is per (level, name), so re-check whenever either changes.
    if (dto.name || dto.educationLevelId) {
      const targetLevelId = dto.educationLevelId ?? current.educationLevelId;
      const targetName = dto.name ?? current.name;
      const duplicate = await this.repository.findGradeByNameInLevel(
        targetLevelId,
        targetName,
      );
      if (duplicate && duplicate.id !== id) {
        throw new ConflictException(
          'A grade with this name already exists in this education level',
        );
      }
    }

    const grade = await this.repository.updateGrade(id, dto);
    return {
      message: 'Grade updated successfully',
      data: grade,
    };
  }

  async removeGrade(id: string) {
    const exists = await this.repository.gradeExists(id);
    if (!exists) {
      throw new NotFoundException('Grade not found');
    }

    const { users, courses } = await this.repository.countGradeDependents(id);
    if (users > 0 || courses > 0) {
      throw new BadRequestException(
        `Cannot delete this grade: it is still used by ${users} user(s) and ${courses} course(s)`,
      );
    }

    await this.repository.deleteGrade(id);
    return {
      message: 'Grade deleted successfully',
    };
  }
}
