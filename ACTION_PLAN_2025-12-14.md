# ПЛАН ДЕЙСТВИЙ VENDHUB MANAGER

**Дата создания:** 2025-12-14
**Обновлено:** Security-First подход
**Цель:** Достичь Production Readiness

---

## ЦЕЛЕВЫЕ ПОКАЗАТЕЛИ

| Метрика | Текущее | Целевое | Дельта |
|---------|---------|---------|--------|
| Общая оценка | 71/100 | 85/100 | +14 |
| Security | 68/100 | 90/100 | +22 |
| Test coverage | 4% | 50% | +46% |
| Performance | 6.2/10 | 8.0/10 | +1.8 |
| DevOps | 6.9/10 | 9.0/10 | +2.1 |
| Production Ready | НЕТ | ДА | - |

---

## НЕДЕЛЯ 1: SECURITY FIRST (БЛОКЕРЫ)

### День 1: Token Security Overhaul

**КРИТИЧНО: Миграция токенов из localStorage в httpOnly cookies**

**Задача SEC-1: Backend - Cookie-based Auth**

```typescript
// backend/src/modules/auth/auth.controller.ts
import { Response } from 'express';

@Post('login')
async login(
  @Body() dto: LoginDto,
  @Res({ passthrough: true }) res: Response,
) {
  const result = await this.authService.login(dto);

  // Set httpOnly cookies
  res.cookie('access_token', result.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000, // 15 min
  });

  res.cookie('refresh_token', result.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/auth/refresh',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  return { user: result.user };
}

@Post('logout')
async logout(@Res({ passthrough: true }) res: Response) {
  res.clearCookie('access_token');
  res.clearCookie('refresh_token', { path: '/api/auth/refresh' });
  return { success: true };
}
```

**Задача SEC-1b: Frontend - Remove localStorage**

```typescript
// frontend/lib/axios.ts
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true, // Send cookies with requests
});

// REMOVE all localStorage token operations
// DELETE: localStorage.setItem('access_token', ...)
// DELETE: localStorage.getItem('access_token')
```

**Задача SEC-1c: JWT Strategy Update**

```typescript
// backend/src/modules/auth/strategies/jwt.strategy.ts
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // Extract from cookie first
        (request) => request?.cookies?.access_token,
        // Fallback to header for API clients
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }
}
```

**Acceptance Criteria:**
- [ ] Токены хранятся в httpOnly cookies
- [ ] localStorage не содержит токенов
- [ ] XSS не может украсть сессию
- [ ] API clients могут использовать Bearer token

---

### День 2: Rate Limiting & Token Rotation

**Задача SEC-2: Rate Limiting на Auth Endpoints**

```typescript
// backend/src/modules/auth/auth.controller.ts
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async login(@Body() dto: LoginDto) { ... }

  @Post('refresh')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async refresh() { ... }

  @Post('register')
  @Throttle({ default: { limit: 3, ttl: 300000 } })
  async register(@Body() dto: RegisterDto) { ... }

  @Post('forgot-password')
  @Throttle({ default: { limit: 3, ttl: 3600000 } })
  async forgotPassword(@Body() dto: ForgotPasswordDto) { ... }
}
```

**Задача SEC-3: Refresh Token Rotation**

```typescript
// backend/src/modules/auth/auth.service.ts
async refreshTokens(oldRefreshToken: string): Promise<TokenPair> {
  // 1. Verify token
  const payload = await this.verifyRefreshToken(oldRefreshToken);

  // 2. Check if token is in whitelist (not already used)
  const isValid = await this.sessionService.isRefreshTokenValid(oldRefreshToken);
  if (!isValid) {
    // Token reuse detected - revoke all user sessions
    await this.sessionService.revokeAllUserSessions(payload.userId);
    throw new UnauthorizedException('Token reuse detected. All sessions revoked.');
  }

  // 3. Invalidate old token
  await this.sessionService.revokeRefreshToken(oldRefreshToken);

  // 4. Generate new pair
  const newTokens = await this.generateTokenPair(payload.userId);

  // 5. Store new refresh token
  await this.sessionService.storeRefreshToken(payload.userId, newTokens.refreshToken);

  return newTokens;
}
```

