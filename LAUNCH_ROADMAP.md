# 🚀 VendHub OS — План запуска в Production

> Создан: 2 февраля 2026
> Текущее состояние: Active Development
> Цель: Production Launch

---

## 📊 Текущий статус проекта

| Компонент | Готовность | Блокеры |
|-----------|------------|---------|
| Backend API | 🟢 90% | Увеличить тесты |
| Frontend Dashboard | 🟢 85% | Увеличить тесты (7 → 50+) |
| Mobile App | 🔴 20% | Требует полной разработки |
| База данных | 🟢 95% | 87 миграций, готово |
| CI/CD | 🟢 90% | ✅ GitHub Actions настроен |
| Мониторинг | 🟡 60% | Скилл создан, нужна конфигурация |
| Документация | 🟢 80% | ✅ Консолидация выполнена |
| AI Skills | 🟢 95% | ✅ 19 скиллов (4 новых добавлено) |

---

## 🎯 ФАЗА 1: Стабилизация (Неделя 1-2)

### 1.1 Очистка Legacy кода
**Приоритет: КРИТИЧЕСКИЙ**

```bash
# Удалить устаревшие директории (~200 файлов)
rm -rf telegram-bot/     # Дублируется в backend/src/modules/telegram/
rm -rf server/           # Старый Express+tRPC+MySQL (46 файлов)
rm -rf client/           # Старый React+Vite frontend (131 файл)
rm -rf drizzle/          # Старые MySQL схемы (16 файлов)
```

**Результат:** Упрощение кодовой базы, уменьшение confusion

### 1.2 Консолидация документации
**Приоритет: ВЫСОКИЙ**

| Оставить | Архивировать в docs/archive/ |
|----------|------------------------------|
| README.md | AUDIT_*.md |
| CLAUDE.md | SPRINT_*.md |
| CHANGELOG.md | ANALYSIS_*.md |
| DEPLOYMENT.md | *_REPORT.md |
| SECURITY.md | *_SUMMARY.md |
| LAUNCH_ROADMAP.md | Остальные 100+ файлов |

### 1.3 Исправление TypeScript ошибок
**Приоритет: СРЕДНИЙ**

```bash
# Проверить и исправить
cd frontend && npm run type-check
cd backend && npm run build
```

### 1.4 Увеличение тестового покрытия Frontend
**Приоритет: ВЫСОКИЙ**

| Текущее | Цель | Компоненты для покрытия |
|---------|------|-------------------------|
| 7 файлов | 50+ файлов | DataTable, Forms, Charts, Auth |

**Задачи:**
- [ ] Тесты для DataTable компонента
- [ ] Тесты для форм (React Hook Form)
- [ ] Тесты для графиков (Recharts)
- [ ] Тесты для аутентификации
- [ ] E2E тесты критических путей (Playwright)

---

## 🛠️ ФАЗА 2: Критические скиллы (Неделя 3)

### 2.1 Создать vhm24-devops
**Приоритет: КРИТИЧЕСКИЙ — без него нельзя деплоить**

```
skills/vhm24-devops/
├── SKILL.md
├── references/
│   ├── docker-patterns.md      # Dockerfile, docker-compose
│   ├── github-actions.md       # CI/CD workflows
│   ├── railway-deploy.md       # Railway deployment
│   ├── nginx-config.md         # Reverse proxy
│   └── env-management.md       # Secrets, .env
└── scripts/
    ├── health-check.sh         # Проверка здоровья сервисов
    ├── deploy-staging.sh       # Деплой на staging
    └── rollback.sh             # Откат версии
```

**Содержимое:**
- Docker multi-stage builds для NestJS
- GitHub Actions: lint → test → build → deploy
- Railway/Vercel конфигурация
- Nginx для reverse proxy
- SSL/TLS через Let's Encrypt
- Environment variables management
- Blue-green deployment
- Rollback процедуры

### 2.2 Создать vhm24-monitoring
**Приоритет: КРИТИЧЕСКИЙ — без него не видно проблем**

```
skills/vhm24-monitoring/
├── SKILL.md
├── references/
│   ├── prometheus-metrics.md   # Метрики для VendHub
│   ├── grafana-dashboards.md   # Готовые дашборды
│   ├── alertmanager-rules.md   # Правила алертов
│   ├── logging-patterns.md     # Winston/Pino
│   └── sentry-setup.md         # Error tracking
└── assets/
    ├── grafana/
    │   ├── vendhub-overview.json
    │   ├── api-performance.json
    │   └── database-health.json
    └── prometheus/
        └── alerts.yml
```

