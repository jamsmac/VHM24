# Rate Limiting для VendHub

## Установка

```bash
npm install @nestjs/throttler
```

## Базовая настройка

```typescript
// backend/src/app.module.ts
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,  // 1 секунда
        limit: 3,   // 3 запроса
      },
      {
        name: 'medium',
        ttl: 10000, // 10 секунд
        limit: 20,  // 20 запросов
      },
      {
        name: 'long',
        ttl: 60000, // 1 минута
        limit: 100, // 100 запросов
      },
    ]),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
```

## Custom Throttler Guard

```typescript
// backend/src/common/guards/custom-throttler.guard.ts
import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  // Пропускать определённые IP (например, для health checks)
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip;

    // Whitelist для мониторинга
    const whitelist = ['127.0.0.1', '::1'];
    if (whitelist.includes(ip)) {
      return true;
    }

    // Пропускать authenticated админов
    const user = request.user;
    if (user?.role === 'admin') {
      return true;
    }

    return false;
  }

  // Использовать IP + User ID как ключ
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const ip = req.ip;
    const userId = req.user?.id;

    return userId ? `${ip}-${userId}` : ip;
  }

  // Кастомное сообщение об ошибке
  protected throwThrottlingException(context: ExecutionContext): Promise<void> {
    throw new ThrottlerException('Too many requests. Please try again later.');
  }
}
```

## Per-Endpoint Rate Limits

```typescript
// backend/src/modules/auth/auth.controller.ts
import { Throttle, SkipThrottle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  // Строгий лимит для login (защита от brute force)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 попыток в минуту
  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // Ещё строже для password reset
  @Throttle({ default: { limit: 3, ttl: 300000 } }) // 3 попытки за 5 минут
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  // Пропустить throttling для logout
  @SkipThrottle()
  @Post('logout')
  async logout() {
    return this.authService.logout();
  }
}
```

## Rate Limits по ролям

```typescript
// backend/src/common/decorators/role-throttle.decorator.ts
import { SetMetadata, applyDecorators } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

// Разные лимиты для разных ролей
export const RoleBasedThrottle = () =>
  applyDecorators(
    SetMetadata('roleThrottle', true),
  );

// Guard который проверяет роль
@Injectable()
export class RoleThrottlerGuard extends ThrottlerGuard {
  protected async getLimit(context: ExecutionContext): Promise<number> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Лимиты по ролям
    const limits: Record<string, number> = {
      admin: 1000,
      manager: 500,
      operator: 200,
      viewer: 100,
    };

    return limits[user?.role] || 50; // Default для неавторизованных
  }
}
```

## Rate Limiting для API endpoints

```typescript
// Разные лимиты для разных типов операций
const rateLimits = {
  // Чтение данных - более щедрые лимиты
  read: { ttl: 60000, limit: 100 },

  // Запись данных - строже
  write: { ttl: 60000, limit: 30 },

  // Загрузка файлов - очень строго
  upload: { ttl: 60000, limit: 10 },

  // Отправка уведомлений - строго
  notify: { ttl: 60000, limit: 5 },
};

@Controller('tasks')
export class TasksController {
  @Throttle({ default: rateLimits.read })
  @Get()
  findAll() {}

  @Throttle({ default: rateLimits.write })
  @Post()
  create() {}

  @Throttle({ default: rateLimits.upload })
  @Post(':id/photos')
  uploadPhoto() {}
}
```

## Redis Storage для Rate Limiting

```typescript
// backend/src/config/throttler.config.ts
import { ThrottlerStorageRedisService } from 'nestjs-throttler-storage-redis';
import Redis from 'ioredis';

export const throttlerConfig = {
  storage: new ThrottlerStorageRedisService(
    new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    }),
  ),
};
```

## Response Headers

```typescript
// Добавить информацию о лимитах в headers
@Injectable()
export class ThrottlerHeadersInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const response = context.switchToHttp().getResponse();

    return next.handle().pipe(
      tap(() => {
        // Добавить стандартные rate limit headers
        response.setHeader('X-RateLimit-Limit', '100');
        response.setHeader('X-RateLimit-Remaining', '99');
        response.setHeader('X-RateLimit-Reset', Date.now() + 60000);
      }),
    );
  }
}
```

## Nginx Rate Limiting (дополнительный слой)

```nginx
# /etc/nginx/conf.d/rate-limit.conf

# Определение зон
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=auth:10m rate=1r/s;

server {
    # Общий API лимит
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://backend:3000;
    }

    # Строгий лимит для auth
    location /api/auth/ {
        limit_req zone=auth burst=5;
        proxy_pass http://backend:3000;
    }
}
```

## Мониторинг Rate Limits

```typescript
// Метрики для Prometheus
import { makeCounterProvider } from '@willsoto/nestjs-prometheus';

makeCounterProvider({
  name: 'rate_limit_hits_total',
  help: 'Total number of rate limit hits',
  labelNames: ['endpoint', 'ip'],
});

// В guard
this.rateLimitCounter.inc({ endpoint: path, ip: request.ip });
```
