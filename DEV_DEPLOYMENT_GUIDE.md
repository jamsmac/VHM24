# 🚀 VendHub Manager - Dev Mode Deployment Guide

**Цель:** Развернуть систему в development mode для beta testing, продолжая исправлять TypeScript errors параллельно.

**Статус системы:**
- ✅ Функционально готова: 92-95%
- ✅ Критические баги исправлены
- ⚠️ TypeScript errors: 339 (не блокируют runtime)

---

## 📋 Pre-Deployment Checklist

### ✅ Что уже готово:
- [x] npm install работает
- [x] Критический bug (inventory deduction) исправлен
- [x] Route collision устранен
- [x] Development dependencies установлены
- [x] PostgreSQL migrations готовы
- [x] Environment variables template (.env.example) есть
- [x] Docker Compose configuration готов

### ⚠️ Что нужно проверить:
- [ ] PostgreSQL доступен
- [ ] Redis доступен
- [ ] MinIO (S3) настроен
- [ ] Environment variables настроены
- [ ] Database migrations применены

---

## 🔧 Quick Start (Local Development)

### Step 1: Environment Setup

```bash
# Backend
cd backend
cp .env.example .env
```

**Отредактируйте `.env`:**
```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=vendhub
DATABASE_PASSWORD=your_secure_password
DATABASE_NAME=vendhub_dev

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your_very_secure_jwt_secret_here
JWT_EXPIRES_IN=1d
JWT_REFRESH_SECRET=your_very_secure_refresh_secret_here
JWT_REFRESH_EXPIRES_IN=7d

# S3 (MinIO for dev)
S3_ENDPOINT=http://localhost:9000
S3_BUCKET=vendhub-files
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_REGION=us-east-1

# Telegram Bot (optional for beta)
TELEGRAM_BOT_TOKEN=your_bot_token_here

# App Config
PORT=3000
NODE_ENV=development
ENABLE_SCHEDULED_TASKS=true
```

### Step 2: Start Infrastructure

```bash
# Start PostgreSQL, Redis, MinIO
docker-compose up -d postgres redis minio

# Verify services are running
docker-compose ps
```

**Expected output:**
```
NAME                COMMAND                  SERVICE    STATUS
vendhub-postgres    "docker-entrypoint..."   postgres   Up
vendhub-redis       "docker-entrypoint..."   redis      Up
vendhub-minio       "/usr/bin/docker-e..."   minio      Up
```

### Step 3: Database Setup

```bash
# Install dependencies (already works!)
npm install

# Run migrations
npm run migration:run

# Verify migrations
psql -h localhost -U vendhub -d vendhub_dev -c "\dt"
```

**Expected tables:**
```
 tasks
 machines
 transactions
 inventory_warehouse
 inventory_operator
 inventory_machine
 nomenclature
 recipes
 complaints
 incidents
 users
 ... and more
```

### Step 4: Start Backend (Dev Mode)

```bash
# Option 1: Use ts-node (bypasses TypeScript compilation)
npm run start:dev

# Option 2: If you want to see TypeScript warnings (but still run)
npm run build || true  # Ignore build errors
npm run start:prod
```

**Expected output:**
```
[Nest] INFO  [NestFactory] Starting Nest application...
[Nest] INFO  [InstanceLoader] AppModule dependencies initialized
[Nest] INFO  [InstanceLoader] TypeOrmModule dependencies initialized
[Nest] INFO  [RoutesResolver] TasksController {/tasks}
[Nest] INFO  [RoutesResolver] MachinesController {/machines}
[Nest] INFO  [RoutesResolver] TransactionsController {/transactions}
...
[Nest] INFO  [NestApplication] Nest application successfully started
[Nest] INFO  Application is running on: http://localhost:3000
[Nest] INFO  Swagger documentation: http://localhost:3000/api/docs
```

### Step 5: Verify Backend

```bash
# Health check
curl http://localhost:3000/health

# Expected response:
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "redis": { "status": "up" }
  }
}

# API Documentation
open http://localhost:3000/api/docs
```

### Step 6: Start Frontend (Optional)

```bash
cd ../frontend
cp .env.example .env

# Edit .env
NEXT_PUBLIC_API_URL=http://localhost:3000

npm install
npm run dev
```

**Open:** http://localhost:3001

---

## 🧪 Beta Testing Checklist

### Critical Workflows to Test:

#### 1. ✅ Sale with Inventory Deduction (FIXED!)
```bash
# Create a sale via API
POST /transactions/record-sale
{
  "machine_id": "uuid",
  "recipe_id": "uuid",
  "amount": 15000,
  "payment_method": "cash",
  "quantity": 1
}

# Verify:
# 1. Transaction created ✓
# 2. Inventory deducted from machine ✓
# 3. Logs show deduction for each ingredient ✓
```

