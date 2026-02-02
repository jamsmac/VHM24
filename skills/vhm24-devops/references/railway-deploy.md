# Railway Deployment для VendHub

## Структура проекта в Railway

```
VendHub Project
├── backend-prod          # NestJS API (Production)
├── backend-staging       # NestJS API (Staging)
├── postgres-prod         # PostgreSQL (Production)
├── postgres-staging      # PostgreSQL (Staging)
├── redis-prod            # Redis (Production)
└── redis-staging         # Redis (Staging)
```

## Начальная настройка

### 1. Установка Railway CLI

```bash
# macOS / Linux
npm install -g @railway/cli

# Логин
railway login
```

### 2. Создание проекта

```bash
# Создать новый проект
railway init

# Или привязать к существующему
railway link
```

### 3. Создание сервисов

```bash
# PostgreSQL
railway add --plugin postgresql

# Redis
railway add --plugin redis

# Backend (из Dockerfile)
railway up --service backend
```

## Конфигурация Backend

### railway.json

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "backend/Dockerfile.prod"
  },
  "deploy": {
    "startCommand": "node dist/main.js",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 300,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

### Dockerfile.prod для Railway

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

# Railway требует non-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./

USER nestjs

# Railway автоматически устанавливает PORT
ENV PORT=3000
EXPOSE 3000

CMD ["node", "dist/main.js"]
```

## Environment Variables

### Настройка через CLI

```bash
# Установить переменную
railway variables set NODE_ENV=production

# Установить несколько
railway variables set \
  JWT_SECRET=your-secret \
  JWT_REFRESH_SECRET=your-refresh-secret \
  TELEGRAM_BOT_TOKEN=your-token

# Посмотреть все переменные
railway variables
```

### Настройка через Dashboard

1. Открыть Railway Dashboard
2. Выбрать сервис → Variables
3. Добавить переменные:

```
# Обязательные
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
JWT_SECRET=<secure-random-string>
JWT_REFRESH_SECRET=<secure-random-string>

# Telegram
TELEGRAM_BOT_TOKEN=<bot-token>

# AWS S3 / Cloudflare R2
AWS_ACCESS_KEY_ID=<key>
AWS_SECRET_ACCESS_KEY=<secret>
AWS_REGION=auto
AWS_S3_BUCKET=vendhub-files
AWS_S3_ENDPOINT=https://xxx.r2.cloudflarestorage.com

# Sentry
SENTRY_DSN=https://xxx@sentry.io/xxx

# SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<email>
SMTP_PASSWORD=<app-password>
```

## Custom Domain

### 1. Добавить домен в Railway

```bash
# Через CLI
railway domain add api.vendhub.uz
```

### 2. Настроить DNS

```
Type: CNAME
Name: api
Value: <railway-domain>.railway.app
```

### 3. SSL автоматический

Railway автоматически настраивает SSL через Let's Encrypt.

## Миграции базы данных

### Вариант 1: При деплое

```json
// railway.json
{
  "deploy": {
    "startCommand": "npm run migration:run && node dist/main.js"
  }
}
```

### Вариант 2: Отдельно через CLI

```bash
# Подключиться к Railway environment
railway run npm run migration:run
```

### Вариант 3: Через GitHub Actions

```yaml
- name: Run Migrations
  run: |
    npm ci
    npm run migration:run
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

## Масштабирование

### Горизонтальное (replicas)

```bash
# Через Dashboard: Settings → Replicas
# Или через railway.json
{
  "deploy": {
    "numReplicas": 2
  }
}
```

### Вертикальное (resources)

```bash
# Через Dashboard: Settings → Resources
# vCPU: 1-8
# Memory: 512MB - 32GB
```

## Мониторинг

### Логи

```bash
# Просмотр логов
railway logs

# Follow режим
railway logs -f

# Фильтр по времени
railway logs --since 1h
```

### Метрики

Railway Dashboard → Observability:
- CPU Usage
- Memory Usage
- Network I/O
- Request count

## Rollback

### Через CLI

```bash
# Посмотреть деплои
railway deployments

# Откатиться к предыдущему
railway rollback
```

### Через Dashboard

1. Deployments → выбрать успешный деплой
2. "Rollback to this deployment"

## Troubleshooting

### Build fails

```bash
# Проверить логи сборки
railway logs --deployment <id>

# Частые причины:
# - Неправильный Dockerfile путь
# - Отсутствуют env variables при build
# - npm ci fails (проверить package-lock.json)
```

### Health check fails

```bash
# Проверить что endpoint работает локально
curl http://localhost:3000/health

# Проверить что приложение слушает правильный порт
# Railway устанавливает PORT автоматически
```

### Database connection fails

```bash
# Проверить DATABASE_URL
railway variables | grep DATABASE

# Проверить что сервис postgres запущен
railway status
```

## Стоимость

| Ресурс | Бесплатно | Hobby ($5/мес) | Pro |
|--------|-----------|----------------|-----|
| Execution | 500 hrs | Unlimited | Unlimited |
| Memory | 512MB | 8GB | 32GB |
| vCPU | Shared | 8 vCPU | 32 vCPU |
| Bandwidth | 100GB | Unlimited | Unlimited |

Рекомендация: **Hobby план** достаточен для MVP/Staging.
