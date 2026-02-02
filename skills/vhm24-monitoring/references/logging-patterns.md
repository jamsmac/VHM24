# Logging Patterns для VendHub

## Установка

```bash
npm install winston winston-daily-rotate-file
npm install nest-winston  # NestJS интеграция
```

## Winston Configuration

### logger.config.ts

```typescript
// backend/src/config/logger.config.ts
import { WinstonModule, utilities as nestWinstonModuleUtilities } from 'nest-winston';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

const isProduction = process.env.NODE_ENV === 'production';

// Формат для development (красивый вывод)
const devFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.ms(),
  nestWinstonModuleUtilities.format.nestLike('VendHub', {
    colors: true,
    prettyPrint: true,
  }),
);

// Формат для production (JSON для парсинга)
const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

export const loggerConfig = WinstonModule.createLogger({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  format: isProduction ? prodFormat : devFormat,
  defaultMeta: {
    service: 'vendhub-backend',
    version: process.env.npm_package_version,
  },
  transports: [
    // Console
    new winston.transports.Console({
      format: isProduction ? prodFormat : devFormat,
    }),

    // File: All logs
    new winston.transports.DailyRotateFile({
      filename: 'logs/vendhub-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d',
      maxSize: '20m',
      format: prodFormat,
    }),

    // File: Errors only
    new winston.transports.DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '30d',
      level: 'error',
      format: prodFormat,
    }),
  ],
});
```

### Подключение в main.ts

```typescript
// backend/src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { loggerConfig } from './config/logger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: loggerConfig,
  });

  await app.listen(3000);
}
bootstrap();
```

## Request Logging Middleware

```typescript
// backend/src/common/middleware/request-logger.middleware.ts
import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, ip } = req;
    const userAgent = req.get('user-agent') || '';
    const correlationId = req.get('x-correlation-id') || uuidv4();

    // Добавляем correlation ID в request
    req['correlationId'] = correlationId;
    res.setHeader('x-correlation-id', correlationId);

    const startTime = Date.now();

    res.on('finish', () => {
      const { statusCode } = res;
      const duration = Date.now() - startTime;
      const contentLength = res.get('content-length') || 0;

      const logData = {
        correlationId,
        method,
        url: originalUrl,
        statusCode,
        duration,
        contentLength,
        ip,
        userAgent,
      };

      if (statusCode >= 500) {
        this.logger.error(logData);
      } else if (statusCode >= 400) {
        this.logger.warn(logData);
      } else {
        this.logger.log(logData);
      }
    });

    next();
  }
}
```

### Подключение middleware

```typescript
// backend/src/app.module.ts
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';

@Module({})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
```

## Structured Logging в сервисах

```typescript
// backend/src/modules/tasks/tasks.service.ts
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  async createTask(dto: CreateTaskDto, userId: string) {
    this.logger.log({
      message: 'Creating task',
      taskType: dto.type,
      machineId: dto.machineId,
      userId,
    });

    try {
      const task = await this.taskRepository.save(dto);

      this.logger.log({
        message: 'Task created successfully',
        taskId: task.id,
        taskType: task.type,
      });

      return task;
    } catch (error) {
      this.logger.error({
        message: 'Failed to create task',
        error: error.message,
        stack: error.stack,
        dto,
        userId,
      });
      throw error;
    }
  }
}
```

## Log Levels

| Level | Когда использовать | Пример |
|-------|-------------------|--------|
| `error` | Ошибки, требующие внимания | Database connection failed |
| `warn` | Потенциальные проблемы | Slow query detected |
| `log/info` | Важные события | Task created, User logged in |
| `debug` | Отладочная информация | Request payload, Query params |
| `verbose` | Детальная информация | Cache hit/miss |

## Примеры логов

### Development (colorized)

```
[VendHub] Info    2/1/2025, 10:00:00 PM [HTTP] - {"method":"POST","url":"/api/tasks","statusCode":201,"duration":45}
[VendHub] Debug   2/1/2025, 10:00:00 PM [TasksService] - Creating task {"type":"refill","machineId":"M001"}
[VendHub] Info    2/1/2025, 10:00:00 PM [TasksService] - Task created successfully {"taskId":"T123"}
```

### Production (JSON)

```json
{"level":"info","message":"Task created successfully","taskId":"T123","taskType":"refill","service":"vendhub-backend","timestamp":"2025-02-01T22:00:00.000Z"}
{"level":"error","message":"Database query failed","error":"Connection timeout","stack":"...","service":"vendhub-backend","timestamp":"2025-02-01T22:00:01.000Z"}
```

## Интеграция с внешними сервисами

### Отправка в Loki (Grafana)

```typescript
// Добавить транспорт для Loki
import LokiTransport from 'winston-loki';

new LokiTransport({
  host: process.env.LOKI_HOST,
  labels: { app: 'vendhub', env: process.env.NODE_ENV },
  json: true,
  batching: true,
  interval: 5,
});
```

### Отправка в CloudWatch

```typescript
import WinstonCloudWatch from 'winston-cloudwatch';

new WinstonCloudWatch({
  logGroupName: 'vendhub',
  logStreamName: process.env.NODE_ENV,
  awsRegion: process.env.AWS_REGION,
});
```

## Безопасность логов

```typescript
// НЕ логировать:
// - Пароли
// - Токены
// - Персональные данные (PII)
// - Номера карт

// Маскирование чувствительных данных
function maskSensitive(obj: any): any {
  const sensitiveFields = ['password', 'token', 'secret', 'cardNumber'];
  const masked = { ...obj };

  for (const field of sensitiveFields) {
    if (masked[field]) {
      masked[field] = '***MASKED***';
    }
  }

  return masked;
}
```
