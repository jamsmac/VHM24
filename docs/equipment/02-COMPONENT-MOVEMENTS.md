# Component Movements - Перемещения Компонентов

> **Модуль**: `backend/src/modules/equipment/services/component-movements.service.ts`
> **Требование**: REQ-ASSET-11
> **Версия**: 1.0.0

---

## Обзор

Система отслеживания перемещений компонентов между локациями. Каждое перемещение фиксируется в истории с полной информацией о том, откуда и куда переместился компонент.

```
┌─────────────────────────────────────────────────────────────────────┐
│                   COMPONENT MOVEMENT FLOW                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  WAREHOUSE ──────┬──────────────────────────────────────────────┐   │
│      ▲           │                                              │   │
│      │           │ INSTALL                                      │   │
│      │           ▼                                              │   │
│      │       MACHINE ──────────────────────────────────────┐    │   │
│      │           │                                         │    │   │
│      │ MOVE_TO   │ REMOVE / SEND_TO_WASH / SEND_TO_REPAIR  │    │   │
│      │ WAREHOUSE │                                         │    │   │
│      │           ▼                                         ▼    │   │
│      │       WASHING ─────────────────────▶ DRYING ────────┘    │   │
│      │           │                            │                 │   │
│      │           │ RETURN_FROM_WASH           │ RETURN_FROM     │   │
│      │           │                            │ DRYING          │   │
│      │           ▼                            ▼                 │   │
│      └───────────┴────────────────────────────┘                 │   │
│                                                                 │   │
│      REPAIR ◀─── SEND_TO_REPAIR                                 │   │
│         │                                                       │   │
│         │ RETURN_FROM_REPAIR                                    │   │
│         └───────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Entity: ComponentMovement

```typescript
export enum MovementType {
  INSTALL = 'install',                     // Установка в машину
  REMOVE = 'remove',                       // Снятие с машины
  SEND_TO_WASH = 'send_to_wash',           // Отправка на мойку
  RETURN_FROM_WASH = 'return_from_wash',   // Возврат с мойки
  SEND_TO_DRYING = 'send_to_drying',       // Отправка на сушку
  RETURN_FROM_DRYING = 'return_from_drying', // Возврат с сушки
  MOVE_TO_WAREHOUSE = 'move_to_warehouse', // Перемещение на склад
  MOVE_TO_MACHINE = 'move_to_machine',     // Перемещение в машину
  SEND_TO_REPAIR = 'send_to_repair',       // Отправка в ремонт
  RETURN_FROM_REPAIR = 'return_from_repair', // Возврат из ремонта
}

@Entity('component_movements')
@Index(['component_id'])
@Index(['moved_at'])
@Index(['movement_type'])
export class ComponentMovement extends BaseEntity {
  @Column({ type: 'uuid' })
  component_id: string;

  // Откуда
  @Column({ type: 'enum', enum: ComponentLocationType })
  from_location_type: ComponentLocationType;

  @Column({ type: 'varchar', length: 100, nullable: true })
  from_location_ref: string | null;

  // Куда
  @Column({ type: 'enum', enum: ComponentLocationType })
  to_location_type: ComponentLocationType;

  @Column({ type: 'varchar', length: 100, nullable: true })
  to_location_ref: string | null;

  // Информация о перемещении
  @Column({ type: 'enum', enum: MovementType })
  movement_type: MovementType;

  @Column({ type: 'timestamp' })
  moved_at: Date;

  // Связи с другими сущностями
  @Column({ type: 'uuid', nullable: true })
  related_machine_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  task_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  performed_by_user_id: string | null;

  // Комментарий
  @Column({ type: 'text', nullable: true })
  comment: string | null;

  // Relations
  @ManyToOne(() => EquipmentComponent)
  @JoinColumn({ name: 'component_id' })
  component: EquipmentComponent;

  @ManyToOne(() => Machine)
  @JoinColumn({ name: 'related_machine_id' })
  related_machine: Machine;

  @ManyToOne(() => Task)
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'performed_by_user_id' })
  performed_by: User;
}
```

---

## Типы перемещений (MovementType)

### Матрица валидных переходов

| Тип перемещения | Откуда (from) | Куда (to) |
|-----------------|---------------|-----------|
| `INSTALL` | warehouse | machine |
| `REMOVE` | machine | warehouse, washing, repair |
| `SEND_TO_WASH` | warehouse, machine | washing |
| `RETURN_FROM_WASH` | washing | warehouse, drying |
| `SEND_TO_DRYING` | washing | drying |
| `RETURN_FROM_DRYING` | drying | warehouse |
| `MOVE_TO_WAREHOUSE` | machine, repair, drying | warehouse |
| `MOVE_TO_MACHINE` | warehouse | machine |
| `SEND_TO_REPAIR` | warehouse, machine | repair |
| `RETURN_FROM_REPAIR` | repair | warehouse, machine |

---

## Сервис ComponentMovementsService

### Создание перемещения

```typescript
async createMovement(params: {
  componentId: string;
  toLocationType: ComponentLocationType;
  toLocationRef?: string;
  movementType: MovementType;
  relatedMachineId?: string;
  taskId?: string;
  performedByUserId?: string;
  comment?: string;
}): Promise<ComponentMovement>
```

Метод автоматически:
1. Получает текущую локацию компонента
2. Валидирует переход (проверяет матрицу валидных переходов)
3. Создаёт запись перемещения
4. Обновляет `current_location_type` и `current_location_ref` в компоненте
5. При перемещении в машину обновляет `machine_id`

### Валидация перемещений

```typescript
private validateMovement(
  from: ComponentLocationType,
  to: ComponentLocationType,
  type: MovementType,
): void {
  // Нельзя перемещать в ту же локацию
  if (from === to) {
    throw new BadRequestException(
      `Component is already in ${to}. Cannot move to the same location.`
    );
  }

  // Проверка по матрице валидных переходов
  const transition = validTransitions[type];
  if (!transition.from.includes(from)) {
    throw new BadRequestException(
      `Invalid movement: ${type} cannot be performed from ${from}`
    );
  }
  if (!transition.to.includes(to)) {
    throw new BadRequestException(
      `Invalid movement: ${type} cannot move to ${to}`
    );
  }
}
```

### Получение истории

```typescript
// История перемещений компонента
async getComponentHistory(componentId: string): Promise<ComponentMovement[]>;

