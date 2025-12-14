# VH-M24 Deployment Guide

## GitHub Actions CI/CD Setup

This guide explains how to set up GitHub Actions for automated testing and deployment of VH-M24.

## Workflows Overview

### 1. CI Workflow (ci.yml)
**Trigger:** Push to main/develop, Pull Requests  
**Steps:**
- Install dependencies
- Run linter
- Run type checking
- Run tests with coverage
- Build verification

### 2. CD Workflow (deploy.yml)
**Trigger:** Push to main branch  
**Steps:**
- Pre-deployment checks
- Build Docker images
- Deploy to staging
- Run smoke tests
- Deploy to production
- Automatic rollback on failure

## Required Secrets

### GitHub Repository Secrets

Add these secrets in: **Settings → Secrets and variables → Actions**

#### Staging Deployment
```
STAGING_DEPLOY_KEY          # SSH private key for staging server
STAGING_DEPLOY_HOST         # Staging server hostname/IP
STAGING_DEPLOY_USER         # SSH user for staging
STAGING_DEPLOY_PATH         # Deployment path on staging
```

#### Production Deployment
```
PROD_DEPLOY_KEY             # SSH private key for production server
PROD_DEPLOY_HOST            # Production server hostname/IP
PROD_DEPLOY_USER            # SSH user for production
PROD_DEPLOY_PATH            # Deployment path on production
```

#### Notifications
```
TELEGRAM_BOT_TOKEN          # Telegram bot token for notifications
TELEGRAM_CHAT_ID            # Telegram chat ID for notifications
```

### Environment Variables

Create `.env.production` file on deployment servers:
```bash
NODE_ENV=production
DATABASE_URL=mysql://user:password@localhost:3306/vendhub
JWT_SECRET=your-secret-key
ANTHROPIC_API_KEY=your-api-key
TELEGRAM_BOT_TOKEN=your-token
TELEGRAM_OWNER_ID=your-id
```

## Setting Up Deployment Servers

### Prerequisites
- Node.js 22+
- pnpm 9+
- MySQL 8.0+
- PM2 (process manager)
- SSH access

### Server Setup

1. **Create deployment user:**
```bash
sudo useradd -m -s /bin/bash vendhub
sudo usermod -aG sudo vendhub
```

2. **Set up SSH key:**
```bash
# On your local machine
ssh-keygen -t ed25519 -f vendhub-deploy-key -N ""

# On server
mkdir -p ~/.ssh
cat vendhub-deploy-key.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

3. **Clone repository:**
```bash
cd /home/vendhub
git clone https://github.com/jamsmac/VHM24.git
cd VHM24
```

4. **Install dependencies:**
```bash
pnpm install --frozen-lockfile
```

5. **Set up database:**
```bash
pnpm db:push
```

6. **Configure PM2:**
```bash
pm2 start npm --name vendhub -- start
pm2 save
pm2 startup
```

7. **Set up Nginx reverse proxy:**
```nginx
server {
    listen 80;
    server_name vendhub.local;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## GitHub Actions Configuration

### 1. Add Secrets

Go to: **Settings → Secrets and variables → Actions → New repository secret**

Example for staging:
```
Name: STAGING_DEPLOY_HOST
Value: staging.example.com

Name: STAGING_DEPLOY_USER
Value: vendhub

Name: STAGING_DEPLOY_PATH
Value: /home/vendhub/VHM24
```

### 2. Add Environments (Optional)

Go to: **Settings → Environments**

Create two environments:
- `staging` - for staging deployments
- `production` - for production deployments

Add protection rules:
- Required reviewers for production
- Deployment branches (main only)

### 3. Enable Actions

Go to: **Settings → Actions → General**
- Enable "Actions"
- Allow all actions and reusable workflows

## Deployment Process

### Automatic Deployment (Main Branch)
1. Push code to `main` branch
2. CI workflow runs (tests, linting, build)
3. If CI passes, CD workflow starts
4. Deploys to staging
5. Runs smoke tests
6. If staging passes, deploys to production
7. Sends Telegram notification

### Manual Deployment
1. Go to **Actions → CD - Deploy to Production**
2. Click **Run workflow**
3. Select environment (staging/production)
4. Click **Run workflow**

## Monitoring Deployments

### View Workflow Status
1. Go to **Actions** tab
2. Click on workflow run
3. View logs for each job

### Check Deployment Logs
```bash
# On server
pm2 logs vendhub
pm2 logs vendhub-staging
```

### Telegram Notifications
Receive deployment status notifications in Telegram:
- ✅ Deployment successful
- ❌ Deployment failed
- Commit info and author

## Rollback Procedure

### Automatic Rollback
If production deployment fails, automatic rollback is triggered:
1. Previous backup is restored
2. PM2 restarts application
3. Notification sent to Telegram

### Manual Rollback
```bash
# On production server
cd /home/vendhub/VHM24
bash scripts/deployment/rollback.sh
```

## Troubleshooting

### CI Workflow Fails
1. Check test logs in Actions
2. Run tests locally: `pnpm test`
3. Fix issues and push again

### CD Workflow Fails
1. Check SSH connection: `ssh -i key user@host`
2. Verify secrets are set correctly
3. Check server logs: `pm2 logs`
4. Manual rollback if needed

### Deployment Hangs
1. Check server resources: `top`, `df -h`
2. Check database connection
3. Kill hung processes: `pm2 kill`
4. Restart: `pm2 start all`

### Telegram Notifications Not Working
1. Verify `TELEGRAM_BOT_TOKEN` is correct
2. Verify `TELEGRAM_CHAT_ID` is correct
3. Test manually:
```bash
curl -X POST "https://api.telegram.org/bot$TOKEN/sendMessage" \
  -d "chat_id=$CHAT_ID" \
  -d "text=Test"
```

## Best Practices

1. **Always test locally first**
   ```bash
   pnpm test
   pnpm build
   ```

2. **Use feature branches for development**
   ```bash
   git checkout -b feature/my-feature
   ```

3. **Create pull requests for code review**
   - CI runs automatically
   - Review before merging to main

4. **Monitor production after deployment**
   - Check logs: `pm2 logs`
   - Monitor resources: `top`
   - Check application health

5. **Keep backups current**
   - Automated backup before each deploy
   - Manual backup before major changes
   - Test restore procedure regularly

## Useful Commands

### Local Testing
```bash
# Run tests
pnpm test

# Run specific test file
pnpm test server/auth.logout.test.ts

# Run with coverage
pnpm test --coverage

# Type check
pnpm type-check

# Lint
pnpm lint
```

### Server Management
```bash
# View processes
pm2 list

# View logs
pm2 logs vendhub

# Restart
pm2 restart vendhub

# Stop
pm2 stop vendhub

# Delete
pm2 delete vendhub
```

### Database
```bash
# Push migrations
pnpm db:push

# Generate migrations
pnpm db:generate

# View schema
pnpm db:studio
```

## Support

For issues or questions:
1. Check GitHub Actions logs
2. Review deployment guide
3. Check server logs
4. Contact repository maintainer

---

**Last Updated:** 2025-11-29  
**Version:** 1.0  
**Status:** Production Ready
