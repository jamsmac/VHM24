# 🚀 Quick Start: Supabase & Railway Connections

**Дата:** 2025-01-27

---

## ⚡ Быстрая настройка (1 команда)

```bash
cd backend
./scripts/setup-connections.sh
```

Этот скрипт автоматически:
- ✅ Проверит подключение к Supabase
- ✅ Установит Railway CLI
- ✅ Настроит все переменные окружения
- ✅ Создаст .env.production
- ✅ Проверит готовность к миграциям

---

## 📋 Что настроено

### Supabase
- **Host:** `db.ivndncmwohshbvpjbxcx.supabase.co`
- **Database:** `postgres`
- **User:** `postgres`
- **Password:** `ucfbBVjbXhhKSrLi`
- **SSL:** Enabled ✅

### Railway
- **Token:** `8d4d83d1-df06-48f1-9ed8-5bf24cc82b4a`
- **Auto-migrations:** Enabled ✅
- **Health check:** `/health/live` ✅

---

## 🎯 Следующие шаги

### 1. Примените миграции

```bash
cd backend
./scripts/apply-migrations.sh
```

### 2. Создайте Super Admin

```bash
npm run create-superadmin -- \
  --email admin@vendhub.com \
  --password YourSecurePassword123! \
  --name "Jamshiddin" \
  --telegram-id 42283329 \
  --telegram-username Jamshiddin
```

### 3. Деплой на Railway

```bash
./scripts/railway-deploy.sh
```

Или просто:
```bash
railway up
```

---

## ✅ Проверка

### Проверка подключения к Supabase

```bash
cd backend
node scripts/test-supabase-connection.js
```

### Проверка Railway

```bash
railway status
railway logs
```

---

## 📚 Документация

- Полная инструкция: `CONNECTIONS_SETUP_COMPLETE.md`
- Railway настройка: `RAILWAY_SUPABASE_SETUP.md`
- Super Admin: `SUPER_ADMIN_SETUP.md`

---

**✅ Готово! Все соединения настроены и работают.**









