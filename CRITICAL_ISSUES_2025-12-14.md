# КРИТИЧЕСКИЕ ПРОБЛЕМЫ VENDHUB MANAGER

**Дата:** 2025-12-14
**Статус:** Требуют немедленного внимания
**Обновлено:** Объединено с результатами security-аудита

---

## P0 CRITICAL - SECURITY BLOCKERS

### SEC-1: Токены в localStorage (XSS Vulnerability)

**CVSS Score:** 7.5 HIGH
**Статус:** PRODUCTION BLOCKER

**Проблема:** Access и Refresh токены хранятся в localStorage, что делает их доступными для XSS-атак.

**Влияние:**
- Полная компрометация сессии при XSS
- Кража токенов через любой injected JavaScript
- Возможность lateral movement между пользователями
- Нарушение REQ-AUTH-52, REQ-AUTH-53

**Локации:**
- `frontend/lib/axios.ts` - сохранение токенов
- `frontend/lib/auth-store.ts` - хранение в localStorage
- `frontend/hooks/useAuth.ts` - чтение токенов

**Текущий код (УЯЗВИМЫЙ):**
```typescript
// frontend/lib/auth-store.ts
export const setTokens = (access: string, refresh: string) => {
  localStorage.setItem('access_token', access);  // XSS VULNERABLE!
  localStorage.setItem('refresh_token', refresh);
};
```

**Решение:**
```typescript
// 1. Backend: Set httpOnly cookies
// backend/src/modules/auth/auth.controller.ts
@Post('login')
async login(@Body() dto: LoginDto, @Res() res: Response) {
  const tokens = await this.authService.login(dto);

  res.cookie('access_token', tokens.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000, // 15 min
  });

  res.cookie('refresh_token', tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/auth/refresh',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  return res.json({ user: tokens.user });
}

// 2. Frontend: Remove localStorage usage
// frontend/lib/auth-store.ts
// DELETE localStorage token storage entirely
// Use credentials: 'include' in fetch/axios
```

**Время исправления:** 4-6 часов
**Приоритет:** НЕМЕДЛЕННО
**Ответственный:** Backend + Frontend Lead

---

### SEC-2: Отсутствие Rate Limiting на Auth Endpoints

**CVSS Score:** 7.0 HIGH
**Статус:** PRODUCTION BLOCKER

**Проблема:** Эндпоинты `/auth/login`, `/auth/refresh`, `/auth/register` не защищены rate limiting.

**Влияние:**
- Brute-force атаки на пароли
- Credential stuffing атаки
- DoS через массовые запросы
- Нарушение REQ-AUTH-44

**Локация:** `backend/src/modules/auth/auth.controller.ts`

**Текущий код:**
```typescript
@Controller('auth')
export class AuthController {
  @Post('login')  // NO @Throttle() decorator!
  async login(@Body() dto: LoginDto) { ... }
}
```

**Решение:**
```typescript
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 attempts per minute
  async login(@Body() dto: LoginDto) { ... }

  @Post('refresh')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 per minute
  async refresh(@Body() dto: RefreshDto) { ... }

  @Post('register')
  @Throttle({ default: { limit: 3, ttl: 300000 } }) // 3 per 5 min
  async register(@Body() dto: RegisterDto) { ... }
}
```

**Время исправления:** 2 часа
**Приоритет:** НЕМЕДЛЕННО
**Ответственный:** Backend Security

---

### SEC-3: Refresh Token Reuse (Отсутствие ротации)

**CVSS Score:** 5.5 MEDIUM
**Статус:** HIGH PRIORITY

**Проблема:** Refresh token может использоваться многократно без ротации, что позволяет атакующему с украденным токеном генерировать новые access токены неограниченно.

**Влияние:**
- Персистентный доступ при краже refresh token
- Невозможность обнаружить компрометацию
- Нарушение REQ-AUTH-55

**Локация:** `backend/src/modules/auth/auth.service.ts`

**Решение:**
```typescript
async refreshTokens(refreshToken: string): Promise<TokenPair> {
  const payload = await this.verifyRefreshToken(refreshToken);

  // Invalidate old refresh token
  await this.sessionService.revokeRefreshToken(refreshToken);

  // Generate new pair with rotation
  const newTokens = await this.generateTokenPair(payload.userId);

  // Store new refresh token
  await this.sessionService.storeRefreshToken(
    payload.userId,
    newTokens.refreshToken
  );

  return newTokens;
}
```

**Время исправления:** 3 часа
**Приоритет:** ВЫСОКИЙ
**Ответственный:** Backend Security

