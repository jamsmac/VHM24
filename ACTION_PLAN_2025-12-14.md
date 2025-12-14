# 📋 ПЛАН ДЕЙСТВИЙ VENDHUB MANAGER

**Дата создания:** 2025-12-14
**Цель:** Достичь Production Readiness 9/10

---

## 🎯 ЦЕЛЕВЫЕ ПОКАЗАТЕЛИ

| Метрика | Текущее | Целевое | Дельта |
|---------|---------|---------|--------|
| Общая оценка | 76/100 | 85/100 | +9 |
| Test coverage | 29% | 60% | +31% |
| Performance | 6.2/10 | 8.0/10 | +1.8 |
| DevOps | 6.9/10 | 9.0/10 | +2.1 |
| Production Ready | 70% | 95% | +25% |

---

## 📅 НЕДЕЛЯ 1: КРИТИЧЕСКИЕ ИСПРАВЛЕНИЯ

### День 1-2: CI/CD Pipeline

**Задачи:**
- [ ] Создать `.github/workflows/ci.yml`
- [ ] Создать `.github/workflows/deploy-staging.yml`
- [ ] Настроить GitHub Secrets
- [ ] Протестировать pipeline на PR

**Файлы:**
```
.github/
├── workflows/
│   ├── ci.yml                 # Lint, test, build
│   ├── deploy-staging.yml     # Auto-deploy to staging
│   └── deploy-production.yml  # Manual deploy to prod
```

**Команды:**
```bash
mkdir -p .github/workflows
# Create workflow files...
git add .github/
git commit -m "ci: add GitHub Actions workflows"
git push
```

**Acceptance Criteria:**
- ✅ PR triggers lint + test + build
- ✅ Merge to develop deploys to staging
- ✅ Release tag deploys to production

---

### День 2-3: Performance Fixes

**Задача 1: API Compression**
```bash
cd backend
npm install compression @types/compression
```

```typescript
// main.ts
import compression from 'compression';
app.use(compression({ threshold: 1024 }));
```

**Задача 2: N+1 Query Fix**

Файл: `backend/src/modules/tasks/tasks.service.ts`

```typescript
// Replace eager loading with query builder
async findAll(options: FindTasksDto) {
  const qb = this.taskRepository.createQueryBuilder('task');

  // Always load minimal relations
  qb.leftJoinAndSelect('task.machine', 'machine');
  qb.leftJoinAndSelect('task.assigned_to', 'user');

  // Conditional deep loading
  if (options.includeDetails) {
    qb.leftJoinAndSelect('task.items', 'items');
    qb.leftJoinAndSelect('items.nomenclature', 'nomenclature');
  }

  // Pagination
  qb.skip(options.skip || 0);
  qb.take(options.take || 20);

  return qb.getMany();
}
```

**Задача 3: Redis Cache for Reports**

Файл: `backend/src/modules/reports/interceptors/cache.interceptor.ts`

```typescript
@Injectable()
export class ReportsCacheInterceptor implements NestInterceptor {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private reflector: Reflector,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler) {
    const ttl = this.reflector.get('cache_ttl', context.getHandler()) || 3600;
    const key = this.getCacheKey(context);

    const cached = await this.cacheManager.get(key);
    if (cached) return of(cached);

    return next.handle().pipe(
      tap(data => this.cacheManager.set(key, data, ttl)),
    );
  }
}
```

**Acceptance Criteria:**
- ✅ API responses gzip compressed
- ✅ Task list queries < 100ms
- ✅ Report cache in Redis (check with `redis-cli KEYS vendhub:cache:*`)

---

### День 4-5: Security Fixes

**Задача 1: JWT ID Generation**

Файл: `backend/src/modules/auth/auth.service.ts`

```typescript
import { v4 as uuidv4 } from 'uuid';

private async generateTokens(user: User): Promise<TokenPair> {
  const jti = uuidv4();

  const accessPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    jti, // Add unique token ID
  };

  // Store jti in session for revocation
  await this.sessionService.setTokenId(user.id, jti);

  // ... rest of token generation
}
```