**Acceptance Criteria:**
- [ ] Login: 5 attempts/min
- [ ] Refresh: 10/min
- [ ] Register: 3/5min
- [ ] Refresh token invalidated after use
- [ ] Token reuse triggers session revocation

---

### День 3: JWT ID & Additional Security

**Задача SEC-4: JWT ID Generation**

```typescript
// backend/src/modules/auth/auth.service.ts
import { v4 as uuidv4 } from 'uuid';

private async generateTokenPair(userId: string): Promise<TokenPair> {
  const jti = uuidv4();

  const accessPayload = {
    sub: userId,
    email: user.email,
    role: user.role,
    jti, // Unique token ID for revocation
    type: 'access',
  };

  const refreshPayload = {
    sub: userId,
    jti: uuidv4(), // Separate ID for refresh
    type: 'refresh',
  };

  // Store jti for revocation checking
  await this.sessionService.storeTokenId(userId, jti);

  return {
    accessToken: this.jwtService.sign(accessPayload, { expiresIn: '15m' }),
    refreshToken: this.jwtService.sign(refreshPayload, { expiresIn: '7d' }),
  };
}
```

**Acceptance Criteria:**
- [ ] Каждый JWT имеет уникальный jti
- [ ] jti хранится в Redis для отзыва
- [ ] Можно отозвать конкретную сессию

---

## НЕДЕЛЯ 2: INFRASTRUCTURE & PERFORMANCE

### День 4-5: CI/CD Pipeline

**Задача INFRA-1: GitHub Actions Workflows**

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run npm audit
        run: |
          cd backend && npm audit --audit-level=high
          cd ../frontend && npm audit --audit-level=high

  lint-and-test:
    runs-on: ubuntu-latest
    needs: security-scan
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: vendhub_test
        ports:
          - 5432:5432
      redis:
        image: redis:7
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: |
            backend/package-lock.json
            frontend/package-lock.json

      - name: Install & Test Backend
        working-directory: ./backend
        run: |
          npm ci
          npm run lint
          npm run test
          npm run test:cov
          npm run build

      - name: Install & Test Frontend
        working-directory: ./frontend
        run: |
          npm ci
          npm run lint
          npm run build

      - name: Upload Coverage
        uses: codecov/codecov-action@v3
        with:
          files: backend/coverage/lcov.info
```

```yaml
# .github/workflows/deploy-staging.yml
name: Deploy to Staging
on:
  push:
    branches: [develop]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Staging
        run: |
          # Deploy scripts here
          echo "Deploying to staging..."
