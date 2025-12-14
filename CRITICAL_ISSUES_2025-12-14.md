# 🚨 КРИТИЧЕСКИЕ ПРОБЛЕМЫ VENDHUB MANAGER

**Дата:** 2025-12-14
**Статус:** Требуют немедленного внимания

---

## 🔴 P0 CRITICAL (Блокеры production)

### 1. Отсутствие CI/CD пайплайнов

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

### 2. Отсутствие API Compression

**Проблема:** NestJS backend не сжимает HTTP responses. Большие JSON ответы передаются без сжатия.

**Влияние:**
- 60-80% лишнего трафика
- Медленные ответы на мобильных устройствах
- Увеличенные расходы на bandwidth

**Локация:** `/backend/src/main.ts`

**Текущий код:**
```typescript
app.use(helmet());
app.enableCors();
// NO compression!
```

**Решение:**
```typescript
import compression from 'compression';

// Add after helmet
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
  threshold: 1024, // Only compress >1KB
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

### 3. N+1 Запросы в Tasks Service

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
// Option 1: Selective loading
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

// Option 2: DataLoader pattern for batch loading
```

**Время исправления:** 2-4 часа
**Ответственный:** Backend

---

### 4. In-Memory Cache в Reports

**Проблема:** ReportsCacheInterceptor использует Map<> вместо Redis. Не работает при горизонтальном масштабировании.

**Влияние:**
- Memory leaks
- Не работает с множеством инстансов
- Cache miss при перезапуске

**Локация:** `/backend/src/modules/reports/interceptors/cache.interceptor.ts`

**Текущий код (плохо):**
```typescript
private cache = new Map<string, CacheEntry>(); // In-memory only!
```

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

## 🟠 P1 HIGH (Важные проблемы)

### 5. Frontend Test Coverage ~4%

**Проблема:** Только 8 тестовых файлов во frontend. Критически низкое покрытие.

**Влияние:**
- Регрессии при изменениях
- Нет уверенности в стабильности
- Сложный рефакторинг

**Решение:**
```bash
# Install testing dependencies
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

### 6. JWT ID (jti) Not Generated

**Проблема:** JWT токены не имеют уникального ID, что делает невозможным отзыв конкретного токена.

**Влияние:**
- Нельзя отозвать конкретную сессию
- Только user-wide revocation работает

**Локация:** `/backend/src/modules/auth/auth.service.ts` (lines 455-484)

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

### 7. Telegram Cart Stored in Memory

**Проблема:** Корзина пользователя в Telegram боте хранится в Map<>, теряется при перезапуске.

**Локация:** `/backend/src/modules/telegram/handlers/cart.handler.ts`

**Текущий код:**
```typescript
private carts: Map<string, CartItem[]> = new Map(); // Lost on restart!
```

**Решение:**
```typescript
// Use Redis via TelegramSessionService
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

## 🟡 P2 MEDIUM (Улучшения)

### 8. Untested Modules (requests, reconciliation, billing)

**Проблема:** Три модуля имеют 0% test coverage.

**Локации:**
- `/backend/src/modules/requests/` - 19 files, 0 tests
- `/backend/src/modules/reconciliation/` - 9 files, 0 tests
- `/backend/src/modules/billing/` - 3 files, 0 tests

**Решение:** Создать базовые unit тесты для services.

**Время исправления:** 4-8 часов
**Ответственный:** Backend/QA

---

### 9. 20+ 'any' Type Usages

**Проблема:** TypeScript type safety нарушается через any.

**Локации:**
- Controllers (Request typing)
- Service methods
- Event handlers

**Решение:**
```typescript
// Before
async create(@Req() req: any)

// After
import { RequestWithUser } from '@common/interfaces';
async create(@Req() req: RequestWithUser)
```

**Время исправления:** 2-4 часа
**Ответственный:** Backend

---

### 10. Grafana Dashboards Missing

**Проблема:** Prometheus настроен, Grafana provisioned, но нет dashboard definitions.

**Локация:** `/monitoring/grafana/provisioning/dashboards/`

**Решение:** Создать JSON dashboards для:
- System metrics (CPU, Memory, Disk)
- Application metrics (Request rate, Errors)
- Business metrics (Tasks, Transactions)

**Время исправления:** 4-8 часов
**Ответственный:** DevOps

---

## 📊 СВОДКА

| Severity | Count | Estimated Time |
|----------|-------|----------------|
| P0 Critical | 4 | ~10 hours |
| P1 High | 3 | ~12 hours |
| P2 Medium | 3 | ~16 hours |
| **TOTAL** | **10** | **~38 hours** |

---

## ✅ СТАТУС ОТСЛЕЖИВАНИЯ

- [ ] P0-1: CI/CD workflows
- [ ] P0-2: API compression
- [ ] P0-3: N+1 queries fix
- [ ] P0-4: Redis cache for reports
- [ ] P1-5: Frontend tests
- [ ] P1-6: JWT ID generation
- [ ] P1-7: Telegram cart persistence
- [ ] P2-8: Module tests
- [ ] P2-9: Type safety fixes
- [ ] P2-10: Grafana dashboards
