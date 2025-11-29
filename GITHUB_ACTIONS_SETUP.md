# GitHub Actions CI/CD Setup Guide for VH-M24

## Overview

This guide explains how to set up GitHub Actions workflows for automated testing, building, and deployment to Railway. The CI/CD pipeline ensures code quality, runs tests, and automatically deploys to production.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│              GitHub Actions CI/CD Pipeline              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. Developer pushes code to main branch                │
│                ↓                                        │
│  2. GitHub Actions triggered automatically             │
│                ↓                                        │
│  3. CI Workflow: Test & Build                          │
│     - Install dependencies                             │
│     - Run linting                                       │
│     - Run unit tests                                    │
│     - Build application                                │
│     - Upload artifacts                                 │
│                ↓                                        │
│  4. CD Workflow: Deploy to Railway                      │
│     - Deploy to staging (if tests pass)                │
│     - Run integration tests                            │
│     - Deploy to production                             │
│     - Verify deployment                                │
│     - Notify team                                      │
│                ↓                                        │
│  5. Monitoring: Track deployment                       │
│     - Health checks                                    │
│     - Error monitoring                                 │
│     - Performance tracking                             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Part 1: GitHub Setup

### 1.1 Create GitHub Secrets

1. Go to **GitHub Repository** → **Settings** → **Secrets and variables** → **Actions**
2. Create the following secrets:

| Secret | Value | Source |
|--------|-------|--------|
| `RAILWAY_TOKEN` | Railway API token | Railway Dashboard |
| `RAILWAY_PROJECT_ID` | Railway project ID | Railway Dashboard |
| `SUPABASE_URL` | Supabase project URL | Supabase Dashboard |
| `SUPABASE_KEY` | Supabase API key | Supabase Dashboard |
| `DATABASE_URL` | PostgreSQL connection string | Supabase |
| `JWT_SECRET` | JWT secret key | Generate |
| `ANTHROPIC_API_KEY` | Anthropic API key | Anthropic Console |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token | Telegram BotFather |
| `TELEGRAM_OWNER_ID` | Telegram owner ID | Your account |
| `SLACK_WEBHOOK` | Slack webhook URL | Slack App |
| `DOCKER_USERNAME` | Docker Hub username | Docker Hub |
| `DOCKER_PASSWORD` | Docker Hub password | Docker Hub |

### 1.2 Get Railway Token

1. Go to **Railway Dashboard** → **Account** → **API Tokens**
2. Click **Create Token**
3. Name it: `GitHub Actions`
4. Copy token
5. Add to GitHub Secrets as `RAILWAY_TOKEN`

### 1.3 Get Railway Project ID

1. Go to **Railway Dashboard** → **VH-M24 Project**
2. Go to **Settings** → **General**
3. Copy **Project ID**
4. Add to GitHub Secrets as `RAILWAY_PROJECT_ID`

### 1.4 Get Supabase Credentials

1. Go to **Supabase Dashboard** → **Settings** → **API**
2. Copy **Project URL**
3. Copy **API Key** (anon or service_role)
4. Add to GitHub Secrets

## Part 2: CI Workflow (Testing & Building)

### 2.1 Create CI Workflow File

Create `.github/workflows/ci.yml`:

```yaml
name: CI - Test & Build

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: vendhub_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'

      - name: Install pnpm
        run: npm install -g pnpm@9

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run linting
        run: pnpm lint

      - name: Run type checking
        run: pnpm type-check

      - name: Run tests
        run: pnpm test
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/vendhub_test
          JWT_SECRET: test-secret-key-for-ci
          NODE_ENV: test

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
          flags: unittests
          name: codecov-umbrella

      - name: Build application
        run: pnpm build
        env:
          NODE_ENV: production
          VITE_APP_TITLE: VendHub Manager
          VITE_APP_LOGO: https://example.com/logo.png

      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build
          path: dist/
          retention-days: 1

  lint:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'

      - name: Install pnpm
        run: npm install -g pnpm@9

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run ESLint
        run: pnpm lint:eslint

      - name: Run Prettier
        run: pnpm lint:prettier

  security:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Run Gitleaks
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Run npm audit
        run: npm audit --audit-level=moderate
        continue-on-error: true
```

### 2.2 Workflow Explanation

**Triggers:**
- Push to `main` or `develop` branch
- Pull requests to `main` or `develop` branch

**Jobs:**

1. **Test Job:**
   - Runs on Ubuntu latest
   - Sets up PostgreSQL service container
   - Installs dependencies
   - Runs linting
   - Runs type checking
   - Runs unit tests
   - Uploads coverage to Codecov
   - Builds application
   - Uploads build artifacts

2. **Lint Job:**
   - Runs ESLint
   - Runs Prettier
   - Checks code formatting

3. **Security Job:**
   - Runs Gitleaks (detects secrets)
   - Runs npm audit (checks dependencies)

