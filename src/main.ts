import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { envConfig } from './config/env.config';
import {
  securityConfig,
  corsConfig,
  validationConfig,
  appConfig,
} from './config/app.config';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Serve static files for uploads
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  // Set global prefix FIRST
  app.setGlobalPrefix(appConfig.globalPrefix);

  // Enable CORS
  app.enableCors(corsConfig);

  // Security middleware
  app.use(securityConfig);

  // IMPORTANT: Set up global pipes BEFORE filters
  app.useGlobalPipes(validationConfig);

  // Set up global interceptors
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Set up global filters LAST (so it can catch everything)
  app.useGlobalFilters(new GlobalExceptionFilter());

  await app.listen(envConfig.port);

  logger.log(`🚀 Application running on port ${envConfig.port}`);
  logger.log(`📊 Environment: ${envConfig.environment}`);
  logger.log(
    `🌍 API available at: http://localhost:${envConfig.port}/${appConfig.globalPrefix}`,
  );
}

bootstrap();
