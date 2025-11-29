# 🚀 VendHub Manager - Supabase Deployment Guide

## ✅ Your Credentials (READY TO USE!)

### Supabase Database
- **Project URL**: `https://ivndncmwohshbvpjbxcx.supabase.co`
- **Database URL**: `postgresql://postgres:HYWL7SSfgNFUdRsa@db.ivndncmwohshbvpjbxcx.supabase.co:5432/postgres`
- **Status**: ✅ CONFIGURED

### Telegram Bot
- **Token**: `8201265622:AAG3NMF7J2RP49nc4y6rnEG2A-0iaAnW4dA`
- **Admin**: @Jamshiddin (ID: 42283329)
- **Status**: ✅ CONFIGURED

---

## 🏃 Quick Start (Local Development)

```bash
# 1. Navigate to backend
cd backend

# 2. Run the one-click launch script
./launch.sh

# That's it! The script will:
# - Install dependencies
# - Connect to Supabase database
# - Run migrations
# - Create super admin user
# - Start the server
```

Your application will be available at:
- **Backend API**: http://localhost:3000
- **Swagger Docs**: http://localhost:3000/api/docs
- **Health Check**: http://localhost:3000/monitoring/health

---

## ☁️ Production Deployment

### Option 1: Railway (Recommended - Easy)

**Your Railway Project ID**: `116b463b-d3b2-48f3-b633-822282cf0ea3`

1. **Install Railway CLI**:
```bash
npm install -g @railway/cli
```

2. **Login to Railway**:
```bash
railway login
```

3. **Link to your project**:
```bash
cd backend
railway link 116b463b-d3b2-48f3-b633-822282cf0ea3
```

4. **Deploy**:
```bash
railway up
```

4. **Set environment variables** in Railway dashboard:
```env
DATABASE_URL=postgresql://postgres:HYWL7SSfgNFUdRsa@db.ivndncmwohshbvpjbxcx.supabase.co:5432/postgres
TELEGRAM_BOT_TOKEN=8201265622:AAG3NMF7J2RP49nc4y6rnEG2A-0iaAnW4dA
TELEGRAM_ADMIN_CHAT_ID=42283329
# Copy other variables from backend/.env.production
```

### Option 2: Docker Deployment

1. **Build Docker image**:
```bash
cd backend
docker build -t vendhub-backend .
```

2. **Run with Docker**:
```bash
docker run -d \
  --name vendhub \
  -p 3000:3000 \
  --env-file .env.production \
  vendhub-backend
```

### Option 3: Manual VPS Deployment

1. **SSH to your server**:
```bash
ssh user@your-server.com
```

2. **Clone repository**:
```bash
git clone https://github.com/yourusername/VendHub.git
cd VendHub/backend
```

3. **Install dependencies**:
```bash
npm install --production
```

4. **Copy production environment**:
```bash
cp .env.production .env
```

5. **Build and run**:
```bash
npm run build
npm run migration:run
npm run start:prod
```

6. **Setup with PM2** (recommended):
```bash
npm install -g pm2
pm2 start dist/main.js --name vendhub
pm2 save
pm2 startup
```

---

## 🔗 Required Services Status

### ✅ Already Configured
1. **Supabase Database** - PostgreSQL database is ready and configured
2. **Telegram Bot** - Bot token and admin credentials are set

### ⚠️ Still Needed (Optional)

#### Redis Cache (for performance)
**Option 1: Upstash (FREE)**
1. Sign up at https://upstash.com
2. Create Redis database
3. Get connection URL
4. Update `REDIS_URL` in .env

**Option 2: Local Redis**
```bash
docker run -d -p 6379:6379 redis
```

#### File Storage (for photos)
**Option 1: Cloudflare R2 (10GB FREE)**
1. Sign up at https://dash.cloudflare.com
2. Create R2 bucket
3. Get credentials
4. Update S3 variables in .env

**Option 2: Local MinIO**
```bash
docker run -d \
  -p 9000:9000 \
  -p 9001:9001 \
  --name minio \
  -e "MINIO_ROOT_USER=minioadmin" \
  -e "MINIO_ROOT_PASSWORD=minioadmin" \
  minio/minio server /data --console-address ":9001"
```

