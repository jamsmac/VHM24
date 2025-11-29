# VendHub Manager - Руководство по Deployment

## 🎯 Обзор

Это руководство описывает процесс развёртывания VendHub Manager от локальной разработки до production.

---

## 🏠 Локальная разработка

### Требования
- Docker 20.10+
- Docker Compose 2.0+
- Node.js 18+
- Git

### Первоначальная настройка

```bash
# 1. Клонировать репозиторий
git clone https://github.com/jamsmac/VendHub.git
cd VendHub

# 2. Создать .env файлы
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
cp telegram-bot/.env.example telegram-bot/.env

# 3. Отредактировать .env файлы
# Обязательно изменить:
# - DATABASE_URL
# - JWT_SECRET
# - TELEGRAM_BOT_TOKEN
```

### Запуск через Docker Compose

```bash
# Запуск всех сервисов
docker-compose up -d

# Проверка логов
docker-compose logs -f backend

# Применение миграций
docker-compose exec backend npm run migration:run

# Загрузка справочников
docker-compose exec backend npm run seed:dictionaries

# Создание первого админа
docker-compose exec backend npm run create-admin
```

### Доступ
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api
- API Docs: http://localhost:3001/api/docs
- Adminer (БД): http://localhost:8080
- PostgreSQL: localhost:5432
- Redis: localhost:6379

---

## 🧪 Staging Environment

