# ROADMAP TO PRODUCTION - VendHub Manager

**Audit Date:** 2025-12-14
**Current Status:** Near Production Ready (7.5/10)
**Estimated Effort:** 2-3 days of focused work

---

## PHASE 0: CRITICAL BLOCKERS (Day 1 - 4 hours)

These must be completed before ANY production deployment:

### 0.1 Remove Console.log Statements
```bash
# Find all console.log in production code
grep -rn "console.log" backend/src --include="*.ts" | grep -v "spec.ts" | grep -v ".d.ts" > console_logs.txt

# Replace with NestJS Logger
# In each service, add:
private readonly logger = new Logger(ServiceName.name);

# Then replace:
# console.log(x) → this.logger.log(x) or this.logger.debug(x)
```

**Files to update:** ~50-80 files
**Time:** 2 hours

### 0.2 Create Production Environment File
```bash
# Copy and configure
cp backend/.env.example backend/.env.production

# MUST set these values:
DATABASE_HOST=<production_host>
DATABASE_PORT=5432
DATABASE_USER=<secure_user>
DATABASE_PASSWORD=<strong_password>
DATABASE_NAME=vendhub_production

REDIS_HOST=<redis_host>
REDIS_PORT=6379
REDIS_PASSWORD=<redis_password>

JWT_SECRET=<64_char_random_string>
JWT_REFRESH_SECRET=<64_char_random_string>
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

S3_ENDPOINT=<cloudflare_r2_endpoint>
S3_BUCKET=vendhub-prod
S3_ACCESS_KEY=<access_key>
S3_SECRET_KEY=<secret_key>
S3_REGION=auto

# For Telegram Bot
TELEGRAM_BOT_TOKEN=<bot_token>
TELEGRAM_WEBHOOK_DOMAIN=<your_domain>

# For Web Push
VAPID_PUBLIC_KEY=<generated_public>
VAPID_PRIVATE_KEY=<generated_private>

# For Email (if using)
SMTP_HOST=<smtp_host>
SMTP_PORT=587
SMTP_USER=<user>
SMTP_PASSWORD=<password>
```

**Time:** 30 minutes

### 0.3 Verify Database Connection
```bash
# Test migration on empty database
npm run migration:run

# Verify all 58 migrations apply cleanly
```

**Time:** 30 minutes

### 0.4 Generate Security Keys
```bash
# Generate JWT secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate VAPID keys (for web push)
npx web-push generate-vapid-keys
```

**Time:** 15 minutes

---

## PHASE 1: CLEANUP (Day 1 - 4 hours)

### 1.1 Delete Legacy Stack
```bash
# Remove unused directories
rm -rf server/
rm -rf client/
rm -rf drizzle/
rm -rf telegram-bot/

# Update root package.json if needed
# Remove any scripts referencing these
```

### 1.2 Archive Old Documentation
```bash
mkdir -p docs/archive

# Move all old .md files
mv ANALYSIS_PLAN.md docs/archive/
mv AUDIT_SUMMARY.md docs/archive/
# ... (see CLEANUP_LIST.md for full list)

# Keep only:
# README.md, CLAUDE.md, CHANGELOG.md, DEPLOYMENT.md, SECURITY.md, RUNBOOK.md
```

### 1.3 Clean Backend Root
```bash
cd backend

# Remove old scripts
rm -f bulk-fix.py fix-any-types.sh fix-ts-errors.sh
rm -f migrate-excel.py migrate-xlsx-to-exceljs.sh quick-fix.sh

# Remove old reports
rm -f ACTION_PLAN_TICKETS.md ANY_TYPES_REPORT.md BACKEND_*.md
# ... (see CLEANUP_LIST.md for full list)
```

---

## PHASE 2: INFRASTRUCTURE SETUP (Day 1-2 - Variable)

### 2.1 Database (PostgreSQL 14+)

**Option A: Managed Service (Recommended)**
- Supabase (free tier available)
- AWS RDS
- DigitalOcean Managed Database
- Railway

**Option B: Self-Hosted**
```bash
# Via Docker
docker run -d \
  --name vendhub-postgres \
  -e POSTGRES_USER=vendhub \
  -e POSTGRES_PASSWORD=<strong_password> \
  -e POSTGRES_DB=vendhub_production \
  -p 5432:5432 \
  -v postgres-data:/var/lib/postgresql/data \
  postgres:14-alpine
```

### 2.2 Redis

**Option A: Managed Service**
- Upstash (serverless, free tier)
- AWS ElastiCache
- Redis Cloud

**Option B: Self-Hosted**
```bash
docker run -d \
  --name vendhub-redis \
  -e REDIS_PASSWORD=<password> \
  -p 6379:6379 \
  -v redis-data:/data \
  redis:7-alpine --requirepass <password>
```

### 2.3 S3-Compatible Storage

**Option A: Cloudflare R2 (Recommended - cheaper)**
- No egress fees
- S3-compatible API
- Configure bucket and access keys

**Option B: AWS S3**
- Create bucket
- Create IAM user with S3 access
- Get access keys

