import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { I18nContext } from 'nestjs-i18n';
import {
  ErrorResponse,
  ValidationError,
} from '../interfaces/error-response.interface';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const i18n = I18nContext.current(host);

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error: string | undefined;
    let validationErrors: ValidationError[] | undefined;

    // Handle HttpException (including BadRequestException, ConflictException, etc.)
    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as any;

        // DEBUG: Log the actual structure
        this.logger.debug(
          'Exception response object:',
          JSON.stringify(responseObj, null, 2),
        );

        if (
          this.isTranslationKey(responseObj.message) ||
          responseObj.translationArgs !== undefined
        ) {
          const translated = i18n?.t(responseObj.message, {
            args: responseObj.translationArgs || {},
          });
          message = (translated as string) || responseObj.message;
        }
        // Handle validation errors from class-validator
        else if (Array.isArray(responseObj.message)) {
          this.logger.debug(
            'Validation errors detected:',
            JSON.stringify(responseObj.message, null, 2),
          );
          validationErrors = this.formatValidationErrors(
            responseObj.message,
            i18n,
          );
          const translated = i18n?.t('common.errors.validationFailed');
          message = (translated as string) || 'Validation failed';
        } else {
          message = responseObj.message || message;
        }

        error = responseObj.error;
      }
    } else {
      // Log unexpected errors
      this.logger.error(
        `Unexpected error: ${exception}`,
        exception instanceof Error ? exception.stack : '',
      );
    }

    // Translate common error messages
    message = this.translateErrorMessage(message, statusCode, i18n);

    const errorResponse: ErrorResponse = {
      success: false,
      statusCode,
      message,
      error,
      errors: validationErrors,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // Log the error
    this.logger.error(
      `${request.method} ${request.url} - Status: ${statusCode} - Message: ${message}`,
    );

    response.status(statusCode).json(errorResponse);
  }

  private formatValidationErrors(
    messages: any[],
    i18n: I18nContext | undefined,
  ): ValidationError[] {
    this.logger.debug('i18n context available:', !!i18n);
    this.logger.debug('Current language:', i18n?.lang);

    return messages.map((msg) => {
      this.logger.debug(
        'Processing validation message:',
        JSON.stringify(msg, null, 2),
      );

      // Handle if msg is a string
      if (typeof msg === 'string') {
        this.logger.debug('Message is a string:', msg);
        return { field: 'unknown', message: msg };
      }

      // Handle if msg is an object (ValidationError from class-validator)
      // The structure should be: { property, constraints, children, ... }
      const field = msg.property || 'unknown';
      const constraints = msg.constraints || {};
      const constraintKeys = Object.keys(constraints);

      this.logger.debug(`Field: ${field}, Constraints:`, constraints);

      if (constraintKeys.length === 0) {
        return {
          field,
          message: 'Invalid value',
          value: msg.value,
        };
      }

      // Get the first constraint
      const firstConstraint = constraintKeys[0];
      const originalMessage = constraints[firstConstraint];

      this.logger.debug(
        `First constraint: ${firstConstraint}, Original message: ${originalMessage}`,
      );

      // Prepare translation
      let translatedMessage = originalMessage;

      if (i18n) {
        const translationKey = `validation.${firstConstraint}`;
        this.logger.debug(`Translation key: ${translationKey}`);

        // Build translation arguments
        const translationArgs: any = {
          field: this.translateFieldName(field, i18n),
        };

        // Extract numeric values from constraint messages
        if (firstConstraint === 'minLength') {
          const match = originalMessage.match(/(\d+)/);
          if (match) translationArgs.min = match[1];
        } else if (firstConstraint === 'maxLength') {
          const match = originalMessage.match(/(\d+)/);
          if (match) translationArgs.max = match[1];
        } else if (firstConstraint === 'min') {
          const match = originalMessage.match(/(\d+)/);
          if (match) translationArgs.min = match[1];
        } else if (firstConstraint === 'max') {
          const match = originalMessage.match(/(\d+)/);
          if (match) translationArgs.max = match[1];
        }

        this.logger.debug('Translation args:', translationArgs);

        try {
          const translated = i18n.t(translationKey, {
            args: translationArgs,
          }) as string;

          this.logger.debug(`Translated message: ${translated}`);

          // Check if translation was successful
          if (translated && translated !== translationKey) {
            translatedMessage = translated;
          } else {
            this.logger.warn(
              `Translation not found for key: ${translationKey}`,
            );
          }
        } catch (error) {
          this.logger.error('Translation error:', error);
        }
      } else {
        this.logger.warn(
          'i18n context not available for validation error translation',
        );
      }

      return {
        field,
        message: translatedMessage,
        value: msg.value,
      };
    });
  }

  private translateFieldName(field: string, i18n: I18nContext): string {
    const translationKey = `fields.${field}`;

    try {
      const translated = i18n.t(translationKey) as string;

      if (translated && translated !== translationKey) {
        return translated;
      }
    } catch (error) {
      this.logger.debug(`Field name translation not found for: ${field}`);
    }

    return field;
  }

  private translateErrorMessage(
    message: string,
    statusCode: number,
    i18n: I18nContext | undefined,
  ): string {
    if (!i18n) return message;

    const errorKeyMap: Record<string, string> = {
      'Bad Request': 'common.errors.badRequest',
      Unauthorized: 'common.errors.unauthorized',
      Forbidden: 'common.errors.forbidden',
      'Not Found': 'common.errors.notFound',
      Conflict: 'common.errors.conflict',
      'Internal Server Error': 'common.errors.internalServerError',
    };

    const translationKey = errorKeyMap[message];
    if (translationKey) {
      const translated = i18n.t(translationKey) as string;
      if (translated && translated !== translationKey) {
        return translated;
      }
    }

    return message;
  }

  private isTranslationKey(message: string): boolean {
    if (!message || typeof message !== 'string') {
      return false;
    }
    return /^[a-z]+\.[a-z]+\.[a-zA-Z]+$/.test(message);
  }
}
