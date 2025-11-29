# GitHub Actions Workflows Setup

## Overview

This document explains how to manually set up GitHub Actions workflows for VH-M24 since they cannot be committed directly due to GitHub App permissions.

## Workflow Files

Two workflow files have been created and are available in this repository:

1. **CI Workflow** (`.github/workflows/ci.yml`)
   - Runs tests, linting, and build verification
   - Triggers on push to main/develop and pull requests

2. **CD Workflow** (`.github/workflows/deploy.yml`)
   - Deploys to staging and production
   - Triggers on push to main branch

## How to Set Up Workflows

### Option 1: GitHub UI (Recommended)

1. **Create CI Workflow**
   - Go to your repository on GitHub
   - Click **Actions** → **New workflow**
   - Click **set up a workflow yourself**
   - Name it `.github/workflows/ci.yml`
   - Copy content from `CI_WORKFLOW_CONTENT.md`
   - Click **Commit changes**

2. **Create CD Workflow**
   - Click **Actions** → **New workflow**
   - Click **set up a workflow yourself**
   - Name it `.github/workflows/deploy.yml`
   - Copy content from `CD_WORKFLOW_CONTENT.md`
   - Click **Commit changes**

### Option 2: GitHub CLI

```bash
# Create CI workflow
gh workflow run --repo jamsmac/VHM24 << 'EOF'
name: CI - Test & Lint
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
# ... (copy full content)
EOF

# Create CD workflow
gh workflow run --repo jamsmac/VHM24 << 'EOF'
name: CD - Deploy to Production
on:
  push:
    branches: [main]
# ... (copy full content)
EOF
```

### Option 3: Direct File Creation

1. Clone repository locally
2. Create `.github/workflows/ci.yml` with CI workflow content
3. Create `.github/workflows/deploy.yml` with CD workflow content
4. Commit and push:
   ```bash
   git add .github/workflows/
   git commit -m "Add: GitHub Actions CI/CD workflows"
   git push origin main
   ```

## Workflow Content

### CI Workflow (ci.yml)

See file: `CI_WORKFLOW_CONTENT.md` or view in this repository at `.github/workflows/ci.yml`

**Key features:**
- Runs on push to main/develop
- Runs on pull requests
- Tests with MySQL database
- Linting and type checking
- Build verification
- Coverage reporting

### CD Workflow (deploy.yml)

See file: `CD_WORKFLOW_CONTENT.md` or view in this repository at `.github/workflows/deploy.yml`

**Key features:**
- Runs on push to main branch
- Builds Docker images
- Deploys to staging
- Deploys to production
- Automatic rollback on failure
- Telegram notifications

## Required Secrets

Before workflows can run, add these secrets to your repository:

### GitHub UI
1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add each secret:

```
STAGING_DEPLOY_KEY
STAGING_DEPLOY_HOST
STAGING_DEPLOY_USER
STAGING_DEPLOY_PATH
PROD_DEPLOY_KEY
PROD_DEPLOY_HOST
PROD_DEPLOY_USER
PROD_DEPLOY_PATH
TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID
```

### GitHub CLI
```bash
gh secret set STAGING_DEPLOY_KEY --repo jamsmac/VHM24 < /path/to/key
gh secret set STAGING_DEPLOY_HOST --repo jamsmac/VHM24 -b "staging.example.com"
# ... repeat for other secrets
```

## Verification

### Check Workflows Are Enabled

1. Go to **Actions** tab
2. Should see "CI - Test & Lint" and "CD - Deploy to Production"
3. Both should show as "Active"

### Test CI Workflow

1. Create a test branch
2. Make a small change
3. Push to test branch
4. Create pull request
5. CI should run automatically

### Test CD Workflow

1. Merge PR to main branch
2. CD should run automatically
3. Check **Actions** tab for progress
4. Should see deployment steps

## Troubleshooting

### Workflows Not Showing

**Problem:** Workflows don't appear in Actions tab  
**Solution:**
1. Refresh page (Ctrl+F5)
2. Check if workflows are committed to `.github/workflows/`
3. Verify file names end with `.yml`

### Workflows Disabled

**Problem:** Workflows show as disabled  
**Solution:**
1. Go to **Settings** → **Actions** → **General**
2. Select "Allow all actions and reusable workflows"
3. Click **Save**

### Secrets Not Available

**Problem:** Workflow fails with "secret not found"  
**Solution:**
1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Verify all required secrets are added
3. Check secret names match exactly (case-sensitive)

### SSH Connection Fails

**Problem:** Deployment fails with SSH error  
**Solution:**
1. Verify SSH key is correct
2. Check server firewall allows SSH
3. Verify SSH user exists on server
4. Test manually: `ssh -i key user@host`

## Next Steps

1. **Set up workflows** using one of the methods above
2. **Add required secrets** from SECRETS_TEMPLATE.md
3. **Configure deployment servers** using DEPLOYMENT_GUIDE.md
4. **Test workflows** by pushing code to main branch
5. **Monitor deployments** in Actions tab

## Support

For detailed information:
- **Deployment Guide:** See `DEPLOYMENT_GUIDE.md`
- **CI/CD Documentation:** See `CI_CD_DOCUMENTATION.md`
- **Secrets Template:** See `.github/SECRETS_TEMPLATE.md`

---

**Last Updated:** 2025-11-29  
**Status:** Ready for Setup