**Option C: MinIO (Self-Hosted)**
```bash
docker run -d \
  --name vendhub-minio \
  -e MINIO_ROOT_USER=vendhub \
  -e MINIO_ROOT_PASSWORD=<strong_password> \
  -p 9000:9000 -p 9001:9001 \
  -v minio-data:/data \
  minio/minio server /data --console-address ":9001"
```

---

## PHASE 3: DEPLOYMENT (Day 2 - 4 hours)

### 3.1 Option A: Railway (Easiest)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and init
railway login
railway init

# Deploy
railway up
```

Configure in Railway dashboard:
- Add PostgreSQL plugin
- Add Redis plugin
- Set environment variables
- Configure domain

### 3.2 Option B: Docker Compose Production

```bash
# Use production compose file
docker compose -f docker-compose.production.yml up -d

# Run migrations
docker compose exec backend npm run migration:run

# Create initial admin user
docker compose exec backend npm run seed:admin
```

### 3.3 Option C: VPS (DigitalOcean, Linode, etc.)

1. **Provision Server**
   - Ubuntu 22.04 LTS
   - 2GB RAM minimum
   - Install Docker & Docker Compose

2. **Clone and Configure**
   ```bash
   git clone https://github.com/jamsmac/VHM24.git
   cd VHM24
   cp backend/.env.example backend/.env
   # Edit .env with production values
   ```

3. **Start Services**
   ```bash
   docker compose -f docker-compose.production.yml up -d
   ```

4. **Configure Nginx (reverse proxy)**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location /api {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }

       location / {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

5. **SSL with Certbot**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

---

## PHASE 4: POST-DEPLOYMENT (Day 2-3 - 4 hours)

### 4.1 Create Initial Admin User

```bash
# Via API (after deployment)
curl -X POST https://your-domain.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@company.com",
    "password": "StrongP@ssw0rd!",
    "full_name": "System Admin"
  }'

# Then manually update role in database
UPDATE users SET role = 'SuperAdmin', status = 'active'
WHERE email = 'admin@company.com';
```

### 4.2 Configure Telegram Bot

1. Create bot via @BotFather
2. Set webhook:
   ```bash
   curl -F "url=https://your-domain.com/api/v1/telegram/webhook" \
     https://api.telegram.org/bot<TOKEN>/setWebhook
   ```

### 4.3 Verify Health Checks

```bash
# Check backend health
curl https://your-domain.com/api/v1/health

# Expected response:
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "redis": { "status": "up" }
  }
}
```

### 4.4 Test Critical Flows

- [ ] User registration
- [ ] User login
- [ ] Create machine
- [ ] Create task
- [ ] Complete task (with photo upload)
- [ ] View reports
- [ ] Telegram bot /start command

### 4.5 Set Up Monitoring

```bash
# Deploy Prometheus + Grafana (optional but recommended)
docker compose -f docker-compose.monitoring.yml up -d
```

Import Grafana dashboards from `monitoring/grafana/dashboards/`

---

## PHASE 5: ONGOING IMPROVEMENTS (Week 2+)

### 5.1 Increase Test Coverage
- Add frontend unit tests (currently 8 files)
- Add E2E tests for critical flows
- Target: 80% backend, 60% frontend

### 5.2 Performance Optimization
- Enable query logging in development
- Identify N+1 queries
- Add database indexes as needed

### 5.3 Documentation
- Consolidate 118 .md files into structured docs/
- Write API documentation (Swagger is auto-generated)
- Create user guide

### 5.4 Mobile App (Future)
- Expand mobile/ stub into functional app
- Or develop PWA capabilities in frontend

---

## CHECKLIST

### Before Go-Live
- [ ] Console.log statements removed
- [ ] Production environment variables set
- [ ] Database running and migrations applied
- [ ] Redis running
- [ ] S3/R2 storage configured
- [ ] SSL/TLS configured
- [ ] Initial admin user created
- [ ] Telegram bot webhook set (if using)
- [ ] Health check returning OK
- [ ] Critical flows tested

### First Week After Launch
- [ ] Monitor error rates
- [ ] Monitor response times
- [ ] Review security logs
- [ ] Backup database
- [ ] Document any issues found

### First Month
- [ ] Review user feedback
- [ ] Performance tune if needed
- [ ] Plan feature improvements
- [ ] Increase test coverage

---

## SUPPORT CONTACTS

**Technical Issues:**
- Check `/api/v1/health` endpoint
- Review application logs
- Check RUNBOOK.md for common issues

**Infrastructure:**
- Database connection: Check environment variables
- Redis connection: Verify host/port/password
- S3 storage: Check bucket permissions

---

## ESTIMATED TIMELINE

| Phase | Duration | Effort |
|-------|----------|--------|
| Phase 0: Blockers | 4 hours | Required |
| Phase 1: Cleanup | 4 hours | Recommended |
| Phase 2: Infrastructure | 2-4 hours | Required |
| Phase 3: Deployment | 4 hours | Required |
| Phase 4: Post-Deployment | 4 hours | Required |
| **Total** | **2-3 days** | |

---

**Ready for Production: YES** (after completing Phases 0-4)