---

## 📱 Telegram Bot Setup

Your Telegram bot is already configured! To activate:

1. **Set webhook** (after deploying to production):
```bash
curl -X POST https://api.telegram.org/bot8201265622:AAG3NMF7J2RP49nc4y6rnEG2A-0iaAnW4dA/setWebhook \
  -d "url=https://your-domain.com/telegram/webhook"
```

2. **Test the bot**:
- Open Telegram
- Search for your bot
- Send `/start` command
- You should receive a welcome message

3. **Admin commands**:
- `/admin` - Admin panel
- `/stats` - System statistics
- `/users` - User management

---

## 🧪 Testing Database Connection

Run this command to test your Supabase connection:

```bash
cd backend
npm run typeorm query "SELECT current_database(), version()"
```

You should see:
```
current_database: postgres
version: PostgreSQL 14.x
```

---

## 📊 Monitoring

### Health Checks
- **Endpoint**: `/monitoring/health`
- **Liveness**: `/monitoring/health/live`
- **Readiness**: `/monitoring/health/ready`

### Prometheus Metrics
- **Endpoint**: `/monitoring/metrics`
- Tracks API performance, database queries, etc.

---

## 🔒 Security Checklist

- [x] Database credentials secured in Supabase
- [x] JWT secrets generated
- [x] Telegram bot token secured
- [x] CORS configured
- [x] Rate limiting enabled
- [x] SQL injection protection (TypeORM)
- [ ] SSL certificate (configure on deployment)
- [ ] Firewall rules (configure on VPS)

---

## 🚨 Troubleshooting

### Database Connection Issues
```bash
# Test connection
npm run typeorm query "SELECT 1"

# Check if Supabase is accessible
ping db.ivndncmwohshbvpjbxcx.supabase.co
```

### Migration Issues
```bash
# Generate new migration
npm run migration:generate -- -n FixName

# Revert last migration
npm run migration:revert

# Run specific migration
npm run typeorm migration:run
```

### Telegram Bot Not Responding
```bash
# Check webhook
curl https://api.telegram.org/bot8201265622:AAG3NMF7J2RP49nc4y6rnEG2A-0iaAnW4dA/getWebhookInfo

# Delete webhook (for local testing)
curl https://api.telegram.org/bot8201265622:AAG3NMF7J2RP49nc4y6rnEG2A-0iaAnW4dA/deleteWebhook
```

---

## 📝 Environment Variables Reference

```env
# Database (CONFIGURED)
DATABASE_URL=postgresql://postgres:HYWL7SSfgNFUdRsa@db.ivndncmwohshbvpjbxcx.supabase.co:5432/postgres

# Telegram (CONFIGURED)
TELEGRAM_BOT_TOKEN=8201265622:AAG3NMF7J2RP49nc4y6rnEG2A-0iaAnW4dA
TELEGRAM_ADMIN_CHAT_ID=42283329

# Redis (OPTIONAL - for caching)
REDIS_URL=redis://default:[PASSWORD]@[HOST]:6379

# File Storage (OPTIONAL - for photos)
S3_ENDPOINT=https://[ACCOUNT].r2.cloudflarestorage.com
S3_ACCESS_KEY=your_key
S3_SECRET_KEY=your_secret
S3_BUCKET=vendhub

# Security (auto-generated)
JWT_SECRET=[GENERATED]
BCRYPT_SALT_ROUNDS=12
```

---

## 🎉 Next Steps

1. **Test locally** with `./launch.sh`
2. **Deploy to production** using Railway or Docker
3. **Configure domain** and SSL certificate
4. **Set up monitoring** (optional)
5. **Configure backups** for Supabase (recommended)

---

## 📞 Support

- **Database Issues**: Check Supabase dashboard at https://app.supabase.com
- **Telegram Bot**: Message @BotFather on Telegram
- **Deployment**: Check logs with `pm2 logs` or `docker logs`

---

**Your system is ready for deployment! 🚀**

Just run `./launch.sh` in the backend folder to start!