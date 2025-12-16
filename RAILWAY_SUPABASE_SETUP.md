# Railway & Supabase Setup Guide

**Дата создания:** 2025-01-27  
**Проект:** VHM24

---

## 🔐 Учетные данные

### Railway Token
```
8d4d83d1-df06-48f1-9ed8-5bf24cc82b4a
```

### Supabase Database Password
```
ucfbBVjbXhhKSrLi
```

### Super Admin
- **Telegram Username:** @Jamshiddin
- **Telegram ID:** 42283329

**⚠️ ВАЖНО:** Эти данные хранятся локально и НЕ должны быть закоммичены в git!

---

## 🚀 Настройка Railway

### 1. Установка Railway CLI

```bash
npm install -g @railway/cli
```

### 2. Авторизация в Railway

```bash
railway login
# Используйте токен: 8d4d83d1-df06-48f1-9ed8-5bf24cc82b4a
```

Или через переменную окружения:
```bash
export RAILWAY_TOKEN=8d4d83d1-df06-48f1-9ed8-5bf24cc82b4a
railway login
```

### 3. Подключение к проекту

```bash
cd /Users/js/Мой\ диск/3.VendHub/VHM24/VHM24-repo
railway link
# Выберите проект vhm24
```

### 4. Настройка переменных окружения в Railway

После подключения проекта, добавьте переменные через CLI:

```bash
# Database (Supabase)
railway variables set DATABASE_HOST=db.ivndncmwohshbvpjbxcx.supabase.co
railway variables set DATABASE_PORT=5432
railway variables set DATABASE_USER=postgres
railway variables set DATABASE_PASSWORD=ucfbBVjbXhhKSrLi
railway variables set DATABASE_NAME=postgres

# Или используйте полный DATABASE_URL
railway variables set DATABASE_URL=postgresql://postgres:ucfbBVjbXhhKSrLi@db.ivndncmwohshbvpjbxcx.supabase.co:5432/postgres

# JWT Secrets (сгенерируйте новые!)
railway variables set JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
railway variables set JWT_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# Redis (если используете Railway Redis)
# Railway автоматически создаст REDIS_URL при добавлении Redis сервиса

# S3 Storage (MinIO или Cloudflare R2)
railway variables set S3_ENDPOINT=https://your-endpoint.com
railway variables set S3_BUCKET=vendhub
railway variables set S3_ACCESS_KEY=your-access-key
railway variables set S3_SECRET_KEY=your-secret-key

# Frontend URL
railway variables set FRONTEND_URL=https://your-domain.com

# Telegram Bot (если используется)
railway variables set TELEGRAM_BOT_TOKEN=your-bot-token
railway variables set TELEGRAM_ADMIN_ID=42283329
railway variables set TELEGRAM_ADMIN_USERNAME=Jamshiddin
railway variables set SUPER_ADMIN_TELEGRAM_ID=42283329
railway variables set SUPER_ADMIN_USERNAME=Jamshiddin

# Environment
railway variables set NODE_ENV=production
railway variables set PORT=3000
```

### 5. Деплой на Railway

```bash
# Деплой backend
cd backend
railway up

# Или через git push (автоматический деплой)
git push origin main
```

---

## 🗄️ Настройка Supabase

### 1. Подключение к базе данных

**Connection String:**
```
postgresql://postgres:ucfbBVjbXhhKSrLi@db.ivndncmwohshbvpjbxcx.supabase.co:5432/postgres
```

### 2. Настройка в локальном .env

Создайте `backend/.env.production`:

```env
# Supabase Database
DATABASE_HOST=db.ivndncmwohshbvpjbxcx.supabase.co
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=ucfbBVjbXhhKSrLi
DATABASE_NAME=postgres

# Или используйте полный URL
DATABASE_URL=postgresql://postgres:ucfbBVjbXhhKSrLi@db.ivndncmwohshbvpjbxcx.supabase.co:5432/postgres

# SSL для Supabase (обязательно!)
DATABASE_SSL=true
```

### 3. Проверка подключения

```bash
cd backend
npm run migration:run
```

### 4. Настройка в Railway

В Railway Dashboard:
1. Перейдите в ваш проект
2. Откройте сервис backend
3. Перейдите в раздел "Variables"
4. Добавьте переменные из раздела выше

---

## 📋 Чеклист настройки

### Railway
- [ ] Railway CLI установлен
- [ ] Авторизован в Railway (токен настроен)
- [ ] Проект подключен (`railway link`)
- [ ] Переменные окружения добавлены
- [ ] Health check настроен (`/health/live`)
- [ ] Деплой успешен

### Supabase
- [ ] База данных доступна
- [ ] Пароль подтвержден
- [ ] SSL подключение работает
- [ ] Миграции применены
- [ ] Тестовое подключение успешно

---

## 🔧 Полезные команды Railway

```bash
# Просмотр логов
railway logs

# Просмотр переменных
railway variables

# Просмотр статуса
railway status

# Открыть проект в браузере
railway open

# Деплой
railway up

# Откат к предыдущей версии
railway rollback
```

---

## 🛠️ Troubleshooting

### Проблема: Railway не может подключиться к Supabase

**Решение:**
1. Проверьте, что пароль правильный: `ucfbBVjbXhhKSrLi`
2. Убедитесь, что SSL включен: `DATABASE_SSL=true`
3. Проверьте firewall настройки Supabase
4. Используйте полный `DATABASE_URL` вместо отдельных переменных

### Проблема: Миграции не применяются

**Решение:**
1. Проверьте подключение к БД: `railway run npm run migration:run`
2. Убедитесь, что все переменные окружения установлены
3. Проверьте логи: `railway logs`

### Проблема: Health check не проходит

**Решение:**
1. Проверьте, что endpoint `/health/live` доступен
2. Убедитесь, что приложение запущено
3. Проверьте логи на ошибки

---

## 📝 Дополнительные ресурсы

- [Railway Documentation](https://docs.railway.app)
- [Supabase Documentation](https://supabase.com/docs)
- [Railway CLI Reference](https://docs.railway.app/develop/cli)

---

**⚠️ БЕЗОПАСНОСТЬ:**

1. **НЕ коммитьте** этот файл с реальными паролями в git
2. Используйте Railway Secrets для хранения чувствительных данных
3. Регулярно ротируйте пароли и токены
4. Используйте разные пароли для разных окружений

---

**Последнее обновление:** 2025-01-27
