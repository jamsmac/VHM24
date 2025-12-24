# Quick Fix: Link User to Owner Role

## Problem
Роль Owner создана, но пользователь не связан с ней. Нужно найти пользователя и связать его с ролью Owner.

## Solution: Use Railway SQL Editor (Easiest)

### Step 1: Open Railway SQL Editor

1. Откройте Railway Dashboard: https://railway.app
2. Выберите проект **VHM24**
3. Выберите сервис **Postgres**
4. Перейдите на вкладку **Data** → **Query**
5. Или используйте **Connect** → **Postgres URL** для подключения

### Step 2: Find Your User

Выполните этот SQL запрос:

```sql
-- List all users
SELECT 
  id,
  email,
  full_name,
  role as user_role_enum,
  status,
  created_at
FROM users
ORDER BY created_at DESC;
```

Скопируйте **email** пользователя, которого нужно связать с ролью Owner.

### Step 3: Link User to Owner Role

Замените `YOUR_EMAIL@example.com` на email из Step 2 и выполните:

```sql
-- Link user to Owner role
INSERT INTO user_roles (user_id, role_id, created_at)
SELECT 
  u.id,
  r.id,
  NOW()
FROM users u, roles r 
WHERE u.email = 'YOUR_EMAIL@example.com'
  AND r.name = 'Owner'
ON CONFLICT (user_id, role_id) DO NOTHING
RETURNING user_id, role_id;
```

### Step 4: Verify

Проверьте, что связь создана:

```sql
SELECT 
  u.email,
  u.full_name,
  u.role as user_role_enum,
  r.name as rbac_role_name,
  r.description
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
WHERE r.name = 'Owner';
```

## Alternative: Use Railway CLI

Если у вас установлен Railway CLI:

```bash
# Connect to Railway database
railway connect

# Then run SQL commands directly
psql -c "SELECT id, email, role FROM users ORDER BY created_at DESC;"

# Link user (replace YOUR_EMAIL)
psql -c "
INSERT INTO user_roles (user_id, role_id, created_at)
SELECT u.id, r.id, NOW()
FROM users u, roles r 
WHERE u.email = 'YOUR_EMAIL@example.com' AND r.name = 'Owner'
ON CONFLICT (user_id, role_id) DO NOTHING;
"
```

## Quick One-Liner (if you know the email)

```sql
-- Replace YOUR_EMAIL with actual email
INSERT INTO user_roles (user_id, role_id, created_at)
SELECT u.id, r.id, NOW()
FROM users u, roles r 
WHERE u.email = 'YOUR_EMAIL@example.com' AND r.name = 'Owner'
ON CONFLICT (user_id, role_id) DO NOTHING;
```

## Owner Role Info

- **Role ID**: `4fa96c0f-86d1-4344-8dfc-6fcc2c56a744`
- **Role Name**: `Owner`
- **Description**: Full system access - Owner of the system. Can manage everything including admins.

## After Linking

После связывания попробуйте добавить location снова - должно работать! ✅





