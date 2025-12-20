# Система Задач VendHub Manager - Обзор

> **Версия**: 2.0
> **Последнее обновление**: 2025-12-20
> **Исходный код**: `backend/src/modules/tasks/`

---

## Содержание

1. [Введение](#введение)
2. [Архитектура модуля](#архитектура-модуля)
3. [Типы задач (TaskType)](#типы-задач-tasktype)
4. [Статусы задач (TaskStatus)](#статусы-задач-taskstatus)
5. [Приоритеты задач (TaskPriority)](#приоритеты-задач-taskpriority)
6. [Модель данных Task](#модель-данных-task)
7. [Связанные сущности](#связанные-сущности)
8. [Индексы базы данных](#индексы-базы-данных)
9. [Ключевые особенности](#ключевые-особенности)

---

## Введение

Система задач — это **центральный механизм** управления операциями в VendHub Manager. Все действия операторов с вендинговыми аппаратами проходят через задачи:

- **Пополнение** товаров
- **Инкассация** денег
- **Обслуживание** и ремонт
- **Замена** компонентов

### Ключевой принцип: Manual Operations Architecture

VendHub Manager работает по принципу **ручных операций** — нет прямой связи с аппаратами. Все данные поступают через действия операторов, подтвержденные **фотографиями**.

```
┌─────────────────────────────────────────────────────────────┐
│                    СИСТЕМА ЗАДАЧ                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐   │
│   │  Создание   │───>│  Назначение │───>│ Выполнение  │   │
│   │   задачи    │    │  оператору  │    │   (фото!)   │   │
│   └─────────────┘    └─────────────┘    └──────┬──────┘   │
│                                                 │          │
│                                                 ▼          │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐   │
│   │ Отклонение  │<───│  Проверка   │<───│ Завершение  │   │
│   │   (откат)   │    │   админом   │    │   задачи    │   │
│   └─────────────┘    └─────────────┘    └─────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Архитектура модуля

### Файловая структура

```
backend/src/modules/tasks/
├── dto/
│   ├── create-task.dto.ts          # DTO создания задачи
│   ├── create-task-item.dto.ts     # DTO товара для задачи
│   ├── update-task.dto.ts          # DTO обновления
│   ├── complete-task.dto.ts        # DTO завершения
│   ├── task-component.dto.ts       # DTO компонента
│   └── task-query.dto.ts           # DTO для фильтрации
├── entities/
│   ├── task.entity.ts              # Основная сущность задачи
│   ├── task-item.entity.ts         # Товар в задаче
│   ├── task-comment.entity.ts      # Комментарий к задаче
│   └── task-component.entity.ts    # Компонент в задаче
├── services/
│   ├── task-completion.service.ts  # Логика завершения (659 строк)
│   ├── task-rejection.service.ts   # Логика отклонения (256 строк)
│   └── task-escalation.service.ts  # Эскалация и статистика (343 строки)
├── tasks.controller.ts             # REST API (443 строки)
├── tasks.service.ts                # Основной сервис (457 строк)
└── tasks.module.ts                 # Модуль NestJS
```

### Декомпозиция сервисов

Система использует паттерн **Service Decomposition** — основной `TasksService` делегирует сложную логику специализированным сервисам:

```typescript
@Injectable()
export class TasksService {
  constructor(
    private readonly taskCompletionService: TaskCompletionService,
    private readonly taskRejectionService: TaskRejectionService,
    private readonly taskEscalationService: TaskEscalationService,
    // ... другие зависимости
  ) {}
}
```

| Сервис | Ответственность |
|--------|-----------------|
| `TasksService` | CRUD операции, назначение, старт, координация |
| `TaskCompletionService` | Валидация фото, обновление инвентаря, финансов |
| `TaskRejectionService` | Отклонение задач, компенсирующие транзакции |
| `TaskEscalationService` | Эскалация просроченных, статистика, мониторинг |

---

## Типы задач (TaskType)

### Enum TaskType

```typescript
// Файл: backend/src/modules/tasks/entities/task.entity.ts:9-22

export enum TaskType {
  REFILL = 'refill',                   // Пополнение товаров
  COLLECTION = 'collection',           // Инкассация денег
  CLEANING = 'cleaning',               // Мойка/чистка
  REPAIR = 'repair',                   // Ремонт
  INSTALL = 'install',                 // Установка аппарата
  REMOVAL = 'removal',                 // Снятие аппарата
  AUDIT = 'audit',                     // Ревизия
  INSPECTION = 'inspection',           // Осмотр/проверка
  REPLACE_HOPPER = 'replace_hopper',   // Замена бункера
  REPLACE_GRINDER = 'replace_grinder', // Замена кофемолки
  REPLACE_BREW_UNIT = 'replace_brew_unit', // Замена варочного блока
  REPLACE_MIXER = 'replace_mixer',     // Замена миксера
}
```

### Детальное описание типов

#### 1. REFILL (Пополнение)

**Назначение**: Загрузка товаров из инвентаря оператора в аппарат.

**Особенности**:
- Требует массив `items[]` с товарами и количествами
- При завершении обновляется инвентарь машины
- Создает движение: **Оператор → Аппарат**

**Связанные данные**:
```typescript
{
  items: TaskItem[],        // Список товаров
  has_photo_before: true,   // Фото ДО пополнения
  has_photo_after: true,    // Фото ПОСЛЕ пополнения
}
```

#### 2. COLLECTION (Инкассация)

**Назначение**: Сбор наличных денег из аппарата.

**Особенности**:
- Требует `expected_cash_amount` (ожидаемая сумма)
- При завершении указывается `actual_cash_amount`
- Создает финансовую транзакцию типа `COLLECTION`
- При расхождении >10% создается **инцидент**

**Связанные данные**:
```typescript
{
  expected_cash_amount: 50000,  // Ожидаемая сумма (сум)
  actual_cash_amount: 48750,    // Фактическая сумма
  has_photo_before: true,
  has_photo_after: true,
}
```

**Формула расхождения**:
```typescript
const discrepancy = Math.abs(expected - actual) / expected * 100;
if (discrepancy > 10) {
  // Создать инцидент типа CASH_SHORTAGE
}
```

#### 3. CLEANING (Мойка)

**Назначение**: Плановая или внеплановая чистка аппарата.

**Особенности**:
- Может использовать `components[]` с ролью `TARGET`
- Чеклист операций (промывка, очистка и т.д.)
- Фото до/после обязательны

**Пример чеклиста**:
```json
{
  "checklist": [
    {"item": "Промыть варочный блок", "completed": false},
    {"item": "Очистить поддон", "completed": false},
    {"item": "Протереть панель", "completed": false}
  ]
}
```

#### 4. REPAIR (Ремонт)

**Назначение**: Устранение неисправностей аппарата.

**Особенности**:
- Может быть связан с инцидентом
- Использует `components[]` для отслеживания замененных деталей
- Подробное описание в `description` и `completion_notes`

#### 5. INSTALL / REMOVAL (Установка/Снятие)

**Назначение**: Ввод в эксплуатацию или вывод аппарата.

**Особенности**:
- Критически важные операции
- Требуют полную документацию
- Могут изменять статус машины

#### 6. AUDIT (Ревизия)

**Назначение**: Полная инвентаризация аппарата.

**Особенности**:
- Сверка фактических остатков с системными
- Может корректировать данные инвентаря
- Используется для устранения расхождений

#### 7. INSPECTION (Осмотр)

**Назначение**: Регулярная проверка состояния аппарата.

**Особенности**:
- Плановая операция
- Чеклист проверок
- Может выявить необходимость ремонта

#### 8. REPLACE_* (Замена компонентов)

**Типы замен**:
- `REPLACE_HOPPER` — Замена бункера для ингредиентов
- `REPLACE_GRINDER` — Замена кофемолки
- `REPLACE_BREW_UNIT` — Замена варочного блока
- `REPLACE_MIXER` — Замена миксера

**Особенности**:
- Требует массив `components[]` с ролями `OLD` и `NEW`
- Обновляет привязку компонентов к машине
- Старый компонент уходит на склад/ремонт

```typescript
{
  components: [
    { component_id: 'uuid-old', role: 'old', notes: 'Изношен' },
    { component_id: 'uuid-new', role: 'new', notes: 'Новый' }
  ]
}
```

---

## Статусы задач (TaskStatus)

### Enum TaskStatus

```typescript
// Файл: backend/src/modules/tasks/entities/task.entity.ts:24-32

export enum TaskStatus {
  PENDING = 'pending',         // Ожидает назначения
  ASSIGNED = 'assigned',       // Назначена оператору
  IN_PROGRESS = 'in_progress', // В процессе выполнения
  COMPLETED = 'completed',     // Успешно завершена
  REJECTED = 'rejected',       // Отклонена администратором
  POSTPONED = 'postponed',     // Отложена оператором
  CANCELLED = 'cancelled',     // Отменена
}
```

### Диаграмма переходов статусов

```
                          ┌─────────────────────────────────────┐
                          │                                     │
                          ▼                                     │
┌─────────┐    ┌──────────┐    ┌─────────────┐    ┌───────────┐│
│ PENDING │───>│ ASSIGNED │───>│ IN_PROGRESS │───>│ COMPLETED ││
└────┬────┘    └────┬─────┘    └──────┬──────┘    └─────┬─────┘│
     │              │                 │                  │      │
     │              │                 │                  │      │
     │              ▼                 ▼                  │      │
     │         ┌──────────┐     ┌───────────┐           │      │
     │         │POSTPONED │     │ CANCELLED │           │      │
     │         └──────────┘     └───────────┘           │      │
     │                                                   │      │
     │                                                   ▼      │
     │                                            ┌──────────┐  │
     │                                            │ REJECTED │──┘
     │                                            └──────────┘
     │
     └─────────────────────────────────────────────────────────>
                           CANCELLED (от любого статуса)
```

### Описание статусов

| Статус | Описание | Переходы ИЗ | Переходы В |
|--------|----------|-------------|------------|
| `PENDING` | Задача создана, ожидает назначения | — | ASSIGNED, CANCELLED |
| `ASSIGNED` | Назначена оператору | PENDING | IN_PROGRESS, POSTPONED, CANCELLED |
| `IN_PROGRESS` | Оператор работает над задачей | ASSIGNED | COMPLETED, CANCELLED |
| `COMPLETED` | Задача успешно завершена | IN_PROGRESS | REJECTED |
| `REJECTED` | Отклонена админом (с откатом) | COMPLETED | PENDING (повтор) |
| `POSTPONED` | Отложена оператором | ASSIGNED | ASSIGNED (возврат) |
| `CANCELLED` | Отменена | Любой | — |

### Валидация переходов в коде

```typescript
// Файл: backend/src/modules/tasks/tasks.service.ts

async startTask(taskId: string, userId: string): Promise<Task> {
  const task = await this.findOne(taskId);

  // Валидация: можно начать только ASSIGNED задачу
  if (task.status !== TaskStatus.ASSIGNED) {
    throw new BadRequestException(
      'Можно начать выполнение только назначенной задачи'
    );
  }

  // Валидация: только назначенный оператор
  if (task.assigned_to_user_id !== userId) {
    throw new ForbiddenException(
      'Только назначенный оператор может начать выполнение'
    );
  }

  task.status = TaskStatus.IN_PROGRESS;
  task.started_at = new Date();

  return this.taskRepository.save(task);
}
```

---

## Приоритеты задач (TaskPriority)

### Enum TaskPriority

```typescript
// Файл: backend/src/modules/tasks/entities/task.entity.ts:34-39

export enum TaskPriority {
  LOW = 'low',       // Низкий приоритет
  NORMAL = 'normal', // Обычный (по умолчанию)
  HIGH = 'high',     // Высокий
  URGENT = 'urgent', // Срочный
}
```

### Влияние приоритета

| Приоритет | SLA | Эскалация | Уведомления |
|-----------|-----|-----------|-------------|
| `LOW` | 72 часа | После 96 часов | Стандартные |
| `NORMAL` | 24 часа | После 48 часов | Стандартные |
| `HIGH` | 8 часов | После 12 часов | + Telegram |
| `URGENT` | 2 часа | После 4 часов | + SMS/Звонок |

### Получение задач по приоритету

```typescript
// Файл: backend/src/modules/tasks/services/task-escalation.service.ts:249-274

async getTasksByPriority(userId?: string): Promise<{
  critical: Task[];
  high: Task[];
  medium: Task[];
  low: Task[];
}> {
  const tasks = await query.getMany();

  return {
    critical: tasks.filter((t) => t.priority === TaskPriority.URGENT),
    high: tasks.filter((t) => t.priority === TaskPriority.HIGH),
    medium: tasks.filter((t) => t.priority === TaskPriority.NORMAL),
    low: tasks.filter((t) => t.priority === TaskPriority.LOW),
  };
}
```

---

## Модель данных Task

### Полная структура сущности

```typescript
// Файл: backend/src/modules/tasks/entities/task.entity.ts:41-179

@Entity('tasks')
@Index(['machine_id'])
@Index(['assigned_to_user_id'])
@Index(['created_by_user_id'])
@Index(['type_code', 'status'])
@Index(['due_date'])
@Index(['pending_photos'])
export class Task extends BaseEntity {
  // === ОСНОВНЫЕ ПОЛЯ ===

  @Column({ type: 'enum', enum: TaskType })
  type_code: TaskType;                    // Тип задачи

  @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.PENDING })
  status: TaskStatus;                     // Статус

  @Column({ type: 'enum', enum: TaskPriority, default: TaskPriority.NORMAL })
  priority: TaskPriority;                 // Приоритет

  // === СВЯЗИ С МАШИНОЙ ===

  @Column({ type: 'uuid' })
  machine_id: string;                     // ID аппарата

  @ManyToOne(() => Machine, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'machine_id' })
  machine: Machine;                       // Связь с машиной

  // === СВЯЗИ С ПОЛЬЗОВАТЕЛЯМИ ===

  @Column({ type: 'uuid', nullable: true })
  assigned_to_user_id: string | null;     // ID назначенного оператора

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_to_user_id' })
  assigned_to: User | null;               // Оператор

  @Column({ type: 'uuid' })
  created_by_user_id: string;             // ID создателя

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_user_id' })
  created_by: User;                       // Создатель

  // === РАСПИСАНИЕ ===

  @Column({ type: 'timestamp with time zone', nullable: true })
  scheduled_date: Date | null;            // Запланированная дата

  @Column({ type: 'timestamp with time zone', nullable: true })
  due_date: Date | null;                  // Срок выполнения

  // === ОТСЛЕЖИВАНИЕ ВЫПОЛНЕНИЯ ===

  @Column({ type: 'timestamp with time zone', nullable: true })
  started_at: Date | null;                // Когда начато

  @Column({ type: 'timestamp with time zone', nullable: true })
  completed_at: Date | null;              // Когда завершено

  @Column({ type: 'timestamp with time zone', nullable: true })
  operation_date: Date | null;            // Фактическая дата (для офлайн)

  // === ОПИСАНИЕ ===

  @Column({ type: 'text', nullable: true })
  description: string | null;             // Описание задачи

  @Column({ type: 'text', nullable: true })
  completion_notes: string | null;        // Заметки при завершении

  @Column({ type: 'text', nullable: true })
  postpone_reason: string | null;         // Причина отложения

  // === ЧЕКЛИСТ ===

  @Column({ type: 'jsonb', nullable: true })
  checklist: Array<{
    item: string;
    completed: boolean;
  }> | null;

  // === ИНКАССАЦИЯ ===

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  expected_cash_amount: number | null;    // Ожидаемая сумма

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  actual_cash_amount: number | null;      // Фактическая сумма

  // === ФОТО-ВАЛИДАЦИЯ ===

  @Column({ type: 'boolean', default: false })
  has_photo_before: boolean;              // Есть фото ДО

  @Column({ type: 'boolean', default: false })
  has_photo_after: boolean;               // Есть фото ПОСЛЕ

  // === ОФЛАЙН РЕЖИМ ===

  @Column({ type: 'boolean', default: false })
  pending_photos: boolean;                // Ждет загрузки фото

  @Column({ type: 'boolean', default: false })
  offline_completed: boolean;             // Завершена офлайн

  // === ОТКЛОНЕНИЕ ===

  @Column({ type: 'uuid', nullable: true })
  rejected_by_user_id: string | null;     // Кто отклонил

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'rejected_by_user_id' })
  rejected_by: User | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  rejected_at: Date | null;               // Когда отклонено

  @Column({ type: 'text', nullable: true })
  rejection_reason: string | null;        // Причина отклонения

  // === СВЯЗАННЫЕ СУЩНОСТИ ===

  @OneToMany(() => TaskItem, (item) => item.task, { cascade: true })
  items: TaskItem[];                      // Товары

  @OneToMany(() => TaskComment, (comment) => comment.task, { cascade: true })
  comments: TaskComment[];                // Комментарии

  @OneToMany(() => TaskComponent, (tc) => tc.task, { cascade: true })
  components: TaskComponent[];            // Компоненты

  // === МЕТАДАННЫЕ ===

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;   // Произвольные данные
}
```

### Поля из BaseEntity

Сущность `Task` наследует от `BaseEntity`:

```typescript
// Унаследованные поля:
id: string;              // UUID, первичный ключ
created_at: Date;        // Дата создания
updated_at: Date;        // Дата обновления
deleted_at: Date | null; // Soft delete
```

---

## Связанные сущности

### TaskItem (Товар в задаче)

```typescript
// Файл: backend/src/modules/tasks/entities/task-item.entity.ts

@Entity('task_items')
@Index(['task_id'])
@Index(['nomenclature_id'])
export class TaskItem extends BaseEntity {
  @Column({ type: 'uuid' })
  task_id: string;                    // ID задачи

  @ManyToOne(() => Task, (task) => task.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @Column({ type: 'uuid' })
  nomenclature_id: string;            // ID номенклатуры

  @ManyToOne(() => Nomenclature, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'nomenclature_id' })
  nomenclature: Nomenclature;

  @Column({ type: 'decimal', precision: 10, scale: 3 })
  planned_quantity: number;           // Запланированное количество

  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
  actual_quantity: number | null;     // Фактическое количество

  @Column({ type: 'varchar', length: 50 })
  unit_of_measure_code: string;       // Единица измерения

  @Column({ type: 'text', nullable: true })
  notes: string | null;               // Примечания
}
```

**Использование**: В задачах типа `REFILL` для списка товаров к пополнению.

### TaskComment (Комментарий)

```typescript
// Файл: backend/src/modules/tasks/entities/task-comment.entity.ts

@Entity('task_comments')
@Index(['task_id'])
@Index(['user_id'])
export class TaskComment extends BaseEntity {
  @Column({ type: 'uuid' })
  task_id: string;

  @ManyToOne(() => Task, (task) => task.comments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'text' })
  comment: string;                    // Текст комментария

  @Column({ type: 'boolean', default: false })
  is_internal: boolean;               // Только для админов
}
```

**Флаг is_internal**:
- `true` — виден только администраторам и менеджерам
- `false` — виден также оператору

### TaskComponent (Компонент в задаче)

```typescript
// Файл: backend/src/modules/tasks/entities/task-component.entity.ts

export enum ComponentRole {
  OLD = 'old',     // Снимаемый компонент
  NEW = 'new',     // Устанавливаемый компонент
  TARGET = 'target', // Обслуживаемый компонент
}

@Entity('task_components')
@Index(['task_id'])
@Index(['component_id'])
@Index(['role'])
export class TaskComponent extends BaseEntity {
  @Column({ type: 'uuid' })
  task_id: string;

  @ManyToOne(() => Task, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @Column({ type: 'uuid' })
  component_id: string;

  @ManyToOne(() => EquipmentComponent, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'component_id' })
  component: EquipmentComponent;

  @Column({ type: 'enum', enum: ComponentRole })
  role: ComponentRole;                // Роль компонента

  @Column({ type: 'text', nullable: true })
  notes: string | null;               // Примечания

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}
```

**Использование ролей**:

| Тип задачи | Роли компонентов |
|------------|------------------|
| `REPLACE_*` | `OLD` + `NEW` (замена) |
| `CLEANING` | `TARGET` (что чистим) |
| `REPAIR` | `TARGET` или `OLD` + `NEW` |

---

## Индексы базы данных

### Определенные индексы

```typescript
@Entity('tasks')
@Index(['machine_id'])              // Поиск по аппарату
@Index(['assigned_to_user_id'])     // Задачи оператора
@Index(['created_by_user_id'])      // Задачи от менеджера
@Index(['type_code', 'status'])     // Фильтрация по типу+статусу
@Index(['due_date'])                // Сортировка по сроку
@Index(['pending_photos'])          // Офлайн задачи
```

### Типичные запросы и индексы

| Запрос | Используемый индекс |
|--------|---------------------|
| Задачи оператора | `assigned_to_user_id` |
| Задачи для аппарата | `machine_id` |
| Активные REFILL | `type_code, status` |
| Просроченные | `due_date` |
| Ждут фото | `pending_photos` |

---

## Ключевые особенности

### 1. Обязательная фото-валидация

```typescript
// Все задачи требуют фото ДО и ПОСЛЕ
if (!task.has_photo_before || !task.has_photo_after) {
  throw new BadRequestException(
    'Для завершения задачи необходимы фотографии до и после'
  );
}
```

### 2. Офлайн режим

Операторы могут работать без интернета:
- `skip_photos: true` в DTO завершения
- `pending_photos: true` — задача ждет фото
- `offline_completed: true` — выполнена офлайн
- `operation_date` — фактическая дата операции

### 3. Компенсирующие транзакции

При отклонении задачи выполняется **полный откат**:
- `REFILL` — возврат товаров оператору
- `COLLECTION` — возврат денег в аппарат

### 4. Автоматическая эскалация

Просроченные задачи (>4 часов):
- Создается инцидент
- Уведомляется менеджер
- Записывается в аудит

### 5. Интеграция с другими модулями

```
┌─────────────────────────────────────────────────────────────┐
│                         TASKS                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌───────────┐  ┌───────────┐  ┌───────────────────────┐ │
│   │ INVENTORY │  │TRANSACTIONS│  │    NOTIFICATIONS     │ │
│   │  Module   │  │  Module   │  │       Module          │ │
│   └─────┬─────┘  └─────┬─────┘  └───────────┬───────────┘ │
│         │              │                     │             │
│   Обновление     Финансовые           Уведомления         │
│   остатков       транзакции           операторам          │
│                                                             │
│   ┌───────────┐  ┌───────────┐  ┌───────────────────────┐ │
│   │ INCIDENTS │  │   FILES   │  │     AUDIT-LOGS        │ │
│   │  Module   │  │  Module   │  │       Module          │ │
│   └─────┬─────┘  └─────┬─────┘  └───────────┬───────────┘ │
│         │              │                     │             │
│   Расхождения    Фото ДО/ПОСЛЕ         Аудит всех         │
│   в инкассации                          операций          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Навигация

- **Далее**: [02-TASKS-LIFECYCLE.md](./02-TASKS-LIFECYCLE.md) — Жизненный цикл задачи
- **Также**: [03-TASKS-COMPLETION.md](./03-TASKS-COMPLETION.md) — Логика завершения
- **Также**: [04-TASKS-API.md](./04-TASKS-API.md) — REST API

---

*Документация создана на основе исходного кода: `backend/src/modules/tasks/`*
