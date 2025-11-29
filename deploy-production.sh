#!/bin/bash

# ============================================================================
# VendHub Manager - Production Deployment Script
# ============================================================================
# Этот скрипт автоматизирует развертывание VendHub на production сервере
#
# Использование:
#   1. Скопируйте этот файл на ваш сервер
#   2. Сделайте его исполняемым: chmod +x deploy-production.sh
#   3. Запустите: sudo ./deploy-production.sh
#
# ВАЖНО: Перед запуском убедитесь, что у вас есть:
#   - Доменное имя (например, vendhub.uz)
#   - SSH доступ к серверу
#   - Telegram Bot Token от @BotFather
# ============================================================================

set -e  # Остановить при ошибке

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}============================================================================${NC}"
echo -e "${GREEN}  VendHub Manager - Production Deployment${NC}"
echo -e "${GREEN}============================================================================${NC}"
echo ""

# Проверка что запущено с правами root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Ошибка: Запустите скрипт с правами root (sudo)${NC}"
  exit 1
fi

# ============================================================================
# 1. Запрос конфигурации
# ============================================================================
echo -e "${YELLOW}Шаг 1/10: Сбор конфигурации${NC}"
echo ""

read -p "Введите ваш домен (например, vendhub.uz): " DOMAIN
read -p "Введите email для SSL сертификата: " ADMIN_EMAIL
read -p "Введите Telegram Bot Token (получите у @BotFather): " TELEGRAM_TOKEN
read -sp "Придумайте пароль для PostgreSQL: " DB_PASSWORD
echo ""
read -sp "Придумайте JWT Secret (минимум 32 символа): " JWT_SECRET
echo ""

# Генерация случайных паролей
POSTGRES_PASSWORD="${DB_PASSWORD:-$(openssl rand -hex 32)}"
REDIS_PASSWORD=$(openssl rand -hex 16)
MINIO_PASSWORD=$(openssl rand -hex 16)

echo -e "${GREEN}✓ Конфигурация собрана${NC}"
echo ""

# ============================================================================
# 2. Обновление системы
# ============================================================================
echo -e "${YELLOW}Шаг 2/10: Обновление системы${NC}"
apt update && apt upgrade -y
echo -e "${GREEN}✓ Система обновлена${NC}"
echo ""

# ============================================================================
# 3. Установка Docker
# ============================================================================
echo -e "${YELLOW}Шаг 3/10: Установка Docker${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    echo -e "${GREEN}✓ Docker установлен${NC}"
else
    echo -e "${GREEN}✓ Docker уже установлен${NC}"
fi
echo ""

# ============================================================================
# 4. Установка Docker Compose
# ============================================================================
echo -e "${YELLOW}Шаг 4/10: Установка Docker Compose${NC}"
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" \
         -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    echo -e "${GREEN}✓ Docker Compose установлен${NC}"
else
    echo -e "${GREEN}✓ Docker Compose уже установлен${NC}"
fi
echo ""

# ============================================================================
# 5. Настройка Firewall
# ============================================================================
echo -e "${YELLOW}Шаг 5/10: Настройка Firewall${NC}"
ufw --force enable
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
echo -e "${GREEN}✓ Firewall настроен${NC}"
echo ""

# ============================================================================
# 6. Установка Fail2Ban (защита от брутфорса)
# ============================================================================
echo -e "${YELLOW}Шаг 6/10: Установка Fail2Ban${NC}"
apt install -y fail2ban
systemctl enable fail2ban
systemctl start fail2ban
echo -e "${GREEN}✓ Fail2Ban установлен${NC}"
echo ""

# ============================================================================
# 7. Клонирование репозитория
# ============================================================================
echo -e "${YELLOW}Шаг 7/10: Клонирование проекта${NC}"
cd /opt
if [ -d "VendHub" ]; then
    echo "Директория VendHub уже существует. Обновляем..."
    cd VendHub
    git pull
else
    echo "Клонируем репозиторий..."
    read -p "Введите URL репозитория (git clone ...): " REPO_URL
    git clone "$REPO_URL" VendHub
    cd VendHub
fi
echo -e "${GREEN}✓ Проект готов${NC}"
echo ""

# ============================================================================
# 8. Создание Production .env файлов
# ============================================================================
echo -e "${YELLOW}Шаг 8/10: Создание конфигурационных файлов${NC}"

# Backend .env
cat > backend/.env.production << EOF
# ============================================================================
# VendHub Manager - Production Environment
# ============================================================================

# Application
NODE_ENV=production
PORT=3000