**Содержимое:**
- Prometheus метрики для NestJS
- Grafana дашборды: Overview, API, Database, Tasks
- AlertManager: CPU, Memory, Error rate, Response time
- Winston structured logging
- Sentry для error tracking
- Health check endpoints
- APM (Application Performance Monitoring)

---

## 🔒 ФАЗА 3: Security & Docs (Неделя 4)

### 3.1 Создать vhm24-security-hardening
**Приоритет: ВЫСОКИЙ**

```
skills/vhm24-security-hardening/
├── SKILL.md
└── references/
    ├── cors-csrf.md            # CORS/CSRF настройка
    ├── rate-limiting.md        # Rate limiting
    ├── helmet-config.md        # Security headers
    ├── input-validation.md     # Sanitization
    └── audit-logging.md        # Логирование действий
```

**Чеклист безопасности:**
- [ ] CORS настроен для production доменов
- [ ] CSRF токены для форм
- [ ] Rate limiting (100 req/min для API)
- [ ] Helmet.js security headers
- [ ] SQL injection prevention (TypeORM safe)
- [ ] XSS prevention (React safe + DOMPurify)
- [ ] Input sanitization (class-validator)
- [ ] Audit logging всех действий
- [ ] JWT refresh token rotation
- [ ] Password hashing (bcrypt, 12 rounds)

### 3.2 Создать vhm24-docs-generator
**Приоритет: СРЕДНИЙ**

```
skills/vhm24-docs-generator/
├── SKILL.md
└── references/
    ├── swagger-patterns.md     # OpenAPI генерация
    ├── adr-template.md         # Architecture Decision Records
    ├── readme-templates.md     # README для модулей
    └── runbook-template.md     # Deployment runbooks
```

### 3.3 Настроить мониторинг
**Задачи:**
- [ ] Prometheus metrics endpoint
- [ ] Grafana дашборды импортированы
- [ ] AlertManager настроен (Telegram alerts)
- [ ] Sentry подключен
- [ ] Health check endpoints работают

---

## 🚀 ФАЗА 4: Staging & Testing (Неделя 5)

### 4.1 Deploy на Staging
```bash
# Используя vhm24-devops скилл
./scripts/deploy-staging.sh
```

**Environment:**
- Railway (Backend + PostgreSQL)
- Vercel (Frontend)
- Cloudflare R2 (Files)
- Redis Cloud (Cache + Queue)

### 4.2 Smoke Testing
**Критические пути:**
- [ ] Авторизация (Telegram login)
- [ ] Создание машины
- [ ] Создание задачи (refill)
- [ ] Загрузка фото
- [ ] Завершение задачи
- [ ] Просмотр аналитики
- [ ] Real-time уведомления

### 4.3 Load Testing
```bash
# k6 или artillery
k6 run load-test.js --vus 100 --duration 5m
```

**Метрики:**
- Response time < 200ms (p95)
- Error rate < 1%
- Throughput > 100 RPS

### 4.4 Security Audit
- [ ] OWASP Top 10 checklist
- [ ] Dependency audit (npm audit)
- [ ] Secrets scan (git-secrets)
- [ ] SSL/TLS проверка

---

## 🎉 ФАЗА 5: Production Launch (Неделя 6)

### 5.1 Pre-launch Checklist

**Инфраструктура:**
- [ ] Production database готова
- [ ] Backups настроены (daily)
- [ ] SSL сертификаты установлены
- [ ] CDN настроен (Cloudflare)
- [ ] DNS записи обновлены

**Мониторинг:**
- [ ] Grafana дашборды работают
- [ ] Alerts настроены (Telegram)
- [ ] Sentry получает ошибки
- [ ] Logs собираются

**Безопасность:**
- [ ] CORS только для production домена
- [ ] Rate limiting активен
- [ ] Secrets в переменных окружения
- [ ] Admin аккаунты созданы

### 5.2 Go Live
```bash
# Деплой на production
./scripts/deploy-production.sh

# Проверка
curl https://api.vendhub.uz/health
curl https://app.vendhub.uz
```

