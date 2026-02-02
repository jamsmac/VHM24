# Helmet.js Configuration для VendHub

## Установка

```bash
npm install helmet
```

## Базовая настройка

```typescript
// backend/src/main.ts
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Включить все security headers с настройками по умолчанию
  app.use(helmet());

  await app.listen(3000);
}
```

## Расширенная настройка

```typescript
// backend/src/config/helmet.config.ts
import helmet from 'helmet';

export const helmetConfig = helmet({
  // Content-Security-Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // Для inline scripts (минимизировать!)
        'https://cdn.jsdelivr.net', // CDN для библиотек
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Для inline styles
        'https://fonts.googleapis.com',
      ],
      imgSrc: [
        "'self'",
        'data:',
        'blob:',
        'https://*.cloudflare.com', // R2 storage
        'https://api.telegram.org', // Telegram avatars
      ],
      fontSrc: [
        "'self'",
        'https://fonts.gstatic.com',
      ],
      connectSrc: [
        "'self'",
        'https://api.vendhub.uz',
        'wss://api.vendhub.uz', // WebSocket
        'https://*.sentry.io', // Sentry
      ],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },

  // X-Frame-Options: DENY
  frameguard: {
    action: 'deny',
  },

  // X-Content-Type-Options: nosniff
  noSniff: true,

  // Strict-Transport-Security
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },

  // X-XSS-Protection
  xssFilter: true,

  // Referrer-Policy
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin',
  },

  // X-DNS-Prefetch-Control
  dnsPrefetchControl: {
    allow: false,
  },

  // X-Download-Options
  ieNoOpen: true,

  // X-Permitted-Cross-Domain-Policies
  permittedCrossDomainPolicies: {
    permittedPolicies: 'none',
  },
});
```

## Использование

```typescript
// backend/src/main.ts
import { helmetConfig } from './config/helmet.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmetConfig);

  await app.listen(3000);
}
```

## Content-Security-Policy для разных окружений

```typescript
// backend/src/config/csp.config.ts

const isDevelopment = process.env.NODE_ENV === 'development';

export const cspConfig = {
  directives: {
    defaultSrc: ["'self'"],

    scriptSrc: isDevelopment
      ? ["'self'", "'unsafe-inline'", "'unsafe-eval'"] // Dev: разрешить eval для HMR
      : ["'self'"],

    styleSrc: ["'self'", "'unsafe-inline'"],

    imgSrc: [
      "'self'",
      'data:',
      'blob:',
      ...(isDevelopment ? ['http://localhost:*'] : []),
      'https://*.cloudflare.com',
    ],

    connectSrc: [
      "'self'",
      ...(isDevelopment
        ? ['http://localhost:*', 'ws://localhost:*']
        : ['https://api.vendhub.uz', 'wss://api.vendhub.uz']),
    ],

    // Report violations (в production)
    ...(isDevelopment
      ? {}
      : {
          reportUri: '/api/csp-report',
        }),
  },
};
```

## CSP Report Endpoint

```typescript
// backend/src/modules/security/csp-report.controller.ts
import { Controller, Post, Body, Logger } from '@nestjs/common';

@Controller('csp-report')
export class CspReportController {
  private readonly logger = new Logger(CspReportController.name);

  @Post()
  handleCspReport(@Body() report: any) {
    this.logger.warn({
      message: 'CSP Violation',
      report: report['csp-report'],
    });
  }
}
```

## Проверка headers

```bash
# Проверить все security headers
curl -I https://api.vendhub.uz/health

# Ожидаемый результат:
# Content-Security-Policy: default-src 'self'; ...
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
# X-XSS-Protection: 1; mode=block
# Referrer-Policy: strict-origin-when-cross-origin
```

## Тестирование CSP

```bash
# Использовать securityheaders.com
# https://securityheaders.com/?q=https://api.vendhub.uz

# Или Mozilla Observatory
# https://observatory.mozilla.org/
```
