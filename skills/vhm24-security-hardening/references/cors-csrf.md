# CORS & CSRF Configuration для VendHub

## CORS (Cross-Origin Resource Sharing)

### Настройка в NestJS

```typescript
// backend/src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS configuration
  app.enableCors({
    // Allowed origins
    origin: (origin, callback) => {
      const allowedOrigins = [
        'https://app.vendhub.uz',
        'https://admin.vendhub.uz',
        // Staging
        'https://app-staging.vendhub.uz',
        // Development
        'http://localhost:3001',
        'http://localhost:3002',
      ];

      // Allow requests with no origin (mobile apps, Postman)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },

    // Allowed methods
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

    // Allowed headers
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-CSRF-Token',
      'Accept',
      'Origin',
    ],

    // Exposed headers (accessible to frontend)
    exposedHeaders: [
      'X-Total-Count',
      'X-Page',
      'X-Per-Page',
      'X-Total-Pages',
    ],

    // Allow credentials (cookies, authorization headers)
    credentials: true,

    // Preflight cache duration (24 hours)
    maxAge: 86400,
  });

  await app.listen(3000);
}
```

### CORS Configuration Module

```typescript
// backend/src/config/cors.config.ts
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

export const corsConfig = (): CorsOptions => {
  const isProduction = process.env.NODE_ENV === 'production';

  const productionOrigins = [
    'https://app.vendhub.uz',
    'https://admin.vendhub.uz',
  ];

  const developmentOrigins = [
    'http://localhost:3001',
    'http://localhost:3002',
    'https://app-staging.vendhub.uz',
    ...productionOrigins,
  ];

  return {
    origin: isProduction ? productionOrigins : developmentOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-CSRF-Token',
    ],
    credentials: true,
    maxAge: 86400,
  };
};

// Usage in main.ts
app.enableCors(corsConfig());
```

### Environment-based CORS

```typescript
// backend/src/config/configuration.ts
export default () => ({
  cors: {
    origins: process.env.CORS_ORIGINS?.split(',') || [
      'http://localhost:3001',
    ],
    credentials: true,
  },
});

// .env.production
CORS_ORIGINS=https://app.vendhub.uz,https://admin.vendhub.uz

// .env.staging
CORS_ORIGINS=https://app-staging.vendhub.uz,https://app.vendhub.uz
```

---

## CSRF (Cross-Site Request Forgery)

### Установка

```bash
npm install csurf cookie-parser
npm install -D @types/csurf @types/cookie-parser
```

### Настройка CSRF

```typescript
// backend/src/main.ts
import * as cookieParser from 'cookie-parser';
import * as csurf from 'csurf';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Cookie parser (required for CSRF)
  app.use(cookieParser(process.env.COOKIE_SECRET));

  // CSRF protection
  // Note: Only for session-based auth, not needed for JWT-only auth
  if (process.env.ENABLE_CSRF === 'true') {
    app.use(csurf({
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 3600000, // 1 hour
      },
    }));

    // Provide CSRF token to frontend
    app.use((req, res, next) => {
      res.cookie('XSRF-TOKEN', req.csrfToken(), {
        httpOnly: false, // Accessible to JavaScript
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
      });
      next();
    });
  }

  await app.listen(3000);
}
```

### CSRF Guard для NestJS

```typescript
// backend/src/common/guards/csrf.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Skip for routes marked as CSRF-exempt
    const skipCsrf = this.reflector.get<boolean>(
      'skipCsrf',
      context.getHandler(),
    );
    if (skipCsrf) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    // Skip CSRF for safe methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      return true;
    }

    // Skip CSRF for API calls with Bearer token (JWT auth)
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return true;
    }

    // Verify CSRF token for session-based auth
    const csrfToken = request.headers['x-csrf-token'] || request.body._csrf;
    const cookieToken = request.cookies['XSRF-TOKEN'];

    if (!csrfToken || csrfToken !== cookieToken) {
      throw new ForbiddenException('Invalid CSRF token');
    }

    return true;
  }
}

// Decorator to skip CSRF
export const SkipCsrf = () => SetMetadata('skipCsrf', true);
```

### Frontend Integration

```typescript
// frontend/src/lib/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true, // Include cookies
});

// Add CSRF token to requests
api.interceptors.request.use((config) => {
  // Get CSRF token from cookie
  const csrfToken = document.cookie
    .split('; ')
    .find((row) => row.startsWith('XSRF-TOKEN='))
    ?.split('=')[1];

  if (csrfToken) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }

  return config;
});

export default api;
```

---

## Double Submit Cookie Pattern

Альтернативный подход без серверного состояния:

```typescript
// backend/src/common/guards/double-submit-csrf.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class DoubleSubmitCsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Skip for safe methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      // Generate new token for GET requests
      const newToken = crypto.randomBytes(32).toString('hex');
      response.cookie('csrf_token', newToken, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
      });
      return true;
    }

    // For state-changing methods, verify token
    const headerToken = request.headers['x-csrf-token'];
    const cookieToken = request.cookies['csrf_token'];

    if (!headerToken || !cookieToken || headerToken !== cookieToken) {
      throw new ForbiddenException('CSRF token mismatch');
    }

    return true;
  }
}
```

---

## SameSite Cookie Policy

```typescript
// backend/src/config/session.config.ts
export const sessionConfig = {
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const, // Prevents CSRF attacks
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    domain: process.env.NODE_ENV === 'production' ? '.vendhub.uz' : undefined,
  },
};
```

### SameSite Options

| Value | Description | Use Case |
|-------|-------------|----------|
| `strict` | Cookie sent only for same-site requests | Maximum security |
| `lax` | Cookie sent for same-site + top-level navigation | Balance security/usability |
| `none` | Cookie sent for all requests (requires Secure) | Cross-site APIs |

---

## Security Headers Complement

```typescript
// Combined with Helmet.js
import helmet from 'helmet';

app.use(helmet({
  // Prevent clickjacking
  frameguard: { action: 'deny' },

  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://api.vendhub.uz'],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },

  // Referrer Policy
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
```

---

## Testing CORS & CSRF

```typescript
// backend/src/common/guards/__tests__/csrf.guard.spec.ts
describe('CsrfGuard', () => {
  it('should allow GET requests without CSRF token', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/test')
      .expect(200);
  });

  it('should reject POST without CSRF token', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/test')
      .expect(403);
  });

  it('should allow POST with valid CSRF token', async () => {
    // Get CSRF token
    const getResponse = await request(app.getHttpServer())
      .get('/api/csrf-token');

    const csrfToken = getResponse.body.token;

    // Use token in POST
    const response = await request(app.getHttpServer())
      .post('/api/test')
      .set('X-CSRF-Token', csrfToken)
      .set('Cookie', `XSRF-TOKEN=${csrfToken}`)
      .expect(201);
  });
});
```

---

## Checklist

- [ ] CORS настроен только для разрешённых доменов
- [ ] Production origins отличаются от development
- [ ] Credentials включены только если нужны cookies
- [ ] CSRF защита включена для session-based auth
- [ ] SameSite cookie policy установлен в 'strict' или 'lax'
- [ ] HTTPS обязателен в production (Secure cookie)
- [ ] Тесты покрывают CORS и CSRF сценарии
