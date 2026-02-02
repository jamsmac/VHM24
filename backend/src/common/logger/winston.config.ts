import { utilities as nestWinstonModuleUtilities, WinstonModule } from 'nest-winston';
import * as winston from 'winston';

export const createWinstonLogger = () => {
  const isDevelopment = process.env.NODE_ENV !== 'production';
    const logDir = process.env.RAILWAY_ENVIRONMENT_NAME ? '/tmp/logs' : 'logs';

  return WinstonModule.createLogger({
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.ms(),
          nestWinstonModuleUtilities.format.nestLike('VendHub', {
            colors: isDevelopment,
            prettyPrint: isDevelopment,
          }),
        ),
      }),
      // Production: JSON format for log aggregation
      ...(isDevelopment
        ? []
        : [
            new winston.transports.File({
              filename: `${logDir}/error.log`,
              level: 'error',
              format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
            }),
            new winston.transports.File({
              filename: `${logDir}/combined.log`,
              format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
            }),
          ]),
    ],
  });
};