### Требования
- VPS/Cloud Server (минимум 4GB RAM, 2 CPU)
- Ubuntu 22.04 LTS
- Domain name (например, staging.vendhub.uz)
- SSL сертификат (Let's Encrypt)

### Установка

```bash
# 1. Подключение к серверу
ssh root@staging.vendhub.uz

# 2. Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# 3. Установка Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" \
  -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 4. Клонирование репозитория
git clone https://github.com/jamsmac/VendHub.git
cd VendHub

# 5. Создание production .env
cp backend/.env.example backend/.env.production
# Редактируем файл с production настройками
nano backend/.env.production
```

### Production .env пример

```env
# Database
DATABASE_URL=postgresql://vendhub:STRONG_PASSWORD@postgres:5432/vendhub_staging
POSTGRES_USER=vendhub
POSTGRES_PASSWORD=STRONG_PASSWORD
POSTGRES_DB=vendhub_staging

# Backend
NODE_ENV=production
PORT=3001
JWT_SECRET=YOUR_VERY_LONG_RANDOM_SECRET_HERE
JWT_REFRESH_SECRET=YOUR_ANOTHER_VERY_LONG_RANDOM_SECRET
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Frontend
NEXT_PUBLIC_API_URL=https://staging.vendhub.uz/api

# Redis
REDIS_URL=redis://redis:6379

# Telegram
TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN_FROM_BOTFATHER

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_DIR=/app/uploads

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@vendhub.uz
SMTP_PASSWORD=YOUR_SMTP_PASSWORD

# Sentry (optional)
SENTRY_DSN=https://your-sentry-dsn

# Rate Limiting
RATE_LIMIT_TTL=60
RATE_LIMIT_LIMIT=100
```

### Docker Compose для Production

```yaml
# docker-compose.production.yml
version: '3.8'

services:
  postgres:
    image: postgres:14-alpine
    restart: always
    env_file: backend/.env.production
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    networks:
      - vendhub-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $$POSTGRES_USER"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: always
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    networks:
      - vendhub-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.production
    restart: always
    env_file: backend/.env.production
    depends_on:
      - postgres
      - redis
    volumes:
      - uploads:/app/uploads
    networks:
      - vendhub-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.production
    restart: always
    env_file: frontend/.env.production
    depends_on:
      - backend
    networks:
      - vendhub-network

  telegram-bot:
    build:
      context: ./telegram-bot
      dockerfile: Dockerfile.production
    restart: always
    env_file: telegram-bot/.env.production
    depends_on:
      - backend
    networks:
      - vendhub-network

  nginx:
    image: nginx:alpine
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
      - uploads:/var/www/uploads
    depends_on:
      - backend
      - frontend
    networks:
      - vendhub-network

volumes:
  postgres_data:
  redis_data:
  uploads:

networks:
  vendhub-network:
    driver: bridge
```

### Nginx конфигурация

```nginx
# nginx/nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server backend:3001;
    }

    upstream frontend {
        server frontend:3000;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=general_limit:10m rate=100r/s;

    # Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name staging.vendhub.uz;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 301 https://$server_name$request_uri;
        }
    }

    # HTTPS
    server {
        listen 443 ssl http2;
        server_name staging.vendhub.uz;

        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;

        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;

        client_max_body_size 10M;

        # Backend API
        location /api {
            limit_req zone=api_limit burst=20 nodelay;

            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;

            # Timeouts
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # Uploaded files
        location /uploads {
            alias /var/www/uploads;
            expires 30d;
            add_header Cache-Control "public, immutable";
        }

        # Frontend
        location / {
            limit_req zone=general_limit burst=50 nodelay;

            proxy_pass http://frontend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "no-referrer-when-downgrade" always;
    }
}
```

### SSL сертификат (Let's Encrypt)

```bash
# Установка certbot
sudo apt install certbot python3-certbot-nginx

# Получение сертификата
sudo certbot --nginx -d staging.vendhub.uz

# Автоматическое обновление
sudo certbot renew --dry-run

# Копирование в nginx директорию
sudo cp /etc/letsencrypt/live/staging.vendhub.uz/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/staging.vendhub.uz/privkey.pem nginx/ssl/
```

### Запуск на staging

```bash
# Сборка и запуск
docker-compose -f docker-compose.production.yml up -d --build

# Проверка логов
docker-compose -f docker-compose.production.yml logs -f

# Применение миграций
docker-compose -f docker-compose.production.yml exec backend npm run migration:run

# Загрузка справочников
docker-compose -f docker-compose.production.yml exec backend npm run seed:dictionaries
```

---

## 🚀 Production Deployment

### Требования
- Dedicated Server / Cloud (минимум 8GB RAM, 4 CPU)
- Ubuntu 22.04 LTS
- Domain name (vendhub.uz)
- SSL сертификат
- Backup solution
- Monitoring (Prometheus + Grafana)

### Дополнительная безопасность

```bash
# 1. Firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# 2. Fail2ban
sudo apt install fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# 3. Automatic security updates
sudo apt install unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

### Monitoring Setup

```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    restart: always
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"
    networks:
      - vendhub-network

  grafana:
    image: grafana/grafana:latest
    restart: always
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=YOUR_ADMIN_PASSWORD
    volumes:
      - grafana_data:/var/lib/grafana
    ports:
      - "3002:3000"
    networks:
      - vendhub-network

  node-exporter:
    image: prom/node-exporter:latest
    restart: always
    ports:
      - "9100:9100"
    networks:
      - vendhub-network

volumes:
  prometheus_data:
  grafana_data:
```

### Backup Strategy

```bash
# 1. Создать скрипт для бэкапа БД
cat > /opt/vendhub/backup-db.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
DB_NAME="vendhub_production"

# Создание бэкапа
docker-compose exec -T postgres pg_dump -U vendhub $DB_NAME | gzip > $BACKUP_DIR/vendhub_$DATE.sql.gz

# Удаление старых бэкапов (старше 30 дней)
find $BACKUP_DIR -name "vendhub_*.sql.gz" -mtime +30 -delete

echo "Backup completed: vendhub_$DATE.sql.gz"
EOF

chmod +x /opt/vendhub/backup-db.sh

# 2. Добавить в crontab
crontab -e

# Бэкап каждую ночь в 03:00
0 3 * * * /opt/vendhub/backup-db.sh >> /var/log/vendhub-backup.log 2>&1
```

### Health Checks

```bash
# Скрипт проверки здоровья
cat > /opt/vendhub/health-check.sh << 'EOF'
#!/bin/bash

# Проверка backend
if ! curl -f http://localhost:3001/health > /dev/null 2>&1; then
  echo "Backend is DOWN!"
  # Отправить уведомление
  curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
    -d chat_id="$ADMIN_CHAT_ID" \
    -d text="⚠️ Backend is DOWN!"
fi

# Проверка frontend
if ! curl -f http://localhost:3000 > /dev/null 2>&1; then
  echo "Frontend is DOWN!"
fi

# Проверка PostgreSQL
if ! docker-compose exec -T postgres pg_isready -U vendhub > /dev/null 2>&1; then
  echo "PostgreSQL is DOWN!"
fi

# Проверка Redis
if ! docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
  echo "Redis is DOWN!"
fi
EOF

chmod +x /opt/vendhub/health-check.sh

# Запуск каждые 5 минут
*/5 * * * * /opt/vendhub/health-check.sh >> /var/log/vendhub-health.log 2>&1
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/deploy-staging.yml
name: Deploy to Staging

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: |
          cd backend
          npm ci

      - name: Run linter
        run: |
          cd backend
          npm run lint

      - name: Run tests
        run: |
          cd backend
          npm run test
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/test

      - name: Build
        run: |
          cd backend
          npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
      - name: Deploy to staging
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.STAGING_HOST }}
          username: ${{ secrets.STAGING_USER }}
          key: ${{ secrets.STAGING_SSH_KEY }}
          script: |
            cd /opt/vendhub
            git pull origin main
            docker-compose -f docker-compose.production.yml up -d --build
            docker-compose -f docker-compose.production.yml exec -T backend npm run migration:run

      - name: Notify success
        if: success()
        run: |
          curl -X POST "https://api.telegram.org/bot${{ secrets.TELEGRAM_BOT_TOKEN }}/sendMessage" \
            -d chat_id="${{ secrets.ADMIN_CHAT_ID }}" \
            -d text="✅ Staging deployed successfully"

      - name: Notify failure
        if: failure()
        run: |
          curl -X POST "https://api.telegram.org/bot${{ secrets.TELEGRAM_BOT_TOKEN }}/sendMessage" \
            -d chat_id="${{ secrets.ADMIN_CHAT_ID }}" \
            -d text="❌ Staging deployment failed"