# Database
DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_USER=vendhub
DATABASE_PASSWORD=${POSTGRES_PASSWORD}
DATABASE_NAME=vendhub_production
DB_POOL_MAX=20
DB_POOL_MIN=5

# JWT
JWT_SECRET=${JWT_SECRET}
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Encryption (для 2FA)
ENCRYPTION_KEY=$(openssl rand -hex 32)

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=${REDIS_PASSWORD}

# S3 Storage (MinIO)
S3_ENDPOINT=http://minio:9000
S3_BUCKET=vendhub
S3_ACCESS_KEY=vendhub_admin
S3_SECRET_KEY=${MINIO_PASSWORD}
S3_REGION=us-east-1

# Frontend URL
FRONTEND_URL=https://${DOMAIN}

# Telegram
TELEGRAM_BOT_TOKEN=${TELEGRAM_TOKEN}

# CORS
CORS_ORIGINS=https://${DOMAIN}

# Scheduled Tasks
ENABLE_SCHEDULED_TASKS=true

# Rate Limiting
THROTTLE_TTL=60000
THROTTLE_LIMIT=100

# Logging
LOG_LEVEL=info

# VAPID (будет сгенерирован позже)
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_EMAIL=${ADMIN_EMAIL}
EOF

# Frontend .env
cat > frontend/.env.production << EOF
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://${DOMAIN}/api
EOF

echo -e "${GREEN}✓ Конфигурационные файлы созданы${NC}"
echo ""

# ============================================================================
# 9. Создание docker-compose.production.yml
# ============================================================================
echo -e "${YELLOW}Шаг 9/10: Создание Docker Compose конфигурации${NC}"

cat > docker-compose.production.yml << 'DOCKER_COMPOSE_EOF'
version: '3.8'

services:
  postgres:
    image: postgres:14-alpine
    container_name: vendhub-postgres-prod
    restart: always
    env_file: backend/.env.production
    environment:
      POSTGRES_DB: vendhub_production
      POSTGRES_USER: vendhub
      POSTGRES_PASSWORD: ${DATABASE_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    networks:
      - vendhub-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U vendhub"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: vendhub-redis-prod
    restart: always
    command: redis-server --requirepass ${REDIS_PASSWORD} --appendonly yes
    volumes:
      - redis_data:/data
    networks:
      - vendhub-network
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  minio:
    image: minio/minio:latest
    container_name: vendhub-minio-prod
    restart: always
    environment:
      MINIO_ROOT_USER: vendhub_admin
      MINIO_ROOT_PASSWORD: ${MINIO_PASSWORD}
    volumes:
      - minio_data:/data
    networks:
      - vendhub-network
    command: server /data --console-address ":9001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: vendhub-backend-prod
    restart: always
    env_file: backend/.env.production
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      minio:
        condition: service_healthy
    volumes:
      - uploads:/app/uploads
    networks:
      - vendhub-network
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/health/live', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: vendhub-frontend-prod
    restart: always
    env_file: frontend/.env.production
    depends_on:
      - backend
    networks:
      - vendhub-network

  nginx:
    image: nginx:alpine
    container_name: vendhub-nginx-prod
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - uploads:/var/www/uploads:ro
      - certbot_www:/var/www/certbot:ro
      - certbot_conf:/etc/letsencrypt:ro
    depends_on:
      - backend
      - frontend
    networks:
      - vendhub-network

  certbot:
    image: certbot/certbot:latest
    container_name: vendhub-certbot
    volumes:
      - certbot_www:/var/www/certbot:rw
      - certbot_conf:/etc/letsencrypt:rw
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  minio_data:
    driver: local
  uploads:
    driver: local
  certbot_www:
    driver: local
  certbot_conf:
    driver: local

networks:
  vendhub-network:
    driver: bridge
DOCKER_COMPOSE_EOF

echo -e "${GREEN}✓ Docker Compose конфигурация создана${NC}"
echo ""

# ============================================================================
# 10. Создание Nginx конфигурации
# ============================================================================
echo -e "${YELLOW}Шаг 10/10: Создание Nginx конфигурации${NC}"

mkdir -p nginx/ssl

cat > nginx/nginx.conf << 'NGINX_EOF'
events {
    worker_connections 2048;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    # Performance
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 20M;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript
               application/json application/javascript application/xml+rss
               application/rss+xml font/truetype font/opentype
               application/vnd.ms-fontobject image/svg+xml;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=general_limit:10m rate=100r/s;

    upstream backend {
        server backend:3000;
    }

    upstream frontend {
        server frontend:3000;
    }

    # HTTP redirect to HTTPS
    server {
        listen 80;
        server_name DOMAIN_PLACEHOLDER;

        # Certbot ACME challenge
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
        server_name DOMAIN_PLACEHOLDER;

        # SSL certificates (will be generated by Certbot)
        ssl_certificate /etc/letsencrypt/live/DOMAIN_PLACEHOLDER/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/DOMAIN_PLACEHOLDER/privkey.pem;

        # SSL configuration
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "no-referrer-when-downgrade" always;
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

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

        # Health check
        location /health {
            proxy_pass http://backend;
            access_log off;
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
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }
    }
}
NGINX_EOF

# Замена DOMAIN_PLACEHOLDER на реальный домен
sed -i "s/DOMAIN_PLACEHOLDER/${DOMAIN}/g" nginx/nginx.conf

echo -e "${GREEN}✓ Nginx конфигурация создана${NC}"
echo ""

# ============================================================================
# Запуск временного Nginx для получения SSL сертификата
# ============================================================================
echo -e "${YELLOW}Получение SSL сертификата от Let's Encrypt...${NC}"

# Временная конфигурация Nginx для Certbot
mkdir -p certbot_www
cat > nginx/nginx-certbot.conf << EOF
events {
    worker_connections 1024;
}

http {
    server {
        listen 80;
        server_name ${DOMAIN};

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 200 'OK';
            add_header Content-Type text/plain;
        }
    }
}
EOF

