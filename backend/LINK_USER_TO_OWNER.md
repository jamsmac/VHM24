# Link User to Owner Role - Quick Fix

## Problem
Миграция создала роль Owner, но не смогла связать её с пользователем, потому что пользователь `admin@vendhub.com` не найден.

## Solution

### Step 1: Find Your User

Сначала найдите, какой email у вашего пользователя:

```bash
cd backend
psql $DATABASE_URL -f src/database/scripts/find-users-and-roles.sql
```

Или выполните в Railway SQL Editor:

```sql
-- List all users
SELECT id, email, full_name, role, status, created_at
FROM users
ORDER BY created_at DESC;
```

### Step 2: Link User to Owner Role

После того, как вы узнали email пользователя, выполните:

```sql
-- Replace 'YOUR_EMAIL@example.com' with your actual email
INSERT INTO user_roles (user_id, role_id, created_at)
SELECT 
  u.id as user_id,
  r.id as role_id,
  NOW() as created_at
FROM users u, roles r 
WHERE u.email = 'YOUR_EMAIL@example.com'
  AND r.name = 'Owner'
ON CONFLICT (user_id, role_id) DO NOTHING
RETURNING user_id, role_id;
```

### Step 3: Verify

Проверьте, что связь создана:

```sql
SELECT 
  u.email,
  u.role as user_role_enum,
  r.name as rbac_role_name,
  r.description
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
WHERE u.email = 'YOUR_EMAIL@example.com'
  AND r.name = 'Owner';
```

## Quick One-Liner

Если вы знаете email пользователя, выполните одну команду:

```bash
# Replace YOUR_EMAIL with actual email
psql $DATABASE_URL -c "
INSERT INTO user_roles (user_id, role_id, created_at)
SELECT u.id, r.id, NOW()
FROM users u, roles r 
WHERE u.email = 'YOUR_EMAIL' AND r.name = 'Owner'
ON CONFLICT (user_id, role_id) DO NOTHING;
"
```

## After Linking

После связывания пользователя с ролью Owner:
1. Попробуйте добавить location снова
2. Должно работать!

## Owner Role ID

Роль Owner уже создана с ID: `4fa96c0f-86d1-4344-8dfc-6fcc2c56a744`

Вы можете использовать этот ID напрямую:

```sql
-- Link by user email and role ID
INSERT INTO user_roles (user_id, role_id, created_at)
SELECT 
  u.id,
  '4fa96c0f-86d1-4344-8dfc-6fcc2c56a744'::uuid,
  NOW()
FROM users u
WHERE u.email = 'YOUR_EMAIL@example.com'
ON CONFLICT (user_id, role_id) DO NOTHING;
```


