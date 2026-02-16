import { IsEnum, IsString, IsNumberString } from 'class-validator';
import { Transform } from 'class-transformer';
import { config } from 'dotenv';
import { validateEnvironment } from '../utils/env-validation.utils';

// Load environment variables
config();

export enum Environment {
  DEVELOPMENT = 'development',
  PRODUCTION = 'production',
  TEST = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment;

  @IsNumberString()
  @Transform(({ value }) => value || '3000')
  PORT: string;

  @IsString()
  DATABASE_URL: string;

  // JWT Configuration
  @IsString()
  @Transform(({ value }) => value || '1h')
  JWT_ACCESS_TOKEN_EXPIRY: string;

  @IsString()
  @Transform(({ value }) => value || '7d')
  JWT_REFRESH_TOKEN_EXPIRY: string;

  // App Configuration
  @IsString()
  @Transform(({ value }) => value || 'http://localhost:3001')
  WEBSITE_URL: string;

  @IsString()
  @Transform(({ value }) => value || 'localhost')
  APP_HOST: string;

  // AWS Configuration
  @IsString()
  AWS_REGION: string;

  @IsString()
  AWS_ACCESS_KEY_ID: string;

  @IsString()
  AWS_SECRET_ACCESS_KEY: string;

  @IsString()
  AWS_S3_BUCKET_NAME: string;

  // Resend Configuration
  @IsString()
  RESEND_API_KEY: string;

  // UPayments Configuration
  @IsString()
  @Transform(
    ({ value }) => value || 'https://sandboxapi.upayments.com/api/v1/charge',
  )
  UPAYMENT_API_URL: string;

  @IsString()
  @Transform(({ value }) => value || 'jtest123')
  UPAYMENT_TOKEN: string;
}

const validatedEnv = validateEnvironment(EnvironmentVariables, process.env);

export const envConfig = {
  port: parseInt(validatedEnv.PORT, 10),
  environment: validatedEnv.NODE_ENV,
  isDevelopment: validatedEnv.NODE_ENV === Environment.DEVELOPMENT,
  isProduction: validatedEnv.NODE_ENV === Environment.PRODUCTION,
  isTest: validatedEnv.NODE_ENV === Environment.TEST,

  database: {
    url: validatedEnv.DATABASE_URL,
  },

  jwt: {
    accessTokenExpiry: validatedEnv.JWT_ACCESS_TOKEN_EXPIRY,
    refreshTokenExpiry: validatedEnv.JWT_REFRESH_TOKEN_EXPIRY,
  },

  app: {
    websiteUrl: validatedEnv.WEBSITE_URL,
    host: validatedEnv.APP_HOST,
  },

  aws: {
    region: validatedEnv.AWS_REGION,
    accessKeyId: validatedEnv.AWS_ACCESS_KEY_ID,
    secretAccessKey: validatedEnv.AWS_SECRET_ACCESS_KEY,
    s3BucketName: validatedEnv.AWS_S3_BUCKET_NAME,
  },

  resend: {
    apiKey: validatedEnv.RESEND_API_KEY,
  },

  payment: {
    upaymentApiUrl: validatedEnv.UPAYMENT_API_URL,
    upaymentToken: validatedEnv.UPAYMENT_TOKEN,
  },
};

export type EnvConfig = typeof envConfig;