## Part 3: CD Workflow (Deployment)

### 3.1 Create CD Workflow File

Create `.github/workflows/deploy.yml`:

```yaml
name: CD - Deploy to Railway

on:
  push:
    branches: [ main ]
  workflow_run:
    workflows: [ "CI - Test & Build" ]
    types: [ completed ]
    branches: [ main ]

jobs:
  deploy-staging:
    if: github.event.workflow_run.conclusion == 'success' || github.event_name == 'push'
    runs-on: ubuntu-latest
    environment: staging
    
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Railway Staging
        run: |
          curl -X POST https://api.railway.app/graphql \
            -H "Authorization: Bearer ${{ secrets.RAILWAY_TOKEN }}" \
            -H "Content-Type: application/json" \
            -d '{
              "query": "mutation { deploymentCreate(input: {projectId: \"${{ secrets.RAILWAY_PROJECT_ID }}\", environmentId: \"staging\"}) { id } }"
            }'

      - name: Wait for deployment
        run: sleep 60

      - name: Run health check
        run: |
          curl -f https://staging-vendhub.railway.app/api/health/check || exit 1

      - name: Run smoke tests
        run: |
          curl -f https://staging-vendhub.railway.app/api/health/ready || exit 1

      - name: Notify Slack
        if: success()
        uses: slackapi/slack-github-action@v1.24.0
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK }}
          payload: |
            {
              "text": "✅ Deployed to staging successfully",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Deployment to Staging Successful*\n*Commit:* ${{ github.sha }}\n*Author:* ${{ github.actor }}"
                  }
                }
              ]
            }

      - name: Notify Slack on failure
        if: failure()
        uses: slackapi/slack-github-action@v1.24.0
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK }}
          payload: |
            {
              "text": "❌ Staging deployment failed",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Staging Deployment Failed*\n*Commit:* ${{ github.sha }}\n*Author:* ${{ github.actor }}"
                  }
                }
              ]
            }

  deploy-production:
    needs: deploy-staging
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    environment: production
    
    steps:
      - uses: actions/checkout@v4

      - name: Create deployment
        uses: actions/github-script@v7
        with:
          script: |
            const deployment = await github.rest.repos.createDeployment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              ref: context.sha,
              environment: 'production',
              required_contexts: [],
              auto_merge: false
            });
            core.setOutput('deployment_id', deployment.data.id);

      - name: Deploy to Railway Production
        run: |
          curl -X POST https://api.railway.app/graphql \
            -H "Authorization: Bearer ${{ secrets.RAILWAY_TOKEN }}" \
            -H "Content-Type: application/json" \
            -d '{
              "query": "mutation { deploymentCreate(input: {projectId: \"${{ secrets.RAILWAY_PROJECT_ID }}\", environmentId: \"production\"}) { id } }"
            }'

      - name: Wait for deployment
        run: sleep 120

      - name: Run health check
        run: |
          for i in {1..10}; do
            curl -f https://vendhub.yourdomain.com/api/health/check && break || sleep 10
          done

      - name: Run smoke tests
        run: |
          curl -f https://vendhub.yourdomain.com/api/health/ready || exit 1
          curl -f https://vendhub.yourdomain.com/api/health/live || exit 1

      - name: Verify database
        run: |
          curl -X POST https://vendhub.yourdomain.com/api/trpc/health.check \
            -H "Content-Type: application/json" | jq .

      - name: Update deployment status
        if: success()
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.repos.createDeploymentStatus({
              owner: context.repo.owner,
              repo: context.repo.repo,
              deployment_id: ${{ steps.create_deployment.outputs.deployment_id }},
              state: 'success',
              environment_url: 'https://vendhub.yourdomain.com',
              description: 'Production deployment successful'
            });

      - name: Notify Slack
        if: success()
        uses: slackapi/slack-github-action@v1.24.0
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK }}
          payload: |
            {
              "text": "✅ Deployed to production successfully",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Production Deployment Successful*\n*Commit:* ${{ github.sha }}\n*Author:* ${{ github.actor }}\n*URL:* https://vendhub.yourdomain.com"
                  }
                }
              ]
            }

      - name: Notify Slack on failure
        if: failure()
        uses: slackapi/slack-github-action@v1.24.0
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK }}
          payload: |
            {
              "text": "❌ Production deployment failed",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Production Deployment Failed*\n*Commit:* ${{ github.sha }}\n*Author:* ${{ github.actor }}\n*Action:* https://github.com/${{ github.repository }}/actions/runs/${{ github.run_id }}"
                  }
                }
              ]
            }

      - name: Rollback on failure
        if: failure()
        run: |
          echo "Initiating rollback to previous deployment..."
          # Add rollback logic here
          # curl -X POST https://api.railway.app/graphql ...

  notify:
    if: always()
    needs: [ deploy-staging, deploy-production ]
    runs-on: ubuntu-latest
    
    steps:
      - name: Send summary
        uses: actions/github-script@v7
        with:
          script: |
            const status = '${{ needs.deploy-production.result }}' === 'success' ? '✅ Success' : '❌ Failed';
            console.log(`Deployment ${status}`);
```

