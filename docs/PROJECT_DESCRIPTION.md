# 📋 Описание проекта VendHub Manager (VHM24)

> **Версия документа**: 1.0.0
> **Дата создания**: 2025-12-19
> **Язык**: Русский

---

## Содержание

1. [Общее описание](#1-общее-описание)
2. [Архитектура проекта](#2-архитектура-проекта)
3. [Основные модули и компоненты](#3-основные-модули-и-компоненты)
4. [Функциональность](#4-функциональность)
5. [Потоки данных](#5-потоки-данных)
6. [API / Эндпоинты](#6-api--эндпоинты)
7. [База данных](#7-база-данных)
8. [Конфигурация](#8-конфигурация)
9. [Как запустить](#9-как-запустить)
10. [Как работать с проектом](#10-как-работать-с-проектом)
11. [Известные особенности](#11-известные-особенности)

---

## 1. ОБЩЕЕ ОПИСАНИЕ

### **Что это?**
VendHub Manager — это комплексная система управления вендинговым бизнесом (ERP/CRM/CMMS), работающая по принципу **ручных операций**. Система не имеет прямого подключения к автоматам — все данные поступают через действия операторов с обязательной фото-валидацией.

### **Для кого?**
- **Владельцы вендингового бизнеса** — контроль всего парка автоматов
- **Операторы** — выполнение задач по обслуживанию через мобильное приложение
- **Менеджеры** — аналитика, отчётность, управление персоналом
- **Конечные клиенты** — заказ товаров через QR-код (клиентская платформа)

### **Основная проблема**
Централизованное управление парком вендинговых автоматов без необходимости дорогостоящей телеметрии. Отслеживание запасов, финансов, задач и инцидентов в единой системе.

### **Технологии**

| Слой | Стек |
|------|------|
| Backend | NestJS 10, TypeORM, PostgreSQL 14+, Redis 7, Bull |
| Frontend | Next.js 16, React 19, TailwindCSS, Zustand, TanStack Query |
| Mobile | React Native (Expo 54), React Navigation 7 |
| Инфраструктура | Docker, Railway.app, GitHub Actions, Prometheus + Grafana |

### **Статистика кодовой базы**

| Метрика | Значение |
|---------|----------|
| Backend TypeScript файлов | 681 |
| Frontend React компонентов | 233 |
| Сущностей в БД | 107 |
| Тестовых файлов | 243 |
| Миграций БД | 62 |
| Backend модулей | 47 |
| Frontend страниц | 93 |

---

## 2. АРХИТЕКТУРА ПРОЕКТА

### Структура папок верхнего уровня

```
VHM24/
├── backend/                 # NestJS API (9.9 MB, 681 файл)
├── frontend/                # Next.js Dashboard (4.1 MB, 233 компонента)
├── mobile/                  # React Native App (918 KB)
├── docs/                    # Документация
├── monitoring/              # Prometheus + Grafana
├── nginx/                   # Конфигурация прокси
├── scripts/                 # Утилиты деплоя
├── .claude/                 # Правила для AI-ассистентов
├── .github/workflows/       # CI/CD пайплайны
├── docker-compose.yml       # Локальная разработка
├── CLAUDE.md                # Главный гайд для AI (v2.1.0)
└── DEPLOYMENT.md            # Инструкция по деплою
```

### Точки входа в приложение

| Компонент | Файл | Описание |
|-----------|------|----------|
| Backend API | `backend/src/main.ts` | Запуск NestJS сервера |
| Backend Modules | `backend/src/app.module.ts` | Корневой модуль |
| Frontend | `frontend/src/app/layout.tsx` | Root layout Next.js |
| Mobile | `mobile/src/App.tsx` | Entry point Expo |

### Двойная платформа (Dual Platform)

```
┌─────────────────────────────────────────────────────────────┐
│                    VendHub Manager                          │
├─────────────────────────────┬───────────────────────────────┤
│       Staff Platform        │       Client Platform         │
│      (Внутренняя)           │        (Публичная)            │
├─────────────────────────────┼───────────────────────────────┤
│ • /api/* эндпоинты          │ • /api/client/* эндпоинты     │
│ • JWT авторизация           │ • Telegram Web App auth       │
│ • RBAC с системными ролями  │ • Публичное меню автоматов    │
│ • Dashboard для управления  │ • Заказы и программа лояльн.  │
│ • Мобильное приложение опер.│ • Клиентское мобильное прил.  │
└─────────────────────────────┴───────────────────────────────┘
```

### Детальная структура Backend

```
backend/src/
├── modules/                   # 47 feature-модулей
│   ├── auth/                  # JWT + 2FA авторизация
│   ├── users/                 # Управление пользователями
│   ├── machines/              # CRUD автоматов + QR
│   ├── machine-access/        # Роли доступа к автоматам
│   ├── tasks/                 # Задачи операторов
│   ├── inventory/             # 3-уровневый инвентарь
│   ├── transactions/          # Финансы
│   ├── incidents/             # Инциденты
│   ├── notifications/         # Уведомления
│   ├── telegram/              # Telegram-бот
│   ├── client/                # Клиентская платформа
│   └── ...                    # Ещё 36 модулей
├── common/                    # Общие утилиты
│   ├── entities/              # BaseEntity
│   ├── guards/                # Auth guards
│   ├── decorators/            # Кастомные декораторы
│   └── filters/               # Exception filters
├── database/
│   ├── migrations/            # 62 миграции
│   └── seeds/                 # Сиды данных
├── config/                    # Конфигурация
└── scheduled-tasks/           # Cron-задачи
```

### Детальная структура Frontend

```
frontend/src/
├── app/                       # Next.js App Router
│   ├── (auth)/                # Страницы авторизации
│   ├── (public)/              # Публичные страницы
│   │   ├── menu/[machineNumber]/  # Меню автомата
│   │   └── order/[orderId]/   # Отслеживание заказа
│   └── dashboard/             # Защищённый дашборд (93 страницы)
├── components/                # 21 директория компонентов
│   ├── ui/                    # Shadcn UI примитивы
│   ├── machines/              # Компоненты автоматов
│   ├── tasks/                 # Компоненты задач
│   └── ...
├── hooks/                     # 8 кастомных хуков
├── lib/                       # API клиенты и утилиты
├── providers/                 # Context providers
└── types/                     # TypeScript типы
```

### Детальная структура Mobile

```
mobile/src/
├── screens/                   # Экраны приложения
│   ├── Auth/                  # Авторизация
│   ├── Tasks/                 # Задачи оператора
│   ├── Equipment/             # Оборудование
│   ├── Profile/               # Профиль
│   └── Client/                # Клиентский интерфейс
├── navigation/                # Навигация
│   ├── AppNavigator.tsx       # Главный навигатор
│   ├── MainNavigator.tsx      # Staff навигация
│   └── ClientNavigator.tsx    # Client навигация
├── components/                # Переиспользуемые компоненты
├── services/                  # API сервисы
├── store/                     # Zustand состояние
└── hooks/                     # Кастомные хуки
```

---

## 3. ОСНОВНЫЕ МОДУЛИ И КОМПОНЕНТЫ

### Блок 1: Ядро системы (Core)

| Компонент | Что делает | Где находится |
|-----------|------------|---------------|
| Machines | CRUD автоматов, QR-коды, статусы | `backend/src/modules/machines/` |
| Tasks | Задачи операторов с фото-валидацией | `backend/src/modules/tasks/` |
| Inventory | 3-уровневая система запасов | `backend/src/modules/inventory/` |
| Transactions | Финансовые операции | `backend/src/modules/transactions/` |

### Блок 2: Авторизация и пользователи

| Компонент | Что делает | Где находится |
|-----------|------------|---------------|
| Auth | JWT + Refresh tokens + 2FA | `backend/src/modules/auth/` |
| Users | Управление пользователями | `backend/src/modules/users/` |
| RBAC | Роли и разрешения | `backend/src/modules/rbac/` |
| Machine Access | Доступ к автоматам по ролям | `backend/src/modules/machine-access/` |

### Блок 3: Операционная деятельность

| Компонент | Что делает | Где находится |
|-----------|------------|---------------|
| Incidents | Инциденты и проблемы автоматов | `backend/src/modules/incidents/` |
| Complaints | Жалобы клиентов | `backend/src/modules/complaints/` |
| Equipment | Оборудование и компоненты | `backend/src/modules/equipment/` |
| Routes | Планирование маршрутов | `backend/src/modules/routes/` |

### Блок 4: Справочники и данные

| Компонент | Что делает | Где находится |
|-----------|------------|---------------|
| Nomenclature | Каталог продуктов | `backend/src/modules/nomenclature/` |
| Recipes | Рецепты с версионированием | `backend/src/modules/recipes/` |
| Locations | Локации/точки продаж | `backend/src/modules/locations/` |
| Dictionaries | Системные справочники | `backend/src/modules/dictionaries/` |

### Блок 5: Интеграции и коммуникации

| Компонент | Что делает | Где находится |
|-----------|------------|---------------|
| Telegram | Telegram-бот с FSM | `backend/src/modules/telegram/` |
| Notifications | Уведомления (email, push, in-app) | `backend/src/modules/notifications/` |
| Web Push | Browser push notifications | `backend/src/modules/web-push/` |
| Email | Email-сервис | `backend/src/modules/email/` |

### Блок 6: Аналитика и отчётность

| Компонент | Что делает | Где находится |
|-----------|------------|---------------|
| Analytics | Дашборд метрики | `backend/src/modules/analytics/` |
| Reports | Генерация PDF отчётов | `backend/src/modules/reports/` |
| Audit Logs | Журнал аудита | `backend/src/modules/audit-logs/` |
| Monitoring | Системный мониторинг | `backend/src/modules/monitoring/` |

### Блок 7: Клиентская платформа

| Компонент | Что делает | Где находится |
|-----------|------------|---------------|
| Client Auth | Авторизация через Telegram | `backend/src/modules/client/` |
| Client Orders | Заказы клиентов | `backend/src/modules/client/` |
| Loyalty | Программа лояльности | `backend/src/modules/client/` |
| Public Menu | Публичное меню автомата | `frontend/src/app/(public)/menu/` |

---

## 4. ФУНКЦИОНАЛЬНОСТЬ

### 🔐 Авторизация и пользователи

- **JWT авторизация** — access token 15 мин, refresh token 7 дней
- **Двухфакторная аутентификация** — TOTP через Speakeasy
- **Системные роли** — SuperAdmin, Admin, Manager, Operator, Collector, Technician, Viewer
- **Роли на уровне автомата** — Owner, Admin, Manager, Operator, Technician, Viewer
- **Запросы доступа** — workflow одобрения новых пользователей
- **Сессии** — отслеживание активных сессий, принудительный logout

### 🏭 Управление автоматами

- **CRUD операции** — создание, редактирование, удаление автоматов
- **QR-коды** — генерация и распознавание по `machine_number`
- **Статусы** — active, low_stock, error, maintenance, offline, disabled
- **Контракты** — привязка к точкам с комиссией
- **Capacity** — управление ёмкостью и слотами
- **Настройки оплаты** — наличные, карта, QR-оплата

### 📋 Задачи (ЦЕНТРАЛЬНЫЙ МЕХАНИЗМ)

- **Типы задач** — refill, collection, cleaning, repair, install, removal, audit, inspection
- **Workflow** — pending → assigned → in_progress → completed/rejected
- **Фото-валидация** — ОБЯЗАТЕЛЬНЫЕ фото "до" и "после"
- **Приоритеты** — low, normal, high, urgent
- **Эскалация** — автоматическое создание инцидентов при просрочке
- **Комментарии** — обсуждение в рамках задачи
- **Компоненты** — замена оборудования в рамках задачи

### 📦 Инвентарь (3-уровневая система)

```
Warehouse Inventory → Operator Inventory → Machine Inventory
   (склад)              (у оператора)         (в автомате)
```

- **Перемещения** — transfers между уровнями
- **Резервирование** — бронирование товара под задачи
- **Инвентаризация** — актуальный подсчёт с фиксацией разницы
- **Пороги** — уведомления при низком остатке
- **Балансы** — расчёт остатков в реальном времени

### 💰 Финансы

- **Транзакции** — income, expense, refund, adjustment, transfer
- **Инкассация** — сбор наличных с фиксацией суммы
- **Категории расходов** — классификация трат
- **Комиссии** — расчёт и автоматизация выплат контрагентам
- **Сверка** — reconciliation отчёты
- **Начальные остатки** — opening balances для старта учёта

### 🚨 Инциденты и мониторинг

- **Типы инцидентов** — low_stock, error, cash_discrepancy, offline, vandalism
- **Статусы** — created → in_progress → resolved → closed
- **Алерты** — системные уведомления о критических событиях
- **Daily Stats** — ежедневная статистика по автоматам
- **Рейтинги операторов** — метрики производительности

### 📱 Мобильное приложение (Staff)

- **Список задач** — с фильтрами и поиском
- **Детали задачи** — полная информация + действия
- **Камера** — съёмка фото "до/после"
- **Геолокация** — фиксация местоположения
- **Offline режим** — очередь задач без интернета
- **Push уведомления** — о новых задачах

### 👥 Клиентская платформа

- **Публичное меню** — `/menu/[machineNumber]` по QR-коду
- **Telegram авторизация** — через Telegram Web App initData
- **Программа лояльности** — накопление и трата баллов
- **Заказы** — размещение и отслеживание (Phase 2)
- **Кошелёк** — цифровой баланс (Phase 2)

### 🔔 Уведомления

- **Каналы** — in-app, email, Telegram, web push
- **Шаблоны** — настраиваемые шаблоны сообщений
- **Retry логика** — повторные попытки при ошибках
- **Настройки пользователя** — выбор каналов

### 📊 Аналитика и отчёты

- **Dashboard** — ключевые метрики в реальном времени
- **PDF отчёты** — генерация через PDFKit
- **Excel импорт** — загрузка данных продаж
- **AI импорт** — интеллектуальный парсинг данных
- **Аудит** — полный журнал всех действий

### 🤖 Telegram-бот

- **FSM состояния** — многошаговые диалоги
- **Inline keyboards** — интерактивные кнопки
- **Уведомления** — отправка алертов операторам
- **История сообщений** — логирование переписки

---

## 5. ПОТОКИ ДАННЫХ

### Откуда приходят данные

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Мобильное      │    │   Dashboard     │    │  Telegram Bot   │
│  приложение     │    │   (Next.js)     │    │                 │
└────────┬────────┘    └────────┬────────┘    └────────┬────────┘
         │                      │                      │
         └──────────────────────┼──────────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │      REST API         │
                    │    (NestJS + JWT)     │
                    └───────────┬───────────┘
                                │
         ┌──────────────────────┼──────────────────────┐
         │                      │                      │
┌────────▼────────┐    ┌────────▼────────┐    ┌────────▼────────┐
│   PostgreSQL    │    │     Redis       │    │   MinIO (S3)    │
│   (основные     │    │   (кеш,         │    │   (фото,        │
│    данные)      │    │    очереди)     │    │    файлы)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Как обрабатываются данные

1. **Создание задачи** → Валидация DTO → Сохранение в БД → Уведомление оператору
2. **Выполнение задачи** → Загрузка фото → Валидация фото → Обновление инвентаря → Закрытие задачи
3. **Инкассация** → Фиксация суммы → Создание транзакции → Обновление баланса автомата

### Интеграции

| Сервис | Назначение | Протокол |
|--------|-----------|----------|
| Telegram Bot API | Уведомления, авторизация клиентов | HTTPS |
| SMTP сервер | Email уведомления | SMTP |
| MinIO / Cloudflare R2 | Хранение файлов | S3 API |
| Sentry | Мониторинг ошибок | HTTPS |
| Prometheus | Метрики | HTTP |

---

## 6. API / ЭНДПОИНТЫ

### Базовый URL: `/api/v1`

### Авторизация

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/auth/login` | Вход в систему (staff) |
| POST | `/auth/refresh` | Обновление токена |
| POST | `/auth/logout` | Выход из системы |
| POST | `/auth/2fa/setup` | Настройка 2FA |
| POST | `/auth/2fa/verify` | Верификация 2FA |
| POST | `/auth/password/reset` | Сброс пароля |

### Автоматы

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/machines` | Список автоматов |
| POST | `/machines` | Создать автомат |
| GET | `/machines/:id` | Получить автомат |
| PATCH | `/machines/:id` | Обновить автомат |
| DELETE | `/machines/:id` | Удалить автомат |
| GET | `/machines/:id/qr` | Получить QR-код |
| GET | `/machines/:id/access` | Список доступов |
| POST | `/machines/:id/access` | Назначить доступ |

### Задачи

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/tasks` | Список задач |
| POST | `/tasks` | Создать задачу |
| GET | `/tasks/:id` | Получить задачу |
| PATCH | `/tasks/:id` | Обновить задачу |
| POST | `/tasks/:id/assign` | Назначить исполнителя |
| POST | `/tasks/:id/start` | Начать выполнение |
| POST | `/tasks/:id/complete` | Завершить (с фото!) |
| POST | `/tasks/:id/reject` | Отклонить задачу |

### Инвентарь

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/inventory/warehouse` | Склад |
| GET | `/inventory/operator/:id` | У оператора |
| GET | `/inventory/machine/:id` | В автомате |
| POST | `/inventory/transfer` | Перемещение |
| POST | `/inventory/adjustment` | Корректировка |

### Клиентская платформа

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/client/auth` | Авторизация (Telegram) |
| GET | `/client/locations` | Публичные локации |
| GET | `/client/menu/:machineNumber` | Меню автомата |
| GET | `/client/loyalty` | Баланс баллов |
| POST | `/client/orders` | Создать заказ |

### Файлы

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/files/upload` | Загрузить файл |
| GET | `/files/:id` | Скачать файл |
| DELETE | `/files/:id` | Удалить файл |

### Полная документация API

Swagger UI доступен по адресу: `http://localhost:3000/api/docs`

---

## 7. БАЗА ДАННЫХ

### Общая статистика

- **107 сущностей** (entities)
- **62 миграции**
- **40+ индексов**

### Ключевые таблицы

#### Пользователи и авторизация

```sql
users                    -- Пользователи системы
├── id (uuid, PK)
├── email (unique)
├── password_hash
├── role (enum)
├── status (enum)
├── telegram_id
└── two_factor_secret (encrypted)

machine_access          -- Доступ к автоматам
├── id (uuid, PK)
├── machine_id (FK)
├── user_id (FK)
└── role (enum)
```

#### Автоматы

```sql
machines                -- Вендинговые автоматы
├── id (uuid, PK)
├── machine_number (unique)  -- Главный идентификатор!
├── name
├── status (enum)
├── location_id (FK)
├── settings (jsonb)
└── payment_methods (jsonb)
```

#### Задачи

```sql
tasks                   -- Задачи операторов
├── id (uuid, PK)
├── type (enum)
├── status (enum)
├── priority (enum)
├── machine_id (FK)
├── assigned_to_id (FK)
├── due_date
└── completed_at

task_items              -- Позиции в задаче (для refill)
├── task_id (FK)
├── nomenclature_id (FK)
├── quantity
└── actual_quantity
```

#### Инвентарь

```sql
warehouse_inventory     -- Складские остатки
├── nomenclature_id (FK)
├── quantity
└── reserved_quantity

operator_inventory      -- У оператора
├── user_id (FK)
├── nomenclature_id (FK)
└── quantity

machine_inventory       -- В автомате
├── machine_id (FK)
├── nomenclature_id (FK)
├── quantity
└── slot_number
```

#### Финансы

```sql
transactions           -- Финансовые операции
├── id (uuid, PK)
├── type (enum)
├── amount (decimal)
├── machine_id (FK)
├── task_id (FK)
└── category_id (FK)
```

### Связи между таблицами

```
users ─────────< machine_access >───────── machines
   │                                          │
   │                                          │
   └──────────< tasks >───────────────────────┘
                  │
                  ├──< task_items
                  ├──< task_comments
                  └──< files (photos)

machines ──────< machine_inventory >────── nomenclature
                                              │
                                              │
warehouse_inventory ──────────────────────────┘
operator_inventory ───────────────────────────┘
```

### Управление миграциями

```bash
# Сгенерировать миграцию после изменения entity
npm run migration:generate -- -n MigrationName

# Применить миграции
npm run migration:run

# Откатить последнюю миграцию
npm run migration:revert
```

---

## 8. КОНФИГУРАЦИЯ

### Переменные окружения Backend (.env)

```bash
# Основные
NODE_ENV=development
PORT=3000

# База данных
DATABASE_URL=postgresql://user:pass@localhost:5432/vendhub
# или отдельно:
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_DATABASE=vendhub

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-64-character-secret-key
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Шифрование
ENCRYPTION_KEY=32-byte-base64-encoded-key

# Telegram
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...

# S3 / MinIO
S3_ENDPOINT=http://localhost:9000
S3_BUCKET=vendhub
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin

# Frontend URL (для CORS)
FRONTEND_URL=http://localhost:3001

# Web Push
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...

# Мониторинг
SENTRY_DSN=https://...@sentry.io/...
```

### Переменные окружения Frontend (.env.local)

```bash
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
NEXT_PUBLIC_APP_NAME=VendHub Manager
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
```

### Docker Compose сервисы

```yaml
services:
  postgres:
    image: postgres:14-alpine
    ports: ["5432:5432"]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  minio:
    image: minio/minio:latest
    ports: ["9000:9000", "9001:9001"]

  backend:
    build: ./backend
    ports: ["3000:3000"]
    depends_on: [postgres, redis, minio]

  frontend:
    build: ./frontend
    ports: ["3001:3000"]
    depends_on: [backend]
```

---

## 9. КАК ЗАПУСТИТЬ

### Быстрый старт (Docker)

```bash
# 1. Клонировать репозиторий
git clone https://github.com/jamsmac/VHM24.git
cd VHM24

# 2. Скопировать конфигурацию
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

# 3. Запустить всё через Docker
docker-compose up -d

# 4. Выполнить миграции
cd backend
npm run migration:run

# 5. Создать суперадмина
npm run create-superadmin
```

### Локальная разработка

```bash
# Backend
cd backend
npm install
npm run start:dev          # http://localhost:3000
npm run start:debug        # С отладкой

# Frontend
cd frontend
npm install
npm run dev                # http://localhost:3001

# Mobile
cd mobile
npm install
npm run start              # Expo DevTools
npm run android            # Android эмулятор
npm run ios                # iOS симулятор
```

### Проверка работоспособности

```bash
# API документация
open http://localhost:3000/api/docs

# Health check
curl http://localhost:3000/api/health

# Очереди Bull
open http://localhost:3000/api/admin/queues
```

### Полезные команды

```bash
# Backend
npm run start:dev         # Запуск dev сервера
npm run build             # Сборка для production
npm run test              # Запуск тестов
npm run test:cov          # Тесты с покрытием
npm run lint              # Проверка кода
npm run format            # Форматирование кода
npm run migration:generate -- -n MigrationName
npm run migration:run
npm run migration:revert
npm run create-superadmin # Создание суперадмина

# Frontend
npm run dev               # Запуск dev сервера
npm run build             # Сборка для production
npm run start             # Запуск production сервера
npm run lint              # Проверка кода
npm run storybook         # Запуск Storybook

# Mobile
npm run start             # Запуск Expo
npm run android           # Запуск на Android
npm run ios               # Запуск на iOS
npm run test              # Запуск тестов
```

---

## 10. КАК РАБОТАТЬ С ПРОЕКТОМ

### Добавить новый модуль

```bash
# 1. Создать структуру
mkdir -p backend/src/modules/my-module/{dto,entities}

# 2. Создать файлы по шаблону из .claude/templates/backend/
touch backend/src/modules/my-module/my-module.{module,controller,service}.ts
touch backend/src/modules/my-module/entities/my-entity.entity.ts
touch backend/src/modules/my-module/dto/{create,update}-my-entity.dto.ts

# 3. Зарегистрировать в app.module.ts
# imports: [..., MyModule]

# 4. Создать миграцию
npm run migration:generate -- -n CreateMyEntityTable

# 5. Написать тесты
touch backend/src/modules/my-module/my-module.service.spec.ts
```

### Добавить эндпоинт

```typescript
// 1. Добавить метод в сервис
// my-module.service.ts
async myMethod(dto: MyDto): Promise<MyEntity> {
  // логика
}

// 2. Добавить эндпоинт в контроллер
// my-module.controller.ts
@Post('action')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'MANAGER')
async myAction(@Body() dto: MyDto) {
  return this.service.myMethod(dto);
}

// 3. Добавить тест
```

### Изменить схему БД

```bash
# 1. Изменить entity
# 2. Сгенерировать миграцию
npm run migration:generate -- -n AddFieldToMyEntity

# 3. Проверить сгенерированный файл
# 4. Запустить миграцию
npm run migration:run
```

### Типичные сценарии работы

1. **Баг в API** → Найти контроллер → Проверить сервис → Исправить → Написать тест
2. **Новая фича** → Создать/расширить модуль → Миграция (если нужно) → Тесты → PR
3. **UI баг** → Найти компонент в `frontend/src/components/` → Исправить → Storybook
4. **Добавить поле** → Entity → DTO → Миграция → Frontend type → UI

### Git workflow

```bash
# 1. Создать feature branch
git checkout -b feature/task-photo-validation

# 2. Реализовать функционал

# 3. Запустить все проверки
npm run lint
npm run type-check
npm run test
npm run build

# 4. Коммит по Conventional Commits
git commit -m "feat(tasks): add photo validation before completion

Implemented mandatory photo check for refill tasks.
Tasks cannot be completed without before/after photos.

Closes #123"

# 5. Push и создание PR
git push origin feature/task-photo-validation
```

---

## 11. ИЗВЕСТНЫЕ ОСОБЕННОСТИ

### ⚠️ Критически важно понимать

1. **НЕТ подключения к автоматам** — все данные вводятся вручную операторами
2. **Фото ОБЯЗАТЕЛЬНЫ** — задачи нельзя закрыть без фото "до" и "после"
3. **3 уровня инвентаря** — всегда обновлять все уровни при операциях
4. **machine_number** — главный идентификатор автомата, не UUID

### 🚧 Что нужно учитывать

- **Additive development** — только добавлять, не ломать существующее
- **Backward compatibility** — API не должен ломать клиентов
- **Photo validation** — всегда проверять наличие фото перед закрытием задач
- **Inventory sync** — при завершении refill/collection обновлять все уровни

### 📝 Технический долг (TODO)

- [ ] Полное покрытие тестами клиентской платформы
- [ ] Offline-first для мобильного приложения
- [ ] GraphQL subscriptions для real-time
- [ ] Полная локализация (i18n) на все языки
- [ ] Performance optimization для больших datasets

### 🐛 Известные ограничения

- WebSocket требует sticky sessions при масштабировании
- Большие Excel файлы (>10MB) требуют увеличения таймаута
- PDF генерация интенсивна по памяти — не запускать параллельно много

### 🔴 Красные флаги (чего делать НЕЛЬЗЯ)

1. Создавать функции прямого подключения к автоматам
2. Пропускать фото-валидацию при закрытии задач
3. Забывать обновлять инвентарь после задач
4. Использовать тип `any` вместо интерфейсов
5. Писать raw SQL запросы вместо TypeORM
6. Хардкодить секреты в код
7. Ломать обратную совместимость API
8. Модифицировать enum'ы несовместимым образом
9. Смешивать staff и client авторизацию

---

## Быстрые ссылки

| Ресурс | URL |
|--------|-----|
| API Docs | `http://localhost:3000/api/docs` |
| Bull Dashboard | `http://localhost:3000/api/admin/queues` |
| Storybook | `npm run storybook` в frontend |
| MinIO Console | `http://localhost:9001` |
| Prometheus | `http://localhost:9090` |
| Grafana | `http://localhost:3003` |

---

## Ключевые файлы для изучения

| Назначение | Путь |
|------------|------|
| Главный гайд для AI | `/CLAUDE.md` |
| Правила разработки | `/.claude/rules.md` |
| Main API | `/backend/src/main.ts` |
| App Module | `/backend/src/app.module.ts` |
| Base Entity | `/backend/src/common/entities/base.entity.ts` |
| Environment | `/backend/.env.example` |
| Docker Compose | `/docker-compose.yml` |
| Frontend Root | `/frontend/src/app/layout.tsx` |
| Frontend Auth | `/frontend/src/hooks/useAuth.ts` |
| Mobile Navigator | `/mobile/src/navigation/AppNavigator.tsx` |
| Migrations | `/backend/src/database/migrations/` |

---

**Версия документа**: 1.0.0
**Дата создания**: 2025-12-19
**Автор**: Claude Code
**Проект**: VendHub Manager (VHM24)
