# Промпт для составления полного описания проекта VendHub Manager

## Назначение

Этот промпт предназначен для генерации полной и детальной документации проекта VendHub Manager - системы управления вендинговыми автоматами.

---

## ПРОМПТ ДЛЯ ИСПОЛЬЗОВАНИЯ

Скопируйте текст ниже и используйте его с AI-ассистентом для генерации документации:

---

```
Создай полное и детальное описание проекта VendHub Manager. Документация должна быть структурирована следующим образом:

## 1. ОБЩЕЕ ОПИСАНИЕ ПРОЕКТА

### 1.1 Назначение системы
- Опиши основную цель и задачи проекта
- Перечисли ключевые бизнес-процессы, которые автоматизирует система
- Укажи целевую аудиторию (операторы, менеджеры, техники, администраторы)

### 1.2 Технологический стек
Для каждой части проекта укажи:
- **Backend**: NestJS, TypeORM, PostgreSQL - версии и ключевые библиотеки
- **Frontend**: Next.js, React - версии и UI-библиотеки
- **Mobile**: React Native/Expo - версии и зависимости
- **Инфраструктура**: Docker, Railway, CI/CD

### 1.3 Архитектурные принципы
- Manual Operations Architecture (без прямого подключения к автоматам)
- Photo validation для задач
- 3-уровневая система инвентаря
- RBAC (Role-Based Access Control)

---

## 2. СТРУКТУРА ПРОЕКТА

### 2.1 Корневая директория
Опиши назначение каждого файла и папки в корне:
```
/
├── backend/           # Серверная часть (NestJS)
├── frontend/          # Веб-приложение (Next.js)
├── mobile/            # Мобильное приложение (Expo)
├── docs/              # Документация
├── monitoring/        # Prometheus/Grafana конфиги
├── scripts/           # Скрипты автоматизации
├── .claude/           # Промпты и правила для AI
├── docker-compose.*.yml  # Конфигурации Docker
└── [конфиг файлы]     # package.json, tsconfig и т.д.
```

### 2.2 Backend структура (/backend/src/)
Для КАЖДОГО модуля из /backend/src/modules/ опиши:
- Название и назначение модуля
- Какие сущности (entities) содержит
- Какие API endpoints предоставляет
- С какими другими модулями взаимодействует

Модули для описания:
- auth (аутентификация, JWT, refresh tokens)
- users (управление пользователями)
- machines (управление автоматами)
- tasks (задачи с фото-валидацией)
- inventory (3-уровневый инвентарь)
- transactions (финансовые операции)
- notifications (уведомления)
- telegram (интеграция с Telegram)
- complaints (жалобы клиентов)
- incidents (инциденты)
- reports (отчеты и PDF)
- sales-import (импорт продаж)
- web-push (push-уведомления)
- [и все остальные модули]

### 2.3 Frontend структура (/frontend/src/)
Опиши:
- /app/ - роутинг Next.js App Router
- /components/ - переиспользуемые компоненты
- /hooks/ - кастомные React hooks
- /lib/ - утилиты и API клиенты
- /providers/ - контексты и провайдеры
- /types/ - TypeScript типы

### 2.4 Mobile структура (/mobile/src/)
Опиши:
- Навигационная структура
- Экраны и компоненты
- Сервисы и утилиты

---

## 3. БАЗА ДАННЫХ

### 3.1 Схема базы данных
Для каждой таблицы укажи:
- Название и назначение
- Ключевые поля
- Связи с другими таблицами (FK)
- Индексы

Таблицы для описания:
- users, machines, locations
- tasks, inventory_*, transactions
- incidents, complaints, notifications
- telegram_*, nomenclature, recipes
- dictionaries, files

### 3.2 Миграции
- Где находятся
- Как запускать
- Как создавать новые

---

## 4. API ENDPOINTS

### 4.1 Аутентификация
```
POST /auth/login
POST /auth/register
POST /auth/refresh
POST /auth/logout
POST /auth/forgot-password
POST /auth/reset-password
```

### 4.2 Пользователи
```
GET    /users
GET    /users/:id
POST   /users
PATCH  /users/:id
DELETE /users/:id
GET    /users/me
```

### 4.3 Автоматы
```
GET    /machines
GET    /machines/:id
POST   /machines
PATCH  /machines/:id
DELETE /machines/:id
GET    /machines/:id/qr-code
POST   /machines/:id/ping
GET    /machines/connectivity/status
```

[Продолжи для всех модулей]

---

## 5. БИЗНЕС-ЛОГИКА

### 5.1 Процесс работы с задачами
1. Создание задачи (менеджером)
2. Назначение оператору
3. Выполнение с фото "до" и "после"
4. Автоматическое обновление инвентаря
5. Нотификации о статусе

### 5.2 3-уровневый инвентарь
1. Warehouse → Operator (выдача)
2. Operator → Machine (загрузка)
3. Machine → Transaction (продажа)

### 5.3 Система жалоб через QR
1. Клиент сканирует QR на автомате
2. Открывается публичная форма
3. Жалоба сохраняется с привязкой к автомату
4. Менеджер получает уведомление

### 5.4 Connectivity Monitoring
- Автоматы отправляют ping
- Cron проверяет offline автоматы
- Создаются инциденты MACHINE_OFFLINE

---

## 6. ИНТЕГРАЦИИ

### 6.1 Telegram Bot
- Линковка аккаунтов через QR/код
- Команды: /tasks, /machines, /alerts, /stats
- Настраиваемые уведомления

### 6.2 Web Push (VAPID)
- Подписка браузера
- Push уведомления о задачах/инцидентах

### 6.3 Email
- Сброс пароля
- Уведомления (опционально)

---

## 7. БЕЗОПАСНОСТЬ

### 7.1 Аутентификация
- JWT access token (15 мин)
- Refresh token (7 дней)
- bcrypt для паролей (12 rounds)

### 7.2 Авторизация (RBAC)
- ADMIN - полный доступ
- MANAGER - управление операциями
- OPERATOR - выполнение задач
- TECHNICIAN - техобслуживание

### 7.3 Защита API
- Rate limiting
- Helmet headers
- CORS whitelist
- Input validation (class-validator)

---

## 8. РАЗВЕРТЫВАНИЕ

### 8.1 Локальная разработка
```bash
# Backend
cd backend && npm install && npm run start:dev

