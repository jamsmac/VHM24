# Supabase & Railway Connections Setup - Complete

**Дата:** 2025-01-27  
**Статус:** ✅ Готово к использованию

---

## ✅ Настроенные соединения

### 1. Supabase Database
- **Host:** `db.ivndncmwohshbvpjbxcx.supabase.co`
- **Port:** `5432`
- **Database:** `postgres`
- **User:** `postgres`
- **Password:** `ucfbBVjbXhhKSrLi`
- **SSL:** Enabled (required for Supabase)

### 2. Railway
- **Token:** `8d4d83d1-df06-48f1-9ed8-5bf24cc82b4a`
- **Auto-deploy:** Enabled
- **Migrations:** Auto-run on deploy

---

## 🚀 Быстрый старт

### Вариант 1: Автоматическая настройка (рекомендуется)

```bash
cd backend
./scripts/setup-connections.sh
```

Этот скрипт:
- ✅ Проверит подключение к Supabase
- ✅ Установит Railway CLI
- ✅ Авторизуется в Railway
- ✅ Настроит переменные окружения
- ✅ Создаст .env.production
- ✅ Проверит подключение для миграций

### Вариант 2: Ручная настройка

#### 1. Настройте переменные окружения

```bash
cd backend

# Создайте .env.production
cat > .env.production << EOF
NODE_ENV=production
DATABASE_HOST=db.ivndncmwohshbvpjbxcx.supabase.co
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=ucfbBVjbXhhKSrLi
DATABASE_NAME=postgres
DATABASE_SSL=true
EOF
```

#### 2. Проверьте подключение

```bash
node scripts/test-supabase-connection.js
```

#### 3. Примените миграции

```bash
./scripts/apply-migrations.sh
```

---

## 📋 Созданные скрипты

### 1. `setup-connections.sh`
Полная настройка соединений с Supabase и Railway.

**Использование:**
```bash
cd backend
./scripts/setup-connections.sh
```

### 2. `apply-migrations.sh`
Применение миграций к базе данных.

**Использование:**
```bash
cd backend
./scripts/apply-migrations.sh
```

### 3. `railway-deploy.sh`
Деплой на Railway с автоматическим применением миграций.

**Использование:**
```bash
cd backend
./scripts/railway-deploy.sh
```

### 4. `test-supabase-connection.js`
Проверка подключения к Supabase.

**Использование:**
```bash
cd backend
node scripts/test-supabase-connection.js
```

---

## 🔧 Railway Configuration

### Автоматическое применение миграций

Railway настроен для автоматического применения миграций при деплое:

**railway.json:**
```json
{
  "deploy": {
    "startCommand": "cd backend && npm run migration:run && npm run start:prod"
  }
}
```

**backend/railway.json:**
```json
{
  "deploy": {
    "startCommand": "npm run migration:run && node dist/main.js"
  }
}
```

### Переменные окружения в Railway

Скрипт `setup-connections.sh` автоматически установит:
- ✅ DATABASE_HOST
- ✅ DATABASE_PORT
- ✅ DATABASE_USER
- ✅ DATABASE_PASSWORD
- ✅ DATABASE_NAME
- ✅ DATABASE_SSL
- ✅ DATABASE_URL (полный connection string)
- ✅ JWT_SECRET
- ✅ JWT_REFRESH_SECRET
- ✅ TELEGRAM_ADMIN_ID
- ✅ TELEGRAM_ADMIN_USERNAME
- ✅ NODE_ENV
- ✅ PORT

---

## 🗄️ Миграции

### Применение миграций локально

```bash
cd backend
npm run migration:run
```

### Применение миграций на Railway

```bash
# Через Railway CLI
railway run npm run migration:run

# Или автоматически при деплое
railway up
```

### Проверка статуса миграций

```sql
-- В Supabase SQL Editor
SELECT name, timestamp 
FROM migrations 
ORDER BY timestamp DESC 
LIMIT 10;
```

---

## ✅ Проверка работоспособности

### 1. Проверка подключения к Supabase

```bash
cd backend
node scripts/test-supabase-connection.js
```

**Ожидаемый результат:**
```
✅ Connected successfully!
📊 PostgreSQL version: PostgreSQL 15.x
📋 Tables in database: XX
```

### 2. Проверка Railway

```bash
railway status
railway logs
```

### 3. Проверка миграций

```bash
cd backend
npm run migration:run
```

---

## 🔍 Troubleshooting

### Проблема: Не удается подключиться к Supabase

**Решение:**
1. Проверьте, что `DATABASE_SSL=true`
2. Убедитесь, что пароль правильный: `ucfbBVjbXhhKSrLi`
3. Проверьте firewall настройки Supabase
4. Используйте полный `DATABASE_URL` с `?sslmode=require`

### Проблема: Railway не применяет миграции

**Решение:**
1. Проверьте переменные окружения в Railway Dashboard
2. Убедитесь, что `DATABASE_SSL=true`
3. Проверьте логи: `railway logs`
4. Запустите миграции вручную: `railway run npm run migration:run`

### Проблема: Миграции не компилируются

**Решение:**
1. Убедитесь, что TypeScript установлен: `npm install`
2. Проверьте синтаксис миграций
3. Запустите компиляцию отдельно: `npm run migration:compile`

---

## 📝 Следующие шаги

После настройки соединений:

1. **Примените миграции:**
   ```bash
   cd backend
   ./scripts/apply-migrations.sh
   ```

2. **Создайте Super Admin:**
   ```bash
   npm run create-superadmin -- \
     --email admin@vendhub.com \
     --password YourSecurePassword123! \
     --name "Jamshiddin" \
     --telegram-id 42283329 \
     --telegram-username Jamshiddin
   ```

3. **Деплой на Railway:**
   ```bash
   ./scripts/railway-deploy.sh
   ```

---

## 📚 Дополнительная документация

- Railway настройка: `RAILWAY_SUPABASE_SETUP.md`
- Super Admin: `SUPER_ADMIN_SETUP.md`
- Database cleanup: `DATABASE_CLEANUP_COMPLETE.md`
- Deployment fixes: `DEPLOYMENT_FIXES_REPORT.md`

---

**✅ Все соединения настроены и готовы к работе!**





