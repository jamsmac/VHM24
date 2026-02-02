# Environment Management для VendHub

## Структура окружений

```
Development  →  Staging  →  Production
   (local)      (test)      (live)
```

| Окружение | Назначение | База данных | URL |
|-----------|------------|-------------|-----|
| Development | Локальная разработка | localhost | http://localhost:3000 |
| Staging | Тестирование | Railway staging | https://api-staging.vendhub.uz |
| Production | Live | Railway/Supabase prod | https://api.vendhub.uz |

## Файлы .env

### Структура

```
backend/
├── .env                  # Локальные настройки (git ignored)
├── .env.example          # Шаблон (в git)
├── .env.development      # Development defaults
├── .env.test             # Test environment
└── .env.production       # Production template (no secrets!)
```

### .env.example (шаблон)

```bash
# ===========================================
# Server
# ===========================================
NODE_ENV=development
PORT=3000
API_PREFIX=api
CORS_ORIGINS=http://localhost:3001

# ===========================================
# Database
# ===========================================
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=vendhub
# Или единый URL:
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/vendhub

# ===========================================
# Redis
# ===========================================
REDIS_HOST=localhost
REDIS_PORT=6379
# Или единый URL:
# REDIS_URL=redis://localhost:6379

# ===========================================
# JWT Authentication
# ===========================================
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRATION=15m
JWT_REFRESH_SECRET=your-refresh-secret-key-change-in-production
JWT_REFRESH_EXPIRATION=7d

# ===========================================
# Telegram Bot
# ===========================================
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_URL=
TELEGRAM_ADMIN_CHAT_ID=

# ===========================================
# File Storage (S3 / Cloudflare R2)
# ===========================================
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=auto
AWS_S3_BUCKET=vendhub-files
AWS_S3_ENDPOINT=  # For R2: https://xxx.r2.cloudflarestorage.com

# ===========================================
# Email (SMTP)
# ===========================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=noreply@vendhub.uz

# ===========================================
# Monitoring
# ===========================================
SENTRY_DSN=
LOG_LEVEL=debug

# ===========================================
# OpenAI (для AI Assistant)
# ===========================================
OPENAI_API_KEY=
```

## Валидация переменных

### NestJS ConfigModule + Joi

```typescript
// backend/src/config/env.validation.ts
import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  // Server
  NODE_ENV: Joi.string()
    .valid('development', 'staging', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),

  // Database
  DATABASE_URL: Joi.string().when('DATABASE_HOST', {
    is: Joi.exist(),
    then: Joi.optional(),
    otherwise: Joi.required(),
  }),
  DATABASE_HOST: Joi.string(),
  DATABASE_PORT: Joi.number().default(5432),
  DATABASE_USER: Joi.string(),
  DATABASE_PASSWORD: Joi.string(),
  DATABASE_NAME: Joi.string(),

  // Redis
  REDIS_URL: Joi.string().when('REDIS_HOST', {
    is: Joi.exist(),
    then: Joi.optional(),
    otherwise: Joi.required(),
  }),
  REDIS_HOST: Joi.string(),
  REDIS_PORT: Joi.number().default(6379),

  // JWT
  JWT_SECRET: Joi.string().required().min(32),
  JWT_EXPIRATION: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().required().min(32),
  JWT_REFRESH_EXPIRATION: Joi.string().default('7d'),

  // Telegram (optional in dev)
  TELEGRAM_BOT_TOKEN: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),

  // S3 (optional in dev)
  AWS_ACCESS_KEY_ID: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  AWS_SECRET_ACCESS_KEY: Joi.string(),
  AWS_S3_BUCKET: Joi.string(),
});
```

### Использование в AppModule

```typescript
// backend/src/app.module.ts
import { ConfigModule } from '@nestjs/config';
import { envValidationSchema } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: {
        abortEarly: true, // Остановиться на первой ошибке
      },
    }),
  ],
})
export class AppModule {}
```

## Генерация секретов

```bash
# JWT Secret (минимум 32 символа)
openssl rand -base64 48

# Или через Node.js
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

## Secrets в CI/CD

### GitHub Actions Secrets

```bash
# Настройка через gh CLI
gh secret set JWT_SECRET --body "$(openssl rand -base64 48)"
gh secret set JWT_REFRESH_SECRET --body "$(openssl rand -base64 48)"
gh secret set DATABASE_URL --body "postgresql://user:pass@host:5432/db"
```

### Railway Secrets

```bash
# Через CLI
railway variables set JWT_SECRET="$(openssl rand -base64 48)"

# Или через Dashboard
# Project → Service → Variables → Add Variable
```

### Vercel Environment Variables

```bash
# Через CLI
vercel env add NEXT_PUBLIC_API_URL production
# Ввести значение: https://api.vendhub.uz

# Через Dashboard
# Project → Settings → Environment Variables
```

## Безопасность

### Что НЕЛЬЗЯ коммитить

```gitignore
# .gitignore
.env
.env.local
.env.*.local
*.pem
*.key
credentials.json
```

### Что МОЖНО коммитить

```
.env.example      # Шаблон без значений
.env.development  # Только default значения (не secrets)
.env.test         # Test environment
```

### Ротация секретов

```bash
# 1. Сгенерировать новый секрет
NEW_SECRET=$(openssl rand -base64 48)

# 2. Обновить в Railway/Vercel
railway variables set JWT_SECRET="$NEW_SECRET"

# 3. Передеплоить
railway up

# 4. Обновить в GitHub Secrets (для CI)
gh secret set JWT_SECRET --body "$NEW_SECRET"
```

## Чеклист перед Production

- [ ] Все secrets уникальны и достаточно длинные (32+ символов)
- [ ] .env файлы в .gitignore
- [ ] Нет hardcoded secrets в коде
- [ ] DATABASE_URL указывает на production базу
- [ ] CORS_ORIGINS содержит только production домены
- [ ] NODE_ENV=production
- [ ] LOG_LEVEL=warn или error (не debug!)
- [ ] Sentry DSN настроен
- [ ] Telegram webhooks указывают на production URL
