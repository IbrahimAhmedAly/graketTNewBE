import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';

// Repository
import { InstructorRepository } from './repositories/instructor.repository';

// DTOs
import {
  CreateInstructorDto,
  UpdateInstructorDto,
  InstructorResponseDto,
} from './dto';

// Utils
import {
  PaginationUtil,
  PaginatedResult,
} from '../../utils/pagination/pagination.util';

/**
 * Instructor Service
 * Handles all instructor business logic
 */
@Injectable()
export class InstructorService {
  constructor(private readonly instructorRepository: InstructorRepository) {}

  /**
   * Create a new instructor
   */
  async create(
    createInstructorDto: CreateInstructorDto,
  ): Promise<{ message: string; data: InstructorResponseDto }> {
    const { email, ...rest } = createInstructorDto;

    // Check if email already exists (if provided)
    if (email) {
      const existingInstructor =
        await this.instructorRepository.findByEmail(email);
      if (existingInstructor) {
        throw new ConflictException('البريد الإلكتروني مستخدم بالفعل');
      }
    }

    const instructor = await this.instructorRepository.create({
      email,
      ...rest,
    });

    return {
      message: 'تم إنشاء المدرس بنجاح',
      data: instructor,
    };
  }

  /**
   * Get all instructors with pagination and search
   */
  async findAll(
    page: number = 1,
    limit: number = 10,
    search?: string,
  ): Promise<{
    message: string;
    data: PaginatedResult<InstructorResponseDto>;
  }> {
    const params = PaginationUtil.getPaginationParams(page, limit);
    const skip = PaginationUtil.getSkip(params.page, params.limit);

    // Get instructors and total count
    const [instructors, totalItems] = await Promise.all([
      this.instructorRepository.findAll({
        skip,
        take: params.limit,
        search,
      }),
      this.instructorRepository.count(search),
    ]);

    const paginatedResult = PaginationUtil.paginate(
      instructors,
      totalItems,
      params,
    );

    return {
      message: 'تم جلب قائمة المدرسين بنجاح',
      data: paginatedResult,
    };
  }

  /**
   * Get instructor by ID
   */
  async findOne(
    id: string,
  ): Promise<{ message: string; data: InstructorResponseDto }> {
    const instructor = await this.instructorRepository.findById(id);

    if (!instructor) {
      throw new NotFoundException('المدرس غير موجود');
    }

    return {
      message: 'تم جلب بيانات المدرس بنجاح',
      data: instructor,
    };
  }

  /**
   * Update instructor by ID
   */
  async update(
    id: string,
    updateInstructorDto: UpdateInstructorDto,
  ): Promise<{ message: string; data: InstructorResponseDto }> {
    // Check if instructor exists
    const existingInstructor = await this.instructorRepository.findById(id);
    if (!existingInstructor) {
      throw new NotFoundException('المدرس غير موجود');
    }

    // Check if email already exists (if updating email)
    if ('email' in updateInstructorDto && updateInstructorDto.email) {
      const emailExists =
        await this.instructorRepository.existsByEmailExcludingId(
          updateInstructorDto.email,
          id,
        );
      if (emailExists) {
        throw new ConflictException('البريد الإلكتروني مستخدم بالفعل');
      }
    }

    const updatedInstructor = await this.instructorRepository.update(
      id,
      updateInstructorDto,
    );

    return {
      message: 'تم تحديث بيانات المدرس بنجاح',
      data: updatedInstructor,
    };
  }

  /**
   * Delete instructor by ID
   */
  async remove(id: string): Promise<{ message: string }> {
    // Check if instructor exists
    const instructor = await this.instructorRepository.findById(id);
    if (!instructor) {
      throw new NotFoundException('المدرس غير موجود');
    }

    await this.instructorRepository.delete(id);

    return {
      message: 'تم حذف المدرس بنجاح',
    };
  }
}