# Запуск временного Nginx
docker run -d --name nginx-temp \
    -p 80:80 \
    -v $(pwd)/certbot_www:/var/www/certbot \
    -v $(pwd)/nginx/nginx-certbot.conf:/etc/nginx/nginx.conf \
    nginx:alpine

# Получение SSL сертификата
mkdir -p certbot_conf
docker run -it --rm \
    -v $(pwd)/certbot_www:/var/www/certbot \
    -v $(pwd)/certbot_conf:/etc/letsencrypt \
    certbot/certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email ${ADMIN_EMAIL} \
    --agree-tos \
    --no-eff-email \
    -d ${DOMAIN}

# Остановка временного Nginx
docker stop nginx-temp
docker rm nginx-temp

echo -e "${GREEN}✓ SSL сертификат получен${NC}"
echo ""

# ============================================================================
# Сборка и запуск проекта
# ============================================================================
echo -e "${YELLOW}Сборка и запуск проекта...${NC}"
echo "Это может занять 5-10 минут..."
echo ""

# Замена переменных в docker-compose
sed -i "s/\${DATABASE_PASSWORD}/${POSTGRES_PASSWORD}/g" docker-compose.production.yml
sed -i "s/\${REDIS_PASSWORD}/${REDIS_PASSWORD}/g" docker-compose.production.yml
sed -i "s/\${MINIO_PASSWORD}/${MINIO_PASSWORD}/g" docker-compose.production.yml

# Сборка и запуск
docker-compose -f docker-compose.production.yml up -d --build

echo -e "${GREEN}✓ Проект запущен${NC}"
echo ""

# Ожидание запуска backend
echo "Ожидание запуска backend..."
sleep 30

# Применение миграций
echo "Применение миграций базы данных..."
docker-compose -f docker-compose.production.yml exec -T backend npm run migration:run

# Генерация VAPID ключей
echo "Генерация VAPID ключей для Web Push..."
docker-compose -f docker-compose.production.yml exec -T backend npm run generate-vapid-keys || true

