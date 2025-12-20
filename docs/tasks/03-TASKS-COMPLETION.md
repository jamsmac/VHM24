# Логика завершения задач

> **Версия**: 2.0
> **Последнее обновление**: 2025-12-20
> **Исходный код**: `backend/src/modules/tasks/services/task-completion.service.ts`

---

## Содержание

1. [Обзор процесса завершения](#обзор-процесса-завершения)
2. [Обязательная фото-валидация](#обязательная-фото-валидация)
3. [Офлайн режим](#офлайн-режим)
4. [Валидация чеклиста](#валидация-чеклиста)
5. [Обработка по типам задач](#обработка-по-типам-задач)
6. [Обработка COLLECTION](#обработка-collection)
7. [Обработка REFILL](#обработка-refill)
8. [Обработка CLEANING](#обработка-cleaning)
9. [Обработка REPLACE_*](#обработка-replace_)
10. [Финализация задачи](#финализация-задачи)
11. [Создание инцидентов](#создание-инцидентов)
12. [Полный код завершения](#полный-код-завершения)

---

## Обзор процесса завершения

### Архитектура TaskCompletionService

```typescript
// Файл: backend/src/modules/tasks/services/task-completion.service.ts

@Injectable()
export class TaskCompletionService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(TaskItem)
    private readonly taskItemRepository: Repository<TaskItem>,
    private readonly filesService: FilesService,
    private readonly machinesService: MachinesService,
    private readonly inventoryService: InventoryService,
    private readonly transactionsService: TransactionsService,
    private readonly incidentsService: IncidentsService,
    private readonly notificationsService: NotificationsService,
    private readonly auditLogService: AuditLogService,
    private readonly eventEmitter: EventEmitter2,
  ) {}
}
```

### Основной алгоритм завершения

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     АЛГОРИТМ ЗАВЕРШЕНИЯ ЗАДАЧИ                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. ВАЛИДАЦИЯ СТАТУСА                                                  │
│     └── Только IN_PROGRESS можно завершить                             │
│                                                                         │
│  2. ПРОВЕРКА ПРАВ                                                      │
│     └── Только назначенный оператор                                    │
│                                                                         │
│  3. ВАЛИДАЦИЯ ФОТОГРАФИЙ                                               │
│     ├── has_photo_before = true                                        │
│     ├── has_photo_after = true                                         │
│     └── ИЛИ skip_photos = true (офлайн режим)                         │
│                                                                         │
│  4. ВАЛИДАЦИЯ ЧЕКЛИСТА (если есть)                                     │
│     └── Все пункты completed = true                                    │
│                                                                         │
│  5. ОБРАБОТКА ПО ТИПУ ЗАДАЧИ                                           │
│     ├── COLLECTION: финансовая транзакция + проверка расхождения      │
│     ├── REFILL: обновление инвентаря (Оператор -> Машина)             │
│     ├── CLEANING: обновление статуса компонентов                      │
│     └── REPLACE_*: перемещение компонентов                            │
│                                                                         │
│  6. ФИНАЛИЗАЦИЯ                                                        │
│     ├── status = COMPLETED                                             │
│     ├── completed_at = NOW()                                           │
│     ├── operation_date = DTO.operation_date || NOW()                  │
│     ├── completion_notes = DTO.completion_notes                        │
│     └── offline_completed / pending_photos (если офлайн)              │
│                                                                         │
│  7. УВЕДОМЛЕНИЯ И АУДИТ                                                │
│     ├── Аудит лог                                                      │
│     ├── Уведомление менеджера                                          │
│     └── Event: task.completed                                          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Обязательная фото-валидация

### Принцип Manual Operations Architecture

Фотографии — это **единственное доказательство** выполнения работы. Без них система не может подтвердить, что оператор действительно был у аппарата и выполнил задачу.

### Типы фотографий

| Тип | file_type | Когда загружается |
|-----|-----------|-------------------|
| Фото ДО | `task_photo_before` | Перед началом работы |
| Фото ПОСЛЕ | `task_photo_after` | После выполнения работы |

### Логика проверки

```typescript
// Файл: backend/src/modules/tasks/services/task-completion.service.ts

private async validatePhotos(
  task: Task,
  skipPhotos: boolean
): Promise<{ valid: boolean; pendingPhotos: boolean }> {
  // Офлайн режим: пропускаем проверку
  if (skipPhotos) {
    return { valid: true, pendingPhotos: true };
  }

  // Проверяем наличие фото
  const hasPhotoBefore = task.has_photo_before;
  const hasPhotoAfter = task.has_photo_after;

  // Если нет хотя бы одного — ошибка
  if (!hasPhotoBefore) {
    throw new BadRequestException(
      'Для завершения задачи необходимо загрузить фотографию ДО начала работы. ' +
      'Загрузите фото через POST /api/files/upload с file_type=task_photo_before'
    );
  }

  if (!hasPhotoAfter) {
    throw new BadRequestException(
      'Для завершения задачи необходимо загрузить фотографию ПОСЛЕ выполнения работы. ' +
      'Загрузите фото через POST /api/files/upload с file_type=task_photo_after'
    );
  }

  return { valid: true, pendingPhotos: false };
}
```

### Как загружать фотографии

```bash
# Фото ДО
curl -X POST /api/files/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@photo_before.jpg" \
  -F "entity_type=task" \
  -F "entity_id=<task_id>" \
  -F "file_type=task_photo_before"

# Фото ПОСЛЕ
curl -X POST /api/files/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@photo_after.jpg" \
  -F "entity_type=task" \
  -F "entity_id=<task_id>" \
  -F "file_type=task_photo_after"
```

### Автоматическое обновление флагов

`FilesService` автоматически обновляет флаги задачи при загрузке фото:

```typescript
// В FilesService.uploadFile()

if (uploadDto.entity_type === 'task') {
  const updateData: Partial<Task> = {};

  if (uploadDto.file_type === 'task_photo_before') {
    updateData.has_photo_before = true;
  } else if (uploadDto.file_type === 'task_photo_after') {
    updateData.has_photo_after = true;
  }

  if (Object.keys(updateData).length > 0) {
    await this.taskRepository.update(uploadDto.entity_id, updateData);
  }
}
```

---

## Офлайн режим

### Когда используется

Оператор работает без интернета:
- В подвале/метро
- Плохой сигнал
- Экономия трафика

### Параметр skip_photos

```typescript
// Файл: backend/src/modules/tasks/dto/complete-task.dto.ts

export class CompleteTaskDto {
  @ApiPropertyOptional({
    example: false,
    description: 'Пропустить проверку фото (офлайн-режим). Фото можно будет загрузить позже.',
  })
  @IsOptional()
  @IsBoolean()
  skip_photos?: boolean;

  @ApiPropertyOptional({
    example: '2025-11-15T14:30:00Z',
    description: 'Дата фактического выполнения (для ввода исторических данных)',
  })
  @IsOptional()
  @IsDateString()
  operation_date?: string;
}
```

### Логика офлайн завершения

```typescript
async completeTask(
  task: Task,
  userId: string,
  completeTaskDto: CompleteTaskDto
): Promise<Task> {
  const skipPhotos = completeTaskDto.skip_photos ?? false;

  // Валидация фото (с учетом офлайн режима)
  const { pendingPhotos } = await this.validatePhotos(task, skipPhotos);

  // ... обработка по типу ...

  // Финализация
  task.status = TaskStatus.COMPLETED;
  task.completed_at = new Date();

  // Офлайн метки
  if (pendingPhotos) {
    task.pending_photos = true;      // Ждем загрузки фото
    task.offline_completed = true;   // Завершена офлайн
  }

  // Фактическая дата операции
  task.operation_date = completeTaskDto.operation_date
    ? new Date(completeTaskDto.operation_date)
    : new Date();

  return this.taskRepository.save(task);
}
```

### Загрузка фото после офлайн завершения

```typescript
// После загрузки обоих фото система автоматически снимает флаг pending_photos

// В FilesService при загрузке:
if (uploadDto.entity_type === 'task') {
  const task = await this.taskRepository.findOne({ where: { id: uploadDto.entity_id } });

  if (task.pending_photos) {
    // Проверяем, загружены ли теперь оба фото
    if (task.has_photo_before && task.has_photo_after) {
      await this.taskRepository.update(uploadDto.entity_id, {
        pending_photos: false,
      });
    }
  }
}
```

### Мониторинг офлайн задач

```typescript
// GET /api/tasks/pending-photos

async getTasksPendingPhotos(): Promise<Task[]> {
  return this.taskRepository.find({
    where: {
      pending_photos: true,
      status: TaskStatus.COMPLETED,
    },
    relations: ['machine', 'assigned_to'],
    order: { completed_at: 'ASC' },
  });
}
```

---

## Валидация чеклиста

### Структура чеклиста

```typescript
// В Task entity

@Column({ type: 'jsonb', nullable: true })
checklist: Array<{
  item: string;       // Описание пункта
  completed: boolean; // Выполнен ли
}> | null;
```

### Примеры чеклистов по типам

**REFILL**:
```json
[
  {"item": "Проверить срок годности товаров", "completed": false},
  {"item": "Очистить бункеры перед загрузкой", "completed": false},
  {"item": "Проверить уровень воды", "completed": false}
]
```

**CLEANING**:
```json
[
  {"item": "Промыть варочный блок", "completed": false},
  {"item": "Очистить поддон для отходов", "completed": false},
  {"item": "Протереть панель управления", "completed": false},
  {"item": "Проверить уплотнители", "completed": false}
]
```

### Логика валидации

```typescript
private validateChecklist(task: Task): void {
  if (!task.checklist || task.checklist.length === 0) {
    // Чеклиста нет — пропускаем
    return;
  }

  const incompleteItems = task.checklist.filter(item => !item.completed);

  if (incompleteItems.length > 0) {
    const itemsList = incompleteItems.map(i => `- ${i.item}`).join('\n');
    throw new BadRequestException(
      `Не все пункты чеклиста выполнены (${incompleteItems.length} из ${task.checklist.length}):\n${itemsList}\n\n` +
      'Отметьте все пункты как выполненные перед завершением задачи.'
    );
  }
}
```

### Обновление чеклиста

```typescript
// PATCH /api/tasks/:id/checklist

async updateChecklist(
  taskId: string,
  checklist: Array<{ item: string; completed: boolean }>,
  userId: string
): Promise<Task> {
  const task = await this.findOne(taskId);

  // Только назначенный оператор
  if (task.assigned_to_user_id !== userId) {
    throw new ForbiddenException('Только назначенный оператор может обновлять чеклист');
  }

  // Только активные задачи
  if (task.status !== TaskStatus.ASSIGNED && task.status !== TaskStatus.IN_PROGRESS) {
    throw new BadRequestException('Чеклист можно обновлять только в активных задачах');
  }

  task.checklist = checklist;

  return this.taskRepository.save(task);
}
```

---

## Обработка по типам задач

### Маршрутизация по типу

```typescript
async completeTask(
  task: Task,
  userId: string,
  completeTaskDto: CompleteTaskDto
): Promise<Task> {
  // ... валидация фото и чеклиста ...

  // Обработка по типу
  switch (task.type_code) {
    case TaskType.COLLECTION:
      await this.processCollectionCompletion(task, completeTaskDto, userId);
      break;

    case TaskType.REFILL:
      await this.processRefillCompletion(task, completeTaskDto, userId);
      break;

    case TaskType.CLEANING:
      await this.processCleaningCompletion(task, completeTaskDto, userId);
      break;

    case TaskType.REPLACE_HOPPER:
    case TaskType.REPLACE_GRINDER:
    case TaskType.REPLACE_BREW_UNIT:
    case TaskType.REPLACE_MIXER:
      await this.processReplaceCompletion(task, completeTaskDto, userId);
      break;

    case TaskType.REPAIR:
    case TaskType.INSPECTION:
    case TaskType.AUDIT:
    case TaskType.INSTALL:
    case TaskType.REMOVAL:
      // Базовая обработка — только финализация
      break;

    default:
      this.logger.warn(`Неизвестный тип задачи: ${task.type_code}`);
  }

  // ... финализация ...
}
```

---

## Обработка COLLECTION

### Назначение

Инкассация — сбор наличных денег из аппарата.

### DTO завершения

```typescript
{
  "actual_cash_amount": 148500.50,   // Фактическая сумма
  "completion_notes": "Все купюры пересчитаны, расхождение 1.5%"
}
```

### Полная логика обработки

```typescript
// Файл: backend/src/modules/tasks/services/task-completion.service.ts

private async processCollectionCompletion(
  task: Task,
  dto: CompleteTaskDto,
  userId: string
): Promise<void> {
  // 1. Валидация: actual_cash_amount обязателен для COLLECTION
  if (dto.actual_cash_amount === undefined || dto.actual_cash_amount === null) {
    throw new BadRequestException(
      'Для задачи инкассации необходимо указать фактическую сумму денег (actual_cash_amount)'
    );
  }

  const actualAmount = Number(dto.actual_cash_amount);
  const expectedAmount = Number(task.expected_cash_amount) || 0;

  // 2. Сохраняем фактическую сумму в задаче
  task.actual_cash_amount = actualAmount;

  // 3. Создаем финансовую транзакцию
  await this.transactionsService.create({
    transaction_type: TransactionType.COLLECTION,
    machine_id: task.machine_id,
    amount: actualAmount,
    description: `Инкассация по задаче ${task.id}`,
    metadata: {
      task_id: task.id,
      operator_id: userId,
      expected_amount: expectedAmount,
      discrepancy: actualAmount - expectedAmount,
      discrepancy_percent: expectedAmount > 0
        ? ((actualAmount - expectedAmount) / expectedAmount * 100).toFixed(2)
        : 0,
    },
  }, userId);

  // 4. Обнуляем счетчик наличных в аппарате
  await this.machinesService.updateStats(task.machine_id, {
    current_cash_amount: 0,
    last_collection_date: new Date(),
    last_collection_amount: actualAmount,
  });

  // 5. Проверка расхождения
  if (expectedAmount > 0) {
    const discrepancyPercent = Math.abs(actualAmount - expectedAmount) / expectedAmount * 100;

    // Если расхождение > 10% — создаем инцидент
    if (discrepancyPercent > 10) {
      await this.createCashDiscrepancyIncident(task, expectedAmount, actualAmount, userId);
    }
  }

  this.logger.log(
    `Инкассация завершена: задача ${task.id}, ` +
    `ожидалось ${expectedAmount}, получено ${actualAmount} ` +
    `(расхождение: ${(actualAmount - expectedAmount).toFixed(2)})`
  );
}
```

### Создание инцидента при расхождении

```typescript
private async createCashDiscrepancyIncident(
  task: Task,
  expected: number,
  actual: number,
  userId: string
): Promise<void> {
  const discrepancy = actual - expected;
  const discrepancyPercent = (Math.abs(discrepancy) / expected * 100).toFixed(2);

  const incidentType = discrepancy < 0
    ? IncidentType.CASH_SHORTAGE  // Недостача
    : IncidentType.CASH_SURPLUS;  // Излишек

  const priority = Math.abs(Number(discrepancyPercent)) > 20
    ? IncidentPriority.HIGH
    : IncidentPriority.MEDIUM;

  await this.incidentsService.create({
    incident_type: incidentType,
    priority,
    machine_id: task.machine_id,
    title: discrepancy < 0
      ? `Недостача при инкассации: ${Math.abs(discrepancy).toFixed(2)} сум`
      : `Излишек при инкассации: ${discrepancy.toFixed(2)} сум`,
    description:
      `При выполнении инкассации (задача ${task.id}) обнаружено расхождение:\n\n` +
      `- Ожидалось: ${expected.toFixed(2)} сум\n` +
      `- Получено: ${actual.toFixed(2)} сум\n` +
      `- Расхождение: ${discrepancy.toFixed(2)} сум (${discrepancyPercent}%)\n\n` +
      `Оператор: ${task.assigned_to?.full_name || task.assigned_to_user_id}`,
    created_by_user_id: userId,
    assigned_to_user_id: null, // Будет назначен менеджером
    metadata: {
      task_id: task.id,
      expected_amount: expected,
      actual_amount: actual,
      discrepancy_amount: discrepancy,
      discrepancy_percent: discrepancyPercent,
      operator_id: task.assigned_to_user_id,
    },
  });

  // Уведомление менеджера
  await this.notificationsService.create({
    type: NotificationType.INCIDENT_CREATED,
    channel: NotificationChannel.TELEGRAM,
    recipient_id: task.created_by_user_id,
    title: 'Расхождение при инкассации',
    message: `Обнаружено расхождение ${discrepancyPercent}% при инкассации аппарата ${task.machine?.machine_number}`,
    data: { task_id: task.id, machine_id: task.machine_id },
    action_url: `/incidents`,
  });
}
```

---

## Обработка REFILL

### Назначение

Пополнение — загрузка товаров из инвентаря оператора в аппарат.

### DTO завершения

```typescript
{
  "items": [
    { "nomenclature_id": "uuid-coffee", "actual_quantity": 4.5 },
    { "nomenclature_id": "uuid-milk", "actual_quantity": 9.8 }
  ],
  "completion_notes": "Молоко было с коротким сроком годности"
}
```

### Полная логика обработки

```typescript
private async processRefillCompletion(
  task: Task,
  dto: CompleteTaskDto,
  userId: string
): Promise<void> {
  // 1. Загружаем items задачи
  const taskItems = await this.taskItemRepository.find({
    where: { task_id: task.id },
    relations: ['nomenclature'],
  });

  if (!taskItems || taskItems.length === 0) {
    this.logger.warn(`Задача REFILL ${task.id} не содержит товаров`);
    return;
  }

  // 2. Обновляем фактические количества из DTO (если есть)
  if (dto.items && dto.items.length > 0) {
    for (const dtoItem of dto.items) {
      const taskItem = taskItems.find(ti => ti.nomenclature_id === dtoItem.nomenclature_id);

      if (taskItem) {
        taskItem.actual_quantity = dtoItem.actual_quantity;
        await this.taskItemRepository.save(taskItem);
      }
    }
  }

  // 3. Переносим инвентарь: Оператор -> Машина
  for (const taskItem of taskItems) {
    const quantity = taskItem.actual_quantity ?? taskItem.planned_quantity;

    if (quantity <= 0) {
      continue;
    }

    await this.inventoryService.transferOperatorToMachine({
      operator_id: task.assigned_to_user_id,
      machine_id: task.machine_id,
      nomenclature_id: taskItem.nomenclature_id,
      quantity: Number(quantity),
      notes: `Пополнение по задаче ${task.id}`,
      task_id: task.id,
    }, userId);

    this.logger.log(
      `Инвентарь перенесен: ${quantity} ${taskItem.unit_of_measure_code} ` +
      `товара ${taskItem.nomenclature?.name || taskItem.nomenclature_id}`
    );
  }

  // 4. Обновляем статистику машины
  await this.machinesService.updateStats(task.machine_id, {
    last_refill_date: new Date(),
  });
}
```

### Схема движения инвентаря

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│    СКЛАД        │       │    ОПЕРАТОР     │       │    АППАРАТ      │
│   (warehouse)   │       │   (operator)    │       │   (machine)     │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ Кофе: 100 кг    │──────>│ Кофе: 10 кг     │──────>│ Кофе: 5 кг      │
│                 │ Выдача│                 │Пополн.│                 │
│ Молоко: 200 л   │──────>│ Молоко: 20 л    │──────>│ Молоко: 10 л    │
│                 │       │                 │       │                 │
└─────────────────┘       └─────────────────┘       └─────────────────┘

При REFILL задаче:
- Списывается с инвентаря оператора
- Добавляется в инвентарь машины
```

### Валидация наличия у оператора

```typescript
// В InventoryService.transferOperatorToMachine()

async transferOperatorToMachine(dto: TransferDto, userId: string): Promise<void> {
  // Проверяем наличие у оператора
  const operatorInventory = await this.operatorInventoryRepository.findOne({
    where: {
      operator_id: dto.operator_id,
      nomenclature_id: dto.nomenclature_id,
    },
  });

  if (!operatorInventory || operatorInventory.quantity < dto.quantity) {
    const available = operatorInventory?.quantity || 0;
    throw new BadRequestException(
      `Недостаточно товара у оператора. ` +
      `Требуется: ${dto.quantity}, доступно: ${available}`
    );
  }

  // Списываем у оператора
  operatorInventory.quantity -= dto.quantity;
  await this.operatorInventoryRepository.save(operatorInventory);

  // Добавляем в машину
  let machineInventory = await this.machineInventoryRepository.findOne({
    where: {
      machine_id: dto.machine_id,
      nomenclature_id: dto.nomenclature_id,
    },
  });

  if (!machineInventory) {
    machineInventory = this.machineInventoryRepository.create({
      machine_id: dto.machine_id,
      nomenclature_id: dto.nomenclature_id,
      quantity: 0,
    });
  }

  machineInventory.quantity += dto.quantity;
  await this.machineInventoryRepository.save(machineInventory);

  // Создаем запись о движении
  await this.createInventoryMovement({
    type: InventoryMovementType.OPERATOR_TO_MACHINE,
    from_operator_id: dto.operator_id,
    to_machine_id: dto.machine_id,
    nomenclature_id: dto.nomenclature_id,
    quantity: dto.quantity,
    task_id: dto.task_id,
    created_by_id: userId,
  });
}
```

---

## Обработка CLEANING

### Назначение

Мойка/чистка — профилактическое обслуживание аппарата.

### Логика обработки

```typescript
private async processCleaningCompletion(
  task: Task,
  dto: CompleteTaskDto,
  userId: string
): Promise<void> {
  // 1. Обновляем статистику машины
  await this.machinesService.updateStats(task.machine_id, {
    last_cleaning_date: new Date(),
  });

  // 2. Если есть компоненты с ролью TARGET — обновляем их
  if (task.components && task.components.length > 0) {
    for (const taskComponent of task.components) {
      if (taskComponent.role === ComponentRole.TARGET) {
        await this.equipmentService.updateComponent(taskComponent.component_id, {
          last_cleaning_date: new Date(),
          cleaning_count: () => 'cleaning_count + 1',
        });
      }
    }
  }

  // 3. Аудит
  await this.auditLogService.log({
    event_type: AuditEventType.MAINTENANCE_COMPLETED,
    user_id: userId,
    description: `Мойка аппарата ${task.machine?.machine_number} выполнена`,
    metadata: {
      task_id: task.id,
      machine_id: task.machine_id,
      components_cleaned: task.components?.length || 0,
    },
  });
}
```

---

## Обработка REPLACE_*

### Типы замены

| Тип | Описание |
|-----|----------|
| `REPLACE_HOPPER` | Замена бункера для ингредиентов |
| `REPLACE_GRINDER` | Замена кофемолки |
| `REPLACE_BREW_UNIT` | Замена варочного блока |
| `REPLACE_MIXER` | Замена миксера |

### Роли компонентов

```typescript
export enum ComponentRole {
  OLD = 'old',     // Снимаемый компонент
  NEW = 'new',     // Устанавливаемый компонент
  TARGET = 'target', // Для обслуживания
}
```

### Полная логика обработки

```typescript
private async processReplaceCompletion(
  task: Task,
  dto: CompleteTaskDto,
  userId: string
): Promise<void> {
  // 1. Загружаем компоненты задачи
  const taskComponents = await this.taskComponentRepository.find({
    where: { task_id: task.id },
    relations: ['component'],
  });

  if (!taskComponents || taskComponents.length === 0) {
    throw new BadRequestException(
      'Для задачи замены компонента необходимо указать компоненты (OLD и NEW)'
    );
  }

  // 2. Находим OLD и NEW
  const oldComponent = taskComponents.find(tc => tc.role === ComponentRole.OLD);
  const newComponent = taskComponents.find(tc => tc.role === ComponentRole.NEW);

  if (!oldComponent) {
    throw new BadRequestException('Не указан старый компонент (role: OLD)');
  }

  if (!newComponent) {
    throw new BadRequestException('Не указан новый компонент (role: NEW)');
  }

  // 3. Отвязываем OLD от машины
  await this.equipmentService.detachFromMachine(
    oldComponent.component_id,
    task.machine_id,
    userId,
    {
      reason: 'Замена по задаче',
      task_id: task.id,
      notes: oldComponent.notes,
    }
  );

  // 4. Привязываем NEW к машине
  await this.equipmentService.attachToMachine(
    newComponent.component_id,
    task.machine_id,
    userId,
    {
      task_id: task.id,
      notes: newComponent.notes,
    }
  );

  // 5. Обновляем статус OLD (на ремонт/списание)
  await this.equipmentService.updateComponent(oldComponent.component_id, {
    status: ComponentStatus.NEEDS_REPAIR,
    location: ComponentLocation.WAREHOUSE,
    notes: `Снят с машины ${task.machine?.machine_number}. ${oldComponent.notes || ''}`,
  });

  // 6. Обновляем статус NEW
  await this.equipmentService.updateComponent(newComponent.component_id, {
    status: ComponentStatus.ACTIVE,
    location: ComponentLocation.MACHINE,
    machine_id: task.machine_id,
    installation_date: new Date(),
  });

  // 7. Аудит
  await this.auditLogService.log({
    event_type: AuditEventType.COMPONENT_REPLACED,
    user_id: userId,
    description: `Компонент заменен на аппарате ${task.machine?.machine_number}`,
    metadata: {
      task_id: task.id,
      task_type: task.type_code,
      machine_id: task.machine_id,
      old_component_id: oldComponent.component_id,
      new_component_id: newComponent.component_id,
    },
  });

  this.logger.log(
    `Замена компонента: ${oldComponent.component_id} -> ${newComponent.component_id} ` +
    `на машине ${task.machine_id}`
  );
}
```

### Схема движения компонентов

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      ЗАМЕНА КОМПОНЕНТА                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ДО ЗАМЕНЫ:                                                            │
│  ┌─────────────────┐              ┌─────────────────┐                  │
│  │    МАШИНА       │              │     СКЛАД       │                  │
│  │  [OLD Grinder]  │              │  [NEW Grinder]  │                  │
│  │   status:ACTIVE │              │   status:NEW    │                  │
│  └─────────────────┘              └─────────────────┘                  │
│                                                                         │
│  ПОСЛЕ ЗАМЕНЫ:                                                         │
│  ┌─────────────────┐              ┌─────────────────┐                  │
│  │    МАШИНА       │              │     СКЛАД       │                  │
│  │  [NEW Grinder]  │              │  [OLD Grinder]  │                  │
│  │   status:ACTIVE │              │ status:REPAIR   │                  │
│  └─────────────────┘              └─────────────────┘                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Финализация задачи

### Код финализации

```typescript
private async finalizeTask(
  task: Task,
  dto: CompleteTaskDto,
  userId: string,
  pendingPhotos: boolean
): Promise<Task> {
  // 1. Обновляем статус
  task.status = TaskStatus.COMPLETED;

  // 2. Временные метки
  task.completed_at = new Date();
  task.operation_date = dto.operation_date
    ? new Date(dto.operation_date)
    : new Date();

  // 3. Заметки
  if (dto.completion_notes) {
    task.completion_notes = dto.completion_notes;
  }

  // 4. Офлайн флаги
  if (pendingPhotos) {
    task.pending_photos = true;
    task.offline_completed = true;
  }

  // 5. Сохраняем
  const savedTask = await this.taskRepository.save(task);

  // 6. Аудит
  await this.auditLogService.log({
    event_type: AuditEventType.TASK_COMPLETED,
    user_id: userId,
    description: `Задача ${task.type_code} завершена`,
    metadata: {
      task_id: task.id,
      task_type: task.type_code,
      machine_id: task.machine_id,
      completed_at: task.completed_at.toISOString(),
      operation_date: task.operation_date?.toISOString(),
      offline: pendingPhotos,
    },
  });

  // 7. Уведомление создателя
  await this.notificationsService.create({
    type: NotificationType.TASK_COMPLETED,
    channel: NotificationChannel.IN_APP,
    recipient_id: task.created_by_user_id,
    title: 'Задача завершена',
    message: `Задача ${task.type_code} для аппарата ${task.machine?.machine_number} выполнена`,
    data: {
      task_id: task.id,
      machine_id: task.machine_id,
      pending_photos: pendingPhotos,
    },
    action_url: `/tasks/${task.id}`,
  });

  // 8. Событие
  this.eventEmitter.emit('task.completed', {
    task: savedTask,
    userId,
    operationDate: task.operation_date,
  });

  return savedTask;
}
```

---

## Создание инцидентов

### Автоматические инциденты

| Ситуация | Тип инцидента | Приоритет |
|----------|---------------|-----------|
| Недостача >10% | `CASH_SHORTAGE` | HIGH/MEDIUM |
| Излишек >10% | `CASH_SURPLUS` | MEDIUM |
| Просрочка >4 часов | `OVERDUE_TASK` | MEDIUM/HIGH |

### Структура инцидента

```typescript
await this.incidentsService.create({
  incident_type: IncidentType.CASH_SHORTAGE,
  priority: IncidentPriority.HIGH,
  machine_id: task.machine_id,
  title: 'Недостача при инкассации',
  description: 'Подробное описание...',
  created_by_user_id: userId,
  metadata: {
    task_id: task.id,
    expected_amount: 50000,
    actual_amount: 42000,
    discrepancy_percent: '16.00',
  },
});
```

---

## Полный код завершения

```typescript
// Файл: backend/src/modules/tasks/services/task-completion.service.ts

async completeTask(
  task: Task,
  userId: string,
  completeTaskDto: CompleteTaskDto
): Promise<Task> {
  // === ВАЛИДАЦИЯ ===

  // 1. Проверка статуса
  if (task.status !== TaskStatus.IN_PROGRESS) {
    throw new BadRequestException(
      `Нельзя завершить задачу со статусом ${task.status}. ` +
      'Только задачи со статусом IN_PROGRESS можно завершить.'
    );
  }

  // 2. Проверка прав
  if (task.assigned_to_user_id !== userId) {
    throw new ForbiddenException(
      'Только назначенный оператор может завершить задачу'
    );
  }

  // 3. Валидация фото
  const skipPhotos = completeTaskDto.skip_photos ?? false;
  const { pendingPhotos } = await this.validatePhotos(task, skipPhotos);

  // 4. Валидация чеклиста
  this.validateChecklist(task);

  // === ОБРАБОТКА ПО ТИПУ ===

  switch (task.type_code) {
    case TaskType.COLLECTION:
      await this.processCollectionCompletion(task, completeTaskDto, userId);
      break;

    case TaskType.REFILL:
      await this.processRefillCompletion(task, completeTaskDto, userId);
      break;

    case TaskType.CLEANING:
      await this.processCleaningCompletion(task, completeTaskDto, userId);
      break;

    case TaskType.REPLACE_HOPPER:
    case TaskType.REPLACE_GRINDER:
    case TaskType.REPLACE_BREW_UNIT:
    case TaskType.REPLACE_MIXER:
      await this.processReplaceCompletion(task, completeTaskDto, userId);
      break;

    default:
      // Базовые типы — только финализация
      break;
  }

  // === ФИНАЛИЗАЦИЯ ===

  return this.finalizeTask(task, completeTaskDto, userId, pendingPhotos);
}
```

---

## Навигация

- **Назад**: [02-TASKS-LIFECYCLE.md](./02-TASKS-LIFECYCLE.md) — Жизненный цикл
- **Далее**: [04-TASKS-API.md](./04-TASKS-API.md) — REST API
- **Также**: [01-TASKS-OVERVIEW.md](./01-TASKS-OVERVIEW.md) — Обзор системы

---

*Документация создана на основе исходного кода: `backend/src/modules/tasks/services/task-completion.service.ts`*