```

**Acceptance Criteria:**
- [ ] PR triggers lint + test + build
- [ ] Security scan runs before tests
- [ ] Coverage uploaded to Codecov
- [ ] Merge to develop deploys to staging

---

### День 6: Performance Fixes

**Задача PERF-1: API Compression**

```bash
cd backend
npm install compression @types/compression
```

```typescript
// backend/src/main.ts
import compression from 'compression';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.use(compression({
    filter: (req, res) => {
      if (req.headers['x-no-compression']) return false;
      return compression.filter(req, res);
    },
    threshold: 1024,
  }));

  // ... rest
}
```

**Задача PERF-2: N+1 Query Fix**

```typescript
// backend/src/modules/tasks/tasks.service.ts
async findAll(options: FindTasksDto): Promise<PaginatedResult<Task>> {
  const qb = this.taskRepository.createQueryBuilder('task');

  // Always load minimal relations
  qb.leftJoinAndSelect('task.machine', 'machine');
  qb.leftJoinAndSelect('task.assigned_to', 'user');

  // Conditional deep loading
  if (options.includeDetails) {
    qb.leftJoinAndSelect('task.items', 'items');
    qb.leftJoinAndSelect('items.nomenclature', 'nomenclature');
  }

  if (options.includeComments) {
    qb.leftJoinAndSelect('task.comments', 'comments');
  }

  // Filters
  if (options.status) {
    qb.andWhere('task.status = :status', { status: options.status });
  }
  if (options.machineId) {
    qb.andWhere('task.machine_id = :machineId', { machineId: options.machineId });
  }

  // Pagination
  qb.skip(options.skip || 0);
  qb.take(options.take || 20);
  qb.orderBy('task.created_at', 'DESC');

  const [items, total] = await qb.getManyAndCount();
  return { items, total, skip: options.skip, take: options.take };
}
```

**Задача PERF-3: Redis Cache for Reports**

```typescript
// backend/src/modules/reports/interceptors/cache.interceptor.ts
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

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

  private getCacheKey(context: ExecutionContext): string {
    const request = context.switchToHttp().getRequest();
    const { url, query, user } = request;
    return `report:${user?.id}:${url}:${JSON.stringify(query)}`;
  }
}
```

**Acceptance Criteria:**
- [ ] API responses gzip compressed
- [ ] Task list queries < 100ms
- [ ] Reports cached in Redis

---

## НЕДЕЛЯ 3: TESTING & QUALITY

### День 7-9: Test Coverage Improvement

**Backend Testing Priority:**

```typescript
// 1. Auth module - CRITICAL
// backend/src/modules/auth/__tests__/auth.service.spec.ts
describe('AuthService', () => {
  describe('login', () => {
    it('should set httpOnly cookies on login', async () => {});
    it('should reject invalid credentials', async () => {});
    it('should rate limit after 5 attempts', async () => {});
  });

  describe('refreshTokens', () => {
    it('should rotate refresh token', async () => {});
    it('should revoke all sessions on token reuse', async () => {});
  });
});

// 2. Tasks module - BUSINESS CRITICAL
// backend/src/modules/tasks/__tests__/tasks.service.spec.ts
describe('TasksService', () => {
  describe('completeTask', () => {
    it('should require photos before completion', async () => {});
    it('should update inventory on refill task', async () => {});
  });
});

// 3. Inventory module - BUSINESS CRITICAL
// backend/src/modules/inventory/__tests__/inventory.service.spec.ts
describe('InventoryService', () => {
  describe('transfer', () => {
    it('should move items warehouse → operator', async () => {});
    it('should move items operator → machine', async () => {});
  });
});
```

**Frontend Testing Priority:**

```typescript
// 1. Auth hooks
// frontend/src/hooks/__tests__/useAuth.test.ts
describe('useAuth', () => {
  it('should login and set user state', async () => {});
  it('should logout and clear state', async () => {});
  it('should auto-refresh before token expires', async () => {});
});

