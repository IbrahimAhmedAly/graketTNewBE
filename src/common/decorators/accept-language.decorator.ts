import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const AcceptLanguage = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const acceptLanguage = request.headers['accept-language'];

    // Parse Accept-Language header
    if (acceptLanguage) {
      const lang = acceptLanguage.split(',')[0].split('-')[0].toLowerCase();
      return ['ar', 'en'].includes(lang) ? lang : 'en';
    }

    return 'ar'; // Default to Arabic if header is missing
  },
);