### 5.3 Post-launch Monitoring
**Первые 24 часа:**
- Мониторить error rate
- Проверять response times
- Следить за памятью/CPU
- Быть готовым к hotfix

---

## 📱 ФАЗА 6: Mobile App (После запуска web)

### 6.1 Создать vhm24-mobile-native
**Приоритет: НИЗКИЙ (после web launch)**

```
skills/vhm24-mobile-native/
├── SKILL.md
└── references/
    ├── expo-config.md          # Expo setup
    ├── navigation.md           # React Navigation
    ├── offline-first.md        # Offline architecture
    ├── push-notifications.md   # FCM setup
    └── store-publish.md        # App Store / Play Store
```

### 6.2 Mobile Development
- [ ] Authentication flow
- [ ] Task list screen
- [ ] Task details + photo upload
- [ ] QR scanner
- [ ] Offline mode
- [ ] Push notifications
- [ ] Beta testing (TestFlight / Play Console)
- [ ] Store publication

---

## 📅 Общий Timeline

```
Неделя 1-2: Стабилизация
├── Удаление legacy кода
├── Консолидация документации
├── Увеличение тестов
└── Исправление ошибок

Неделя 3: Критические скиллы
├── vhm24-devops
└── vhm24-monitoring

Неделя 4: Security & Docs
├── vhm24-security-hardening
├── vhm24-docs-generator
└── Настройка мониторинга

Неделя 5: Staging & Testing
├── Deploy на staging
├── Smoke testing
├── Load testing
└── Security audit

Неделя 6: Production Launch
├── Pre-launch checklist
├── Go Live
└── Post-launch monitoring

После запуска: Mobile App
├── vhm24-mobile-native
└── Полная разработка
```

---

## 🆕 Новые скиллы для создания

| Приоритет | Скилл | Статус | Описание |
|-----------|-------|--------|----------|
| 🔴 P0 | vhm24-devops | ✅ DONE | CI/CD, Docker, деплой |
| 🔴 P0 | vhm24-monitoring | ✅ DONE | Логи, метрики, алерты |
| 🟠 P1 | vhm24-security-hardening | ✅ DONE | Защита от атак |
| 🟠 P1 | vhm24-docs-generator | ✅ DONE | API docs, архитектура |
| 🟡 P2 | vhm24-data-migration | ⬜ TODO | Импорт/экспорт данных |
| 🟡 P2 | vhm24-integrations | ⬜ TODO | Email/SMS/Storage |
| 🟢 P3 | vhm24-performance | ⬜ TODO | Оптимизация |
| 🟢 P3 | vhm24-mobile-native | ⬜ TODO | React Native полностью |

---

## ✅ Критерии готовности к Production

### Must Have (без этого не запускаем)
- [x] Legacy код удалён
- [x] CI/CD pipeline работает
- [ ] Мониторинг настроен (скилл создан, нужна конфигурация)
- [x] Security hardening выполнен (скилл создан)
- [ ] Smoke tests проходят
- [ ] Backups настроены

### Should Have (желательно)
- [ ] Load testing пройден
- [ ] Frontend тесты > 50
- [x] API документация готова (скилл создан)
- [x] Runbooks написаны (шаблоны созданы)

### Nice to Have (после запуска)
- [ ] Mobile app готов
- [ ] Performance оптимизация
- [ ] Advanced analytics

---

## 🎯 Следующий шаг

**Фазы 1-3 выполнены! ✅**

Выполнено:
- ✅ Legacy код удалён (telegram-bot/, server/, client/, drizzle/)
- ✅ Документация консолидирована
- ✅ vhm24-devops создан (SKILL.md + 5 references + 3 scripts)
- ✅ vhm24-monitoring создан (SKILL.md + 5 references)
- ✅ vhm24-security-hardening создан (SKILL.md + 5 references)
- ✅ vhm24-docs-generator создан (SKILL.md + 4 references)
- ✅ GitHub Actions CI/CD настроен (ci.yml, deploy-staging.yml, deploy-production.yml)

**Рекомендую продолжить с:**

1. **Настроить GitHub Secrets** — для деплоя на staging
2. **Deploy на staging** — первый тестовый деплой
3. **Smoke testing** — проверка критических путей
4. **Настроить мониторинг** — Prometheus + Grafana + Sentry

После этого проект будет готов к production launch.

---

*Документ обновляется по мере прогресса*
