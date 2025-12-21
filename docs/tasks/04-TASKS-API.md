# REST API системы задач

> **Версия**: 2.0
> **Последнее обновление**: 2025-12-20
> **Исходный код**: `backend/src/modules/tasks/tasks.controller.ts`
> **Swagger**: `http://localhost:3000/api/docs#/Tasks`

---

## Содержание

1. [Обзор API](#обзор-api)
2. [Аутентификация и авторизация](#аутентификация-и-авторизация)
3. [CRUD операции](#crud-операции)
4. [Управление жизненным циклом](#управление-жизненным-циклом)
5. [Загрузка фотографий](#загрузка-фотографий)
6. [Комментарии к задачам](#комментарии-к-задачам)
7. [Статистика и мониторинг](#статистика-и-мониторинг)
8. [Коды ошибок](#коды-ошибок)
9. [Примеры использования](#примеры-использования)

---

## Обзор API

### Базовый URL

```
/api/tasks
```

### Сводка эндпоинтов

| Метод | Эндпоинт | Описание | Роли |
|-------|----------|----------|------|
| `GET` | `/tasks` | Список задач | ALL |
| `GET` | `/tasks/:id` | Получить задачу | ALL |
| `POST` | `/tasks` | Создать задачу | ADMIN, MANAGER |
| `PUT` | `/tasks/:id` | Обновить задачу | ADMIN, MANAGER |
| `DELETE` | `/tasks/:id` | Отменить задачу | ADMIN, MANAGER |
| `POST` | `/tasks/:id/start` | Начать выполнение | OPERATOR |
| `POST` | `/tasks/:id/complete` | Завершить задачу | OPERATOR |
| `POST` | `/tasks/:id/postpone` | Отложить задачу | OPERATOR |
| `POST` | `/tasks/:id/resume` | Возобновить задачу | ADMIN, MANAGER |
| `POST` | `/tasks/:id/reject` | Отклонить задачу | ADMIN |
| `PUT` | `/tasks/:id/assign` | Назначить оператора | ADMIN, MANAGER |
| `PATCH` | `/tasks/:id/checklist` | Обновить чеклист | OPERATOR |
| `POST` | `/tasks/:id/comments` | Добавить комментарий | ALL |
| `GET` | `/tasks/:id/comments` | Получить комментарии | ALL |
| `GET` | `/tasks/stats` | Статистика | ADMIN, MANAGER |
| `GET` | `/tasks/overdue` | Просроченные | ADMIN, MANAGER |
| `GET` | `/tasks/attention-required` | Требуют внимания | ALL |
| `GET` | `/tasks/pending-photos` | Ждут фото | ALL |
| `GET` | `/tasks/my` | Мои задачи | OPERATOR |

---

## Аутентификация и авторизация

### JWT аутентификация

```bash
Authorization: Bearer <jwt_token>
```

### Роли и права доступа

```typescript
// Файл: backend/src/modules/tasks/tasks.controller.ts

@Controller('tasks')
@ApiTags('Tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  // Все эндпоинты требуют JWT
}
```

### Матрица доступа

| Операция | SUPER_ADMIN | ADMIN | MANAGER | OPERATOR | TECHNICIAN |
|----------|-------------|-------|---------|----------|------------|
| Просмотр всех | ✅ | ✅ | ✅ | ❌ | ❌ |
| Просмотр своих | ✅ | ✅ | ✅ | ✅ | ✅ |
| Создание | ✅ | ✅ | ✅ | ❌ | ❌ |
| Редактирование | ✅ | ✅ | ✅ | ❌ | ❌ |
| Отмена | ✅ | ✅ | ✅ | ❌ | ❌ |
| Назначение | ✅ | ✅ | ✅ | ❌ | ❌ |
| Старт | ❌ | ❌ | ❌ | ✅ | ✅ |
| Завершение | ❌ | ❌ | ❌ | ✅ | ✅ |
| Отложение | ❌ | ❌ | ❌ | ✅ | ✅ |
| Отклонение | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## CRUD операции

### GET /tasks — Список задач

**Описание**: Получение списка задач с фильтрацией и пагинацией.

**Параметры запроса**:

| Параметр | Тип | Описание | Пример |
|----------|-----|----------|--------|
| `page` | number | Номер страницы | `1` |
| `limit` | number | Записей на страницу | `20` |
| `status` | string | Фильтр по статусу | `in_progress` |
| `type_code` | string | Фильтр по типу | `refill` |
| `machine_id` | UUID | Фильтр по аппарату | `uuid` |
| `assigned_to_user_id` | UUID | Фильтр по оператору | `uuid` |
| `priority` | string | Фильтр по приоритету | `high` |
| `from_date` | ISO date | Дата от | `2025-12-01` |
| `to_date` | ISO date | Дата до | `2025-12-31` |
| `sort_by` | string | Сортировка | `due_date` |
| `sort_order` | string | Направление | `ASC` / `DESC` |

**Пример запроса**:

```bash
GET /api/tasks?status=in_progress&type_code=refill&page=1&limit=10
Authorization: Bearer <token>
```

**Пример ответа**:

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "type_code": "refill",
      "status": "in_progress",
      "priority": "high",
      "machine_id": "uuid-machine",
      "machine": {
        "id": "uuid-machine",
        "machine_number": "M-001",
        "name": "Кофе-машина в холле"
      },
      "assigned_to_user_id": "uuid-operator",
      "assigned_to": {
        "id": "uuid-operator",
        "full_name": "Иван Петров",
        "phone": "+998901234567"
      },
      "scheduled_date": "2025-12-20T10:00:00.000Z",
      "due_date": "2025-12-20T14:00:00.000Z",
      "started_at": "2025-12-20T10:15:00.000Z",
      "description": "Пополнить кофе и молоко",
      "has_photo_before": true,
      "has_photo_after": false,
      "created_at": "2025-12-19T15:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "total_pages": 5
  }
}
```

---

### GET /tasks/:id — Получить задачу

**Описание**: Получение полной информации о задаче со всеми связями.

**Пример запроса**:

```bash
GET /api/tasks/550e8400-e29b-41d4-a716-446655440001
Authorization: Bearer <token>
```

**Пример ответа**:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "type_code": "refill",
  "status": "in_progress",
  "priority": "high",
  "machine_id": "uuid-machine",
  "machine": {
    "id": "uuid-machine",
    "machine_number": "M-001",
    "name": "Кофе-машина в холле",
    "location": {
      "id": "uuid-location",
      "name": "Бизнес-центр Главный"
    }
  },
  "assigned_to_user_id": "uuid-operator",
  "assigned_to": {
    "id": "uuid-operator",
    "full_name": "Иван Петров",
    "phone": "+998901234567",
    "role": "operator"
  },
  "created_by_user_id": "uuid-manager",
  "created_by": {
    "id": "uuid-manager",
    "full_name": "Анна Сидорова"
  },
  "scheduled_date": "2025-12-20T10:00:00.000Z",
  "due_date": "2025-12-20T14:00:00.000Z",
  "started_at": "2025-12-20T10:15:00.000Z",
  "completed_at": null,
  "description": "Пополнить кофе и молоко",
  "checklist": [
    { "item": "Проверить бункеры", "completed": true },
    { "item": "Очистить поддон", "completed": false }
  ],
  "has_photo_before": true,
  "has_photo_after": false,
  "pending_photos": false,
  "offline_completed": false,
  "items": [
    {
      "id": "uuid-item-1",
      "nomenclature_id": "uuid-coffee",
      "nomenclature": {
        "id": "uuid-coffee",
        "name": "Кофе арабика",
        "unit": "kg"
      },
      "planned_quantity": 5,
      "actual_quantity": null,
      "unit_of_measure_code": "kg"
    },
    {
      "id": "uuid-item-2",
      "nomenclature_id": "uuid-milk",
      "nomenclature": {
        "id": "uuid-milk",
        "name": "Молоко 3.2%",
        "unit": "liter"
      },
      "planned_quantity": 10,
      "actual_quantity": null,
      "unit_of_measure_code": "liter"
    }
  ],
  "comments": [
    {
      "id": "uuid-comment",
      "user_id": "uuid-manager",
      "user": { "full_name": "Анна Сидорова" },
      "comment": "Обрати внимание на срок годности молока",
      "is_internal": false,
      "created_at": "2025-12-19T15:05:00.000Z"
    }
  ],
  "created_at": "2025-12-19T15:00:00.000Z",
  "updated_at": "2025-12-20T10:15:00.000Z"
}
```

---

### POST /tasks — Создать задачу

**Описание**: Создание новой задачи.

**Доступ**: `ADMIN`, `SUPER_ADMIN`, `MANAGER`

**Тело запроса**:

```json
{
  "type_code": "refill",
  "priority": "high",
  "machine_id": "550e8400-e29b-41d4-a716-446655440001",
  "assigned_to_user_id": "550e8400-e29b-41d4-a716-446655440002",
  "created_by_user_id": "550e8400-e29b-41d4-a716-446655440003",
  "scheduled_date": "2025-12-20T10:00:00Z",
  "due_date": "2025-12-20T14:00:00Z",
  "description": "Пополнить кофе и молоко",
  "checklist": [
    { "item": "Проверить бункеры", "completed": false },
    { "item": "Очистить поддон", "completed": false }
  ],
  "items": [
    {
      "nomenclature_id": "uuid-coffee",
      "planned_quantity": 5,
      "unit_of_measure_code": "kg"
    },
    {
      "nomenclature_id": "uuid-milk",
      "planned_quantity": 10,
      "unit_of_measure_code": "liter"
    }
  ]
}
```

**Пример ответа** (201 Created):

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440099",
  "type_code": "refill",
  "status": "assigned",
  "priority": "high",
  ...
}
```

---

### PUT /tasks/:id — Обновить задачу

**Описание**: Обновление задачи (до начала выполнения).

**Доступ**: `ADMIN`, `SUPER_ADMIN`, `MANAGER`

**Ограничения**: Нельзя обновить задачу в статусе `COMPLETED` или `CANCELLED`.

**Тело запроса**:

```json
{
  "priority": "urgent",
  "due_date": "2025-12-20T12:00:00Z",
  "description": "СРОЧНО! Пополнить кофе",
  "checklist": [
    { "item": "Проверить бункеры", "completed": false }
  ]
}
```

---

### DELETE /tasks/:id — Отменить задачу

**Описание**: Отмена задачи (soft cancel, переводит в статус `CANCELLED`).

**Доступ**: `ADMIN`, `SUPER_ADMIN`, `MANAGER`

**Ограничения**: Нельзя отменить завершенную задачу. Для этого используйте отклонение.

**Пример запроса**:

```bash
DELETE /api/tasks/550e8400-e29b-41d4-a716-446655440001
Authorization: Bearer <token>
```

**Ответ** (200 OK):

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "status": "cancelled",
  ...
}
```

---

## Управление жизненным циклом

### POST /tasks/:id/start — Начать выполнение

**Описание**: Оператор начинает выполнение задачи.

**Доступ**: Только назначенный `OPERATOR` или `TECHNICIAN`

**Пример запроса**:

```bash
POST /api/tasks/550e8400-e29b-41d4-a716-446655440001/start
Authorization: Bearer <operator_token>
```

**Ответ** (200 OK):

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "status": "in_progress",
  "started_at": "2025-12-20T10:15:00.000Z",
  ...
}
```

**Возможные ошибки**:

| Код | Причина |
|-----|---------|
| 400 | Задача не в статусе ASSIGNED |
| 403 | Пользователь не является назначенным оператором |

---

### POST /tasks/:id/complete — Завершить задачу

**Описание**: Завершение задачи оператором.

**Доступ**: Только назначенный `OPERATOR` или `TECHNICIAN`

**Тело запроса для REFILL**:

```json
{
  "items": [
    { "nomenclature_id": "uuid-coffee", "actual_quantity": 4.5 },
    { "nomenclature_id": "uuid-milk", "actual_quantity": 9.8 }
  ],
  "completion_notes": "Молоко было с коротким сроком годности, взял меньше",
  "skip_photos": false
}
```

**Тело запроса для COLLECTION**:

```json
{
  "actual_cash_amount": 148500.50,
  "completion_notes": "Все купюры пересчитаны",
  "skip_photos": false
}
```

**Тело запроса для офлайн режима**:

```json
{
  "actual_cash_amount": 148500.50,
  "skip_photos": true,
  "operation_date": "2025-12-20T11:30:00Z",
  "completion_notes": "Выполнено без интернета, фото загружу позже"
}
```

**Ответ** (200 OK):

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "status": "completed",
  "completed_at": "2025-12-20T12:00:00.000Z",
  "operation_date": "2025-12-20T11:30:00.000Z",
  "pending_photos": true,
  "offline_completed": true,
  ...
}
```

**Возможные ошибки**:

| Код | Причина |
|-----|---------|
| 400 | Задача не в статусе IN_PROGRESS |
| 400 | Отсутствует фото ДО |
| 400 | Отсутствует фото ПОСЛЕ |
| 400 | Не все пункты чеклиста выполнены |
| 400 | Не указана actual_cash_amount для COLLECTION |
| 403 | Пользователь не является назначенным оператором |

---

### POST /tasks/:id/postpone — Отложить задачу

**Описание**: Оператор откладывает задачу с указанием причины.

**Доступ**: Только назначенный `OPERATOR` или `TECHNICIAN`

**Тело запроса**:

```json
{
  "reason": "Нет доступа к локации, охрана не пускает"
}
```

**Ответ** (200 OK):

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "status": "postponed",
  "postpone_reason": "Нет доступа к локации, охрана не пускает",
  ...
}
```

---

### POST /tasks/:id/resume — Возобновить задачу

**Описание**: Возврат отложенной задачи в работу.

**Доступ**: `ADMIN`, `SUPER_ADMIN`, `MANAGER`

**Пример запроса**:

```bash
POST /api/tasks/550e8400-e29b-41d4-a716-446655440001/resume
Authorization: Bearer <manager_token>
```

**Ответ** (200 OK):

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "status": "assigned",
  "postpone_reason": null,
  ...
}
```

---

### POST /tasks/:id/reject — Отклонить задачу

**Описание**: Администратор отклоняет завершенную задачу с откатом всех изменений.

**Доступ**: Только `ADMIN`, `SUPER_ADMIN`

**Тело запроса**:

```json
{
  "reason": "Фактическая сумма не соответствует, требуется повторная проверка"
}
```

**Что происходит при отклонении**:

1. **REFILL**: Инвентарь возвращается от машины к оператору
2. **COLLECTION**: Создается компенсирующая транзакция REFUND

**Ответ** (200 OK):

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "status": "rejected",
  "rejected_at": "2025-12-20T14:00:00.000Z",
  "rejected_by_user_id": "uuid-admin",
  "rejection_reason": "Фактическая сумма не соответствует...",
  ...
}
```

---

### PUT /tasks/:id/assign — Назначить оператора

**Описание**: Назначение или переназначение задачи на другого оператора.

**Доступ**: `ADMIN`, `SUPER_ADMIN`, `MANAGER`

**Тело запроса**:

```json
{
  "assigned_to_user_id": "550e8400-e29b-41d4-a716-446655440005"
}
```

**Ответ** (200 OK):

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "status": "assigned",
  "assigned_to_user_id": "550e8400-e29b-41d4-a716-446655440005",
  ...
}
```

---

### PATCH /tasks/:id/checklist — Обновить чеклист

**Описание**: Обновление статуса пунктов чеклиста.

**Доступ**: Только назначенный `OPERATOR` или `TECHNICIAN`

**Тело запроса**:

```json
{
  "checklist": [
    { "item": "Проверить бункеры", "completed": true },
    { "item": "Очистить поддон", "completed": true }
  ]
}
```

**Ответ** (200 OK):

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "checklist": [
    { "item": "Проверить бункеры", "completed": true },
    { "item": "Очистить поддон", "completed": true }
  ],
  ...
}
```

---

## Загрузка фотографий

### POST /files/upload — Загрузка фото

**Эндпоинт**: `/api/files/upload` (из модуля Files)

**Описание**: Загрузка фотографии ДО или ПОСЛЕ.

**Content-Type**: `multipart/form-data`

**Параметры формы**:

| Параметр | Тип | Описание |
|----------|-----|----------|
| `file` | File | Файл изображения (JPG, PNG) |
| `entity_type` | string | `task` |
| `entity_id` | UUID | ID задачи |
| `file_type` | string | `task_photo_before` или `task_photo_after` |

**Пример (curl)**:

```bash
# Фото ДО
curl -X POST /api/files/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@/path/to/before.jpg" \
  -F "entity_type=task" \
  -F "entity_id=550e8400-e29b-41d4-a716-446655440001" \
  -F "file_type=task_photo_before"

# Фото ПОСЛЕ
curl -X POST /api/files/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@/path/to/after.jpg" \
  -F "entity_type=task" \
  -F "entity_id=550e8400-e29b-41d4-a716-446655440001" \
  -F "file_type=task_photo_after"
```

**Ответ** (201 Created):

```json
{
  "id": "uuid-file",
  "filename": "task_photo_before_1703059200000.jpg",
  "url": "https://storage.vendhub.uz/files/task_photo_before_1703059200000.jpg",
  "mime_type": "image/jpeg",
  "size": 245678,
  "entity_type": "task",
  "entity_id": "550e8400-e29b-41d4-a716-446655440001",
  "file_type": "task_photo_before"
}
```

---

## Комментарии к задачам

### POST /tasks/:id/comments — Добавить комментарий

**Описание**: Добавление комментария к задаче.

**Тело запроса**:

```json
{
  "comment": "Обрати внимание на срок годности молока",
  "is_internal": false
}
```

**is_internal**:
- `false` — виден оператору
- `true` — виден только админам/менеджерам

**Ответ** (201 Created):

```json
{
  "id": "uuid-comment",
  "task_id": "550e8400-e29b-41d4-a716-446655440001",
  "user_id": "uuid-manager",
  "comment": "Обрати внимание на срок годности молока",
  "is_internal": false,
  "created_at": "2025-12-20T10:30:00.000Z"
}
```

---

### GET /tasks/:id/comments — Получить комментарии

**Описание**: Получение списка комментариев к задаче.

**Примечание**: Операторы не видят комментарии с `is_internal: true`.

**Ответ** (200 OK):

```json
[
  {
    "id": "uuid-comment-1",
    "user": { "id": "uuid-manager", "full_name": "Анна Сидорова" },
    "comment": "Обрати внимание на срок годности молока",
    "is_internal": false,
    "created_at": "2025-12-20T10:30:00.000Z"
  },
  {
    "id": "uuid-comment-2",
    "user": { "id": "uuid-operator", "full_name": "Иван Петров" },
    "comment": "Понял, проверю",
    "is_internal": false,
    "created_at": "2025-12-20T10:35:00.000Z"
  }
]
```

---

## Статистика и мониторинг

### GET /tasks/stats — Статистика по задачам

**Описание**: Получение агрегированной статистики.

**Доступ**: `ADMIN`, `SUPER_ADMIN`, `MANAGER`

**Параметры запроса**:

| Параметр | Тип | Описание |
|----------|-----|----------|
| `machine_id` | UUID | Фильтр по аппарату |
| `user_id` | UUID | Фильтр по оператору |

**Ответ** (200 OK):

```json
{
  "total": 1250,
  "by_status": {
    "pending": 15,
    "assigned": 45,
    "in_progress": 12,
    "completed": 1150,
    "cancelled": 20,
    "rejected": 8
  },
  "by_type": {
    "refill": 650,
    "collection": 400,
    "cleaning": 120,
    "repair": 50,
    "replace_grinder": 15,
    "replace_hopper": 10,
    "inspection": 5
  },
  "overdue": 7
}
```

---

### GET /tasks/overdue — Просроченные задачи

**Описание**: Список задач с истекшим сроком выполнения.

**Доступ**: `ADMIN`, `SUPER_ADMIN`, `MANAGER`

**Ответ** (200 OK):

```json
[
  {
    "id": "uuid-task-1",
    "type_code": "refill",
    "status": "assigned",
    "due_date": "2025-12-19T14:00:00.000Z",
    "overdue_hours": 22,
    "machine": { "machine_number": "M-001" },
    "assigned_to": { "full_name": "Иван Петров" }
  },
  {
    "id": "uuid-task-2",
    "type_code": "collection",
    "status": "in_progress",
    "due_date": "2025-12-19T18:00:00.000Z",
    "overdue_hours": 18,
    "machine": { "machine_number": "M-005" },
    "assigned_to": { "full_name": "Петр Сидоров" }
  }
]
```

---

### GET /tasks/attention-required — Задачи, требующие внимания

**Описание**: Задачи с проблемами: просроченные, скоро истекающие, ждут фото.

**Ответ** (200 OK):

```json
{
  "overdue": [
    { "id": "uuid", "type_code": "refill", "overdue_hours": 5 }
  ],
  "due_soon": [
    { "id": "uuid", "type_code": "collection", "hours_left": 3 }
  ],
  "pending_photos": [
    { "id": "uuid", "type_code": "refill", "completed_at": "2025-12-20T10:00:00Z" }
  ]
}
```

---

### GET /tasks/pending-photos — Задачи, ожидающие фото

**Описание**: Завершенные офлайн задачи, для которых не загружены фото.

**Ответ** (200 OK):

```json
[
  {
    "id": "uuid-task",
    "type_code": "refill",
    "status": "completed",
    "completed_at": "2025-12-20T10:00:00.000Z",
    "operation_date": "2025-12-20T09:30:00.000Z",
    "pending_photos": true,
    "has_photo_before": false,
    "has_photo_after": false,
    "machine": { "machine_number": "M-001" },
    "assigned_to": { "full_name": "Иван Петров" }
  }
]
```

---

### GET /tasks/my — Мои задачи

**Описание**: Задачи текущего пользователя (оператора).

**Параметры запроса**:

| Параметр | Тип | Описание |
|----------|-----|----------|
| `status` | string | Фильтр по статусу |

**Ответ** (200 OK):

```json
{
  "assigned": [
    { "id": "uuid-1", "type_code": "refill", "machine_number": "M-001" }
  ],
  "in_progress": [
    { "id": "uuid-2", "type_code": "collection", "machine_number": "M-005" }
  ],
  "pending_photos": [
    { "id": "uuid-3", "type_code": "cleaning", "machine_number": "M-010" }
  ]
}
```

---

## Коды ошибок

### HTTP статусы

| Код | Описание |
|-----|----------|
| 200 | Успешный запрос |
| 201 | Ресурс создан |
| 400 | Ошибка валидации |
| 401 | Не авторизован |
| 403 | Нет прав доступа |
| 404 | Ресурс не найден |
| 409 | Конфликт состояния |
| 500 | Внутренняя ошибка |

### Формат ошибок

```json
{
  "statusCode": 400,
  "message": "Для завершения задачи необходимо загрузить фотографию ДО начала работы",
  "error": "Bad Request",
  "timestamp": "2025-12-20T12:00:00.000Z",
  "path": "/api/tasks/uuid/complete"
}
```

### Типичные ошибки

| Сценарий | Код | Сообщение |
|----------|-----|-----------|
| Старт не ASSIGNED | 400 | Можно начать только назначенную задачу |
| Завершение не IN_PROGRESS | 400 | Можно завершить только выполняемую задачу |
| Нет фото ДО | 400 | Необходимо загрузить фотографию ДО |
| Нет фото ПОСЛЕ | 400 | Необходимо загрузить фотографию ПОСЛЕ |
| Чеклист не выполнен | 400 | Не все пункты чеклиста выполнены |
| Не оператор задачи | 403 | Только назначенный оператор... |
| Не админ для отклонения | 403 | Только администраторы могут отклонять |

---

## Примеры использования

### Полный цикл REFILL задачи

```bash
# 1. Создание задачи (менеджер)
POST /api/tasks
{
  "type_code": "refill",
  "machine_id": "uuid-machine",
  "assigned_to_user_id": "uuid-operator",
  "created_by_user_id": "uuid-manager",
  "due_date": "2025-12-20T14:00:00Z",
  "items": [
    { "nomenclature_id": "uuid-coffee", "planned_quantity": 5, "unit_of_measure_code": "kg" }
  ]
}

# 2. Оператор получает уведомление в Telegram

# 3. Старт (оператор)
POST /api/tasks/{task_id}/start

# 4. Загрузка фото ДО (оператор)
POST /api/files/upload
(form-data: file, entity_type=task, entity_id={task_id}, file_type=task_photo_before)

# 5. Выполнение работы...

# 6. Загрузка фото ПОСЛЕ (оператор)
POST /api/files/upload
(form-data: file, entity_type=task, entity_id={task_id}, file_type=task_photo_after)

# 7. Завершение (оператор)
POST /api/tasks/{task_id}/complete
{
  "items": [
    { "nomenclature_id": "uuid-coffee", "actual_quantity": 4.5 }
  ],
  "completion_notes": "Выполнено"
}

# 8. Менеджер получает уведомление о завершении
```

### Офлайн сценарий

```bash
# 1. Старт
POST /api/tasks/{task_id}/start

# 2. Выполнение без интернета...

# 3. Завершение с пропуском фото
POST /api/tasks/{task_id}/complete
{
  "actual_cash_amount": 45000,
  "skip_photos": true,
  "operation_date": "2025-12-20T11:30:00Z"
}

# 4. Позже, когда есть интернет — загрузка фото
POST /api/files/upload (task_photo_before)
POST /api/files/upload (task_photo_after)

# 5. Система автоматически снимает флаг pending_photos
```

---

## Навигация

- **Назад**: [03-TASKS-COMPLETION.md](./03-TASKS-COMPLETION.md) — Логика завершения
- **Также**: [01-TASKS-OVERVIEW.md](./01-TASKS-OVERVIEW.md) — Обзор системы
- **Также**: [02-TASKS-LIFECYCLE.md](./02-TASKS-LIFECYCLE.md) — Жизненный цикл

---

*Документация создана на основе исходного кода: `backend/src/modules/tasks/tasks.controller.ts`*
