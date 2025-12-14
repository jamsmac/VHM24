# 🚀 Railway Deployment Instructions for VendHub Manager

## Project Details
- **Project ID**: `116b463b-d3b2-48f3-b633-822282cf0ea3`
- **Project Name**: VendHub Manager
- **Environment**: Production

## Option 1: Deploy via Railway Dashboard (Recommended)

### Step 1: Access Your Project
1. Go to https://railway.app/dashboard
2. Your project should be visible: **VendHub Manager**
3. Click on the project

### Step 2: Create New Service
1. Click **"New Service"** or **"+ Add Service"**
2. Choose **"GitHub Repo"**
3. Connect to repository: `https://github.com/jamsmac/VendHub`
4. Select branch: `main`
5. Set root directory: `/backend`

### Step 3: Configure Environment Variables
Click on the service, then go to **Variables** tab and add:

```env
# Database (Supabase)
DATABASE_URL=postgresql://postgres:HYWL7SSfgNFUdRsa@db.ivndncmwohshbvpjbxcx.supabase.co:5432/postgres
SUPABASE_URL=https://ivndncmwohshbvpjbxcx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2bmRuY213b2hzaGJ2cGpieGN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI0NDcxNzMsImV4cCI6MjA0ODAyMzE3M30.EGJQsT34_TdClA7CIdCKPRBJPpPRq5-nQzptQKBF0P0
SUPABASE_PUBLISHABLE_KEY=sb_publishable_OK2HGa4KXUEFL-Y5T-IIOg_lzGXYvm6
SUPABASE_SECRET_KEY=sb_secret_RLSXF1V4bpe8ynDxAmdejA_3FulcqIu

# Telegram Bot
TELEGRAM_BOT_TOKEN=8201265622:AAG3NMF7J2RP49nc4y6rnEG2A-0iaAnW4dA
TELEGRAM_ADMIN_CHAT_ID=42283329
TELEGRAM_ADMIN_USERNAME=@Jamshiddin

# Security
JWT_SECRET=xK9mP3nQ8rT5vW2yA6bC4dF7gH1jL0zX
JWT_ACCESS_TOKEN_EXPIRES_IN=15m
JWT_REFRESH_TOKEN_EXPIRES_IN=7d
BCRYPT_SALT_ROUNDS=12

# Super Admin
SUPER_ADMIN_TELEGRAM_ID=42283329
SUPER_ADMIN_USERNAME=Jamshiddin
SUPER_ADMIN_EMAIL=admin@vendhub.com
SUPER_ADMIN_PASSWORD=VendHub2024!

# Environment
NODE_ENV=production
API_PREFIX=api
API_VERSION=v1

# Features
ENABLE_SCHEDULED_TASKS=true
ENABLE_PROMETHEUS=true
```

### Step 4: Configure Build Settings
In the **Settings** tab:
- **Root Directory**: `/backend`
- **Build Command**: `npm ci --legacy-peer-deps && npm run build`
- **Start Command**: `npm run migration:run && npm run start:prod`

### Step 5: Deploy
1. Click **"Deploy"** button
2. Wait for deployment to complete (5-10 minutes)
3. Once deployed, Railway will provide a URL like: `https://vendhub-manager-production.up.railway.app`

## Option 2: Deploy via CLI (if service exists)

If you already have a service configured, you can deploy using:

```bash
# Navigate to backend
cd backend

# Deploy to specific service (replace SERVICE_NAME with actual service name)
railway up --service SERVICE_NAME

# Or if you need to select interactively
railway up
# Then select the service when prompted
```

## Post-Deployment Steps

### 1. Get Your Railway URL
After deployment, Railway will provide a URL. It will look like:
```
https://vendhub-manager-production.up.railway.app
```

### 2. Set Telegram Webhook
Replace `YOUR_RAILWAY_URL` with your actual Railway URL:

```bash
curl -X POST https://api.telegram.org/bot8201265622:AAG3NMF7J2RP49nc4y6rnEG2A-0iaAnW4dA/setWebhook \
  -H "Content-Type: application/json" \
  -d '{"url": "https://YOUR_RAILWAY_URL.up.railway.app/telegram/webhook"}'
```

### 3. Test the Deployment

#### Health Check
```bash
curl https://YOUR_RAILWAY_URL.up.railway.app/monitoring/health
```

#### API Documentation
Open in browser:
```
https://YOUR_RAILWAY_URL.up.railway.app/api/docs
```

#### Telegram Bot
1. Open Telegram
2. Search for your bot
3. Send `/start` command
4. You should receive a welcome message

### 4. Monitor Logs
In Railway dashboard:
1. Click on your service
2. Go to **Logs** tab
3. Watch real-time logs

## Troubleshooting

### If deployment fails:

1. **Check Build Logs**
   - Look for npm install errors
   - Check TypeScript compilation errors

2. **Common Issues**:
   - Missing environment variables
   - Database connection errors
   - Port binding issues (Railway automatically sets PORT)

3. **Database Connection**
   - Ensure Supabase project is active
   - Check if database URL is correct
   - Verify network connectivity

### If Telegram bot doesn't respond:

1. **Check Webhook**:
```bash
curl https://api.telegram.org/bot8201265622:AAG3NMF7J2RP49nc4y6rnEG2A-0iaAnW4dA/getWebhookInfo
```

2. **Delete and Reset Webhook**:
```bash
# Delete webhook
curl https://api.telegram.org/bot8201265622:AAG3NMF7J2RP49nc4y6rnEG2A-0iaAnW4dA/deleteWebhook

# Set new webhook
curl -X POST https://api.telegram.org/bot8201265622:AAG3NMF7J2RP49nc4y6rnEG2A-0iaAnW4dA/setWebhook \
  -d "url=https://YOUR_RAILWAY_URL.up.railway.app/telegram/webhook"
```

## Additional Resources

- Railway Dashboard: https://railway.app/dashboard
- Railway Docs: https://docs.railway.app
- Project GitHub: https://github.com/jamsmac/VendHub
- Supabase Dashboard: https://app.supabase.com/project/ivndncmwohshbvpjbxcx

## Support

If you encounter issues:
1. Check Railway logs in the dashboard
2. Verify all environment variables are set
3. Ensure database migrations ran successfully
4. Check Telegram webhook status

Your deployment URL will be available in the Railway dashboard once the deployment completes!