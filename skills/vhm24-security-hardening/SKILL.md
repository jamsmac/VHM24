---
name: vhm24-security-hardening
description: |
  VendHub Security Hardening - защита API, CORS, rate limiting, input validation.
  Настраивает Helmet.js, CSRF protection, SQL injection prevention, audit logging.
  Использовать при настройке безопасности, защите endpoints, валидации данных.
  Triggers: "security", "cors", "rate limit", "helmet", "csrf", "validation", "sanitization", "audit", "защита"
---

# VendHub Security Hardening

Скилл для настройки безопасности VendHub OS.

## Security Layers

```
┌─────────────────────────────────────────────────────────────┐
│                      Internet                                │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                   Cloudflare / CDN                          │
│  • DDoS protection                                          │
│  • WAF rules                                                │
│  • SSL termination                                          │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                   Nginx / Load Balancer                     │
│  • Rate limiting                                            │
│  • Request size limits                                      │
│  • SSL/TLS                                                  │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                   NestJS Application                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Helmet.js (Security Headers)                        │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ CORS (Cross-Origin Resource Sharing)                │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ Rate Limiting (Throttler)                           │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ Input Validation (class-validator + Zod)            │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ Authentication (JWT + Passport)                     │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ Authorization (RBAC)                                │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ Audit Logging                                       │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Компоненты

| Компонент | Назначение | Пакет |
|-----------|------------|-------|
| Helmet | Security headers | helmet |
| CORS | Cross-origin requests | @nestjs/cors |
| Throttler | Rate limiting | @nestjs/throttler |
| Validation | Input validation | class-validator |
| Sanitization | XSS prevention | class-transformer |
| CSRF | CSRF protection | csurf |

## Паттерны

### Security Headers

Для настройки Helmet см. [references/helmet-config.md](references/helmet-config.md):
- Content-Security-Policy
- X-Frame-Options
- X-Content-Type-Options

### CORS

Для настройки CORS см. [references/cors-config.md](references/cors-config.md):
- Whitelist доменов
- Credentials
- Methods/Headers

### Rate Limiting

Для настройки rate limiting см. [references/rate-limiting.md](references/rate-limiting.md):
- Global limits
- Per-endpoint limits
- Bypass для админов

### Input Validation

Для валидации входных данных см. [references/input-validation.md](references/input-validation.md):
- DTO validation
- Sanitization
- Custom validators

### Audit Logging

Для аудита действий см. [references/audit-logging.md](references/audit-logging.md):
- User actions
- Data changes
- Security events

## Быстрый старт

### 1. Установка зависимостей

```bash
npm install helmet @nestjs/throttler
npm install class-validator class-transformer
npm install express-rate-limit
npm install sanitize-html dompurify
```

### 2. Базовая настройка

```typescript
// main.ts
import helmet from 'helmet';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security headers
  app.use(helmet());

  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3001'],
    credentials: true,
  });

  // Global validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,          // Strip unknown properties
    forbidNonWhitelisted: true, // Throw on unknown properties
    transform: true,          // Auto-transform types
  }));

  await app.listen(3000);
}
```

## Security Checklist

### Authentication
- [x] JWT с коротким временем жизни (15 min)
- [x] Refresh token rotation
- [x] Password hashing (bcrypt, 12 rounds)
- [x] Telegram OAuth

### Authorization
- [x] RBAC (Role-Based Access Control)
- [x] Permission guards
- [x] Resource ownership checks

### Input/Output
- [ ] All inputs validated (class-validator)
- [ ] SQL injection prevention (TypeORM)
- [ ] XSS prevention (sanitize-html)
- [ ] Output encoding

### Transport
- [ ] HTTPS only
- [ ] HSTS enabled
- [ ] Secure cookies

### Rate Limiting
- [ ] Global: 100 req/min
- [ ] Auth endpoints: 5 req/min
- [ ] API endpoints: 60 req/min

### Headers
- [ ] Helmet.js configured
- [ ] CSP policy defined
- [ ] X-Frame-Options: DENY

### Monitoring
- [ ] Failed login attempts logged
- [ ] Suspicious activity alerts
- [ ] Audit trail for sensitive actions

## Environment Variables

```bash
# CORS
CORS_ORIGINS=https://app.vendhub.uz,https://admin.vendhub.uz

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=100

# JWT
JWT_SECRET=<32+ characters>
JWT_EXPIRATION=15m
JWT_REFRESH_SECRET=<32+ characters>
JWT_REFRESH_EXPIRATION=7d

# Cookies
COOKIE_SECRET=<32+ characters>
COOKIE_SECURE=true
COOKIE_SAME_SITE=strict
```

## Troubleshooting

| Проблема | Проверить | Решение |
|----------|-----------|---------|
| CORS error | CORS_ORIGINS | Добавить домен в whitelist |
| Rate limit hit | IP whitelist | Добавить IP в bypass |
| 403 Forbidden | RBAC permissions | Проверить роль пользователя |
| Invalid token | JWT_SECRET | Проверить совпадение secrets |
| XSS detected | CSP headers | Обновить CSP policy |
