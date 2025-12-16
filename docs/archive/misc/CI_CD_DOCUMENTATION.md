# VH-M24 CI/CD Documentation

## Overview

VH-M24 uses GitHub Actions for continuous integration and continuous deployment (CI/CD). This document explains the workflows and how to use them.

## Workflows

### 1. CI Workflow (ci.yml)

**Purpose:** Automated testing, linting, and build verification  
**Trigger:** 
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`
- Manual trigger via workflow_dispatch

**Jobs:**
1. **test** - Run tests and linting
   - Install dependencies
   - Setup MySQL test database
   - Run linter (ESLint)
   - Run type checking (TypeScript)
   - Run tests with coverage
   - Upload coverage to Codecov
   - Comment PR with results

2. **build** - Verify build succeeds
   - Install dependencies
   - Build frontend
   - Build backend
   - Upload build artifacts

**Duration:** ~15-20 minutes

**Status Badge:**
```markdown
![CI](https://github.com/jamsmac/VHM24/actions/workflows/ci.yml/badge.svg)
```

### 2. CD Workflow (deploy.yml)

**Purpose:** Automated deployment to staging and production  
**Trigger:**
- Push to `main` branch (automatic)
- Manual trigger via workflow_dispatch

**Jobs:**
1. **deploy-check** - Pre-deployment validation
   - Verify CI passed
   - Check branch and event type

2. **build-and-push** - Build Docker images
   - Setup Docker Buildx
   - Login to container registry
   - Build and push Docker image
   - Tag with commit SHA and branch

3. **deploy-staging** - Deploy to staging environment
   - SSH to staging server
   - Pull latest code
   - Install dependencies
   - Run database migrations
   - Build application
   - Restart with PM2
   - Run smoke tests

4. **deploy-production** - Deploy to production
   - Create deployment record
   - Backup database and files
   - SSH to production server
   - Pull latest code
   - Install dependencies
   - Run database migrations
   - Build application
   - Restart with PM2
   - Run smoke tests
   - Auto-rollback on failure

5. **notify** - Send notifications
   - Send Telegram notification
   - Create deployment summary

**Duration:** ~30-45 minutes

## Workflow Files

### Location
```
.github/workflows/
├── ci.yml          # Testing and linting
└── deploy.yml      # Deployment
```

### Configuration

Both workflows use environment variables:
```yaml
env:
  NODE_VERSION: '22'
  PNPM_VERSION: '9'
```

## Deployment Flow

```
Push to main
    ↓
CI Workflow (Test & Lint)
    ↓
    ├─ Tests Pass? ✅
    │   ↓
    │   Build & Push Docker
    │   ↓
    │   Deploy to Staging
    │   ↓
    │   Smoke Tests Pass? ✅
    │   ↓
    │   Deploy to Production
    │   ↓
    │   Smoke Tests Pass? ✅
    │   ↓
    │   ✅ Success! Send Notification
    │
    └─ Tests Fail? ❌
        ↓
        ❌ Stop, Send Notification
```

## Monitoring Workflows

### View Workflow Status

1. Go to **Actions** tab in GitHub
2. Click on workflow name (CI or Deploy)
3. Click on workflow run
4. View job details and logs

### Real-time Logs

```bash
# View workflow logs in terminal
gh run list --repo jamsmac/VHM24
gh run view <RUN_ID> --repo jamsmac/VHM24
```

### Workflow Statistics

```bash
# Get workflow stats
gh api repos/jamsmac/VHM24/actions/workflows
```

## Manual Workflow Trigger

### Via GitHub UI

1. Go to **Actions** tab
2. Select workflow (CI or Deploy)
3. Click **Run workflow**
4. Select branch and options
5. Click **Run workflow**

### Via GitHub CLI

```bash
# Trigger CI workflow
gh workflow run ci.yml --repo jamsmac/VHM24

# Trigger deploy workflow
gh workflow run deploy.yml --repo jamsmac/VHM24 -f environment=production
```

## Workflow Artifacts

### Build Artifacts

Uploaded after successful build:
- `dist/` - Compiled frontend and backend
- `coverage/` - Test coverage reports

**Download:**
1. Go to workflow run
2. Click **Artifacts**
3. Download desired artifact

### Logs

Available for each job:
- Setup logs
- Build logs
- Test logs
- Deployment logs

**View:**
1. Click on job name
2. Expand step to view logs

## Environment Variables

### CI Workflow
```yaml
NODE_VERSION: '22'
PNPM_VERSION: '9'
DATABASE_URL: mysql://root:root@127.0.0.1:3306/vendhub_test
NODE_ENV: test
```

### CD Workflow
```yaml
NODE_VERSION: '22'
PNPM_VERSION: '9'
REGISTRY: ghcr.io
```

## Secrets Used

### CI Workflow
- None required (uses public services)

### CD Workflow
- `STAGING_DEPLOY_KEY` - SSH key for staging
- `STAGING_DEPLOY_HOST` - Staging server
- `STAGING_DEPLOY_USER` - Staging SSH user
- `STAGING_DEPLOY_PATH` - Staging deploy path
- `PROD_DEPLOY_KEY` - SSH key for production
- `PROD_DEPLOY_HOST` - Production server
- `PROD_DEPLOY_USER` - Production SSH user
- `PROD_DEPLOY_PATH` - Production deploy path
- `TELEGRAM_BOT_TOKEN` - Telegram notifications
- `TELEGRAM_CHAT_ID` - Telegram chat ID

## Troubleshooting

### CI Workflow Fails

**Problem:** Tests failing  
**Solution:**
1. Check test logs in workflow
2. Run tests locally: `pnpm test`
3. Fix issues and push again

**Problem:** Build fails  
**Solution:**
1. Check build logs
2. Run build locally: `pnpm build`
3. Check for TypeScript errors: `pnpm type-check`

### CD Workflow Fails

**Problem:** SSH connection fails  
**Solution:**
1. Verify SSH key is correct
2. Check server firewall rules
3. Verify SSH user exists
4. Test manually: `ssh -i key user@host`

**Problem:** Database migration fails  
**Solution:**
1. Check database connection
2. Verify database exists
3. Check migration files
4. Manual rollback if needed

**Problem:** Application fails to start  
**Solution:**
1. Check application logs: `pm2 logs`
2. Verify environment variables
3. Check port availability
4. Auto-rollback should trigger

### Notifications Not Received

**Problem:** No Telegram notification  
**Solution:**
1. Verify bot token is correct
2. Verify chat ID is correct
3. Check bot is not blocked
4. Test manually with curl

## Best Practices

1. **Always test locally before pushing**
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

4. **Monitor deployments**
   - Watch Actions tab during deployment
   - Check Telegram notifications
   - Monitor server logs after deployment

5. **Keep secrets secure**
   - Never commit secrets
   - Rotate secrets regularly
   - Use strong SSH keys

## Performance Optimization

### Cache Dependencies
Workflows cache pnpm dependencies to speed up subsequent runs:
```yaml
- name: Setup pnpm cache
  uses: actions/cache@v3
  with:
    path: ${{ steps.pnpm-cache.outputs.STORE_PATH }}
    key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
```

### Parallel Jobs
Multiple jobs run in parallel:
- `test` and `build` run sequentially
- `deploy-staging` and `deploy-production` run sequentially
- `notify` runs after both deployments

### Docker Layer Caching
Docker builds use layer caching for faster builds:
```yaml
cache-from: type=registry,ref=${{ env.REGISTRY }}/${{ github.repository }}:buildcache
cache-to: type=registry,ref=${{ env.REGISTRY }}/${{ github.repository }}:buildcache,mode=max
```

## Useful Commands

### View Workflow Runs
```bash
gh run list --repo jamsmac/VHM24 --limit 10
```

### View Specific Run
```bash
gh run view <RUN_ID> --repo jamsmac/VHM24
```

### Download Artifacts
```bash
gh run download <RUN_ID> --repo jamsmac/VHM24
```

### View Logs
```bash
gh run view <RUN_ID> --log --repo jamsmac/VHM24
```

### Cancel Run
```bash
gh run cancel <RUN_ID> --repo jamsmac/VHM24
```

## Support

For issues or questions:
1. Check GitHub Actions logs
2. Review this documentation
3. Check deployment guide
4. Contact repository maintainer

---

**Last Updated:** 2025-11-29  
**Version:** 1.0  
**Status:** Production Ready
