import { utilities as nestWinstonModuleUtilities, WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import * as fs from 'fs';

/**
 * Maps LOG_LEVEL env to Winston log levels.
 * NestJS levels: error, warn, log, debug, verbose
 * Winston levels: error, warn, info, http, verbose, debug, silly
 */
function getWinstonLogLevel(): string {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase();
  const isProduction = process.env.NODE_ENV === 'production';

  if (envLevel) {
    // Map NestJS-style levels to Winston levels
    const levelMap: Record<string, string> = {
      error: 'error',
      warn: 'warn',
      log: 'info',
      info: 'info',
      debug: 'debug',
      verbose: 'verbose',
    };
    return levelMap[envLevel] || envLevel;
  }

  // Default: production=warn, development=info
  return isProduction ? 'warn' : 'info';
}

/**
 * Determines if running on Railway platform.
 */
function isRailway(): boolean {
  return !!(process.env.RAILWAY_ENVIRONMENT_NAME || process.env.RAILWAY_PROJECT_ID);
}

/**
 * Gets writable log directory. On Railway uses /tmp/logs, locally uses logs/.
 */
function getLogDir(): string {
  if (isRailway()) {
    return '/tmp/logs';
  }
  return 'logs';
}

export const createWinstonLogger = () => {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const logLevel = getWinstonLogLevel();

  // Ensure log directory exists for file transports
  const fileTransports: winston.transport[] = [];
  if (!isDevelopment && !isRailway()) {
    // File transports only for non-Railway production (Railway captures stdout)
    const logDir = getLogDir();
    try {
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      fileTransports.push(
        new winston.transports.File({
          filename: `${logDir}/error.log`,
          level: 'error',
          format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
        }),
        new winston.transports.File({
          filename: `${logDir}/combined.log`,
          level: logLevel,
          format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
        }),
      );
    } catch {
      // If log directory creation fails, skip file transports silently
    }
  }

  return WinstonModule.createLogger({
    transports: [
      new winston.transports.Console({
        level: logLevel,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.ms(),
          nestWinstonModuleUtilities.format.nestLike('VendHub', {
            colors: isDevelopment,
            prettyPrint: isDevelopment,
          }),
        ),
      }),
      ...fileTransports,
    ],
  });
};
