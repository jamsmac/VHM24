# 🚀 Быстрый старт: Railway + Supabase

**Дата:** 2025-01-27  
**Проект:** VHM24

---

## ⚡ Быстрая настройка (5 минут)

### 1. Установите Railway CLI

```bash
npm install -g @railway/cli
```

### 2. Авторизуйтесь в Railway

```bash
export RAILWAY_TOKEN=8d4d83d1-df06-48f1-9ed8-5bf24cc82b4a
railway login
```

### 3. Запустите скрипт настройки

```bash
cd /Users/js/Мой\ диск/3.VendHub/VHM24/VHM24-repo
./scripts/setup-railway.sh
```

Скрипт автоматически:
- ✅ Установит Railway CLI (если нужно)
- ✅ Авторизуется в Railway
- ✅ Подключит проект
- ✅ Настроит переменные окружения для Supabase
- ✅ Сгенерирует JWT секреты

### 4. Добавьте оставшиеся переменные в Railway Dashboard

После запуска скрипта, добавьте вручную:

```env
# S3 Storage (MinIO или Cloudflare R2)
S3_ENDPOINT=https://your-endpoint.com
S3_BUCKET=vendhub
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key

# Frontend URL
FRONTEND_URL=https://your-domain.com

# Telegram Bot (если используется)
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_ADMIN_ID=42283329
TELEGRAM_ADMIN_USERNAME=Jamshiddin
SUPER_ADMIN_TELEGRAM_ID=42283329
SUPER_ADMIN_USERNAME=Jamshiddin
```

### 4.5. Создайте Super Admin пользователя

```bash
cd backend
railway run npm run create-superadmin -- \
  --email admin@vendhub.com \
  --password YourSecurePassword123! \
  --name "Jamshiddin" \
  --telegram-id 42283329 \
  --telegram-username Jamshiddin
```

### 5. Запустите миграции

```bash
cd backend
railway run npm run migration:run
```

### 6. Деплой

```bash
railway up
```

Или просто сделайте git push:
```bash
git push origin main
```

---

## 📋 Учетные данные

### Railway
- **Token:** `8d4d83d1-df06-48f1-9ed8-5bf24cc82b4a`
- **Project:** vhm24

### Supabase
- **Host:** `db.ivndncmwohshbvpjbxcx.supabase.co`
- **Database:** `postgres`
- **User:** `postgres`
- **Password:** `ucfbBVjbXhhKSrLi`
- **Connection String:** 
  ```
  postgresql://postgres:ucfbBVjbXhhKSrLi@db.ivndncmwohshbvpjbxcx.supabase.co:5432/postgres
  ```

### Super Admin
- **Telegram Username:** @Jamshiddin
- **Telegram ID:** 42283329

---

## 🔍 Проверка подключения

### Тест подключения к Supabase

```bash
cd backend
psql "postgresql://postgres:ucfbBVjbXhhKSrLi@db.ivndncmwohshbvpjbxcx.supabase.co:5432/postgres" -c "SELECT 1;"
```

### Проверка Railway проекта

```bash
railway status
railway logs
```

---

## 📚 Дополнительная документация

- Полная инструкция: `RAILWAY_SUPABASE_SETUP.md`
- Super Admin настройка: `SUPER_ADMIN_SETUP.md`
- Отчет об исправлениях: `DEPLOYMENT_FIXES_REPORT.md`
- Roadmap: `AUDIT_ROADMAP_TO_PRODUCTION.md`

---

## ⚠️ Важно

1. **НЕ коммитьте** секретные данные в git
2. Используйте Railway Secrets для хранения паролей
3. Регулярно ротируйте токены и пароли

---

**Готово!** Ваш проект настроен для деплоя на Railway с Supabase базой данных.
