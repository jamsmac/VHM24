---
name: vhm24-devops
description: |
  VendHub DevOps & Deployment - CI/CD, Docker, деплой на Railway/Vercel.
  Создаёт Dockerfile, docker-compose, GitHub Actions workflows, настраивает production окружение.
  Использовать при настройке деплоя, CI/CD пайплайнов, Docker контейнеров, управлении окружениями.
  Triggers: "deploy", "CI/CD", "docker", "github actions", "railway", "vercel", "production", "staging"
---

# VendHub DevOps & Deployment

Скилл для настройки инфраструктуры, CI/CD и деплоя VendHub OS.

## Архитектура деплоя VendHub

```
┌─────────────────────────────────────────────────────────────┐
│                      GitHub Repository                       │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐  │
│  │ backend │    │frontend │    │ mobile  │    │  docs   │  │
│  └────┬────┘    └────┬────┘    └────┬────┘    └─────────┘  │
└───────┼──────────────┼──────────────┼───────────────────────┘
        │              │              │
        ▼              ▼              ▼
┌───────────────┐ ┌──────────┐ ┌─────────────┐
│   Railway     │ │  Vercel  │ │ Expo/Stores │
│  (Backend)    │ │(Frontend)│ │  (Mobile)   │
│  - NestJS     │ │ - Next.js│ │ - iOS       │
│  - PostgreSQL │ │ - SSR    │ │ - Android   │
│  - Redis      │ └──────────┘ └─────────────┘
└───────────────┘
        │
        ▼
┌───────────────────────────────────┐
│         External Services         │
│  - Cloudflare R2 (Files)         │
│  - Supabase (PostgreSQL backup)  │
│  - Redis Cloud (Cache)           │
│  - Sentry (Errors)               │
└───────────────────────────────────┘
```

## Стек технологий

| Компонент | Технология | Где деплоить |
|-----------|------------|--------------|
| Backend | NestJS 11 + TypeORM | Railway |
| Frontend | Next.js 16 + React 19 | Vercel |
| Database | PostgreSQL 14 | Railway / Supabase |
| Cache | Redis | Railway / Redis Cloud |
| Files | S3-compatible | Cloudflare R2 |
| Mobile | React Native + Expo | App Store / Play Store |

## Структура конфигурации

```
VHM24-repo/
├── docker-compose.yml          # Development
├── docker-compose.prod.yml     # Production
├── docker-compose.monitoring.yml # Prometheus + Grafana
├── docker-compose.test.yml     # Testing
├── .github/
│   └── workflows/
│       ├── ci.yml              # Lint + Test + Build
│       ├── deploy-staging.yml  # Deploy to staging
│       └── deploy-prod.yml     # Deploy to production
├── backend/
│   ├── Dockerfile
│   ├── Dockerfile.prod
│   └── .env.example
├── frontend/
│   ├── Dockerfile
│   └── vercel.json
└── scripts/deploy/
    ├── deploy.sh
    └── rollback.sh
```

## Паттерны

### Docker

Для создания Dockerfile см. [references/docker-patterns.md](references/docker-patterns.md):
- Multi-stage builds для NestJS
- Оптимизация размера образа
- Health checks
- Non-root пользователь

### CI/CD

Для GitHub Actions см. [references/github-actions.md](references/github-actions.md):
- Lint → Test → Build → Deploy pipeline
- Параллельные jobs
- Кэширование node_modules
- Secrets management

### Railway Deployment

Для деплоя на Railway см. [references/railway-deploy.md](references/railway-deploy.md):
- Настройка сервисов
- Environment variables
- PostgreSQL и Redis
- Custom domains

### Environment Management

Для управления окружениями см. [references/env-management.md](references/env-management.md):
- Структура .env файлов
- Secrets в CI/CD
- Валидация переменных

## Чеклист деплоя

### Pre-deployment
- [ ] Все тесты проходят (`npm test`)
- [ ] Линтинг без ошибок (`npm run lint`)
- [ ] TypeScript компилируется (`npm run build`)
- [ ] Environment variables настроены
- [ ] Database миграции готовы

### Deployment
- [ ] Docker образ собирается
- [ ] Health check endpoint работает
- [ ] SSL сертификат установлен
- [ ] DNS записи настроены

### Post-deployment
- [ ] Smoke tests пройдены
- [ ] Мониторинг получает метрики
- [ ] Логи пишутся
- [ ] Alerts настроены

## Команды

```bash
# Локальная разработка
docker-compose up -d

# Production сборка
docker-compose -f docker-compose.prod.yml build

# Деплой на Railway (через CLI)
railway up

# Деплой на Vercel
vercel --prod

# Проверка здоровья
curl https://api.vendhub.uz/health
```

## Rollback процедура

```bash
# Railway
railway rollback

# Vercel
vercel rollback

# Docker
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --no-build
```

## Troubleshooting

| Проблема | Решение |
|----------|---------|
| Build fails | Проверить node_modules кэш, очистить docker cache |
| Health check fails | Проверить DATABASE_URL, REDIS_URL |
| 502 Bad Gateway | Проверить порт приложения, nginx upstream |
| SSL errors | Проверить сертификат, обновить через certbot |
| Memory issues | Увеличить лимиты в Railway, оптимизировать запросы |