**Задача 2: Telegram Cart Persistence**

Файл: `backend/src/modules/telegram/handlers/cart.handler.ts`

```typescript
export class CartHandler {
  constructor(private sessionService: TelegramSessionService) {}

  async getCart(userId: string): Promise<CartItem[]> {
    const session = await this.sessionService.getSession(userId);
    return session?.cart || [];
  }

  async addToCart(userId: string, item: CartItem): Promise<void> {
    const cart = await this.getCart(userId);
    cart.push(item);
    await this.sessionService.updateSession(userId, { cart });
  }

  async clearCart(userId: string): Promise<void> {
    await this.sessionService.updateSession(userId, { cart: [] });
  }
}
```

**Acceptance Criteria:**
- ✅ Each JWT has unique jti
- ✅ Cart persists after bot restart
- ✅ Cart shared across bot instances

---

## 📅 НЕДЕЛЯ 2: ТЕСТИРОВАНИЕ И КАЧЕСТВО

### День 6-8: Frontend Testing

**Setup:**
```bash
cd frontend
npm install -D vitest @testing-library/react @testing-library/jest-dom
npm install -D @playwright/test
npx playwright install
```

**Структура тестов:**
```
frontend/
├── src/
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   └── useAuth.test.ts      # NEW
│   ├── lib/
│   │   ├── auth-api.ts
│   │   └── auth-api.test.ts     # EXISTS, expand
│   └── components/
│       ├── tasks/
│       │   ├── TaskList.tsx
│       │   └── TaskList.test.tsx # NEW
├── e2e/
│   ├── auth.spec.ts              # NEW
│   └── tasks.spec.ts             # NEW
```

**Приоритетные тесты:**

1. **Auth hooks:**
```typescript
// src/hooks/useAuth.test.ts
import { renderHook, act } from '@testing-library/react';
import { useAuth } from './useAuth';

describe('useAuth', () => {
  it('should login successfully', async () => {
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login('test@test.com', 'password');
    });

    expect(result.current.isAuthenticated).toBe(true);
  });

  it('should handle login error', async () => {
    // ...
  });
});
```

2. **E2E Login:**
```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test('user can login', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[data-testid="email"]', 'admin@vendhub.com');
  await page.fill('[data-testid="password"]', 'password');
  await page.click('[data-testid="submit"]');

  await expect(page).toHaveURL('/dashboard');
});
```

**Acceptance Criteria:**
- ✅ Frontend test coverage > 30%
- ✅ E2E tests for login, dashboard, tasks
- ✅ Tests run in CI pipeline

---

### День 9-10: Backend Testing

**Модули для покрытия:**

1. **requests module:**
```typescript
// requests.service.spec.ts
describe('RequestsService', () => {
  it('should create material request', async () => {
    const dto = { materials: [...], priority: 'high' };
    const result = await service.create(dto, user);
    expect(result.status).toBe('pending');
  });

  it('should approve request', async () => {
    // ...
  });
});
```

2. **reconciliation module:**
```typescript
// reconciliation.service.spec.ts
describe('ReconciliationService', () => {
  it('should detect inventory mismatches', async () => {
    // Setup expected vs actual
    const run = await service.createRun(machineId);
    const mismatches = await service.getMismatches(run.id);
    expect(mismatches.length).toBeGreaterThan(0);
  });
});
```

**Acceptance Criteria:**
- ✅ requests module: 70%+ coverage
- ✅ reconciliation module: 70%+ coverage
- ✅ billing module: 70%+ coverage

---

## 📅 НЕДЕЛЯ 3: МОНИТОРИНГ И ДОКУМЕНТАЦИЯ

### День 11-12: Grafana Dashboards

**Dashboard 1: System Overview**
```json
{
  "title": "VendHub System Overview",
  "panels": [
    { "title": "CPU Usage", "type": "gauge" },
    { "title": "Memory Usage", "type": "gauge" },
    { "title": "Request Rate", "type": "graph" },
    { "title": "Error Rate", "type": "stat" }
  ]
}
```