## Part 4: Manual Workflow Triggers

### 4.1 Create Manual Deployment Workflow

Create `.github/workflows/manual-deploy.yml`:

```yaml
name: Manual Deploy

on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to deploy to'
        required: true
        default: 'staging'
        type: choice
        options:
          - staging
          - production
      version:
        description: 'Version to deploy'
        required: false
        type: string

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: ${{ github.event.inputs.environment }}
    
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to ${{ github.event.inputs.environment }}
        run: |
          echo "Deploying version ${{ github.event.inputs.version || 'latest' }} to ${{ github.event.inputs.environment }}"
          # Add deployment logic here

      - name: Verify deployment
        run: |
          curl -f https://${{ github.event.inputs.environment }}-vendhub.railway.app/api/health/check || exit 1
```

## Part 5: Setup Instructions

### 5.1 Create Workflows Directory

```bash
mkdir -p .github/workflows
```

### 5.2 Add Workflow Files

1. Create `.github/workflows/ci.yml` with CI workflow content
2. Create `.github/workflows/deploy.yml` with CD workflow content
3. Create `.github/workflows/manual-deploy.yml` with manual deployment workflow

### 5.3 Commit Workflows

```bash
git add .github/workflows/
git commit -m "Add: GitHub Actions CI/CD workflows"
git push origin main
```

### 5.4 Verify Workflows

1. Go to **GitHub Repository** → **Actions**
2. Verify workflows appear in list
3. Check workflow status
4. View workflow logs

## Part 6: Workflow Configuration

### 6.1 Update Workflow Variables

Replace these values in workflows:

| Variable | Value |
|----------|-------|
| `staging-vendhub.railway.app` | Your staging domain |
| `vendhub.yourdomain.com` | Your production domain |
| `${{ secrets.SLACK_WEBHOOK }}` | Your Slack webhook URL |

### 6.2 Configure Environments

1. Go to **Settings** → **Environments**
2. Create `staging` environment
3. Create `production` environment
4. Add required reviewers for production
5. Set deployment branches

## Part 7: Testing Workflows

### 7.1 Test CI Workflow

1. Create feature branch: `git checkout -b test-ci`
2. Make code change
3. Push to GitHub: `git push origin test-ci`
4. Create pull request
5. Watch CI workflow run
6. Verify tests pass

### 7.2 Test CD Workflow

1. Merge PR to main
2. Watch CD workflow run
3. Verify staging deployment
4. Verify production deployment
5. Check application health

### 7.3 Test Manual Deployment

1. Go to **Actions** → **Manual Deploy**
2. Click **Run workflow**
3. Select environment
4. Click **Run workflow**
5. Monitor deployment

## Part 8: Troubleshooting

### Workflow Fails to Run

**Problem:** Workflow doesn't trigger

**Solution:**
1. Check workflow file syntax
2. Verify branch name matches trigger
3. Check secrets are configured
4. View workflow logs

### Deployment Fails

**Problem:** Deployment step fails

**Solution:**
1. Check Railway token is valid
2. Verify project ID is correct
3. Check environment variables
4. View deployment logs

### Health Check Fails

**Problem:** Health check fails after deployment

**Solution:**
1. Verify application started
2. Check database connection
3. View application logs
4. Rollback deployment

## Part 9: Best Practices

### 9.1 Workflow Best Practices

- Keep workflows simple and focused
- Use reusable workflows for common tasks
- Cache dependencies to speed up builds
- Limit concurrent jobs to reduce costs
- Use environments for multi-stage deployments
- Require approvals for production deployments
- Notify team on deployment status

### 9.2 Security Best Practices

- Use GitHub Secrets for sensitive data
- Limit secret access to required workflows
- Rotate secrets regularly
- Use least-privilege access
- Enable branch protection rules
- Require status checks before merge
- Enable CODEOWNERS for code review

### 9.3 Monitoring Best Practices

- Monitor workflow execution time
- Track success/failure rates
- Set up alerts for failures
- Review logs regularly
- Optimize slow workflows
- Document workflow decisions
- Keep workflows updated

## Support & Resources

- **GitHub Actions Docs:** https://docs.github.com/en/actions
- **GitHub Secrets:** https://docs.github.com/en/actions/security-guides/encrypted-secrets
- **Railway API:** https://docs.railway.app/reference/api
- **Slack Webhooks:** https://api.slack.com/messaging/webhooks

---

**Last Updated:** 2025-11-29  
**Status:** Ready for Implementation  
**Estimated Setup Time:** 30 minutes  
**Estimated First Deployment:** 5-10 minutes
