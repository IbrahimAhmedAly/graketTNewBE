import { Injectable } from '@nestjs/common';
import { AdminSelectListRepository } from './repositories/admin-select-list.repository';

@Injectable()
export class AdminSelectListService {
  constructor(private readonly repository: AdminSelectListRepository) {}

  async getInstructors() {
    const instructors = await this.repository.findAllInstructors();
    return {
      message: 'Instructors retrieved successfully',
      data: instructors,
    };
  }

  async getCategories() {
    const categories = await this.repository.findAllCategories();
    return {
      message: 'Categories retrieved successfully',
      data: categories,
    };
  }

  async getCourses() {
    const courses = await this.repository.findAllCourses();
    return {
      message: 'Courses retrieved successfully',
      data: courses,
    };
  }

  async getEducationLevels() {
    const levels = await this.repository.findAllEducationLevels();
    return {
      message: 'Education levels retrieved successfully',
      data: levels,
    };
  }

  async getGrades(educationLevelId?: string) {
    const grades = await this.repository.findAllGrades(educationLevelId);
    return {
      message: 'Grades retrieved successfully',
      data: grades,
    };
  }

  async getUsers(search?: string) {
    const users = await this.repository.findAllUsers(search);
    return {
      message: 'Users retrieved successfully',
      data: users,
    };
  }
}
