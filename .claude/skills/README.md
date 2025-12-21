# VendHub Manager Skills

Готовые сценарии для автоматизации частых задач разработки.

## Доступные Skills

### /pre-commit
Проверка кода перед коммитом: lint, type-check, tests, build.

### /deploy-check
Проверка готовности к деплою: tests, security audit, build.

### /create-module
Создание нового NestJS модуля с полной структурой.

### /health-check
Проверка состояния всех сервисов (backend, frontend, DB, Redis).

### /security-audit
Полный аудит безопасности проекта.

### /release-checklist
Генерация чек-листа для релиза.

## Как использовать

В Claude Code введите `/` и название skill, например:
```
/pre-commit
/deploy-check
/health-check
```

## Создание новых Skills

Skills хранятся в `.claude/skills/` как markdown файлы с инструкциями.
