# Railway Database Setup - Avoid Egress Fees

## Problem
Railway показывает предупреждение:
> "DATABASE_PUBLIC_URL references a public endpoint through RAILWAY_TCP_PROXY_DOMAIN. Connecting to a public endpoint will incur egress fees."

## Solution

### ✅ Use Private Endpoint (Free)

Railway автоматически создает две переменные для Postgres:
- `DATABASE_URL` - **приватный endpoint** (бесплатный, используйте это!)
- `DATABASE_PUBLIC_URL` - публичный endpoint (платный egress, не используйте!)

### Step 1: Check Current Variables

В Railway Dashboard:
1. Откройте ваш проект **VHM24**
2. Выберите сервис **backend**
3. Перейдите в **Variables**
4. Проверьте, какие переменные установлены

### Step 2: Ensure DATABASE_URL is Set

Убедитесь, что `DATABASE_URL` установлен и использует приватный endpoint:

```bash
# В Railway CLI
railway variables

# Или в Railway Dashboard → Variables
# Должна быть переменная DATABASE_URL с форматом:
# postgresql://user:password@hostname:port/database
```

**Важно**: `DATABASE_URL` должен быть из приватной сети Railway, НЕ из `RAILWAY_TCP_PROXY_DOMAIN`.

### Step 3: Remove DATABASE_PUBLIC_URL (if exists)

Если у вас есть переменная `DATABASE_PUBLIC_URL`, удалите её:

```bash
# Удалить переменную
railway variables delete DATABASE_PUBLIC_URL
```

Или в Railway Dashboard:
1. Variables → найдите `DATABASE_PUBLIC_URL`
2. Удалите её

### Step 4: Verify Code Uses DATABASE_URL

Код уже правильно настроен! В `src/app.module.ts` используется:

```typescript
const databaseUrl = configService.get('DATABASE_URL');
```

Это означает, что приложение использует приватный endpoint по умолчанию.

## How Railway Database Variables Work

### Private Endpoint (DATABASE_URL) ✅
- **Бесплатный** - нет egress fees
- Работает только внутри Railway network
- Автоматически создается Railway
- Формат: `postgresql://user:password@private-hostname:port/database`

### Public Endpoint (DATABASE_PUBLIC_URL) ❌
- **Платный** - egress fees применяются
- Доступен из интернета через TCP proxy
- Использует `RAILWAY_TCP_PROXY_DOMAIN`
- Формат: `postgresql://user:password@proxy.railway.app:port/database`

## Current Configuration

Ваш код уже правильно настроен:

```typescript:77:88:backend/src/app.module.ts
const databaseUrl = configService.get('DATABASE_URL');

// Support both DATABASE_URL and individual variables
const baseConfig = databaseUrl
  ? { url: databaseUrl }
  : {
      host: configService.get('DATABASE_HOST'),
      port: configService.get('DATABASE_PORT'),
      username: configService.get('DATABASE_USER'),
      password: configService.get('DATABASE_PASSWORD'),
      database: configService.get('DATABASE_NAME'),
    };
```

## Verification

Проверьте, что используется правильный endpoint:

1. **В Railway Dashboard**:
   - Variables → `DATABASE_URL` должен быть установлен
   - `DATABASE_PUBLIC_URL` должен отсутствовать или не использоваться

2. **В логах приложения**:
   - При старте не должно быть ошибок подключения к БД
   - Connection string не должен содержать `proxy.railway.app`

3. **Проверка подключения**:
   ```bash
   # Подключение должно работать
   railway connect
   psql -c "SELECT version();"
   ```

## If You Need Public Access

Если вам действительно нужен публичный доступ к БД (например, для внешних инструментов):

1. **Используйте Railway Private Network** (рекомендуется):
   - Подключайтесь через Railway CLI: `railway connect`
   - Или используйте Railway VPN/Private Network

2. **Если нужен публичный доступ**:
   - Используйте `DATABASE_PUBLIC_URL` осознанно
   - Понимайте, что будут применяться egress fees
   - Используйте только для внешних инструментов, не для основного приложения

## Summary

✅ **DO**: Используйте `DATABASE_URL` (приватный endpoint)  
❌ **DON'T**: Не используйте `DATABASE_PUBLIC_URL` для основного приложения

Ваш код уже правильно настроен - просто убедитесь, что в Railway Variables установлен только `DATABASE_URL`, а `DATABASE_PUBLIC_URL` удален или не используется.





