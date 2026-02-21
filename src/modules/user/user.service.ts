import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from './repositories/user.repository';
import { UserQueryDto } from './dto';
import { PaginationUtil } from '../../utils/pagination/pagination.util';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async findAll(query: UserQueryDto) {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      sortBy,
      sortOrder,
    } = query;

    const skip = PaginationUtil.getSkip(page, limit);

    const [users, totalItems] = await Promise.all([
      this.userRepository.findAll({ skip, take: limit, search, status, sortBy, sortOrder }),
      this.userRepository.count({ search, status }),
    ]);

    const transformedUsers = users.map(({ _count, ...user }) => ({
      ...user,
      totalEnrollments: _count.enrollments,
      totalPurchases: _count.purchases,
    }));

    return {
      message: 'تم جلب المستخدمين بنجاح',
      ...PaginationUtil.paginate(transformedUsers, totalItems, { page, limit }),
    };
  }

  async findOne(id: string) {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundException('المستخدم غير موجود');
    }

    const { _count, ...userData } = user;

    return {
      message: 'تم جلب بيانات المستخدم بنجاح',
      data: {
        ...userData,
        totalEnrollments: _count.enrollments,
        totalPurchases: _count.purchases,
      },
    };
  }
}
