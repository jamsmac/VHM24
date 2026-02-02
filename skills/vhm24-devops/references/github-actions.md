# GitHub Actions для VendHub

## CI Pipeline (ci.yml)

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  NODE_VERSION: '20'

jobs:
  # ===========================================
  # Lint & Type Check
  # ===========================================
  lint:
    name: Lint & Type Check
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: |
            backend/package-lock.json
            frontend/package-lock.json

      - name: Install Backend Dependencies
        working-directory: ./backend
        run: npm ci

      - name: Install Frontend Dependencies
        working-directory: ./frontend
        run: npm ci

      - name: Lint Backend
        working-directory: ./backend
        run: npm run lint

      - name: Lint Frontend
        working-directory: ./frontend
        run: npm run lint

      - name: Type Check Backend
        working-directory: ./backend
        run: npm run build

      - name: Type Check Frontend
        working-directory: ./frontend
        run: npm run type-check

  # ===========================================
  # Backend Tests
  # ===========================================
  test-backend:
    name: Backend Tests
    runs-on: ubuntu-latest
    needs: lint

    services:
      postgres:
        image: postgres:14-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: vendhub_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json

      - name: Install Dependencies
        working-directory: ./backend
        run: npm ci

      - name: Run Tests
        working-directory: ./backend
        run: npm run test:cov
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/vendhub_test
          REDIS_URL: redis://localhost:6379
          JWT_SECRET: test-secret
          NODE_ENV: test

      - name: Upload Coverage
        uses: codecov/codecov-action@v4
        with:
          directory: ./backend/coverage
          flags: backend

  # ===========================================
  # Frontend Tests
  # ===========================================
  test-frontend:
    name: Frontend Tests
    runs-on: ubuntu-latest
    needs: lint

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install Dependencies
        working-directory: ./frontend
        run: npm ci

      - name: Run Tests
        working-directory: ./frontend
        run: npm run test:cov

      - name: Upload Coverage
        uses: codecov/codecov-action@v4
        with:
          directory: ./frontend/coverage
          flags: frontend

  # ===========================================
  # Build
  # ===========================================
  build:
    name: Build
    runs-on: ubuntu-latest
    needs: [test-backend, test-frontend]

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: |
            backend/package-lock.json
            frontend/package-lock.json

      - name: Build Backend
        working-directory: ./backend
        run: |
          npm ci
          npm run build

      - name: Build Frontend
        working-directory: ./frontend
        run: |
          npm ci
          npm run build
        env:
          NEXT_PUBLIC_API_URL: ${{ vars.NEXT_PUBLIC_API_URL }}
```

## Deploy Staging (deploy-staging.yml)

```yaml
name: Deploy Staging

on:
  push:
    branches: [develop]

env:
  RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
  VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}

jobs:
  deploy-backend:
    name: Deploy Backend to Railway
    runs-on: ubuntu-latest
    environment: staging

    steps:
      - uses: actions/checkout@v4

      - name: Install Railway CLI
        run: npm install -g @railway/cli

      - name: Deploy to Railway
        working-directory: ./backend
        run: railway up --service backend-staging
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}

      - name: Health Check
        run: |
          sleep 30
          curl -f ${{ vars.STAGING_API_URL }}/health || exit 1

  deploy-frontend:
    name: Deploy Frontend to Vercel
    runs-on: ubuntu-latest
    environment: staging

    steps:
      - uses: actions/checkout@v4

      - name: Install Vercel CLI
        run: npm install -g vercel

      - name: Deploy to Vercel
        working-directory: ./frontend
        run: vercel --token ${{ secrets.VERCEL_TOKEN }} --env staging
```

## Deploy Production (deploy-prod.yml)

```yaml
name: Deploy Production

on:
  release:
    types: [published]
  workflow_dispatch:
    inputs:
      skip_tests:
        description: 'Skip tests (emergency only)'
        required: false
        default: 'false'

jobs:
  # ===========================================
  # Pre-deployment Checks
  # ===========================================
  pre-deploy:
    name: Pre-deployment Checks
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Run Tests
        if: github.event.inputs.skip_tests != 'true'
        run: |
          cd backend && npm ci && npm test
          cd ../frontend && npm ci && npm test

  # ===========================================
  # Deploy Backend
  # ===========================================
  deploy-backend:
    name: Deploy Backend
    runs-on: ubuntu-latest
    needs: pre-deploy
    environment: production

    steps:
      - uses: actions/checkout@v4

      - name: Install Railway CLI
        run: npm install -g @railway/cli

      - name: Run Migrations
        working-directory: ./backend
        run: |
          npm ci
          npm run migration:run
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}

      - name: Deploy to Railway
        working-directory: ./backend
        run: railway up --service backend-prod
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN_PROD }}

      - name: Verify Deployment
        run: |
          sleep 60
          response=$(curl -s -o /dev/null -w "%{http_code}" ${{ vars.PROD_API_URL }}/health)
          if [ $response != "200" ]; then
            echo "Health check failed with status $response"
            exit 1
          fi
          echo "Health check passed"

  # ===========================================
  # Deploy Frontend
  # ===========================================
  deploy-frontend:
    name: Deploy Frontend
    runs-on: ubuntu-latest
    needs: deploy-backend
    environment: production

    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Vercel
        run: |
          npm install -g vercel
          cd frontend && vercel --prod --token ${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

  # ===========================================
  # Post-deployment
  # ===========================================
  post-deploy:
    name: Post-deployment
    runs-on: ubuntu-latest
    needs: [deploy-backend, deploy-frontend]

    steps:
      - name: Notify Telegram
        run: |
          curl -X POST "https://api.telegram.org/bot${{ secrets.TELEGRAM_BOT_TOKEN }}/sendMessage" \
            -d "chat_id=${{ secrets.TELEGRAM_CHAT_ID }}" \
            -d "text=✅ VendHub deployed to production: ${{ github.event.release.tag_name }}"

      - name: Create Sentry Release
        uses: getsentry/action-release@v1
        env:
          SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
          SENTRY_ORG: vendhub
          SENTRY_PROJECT: backend
        with:
          environment: production
          version: ${{ github.event.release.tag_name }}
```

## Secrets для настройки

```bash
# GitHub Secrets (Settings → Secrets and variables → Actions)

# Railway
RAILWAY_TOKEN=xxx              # Railway API token
RAILWAY_TOKEN_PROD=xxx         # Отдельный токен для production

# Vercel
VERCEL_TOKEN=xxx
VERCEL_ORG_ID=xxx
VERCEL_PROJECT_ID=xxx

# Database
DATABASE_URL=postgresql://...   # Production database

# Notifications
TELEGRAM_BOT_TOKEN=xxx
TELEGRAM_CHAT_ID=xxx

# Monitoring
SENTRY_AUTH_TOKEN=xxx
```

## Переменные окружения (vars)

```bash
# GitHub Variables (Settings → Secrets and variables → Actions → Variables)

STAGING_API_URL=https://api-staging.vendhub.uz
PROD_API_URL=https://api.vendhub.uz
NEXT_PUBLIC_API_URL=https://api.vendhub.uz
```
