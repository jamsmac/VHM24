# Super Admin Setup Guide

**Дата:** 2025-01-27  
**Проект:** VHM24

---

## 👤 Super Admin Информация

- **Telegram Username:** @Jamshiddin
- **Telegram ID:** 42283329
- **Role:** SuperAdmin

---

## 🚀 Создание Super Admin пользователя

### Вариант 1: Через скрипт (Рекомендуется)

```bash
cd backend
npm run create-superadmin -- \
  --email admin@vendhub.com \
  --password YourSecurePassword123! \
  --name "Jamshiddin" \
  --telegram-id 42283329 \
  --telegram-username Jamshiddin
```

### Вариант 2: Интерактивный режим

```bash
cd backend
npm run create-superadmin
```

Затем введите:
- **Email:** admin@vendhub.com
- **Password:** (надежный пароль)
- **Full Name:** Jamshiddin
- **Telegram User ID:** 42283329
- **Telegram Username:** Jamshiddin

### Вариант 3: После деплоя на Railway

```bash
cd backend
railway run npm run create-superadmin -- \
  --email admin@vendhub.com \
  --password YourSecurePassword123! \
  --name "Jamshiddin" \
  --telegram-id 42283329 \
  --telegram-username Jamshiddin
```

---

## ⚙️ Переменные окружения для Railway

Добавьте в Railway Dashboard:

```env
# Super Admin Telegram
TELEGRAM_ADMIN_ID=42283329
TELEGRAM_ADMIN_USERNAME=Jamshiddin
SUPER_ADMIN_TELEGRAM_ID=42283329
SUPER_ADMIN_USERNAME=Jamshiddin

# Super Admin Email (для создания через seed)
SUPER_ADMIN_EMAIL=admin@vendhub.com
SUPER_ADMIN_PASSWORD=YourSecurePassword123!
```

---

## 🔍 Проверка Super Admin

### Через API

```bash
# Логин
curl -X POST https://your-domain.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@vendhub.com",
    "password": "YourSecurePassword123!"
  }'

# Проверка роли
curl -X GET https://your-domain.com/api/v1/users/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Через базу данных

```sql
SELECT 
  id, 
  email, 
  full_name, 
  role, 
  telegram_user_id, 
  telegram_username 
FROM users 
WHERE role = 'SUPER_ADMIN';
```

---

## 📋 Права Super Admin

Super Admin имеет полный доступ к системе:

- ✅ Управление всеми пользователями
- ✅ Назначение любых ролей (включая Admin)
- ✅ Просмотр audit logs
- ✅ Доступ ко всем модулям системы
- ✅ Управление настройками системы
- ✅ Доступ к Telegram боту с правами администратора

---

## 🔐 Безопасность

1. **Используйте надежный пароль** (минимум 12 символов, буквы, цифры, спецсимволы)
2. **Включите 2FA** после первого входа
3. **Не делитесь** учетными данными
4. **Регулярно проверяйте** audit logs на подозрительную активность

---

## 🛠️ Troubleshooting

### Проблема: Super Admin не может войти

**Решение:**
1. Проверьте, что пользователь создан: `SELECT * FROM users WHERE email = 'admin@vendhub.com';`
2. Проверьте роль: `SELECT role FROM users WHERE email = 'admin@vendhub.com';`
3. Проверьте статус: `SELECT status FROM users WHERE email = 'admin@vendhub.com';` (должен быть 'ACTIVE')

### Проблема: Telegram ID не привязан

**Решение:**
1. Убедитесь, что Telegram ID правильный: `42283329`
2. Проверьте в БД: `SELECT telegram_user_id FROM users WHERE email = 'admin@vendhub.com';`
3. Обновите вручную если нужно:
   ```sql
   UPDATE users 
   SET telegram_user_id = '42283329', 
       telegram_username = 'Jamshiddin' 
   WHERE email = 'admin@vendhub.com';
   ```

---

## 📝 Дополнительные команды

### Обновление Super Admin

```bash
# Обновить пароль через скрипт (если нужно)
# Или напрямую в БД:
# UPDATE users SET password_hash = '$2b$10$...' WHERE email = 'admin@vendhub.com';
```

### Проверка существующих Super Admin

```sql
SELECT 
  id,
  email,
  full_name,
  role,
  status,
  telegram_user_id,
  telegram_username,
  created_at
FROM users 
WHERE role = 'SUPER_ADMIN'
ORDER BY created_at DESC;
```

---

**Последнее обновление:** 2025-01-27