echo ""
echo -e "${GREEN}============================================================================${NC}"
echo -e "${GREEN}  ✓ Установка завершена успешно!${NC}"
echo -e "${GREEN}============================================================================${NC}"
echo ""
echo -e "${YELLOW}Ваш VendHub Manager доступен по адресу:${NC}"
echo -e "  🌐 https://${DOMAIN}"
echo ""
echo -e "${YELLOW}API документация (Swagger):${NC}"
echo -e "  📚 https://${DOMAIN}/api/docs"
echo ""
echo -e "${YELLOW}Health check:${NC}"
echo -e "  ❤️  https://${DOMAIN}/health"
echo ""
echo -e "${YELLOW}Сохраните эти данные в безопасном месте:${NC}"
echo -e "  Database Password: ${POSTGRES_PASSWORD}"
echo -e "  Redis Password: ${REDIS_PASSWORD}"
echo -e "  MinIO Password: ${MINIO_PASSWORD}"
echo -e "  JWT Secret: ${JWT_SECRET}"
echo ""
echo -e "${YELLOW}Следующие шаги:${NC}"
echo "  1. Откройте https://${DOMAIN}"
echo "  2. Создайте первого администратора:"
echo "     docker-compose -f docker-compose.production.yml exec backend npm run create-admin"
echo "  3. Настройте Telegram бота в админ-панели: /telegram/settings"
echo "  4. Настройте автоматические бэкапы (см. ниже)"
echo ""
echo -e "${YELLOW}Полезные команды:${NC}"
echo "  # Просмотр логов"
echo "  docker-compose -f docker-compose.production.yml logs -f backend"
echo ""
echo "  # Перезапуск сервисов"
echo "  docker-compose -f docker-compose.production.yml restart"
echo ""
echo "  # Остановка проекта"
echo "  docker-compose -f docker-compose.production.yml down"
echo ""
echo "  # Обновление проекта"
echo "  git pull && docker-compose -f docker-compose.production.yml up -d --build"
echo ""

# ============================================================================
# Создание скрипта автоматического бэкапа
# ============================================================================
echo -e "${YELLOW}Создание скрипта автоматического бэкапа...${NC}"

mkdir -p backups

cat > /opt/VendHub/backup.sh << 'BACKUP_EOF'
#!/bin/bash
# VendHub - Автоматический бэкап базы данных

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/VendHub/backups"
DB_NAME="vendhub_production"

# Создание бэкапа
docker-compose -f /opt/VendHub/docker-compose.production.yml exec -T postgres \
    pg_dump -U vendhub $DB_NAME | gzip > $BACKUP_DIR/vendhub_$DATE.sql.gz

# Удаление старых бэкапов (старше 30 дней)
find $BACKUP_DIR -name "vendhub_*.sql.gz" -mtime +30 -delete

echo "✓ Бэкап завершен: vendhub_$DATE.sql.gz"

# Опционально: загрузка на облачное хранилище
# aws s3 cp $BACKUP_DIR/vendhub_$DATE.sql.gz s3://your-bucket/backups/
BACKUP_EOF

chmod +x /opt/VendHub/backup.sh

# Добавление в crontab (бэкап каждый день в 3:00)
(crontab -l 2>/dev/null; echo "0 3 * * * /opt/VendHub/backup.sh >> /var/log/vendhub-backup.log 2>&1") | crontab -

echo -e "${GREEN}✓ Автоматический бэкап настроен (каждый день в 3:00)${NC}"
echo ""

# ============================================================================
# Создание скрипта мониторинга
# ============================================================================
cat > /opt/VendHub/health-check.sh << 'HEALTH_EOF'
#!/bin/bash
# VendHub - Проверка работоспособности

# Проверка backend
if ! curl -f https://DOMAIN_PLACEHOLDER/health/live > /dev/null 2>&1; then
    echo "⚠️ Backend недоступен!"
    # Перезапуск backend
    docker-compose -f /opt/VendHub/docker-compose.production.yml restart backend
fi

# Проверка frontend
if ! curl -f https://DOMAIN_PLACEHOLDER > /dev/null 2>&1; then
    echo "⚠️ Frontend недоступен!"
    docker-compose -f /opt/VendHub/docker-compose.production.yml restart frontend
fi

# Проверка PostgreSQL
if ! docker-compose -f /opt/VendHub/docker-compose.production.yml exec -T postgres pg_isready -U vendhub > /dev/null 2>&1; then
    echo "⚠️ PostgreSQL недоступен!"
    docker-compose -f /opt/VendHub/docker-compose.production.yml restart postgres
fi

# Проверка места на диске
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "⚠️ Мало места на диске: ${DISK_USAGE}%"
fi
HEALTH_EOF

sed -i "s/DOMAIN_PLACEHOLDER/${DOMAIN}/g" /opt/VendHub/health-check.sh
chmod +x /opt/VendHub/health-check.sh

# Добавление в crontab (проверка каждые 5 минут)
(crontab -l 2>/dev/null; echo "*/5 * * * * /opt/VendHub/health-check.sh >> /var/log/vendhub-health.log 2>&1") | crontab -

echo -e "${GREEN}✓ Мониторинг здоровья настроен (каждые 5 минут)${NC}"
echo ""

echo -e "${GREEN}============================================================================${NC}"
echo -e "${GREEN}  🎉 ВСЁ ГОТОВО! VendHub Manager работает 24/7!${NC}"
echo -e "${GREEN}============================================================================${NC}"
echo ""