# Frontend
cd frontend && npm install && npm run dev

# Mobile
cd mobile && npm install && npx expo start
```

### 8.2 Docker
```bash
docker-compose up -d                    # Development
docker-compose -f docker-compose.prod.yml up -d  # Production
```

### 8.3 Production (Railway)
- Настройка через railway.toml
- Переменные окружения
- Автодеплой из GitHub

---

## 9. ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ

### Backend (.env)
```
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=***
DATABASE_NAME=vendhub

# JWT
JWT_SECRET=***
JWT_REFRESH_SECRET=***

# Telegram
TELEGRAM_BOT_TOKEN=***

# VAPID
VAPID_PUBLIC_KEY=***
VAPID_PRIVATE_KEY=***
VAPID_EMAIL=admin@example.com

# Optional
SENTRY_DSN=***
AWS_S3_BUCKET=***
```

---

## 10. ТЕСТИРОВАНИЕ

### 10.1 Unit тесты
```bash
npm run test           # Запуск тестов
npm run test:cov       # С покрытием
npm run test:watch     # Watch mode
```

### 10.2 E2E тесты
```bash
npm run test:e2e
```

---

## 11. МОНИТОРИНГ

### 11.1 Health Check
- GET /health - статус приложения

### 11.2 Prometheus метрики
- HTTP latency
- Request counts
- Database performance
- Business metrics

### 11.3 Grafana дашборды
- Security Metrics
- API Performance
- Business Metrics

---

## 12. КОМАНДЫ И СКРИПТЫ

### Backend
```bash
npm run start:dev          # Development
npm run build              # Build
npm run start:prod         # Production
npm run migration:run      # Run migrations
npm run migration:generate # Create migration
npm run lint               # Linting
npm run format             # Prettier
```

### Frontend
```bash
npm run dev                # Development
npm run build              # Production build
npm run start              # Start production
npm run lint               # Linting
npm run storybook          # Storybook
```

### Mobile
```bash
npx expo start             # Development
npx expo build             # Build
npm run test               # Tests
```

---

## ФОРМАТ ВЫВОДА

Создай документ в формате Markdown со следующей структурой:
1. Заголовки уровня ## для разделов
2. Заголовки уровня ### для подразделов
3. Блоки кода с подсветкой синтаксиса
4. Таблицы для структурированных данных
5. Списки для перечислений
6. Примечания в блоках > для важной информации

Документация должна быть:
- На русском языке
- Максимально детальной
- С конкретными примерами кода
- С указанием путей к файлам
- С описанием всех функций и методов
```

---

## ДОПОЛНИТЕЛЬНЫЕ ПРОМПТЫ

### Промпт для анализа конкретного модуля

```
Проанализируй модуль [ИМЯ_МОДУЛЯ] в проекте VendHub Manager.

Для модуля опиши:
1. Расположение файлов и структура папок
2. Entity (сущности) - все поля с типами
3. DTO (Data Transfer Objects) - входные/выходные данные
4. Controller - все endpoints с методами
5. Service - бизнес-логика и методы
6. Зависимости от других модулей
7. Примеры использования API

Формат: детальный Markdown с примерами кода
```

### Промпт для генерации API документации

```
Создай полную документацию API для проекта VendHub Manager.

Для каждого endpoint укажи:
- HTTP метод и URL
- Описание назначения
- Требуемая авторизация (роли)
- Request body (если есть) с примером
- Response body с примером
- Возможные ошибки (status codes)
- cURL пример запроса

Группировка по модулям. Формат: OpenAPI-подобный Markdown.
```

### Промпт для документации базы данных

```
Создай полную схему базы данных проекта VendHub Manager.

Для каждой таблицы:
1. Название и описание
2. Все колонки с типами данных
3. Primary Key и Foreign Keys
4. Индексы
5. Связи с другими таблицами (ERD описание)
6. Constraints и default values

Добавь ER-диаграмму в формате Mermaid.
```

---

## ИСПОЛЬЗОВАНИЕ

1. Скопируйте основной промпт из раздела "ПРОМПТ ДЛЯ ИСПОЛЬЗОВАНИЯ"
2. Вставьте его в чат с AI-ассистентом (Claude, ChatGPT и др.)
3. AI проанализирует структуру проекта и создаст документацию
4. Используйте дополнительные промпты для детализации конкретных частей

---

## ПРИМЕЧАНИЯ

- Промпт оптимизирован для проекта VendHub Manager
- Для других проектов адаптируйте структуру модулей и технологии
- Рекомендуется запускать промпт с доступом к исходному коду проекта
- Для максимальной точности используйте AI с возможностью чтения файлов
