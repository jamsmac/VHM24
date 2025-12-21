---
name: release-checklist
description: Генерация полного чек-листа для релиза новой версии.
---

# Release Checklist Generator

Создай чек-лист для релиза:

## Запроси информацию

1. Версия релиза (например: 1.2.0)
2. Тип релиза (major/minor/patch/hotfix)
3. Основные изменения

## Сгенерируй чек-лист

```markdown
# Release Checklist v{version}

**Release Date**: [date]
**Release Type**: [major/minor/patch/hotfix]
**Release Manager**: [name]

---

## Pre-Release (Day -1)

### Code Freeze
- [ ] All planned features merged to main
- [ ] Feature freeze announced to team
- [ ] No new PRs except critical fixes

### Testing
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] E2E tests passing
- [ ] Manual testing completed
- [ ] No P0/P1 bugs open

### Documentation
- [ ] CHANGELOG.md updated
- [ ] API documentation updated
- [ ] User guides updated (if needed)
- [ ] Release notes prepared

### Dependencies
- [ ] npm audit clean (or risks documented)
- [ ] Dependencies up to date
- [ ] No deprecated packages

---

## Release Day

### Build & Deploy Staging
- [ ] Backend build successful
- [ ] Frontend build successful
- [ ] Mobile build successful (if applicable)
- [ ] Deploy to staging
- [ ] Smoke tests on staging passed
- [ ] Performance acceptable
- [ ] No errors in logs

### Database
- [ ] Migrations reviewed
- [ ] Migrations tested on staging
- [ ] Backup created before migration
- [ ] Rollback plan documented

### Production Deployment
- [ ] Deployment window confirmed
- [ ] On-call team notified
- [ ] Monitoring dashboards ready
- [ ] Deploy backend
- [ ] Run database migrations
- [ ] Deploy frontend
- [ ] Health checks passing

### Post-Deployment Verification
- [ ] Smoke tests on production
- [ ] Error rate normal
- [ ] Response time normal
- [ ] Key features working:
  - [ ] Login/logout
  - [ ] Task creation
  - [ ] Photo upload
  - [ ] Commission calculation
  - [ ] Telegram bot

---

## Post-Release

### Monitoring (First 24 hours)
- [ ] Error rate < 1%
- [ ] Response time p95 < 500ms
- [ ] No critical errors
- [ ] User feedback positive

### Communication
- [ ] Stakeholders notified
- [ ] Release notes published
- [ ] Team retrospective scheduled

### Rollback (if needed)
- [ ] Rollback command ready
- [ ] Previous version available
- [ ] Rollback tested

---

## Sign-off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| QA Lead | | | |
| Tech Lead | | | |
| Product Owner | | | |

---

## Changes in This Release

### Features
- [Feature 1]
- [Feature 2]

### Bug Fixes
- [Fix 1]
- [Fix 2]

### Breaking Changes
- [Breaking change 1] (if any)

### Known Issues
- [Issue 1] (if any)
```

## После создания

1. Сохрани чек-лист в `docs/releases/release-{version}-checklist.md`
2. Создай GitHub release draft
3. Уведоми команду о начале релиза
