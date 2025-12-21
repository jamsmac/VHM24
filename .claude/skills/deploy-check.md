---
name: deploy-check
description: Проверка готовности к деплою на production. Включает тесты, security audit и build.
---

# Deploy Readiness Check

Выполни полную проверку готовности к деплою:

## 1. Security Audit

```bash
cd /Users/js/Мой\ диск/3.VendHub/VHM24/VHM24-repo/backend
npm audit --production

cd /Users/js/Мой\ диск/3.VendHub/VHM24/VHM24-repo/frontend
npm audit --production
```

## 2. Tests

```bash
cd /Users/js/Мой\ диск/3.VendHub/VHM24/VHM24-repo/backend
npm run test:cov
```

## 3. Build Verification

```bash
cd /Users/js/Мой\ диск/3.VendHub/VHM24/VHM24-repo/backend
npm run build

cd /Users/js/Мой\ диск/3.VendHub/VHM24/VHM24-repo/frontend
npm run build
```

## 4. Environment Check

Проверь наличие всех необходимых переменных окружения:

### Backend (.env.production)
- DATABASE_URL
- REDIS_URL
- JWT_SECRET
- JWT_REFRESH_SECRET

### Frontend (.env.production)
- NEXT_PUBLIC_API_URL

## Результат

Создай отчет о готовности к деплою:

```markdown
# Deploy Readiness Report

**Date**: [date]
**Status**: READY / NOT READY

## Checks

| Check | Status | Notes |
|-------|--------|-------|
| Security Audit | PASS/FAIL | |
| Backend Tests | PASS/FAIL | Coverage: X% |
| Backend Build | PASS/FAIL | |
| Frontend Build | PASS/FAIL | |
| Env Variables | PASS/FAIL | |

## Blocking Issues

[List any blocking issues]

## Recommendation

[GO / NO-GO decision]
```