**Dashboard 2: API Performance**
```json
{
  "title": "API Performance",
  "panels": [
    { "title": "Response Time P95", "type": "graph" },
    { "title": "Slow Endpoints", "type": "table" },
    { "title": "Error by Endpoint", "type": "pie" }
  ]
}
```

**Dashboard 3: Business Metrics**
```json
{
  "title": "Business Metrics",
  "panels": [
    { "title": "Tasks Created/Day", "type": "graph" },
    { "title": "Transactions/Day", "type": "graph" },
    { "title": "Active Machines", "type": "stat" }
  ]
}
```

---

### День 13-14: Type Safety и Code Quality

**Задача: Replace 'any' types**

```bash
# Find all 'any' usages
grep -r ": any" backend/src --include="*.ts" | grep -v ".spec.ts"
```

**Создать типы:**
```typescript
// common/interfaces/request.interface.ts
export interface RequestWithUser extends Request {
  user: {
    id: string;
    email: string;
    role: UserRole;
  };
}

// Usage in controllers
@Get()
findAll(@Req() req: RequestWithUser) {
  return this.service.findAll(req.user.id);
}
```

---

## 📅 НЕДЕЛЯ 4: ФИНАЛИЗАЦИЯ

### День 15-16: Integration Testing

**E2E Test Suite:**
```typescript
// test/critical-flows.e2e-spec.ts
describe('Critical Business Flows', () => {
  describe('Task Completion Flow', () => {
    it('should complete full refill task with photos', async () => {
      // 1. Login as operator
      // 2. Get assigned task
      // 3. Upload photo before
      // 4. Start task
      // 5. Upload photo after
      // 6. Complete task
      // 7. Verify inventory updated
    });
  });

  describe('Inventory Transfer Flow', () => {
    it('should transfer warehouse → operator → machine', async () => {
      // Test 3-level inventory flow
    });
  });
});
```

---

### День 17-18: Performance Validation

**Benchmarks:**
```bash
# Install k6 for load testing
brew install k6

# Run load test
k6 run tests/load/tasks-list.js
```

```javascript
// tests/load/tasks-list.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 50,
  duration: '30s',
};

export default function () {
  const res = http.get('http://localhost:3000/api/tasks');

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });

  sleep(1);
}
```

**Target Metrics:**
- P95 response time < 200ms
- Error rate < 0.1%
- Throughput > 100 req/s

---

### День 19-20: Documentation Update

**Обновить:**
- [ ] README.md - Quick start актуален
- [ ] API docs - Swagger полный
- [ ] DEPLOYMENT.md - Процедуры деплоя
- [ ] RUNBOOK.md - Операционные процедуры

---

## 📊 МЕТРИКИ УСПЕХА

### После Недели 1:
- [ ] CI/CD pipeline работает
- [ ] API compression включен
- [ ] N+1 queries исправлены
- [ ] Redis cache для reports

### После Недели 2:
- [ ] Frontend coverage > 30%
- [ ] Backend coverage > 60%
- [ ] E2E tests для critical flows

### После Недели 3:
- [ ] Grafana dashboards готовы
- [ ] Type safety улучшена
- [ ] Alert rules проверены

### После Недели 4:
- [ ] Load tests пройдены
- [ ] Documentation обновлена
- [ ] Production deployment validated

---

## 🎯 ИТОГОВАЯ ЦЕЛЬ

**Production Readiness Score: 9/10**

| Критерий | Before | After |
|----------|--------|-------|
| CI/CD | ❌ | ✅ |
| Test Coverage | 29% | 60% |
| Performance | 6.2 | 8.0 |
| Security | 8.5 | 9.0 |
| Monitoring | 7.0 | 9.0 |
| Documentation | 8.0 | 9.0 |

**Общее время:** ~80 человеко-часов (4 недели × 20 часов)

---

## 📞 КОНТАКТЫ

**Вопросы по плану:** Создайте issue в GitHub репозитории

**Отслеживание прогресса:** GitHub Projects Board