// Последнее перемещение
async getLastMovement(componentId: string): Promise<ComponentMovement | null>;

// Перемещения за период
async getMovementsByDateRange(
  startDate: Date,
  endDate: Date
): Promise<ComponentMovement[]>;
```

---

## API Endpoints

### Переместить компонент

```http
POST /api/equipment/components/:id/move
Authorization: Bearer <token>

{
  "to_location_type": "washing",
  "to_location_ref": "WH-WASH-01",
  "movement_type": "send_to_wash",
  "comment": "Плановая мойка бункера"
}
```

### Установить в машину

```http
POST /api/equipment/components/:id/install
Authorization: Bearer <token>

{
  "machine_id": "uuid-машины",
  "task_id": "uuid-задачи",
  "comment": "Установка после ремонта"
}
```

### Снять с машины

```http
POST /api/equipment/components/:id/remove
Authorization: Bearer <token>

{
  "target_location": "washing",
  "target_location_ref": "WH-WASH-01",
  "task_id": "uuid-задачи",
  "comment": "Снятие для мойки"
}
```

### Получить историю

```http
GET /api/equipment/components/:id/movements
Authorization: Bearer <token>
```

### Получить текущее местоположение

```http
GET /api/equipment/components/:id/location
Authorization: Bearer <token>
```

**Response:**
```json
{
  "component": {
    "id": "uuid",
    "name": "Бункер кофе",
    "current_location_type": "machine",
    "current_location_ref": "M-001",
    "machine_id": "uuid"
  },
  "lastMovement": {
    "id": "uuid",
    "from_location_type": "warehouse",
    "to_location_type": "machine",
    "movement_type": "install",
    "moved_at": "2024-12-20T10:30:00Z",
    "comment": "Установка нового бункера"
  }
}
```

---

## Типовые сценарии

### Сценарий 1: Установка нового компонента

```
1. Компонент на складе (WAREHOUSE)
2. POST /components/:id/install → { machine_id }
3. Создаётся movement: INSTALL, warehouse → machine
4. Компонент теперь в машине (MACHINE)
```

### Сценарий 2: Мойка бункера

```
1. Бункер в машине (MACHINE)
2. POST /components/:id/remove → { target_location: "washing" }
3. Movement: REMOVE, machine → washing
4. Бункер на мойке (WASHING)
5. [После мойки]
6. POST /components/:id/move → { to: "drying", type: "send_to_drying" }
7. Movement: SEND_TO_DRYING, washing → drying
8. [После сушки]
9. POST /components/:id/move → { to: "warehouse", type: "return_from_drying" }
10. Movement: RETURN_FROM_DRYING, drying → warehouse
11. POST /components/:id/install → { machine_id }
12. Movement: INSTALL, warehouse → machine
```

### Сценарий 3: Ремонт компонента

```
1. Компонент в машине с проблемой
2. POST /components/:id/move → { to: "repair", type: "send_to_repair" }
3. Movement: SEND_TO_REPAIR, machine → repair
4. [Ремонт завершён]
5. POST /components/:id/move → { to: "machine", type: "return_from_repair" }
6. Movement: RETURN_FROM_REPAIR, repair → machine
```

---

## Интеграция с задачами

При выполнении задач типа `washing` или `maintenance` автоматически создаются записи перемещений:

```typescript
// В TasksService при завершении задачи мойки
if (task.type === TaskType.WASHING) {
  // Снятие компонентов
  for (const component of task.components) {
    await this.movementsService.createMovement({
      componentId: component.id,
      toLocationType: ComponentLocationType.WASHING,
      movementType: MovementType.SEND_TO_WASH,
      taskId: task.id,
      performedByUserId: task.assigned_to_id,
    });
  }
}
```

---

## Аудит и отчётность

Все перемещения хранятся бессрочно для:
- Полной истории жизненного цикла компонента
- Анализа частоты мойки/обслуживания
- Выявления проблемных компонентов
- Отчётов по складским операциям

### Пример отчёта

```sql
-- Компоненты часто отправляемые в ремонт
SELECT
  c.name,
  c.serial_number,
  COUNT(m.id) as repair_count
FROM component_movements m
JOIN equipment_components c ON m.component_id = c.id
WHERE m.movement_type = 'send_to_repair'
  AND m.moved_at > NOW() - INTERVAL '90 days'
GROUP BY c.id
ORDER BY repair_count DESC
LIMIT 10;
```

---

## Ошибки

| Код | Сообщение | Причина |
|-----|-----------|---------|
| 400 | Component is already in {location} | Попытка переместить в текущую локацию |
| 400 | Invalid movement: {type} cannot be performed from {from} | Недопустимый тип перемещения из данной локации |
| 400 | Invalid movement: {type} cannot move to {to} | Недопустимая целевая локация для данного типа |
| 404 | Component with ID {id} not found | Компонент не найден |