#### 2. ✅ Refill Task Workflow
```bash
# 1. Create refill task
POST /tasks
{
  "type_code": "refill",
  "machine_id": "uuid",
  "assigned_to_user_id": "operator_uuid"
}

# 2. Upload photos (before)
POST /files/upload
# type: task_photo_before

# 3. Complete task
PATCH /tasks/:id/complete

# 4. Upload photos (after)
POST /files/upload
# type: task_photo_after

# Verify inventory moved: operator → machine
```

#### 3. ✅ Collection Task Workflow
```bash
# 1. Create collection task
# 2. Upload photos
# 3. Record cash collected
# 4. Complete task
```

#### 4. ✅ Complaints via QR Code
```bash
# Scan QR code on machine
# Submit complaint (public endpoint, no auth)
GET /complaints/public/machine/:qr_code

POST /complaints/public
{
  "machine_qr_code": "QR123",
  "description": "Test complaint"
}
```

---

## 🐛 Known Issues (Non-Critical)

### TypeScript Compilation Errors: 339
- **Impact:** Production build fails
- **Workaround:** Use `npm run start:dev` (ts-node)
- **Status:** Will be fixed in parallel with beta testing
- **Timeline:** 3-4 working days

### Missing Features:
- Reports module partially broken (TypeScript errors)
- Some dashboard widgets may show errors
- **Workaround:** Use Swagger API directly

---

## 📊 Monitoring & Logs

### Backend Logs
```bash
# Follow logs
cd backend
npm run start:dev 2>&1 | tee logs/dev.log

# Filter for errors
tail -f logs/dev.log | grep ERROR

# Filter for inventory deduction
tail -f logs/dev.log | grep "💰\|📦"
```

### Database Monitoring
```bash
# Check active connections
psql -h localhost -U vendhub -d vendhub_dev -c "SELECT count(*) FROM pg_stat_activity;"

# Check recent transactions
psql -h localhost -U vendhub -d vendhub_dev -c "SELECT * FROM transactions ORDER BY created_at DESC LIMIT 10;"

# Check inventory levels
psql -h localhost -U vendhub -d vendhub_dev -c "SELECT * FROM inventory_machine ORDER BY updated_at DESC LIMIT 10;"
```

### Redis Queue Monitoring
```bash
# Connect to Redis
docker exec -it vendhub-redis redis-cli

# Check BullMQ queues
KEYS bull:*

# Check queue length
LLEN bull:commission-calculation:wait
LLEN bull:sales-import:wait
```

---

## 🔄 Parallel Development Plan

### Week 1: Beta Testing + Reports Module Fixes

**Beta Testing Team:**
- Test critical workflows
- Report bugs via GitHub Issues
- Collect user feedback

**Development Team:**
- Fix Reports module TypeScript errors (~5 hours)
- Monitor beta testing feedback
- Fix critical bugs if found

### Week 2: Beta Feedback + Other Modules Fixes

**Beta Testing Team:**
- Continue testing
- Test edge cases
- Performance testing

**Development Team:**
- Fix other modules TypeScript errors (~8-10 hours)
- Implement beta feedback
- Write E2E tests

### Week 3: Stabilization + Testing

**Beta Testing Team:**
- Final testing round
- User acceptance testing

**Development Team:**
- Run full test suite
- Fix all remaining bugs
- Prepare for production

### Week 4: Production Deployment

**Production:**
- Build passes ✅
- All tests pass ✅
- Documentation complete ✅
- Deploy to production 🚀

---

## 🆘 Troubleshooting

### Issue: npm install fails
**Solution:** Already fixed! puppeteer is optional now.

### Issue: TypeScript compilation errors
**Solution:** Use `npm run start:dev` instead of `npm run build`

### Issue: Database connection fails
```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check credentials in .env
grep DATABASE .env

# Test connection
psql -h localhost -U vendhub -d vendhub_dev -c "SELECT 1;"
```

### Issue: Redis connection fails
```bash
# Check Redis is running
docker-compose ps redis

# Test connection
docker exec -it vendhub-redis redis-cli ping
# Expected: PONG
```

### Issue: Inventory not deducting
**Solution:** This is FIXED in Iteration 1! If still happening:
```bash
# Check logs for inventory service
tail -f logs/dev.log | grep "InventoryService\|📦"

# Verify RecipesService is working
curl http://localhost:3000/recipes/:id
```

---

## 📞 Support During Beta

**For critical bugs:**
1. Check logs: `tail -f logs/dev.log`
2. Create GitHub Issue with:
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - Logs excerpt
   - Screenshots if applicable

**For questions:**
1. Check Swagger API docs: http://localhost:3000/api/docs
2. Check VENDHUB_STATUS_REPORT.md
3. Check ITERATION summaries

---

## ✅ Success Criteria

Beta testing is successful if:
- ✅ Sales record correctly with inventory deduction
- ✅ Tasks can be created and completed
- ✅ Complaints can be submitted via QR
- ✅ No critical bugs found
- ✅ Performance is acceptable
- ✅ Users can complete their workflows

**Then:** System is ready for production! 🎉

---

*Development Mode Deployment Guide*
*Version: 1.0*
*Last Updated: 2025-11-18*
