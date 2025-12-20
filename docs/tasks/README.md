# Документация системы задач VendHub Manager

> **Версия**: 2.0
> **Последнее обновление**: 2025-12-20

---

## Обзор

Система задач — центральный механизм управления операциями в VendHub Manager. Все действия операторов с вендинговыми аппаратами проходят через задачи с обязательной фото-валидацией.

---

## Структура документации

| Файл | Содержание |
|------|------------|
| [01-TASKS-OVERVIEW.md](./01-TASKS-OVERVIEW.md) | Архитектура, типы, статусы, модель данных |
| [02-TASKS-LIFECYCLE.md](./02-TASKS-LIFECYCLE.md) | Жизненный цикл: создание, назначение, выполнение |
| [03-TASKS-COMPLETION.md](./03-TASKS-COMPLETION.md) | Логика завершения, фото-валидация, обработка по типам |
| [04-TASKS-API.md](./04-TASKS-API.md) | REST API с примерами запросов |

---

## Быстрый старт

### Типы задач

```typescript
enum TaskType {
  REFILL = 'refill',           // Пополнение товаров
  COLLECTION = 'collection',   // Инкассация денег
  CLEANING = 'cleaning',       // Мойка
  REPAIR = 'repair',           // Ремонт
  REPLACE_GRINDER = '...',     // Замена компонентов
  // ...
}
```

### Статусы

```
PENDING → ASSIGNED → IN_PROGRESS → COMPLETED
                ↓                       ↓
            POSTPONED              REJECTED
```

### Основные принципы

1. **Фото обязательны** — ДО и ПОСЛЕ для завершения
2. **Офлайн режим** — `skip_photos: true`, загрузка позже
3. **Автоматические транзакции** — инвентарь, финансы
4. **Компенсирующие транзакции** — откат при отклонении

---

## Ключевые API эндпоинты

```bash
# Список задач
GET /api/tasks

# Создание
POST /api/tasks

# Жизненный цикл
POST /api/tasks/:id/start
POST /api/tasks/:id/complete
POST /api/tasks/:id/postpone
POST /api/tasks/:id/reject

# Фото
POST /api/files/upload
```

---

## Связанные модули

- **Inventory** — обновление остатков при REFILL
- **Transactions** — финансовые операции при COLLECTION
- **Incidents** — создание инцидентов при расхождениях
- **Files** — хранение фотографий
- **Notifications** — уведомления операторов

---

## Исходный код

```
backend/src/modules/tasks/
├── entities/
│   ├── task.entity.ts
│   ├── task-item.entity.ts
│   ├── task-comment.entity.ts
│   └── task-component.entity.ts
├── services/
│   ├── task-completion.service.ts
│   ├── task-rejection.service.ts
│   └── task-escalation.service.ts
├── tasks.controller.ts
├── tasks.service.ts
└── tasks.module.ts
```

---

*Документация VendHub Manager v2.0*
