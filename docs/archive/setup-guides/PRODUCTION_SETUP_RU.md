# 🚀 Запуск VendHub Manager онлайн 24/7

**Полное руководство по развертыванию в production**

---

## 📋 Содержание

1. [Что вам понадобится](#что-вам-понадобится)
2. [Быстрый старт (автоматическая установка)](#быстрый-старт)
3. [Ручная установка (пошагово)](#ручная-установка)
4. [После установки](#после-установки)
5. [Обслуживание и мониторинг](#обслуживание)
6. [Решение проблем](#решение-проблем)

---

## 🎯 Что вам понадобится

### 1. Сервер (VPS/Cloud)

**Минимальные требования:**
- **CPU**: 4 ядра (рекомендуется 8 для высокой нагрузки)
- **RAM**: 8GB (минимум 4GB)
- **Диск**: 50GB SSD
- **ОС**: Ubuntu 22.04 LTS (рекомендуется)

**Рекомендуемые провайдеры:**

| Провайдер | Цена/месяц | Характеристики | Для кого |
|-----------|------------|----------------|----------|
| **Hetzner** (Германия) | ~€20 | 4 CPU, 8GB RAM, 80GB SSD | 💰 Лучшая цена/качество |
| **DigitalOcean** | $48 | 4 CPU, 8GB RAM, 160GB SSD | 🌍 Глобальная сеть |
| **AWS EC2** | от $50 | t3.large | 🏢 Корпоративный уровень |
| **VPS.uz** | договорная | Различные конфигурации | 🇺🇿 Узбекистан, низкая задержка |

### 2. Доменное имя

- Купите домен (например, `vendhub.uz`, `my-vendhub.com`)
- Настройте DNS записи на IP вашего сервера:
  ```
  A     @           123.45.67.89  (замените на IP вашего сервера)
  A     www         123.45.67.89
  ```

**Где купить домен:**
- [Namecheap](https://www.namecheap.com) - международные домены
- [UZINFOCOM](https://www.cctld.uz) - домены .uz для Узбекистана
- [Reg.ru](https://www.reg.ru) - русскоязычный интерфейс

### 3. Telegram Bot Token

1. Откройте Telegram и найдите [@BotFather](https://t.me/BotFather)
2. Отправьте команду `/newbot`
3. Следуйте инструкциям (придумайте имя и username)
4. Сохраните полученный **Bot Token** (выглядит как `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`)

---

## ⚡ Быстрый старт (автоматическая установка)

Самый простой способ - использовать автоматический скрипт установки:

### Шаг 1: Подключитесь к серверу

```bash
ssh root@ваш-сервер-ip
```

### Шаг 2: Скачайте проект

```bash
cd /opt
git clone https://github.com/jamsmac/VendHub.git
cd VendHub
```

### Шаг 3: Запустите установку

```bash
chmod +x deploy-production.sh
sudo ./deploy-production.sh
```

Скрипт спросит у вас:
- ✅ Ваш домен (например, `vendhub.uz`)
- ✅ Email для SSL сертификата
- ✅ Telegram Bot Token
- ✅ Пароль для базы данных
- ✅ JWT Secret

**Всё остальное будет сделано автоматически!**

⏱️ Процесс займет **10-15 минут**.

После завершения вы получите:
- ✅ Работающий сайт на `https://ваш-домен.com`
- ✅ SSL сертификат (HTTPS)
- ✅ Автоматические бэкапы (каждый день в 3:00)
- ✅ Мониторинг работоспособности (каждые 5 минут)

---

## 🔧 Ручная установка (пошагово)

Если хотите понимать каждый шаг или автоматическая установка не сработала:

### Шаг 1: Подготовка сервера

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
rm get-docker.sh

# Установка Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" \
     -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Проверка установки
docker --version
docker-compose --version
```

### Шаг 2: Настройка Firewall

```bash
# Разрешить SSH, HTTP, HTTPS
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### Шаг 3: Клонирование проекта

```bash
cd /opt
sudo git clone https://github.com/jamsmac/VendHub.git
cd VendHub
```

### Шаг 4: Создание .env файлов

```bash
# Backend конфигурация
cat > backend/.env.production << 'EOF'
NODE_ENV=production
PORT=3000

# Database
DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_USER=vendhub
DATABASE_PASSWORD=ПРИДУМАЙТЕ_СЛОЖНЫЙ_ПАРОЛЬ
DATABASE_NAME=vendhub_production
DB_POOL_MAX=20
DB_POOL_MIN=5

# JWT (сгенерируйте случайную строку 64+ символов)
JWT_SECRET=СГЕНЕРИРУЙТЕ_СЛУЧАЙНУЮ_СТРОКУ_64_СИМВОЛА
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Encryption для 2FA (32 байта = 64 hex символа)
ENCRYPTION_KEY=СГЕНЕРИРУЙТЕ_32_БАЙТА_64_HEX_СИМВОЛА

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=ПРИДУМАЙТЕ_ПАРОЛЬ_ДЛЯ_REDIS

# S3 Storage (MinIO)
S3_ENDPOINT=http://minio:9000
S3_BUCKET=vendhub
S3_ACCESS_KEY=vendhub_admin
S3_SECRET_KEY=ПРИДУМАЙТЕ_ПАРОЛЬ_ДЛЯ_MINIO
S3_REGION=us-east-1

# Frontend
FRONTEND_URL=https://ваш-домен.com

# Telegram
TELEGRAM_BOT_TOKEN=ваш_бот_токен_от_botfather

# CORS
CORS_ORIGINS=https://ваш-домен.com

# Scheduled Tasks
ENABLE_SCHEDULED_TASKS=true

# Rate Limiting
THROTTLE_TTL=60000
THROTTLE_LIMIT=100

# VAPID (будет сгенерирован позже)
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_EMAIL=admin@ваш-домен.com
EOF

# Frontend конфигурация
cat > frontend/.env.production << 'EOF'
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://ваш-домен.com/api
EOF
```

**Для генерации случайных паролей используйте:**

```bash
# Генерация JWT_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Генерация ENCRYPTION_KEY (32 байта)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Генерация обычных паролей
openssl rand -hex 32
```

### Шаг 5: Получение SSL сертификата

```bash
# Установка Certbot
sudo apt install -y certbot

# Получение сертификата
sudo certbot certonly --standalone -d ваш-домен.com --email ваш-email@example.com --agree-tos

# Сертификаты будут в /etc/letsencrypt/live/ваш-домен.com/
```

### Шаг 6: Настройка Nginx

Создайте файл `nginx/nginx.conf` (уже есть в проекте, просто замените домен):

```bash
mkdir -p nginx/ssl
sed -i 's/DOMAIN_PLACEHOLDER/ваш-домен.com/g' nginx/nginx.conf
```

### Шаг 7: Запуск проекта

```bash
# Сборка и запуск
docker-compose -f docker-compose.production.yml up -d --build

# Просмотр логов
docker-compose -f docker-compose.production.yml logs -f

# Применение миграций (после запуска backend)
sleep 30  # Подождать запуска
docker-compose -f docker-compose.production.yml exec backend npm run migration:run

# Генерация VAPID ключей для Web Push
docker-compose -f docker-compose.production.yml exec backend npm run generate-vapid-keys
```

---

## ✅ После установки

### 1. Создание первого администратора

```bash
cd /opt/VendHub
docker-compose -f docker-compose.production.yml exec backend npm run create-admin
```

Следуйте инструкциям на экране.

### 2. Проверка работоспособности

Откройте в браузере:
- **Главная страница**: `https://ваш-домен.com`
- **API документация**: `https://ваш-домен.com/api/docs`
- **Health check**: `https://ваш-домен.com/health`

### 3. Настройка Telegram бота

1. Войдите в систему как администратор
2. Перейдите в настройки Telegram: `/telegram/settings`
3. Вставьте Bot Token
4. Сохраните настройки
5. Пользователи смогут привязать свои аккаунты через `/start` в боте

### 4. Настройка автоматических бэкапов

Бэкапы уже настроены автоматически (если использовали скрипт)!

**Проверка:**
```bash
crontab -l
# Должна быть строка: 0 3 * * * /opt/VendHub/backup.sh
```

**Ручное создание бэкапа:**
```bash
/opt/VendHub/backup.sh
```

Бэкапы сохраняются в `/opt/VendHub/backups/`

**Восстановление из бэкапа:**
```bash
# Список бэкапов
ls -lh /opt/VendHub/backups/

# Восстановление
gunzip < /opt/VendHub/backups/vendhub_20240115_030000.sql.gz | \
  docker-compose -f /opt/VendHub/docker-compose.production.yml exec -T postgres \
  psql -U vendhub -d vendhub_production
```

---

## 🔍 Обслуживание и мониторинг

### Просмотр логов

```bash
cd /opt/VendHub

# Все логи
docker-compose -f docker-compose.production.yml logs -f

# Только backend
docker-compose -f docker-compose.production.yml logs -f backend

# Только frontend
docker-compose -f docker-compose.production.yml logs -f frontend

# Последние 100 строк
docker-compose -f docker-compose.production.yml logs --tail=100
```

### Перезапуск сервисов

```bash
# Перезапуск всех сервисов
docker-compose -f docker-compose.production.yml restart

# Перезапуск конкретного сервиса
docker-compose -f docker-compose.production.yml restart backend
docker-compose -f docker-compose.production.yml restart frontend
docker-compose -f docker-compose.production.yml restart nginx
```

### Обновление проекта

```bash
cd /opt/VendHub

# Получить последние изменения
git pull

# Пересобрать и перезапустить
docker-compose -f docker-compose.production.yml up -d --build

# Применить новые миграции (если есть)
docker-compose -f docker-compose.production.yml exec backend npm run migration:run
```

### Мониторинг ресурсов

```bash
# Использование ресурсов контейнерами
docker stats

# Место на диске
df -h

# Использование памяти
free -h

# Проверка работы сервисов
docker-compose -f docker-compose.production.yml ps
```

### Автоматический мониторинг

Скрипт мониторинга уже настроен (проверяет каждые 5 минут):
- ✅ Работоспособность backend
- ✅ Работоспособность frontend
- ✅ Состояние PostgreSQL
- ✅ Свободное место на диске

**Просмотр логов мониторинга:**
```bash
tail -f /var/log/vendhub-health.log
```

---

## 🆘 Решение проблем

### Backend не запускается

```bash
# Проверка логов
docker-compose -f docker-compose.production.yml logs backend

# Проверка подключения к БД
docker-compose -f docker-compose.production.yml exec backend npm run typeorm query "SELECT 1"

# Перезапуск
docker-compose -f docker-compose.production.yml restart backend
```

### Проблемы с базой данных

```bash
# Подключение к PostgreSQL
docker-compose -f docker-compose.production.yml exec postgres psql -U vendhub -d vendhub_production

# Проверка активных подключений
SELECT * FROM pg_stat_activity;

# Откат последней миграции
docker-compose -f docker-compose.production.yml exec backend npm run migration:revert
```

### SSL сертификат не работает

```bash
# Проверка сертификата
sudo certbot certificates

# Обновление сертификата вручную
sudo certbot renew

# Проверка автообновления
sudo certbot renew --dry-run
```

### Нехватка места на диске

```bash
# Очистка Docker
docker system prune -a --volumes

# Удаление старых образов
docker image prune -a

# Проверка больших файлов
du -sh /opt/VendHub/backups/*
du -sh /var/lib/docker/*
```

### Frontend показывает ошибку подключения к API

Проверьте:
1. Backend работает: `https://ваш-домен.com/api/health`
2. CORS настроен правильно в `.env.production`
3. Nginx правильно проксирует запросы

```bash
# Проверка Nginx конфигурации
docker-compose -f docker-compose.production.yml exec nginx nginx -t

# Перезагрузка Nginx
docker-compose -f docker-compose.production.yml restart nginx
```

### Telegram бот не отвечает

1. Проверьте, что TELEGRAM_BOT_TOKEN правильный
2. Проверьте логи backend на ошибки
3. Убедитесь, что бот активирован через админ-панель

```bash
# Проверка настроек Telegram в БД
docker-compose -f docker-compose.production.yml exec postgres psql -U vendhub -d vendhub_production -c "SELECT * FROM telegram_settings;"
```

---

## 📊 Проверка производительности

### Метрики API

```bash
# Количество запросов в секунду
docker-compose -f docker-compose.production.yml exec nginx tail -f /var/log/nginx/access.log | pv -l -i10 -r > /dev/null

# Среднее время ответа
docker-compose -f docker-compose.production.yml logs backend | grep "Response time"
```

### Метрики базы данных

```bash
# Подключение к PostgreSQL
docker-compose -f docker-compose.production.yml exec postgres psql -U vendhub -d vendhub_production

# Самые медленные запросы
SELECT query, calls, mean_exec_time, max_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

# Размер базы данных
SELECT pg_size_pretty(pg_database_size('vendhub_production'));

# Размер таблиц
SELECT schemaname, tablename,
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## 💰 Примерная стоимость

**Ежемесячные расходы:**
- **VPS/Сервер**: €20-50 ($22-55)
- **Домен**: €10-15/год ($11-17/год) = ~$1.5/месяц
- **SSL сертификат**: БЕСПЛАТНО (Let's Encrypt)

**Итого: ~$25-60/месяц**

---

## 📞 Поддержка

Если возникли проблемы:

1. Проверьте [документацию](.claude/deployment-guide.md)
2. Посмотрите логи: `docker-compose logs -f`
3. Создайте issue в GitHub
4. Проверьте [Telegram Module README](TELEGRAM_MODULE_README.md)

---

## 🎉 Готово!

Ваш VendHub Manager теперь работает **24/7 онлайн**!

**Что дальше:**
- ✅ Добавьте машины через веб-интерфейс
- ✅ Создайте операторов и техников
- ✅ Настройте задачи и маршруты
- ✅ Подключите Telegram бота
- ✅ Начните импортировать продажи

**Удачи! 🚀**
