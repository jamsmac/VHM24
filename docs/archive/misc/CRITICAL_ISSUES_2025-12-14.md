# КРИТИЧЕСКИЕ ПРОБЛЕМЫ VENDHUB MANAGER

**Дата:** 2025-12-14
**Статус:** Security blockers RESOLVED ✅
**Обновлено:** 2025-12-14 - SEC-1, SEC-2, SEC-3 исправлены

---

## P0 CRITICAL - SECURITY BLOCKERS

### SEC-1: Токены в localStorage (XSS Vulnerability) ✅ RESOLVED

**CVSS Score:** 7.5 HIGH
**Статус:** ✅ ИСПРАВЛЕНО (commit d2800b0, 644de68)

**Проблема:** Access и Refresh токены хранились в localStorage, что делало их доступными для XSS-атак.

**Решение реализовано:**
- Backend: httpOnly cookies с SameSite=Strict
- Frontend: Phase 2 cookie-based auth, withCredentials: true
- Токены полностью недоступны JavaScript (XSS immune)

**Коммиты:**
- `644de68` - fix(security): implement httpOnly cookie-based auth (SEC-1)
- `d2800b0` - fix(security): update frontend for httpOnly cookie auth (SEC-1)

---

### SEC-2: Rate Limiting на Auth Endpoints ✅ RESOLVED

**CVSS Score:** 7.0 HIGH
**Статус:** ✅ УЖЕ РЕАЛИЗОВАНО

**Проблема:** Требовался rate limiting на auth endpoints.

**Решение уже реализовано:**
```typescript
// auth.controller.ts - все endpoints защищены @Throttle
@Post('login')
@Throttle({ default: { limit: 5, ttl: 60000 } }) // 5/min

@Post('register')
@Throttle({ default: { limit: 3, ttl: 300000 } }) // 3/5min

@Post('refresh')
@Throttle({ default: { limit: 10, ttl: 60000 } }) // 10/min

@Post('password-reset/*')
@Throttle({ default: { limit: 3, ttl: 3600000 } }) // 3/hour
```

---

### SEC-3: Refresh Token Rotation ✅ RESOLVED

**CVSS Score:** 5.5 MEDIUM
**Статус:** ✅ УЖЕ РЕАЛИЗОВАНО

**Проблема:** Требовалась ротация refresh token при обновлении.

**Решение уже реализовано:**
```typescript
// auth.service.ts:397
await this.sessionService.rotateRefreshToken(session.id, tokens.refresh_token);
```

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

| Severity | Category | Count | Status | Estimated Time |
|----------|----------|-------|--------|----------------|
| P0 Critical | Security | 3 | ✅ RESOLVED | ~9 hours |
| P0 Critical | Infrastructure | 2 | 🔄 Pending | ~6 hours |
| P1 High | Performance | 2 | 🔄 Pending | ~6 hours |
| P1 High | Quality | 3 | 🔄 Pending | ~12 hours |
| P2 Medium | Improvements | 3 | 🔄 Pending | ~14 hours |
| **TOTAL** | | **13** | **3 done** | **~38 hours remaining** |

---

## ПРИОРИТЕТ ИСПРАВЛЕНИЙ

### Phase 1: Security First (БЛОКЕРЫ) ✅ ЗАВЕРШЕНО
- [x] SEC-1: Миграция токенов в httpOnly cookies ✅
- [x] SEC-2: Rate limiting на auth endpoints ✅
- [x] SEC-3: Refresh token rotation ✅

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

### Security Blockers ✅ ALL RESOLVED
- [x] SEC-1: localStorage tokens → httpOnly cookies ✅ (d2800b0, 644de68)
- [x] SEC-2: Rate limiting на /auth/* ✅ (уже реализовано)
- [x] SEC-3: Refresh token rotation ✅ (уже реализовано)

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
