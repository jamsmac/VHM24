import { plainToInstance } from 'class-transformer';
import { IsString, IsNumber, IsOptional, IsIn, validateSync, Min, Max } from 'class-validator';

/**
 * Environment variables validation schema
 *
 * Ensures all required environment variables are present and valid at application startup.
 * Prevents runtime crashes due to missing configuration.
 */
class EnvironmentVariables {
  // Node environment
  @IsIn(['development', 'production', 'test'])
  NODE_ENV: string = 'development';

  @IsNumber()
  @Min(1000)
  @Max(65535)
  PORT: number = 3000;

  // Database configuration
  @IsString()
  DATABASE_HOST: string;

  @IsNumber()
  @Min(1)
  @Max(65535)
  DATABASE_PORT: number;

  @IsString()
  DATABASE_USER: string;

  @IsString()
  DATABASE_PASSWORD: string;

  @IsString()
  DATABASE_NAME: string;

  // JWT configuration (CRITICAL - must be present)
  @IsString()
  JWT_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_REFRESH_SECRET?: string;

  @IsString()
  @IsOptional()
  JWT_ACCESS_EXPIRATION?: string = '15m';

  @IsString()
  @IsOptional()
  JWT_REFRESH_EXPIRATION?: string = '7d';

  // Redis configuration
  @IsString()
  @IsOptional()
  REDIS_HOST?: string = 'localhost';

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(65535)
  REDIS_PORT?: number = 6379;

  @IsString()
  @IsOptional()
  REDIS_PASSWORD?: string;

  // S3 Storage configuration
  @IsString()
  @IsOptional()
  S3_ENDPOINT?: string;

  @IsString()
  @IsOptional()
  S3_BUCKET?: string;

  @IsString()
  @IsOptional()
  S3_ACCESS_KEY?: string;

  @IsString()
  @IsOptional()
  S3_SECRET_KEY?: string;

  @IsString()
  @IsOptional()
  S3_REGION?: string = 'us-east-1';

  @IsString()
  @IsOptional()
  S3_PUBLIC_URL?: string;

  // Frontend URL (required in production)
  @IsString()
  @IsOptional()
  FRONTEND_URL?: string;

  // Rate limiting
  @IsNumber()
  @IsOptional()
  @Min(1000)
  THROTTLE_TTL?: number = 60000;

  @IsNumber()
  @IsOptional()
  @Min(1)
  THROTTLE_LIMIT?: number = 100;

  // Database connection pool
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  DB_POOL_MAX?: number = 20;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(50)
  DB_POOL_MIN?: number = 5;

  // Telegram bot
  @IsString()
  @IsOptional()
  TELEGRAM_BOT_TOKEN?: string;

  // Email
  @IsString()
  @IsOptional()
  SMTP_HOST?: string;

  @IsNumber()
  @IsOptional()
  SMTP_PORT?: number = 587;

  @IsString()
  @IsOptional()
  SMTP_USER?: string;

  @IsString()
  @IsOptional()
  SMTP_PASSWORD?: string;

  // Monitoring
  @IsString()
  @IsOptional()
  LOG_LEVEL?: string = 'info';

  @IsString()
  @IsOptional()
  SENTRY_DSN?: string;

  // Scheduled tasks
  @IsString()
  @IsOptional()
  ENABLE_SCHEDULED_TASKS?: string = 'true';

  @IsString()
  @IsOptional()
  NOTIFICATION_CHECK_INTERVAL?: string = '*/5 * * * *';

  @IsString()
  @IsOptional()
  LOW_STOCK_CHECK_INTERVAL?: string = '0 */6 * * *';

  @IsString()
  @IsOptional()
  OVERDUE_TASK_CHECK_INTERVAL?: string = '0 * * * *';

  // CORS
  @IsString()
  @IsOptional()
  CORS_ORIGINS?: string;

  // File upload
  @IsNumber()
  @IsOptional()
  @Min(1024)
  MAX_FILE_SIZE?: number = 10485760; // 10MB

  @IsString()
  @IsOptional()
  ALLOWED_FILE_TYPES?: string;

  // Web Push
  @IsString()
  @IsOptional()
  VAPID_PUBLIC_KEY?: string;

  @IsString()
  @IsOptional()
  VAPID_PRIVATE_KEY?: string;

  @IsString()
  @IsOptional()
  VAPID_EMAIL?: string = 'admin@vendhub.com';
}

/**
 * Validate environment variables
 *
 * @param config - Raw environment configuration object
 * @returns Validated and transformed configuration
 * @throws Error if validation fails
 */
export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const errorMessages = errors
      .map((error) => {
        const constraints = Object.values(error.constraints || {}).join(', ');
        return `${error.property}: ${constraints}`;
      })
      .join('\n');

    throw new Error(
      `❌ Environment validation failed:\n${errorMessages}\n\n` +
        `Please check your .env file and ensure all required variables are set.\n` +
        `See .env.example for reference.`,
    );
  }

  return validatedConfig;
}
