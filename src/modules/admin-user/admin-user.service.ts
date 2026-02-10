import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { AdminUserRepository } from './repositories/admin-user.repository';
import { CreateUserDto, UpdateUserDto, QueryUserDto } from './dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminUserService {
  constructor(private readonly repository: AdminUserRepository) {}

  async create(createUserDto: CreateUserDto) {
    // Check if email already exists
    const emailExists = await this.repository.emailExists(createUserDto.email);
    if (emailExists) {
      throw new ConflictException('Email already exists');
    }

    // Check if serial already exists
    const serialExists = await this.repository.serialExists(createUserDto.serial);
    if (serialExists) {
      throw new ConflictException('Serial already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const user = await this.repository.create(createUserDto, hashedPassword);

    return {
      message: 'User created successfully',
      data: user,
    };
  }

  async findAll(query: QueryUserDto) {
    const result = await this.repository.findAll(query);

    return {
      message: 'Users retrieved successfully',
      data: result,
    };
  }

  async findOne(id: string) {
    const user = await this.repository.findById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      message: 'User details retrieved successfully',
      data: user,
    };
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    // Check if user exists
    const exists = await this.repository.exists(id);
    if (!exists) {
      throw new NotFoundException('User not found');
    }

    // Check email uniqueness if updating email
    if (updateUserDto.email) {
      const emailExists = await this.repository.emailExists(updateUserDto.email, id);
      if (emailExists) {
        throw new ConflictException('Email already exists');
      }
    }

    // Check serial uniqueness if updating serial
    if (updateUserDto.serial) {
      const serialExists = await this.repository.serialExists(updateUserDto.serial, id);
      if (serialExists) {
        throw new ConflictException('Serial already exists');
      }
    }

    // Hash password if updating
    let hashedPassword: string | undefined;
    if (updateUserDto.password) {
      hashedPassword = await bcrypt.hash(updateUserDto.password, 10);
    }

    const user = await this.repository.update(id, updateUserDto, hashedPassword);

    return {
      message: 'User updated successfully',
      data: user,
    };
  }

  async remove(id: string) {
    // Check if user exists
    const exists = await this.repository.exists(id);
    if (!exists) {
      throw new NotFoundException('User not found');
    }

    await this.repository.delete(id);

    return {
      message: 'User deleted successfully',
    };
  }

  async getStatistics() {
    const stats = await this.repository.getStatistics();

    return {
      message: 'User statistics retrieved successfully',
      data: stats,
    };
  }

  async suspendUser(id: string) {
    return this.update(id, { status: 'SUSPENDED' });
  }

  async activateUser(id: string) {
    return this.update(id, { status: 'ACTIVE' });
  }
}
