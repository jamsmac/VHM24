---
name: health-check
description: Проверка состояния всех сервисов VendHub Manager (backend, frontend, DB, Redis).
---

# Health Check

Проверь состояние всех сервисов:

## 1. Backend API Health

```bash
# Если запущен локально
curl -s http://localhost:3000/health | jq

# Или проверь health/ready
curl -s http://localhost:3000/health/ready | jq
```

## 2. Database Connection

```bash
cd /Users/js/Мой\ диск/3.VendHub/VHM24/VHM24-repo/backend
pg_isready -h localhost -p 5432
```

## 3. Redis Connection

```bash
redis-cli ping
```

## 4. Docker Services (если используется docker-compose)

```bash
cd /Users/js/Мой\ диск/3.VendHub/VHM24/VHM24-repo
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

## 5. Railway Status (если задеплоено)

```bash
railway status
```

## Результат

```markdown
# VendHub Health Report

**Timestamp**: [timestamp]

## Services Status

| Service | Status | Details |
|---------|--------|---------|
| Backend API | OK/DOWN | |
| PostgreSQL | OK/DOWN | |
| Redis | OK/DOWN | |
| Frontend | OK/DOWN | |

## Queue Health

| Queue | Waiting | Active | Completed | Failed |
|-------|---------|--------|-----------|--------|
| commission-queue | - | - | - | - |

## Recommendations

[Any recommended actions]
```
