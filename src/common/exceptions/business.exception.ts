import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Custom exception for business logic errors with i18n support
 */
export class BusinessException extends HttpException {
  constructor(
    translationKey: string,
    translationArgs?: Record<string, any>,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super(
      {
        message: translationKey,
        translationArgs,
      },
      statusCode,
    );
  }
}

/**
 * Helper functions for common exceptions with translation keys
 */
export class TranslatedException {
  static badRequest(key: string, args?: Record<string, any>) {
    return new BusinessException(key, args, HttpStatus.BAD_REQUEST);
  }

  static unauthorized(key: string, args?: Record<string, any>) {
    return new BusinessException(key, args, HttpStatus.UNAUTHORIZED);
  }

  static forbidden(key: string, args?: Record<string, any>) {
    return new BusinessException(key, args, HttpStatus.FORBIDDEN);
  }

  static notFound(key: string, args?: Record<string, any>) {
    return new BusinessException(key, args, HttpStatus.NOT_FOUND);
  }

  static conflict(key: string, args?: Record<string, any>) {
    return new BusinessException(key, args, HttpStatus.CONFLICT);
  }

  static internalError(key: string, args?: Record<string, any>) {
    return new BusinessException(key, args, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
