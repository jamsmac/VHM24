---
name: security-audit
description: Полный аудит безопасности проекта VendHub Manager.
---

# Security Audit

Выполни полный аудит безопасности:

## 1. Dependency Audit

```bash
# Backend
cd /Users/js/Мой\ диск/3.VendHub/VHM24/VHM24-repo/backend
npm audit

# Frontend
cd /Users/js/Мой\ диск/3.VendHub/VHM24/VHM24-repo/frontend
npm audit

# Mobile
cd /Users/js/Мой\ диск/3.VendHub/VHM24/VHM24-repo/mobile
npm audit
```

## 2. Secret Detection

Проверь на наличие секретов в коде:

```bash
cd /Users/js/Мой\ диск/3.VendHub/VHM24/VHM24-repo

# Поиск потенциальных секретов
grep -rn "password\s*=" --include="*.ts" --exclude-dir=node_modules
grep -rn "secret\s*=" --include="*.ts" --exclude-dir=node_modules
grep -rn "api_key\s*=" --include="*.ts" --exclude-dir=node_modules
grep -rn "token\s*=" --include="*.ts" --exclude-dir=node_modules
```

## 3. Environment Files

Проверь что .env файлы в .gitignore:

```bash
cat .gitignore | grep -E "\.env"
```

## 4. Authentication Checks

Проверь файлы аутентификации:

- `backend/src/modules/auth/auth.service.ts`
- `backend/src/modules/auth/strategies/jwt.strategy.ts`
- `backend/src/modules/auth/guards/`

### Критерии:
- [ ] bcrypt salt >= 10
- [ ] JWT expiration настроен (15 min access, 7 days refresh)
- [ ] Rate limiting на auth endpoints
- [ ] Passwords не логируются

## 5. Authorization Checks

Проверь что все endpoints защищены:

```bash
# Найди endpoints без guards
grep -rn "@Post\|@Get\|@Patch\|@Delete" backend/src/modules --include="*.controller.ts" -A 5 | grep -v "UseGuards"
```

## 6. Input Validation

Проверь наличие валидации:

```bash
# Найди DTOs без валидации
grep -rL "@IsString\|@IsNumber\|@IsUUID" backend/src/modules/*/dto/*.ts 2>/dev/null
```

## 7. SQL Injection

Проверь на сырые SQL запросы:

```bash
grep -rn "\.query\(" backend/src --include="*.ts" --exclude-dir=node_modules
```

## Результат

```markdown
# Security Audit Report

**Date**: [date]
**Auditor**: Claude Code

## Vulnerability Summary

| Severity | Count | Fixed | Pending |
|----------|-------|-------|---------|
| Critical | - | - | - |
| High | - | - | - |
| Moderate | - | - | - |
| Low | - | - | - |

## Findings

### Critical
[List critical findings]

### High
[List high findings]

### Moderate
[List moderate findings]

### Low
[List low findings]

## Recommendations

1. [Recommendation 1]
2. [Recommendation 2]

## Conclusion

**Security Status**: PASS / NEEDS ATTENTION / FAIL
```
