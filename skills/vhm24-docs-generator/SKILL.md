---
name: vhm24-docs-generator
description: |
  VendHub Documentation Generator - API документация, архитектурные решения, README.
  Генерирует Swagger/OpenAPI docs, ADR, module README, deployment runbooks.
  Использовать при создании документации, описании API, архитектурных решениях.
  Triggers: "документация", "swagger", "openapi", "readme", "adr", "runbook", "api docs"
---

# VendHub Documentation Generator

Скилл для генерации и поддержки документации VendHub OS.

## Типы документации

```
docs/
├── api/                    # API Reference
│   ├── openapi.yaml       # OpenAPI 3.0 спецификация
│   └── postman/           # Postman collections
├── architecture/          # Architecture Decision Records
│   ├── ADR-001-*.md
│   └── ADR-002-*.md
├── modules/               # Module documentation
│   ├── tasks/README.md
│   └── machines/README.md
├── deployment/            # Deployment guides
│   ├── railway.md
│   └── runbooks/
└── development/           # Developer guides
    ├── getting-started.md
    └── coding-standards.md
```

## Swagger/OpenAPI

Для настройки API документации см. [references/swagger-setup.md](references/swagger-setup.md):
- Swagger UI конфигурация
- OpenAPI decorators
- Response schemas

## Architecture Decision Records

Для создания ADR см. [references/adr-template.md](references/adr-template.md):
- Когда создавать ADR
- Структура документа
- Примеры

## Module README

Для документирования модулей см. [references/module-readme.md](references/module-readme.md):
- Стандартная структура
- API endpoints
- Database schema

## Runbooks

Для создания runbooks см. [references/runbook-template.md](references/runbook-template.md):
- Deployment procedures
- Incident response
- Maintenance tasks

## Быстрый старт

### 1. Swagger UI

```typescript
// backend/src/main.ts
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

const config = new DocumentBuilder()
  .setTitle('VendHub API')
  .setDescription('VendHub OS API Documentation')
  .setVersion('1.0')
  .addBearerAuth()
  .addTag('auth', 'Authentication')
  .addTag('tasks', 'Task Management')
  .addTag('machines', 'Machine Management')
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, document);
```

### 2. Доступ к документации

| Документация | URL |
|--------------|-----|
| Swagger UI | http://localhost:3000/api/docs |
| OpenAPI JSON | http://localhost:3000/api/docs-json |
| OpenAPI YAML | http://localhost:3000/api/docs-yaml |

## Стандарты документации VendHub

### Язык
- Код и комментарии: **English**
- UI тексты: **Russian** (через i18n)
- Документация: **Russian** для пользователей, **English** для разработчиков

### Формат
- Markdown для всей документации
- Mermaid для диаграмм
- OpenAPI 3.0 для API

### Обновление
- Swagger decorators - при изменении API
- ADR - при архитектурных решениях
- README - при добавлении модулей
- Runbooks - при изменении процессов
