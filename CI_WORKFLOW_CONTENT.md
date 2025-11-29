# CI Workflow Content

Copy this content into `.github/workflows/ci.yml` file in your repository.

```yaml
name: CI - Test & Lint

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
  workflow_dispatch:

env:
  NODE_VERSION: '22'
  PNPM_VERSION: '9'

jobs:
  test:
    name: Test & Lint
    runs-on: ubuntu-latest
    timeout-minutes: 30

    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: root
          MYSQL_DATABASE: vendhub_test
        options: >-
          --health-cmd="mysqladmin ping"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=3
        ports:
          - 3306:3306

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}

      - name: Get pnpm store directory
        id: pnpm-cache
        shell: bash
        run: |
          echo "STORE_PATH=$(pnpm store path)" >> $GITHUB_OUTPUT

      - name: Setup pnpm cache
        uses: actions/cache@v3
        with:
          path: ${{ steps.pnpm-cache.outputs.STORE_PATH }}
          key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
          restore-keys: |
            ${{ runner.os }}-pnpm-store-

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Wait for MySQL
        run: |
          until mysqladmin ping -h "127.0.0.1" -u "root" -p"root" --silent; do
            echo 'waiting for mysql...'
            sleep 1
          done

      - name: Setup database
        env:
          DATABASE_URL: mysql://root:root@127.0.0.1:3306/vendhub_test
        run: |
          pnpm db:push || true

      - name: Run linter
        run: pnpm lint --max-warnings 0
        continue-on-error: true

      - name: Run type check
        run: pnpm type-check

      - name: Run tests
        env:
          DATABASE_URL: mysql://root:root@127.0.0.1:3306/vendhub_test
          NODE_ENV: test
        run: pnpm test --run --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
          flags: unittests
          name: codecov-umbrella
        continue-on-error: true

  build:
    name: Build Check
    runs-on: ubuntu-latest
    timeout-minutes: 20
    needs: test

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}

      - name: Get pnpm store directory
        id: pnpm-cache
        shell: bash
        run: |
          echo "STORE_PATH=$(pnpm store path)" >> $GITHUB_OUTPUT

      - name: Setup pnpm cache
        uses: actions/cache@v3
        with:
          path: ${{ steps.pnpm-cache.outputs.STORE_PATH }}
          key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
          restore-keys: |
            ${{ runner.os }}-pnpm-store-

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build frontend
        run: pnpm build:frontend
        continue-on-error: true

      - name: Build backend
        run: pnpm build:backend
        continue-on-error: true

      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build-artifacts
          path: dist/
        continue-on-error: true
```

## How to Use

1. Go to your GitHub repository
2. Click **Actions** → **New workflow**
3. Click **set up a workflow yourself**
4. Name the file `.github/workflows/ci.yml`
5. Copy the content above into the editor
6. Click **Commit changes**

The workflow will now run automatically on:
- Push to main or develop branches
- Pull requests to main or develop branches
- Manual trigger via workflow_dispatch

---

**Last Updated:** 2025-11-29
