# Fix Owner Role and User Link

## Problem
When trying to add locations, you get `INSERT 0 0` error, which indicates that either:
- The Owner role doesn't exist in the `roles` table, OR
- The user doesn't exist, OR  
- The user is not linked to the Owner role via `user_roles` table

## Solution

### Option 1: Run Migration (Recommended)

The migration `1734820000000-FixOwnerRoleAndUserLink.ts` will:
1. Create Owner role if it doesn't exist
2. Link admin user (admin@vendhub.com) to Owner role
3. Verify the fix

**Run the migration:**
```bash
cd backend
npm run migration:run
```

### Option 2: Run SQL Script Manually

If migration doesn't work, run the SQL script directly in Railway:

1. **Connect to Railway database:**
   ```bash
   # In Railway dashboard, go to your backend service
   # Click on "Data" tab → "Connect" → Copy the connection string
   # Or use Railway CLI:
   railway connect
   ```

2. **Run the SQL script:**
   ```bash
   psql $DATABASE_URL -f src/database/scripts/fix-owner-role.sql
   ```

   Or copy-paste the SQL commands from `src/database/scripts/fix-owner-role.sql` into Railway's SQL editor.

### Option 3: Manual SQL Commands

If you prefer to run commands one by one:

```sql
-- 1. Check what roles exist
SELECT id, name, description FROM roles ORDER BY name;

-- 2. Check if Owner role exists
SELECT * FROM roles WHERE name = 'Owner';

-- 3. Create Owner role if it doesn't exist
INSERT INTO roles (id, name, description, is_active, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Owner',
  'Full system access - Owner of the system. Can manage everything including admins.',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (name) DO NOTHING;

-- 4. Check admin user
SELECT id, email, role FROM users WHERE email = 'admin@vendhub.com';

-- 5. Link user to Owner role
-- Note: user_roles table may only have created_at, not updated_at
INSERT INTO user_roles (user_id, role_id, created_at)
SELECT u.id, r.id, NOW()
FROM users u, roles r 
WHERE u.email = 'admin@vendhub.com' AND r.name = 'Owner'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- 6. Verify the fix
SELECT 
  u.email,
  u.role as user_role_enum,
  r.name as rbac_role_name,
  r.description
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
WHERE u.email = 'admin@vendhub.com';
```

## Expected Result

After running the fix, you should see:
- `user_role_enum`: `Owner` (or `SuperAdmin` if enum migration hasn't run)
- `rbac_role_name`: `Owner`
- `role_description`: `Full system access - Owner of the system...`

## Verification

After the fix, try adding a location again. It should work now.

If it still doesn't work, check:
1. User exists: `SELECT * FROM users WHERE email = 'admin@vendhub.com';`
2. Owner role exists: `SELECT * FROM roles WHERE name = 'Owner';`
3. User-role link exists: `SELECT * FROM user_roles ur JOIN users u ON ur.user_id = u.id JOIN roles r ON ur.role_id = r.id WHERE u.email = 'admin@vendhub.com' AND r.name = 'Owner';`

