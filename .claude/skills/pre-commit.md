---
name: pre-commit
description: Полная проверка кода перед коммитом. Запускает lint, type-check, tests и build для backend и frontend.
---

# Pre-Commit Check

Выполни следующие проверки последовательно:

## Backend

```bash
cd /Users/js/Мой\ диск/3.VendHub/VHM24/VHM24-repo/backend

# 1. Lint check
npm run lint

# 2. Type check
npm run type-check

# 3. Tests
npm run test

# 4. Build
npm run build
```

## Frontend

```bash
cd /Users/js/Мой\ диск/3.VendHub/VHM24/VHM24-repo/frontend

# 1. Lint check
npm run lint

# 2. Type check
npm run type-check

# 3. Build
npm run build
```

## Результат

После выполнения всех проверок:
1. Если все проверки пройдены - сообщи "Pre-commit checks passed"
2. Если есть ошибки - выведи список и предложи исправления

## Критерии успеха

- [ ] Backend lint: 0 errors
- [ ] Backend types: 0 errors
- [ ] Backend tests: all passing
- [ ] Backend build: success
- [ ] Frontend lint: 0 errors
- [ ] Frontend types: 0 errors
- [ ] Frontend build: success
