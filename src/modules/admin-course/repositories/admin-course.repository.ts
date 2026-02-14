import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateCourseDto, UpdateCourseDto, QueryCourseDto } from '../dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class AdminCourseRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateCourseDto) {
    return this.prisma.course.create({
      data: {
        title: data.title,
        slug: data.slug,
        description: data.description,
        thumbnail: data.thumbnail,
        instructorId: data.instructorId,
        categoryId: data.categoryId,
        price: data.price || 0,
        discountPrice: data.discountPrice,
        isPublished: data.isPublished || false,
        totalDuration: data.totalDuration || 0,
        totalVideos: data.totalVideos || 0,
        totalQuizzes: data.totalQuizzes || 0,
      },
      include: {
        instructor: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });
  }

  async findAll(query: QueryCourseDto) {
    const {
      page = 1,
      limit = 10,
      search,
      categoryId,
      instructorId,
      isPublished,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      minPrice,
      maxPrice,
    } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.CourseWhereInput = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (instructorId) {
      where.instructorId = instructorId;
    }

    if (isPublished !== undefined) {
      where.isPublished = isPublished;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) {
        where.price.gte = minPrice;
      }
      if (maxPrice !== undefined) {
        where.price.lte = maxPrice;
      }
    }

    return Promise.all([
      this.prisma.course.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
        include: {
          instructor: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          _count: {
            select: {
              sections: true,
              enrollments: true,
              reviews: true,
            },
          },
        },
      }),
      this.prisma.course.count({ where }),
    ]);
  }

  async findById(id: string) {
    return this.prisma.course.findUnique({
      where: { id },
      include: {
        instructor: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            bio: true,
            title: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
          },
        },
        sections: {
          orderBy: { order: 'asc' },
          include: {
            contents: {
              orderBy: { order: 'asc' },
              include: {
                quiz: {
                  include: {
                    questions: {
                      orderBy: { order: 'asc' },
                      include: {
                        options: {
                          orderBy: { order: 'asc' },
                        },
                      },
                    },
                    _count: {
                      select: {
                        questions: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            sections: true,
            enrollments: true,
            reviews: true,
          },
        },
      },
    });
  }

  async update(id: string, data: UpdateCourseDto) {
    return this.prisma.course.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.slug && { slug: data.slug }),
        ...(data.description && { description: data.description }),
        ...(data.thumbnail !== undefined && { thumbnail: data.thumbnail }),
        ...(data.instructorId && { instructorId: data.instructorId }),
        ...(data.categoryId && { categoryId: data.categoryId }),
        ...(data.price !== undefined && { price: data.price }),
        ...(data.discountPrice !== undefined && {
          discountPrice: data.discountPrice,
        }),
        ...(data.isPublished !== undefined && {
          isPublished: data.isPublished,
        }),
        ...(data.totalDuration !== undefined && {
          totalDuration: data.totalDuration,
        }),
        ...(data.totalVideos !== undefined && {
          totalVideos: data.totalVideos,
        }),
        ...(data.totalQuizzes !== undefined && {
          totalQuizzes: data.totalQuizzes,
        }),
      },
      include: {
        instructor: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });
  }

  async delete(id: string) {
    return this.prisma.course.delete({
      where: { id },
    });
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.course.count({
      where: { id },
    });
    return count > 0;
  }

  async slugExists(slug: string, excludeId?: string): Promise<boolean> {
    const where: Prisma.CourseWhereInput = { slug };
    if (excludeId) {
      where.id = { not: excludeId };
    }
    const count = await this.prisma.course.count({ where });
    return count > 0;
  }
}