// 2. API layer
// frontend/src/lib/__tests__/api.test.ts
describe('API Client', () => {
  it('should send credentials with requests', () => {});
  it('should handle 401 and redirect to login', () => {});
});
```

**E2E Tests:**

```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('user can login with valid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'admin@vendhub.com');
    await page.fill('[data-testid="password"]', 'password');
    await page.click('[data-testid="submit"]');

    await expect(page).toHaveURL('/dashboard');
    // Verify no tokens in localStorage
    const tokens = await page.evaluate(() => localStorage.getItem('access_token'));
    expect(tokens).toBeNull();
  });

  test('user is redirected after session timeout', async ({ page }) => {
    // Login first, then wait for token expiration
  });
});
```

**Acceptance Criteria:**
- [ ] Backend coverage > 50%
- [ ] Frontend coverage > 30%
- [ ] Auth module: 80%+ coverage
- [ ] E2E tests for login, task completion

---

### День 10: Telegram Cart Persistence

**Задача: Migrate Cart to Redis**

```typescript
// backend/src/modules/telegram/services/cart.service.ts
@Injectable()
export class CartService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  private getCartKey(userId: string): string {
    return `telegram:cart:${userId}`;
  }

  async getCart(userId: string): Promise<CartItem[]> {
    const cart = await this.cacheManager.get<CartItem[]>(this.getCartKey(userId));
    return cart || [];
  }

  async addToCart(userId: string, item: CartItem): Promise<void> {
    const cart = await this.getCart(userId);
    const existingIndex = cart.findIndex(i => i.productId === item.productId);

    if (existingIndex >= 0) {
      cart[existingIndex].quantity += item.quantity;
    } else {
      cart.push(item);
    }

    // TTL: 24 hours
    await this.cacheManager.set(this.getCartKey(userId), cart, 86400);
  }

  async clearCart(userId: string): Promise<void> {
    await this.cacheManager.del(this.getCartKey(userId));
  }
}
```

**Acceptance Criteria:**
- [x] Cart persists across bot restarts
- [x] Cart shared across bot instances
- [x] Cart expires after 24h of inactivity

---

## НЕДЕЛЯ 4: MONITORING & DOCUMENTATION

### День 11-12: Grafana Dashboards

**Dashboard 1: Security Metrics**
```json
{
  "title": "Security Overview",
  "panels": [
    { "title": "Failed Login Attempts", "type": "graph" },
    { "title": "Rate Limit Hits", "type": "stat" },
    { "title": "Token Refresh Rate", "type": "graph" },
    { "title": "Active Sessions", "type": "gauge" }
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
    { "title": "Error Rate by Endpoint", "type": "pie" },
    { "title": "Cache Hit Rate", "type": "gauge" }
  ]
}
```

**Dashboard 3: Business Metrics**
```json
{
  "title": "Business Metrics",
  "panels": [
    { "title": "Tasks Created/Day", "type": "graph" },
    { "title": "Task Completion Rate", "type": "stat" },
    { "title": "Active Machines", "type": "stat" },
    { "title": "Inventory Movements", "type": "graph" }
  ]
}
```

---

### День 13-14: Documentation & Finalization

**Обновить документацию:**
- [ ] README.md - Quick start актуален
- [ ] API docs - Swagger полный
- [ ] SECURITY.md - Security practices
- [ ] DEPLOYMENT.md - Deployment процедуры
- [ ] RUNBOOK.md - Операционные процедуры

---

## МЕТРИКИ УСПЕХА

### После Недели 1 (Security):
- [ ] Токены в httpOnly cookies (не localStorage)
- [ ] Rate limiting на auth endpoints
- [ ] Refresh token rotation работает
- [ ] JWT имеют уникальный jti

### После Недели 2 (Infrastructure):
- [ ] CI/CD pipeline работает
- [ ] Security scan в pipeline
- [ ] API compression включен
- [ ] N+1 queries исправлены

### После Недели 3 (Quality):
- [x] Backend coverage > 50% (84.39% achieved)
- [ ] Frontend coverage > 30%
- [ ] E2E tests для critical flows
- [x] Telegram cart в Redis (PERF-4: CartStorageService with 24h TTL)

### После Недели 4 (Finalization):
- [ ] Grafana dashboards готовы
- [ ] Documentation обновлена
- [ ] Security audit passed
- [ ] Production deployment validated

---

## ИТОГОВАЯ ЦЕЛЬ

**Production Readiness: ДА**

| Критерий | Before | After |
|----------|--------|-------|
| Security Score | 68/100 | 90/100 |
| Token Storage | localStorage (XSS) | httpOnly cookies |
| Rate Limiting | Отсутствует | 5/min на login |
| CI/CD | Отсутствует | GitHub Actions |
| Test Coverage | 4% | 50% |
| Performance | 6.2/10 | 8.0/10 |
| Monitoring | Prometheus only | + Grafana |

**Общее время:** ~60-80 человеко-часов (4 недели)

---

## КОНТАКТЫ

**Вопросы по плану:** Создайте issue в GitHub репозитории

**Отслеживание прогресса:** GitHub Projects Board

**Security concerns:** Приватно через security@vendhub.com
