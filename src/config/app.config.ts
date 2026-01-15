import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import helmet from 'helmet';
import { envConfig } from './env.config';

// Security Headers Configuration
export const securityConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  crossOriginEmbedderPolicy: false,
});

// CORS Configuration
export const corsConfig: CorsOptions = {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Accept-Language',
  ],
  credentials: true,
  optionsSuccessStatus: 200,
};

// Validation Configuration with proper error handling
export const validationConfig = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: {
    enableImplicitConversion: true,
  },
  // CRITICAL: This ensures validation errors maintain their structure
  exceptionFactory: (errors) => {
    // Format errors to preserve the structure we need
    const formattedErrors = errors.map((error) => ({
      property: error.property,
      value: error.value,
      constraints: error.constraints,
      children: error.children,
    }));

    // Return BadRequestException with the errors in the message field
    return new BadRequestException(formattedErrors);
  },
});

// App Settings
export const appConfig = {
  globalPrefix: 'api/v1',
};
