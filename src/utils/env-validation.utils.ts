import { validateSync, ValidationError } from 'class-validator';
import { plainToClass, ClassConstructor } from 'class-transformer';

/**
 * Validates environment variables using class-validator
 * @param cls - The class constructor with validation decorators
 * @param config - The configuration object to validate (usually process.env)
 * @returns Validated and transformed configuration object
 */
export function validateEnvironment<T extends object>(
  cls: ClassConstructor<T>,
  config: Record<string, unknown>,
): T {
  const validatedConfig = plainToClass(cls, config, {
    enableImplicitConversion: true,
  });

  const errors: ValidationError[] = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    console.error('❌ Environment validation failed:');

    errors.forEach((error) => {
      const constraints = error.constraints || {};
      console.error(
        `- ${error.property}: ${Object.values(constraints).join(', ')}`,
      );
    });

    console.error('\n💡 Please check your .env file and fix the above issues.');
    process.exit(1);
  }

  return validatedConfig;
}
