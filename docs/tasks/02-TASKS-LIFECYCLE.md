# Жизненный цикл задачи

> **Версия**: 2.0
> **Последнее обновление**: 2025-12-20
> **Исходный код**: `backend/src/modules/tasks/tasks.service.ts`

---

## Содержание

1. [Обзор жизненного цикла](#обзор-жизненного-цикла)
2. [Этап 1: Создание задачи](#этап-1-создание-задачи)
3. [Этап 2: Назначение оператору](#этап-2-назначение-оператору)
4. [Этап 3: Начало выполнения](#этап-3-начало-выполнения)
5. [Этап 4: Выполнение и завершение](#этап-4-выполнение-и-завершение)
6. [Альтернативные сценарии](#альтернативные-сценарии)
7. [Отложение задачи](#отложение-задачи)
8. [Отмена задачи](#отмена-задачи)
9. [Отклонение задачи](#отклонение-задачи)
10. [Эскалация](#эскалация)
11. [Диаграммы последовательности](#диаграммы-последовательности)

---

## Обзор жизненного цикла

### Основной поток

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       ЖИЗНЕННЫЙ ЦИКЛ ЗАДАЧИ                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────┐   ┌──────────┐   ┌─────────────┐   ┌───────────────────┐ │
│  │ СОЗДАНИЕ │──>│НАЗНАЧЕНИЕ│──>│   СТАРТ     │──>│    ВЫПОЛНЕНИЕ     │ │
│  │ (менеджер)│   │(оператор)│   │(IN_PROGRESS)│   │ (загрузка фото)   │ │
│  └──────────┘   └──────────┘   └─────────────┘   └─────────┬─────────┘ │
│       │              │               │                      │           │
│  POST /tasks   PUT /tasks/:id   POST /tasks/:id/start   Фото до/после  │
│                /assign                                      │           │
│                                                             ▼           │
│                                                    ┌───────────────────┐│
│  ┌──────────┐   ┌──────────┐                      │    ЗАВЕРШЕНИЕ     ││
│  │ ОТКЛОНЕНО│<──│ ПРОВЕРКА │<─────────────────────│  POST /complete   ││
│  │  (откат) │   │ (админ)  │                      └───────────────────┘│
│  └──────────┘   └──────────┘                                            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Временные метки

| Событие | Поле в БД | Описание |
|---------|-----------|----------|
| Создание | `created_at` | Когда задача создана |
| Назначение | — | Обновляется `assigned_to_user_id` |
| Старт | `started_at` | Оператор начал выполнение |
| Завершение | `completed_at` | Системное время завершения |
| Фактическое выполнение | `operation_date` | Для офлайн режима |

---

## Этап 1: Создание задачи

### Кто может создавать

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
@Post()
async create(@Body() createTaskDto: CreateTaskDto) {
  // Только ADMIN, SUPER_ADMIN, MANAGER
}
```

### DTO создания

```typescript
// Файл: backend/src/modules/tasks/dto/create-task.dto.ts

export class CreateTaskDto {
  @IsEnum(TaskType)
  type_code: TaskType;                // Тип задачи (обязательно)

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;            // Приоритет (по умолчанию NORMAL)

  @IsUUID()
  machine_id: string;                 // ID аппарата (обязательно)

  @IsUUID()
  assigned_to_user_id: string;        // ID оператора (обязательно)

  @IsUUID()
  created_by_user_id: string;         // ID создателя (обязательно)

  @IsOptional()
  @IsDateString()
  scheduled_date?: string;            // Запланированная дата

  @IsOptional()
  @IsDateString()
  due_date?: string;                  // Срок выполнения

  @IsOptional()
  @IsString()
  description?: string;               // Описание задачи

  @IsOptional()
  @IsArray()
  checklist?: Array<{                 // Чеклист
    item: string;
    completed: boolean;
  }>;

  @IsOptional()
  @IsNumber()
  @Min(0)
  expected_cash_amount?: number;      // Ожидаемая сумма (для COLLECTION)

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateTaskItemDto)
  items?: CreateTaskItemDto[];        // Товары (для REFILL)

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => TaskComponentDto)
  components?: TaskComponentDto[];    // Компоненты (для REPLACE_*)

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;     // Произвольные данные
}
```

### Логика создания в сервисе

```typescript
// Файл: backend/src/modules/tasks/tasks.service.ts

async create(createTaskDto: CreateTaskDto): Promise<Task> {
  // 1. Проверка существования машины
  const machine = await this.machinesService.findOne(createTaskDto.machine_id);

  // 2. Проверка существования оператора
  const operator = await this.usersService.findOne(createTaskDto.assigned_to_user_id);

  // 3. Проверка роли оператора
  if (operator.role !== UserRole.OPERATOR && operator.role !== UserRole.TECHNICIAN) {
    throw new BadRequestException(
      'Задачу можно назначить только оператору или технику'
    );
  }

  // 4. Создание задачи
  const task = this.taskRepository.create({
    ...createTaskDto,
    status: TaskStatus.ASSIGNED, // Сразу ASSIGNED если есть оператор
    scheduled_date: createTaskDto.scheduled_date
      ? new Date(createTaskDto.scheduled_date)
      : null,
    due_date: createTaskDto.due_date
      ? new Date(createTaskDto.due_date)
      : null,
  });

  // 5. Сохранение
  const savedTask = await this.taskRepository.save(task);

  // 6. Создание TaskItems если есть
  if (createTaskDto.items && createTaskDto.items.length > 0) {
    await this.createTaskItems(savedTask.id, createTaskDto.items);
  }

  // 7. Создание TaskComponents если есть
  if (createTaskDto.components && createTaskDto.components.length > 0) {
    await this.createTaskComponents(savedTask.id, createTaskDto.components);
  }

  // 8. Уведомление оператора
  await this.notificationsService.create({
    type: NotificationType.TASK_ASSIGNED,
    channel: NotificationChannel.TELEGRAM,
    recipient_id: operator.id,
    title: 'Новая задача',
    message: `Вам назначена задача ${task.type_code} для аппарата ${machine.machine_number}`,
    data: { task_id: savedTask.id },
    action_url: `/tasks/${savedTask.id}`,
  });

  // 9. Аудит лог
  await this.auditLogService.log({
    event_type: AuditEventType.TASK_CREATED,
    user_id: createTaskDto.created_by_user_id,
    description: `Создана задача ${task.type_code}`,
    metadata: {
      task_id: savedTask.id,
      machine_id: task.machine_id,
      assigned_to: task.assigned_to_user_id,
    },
  });

  return savedTask;
}
```

### Пример запроса создания REFILL

```json
POST /api/tasks
Content-Type: application/json
Authorization: Bearer <jwt_token>

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
    {"item": "Проверить бункеры", "completed": false},
    {"item": "Почистить поддон", "completed": false}
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

### Пример запроса создания COLLECTION

```json
POST /api/tasks
Content-Type: application/json
Authorization: Bearer <jwt_token>

{
  "type_code": "collection",
  "priority": "normal",
  "machine_id": "550e8400-e29b-41d4-a716-446655440001",
  "assigned_to_user_id": "550e8400-e29b-41d4-a716-446655440002",
  "created_by_user_id": "550e8400-e29b-41d4-a716-446655440003",
  "due_date": "2025-12-20T18:00:00Z",
  "description": "Плановая инкассация",
  "expected_cash_amount": 150000,
  "checklist": [
    {"item": "Пересчитать наличные", "completed": false},
    {"item": "Проверить купюроприемник", "completed": false}
  ]
}
```

### Пример запроса создания REPLACE_GRINDER

```json
POST /api/tasks
Content-Type: application/json
Authorization: Bearer <jwt_token>

{
  "type_code": "replace_grinder",
  "priority": "urgent",
  "machine_id": "550e8400-e29b-41d4-a716-446655440001",
  "assigned_to_user_id": "550e8400-e29b-41d4-a716-446655440002",
  "created_by_user_id": "550e8400-e29b-41d4-a716-446655440003",
  "due_date": "2025-12-20T12:00:00Z",
  "description": "Срочная замена изношенной кофемолки",
  "components": [
    {
      "component_id": "uuid-old-grinder",
      "role": "old",
      "notes": "Износ более 80%, шум при работе"
    },
    {
      "component_id": "uuid-new-grinder",
      "role": "new",
      "notes": "Новая кофемолка со склада"
    }
  ]
}
```

---

## Этап 2: Назначение оператору

### Автоматическое назначение

При создании задачи с указанием `assigned_to_user_id` задача сразу получает статус `ASSIGNED`.

### Переназначение задачи

```typescript
// PUT /api/tasks/:id/assign
async assignTask(
  taskId: string,
  newOperatorId: string,
  userId: string
): Promise<Task> {
  const task = await this.findOne(taskId);

  // Валидация статуса
  if (task.status === TaskStatus.COMPLETED ||
      task.status === TaskStatus.CANCELLED) {
    throw new BadRequestException(
      'Нельзя переназначить завершенную или отмененную задачу'
    );
  }

  // Проверка нового оператора
  const newOperator = await this.usersService.findOne(newOperatorId);
  if (newOperator.role !== UserRole.OPERATOR &&
      newOperator.role !== UserRole.TECHNICIAN) {
    throw new BadRequestException(
      'Задачу можно назначить только оператору или технику'
    );
  }

  const oldOperatorId = task.assigned_to_user_id;

  // Обновление
  task.assigned_to_user_id = newOperatorId;
  task.status = TaskStatus.ASSIGNED; // Сброс статуса если была IN_PROGRESS

  const updatedTask = await this.taskRepository.save(task);

  // Уведомление нового оператора
  await this.notificationsService.create({
    type: NotificationType.TASK_ASSIGNED,
    channel: NotificationChannel.TELEGRAM,
    recipient_id: newOperatorId,
    title: 'Вам назначена задача',
    message: `Задача ${task.type_code} переназначена вам`,
    data: { task_id: taskId },
  });

  // Уведомление старого оператора (если был)
  if (oldOperatorId && oldOperatorId !== newOperatorId) {
    await this.notificationsService.create({
      type: NotificationType.SYSTEM_ALERT,
      channel: NotificationChannel.IN_APP,
      recipient_id: oldOperatorId,
      title: 'Задача переназначена',
      message: `Задача ${task.type_code} была переназначена другому оператору`,
      data: { task_id: taskId },
    });
  }

  return updatedTask;
}
```

---

## Этап 3: Начало выполнения

### Эндпоинт старта

```typescript
// POST /api/tasks/:id/start

@Post(':id/start')
@UseGuards(JwtAuthGuard)
async startTask(
  @Param('id') id: string,
  @Request() req,
) {
  return this.tasksService.startTask(id, req.user.id);
}
```

### Логика старта

```typescript
// Файл: backend/src/modules/tasks/tasks.service.ts

async startTask(taskId: string, userId: string): Promise<Task> {
  const task = await this.findOne(taskId);

  // === ВАЛИДАЦИЯ ===

  // 1. Только ASSIGNED можно начать
  if (task.status !== TaskStatus.ASSIGNED) {
    throw new BadRequestException(
      `Нельзя начать задачу со статусом ${task.status}. ` +
      'Только задачи со статусом ASSIGNED можно начать.'
    );
  }

  // 2. Только назначенный оператор
  if (task.assigned_to_user_id !== userId) {
    throw new ForbiddenException(
      'Только назначенный оператор может начать выполнение задачи'
    );
  }

  // === ОБНОВЛЕНИЕ ===

  task.status = TaskStatus.IN_PROGRESS;
  task.started_at = new Date();

  const updatedTask = await this.taskRepository.save(task);

  // === АУДИТ ===

  await this.auditLogService.log({
    event_type: AuditEventType.TASK_STARTED,
    user_id: userId,
    description: `Задача ${task.type_code} начата`,
    metadata: {
      task_id: taskId,
      machine_id: task.machine_id,
      started_at: task.started_at.toISOString(),
    },
  });

  // === СОБЫТИЕ ===

  this.eventEmitter.emit('task.started', {
    task: updatedTask,
    userId,
  });

  return updatedTask;
}
```

### Пример запроса

```bash
POST /api/tasks/550e8400-e29b-41d4-a716-446655440001/start
Authorization: Bearer <operator_jwt_token>

# Ответ:
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "type_code": "refill",
  "status": "in_progress",
  "started_at": "2025-12-20T10:15:00.000Z",
  ...
}
```

---

## Этап 4: Выполнение и завершение

### Процесс выполнения

```
┌─────────────────────────────────────────────────────────────┐
│                   ПРОЦЕСС ВЫПОЛНЕНИЯ                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Оператор прибывает к аппарату                          │
│                    │                                        │
│                    ▼                                        │
│  2. Загружает ФОТО ДО (обязательно)                        │
│     POST /api/files/upload                                 │
│     { entity_type: 'task', entity_id: taskId,              │
│       file_type: 'task_photo_before' }                     │
│                    │                                        │
│                    ▼                                        │
│  3. Выполняет работу:                                      │
│     - REFILL: загружает товары                             │
│     - COLLECTION: собирает деньги                          │
│     - REPLACE: меняет компоненты                           │
│                    │                                        │
│                    ▼                                        │
│  4. Загружает ФОТО ПОСЛЕ (обязательно)                     │
│     POST /api/files/upload                                 │
│     { entity_type: 'task', entity_id: taskId,              │
│       file_type: 'task_photo_after' }                      │
│                    │                                        │
│                    ▼                                        │
│  5. Завершает задачу                                       │
│     POST /api/tasks/:id/complete                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Загрузка фотографий

```typescript
// POST /api/files/upload

// Фото ДО
const formData = new FormData();
formData.append('file', photoBeforeFile);
formData.append('entity_type', 'task');
formData.append('entity_id', taskId);
formData.append('file_type', 'task_photo_before');

await fetch('/api/files/upload', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: formData,
});

// Фото ПОСЛЕ
const formData2 = new FormData();
formData2.append('file', photoAfterFile);
formData2.append('entity_type', 'task');
formData2.append('entity_id', taskId);
formData2.append('file_type', 'task_photo_after');

await fetch('/api/files/upload', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: formData2,
});
```

### FilesService обновляет флаги

При загрузке фото `FilesService` автоматически обновляет флаги задачи:

```typescript
// В FilesService после успешной загрузки

if (entity_type === 'task') {
  if (file_type === 'task_photo_before') {
    await this.taskRepository.update(entity_id, { has_photo_before: true });
  } else if (file_type === 'task_photo_after') {
    await this.taskRepository.update(entity_id, { has_photo_after: true });
  }
}
```

### Завершение задачи

Подробно описано в [03-TASKS-COMPLETION.md](./03-TASKS-COMPLETION.md)

```typescript
// POST /api/tasks/:id/complete

{
  "actual_cash_amount": 148500,    // Для COLLECTION
  "items": [                       // Для REFILL
    { "nomenclature_id": "uuid", "actual_quantity": 4.5 }
  ],
  "completion_notes": "Выполнено успешно",
  "skip_photos": false,           // true для офлайн
  "operation_date": "2025-12-20T11:30:00Z"  // Для исторических данных
}
```

---

## Альтернативные сценарии

### Диаграмма всех возможных путей

```
                              ┌───────────────────────────────────┐
                              │           CANCELLED               │
                              └───────────────────────────────────┘
                                           ▲
                                           │ (любой статус)
                                           │
┌─────────┐    ┌──────────┐    ┌─────────────┐    ┌───────────┐
│ PENDING │───>│ ASSIGNED │───>│ IN_PROGRESS │───>│ COMPLETED │
└────┬────┘    └────┬─────┘    └──────┬──────┘    └─────┬─────┘
     │              │                 │                  │
     │              │                 │                  │
     │              ▼                 │                  ▼
     │         ┌──────────┐          │            ┌──────────┐
     │         │POSTPONED │──────────┘            │ REJECTED │
     │         └──────────┘                       └──────────┘
     │              │                                   │
     │              │ (возврат)                         │
     │              ▼                                   │
     │         ┌──────────┐                             │
     └────────>│ ASSIGNED │<────────────────────────────┘
               └──────────┘     (повторное назначение)
```

---

## Отложение задачи

### Когда используется

Оператор не может выполнить задачу прямо сейчас:
- Нет доступа к локации
- Отсутствуют необходимые материалы
- Технические проблемы

### Эндпоинт

```typescript
// POST /api/tasks/:id/postpone

@Post(':id/postpone')
@UseGuards(JwtAuthGuard)
async postponeTask(
  @Param('id') id: string,
  @Body() body: { reason: string },
  @Request() req,
) {
  return this.tasksService.postponeTask(id, req.user.id, body.reason);
}
```

### Логика отложения

```typescript
async postponeTask(
  taskId: string,
  userId: string,
  reason: string
): Promise<Task> {
  const task = await this.findOne(taskId);

  // Валидация
  if (task.status !== TaskStatus.ASSIGNED &&
      task.status !== TaskStatus.IN_PROGRESS) {
    throw new BadRequestException(
      'Можно отложить только назначенную или выполняемую задачу'
    );
  }

  if (task.assigned_to_user_id !== userId) {
    throw new ForbiddenException(
      'Только назначенный оператор может отложить задачу'
    );
  }

  // Обновление
  task.status = TaskStatus.POSTPONED;
  task.postpone_reason = reason;

  const updatedTask = await this.taskRepository.save(task);

  // Комментарий
  await this.taskCommentRepository.save({
    task_id: taskId,
    user_id: userId,
    comment: `Задача отложена. Причина: ${reason}`,
    is_internal: false,
  });

  // Уведомление менеджера
  await this.notificationsService.create({
    type: NotificationType.SYSTEM_ALERT,
    channel: NotificationChannel.IN_APP,
    recipient_id: task.created_by_user_id,
    title: 'Задача отложена',
    message: `Оператор отложил задачу: ${reason}`,
    data: { task_id: taskId },
  });

  return updatedTask;
}
```

### Возврат отложенной задачи

```typescript
// POST /api/tasks/:id/resume

async resumeTask(taskId: string, userId: string): Promise<Task> {
  const task = await this.findOne(taskId);

  if (task.status !== TaskStatus.POSTPONED) {
    throw new BadRequestException('Можно возобновить только отложенную задачу');
  }

  task.status = TaskStatus.ASSIGNED;
  task.postpone_reason = null;

  return this.taskRepository.save(task);
}
```

---

## Отмена задачи

### Кто может отменить

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
@Delete(':id')
async cancelTask(@Param('id') id: string, @Request() req) {
  return this.tasksService.cancelTask(id, req.user.id);
}
```

### Логика отмены

```typescript
async cancelTask(taskId: string, userId: string): Promise<Task> {
  const task = await this.findOne(taskId);

  // Нельзя отменить завершенную
  if (task.status === TaskStatus.COMPLETED) {
    throw new BadRequestException(
      'Нельзя отменить завершенную задачу. Используйте отклонение.'
    );
  }

  // Уже отменена
  if (task.status === TaskStatus.CANCELLED) {
    throw new BadRequestException('Задача уже отменена');
  }

  task.status = TaskStatus.CANCELLED;

  const updatedTask = await this.taskRepository.save(task);

  // Уведомление оператора
  if (task.assigned_to_user_id) {
    await this.notificationsService.create({
      type: NotificationType.SYSTEM_ALERT,
      channel: NotificationChannel.TELEGRAM,
      recipient_id: task.assigned_to_user_id,
      title: 'Задача отменена',
      message: `Задача ${task.type_code} была отменена`,
      data: { task_id: taskId },
    });
  }

  // Аудит
  await this.auditLogService.log({
    event_type: AuditEventType.TASK_CANCELLED,
    user_id: userId,
    description: `Задача ${task.type_code} отменена`,
    metadata: { task_id: taskId, previous_status: task.status },
  });

  return updatedTask;
}
```

---

## Отклонение задачи

### Когда используется

Администратор проверяет завершенную задачу и находит проблемы:
- Неправильно указаны суммы
- Фото не соответствуют
- Данные некорректны

### Кто может отклонить

```typescript
// Только ADMIN и SUPER_ADMIN
// Файл: backend/src/modules/tasks/services/task-rejection.service.ts

if (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN) {
  throw new ForbiddenException('Только администраторы могут отклонять задачи');
}
```

### Логика отклонения с откатом

```typescript
// Файл: backend/src/modules/tasks/services/task-rejection.service.ts

async rejectTask(task: Task, userId: string, reason: string): Promise<Task> {
  // Проверка 1: Только завершенные
  if (task.status !== TaskStatus.COMPLETED) {
    throw new BadRequestException(
      'Можно отклонить только завершенные задачи'
    );
  }

  // Проверка 2: Ещё не отклонялась
  if (task.rejected_at) {
    throw new BadRequestException('Задача уже была отклонена');
  }

  await this.dataSource.transaction(async (transactionManager) => {
    // 1. Откат инвентаря для REFILL
    if (task.type_code === TaskType.REFILL) {
      await this.rollbackRefillInventory(task, userId, reason);
    }

    // 2. Откат финансов для COLLECTION
    if (task.type_code === TaskType.COLLECTION) {
      await this.rollbackCollectionFinances(task, userId, reason);
    }

    // 3. Обновить задачу
    task.status = TaskStatus.REJECTED;
    task.rejected_by_user_id = userId;
    task.rejected_at = new Date();
    task.rejection_reason = reason;

    await transactionManager.save(Task, task);

    // 4. Комментарий
    const comment = this.taskCommentRepository.create({
      task_id: task.id,
      user_id: userId,
      comment: `Задача ОТКЛОНЕНА. Причина: ${reason}. Выполнены компенсирующие транзакции.`,
      is_internal: false,
    });
    await transactionManager.save(TaskComment, comment);

    // 5. Аудит
    await this.auditLogService.log({
      event_type: AuditEventType.TRANSACTION_UPDATED,
      user_id: userId,
      description: `Задача отклонена. Причина: ${reason}`,
      metadata: {
        task_id: task.id,
        task_type: task.type_code,
        rejection_reason: reason,
        items_rolled_back: task.items?.length || 0,
        cash_amount_rolled_back: task.actual_cash_amount || 0,
      },
    });

    // 6. Уведомление оператора
    await this.notifyOperatorAboutRejection(task, reason);
  });

  // Событие для аналитики
  this.eventEmitter.emit('task.rejected', { task });

  return task;
}
```

### Откат REFILL

```typescript
private async rollbackRefillInventory(
  task: Task,
  userId: string,
  reason: string
): Promise<void> {
  if (!task.items || task.items.length === 0) return;

  for (const taskItem of task.items) {
    const actualQty = taskItem.actual_quantity || taskItem.planned_quantity;

    // Обратное движение: Аппарат -> Оператор
    await this.inventoryService.transferMachineToOperator({
      operator_id: task.assigned_to_user_id,
      machine_id: task.machine_id,
      nomenclature_id: taskItem.nomenclature_id,
      quantity: Number(actualQty),
      notes: `ОТКАТ задачи ${task.id}. Причина: ${reason}`,
    }, userId);
  }
}
```

### Откат COLLECTION

```typescript
private async rollbackCollectionFinances(
  task: Task,
  userId: string,
  reason: string
): Promise<void> {
  if (!task.actual_cash_amount) return;

  const amount = Number(task.actual_cash_amount);

  // 1. Создать компенсирующую транзакцию
  await this.transactionsService.create({
    transaction_type: TransactionType.REFUND,
    machine_id: task.machine_id,
    amount: amount,
    description: `ОТКАТ инкассации. Сумма ${amount} возвращена. Причина: ${reason}`,
    metadata: {
      original_task_id: task.id,
      rejection_reason: reason,
    },
  }, userId);

  // 2. Восстановить cash в аппарате
  const machine = await this.machinesService.findOne(task.machine_id);
  const restoredAmount = Number(machine.current_cash_amount) + amount;

  await this.machinesService.updateStats(task.machine_id, {
    current_cash_amount: restoredAmount,
  });
}
```

---

## Эскалация

### Автоматическая эскалация

```typescript
// Файл: backend/src/modules/tasks/services/task-escalation.service.ts

// Запускается по CRON каждый час
async escalateOverdueTasks(): Promise<{
  escalated_count: number;
  incidents_created: number;
}> {
  const now = new Date();
  const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);

  // Находим просроченные более 4 часов
  const overdueTasks = await this.taskRepository
    .createQueryBuilder('task')
    .where('task.due_date < :fourHoursAgo', { fourHoursAgo })
    .andWhere('task.status IN (:...statuses)', {
      statuses: [TaskStatus.PENDING, TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS],
    })
    .getMany();

  let incidentsCreated = 0;

  for (const task of overdueTasks) {
    const overdueHours = Math.floor(
      (now.getTime() - task.due_date.getTime()) / (1000 * 60 * 60)
    );

    // Проверяем, нет ли уже инцидента
    const hasExisting = await this.checkExistingIncident(task.id);

    if (!hasExisting) {
      // Создаем инцидент
      await this.createOverdueIncident(task, overdueHours);
      // Уведомляем менеджера
      await this.notifyManagerAboutOverdue(task, overdueHours);
      // Логируем
      await this.logEscalation(task, overdueHours);

      incidentsCreated++;
    }
  }

  return { escalated_count: overdueTasks.length, incidents_created: incidentsCreated };
}
```

### Создание инцидента

```typescript
private async createOverdueIncident(task: Task, overdueHours: number): Promise<void> {
  await this.incidentsService.create({
    incident_type: IncidentType.OTHER,
    priority: overdueHours > 24 ? IncidentPriority.HIGH : IncidentPriority.MEDIUM,
    machine_id: task.machine_id,
    title: `Просроченная задача: ${task.type_code}`,
    description:
      `Задача ${task.type_code} просрочена на ${overdueHours} часов.\n` +
      `Статус: ${task.status}\n` +
      `Назначена: ${task.assigned_to?.full_name || 'не назначена'}`,
    metadata: {
      task_id: task.id,
      overdue_hours: overdueHours,
    },
  });
}
```

### Мониторинг задач

```typescript
// GET /api/tasks/attention-required

async getAttentionRequiredTasks(userId?: string): Promise<{
  overdue: Task[];      // Просроченные
  due_soon: Task[];     // Скоро истекает срок (24 часа)
  pending_photos: Task[]; // Ждут загрузки фото
}> {
  const now = new Date();
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Просроченные
  const overdue = await this.taskRepository
    .createQueryBuilder('task')
    .where('task.due_date < :now', { now })
    .andWhere('task.status IN (:...statuses)', {
      statuses: [TaskStatus.PENDING, TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS],
    })
    .getMany();

  // Срок в ближайшие 24 часа
  const due_soon = await this.taskRepository
    .createQueryBuilder('task')
    .where('task.due_date BETWEEN :now AND :in24Hours', { now, in24Hours })
    .andWhere('task.status IN (:...statuses)', {
      statuses: [TaskStatus.PENDING, TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS],
    })
    .getMany();

  // Ожидают фото (офлайн)
  const pending_photos = await this.taskRepository
    .createQueryBuilder('task')
    .where('task.pending_photos = :pending', { pending: true })
    .andWhere('task.status = :status', { status: TaskStatus.COMPLETED })
    .getMany();

  return { overdue, due_soon, pending_photos };
}
```

---

## Диаграммы последовательности

### Успешное выполнение REFILL

```
┌─────────┐      ┌─────────┐      ┌─────────┐      ┌─────────┐
│ Менеджер│      │ Backend │      │ Оператор│      │ Файлы   │
└────┬────┘      └────┬────┘      └────┬────┘      └────┬────┘
     │                │                │                │
     │ POST /tasks    │                │                │
     │───────────────>│                │                │
     │                │ ASSIGNED       │                │
     │                │───────────────>│ Telegram       │
     │                │                │                │
     │                │                │ POST /start    │
     │                │<───────────────│                │
     │                │ IN_PROGRESS    │                │
     │                │                │                │
     │                │                │ POST /files    │
     │                │                │ (photo_before) │
     │                │                │───────────────>│
     │                │                │                │
     │                │                │ [Выполняет     │
     │                │                │  работу]       │
     │                │                │                │
     │                │                │ POST /files    │
     │                │                │ (photo_after)  │
     │                │                │───────────────>│
     │                │                │                │
     │                │ POST /complete │                │
     │                │<───────────────│                │
     │                │                │                │
     │                │ [Обновляет     │                │
     │                │  инвентарь]    │                │
     │                │                │                │
     │                │ COMPLETED      │                │
     │<───────────────│                │                │
     │                │                │                │
```

### Отклонение с откатом

```
┌─────────┐      ┌─────────┐      ┌───────────┐      ┌───────────┐
│  Админ  │      │ Backend │      │ Inventory │      │Transactions│
└────┬────┘      └────┬────┘      └─────┬─────┘      └─────┬─────┘
     │                │                 │                  │
     │ POST /reject   │                 │                  │
     │───────────────>│                 │                  │
     │                │                 │                  │
     │                │ [Тип REFILL?]   │                  │
     │                │────────────────>│                  │
     │                │ Откат инвентаря │                  │
     │                │<────────────────│                  │
     │                │                 │                  │
     │                │ [Тип COLLECTION?]                  │
     │                │───────────────────────────────────>│
     │                │ Создать REFUND транзакцию          │
     │                │<───────────────────────────────────│
     │                │                 │                  │
     │                │ status=REJECTED │                  │
     │                │                 │                  │
     │ Успешно        │                 │                  │
     │<───────────────│                 │                  │
     │                │                 │                  │
     │                │ [Уведомление    │                  │
     │                │  оператору]     │                  │
     │                │                 │                  │
```

---

## Навигация

- **Назад**: [01-TASKS-OVERVIEW.md](./01-TASKS-OVERVIEW.md) — Обзор системы задач
- **Далее**: [03-TASKS-COMPLETION.md](./03-TASKS-COMPLETION.md) — Логика завершения
- **Также**: [04-TASKS-API.md](./04-TASKS-API.md) — REST API

---

*Документация создана на основе исходного кода: `backend/src/modules/tasks/`*
