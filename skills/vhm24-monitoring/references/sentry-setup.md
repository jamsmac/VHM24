# Sentry Setup для VendHub

## Установка

### Backend (NestJS)

```bash
npm install @sentry/node @sentry/tracing
```

### Frontend (Next.js)

```bash
npm install @sentry/nextjs
```

## Backend Configuration

### sentry.config.ts

```typescript
// backend/src/config/sentry.config.ts
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

export function initSentry() {
  if (!process.env.SENTRY_DSN) {
    console.warn('Sentry DSN not configured, skipping initialization');
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    release: `vendhub-backend@${process.env.npm_package_version}`,

    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Profiling
    profilesSampleRate: 0.1,

    integrations: [
      // HTTP tracing
      new Sentry.Integrations.Http({ tracing: true }),
      // PostgreSQL tracing
      new Sentry.Integrations.Postgres(),
      // Profiling
      nodeProfilingIntegration(),
    ],

    // Фильтрация ошибок
    beforeSend(event, hint) {
      const error = hint.originalException as Error;

      // Игнорировать 4xx ошибки
      if (error?.name === 'HttpException') {
        const status = (error as any).status;
        if (status >= 400 && status < 500) {
          return null;
        }
      }

      // Маскировать чувствительные данные
      if (event.request?.data) {
        const data = event.request.data;
        if (typeof data === 'object') {
          delete data.password;
          delete data.token;
          delete data.secret;
        }
      }

      return event;
    },
  });
}
```

### Подключение в main.ts

```typescript
// backend/src/main.ts
import { initSentry } from './config/sentry.config';
import * as Sentry from '@sentry/node';

async function bootstrap() {
  // Initialize Sentry FIRST
  initSentry();

  const app = await NestFactory.create(AppModule);

  // Sentry request handler
  app.use(Sentry.Handlers.requestHandler());

  // Sentry tracing handler
  app.use(Sentry.Handlers.tracingHandler());

  // ... other middleware

  // Sentry error handler (MUST be before other error handlers)
  app.use(Sentry.Handlers.errorHandler());

  await app.listen(3000);
}
```

### Sentry Exception Filter

```typescript
// backend/src/common/filters/sentry-exception.filter.ts
import { Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import * as Sentry from '@sentry/node';

@Catch()
export class SentryExceptionFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();

    // Capture to Sentry
    Sentry.withScope((scope) => {
      // Add user context
      if (request.user) {
        scope.setUser({
          id: request.user.id,
          username: request.user.username,
          role: request.user.role,
        });
      }

      // Add request context
      scope.setExtra('url', request.url);
      scope.setExtra('method', request.method);
      scope.setExtra('body', request.body);
      scope.setExtra('query', request.query);

      // Add correlation ID
      scope.setTag('correlationId', request.correlationId);

      Sentry.captureException(exception);
    });

    super.catch(exception, host);
  }
}
```

### Подключение фильтра

```typescript
// backend/src/app.module.ts
import { APP_FILTER } from '@nestjs/core';
import { SentryExceptionFilter } from './common/filters/sentry-exception.filter';

@Module({
  providers: [
    {
      provide: APP_FILTER,
      useClass: SentryExceptionFilter,
    },
  ],
})
export class AppModule {}
```

## Frontend Configuration (Next.js)

### sentry.client.config.ts

```typescript
// frontend/sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: `vendhub-frontend@${process.env.NEXT_PUBLIC_VERSION}`,

  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    new Sentry.Replay({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],

  beforeSend(event) {
    // Фильтрация ошибок браузера
    if (event.exception?.values?.[0]?.type === 'ChunkLoadError') {
      return null; // Игнорировать ошибки загрузки chunks
    }
    return event;
  },
});
```

### sentry.server.config.ts

```typescript
// frontend/sentry.server.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: `vendhub-frontend@${process.env.NEXT_PUBLIC_VERSION}`,
  tracesSampleRate: 0.1,
});
```

### next.config.js

```javascript
// frontend/next.config.js
const { withSentryConfig } = require('@sentry/nextjs');

const nextConfig = {
  // ... your config
};

module.exports = withSentryConfig(nextConfig, {
  silent: true,
  org: 'vendhub',
  project: 'frontend',
  authToken: process.env.SENTRY_AUTH_TOKEN,
  hideSourceMaps: true,
});
```

## Manual Error Capturing

```typescript
// Захват ошибки с контекстом
try {
  await riskyOperation();
} catch (error) {
  Sentry.withScope((scope) => {
    scope.setTag('operation', 'riskyOperation');
    scope.setExtra('input', inputData);
    scope.setLevel('error');
    Sentry.captureException(error);
  });
  throw error;
}

// Захват сообщения
Sentry.captureMessage('Something unexpected happened', 'warning');

// Добавление breadcrumb
Sentry.addBreadcrumb({
  category: 'task',
  message: 'Task created',
  level: 'info',
  data: { taskId: task.id },
});
```

## Performance Monitoring

```typescript
// Создание транзакции
const transaction = Sentry.startTransaction({
  op: 'task.process',
  name: 'Process Task',
});

try {
  // Span для подоперации
  const span = transaction.startChild({
    op: 'db.query',
    description: 'SELECT * FROM tasks',
  });

  await queryDatabase();

  span.finish();
} finally {
  transaction.finish();
}
```

## Alerts в Sentry

### Настройка через Dashboard

1. **Project Settings → Alerts**
2. **Create Alert Rule:**

```yaml
# High Error Rate
Conditions:
  - Number of events > 10 in 5 minutes
Actions:
  - Send Telegram notification
  - Send email to team

# New Issue
Conditions:
  - A new issue is created
Actions:
  - Send notification

# Performance Alert
Conditions:
  - Transaction duration p95 > 2000ms
Actions:
  - Send notification
```

## Environment Variables

```bash
# Backend
SENTRY_DSN=https://xxx@sentry.io/xxx

# Frontend
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_AUTH_TOKEN=xxx  # Для source maps upload
SENTRY_ORG=vendhub
SENTRY_PROJECT=frontend

# Shared
NODE_ENV=production
```

## Release Tracking

```bash
# При деплое создавать release
sentry-cli releases new vendhub-backend@1.0.0
sentry-cli releases set-commits vendhub-backend@1.0.0 --auto
sentry-cli releases finalize vendhub-backend@1.0.0

# Загрузка source maps
sentry-cli releases files vendhub-frontend@1.0.0 upload-sourcemaps ./dist
```

## Полезные настройки

```typescript
// Игнорировать определённые ошибки
Sentry.init({
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'Network Error',
    'Request aborted',
    /^Loading chunk \d+ failed/,
  ],

  denyUrls: [
    /extensions\//i,
    /^chrome:\/\//i,
  ],
});
```