```

### Production Deployment (Manual)

```yaml
# .github/workflows/deploy-production.yml
name: Deploy to Production

on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Version to deploy'
        required: true

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
        with:
          ref: ${{ github.event.inputs.version }}

      - name: Deploy to production
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.PRODUCTION_HOST }}
          username: ${{ secrets.PRODUCTION_USER }}
          key: ${{ secrets.PRODUCTION_SSH_KEY }}
          script: |
            cd /opt/vendhub
            git fetch --all --tags
            git checkout ${{ github.event.inputs.version }}
            docker-compose -f docker-compose.production.yml pull
            docker-compose -f docker-compose.production.yml up -d
            docker-compose -f docker-compose.production.yml exec -T backend npm run migration:run

      - name: Notify
        run: |
          curl -X POST "https://api.telegram.org/bot${{ secrets.TELEGRAM_BOT_TOKEN }}/sendMessage" \
            -d chat_id="${{ secrets.ADMIN_CHAT_ID }}" \
            -d text="🚀 Production deployed: ${{ github.event.inputs.version }}"
```

---

## 📊 Post-deployment Checks

### После каждого deployment проверяй:

```bash
# 1. Проверка всех сервисов
docker-compose ps

# 2. Проверка логов
docker-compose logs --tail=100 backend
docker-compose logs --tail=100 frontend
docker-compose logs --tail=100 telegram-bot

# 3. Проверка health endpoints
curl https://vendhub.uz/api/health
curl https://vendhub.uz

# 4. Проверка БД
docker-compose exec postgres psql -U vendhub -d vendhub_production -c "\dt"

# 5. Проверка миграций
docker-compose exec backend npm run migration:show

# 6. Smoke tests (основные сценарии)
# - Логин через web
# - Создание задачи
# - Получение задачи в Telegram
```

---

## 🆘 Troubleshooting

### Backend не запускается

```bash
# Проверка логов
docker-compose logs backend

# Проверка БД подключения
docker-compose exec backend npm run typeorm query "SELECT 1"

# Перезапуск
docker-compose restart backend
```

### БД проблемы

```bash
# Подключение к БД
docker-compose exec postgres psql -U vendhub -d vendhub_production

# Проверка подключений
SELECT * FROM pg_stat_activity;

# Откат миграции
docker-compose exec backend npm run migration:revert
```

### Нехватка места

```bash
# Очистка Docker
docker system prune -a --volumes

# Очистка старых образов
docker image prune -a

# Проверка места
df -h
```

---

**Deployment готов! 🚀**