---

## P0 CRITICAL - INFRASTRUCTURE

### INFRA-1: Отсутствие CI/CD пайплайнов

**Проблема:** GitHub Actions workflows полностью отсутствуют. Нет автоматизации тестов, линтинга, сборки и деплоя.

**Влияние:**
- Риск деплоя сломанного кода
- Нет автоматической проверки качества
- Ручные процессы замедляют разработку

**Решение:**

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install Backend Dependencies
        working-directory: ./backend
        run: npm ci

      - name: Lint Backend
        working-directory: ./backend
        run: npm run lint

      - name: Test Backend
        working-directory: ./backend
        run: npm run test

      - name: Build Backend
        working-directory: ./backend
        run: npm run build
```

**Время исправления:** 4-6 часов
**Ответственный:** DevOps/Backend

---

### INFRA-2: Отсутствие API Compression

**Проблема:** NestJS backend не сжимает HTTP responses. Большие JSON ответы передаются без сжатия.

**Влияние:**
- 60-80% лишнего трафика
- Медленные ответы на мобильных устройствах
- Увеличенные расходы на bandwidth

**Локация:** `/backend/src/main.ts`

**Решение:**
```typescript
import compression from 'compression';

app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
  threshold: 1024,
}));
```

**Команды:**
```bash
cd backend
npm install compression
npm install -D @types/compression
```

**Время исправления:** 30 минут
**Ответственный:** Backend

---

## P1 HIGH - PERFORMANCE

### PERF-1: N+1 Запросы в Tasks Service

**Проблема:** Heavy eager loading при запросе задач. Каждая задача загружает 8+ связанных сущностей.

**Влияние:**
- 80-90% избыточной нагрузки на БД
- Медленные списки задач
- Проблемы масштабирования

**Локация:** `/backend/src/modules/tasks/tasks.service.ts`

**Текущий код (плохо):**
```typescript
relations: [
  'machine',
  'machine.location',        // 2-level nesting!
  'assigned_to',
  'created_by',
  'items',
  'items.nomenclature',      // N+1!
  'comments',
  'comments.user',           // N+1!
  'components',
  'components.component',    // N+1!
]
```

**Решение:**
```typescript
async findAll(options: FindTasksOptions) {
  const qb = this.taskRepository.createQueryBuilder('task');

  // Base relations only
  qb.leftJoinAndSelect('task.machine', 'machine');
  qb.leftJoinAndSelect('task.assigned_to', 'assigned_to');

  // Deep relations only when needed
  if (options.includeItems) {
    qb.leftJoinAndSelect('task.items', 'items');
    qb.leftJoinAndSelect('items.nomenclature', 'nomenclature');
  }

  return qb.getMany();
}
```

**Время исправления:** 2-4 часа
**Ответственный:** Backend

---

### PERF-2: In-Memory Cache в Reports

**Проблема:** ReportsCacheInterceptor использует Map<> вместо Redis. Не работает при горизонтальном масштабировании.

**Влияние:**
- Memory leaks
- Не работает с множеством инстансов
- Cache miss при перезапуске

**Локация:** `/backend/src/modules/reports/interceptors/cache.interceptor.ts`

**Решение:**
```typescript
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class ReportsCacheInterceptor implements NestInterceptor {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async intercept(context: ExecutionContext, next: CallHandler) {
    const key = this.generateCacheKey(context);

    const cached = await this.cacheManager.get(key);
    if (cached) return of(cached);

    return next.handle().pipe(
      tap(data => this.cacheManager.set(key, data, { ttl: 3600 }))
    );
  }
}
```

**Время исправления:** 2-3 часа
**Ответственный:** Backend

---

## P1 HIGH - QUALITY

### QUAL-1: Frontend Test Coverage ~4%

**Проблема:** Только 8 тестовых файлов во frontend. Критически низкое покрытие.

**Влияние:**
- Регрессии при изменениях
- Нет уверенности в стабильности
- Сложный рефакторинг

**Решение:**
```bash
cd frontend
npm install -D vitest @testing-library/react @testing-library/jest-dom
npm install -D @playwright/test
```

**Приоритетные тесты:**
1. Auth hooks (useAuth, useLogin)
2. API layer (axios interceptors)
3. Critical components (TaskList, Dashboard)
4. E2E: Login flow, Task completion

**Время исправления:** 8-16 часов
**Ответственный:** Frontend

---

### QUAL-2: JWT ID (jti) Not Generated

**Проблема:** JWT токены не имеют уникального ID, что делает невозможным отзыв конкретного токена.

**Влияние:**
- Нельзя отозвать конкретную сессию
- Только user-wide revocation работает

**Локация:** `/backend/src/modules/auth/auth.service.ts`

**Решение:**
```typescript
import { v4 as uuidv4 } from 'uuid';

