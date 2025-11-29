# VendHub Manager - Setup Guide

> **Дата**: 2025-11-19
> **Версия**: 1.0.0
> **Статус**: Production Ready

---

## 📋 Оглавление

1. [Первоначальная настройка](#первоначальная-настройка)
2. [Запуск RBAC Seed](#запуск-rbac-seed)
3. [Создание первого SuperAdmin](#создание-первого-superadmin)
4. [Настройка Telegram Bot](#настройка-telegram-bot)
5. [Проверка установки](#проверка-установки)

---

## 1. Первоначальная настройка

### 1.1. Клонирование репозитория

```bash
git clone <repository-url>
cd VendHub
```

### 1.2. Backend настройка

```bash
cd backend

# Установка зависимостей
npm install

# Создание .env файла из шаблона
cp .env.example .env
```

### 1.3. Настройка .env

Откройте `backend/.env` и настройте следующие критические параметры:

```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=vendhub
DATABASE_PASSWORD=<YOUR_SECURE_PASSWORD>
DATABASE_NAME=vendhub_db

# JWT (ВАЖНО: сгенерируйте безопасный ключ)
JWT_SECRET=<GENERATE_USING_COMMAND_BELOW>
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# 2FA Encryption (КРИТИЧНО: сгенерируйте 32-байтовый ключ)
ENCRYPTION_KEY=<GENERATE_USING_COMMAND_BELOW>

# Telegram Bot
TELEGRAM_BOT_TOKEN=<YOUR_BOT_TOKEN_FROM_BOTFATHER>

# Frontend URL
FRONTEND_URL=http://localhost:3001
```

**Генерация безопасных ключей**:

```bash
# Для JWT_SECRET (64 байта)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Для ENCRYPTION_KEY (32 байта)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 1.4. Запуск базы данных

Если используете Docker:

```bash
docker-compose up -d postgres redis minio
```

Или настройте PostgreSQL вручную.

### 1.5. Запуск миграций

```bash
# Выполнить все миграции
npm run migration:run
```

Это создаст все необходимые таблицы:
- `users` - пользователи
- `roles` - роли RBAC
- `permissions` - права доступа
- `user_roles` - связь many-to-many
- `role_permissions` - связь many-to-many
- `access_requests` - заявки на доступ
- `audit_logs` - журнал аудита
- `password_reset_tokens` - токены сброса пароля
- `user_sessions` - активные сессии

---

## 2. Запуск RBAC Seed

**ВАЖНО**: Выполните этот шаг ПЕРЕД созданием SuperAdmin!

```bash
cd backend
npm run seed
```

Это создаст:

### 2.1. Роли (7 штук)

1. **SuperAdmin** - Полный доступ ко всей системе
2. **Admin** - Управление пользователями, назначение ролей (кроме SuperAdmin)
3. **Manager** - Управление операциями, задачами, инвентарем
4. **Operator** - Выполнение задач (пополнение, инкассация)
5. **Technician** - Обслуживание оборудования
6. **Collector** - Инкассация
7. **Viewer** - Только просмотр

### 2.2. Permissions (90+ прав)

По ресурсам:
- `users:*` - управление пользователями
- `machines:*` - управление автоматами
- `tasks:*` - управление задачами
- `inventory:*` - управление инвентарем
- `transactions:*` - управление транзакциями
- `incidents:*` - управление инцидентами
- `complaints:*` - управление жалобами
- `reports:*` - отчеты
- `analytics:*` - аналитика
- `access_requests:*` - заявки на доступ
- `audit_logs:*` - журнал аудита
- `roles:*` - управление ролями
- `locations:*` - управление локациями
- `equipment:*` - управление оборудованием
- `nomenclature:*` - управление номенклатурой

**Вывод**:
```
🌱 Запуск seeding процесса...

✅ Подключение к БД установлено

🔐 Seeding RBAC (Roles & Permissions)...
   📝 Создание permissions...
   ✅ Создано 95 permissions
   👥 Создание roles...
   ✅ SuperAdmin: 95 permissions
   ✅ Admin: 75 permissions
   ✅ Manager: 40 permissions
   ✅ Operator: 20 permissions
   ✅ Technician: 18 permissions
   ✅ Collector: 12 permissions
   ✅ Viewer: 25 permissions
   ✅ Создано 7 roles
✅ RBAC seeding завершен

🎉 Seeding успешно завершен!
```

---

## 3. Создание первого SuperAdmin

### 3.1. Интерактивный режим

```bash
cd backend
npm run create-superadmin
```

Вы увидите:
```
═══════════════════════════════════════════════════════════
   VendHub Manager - Create SuperAdmin User
═══════════════════════════════════════════════════════════

📝 Введите данные SuperAdmin пользователя:

Email: admin@vendhub.ru
Password: <secure-password>
Full Name: Super Administrator
Telegram User ID (опционально, Enter для пропуска): 42283329
Telegram Username (опционально, Enter для пропуска): Jamshiddin
```

### 3.2. С параметрами командной строки

```bash
npm run create-superadmin -- --email admin@vendhub.ru --password "SecurePass123!" --name "Super Administrator"
```

С Telegram:
```bash
npm run create-superadmin -- \
  --email admin@vendhub.ru \
  --password "SecurePass123!" \
  --name "Super Administrator" \
  --telegram-id 42283329 \
  --telegram-username Jamshiddin
```

### 3.3. Успешный результат

```
✅ SuperAdmin успешно создан!

📋 Данные пользователя:
   Email:             admin@vendhub.ru
   Full Name:         Super Administrator
   Role:              SuperAdmin
   Status:            active
   Telegram ID:       42283329
   Telegram Username: @Jamshiddin
   User ID:           <uuid>

🔐 Вход в систему:
   URL:      http://localhost:3001/login
   Email:    admin@vendhub.ru
   Password: [указанный при создании]

✨ SuperAdmin может:
   - Управлять всеми пользователями
   - Назначать любые роли (включая Admin)
   - Просматривать audit logs
   - Полный доступ ко всем функциям системы
```

---

## 4. Настройка Telegram Bot

### 4.1. Получение токена

1. Откройте Telegram и найдите @BotFather
2. Отправьте команду `/newbot`
3. Следуйте инструкциям для создания бота
4. Скопируйте токен (формат: `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`)

### 4.2. Настройка в .env

```env
TELEGRAM_BOT_TOKEN=8201265622:AAG3NMF7J2RP49nc4y6rnEG2A-0iaAnW4dA
```

### 4.3. Запуск Telegram бота

Telegram bot запускается автоматически при старте backend:

```bash
cd backend
npm run start:dev
```

Проверьте логи:
```
[Telegram Bot] ✅ Telegram bot запущен: @vhm24bot
[Telegram Bot] 🔗 Готов принимать команды
```

### 4.4. Тестирование бота

1. Найдите вашего бота в Telegram: `@vhm24bot`
2. Отправьте команду `/start`
3. Бот создаст AccessRequest в системе
4. SuperAdmin увидит заявку в `/access-requests`
5. SuperAdmin одобрит заявку → создастся User
6. Пользователь получит уведомление в Telegram

---

## 5. Проверка установки

### 5.1. Запуск backend

```bash
cd backend
npm run start:dev
```

**Ожидаемый вывод**:
```
[Nest] INFO  Application is running on: http://localhost:3000
[Nest] INFO  Swagger documentation: http://localhost:3000/api/docs
[Telegram Bot] ✅ Telegram bot запущен: @vhm24bot
```

### 5.2. Проверка API

Откройте браузер: `http://localhost:3000/api/docs`

Вы увидите Swagger UI с доступными endpoints:
- `POST /auth/login` - вход в систему
- `POST /auth/register` - регистрация
- `POST /auth/refresh` - обновление токенов
- `POST /auth/logout` - выход
- `POST /auth/2fa/setup` - настройка 2FA
- `GET /users` - список пользователей
- `GET /access-requests` - заявки на доступ
- `GET /audit-logs` - журнал аудита
- и многие другие...

### 5.3. Запуск frontend

```bash
cd frontend
npm install
npm run dev
```

Откройте: `http://localhost:3001`

### 5.4. Вход в систему

1. Перейдите на `http://localhost:3001/login`
2. Введите данные SuperAdmin:
   - Email: `admin@vendhub.ru`
   - Password: `<ваш пароль>`
3. Нажмите "Войти"
4. Вы будете перенаправлены на Dashboard

### 5.5. Проверка функционала

**Admin Panel**:
- ✅ Пользователи: `/users`
- ✅ Заявки на доступ: `/access-requests`
- ✅ Audit Logs: `/security/audit-logs`
- ✅ Сессии: `/security/sessions`
- ✅ Автоматы: `/machines`
- ✅ Задачи: `/tasks`
- ✅ Инвентарь: `/inventory`

---

## 6. Дополнительные настройки

### 6.1. Brute-Force Protection

В `.env`:
```env
# Максимум попыток входа (по умолчанию: 5)
BRUTE_FORCE_MAX_ATTEMPTS=5

# Длительность блокировки в минутах (по умолчанию: 15)
BRUTE_FORCE_LOCKOUT_MINUTES=15
```

### 6.2. Password Policy

В `.env`:
```env
PASSWORD_MIN_LENGTH=8
PASSWORD_MAX_LENGTH=128
PASSWORD_REQUIRE_UPPERCASE=true
PASSWORD_REQUIRE_LOWERCASE=true
PASSWORD_REQUIRE_DIGIT=true
PASSWORD_REQUIRE_SPECIAL_CHAR=true
PASSWORD_SPECIAL_CHARS=@$!%*?&#
```

### 6.3. Session Management

В `.env`:
```env
# Максимум сессий на пользователя (по умолчанию: 5)
MAX_SESSIONS_PER_USER=5

# Срок действия сессии в днях (по умолчанию: 7)
SESSION_EXPIRATION_DAYS=7
```

---

## 7. Запуск тестов

### 7.1. Unit тесты

```bash
cd backend
npm run test
```

Ожидается: **50+ тестов пройдено**

### 7.2. E2E тесты

```bash
npm run test:e2e
```

Ожидается: **20+ тестов пройдено**

### 7.3. Coverage

```bash
npm run test:cov
```

---

## 8. Производственное развертывание

### 8.1. Environment Variables (Production)

```env
NODE_ENV=production
PORT=3000

# Database (используйте управляемую БД)
DATABASE_HOST=<production-db-host>
DATABASE_PORT=5432
DATABASE_USER=vendhub_prod
DATABASE_PASSWORD=<SECURE_PRODUCTION_PASSWORD>
DATABASE_NAME=vendhub_production

# JWT (КРИТИЧНО: уникальные ключи!)
JWT_SECRET=<UNIQUE_PRODUCTION_JWT_SECRET>
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# 2FA Encryption (КРИТИЧНО!)
ENCRYPTION_KEY=<UNIQUE_PRODUCTION_ENCRYPTION_KEY>

# Telegram Bot (production bot)
TELEGRAM_BOT_TOKEN=<PRODUCTION_BOT_TOKEN>

# Email (настройте SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<your-email>
SMTP_PASSWORD=<app-password>
SMTP_FROM_EMAIL=noreply@vendhub.com

# S3/R2 Storage (Cloudflare R2 рекомендуется)
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_ACCESS_KEY=<r2-access-key>
S3_SECRET_KEY=<r2-secret-key>
S3_BUCKET=vendhub-prod
S3_REGION=auto

# Frontend URL
FRONTEND_URL=https://vendhub.your-domain.com
```

### 8.2. Запуск в production

```bash
cd backend

# Build
npm run build

# Run migrations
npm run migration:run

# Seed RBAC
npm run seed

# Create SuperAdmin
npm run create-superadmin -- \
  --email admin@your-domain.com \
  --password "<secure-password>" \
  --name "Production Admin"

# Start production server
npm run start:prod
```

### 8.3. Docker (рекомендуется)

```bash
docker-compose -f docker-compose.prod.yml up -d
```

---

## 9. Troubleshooting

### 9.1. Миграции не применяются

```bash
# Проверить статус миграций
npm run migration:show

# Откатить последнюю миграцию
npm run migration:revert

# Применить снова
npm run migration:run
```

### 9.2. Seed уже выполнен

Seed скрипт проверяет существование ролей. Если роли уже созданы, он пропустит создание.

Для пересоздания:
```sql
-- Удалить все роли и permissions (ОСТОРОЖНО!)
DELETE FROM role_permissions;
DELETE FROM user_roles;
DELETE FROM permissions;
DELETE FROM roles;
```

Затем:
```bash
npm run seed
```

### 9.3. Telegram bot не запускается

Проверьте:
1. `TELEGRAM_BOT_TOKEN` в `.env` корректный
2. Логи backend на наличие ошибок
3. Интернет-соединение
4. Токен валиден (не отозван в BotFather)

### 9.4. 2FA не работает

Проверьте:
1. `ENCRYPTION_KEY` установлен в `.env`
2. Ключ - 64 hex символа (32 байта)
3. QR код сканируется корректно в Google Authenticator/Authy

---

## 10. Контакты

**Документация**:
- Анализ модуля: `AUTH_MODULE_ANALYSIS.md`
- Статус реализации: `AUTH_IMPLEMENTATION_STATUS.md`
- Правила разработки: `.claude/rules.md`
- Архитектура: `CLAUDE.md`

**API**:
- Swagger: `http://localhost:3000/api/docs`

**Поддержка**:
- GitHub Issues: `<repository-url>/issues`

---

**Последнее обновление**: 2025-11-19
**Версия**: 1.0.0
**Статус**: Production Ready ✅
