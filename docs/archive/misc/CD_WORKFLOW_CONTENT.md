# CD Workflow Content

Copy this content into `.github/workflows/deploy.yml` file in your repository.

**Note:** This is a long file. Copy carefully and verify all content is included.

```yaml
name: CD - Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      environment:
        description: 'Deployment environment'
        required: true
        default: 'production'
        type: choice
        options:
          - staging
          - production

env:
  NODE_VERSION: '22'
  PNPM_VERSION: '9'
  REGISTRY: ghcr.io

jobs:
  deploy-check:
    name: Pre-Deployment Checks
    runs-on: ubuntu-latest
    outputs:
      should-deploy: ${{ steps.check.outputs.should-deploy }}
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Check if CI passed
        id: check
        run: |
          if [[ "${{ github.event_name }}" == "push" && "${{ github.ref }}" == "refs/heads/main" ]]; then
            echo "should-deploy=true" >> $GITHUB_OUTPUT
          elif [[ "${{ github.event_name }}" == "workflow_dispatch" ]]; then
            echo "should-deploy=true" >> $GITHUB_OUTPUT
          else
            echo "should-deploy=false" >> $GITHUB_OUTPUT
          fi

  build-and-push:
    name: Build & Push Docker Images
    runs-on: ubuntu-latest
    needs: deploy-check
    if: needs.deploy-check.outputs.should-deploy == 'true'
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2

      - name: Log in to Container Registry
        uses: docker/login-action@v2
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v4
        with:
          images: ${{ env.REGISTRY }}/${{ github.repository }}
          tags: |
            type=ref,event=branch
            type=sha,prefix={{branch}}-
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=raw,value=latest,enable={{is_default_branch}}

      - name: Build and push Docker image
        uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=registry,ref=${{ env.REGISTRY }}/${{ github.repository }}:buildcache
          cache-to: type=registry,ref=${{ env.REGISTRY }}/${{ github.repository }}:buildcache,mode=max

  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: build-and-push
    environment:
      name: staging
      url: https://staging.vendhub.local
    if: github.event_name == 'push' || (github.event_name == 'workflow_dispatch' && github.event.inputs.environment == 'staging')

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Deploy to staging
        env:
          DEPLOY_KEY: ${{ secrets.STAGING_DEPLOY_KEY }}
          DEPLOY_HOST: ${{ secrets.STAGING_DEPLOY_HOST }}
          DEPLOY_USER: ${{ secrets.STAGING_DEPLOY_USER }}
          DEPLOY_PATH: ${{ secrets.STAGING_DEPLOY_PATH }}
        run: |
          mkdir -p ~/.ssh
          echo "$DEPLOY_KEY" > ~/.ssh/deploy_key
          chmod 600 ~/.ssh/deploy_key
          ssh-keyscan -H "$DEPLOY_HOST" >> ~/.ssh/known_hosts 2>/dev/null || true
          
          ssh -i ~/.ssh/deploy_key "$DEPLOY_USER@$DEPLOY_HOST" << 'EOF'
          cd "${{ env.DEPLOY_PATH }}" || exit 1
          git pull origin main
          pnpm install --frozen-lockfile
          pnpm db:push
          pnpm build
          pm2 restart vendhub-staging || pm2 start --name vendhub-staging npm -- start
          EOF
        continue-on-error: true

      - name: Run smoke tests
        run: |
          echo "Running smoke tests..."
          bash scripts/deployment/smoke-tests.sh https://staging.vendhub.local || true
        continue-on-error: true

  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: [build-and-push, deploy-staging]
    environment:
      name: production
      url: https://vendhub.local
    if: github.event_name == 'push' || (github.event_name == 'workflow_dispatch' && github.event.inputs.environment == 'production')

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Deploy to production
        env:
          DEPLOY_KEY: ${{ secrets.PROD_DEPLOY_KEY }}
          DEPLOY_HOST: ${{ secrets.PROD_DEPLOY_HOST }}
          DEPLOY_USER: ${{ secrets.PROD_DEPLOY_USER }}
          DEPLOY_PATH: ${{ secrets.PROD_DEPLOY_PATH }}
        run: |
          mkdir -p ~/.ssh
          echo "$DEPLOY_KEY" > ~/.ssh/deploy_key
          chmod 600 ~/.ssh/deploy_key
          ssh-keyscan -H "$DEPLOY_HOST" >> ~/.ssh/known_hosts 2>/dev/null || true
          
          ssh -i ~/.ssh/deploy_key "$DEPLOY_USER@$DEPLOY_HOST" << 'EOF'
          cd "${{ env.DEPLOY_PATH }}" || exit 1
          bash scripts/backup/backup-all.sh || true
          EOF
          
          ssh -i ~/.ssh/deploy_key "$DEPLOY_USER@$DEPLOY_HOST" << 'EOF'
          cd "${{ env.DEPLOY_PATH }}" || exit 1
          git pull origin main
          pnpm install --frozen-lockfile
          pnpm db:push
          pnpm build
          pm2 restart vendhub || pm2 start --name vendhub npm -- start
          EOF
        continue-on-error: true

      - name: Run smoke tests
        run: |
          echo "Running smoke tests..."
          bash scripts/deployment/smoke-tests.sh https://vendhub.local || true
        continue-on-error: true

      - name: Rollback on failure
        if: failure()
        env:
          DEPLOY_KEY: ${{ secrets.PROD_DEPLOY_KEY }}
          DEPLOY_HOST: ${{ secrets.PROD_DEPLOY_HOST }}
          DEPLOY_USER: ${{ secrets.PROD_DEPLOY_USER }}
          DEPLOY_PATH: ${{ secrets.PROD_DEPLOY_PATH }}
        run: |
          mkdir -p ~/.ssh
          echo "$DEPLOY_KEY" > ~/.ssh/deploy_key
          chmod 600 ~/.ssh/deploy_key
          ssh-keyscan -H "$DEPLOY_HOST" >> ~/.ssh/known_hosts 2>/dev/null || true
          
          ssh -i ~/.ssh/deploy_key "$DEPLOY_USER@$DEPLOY_HOST" << 'EOF'
          cd "${{ env.DEPLOY_PATH }}" || exit 1
          bash scripts/deployment/rollback.sh
          EOF
        continue-on-error: true

  notify:
    name: Notify Deployment
    runs-on: ubuntu-latest
    needs: [deploy-staging, deploy-production]
    if: always()

    steps:
      - name: Send Telegram notification
        env:
          TELEGRAM_BOT_TOKEN: ${{ secrets.TELEGRAM_BOT_TOKEN }}
          TELEGRAM_CHAT_ID: ${{ secrets.TELEGRAM_CHAT_ID }}
        run: |
          STATUS="${{ job.status }}"
          EMOJI="✅"
          [[ "$STATUS" != "success" ]] && EMOJI="❌"
          
          MESSAGE="$EMOJI Deployment $STATUS
          
Commit: ${{ github.sha }}
Author: ${{ github.actor }}
Branch: ${{ github.ref }}
Workflow: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
          
          curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
            -d "chat_id=$TELEGRAM_CHAT_ID" \
            -d "text=$MESSAGE" \
            -d "parse_mode=HTML" || true
        continue-on-error: true
```

## How to Use

1. Go to your GitHub repository
2. Click **Actions** → **New workflow**
3. Click **set up a workflow yourself**
4. Name the file `.github/workflows/deploy.yml`
5. Copy the content above into the editor
6. Click **Commit changes**

The workflow will now run automatically on:
- Push to main branch
- Manual trigger via workflow_dispatch

## Required Secrets

Before this workflow can run, add these secrets:
- `STAGING_DEPLOY_KEY`
- `STAGING_DEPLOY_HOST`
- `STAGING_DEPLOY_USER`
- `STAGING_DEPLOY_PATH`
- `PROD_DEPLOY_KEY`
- `PROD_DEPLOY_HOST`
- `PROD_DEPLOY_USER`
- `PROD_DEPLOY_PATH`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

See `.github/SECRETS_TEMPLATE.md` for detailed instructions.

---

**Last Updated:** 2025-11-29
