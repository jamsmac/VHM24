# Nginx Configuration для VendHub

## Основная конфигурация

```nginx
# /etc/nginx/nginx.conf
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for" '
                    'rt=$request_time uct="$upstream_connect_time" '
                    'uht="$upstream_header_time" urt="$upstream_response_time"';

    access_log /var/log/nginx/access.log main;

    # Performance
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript
               application/xml application/xml+rss text/javascript application/x-font-ttf
               font/opentype image/svg+xml;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;

    include /etc/nginx/conf.d/*.conf;
}
```

## VendHub API (Backend)

```nginx
# /etc/nginx/conf.d/api.vendhub.uz.conf
upstream vendhub_backend {
    server 127.0.0.1:3000;
    keepalive 32;
}

server {
    listen 80;
    server_name api.vendhub.uz;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.vendhub.uz;

    # SSL (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/api.vendhub.uz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.vendhub.uz/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;

    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;

    # Logging
    access_log /var/log/nginx/api.vendhub.uz.access.log main;
    error_log /var/log/nginx/api.vendhub.uz.error.log;

    # Max upload size (for photos)
    client_max_body_size 10M;

    # API endpoints
    location / {
        limit_req zone=api burst=20 nodelay;

        proxy_pass http://vendhub_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 90;
    }

    # Auth endpoints - stricter rate limit
    location ~ ^/api/auth/(login|register|refresh) {
        limit_req zone=auth burst=5 nodelay;

        proxy_pass http://vendhub_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check (no rate limit)
    location /health {
        proxy_pass http://vendhub_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    # WebSocket for real-time
    location /socket.io/ {
        proxy_pass http://vendhub_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400;
    }

    # Swagger docs (disable in production)
    location /api/docs {
        # Uncomment for production to disable swagger
        # return 404;

        proxy_pass http://vendhub_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

## VendHub Frontend

```nginx
# /etc/nginx/conf.d/app.vendhub.uz.conf
upstream vendhub_frontend {
    server 127.0.0.1:3001;
    keepalive 32;
}

server {
    listen 80;
    server_name app.vendhub.uz;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name app.vendhub.uz;

    # SSL
    ssl_certificate /etc/letsencrypt/live/app.vendhub.uz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.vendhub.uz/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_protocols TLSv1.2 TLSv1.3;

    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;

    # Security headers for frontend
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.vendhub.uz wss://api.vendhub.uz;" always;

    location / {
        proxy_pass http://vendhub_frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Static assets caching
    location /_next/static/ {
        proxy_pass http://vendhub_frontend;
        proxy_cache_valid 200 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Next.js image optimization
    location /_next/image {
        proxy_pass http://vendhub_frontend;
        proxy_cache_valid 200 60d;
    }
}
```

## Let's Encrypt Setup

```bash
# Установка certbot
sudo apt install certbot python3-certbot-nginx

# Получение сертификатов
sudo certbot --nginx -d api.vendhub.uz -d app.vendhub.uz

# Автоматическое обновление (cron)
0 0 * * * /usr/bin/certbot renew --quiet
```

## Docker Nginx

```dockerfile
# Dockerfile.nginx
FROM nginx:alpine

# Copy configs
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/conf.d/ /etc/nginx/conf.d/

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

EXPOSE 80 443
```

```yaml
# docker-compose.yml (nginx service)
services:
  nginx:
    build:
      context: .
      dockerfile: Dockerfile.nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
      - nginx-logs:/var/log/nginx
    depends_on:
      - backend
      - frontend
    restart: unless-stopped
    networks:
      - vendhub-network

volumes:
  nginx-logs:
```

## Полезные команды

```bash
# Проверка конфигурации
nginx -t

# Перезагрузка без downtime
nginx -s reload

# Просмотр логов
tail -f /var/log/nginx/api.vendhub.uz.access.log

# Статистика соединений
nginx -V 2>&1 | grep -o with-http_stub_status_module
# Добавить location /nginx_status для мониторинга
```
