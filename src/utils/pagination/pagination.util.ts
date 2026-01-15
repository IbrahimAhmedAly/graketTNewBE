export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginationMetadata {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  metadata: PaginationMetadata;
}

export class PaginationUtil {
  /**
   * Calculate pagination metadata and return paginated result
   */
  static paginate<T>(
    data: T[],
    totalItems: number,
    params: PaginationParams,
  ): PaginatedResult<T> {
    const { page, limit } = params;
    const totalPages = Math.ceil(totalItems / limit);

    return {
      data,
      metadata: {
        currentPage: page,
        itemsPerPage: limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Calculate skip value for Prisma queries
   */
  static getSkip(page: number, limit: number): number {
    return (page - 1) * limit;
  }

  /**
   * Get pagination parameters from query
   */
  static getPaginationParams(
    page: number = 1,
    limit: number = 10,
  ): PaginationParams {
    return {
      page: Math.max(1, page),
      limit: Math.min(100, Math.max(1, limit)),
    };
  }
}