const basePayload: Partial<JwtPayload> = {
  sub: user.id,
  email: user.email,
  role: user.role,
  jti: uuidv4(), // ADD THIS
};
```

**Время исправления:** 1 час
**Ответственный:** Backend/Security

---

### QUAL-3: Telegram Cart Stored in Memory

**Проблема:** Корзина пользователя в Telegram боте хранится в Map<>, теряется при перезапуске.

**Локация:** `/backend/src/modules/telegram/handlers/cart.handler.ts`

**Решение:**
```typescript
async getCart(userId: string): Promise<CartItem[]> {
  const session = await this.sessionService.getSession(userId);
  return session.cart || [];
}

async setCart(userId: string, cart: CartItem[]): Promise<void> {
  await this.sessionService.updateSession(userId, { cart });
}
```

**Время исправления:** 2 часа
**Ответственный:** Backend/Telegram

---

## P2 MEDIUM - IMPROVEMENTS

### IMP-1: Untested Modules (requests, reconciliation, billing)

**Проблема:** Три модуля имеют 0% test coverage.

**Локации:**
- `/backend/src/modules/requests/` - 19 files, 0 tests
- `/backend/src/modules/reconciliation/` - 9 files, 0 tests
- `/backend/src/modules/billing/` - 3 files, 0 tests

**Время исправления:** 4-8 часов
**Ответственный:** Backend/QA

---

### IMP-2: 20+ 'any' Type Usages

**Проблема:** TypeScript type safety нарушается через any.

**Решение:**
```typescript
import { RequestWithUser } from '@common/interfaces';
async create(@Req() req: RequestWithUser)
```

**Время исправления:** 2-4 часов
**Ответственный:** Backend

---

### IMP-3: Grafana Dashboards Missing

**Проблема:** Prometheus настроен, Grafana provisioned, но нет dashboard definitions.

**Локация:** `/monitoring/grafana/provisioning/dashboards/`

**Время исправления:** 4-8 часов
**Ответственный:** DevOps

---

## СВОДКА

| Severity | Category | Count | Estimated Time |
|----------|----------|-------|----------------|
| P0 Critical | Security | 3 | ~9 hours |
| P0 Critical | Infrastructure | 2 | ~6 hours |
| P1 High | Performance | 2 | ~6 hours |
| P1 High | Quality | 3 | ~12 hours |
| P2 Medium | Improvements | 3 | ~14 hours |
| **TOTAL** | | **13** | **~47 hours** |

---

## ПРИОРИТЕТ ИСПРАВЛЕНИЙ

### Phase 1: Security First (БЛОКЕРЫ) - 1-2 дня
- [ ] SEC-1: Миграция токенов в httpOnly cookies
- [ ] SEC-2: Rate limiting на auth endpoints
- [ ] SEC-3: Refresh token rotation

### Phase 2: Infrastructure - 1 день
- [ ] INFRA-1: CI/CD workflows
- [ ] INFRA-2: API compression

### Phase 3: Performance - 1 день
- [ ] PERF-1: N+1 queries fix
- [ ] PERF-2: Redis cache for reports

### Phase 4: Quality - 2-3 дня
- [ ] QUAL-1: Frontend tests
- [ ] QUAL-2: JWT ID generation
- [ ] QUAL-3: Telegram cart persistence

### Phase 5: Improvements - ongoing
- [ ] IMP-1: Module tests
- [ ] IMP-2: Type safety fixes
- [ ] IMP-3: Grafana dashboards

---

## СТАТУС ОТСЛЕЖИВАНИЯ

### Security Blockers
- [ ] SEC-1: localStorage tokens → httpOnly cookies
- [ ] SEC-2: Rate limiting на /auth/*
- [ ] SEC-3: Refresh token rotation

### Infrastructure
- [ ] INFRA-1: CI/CD workflows
- [ ] INFRA-2: API compression

### Performance
- [ ] PERF-1: N+1 queries fix
- [ ] PERF-2: Redis cache for reports

### Quality
- [ ] QUAL-1: Frontend tests (target: 30%)
- [ ] QUAL-2: JWT ID (jti) generation
- [ ] QUAL-3: Telegram cart to Redis

### Improvements
- [ ] IMP-1: Module tests
- [ ] IMP-2: Type safety (remove 'any')
- [ ] IMP-3: Grafana dashboards
