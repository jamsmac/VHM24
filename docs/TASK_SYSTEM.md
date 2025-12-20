# Task System - VendHub Manager

> **Version**: 1.0.0
> **Last Updated**: 2025-12-20
> **Module**: `backend/src/modules/tasks/`

This document provides comprehensive documentation of the Task System, the central mechanism for all operations in VendHub Manager.

---

## Table of Contents

1. [Overview](#overview)
2. [Task Types](#task-types)
3. [Task Statuses](#task-statuses)
4. [Status Transitions](#status-transitions)
5. [Task Lifecycle](#task-lifecycle)
6. [Photo Validation](#photo-validation)
7. [Offline Mode Support](#offline-mode-support)
8. [Task-Specific Processing](#task-specific-processing)
9. [Task Rejection](#task-rejection)
10. [Task Escalation](#task-escalation)
11. [Task Comments](#task-comments)
12. [Task Items](#task-items)
13. [Task Components](#task-components)
14. [Notifications](#notifications)
15. [API Reference](#api-reference)
16. [Sequence Diagrams](#sequence-diagrams)
17. [Error Handling](#error-handling)

---

## Overview

### Architecture Principle

**Tasks are the central mechanism** for all operations in VendHub Manager. This is a fundamental principle of the Manual Operations Architecture:

```
┌─────────────────────────────────────────────────────────────────┐
│                    MANUAL OPERATIONS ARCHITECTURE                │
├─────────────────────────────────────────────────────────────────┤
│  NO direct machine connectivity                                  │
│  NO automated status updates                                     │
│  NO real-time data sync from machines                           │
│                                                                  │
│  ALL data flows through TASKS:                                  │
│  - Inventory updates → via Refill tasks                         │
│  - Cash collection → via Collection tasks                       │
│  - Equipment tracking → via Component Replacement tasks         │
│  - Maintenance records → via Cleaning/Repair tasks              │
└─────────────────────────────────────────────────────────────────┘
```

### Key Entities

```
┌───────────────────┐
│       Task        │
│                   │
│ - type_code       │
│ - status          │
│ - priority        │
│ - machine_id      │
│ - assigned_to     │
│ - scheduled_date  │
│ - due_date        │
└────────┬──────────┘
         │
    ┌────┴────┬──────────┬──────────────┐
    ▼         ▼          ▼              ▼
┌────────┐ ┌────────┐ ┌────────────┐ ┌────────────┐
│TaskItem│ │TaskComp│ │TaskComment │ │   Files    │
│        │ │onent   │ │            │ │ (Photos)   │
│planned │ │old/new │ │ comment    │ │ before/    │
│actual  │ │component│ │ is_internal│ │ after      │
└────────┘ └────────┘ └────────────┘ └────────────┘
```

### Module Structure

```
tasks/
├── entities/
│   ├── task.entity.ts           # Main Task entity
│   ├── task-item.entity.ts      # Items for refill tasks
│   ├── task-comment.entity.ts   # Task comments
│   └── task-component.entity.ts # Components for replacement tasks
├── dto/
│   ├── create-task.dto.ts       # Task creation
│   ├── update-task.dto.ts       # Task update
│   ├── complete-task.dto.ts     # Task completion
│   ├── create-task-item.dto.ts  # Item creation
│   └── task-component.dto.ts    # Component assignment
├── services/
│   ├── task-completion.service.ts  # Completion logic (~660 lines)
│   ├── task-rejection.service.ts   # Rejection with rollback (~260 lines)
│   └── task-escalation.service.ts  # Stats & escalation (~345 lines)
├── tasks.service.ts             # Main coordinator (~460 lines)
├── tasks.controller.ts          # REST API (~445 lines)
└── tasks.module.ts              # Module configuration
```

---

## Task Types

VendHub Manager supports 12 task types:

### Core Operations

| Type Code | Name (RU) | Name (EN) | Description |
|-----------|-----------|-----------|-------------|
| `refill` | Пополнение | Refill | Load products into machine |
| `collection` | Инкассация | Collection | Collect cash from machine |
| `cleaning` | Мойка | Cleaning | Clean machine/components |
| `repair` | Ремонт | Repair | Fix machine issues |
| `inspection` | Осмотр | Inspection | Check machine condition |
| `audit` | Ревизия | Audit | Full inventory audit |

### Installation/Removal

| Type Code | Name (RU) | Name (EN) | Description |
|-----------|-----------|-----------|-------------|
| `install` | Установка | Installation | Install new machine |
| `removal` | Снятие | Removal | Remove machine from location |

### Component Replacement

| Type Code | Name (RU) | Name (EN) | Description |
|-----------|-----------|-----------|-------------|
| `replace_hopper` | Замена бункера | Hopper Replacement | Replace ingredient hopper |
| `replace_grinder` | Замена гриндера | Grinder Replacement | Replace coffee grinder |
| `replace_brew_unit` | Замена варочного блока | Brew Unit Replacement | Replace brewing unit |
| `replace_mixer` | Замена миксера | Mixer Replacement | Replace mixer component |

### TypeScript Enum

```typescript
export enum TaskType {
  REFILL = 'refill',
  COLLECTION = 'collection',
  CLEANING = 'cleaning',
  REPAIR = 'repair',
  INSTALL = 'install',
  REMOVAL = 'removal',
  AUDIT = 'audit',
  INSPECTION = 'inspection',
  REPLACE_HOPPER = 'replace_hopper',
  REPLACE_GRINDER = 'replace_grinder',
  REPLACE_BREW_UNIT = 'replace_brew_unit',
  REPLACE_MIXER = 'replace_mixer',
}
```

---

## Task Statuses

### Status Overview

| Status | Name (RU) | Name (EN) | Description |
|--------|-----------|-----------|-------------|
| `pending` | Ожидает | Pending | Task created, not yet assigned |
| `assigned` | Назначена | Assigned | Task assigned to operator |
| `in_progress` | Выполняется | In Progress | Operator started working |
| `completed` | Завершена | Completed | Task successfully completed |
| `rejected` | Отклонена | Rejected | Admin rejected completed task |
| `postponed` | Отложена | Postponed | Task postponed to later date |
| `cancelled` | Отменена | Cancelled | Task cancelled |

### TypeScript Enum

```typescript
export enum TaskStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
  POSTPONED = 'postponed',
  CANCELLED = 'cancelled',
}
```

### Task Priority

```typescript
export enum TaskPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}
```

---

## Status Transitions

### Valid Transitions Matrix

```
┌─────────────────────────────────────────────────────────────┐
│                   VALID STATUS TRANSITIONS                   │
├──────────────┬──────────────────────────────────────────────┤
│ From Status  │ Valid Transitions                            │
├──────────────┼──────────────────────────────────────────────┤
│ PENDING      │ → ASSIGNED, CANCELLED                        │
│ ASSIGNED     │ → IN_PROGRESS, POSTPONED, CANCELLED          │
│ IN_PROGRESS  │ → COMPLETED, POSTPONED, CANCELLED            │
│ POSTPONED    │ → ASSIGNED, CANCELLED                        │
│ COMPLETED    │ → REJECTED (admin only)                      │
│ REJECTED     │ (terminal state)                             │
│ CANCELLED    │ (terminal state)                             │
└──────────────┴──────────────────────────────────────────────┘
```

### State Machine Diagram

```
                    ┌──────────┐
                    │ PENDING  │
                    └────┬─────┘
                         │ assign
                         ▼
                    ┌──────────┐    postpone
             ┌──────│ ASSIGNED │◄────────────┐
             │      └────┬─────┘             │
             │           │ start             │
             │           ▼                   │
             │      ┌────────────┐           │
             │      │IN_PROGRESS │───────────┤
             │      └─────┬──────┘           │
             │            │ complete         │
             │            ▼                  │
             │      ┌──────────┐        ┌────┴─────┐
             │      │COMPLETED │        │POSTPONED │
             │      └─────┬────┘        └──────────┘
             │            │ reject (admin)
    cancel   │            ▼
             │      ┌──────────┐
             │      │ REJECTED │
             │      └──────────┘
             │
             ▼
       ┌──────────┐
       │CANCELLED │
       └──────────┘
```

### Transition Validation Code

```typescript
private validateStatusTransition(currentStatus: TaskStatus, newStatus: TaskStatus): void {
  const validTransitions: Record<TaskStatus, TaskStatus[]> = {
    [TaskStatus.PENDING]: [TaskStatus.ASSIGNED, TaskStatus.CANCELLED],
    [TaskStatus.ASSIGNED]: [TaskStatus.IN_PROGRESS, TaskStatus.POSTPONED, TaskStatus.CANCELLED],
    [TaskStatus.IN_PROGRESS]: [TaskStatus.COMPLETED, TaskStatus.POSTPONED, TaskStatus.CANCELLED],
    [TaskStatus.POSTPONED]: [TaskStatus.ASSIGNED, TaskStatus.CANCELLED],
    [TaskStatus.COMPLETED]: [], // Only admin can transition to REJECTED
    [TaskStatus.CANCELLED]: [],
    [TaskStatus.REJECTED]: [],
  };

  const allowedStatuses = validTransitions[currentStatus] || [];

  if (!allowedStatuses.includes(newStatus)) {
    throw new BadRequestException(
      `Невозможен переход из статуса ${currentStatus} в статус ${newStatus}`,
    );
  }
}
```

---

## Task Lifecycle

### Complete Task Lifecycle Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                          TASK LIFECYCLE                                 │
└────────────────────────────────────────────────────────────────────────┘

1. CREATION
┌─────────────────────────────────────────────────────────────────────────┐
│ Manager/Admin creates task                                              │
│ ├── Validates machine exists                                           │
│ ├── Checks for conflicting active tasks on same machine                │
│ ├── Creates TaskItems (for refill tasks)                               │
│ ├── Creates inventory reservation (for refill tasks)                   │
│ └── Status: PENDING                                                    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
2. ASSIGNMENT
┌─────────────────────────────────────────────────────────────────────────┐
│ Manager assigns task to operator                                        │
│ ├── Sets assigned_to_user_id                                           │
│ ├── Sends notification to operator                                     │
│ └── Status: ASSIGNED                                                   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
3. START
┌─────────────────────────────────────────────────────────────────────────┐
│ Operator starts working on task                                         │
│ ├── Validates: only assigned operator can start                        │
│ ├── Records started_at timestamp                                       │
│ └── Status: IN_PROGRESS                                                │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
4. EXECUTION
┌─────────────────────────────────────────────────────────────────────────┐
│ Operator performs the physical work                                     │
│ ├── Takes "before" photo (uploads via /files endpoint)                 │
│ ├── Performs the actual task                                           │
│ ├── Takes "after" photo (uploads via /files endpoint)                  │
│ └── Completes checklist items (if any)                                 │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
5. COMPLETION
┌─────────────────────────────────────────────────────────────────────────┐
│ Operator completes task                                                 │
│ ├── VALIDATES: Photos before AND after exist (MANDATORY)              │
│ ├── VALIDATES: All checklist items completed                          │
│ ├── Processes task-type-specific logic:                                │
│ │   ├── REFILL: Updates inventory (Operator → Machine)                 │
│ │   ├── COLLECTION: Records financial transaction                     │
│ │   ├── CLEANING: Updates washing schedule                            │
│ │   └── REPLACE_*: Records component movements                        │
│ ├── Records completed_at timestamp                                     │
│ ├── Sends notification to task creator                                 │
│ ├── Emits 'task.completed' event for analytics                        │
│ └── Status: COMPLETED                                                  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
              [SUCCESS]                      [ADMIN REJECTS]
                                                    │
                                                    ▼
6. REJECTION (Optional - Admin Only)
┌─────────────────────────────────────────────────────────────────────────┐
│ Admin rejects completed task                                            │
│ ├── VALIDATES: Only admins can reject                                  │
│ ├── VALIDATES: Only completed tasks can be rejected                    │
│ ├── ROLLBACK: Inventory changes (for refill tasks)                     │
│ ├── ROLLBACK: Financial transactions (for collection tasks)           │
│ ├── Creates compensating transactions                                  │
│ ├── Records rejection reason                                           │
│ ├── Notifies operator about rejection                                  │
│ ├── Emits 'task.rejected' event for analytics                         │
│ └── Status: REJECTED                                                   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Photo Validation

### CRITICAL REQUIREMENT

**Photo validation is MANDATORY** for task completion. This is a fundamental architecture principle:

```
┌────────────────────────────────────────────────────────────────────┐
│                    PHOTO VALIDATION RULE                            │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Tasks CANNOT be completed without:                                │
│  ✓ At least one photo BEFORE the task execution                   │
│  ✓ At least one photo AFTER the task execution                    │
│                                                                     │
│  Exception: Offline mode (skip_photos=true)                        │
│  - Only Admins/Managers can use this option                        │
│  - Photos must be uploaded later                                   │
│  - Task is marked as pending_photos=true                           │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Photo Upload Process

```
1. UPLOAD PHOTO BEFORE
   POST /api/files
   {
     "entity_type": "task",
     "entity_id": "<task_id>",
     "category": "task_photo_before",
     "file": <binary>
   }

2. PERFORM TASK WORK
   (Physical work at the machine)

3. UPLOAD PHOTO AFTER
   POST /api/files
   {
     "entity_type": "task",
     "entity_id": "<task_id>",
     "category": "task_photo_after",
     "file": <binary>
   }

4. COMPLETE TASK
   POST /api/tasks/{id}/complete
   {
     "completion_notes": "Task completed successfully"
   }
```

### Photo Validation Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PHOTO VALIDATION FLOW                            │
└─────────────────────────────────────────────────────────────────────┘

                    Complete Task Request
                            │
                            ▼
                  ┌──────────────────┐
                  │ skip_photos=true?│
                  └────────┬─────────┘
                     YES   │   NO
              ┌────────────┴────────────┐
              ▼                         ▼
    ┌─────────────────┐      ┌─────────────────────┐
    │ Check User Role │      │ Validate Photos     │
    │ (Admin/Manager) │      │ via FilesService    │
    └────────┬────────┘      └──────────┬──────────┘
             │                          │
    ┌────────┴────────┐      ┌──────────┴──────────┐
    │ ALLOWED?        │      │ hasPhotoBefore AND  │
    │                 │      │ hasPhotoAfter?      │
    └────────┬────────┘      └──────────┬──────────┘
        YES  │  NO              YES     │    NO
        │    │                  │       │
        │    ▼                  │       ▼
        │   403 Forbidden       │    400 Bad Request
        │                       │    "Photos required"
        ▼                       ▼
    ┌─────────────────┐   ┌─────────────────┐
    │ Set flags:      │   │ Set flags:      │
    │ pending_photos  │   │ has_photo_before│
    │ = true          │   │ has_photo_after │
    │ offline_completed│   │ = true          │
    │ = true          │   │                 │
    └────────┬────────┘   └────────┬────────┘
             │                     │
             └──────────┬──────────┘
                        ▼
                 Continue with
                 task completion
```

### Offline Mode Photo Upload

For tasks completed in offline mode, photos can be uploaded later:

```
1. Task completed with skip_photos=true
   └── Status: COMPLETED, pending_photos=true

2. Later, upload photos:
   POST /api/files
   {
     "entity_type": "task",
     "entity_id": "<task_id>",
     "category": "task_photo_before"
   }
   POST /api/files
   {
     "entity_type": "task",
     "entity_id": "<task_id>",
     "category": "task_photo_after"
   }

3. Confirm photos uploaded:
   POST /api/tasks/{id}/upload-photos
   └── Validates photos exist
   └── Sets pending_photos=false
```

---

## Offline Mode Support

### Overview

VendHub Manager supports offline task completion for situations where operators work in areas without internet connectivity:

```
┌────────────────────────────────────────────────────────────────────┐
│                    OFFLINE MODE FEATURES                            │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Task Completion Without Photos (skip_photos=true)              │
│     - Only Admins/Managers can authorize                           │
│     - Photos uploaded when connectivity restored                   │
│                                                                     │
│  2. Historical Date Entry (operation_date)                         │
│     - Record actual date when task was performed                   │
│     - Different from completed_at (system timestamp)               │
│                                                                     │
│  3. Pending Photos Tracking                                        │
│     - System tracks tasks awaiting photo upload                    │
│     - Dashboard shows list of pending tasks                        │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Offline Task Completion Request

```typescript
// CompleteTaskDto
{
  "skip_photos": true,              // Skip photo validation
  "operation_date": "2025-12-15T14:30:00Z",  // Actual work date
  "actual_cash_amount": 48750.50,   // For collection tasks
  "completion_notes": "Completed during network outage"
}
```

### Pending Photos Query

```
GET /api/tasks/pending-photos

Returns:
[
  {
    "id": "uuid",
    "type_code": "refill",
    "machine": { "machine_number": "M-001" },
    "assigned_to": { "full_name": "John Doe" },
    "operation_date": "2025-12-15T14:30:00Z",
    "pending_photos": true
  }
]
```

---

## Task-Specific Processing

### REFILL Tasks (Пополнение)

Refill tasks move inventory from operator's personal stock to the machine:

```
┌────────────────────────────────────────────────────────────────────┐
│                    REFILL TASK PROCESSING                          │
└────────────────────────────────────────────────────────────────────┘

1. Task Creation
   ├── TaskItems created with planned_quantity
   └── Inventory RESERVED from operator's stock (24-hour hold)

2. Task Assignment
   └── Reservation transferred to assigned operator

3. Task Completion
   ├── Actual quantities recorded (or use planned if not specified)
   ├── Reservation FULFILLED
   └── Inventory TRANSFER: Operator → Machine

4. Inventory Update Flow:
   ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
   │  Warehouse   │  →   │   Operator   │  →   │   Machine    │
   │  Inventory   │      │   Inventory  │      │   Inventory  │
   └──────────────┘      └──────────────┘      └──────────────┘
        (-)                   (-)                   (+)
```

#### Refill Completion Code Flow

```typescript
// 1. Update actual quantities
for (const itemDto of completeTaskDto.items) {
  const taskItem = task.items.find((ti) => ti.nomenclature_id === itemDto.nomenclature_id);
  if (taskItem) {
    taskItem.actual_quantity = itemDto.actual_quantity;
  }
}

// 2. Fulfill reservation
await this.inventoryService.fulfillReservation(task.id);

// 3. Transfer inventory: Operator → Machine
for (const taskItem of task.items) {
  const actualQty = taskItem.actual_quantity || taskItem.planned_quantity;

  await this.inventoryService.transferOperatorToMachine({
    operator_id: task.assigned_to_user_id,
    machine_id: task.machine_id,
    nomenclature_id: taskItem.nomenclature_id,
    quantity: Number(actualQty),
    task_id: task.id,
    operation_date: completeTaskDto.operation_date,
  }, userId);
}

// 4. Update machine stats
await this.machinesService.updateStats(task.machine_id, {
  last_refill_date: new Date(),
});
```

---

### COLLECTION Tasks (Инкассация)

Collection tasks record cash removal from machines:

```
┌────────────────────────────────────────────────────────────────────┐
│                    COLLECTION TASK PROCESSING                       │
└────────────────────────────────────────────────────────────────────┘

1. Task Creation
   └── expected_cash_amount set from machine.current_cash_amount

2. Task Completion
   ├── actual_cash_amount REQUIRED
   ├── Financial transaction created (type: COLLECTION)
   ├── Discrepancy check (>10% triggers incident)
   └── Machine cash reset to 0

3. Cash Flow:
   ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
   │   Machine    │  →   │   Operator   │  →   │    Office    │
   │   Cash Box   │      │   (collects) │      │   (records)  │
   └──────────────┘      └──────────────┘      └──────────────┘
        (→0)                  (+)                   (+)
```

#### Collection with Discrepancy Detection

```typescript
async processCollectionTask(task: Task, userId: string, completeTaskDto: CompleteTaskDto) {
  // 1. Validate amount provided
  if (completeTaskDto.actual_cash_amount === undefined) {
    throw new BadRequestException('actual_cash_amount is required for collection tasks');
  }

  const actualCashAmount = Number(completeTaskDto.actual_cash_amount);
  task.actual_cash_amount = actualCashAmount;

  // 2. Get expected amount from machine
  const expectedCashAmount = Number(task.machine.current_cash_amount);

  // 3. Create financial transaction
  await this.transactionsService.recordCollection({
    amount: actualCashAmount,
    machine_id: task.machine_id,
    user_id: userId,
    collection_task_id: task.id,
    description: `Collection from ${machine.machine_number}. Expected: ${expectedCashAmount}, Collected: ${actualCashAmount}`,
  });

  // 4. Check for discrepancy (>10% triggers incident)
  const discrepancy = Math.abs(expectedCashAmount - actualCashAmount);
  const discrepancyPercent = expectedCashAmount > 0
    ? (discrepancy / expectedCashAmount) * 100
    : 0;

  if (discrepancyPercent > 10) {
    await this.createCashDiscrepancyIncident(
      task, userId, expectedCashAmount, actualCashAmount, discrepancy, discrepancyPercent
    );
  }

  // 5. Reset machine cash to 0
  await this.machinesService.updateStats(task.machine_id, {
    current_cash_amount: 0,
    last_collection_date: new Date(),
  });
}
```

#### Discrepancy Incident Creation

```typescript
if (discrepancyPercent > 10) {
  await this.incidentsService.create({
    incident_type: IncidentType.CASH_DISCREPANCY,
    priority: discrepancyPercent > 20 ? IncidentPriority.HIGH : IncidentPriority.MEDIUM,
    machine_id: task.machine_id,
    title: `Cash discrepancy: ${discrepancyPercent.toFixed(1)}%`,
    description: `
      Expected: ${expectedCashAmount.toFixed(2)}
      Actual: ${actualCashAmount.toFixed(2)}
      Difference: ${discrepancy.toFixed(2)}
    `,
    reported_by_user_id: userId,
    metadata: {
      task_id: task.id,
      expected_amount: expectedCashAmount,
      actual_amount: actualCashAmount,
      discrepancy_percent: discrepancyPercent,
    },
  });
}
```

---

### CLEANING Tasks (Мойка)

Cleaning tasks update washing schedules and component maintenance records:

```
┌────────────────────────────────────────────────────────────────────┐
│                    CLEANING TASK PROCESSING                         │
└────────────────────────────────────────────────────────────────────┘

1. Task Creation
   └── metadata.washing_schedule_id links to WashingSchedule

2. Task Completion
   ├── WashingSchedule marked as completed
   ├── Next washing date calculated
   └── Component maintenance log updated

3. Integration:
   ┌──────────────────┐
   │ Cleaning Task    │
   │                  │
   │ metadata:        │
   │ washing_schedule │───────► WashingSchedulesService.completeWashing()
   │ _id              │
   └──────────────────┘
```

#### Cleaning Task Processing

```typescript
async processCleaningTask(task: Task, userId: string, completeTaskDto: CompleteTaskDto) {
  const washingScheduleId = task.metadata?.washing_schedule_id;

  if (washingScheduleId) {
    await this.washingSchedulesService.completeWashing(washingScheduleId, {
      performed_by_user_id: userId,
      task_id: task.id,
      notes: completeTaskDto.completion_notes,
    });
  }
}
```

---

### Component Replacement Tasks

Component replacement tasks (REPLACE_HOPPER, REPLACE_GRINDER, etc.) track component movements:

```
┌────────────────────────────────────────────────────────────────────┐
│                COMPONENT REPLACEMENT PROCESSING                     │
└────────────────────────────────────────────────────────────────────┘

1. Task Creation
   ├── TaskComponents with role='old' (component to remove)
   └── TaskComponents with role='new' (component to install)

2. Task Completion
   ├── OLD component: Movement REMOVE (Machine → Warehouse)
   └── NEW component: Movement INSTALL (Warehouse → Machine)

3. Component Movement:
   ┌──────────────┐                      ┌──────────────┐
   │   Machine    │                      │  Warehouse   │
   │              │ ◄──── INSTALL ────── │              │
   │  (installed) │                      │  (storage)   │
   │              │ ───── REMOVE ──────► │              │
   └──────────────┘                      └──────────────┘
```

#### Component Roles

```typescript
export enum ComponentRole {
  OLD = 'old',      // Component being removed
  NEW = 'new',      // Component being installed
  TARGET = 'target' // Component being serviced (for cleaning/repair)
}
```

#### Component Replacement Processing

```typescript
async processComponentReplacementTask(task: Task, userId: string) {
  if (!task.components || task.components.length === 0) {
    return; // No components specified
  }

  // Separate OLD and NEW components
  const oldComponents = task.components.filter((tc) => tc.role === ComponentRole.OLD);
  const newComponents = task.components.filter((tc) => tc.role === ComponentRole.NEW);

  // Create removal movements for OLD components
  for (const taskComp of oldComponents) {
    await this.componentMovementsService.createMovement({
      componentId: taskComp.component_id,
      toLocationType: ComponentLocationType.WAREHOUSE,
      movementType: MovementType.REMOVE,
      relatedMachineId: task.machine_id,
      taskId: task.id,
      performedByUserId: userId,
      comment: `Removed during replacement (task ${task.id})`,
    });
  }

  // Create installation movements for NEW components
  for (const taskComp of newComponents) {
    await this.componentMovementsService.createMovement({
      componentId: taskComp.component_id,
      toLocationType: ComponentLocationType.MACHINE,
      toLocationRef: task.machine_id,
      movementType: MovementType.INSTALL,
      relatedMachineId: task.machine_id,
      taskId: task.id,
      performedByUserId: userId,
      comment: `Installed during replacement (task ${task.id})`,
    });
  }
}
```

---

### INSPECTION Tasks (Осмотр)

Inspection tasks validate machine condition using checklists:

```
┌────────────────────────────────────────────────────────────────────┐
│                    INSPECTION TASK PROCESSING                       │
└────────────────────────────────────────────────────────────────────┘

1. Task Creation
   └── checklist: Array of items to verify

2. Task Execution
   └── Operator marks each checklist item as completed

3. Task Completion
   ├── ALL checklist items must be completed
   └── Audit log created with inspection results

4. Checklist Structure:
   [
     { "item": "Check payment terminal", "completed": true },
     { "item": "Verify product levels", "completed": true },
     { "item": "Test dispensing", "completed": true }
   ]
```

#### Checklist Validation

```typescript
private validateChecklist(task: Task): void {
  if (task.checklist && task.checklist.length > 0) {
    const allCompleted = task.checklist.every((item) => item.completed);
    if (!allCompleted) {
      throw new BadRequestException(
        'Cannot complete task: not all checklist items are completed'
      );
    }
  }
}
```

---

## Task Rejection

### Overview

Task rejection is an **admin-only** operation that allows reversing a completed task with automatic rollback of all changes:

```
┌────────────────────────────────────────────────────────────────────┐
│                    TASK REJECTION SYSTEM                            │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Who can reject: ADMIN, SUPER_ADMIN only                           │
│  What can be rejected: Only COMPLETED tasks                        │
│                                                                     │
│  Rollback actions:                                                 │
│  ├── REFILL: Reverse inventory transfer (Machine → Operator)      │
│  ├── COLLECTION: Create compensating transaction (REFUND)         │
│  │               Restore machine cash amount                       │
│  └── All: Record rejection reason, notify operator                 │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Rejection Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                      TASK REJECTION FLOW                              │
└──────────────────────────────────────────────────────────────────────┘

                    Admin: POST /tasks/{id}/reject
                    { "reason": "Incorrect data reported" }
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │ Validate:                     │
                    │ - User is Admin/SuperAdmin    │
                    │ - Task status is COMPLETED    │
                    │ - Task not already rejected   │
                    └───────────────┬───────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
           Task Type: REFILL            Task Type: COLLECTION
                    │                               │
                    ▼                               ▼
    ┌───────────────────────────┐   ┌───────────────────────────┐
    │ ROLLBACK INVENTORY        │   │ ROLLBACK FINANCES         │
    │                           │   │                           │
    │ For each TaskItem:        │   │ Create REFUND transaction │
    │ transferMachineToOperator │   │ Restore machine cash      │
    │ (reverse the original     │   │ amount                    │
    │  transfer)                │   │                           │
    └───────────────┬───────────┘   └───────────────┬───────────┘
                    │                               │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │ Finalize Rejection:           │
                    │ - Set status = REJECTED       │
                    │ - Record rejected_by_user_id  │
                    │ - Record rejected_at          │
                    │ - Record rejection_reason     │
                    │ - Create comment              │
                    │ - Write audit log             │
                    │ - Notify operator             │
                    │ - Emit 'task.rejected' event  │
                    └───────────────────────────────┘
```

### Rejection API

```
POST /api/tasks/{id}/reject
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "reason": "Data verification failed - incorrect quantities reported"
}

Response: 200 OK
{
  "id": "uuid",
  "status": "rejected",
  "rejected_by_user_id": "admin-uuid",
  "rejected_at": "2025-12-20T10:30:00Z",
  "rejection_reason": "Data verification failed - incorrect quantities reported"
}
```

### Inventory Rollback (Refill Tasks)

```typescript
private async rollbackRefillInventory(task: Task, userId: string, reason: string) {
  for (const taskItem of task.items) {
    const actualQty = taskItem.actual_quantity || taskItem.planned_quantity;

    // Create reverse movement: Machine → Operator
    await this.inventoryService.transferMachineToOperator({
      operator_id: task.assigned_to_user_id,
      machine_id: task.machine_id,
      nomenclature_id: taskItem.nomenclature_id,
      quantity: Number(actualQty),
      notes: `ROLLBACK task ${task.id}: returning ${actualQty} units. Reason: ${reason}`,
    }, userId);
  }
}
```

### Financial Rollback (Collection Tasks)

```typescript
private async rollbackCollectionFinances(task: Task, userId: string, reason: string) {
  const actualCashAmount = Number(task.actual_cash_amount);

  // Create compensating REFUND transaction
  await this.transactionsService.create({
    transaction_type: TransactionType.REFUND,
    machine_id: task.machine_id,
    amount: actualCashAmount,
    description: `ROLLBACK collection task ${task.id}. Amount ${actualCashAmount} restored. Reason: ${reason}`,
    metadata: {
      original_task_id: task.id,
      rejection_reason: reason,
    },
  }, userId);

  // Restore cash amount in machine
  const machine = await this.machinesService.findOne(task.machine_id);
  const restoredCashAmount = Number(machine.current_cash_amount) + actualCashAmount;

  await this.machinesService.updateStats(task.machine_id, {
    current_cash_amount: restoredCashAmount,
  });
}
```

---

## Task Escalation

### Overview

The escalation system automatically monitors overdue tasks and creates incidents for tasks that exceed their due dates:

```
┌────────────────────────────────────────────────────────────────────┐
│                    TASK ESCALATION SYSTEM                          │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Monitoring:                                                       │
│  - Tasks with due_date < NOW                                       │
│  - Active statuses only (PENDING, ASSIGNED, IN_PROGRESS)           │
│                                                                     │
│  Escalation Trigger:                                               │
│  - Task overdue by more than 4 hours                               │
│  - No existing incident for this task                              │
│                                                                     │
│  Escalation Actions:                                               │
│  - Create incident (priority based on overdue duration)            │
│  - Notify task creator (manager)                                   │
│  - Write audit log                                                 │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Escalation Priority Matrix

| Overdue Duration | Incident Priority |
|------------------|-------------------|
| 4-24 hours       | MEDIUM            |
| > 24 hours       | HIGH              |

### Escalation Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                    AUTOMATIC ESCALATION FLOW                          │
└──────────────────────────────────────────────────────────────────────┘

                    Scheduled Job (Cron)
                    or Manual: GET /tasks/overdue
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │ Find Overdue Tasks:           │
                    │ - due_date < NOW - 4 hours    │
                    │ - status IN (PENDING,         │
                    │   ASSIGNED, IN_PROGRESS)      │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │ For Each Overdue Task:        │
                    │ - Check if incident exists    │
                    │ - If not, create incident     │
                    │ - Notify manager              │
                    │ - Log escalation              │
                    └───────────────────────────────┘
```

### Escalation API

```
# Get overdue tasks
GET /api/tasks/overdue

Response: 200 OK
[
  {
    "id": "uuid",
    "type_code": "refill",
    "status": "assigned",
    "due_date": "2025-12-19T10:00:00Z",
    "machine": { "machine_number": "M-001" },
    "assigned_to": { "full_name": "John Doe" }
  }
]

# Get task statistics
GET /api/tasks/stats?machineId=uuid&userId=uuid

Response: 200 OK
{
  "total": 150,
  "by_status": {
    "pending": 10,
    "assigned": 25,
    "in_progress": 5,
    "completed": 100,
    "cancelled": 10
  },
  "by_type": {
    "refill": 80,
    "collection": 40,
    "cleaning": 20,
    "repair": 10
  },
  "overdue": 3
}
```

### Attention-Required Tasks

```typescript
async getAttentionRequiredTasks(userId?: string): Promise<{
  overdue: Task[];      // Past due_date
  due_soon: Task[];     // Due within 24 hours
  pending_photos: Task[]; // Offline-completed, awaiting photos
}> {
  // ... implementation
}
```

---

## Task Comments

### Comment System

Tasks support a comment system for communication between operators and managers:

```typescript
@Entity('task_comments')
class TaskComment extends BaseEntity {
  @Column({ type: 'uuid' })
  task_id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'text' })
  comment: string;

  @Column({ type: 'boolean', default: false })
  is_internal: boolean; // Internal comments visible only to managers/admins
}
```

### Comment API

```
# Add comment
POST /api/tasks/{id}/comments
{
  "comment": "Please check product levels before refilling",
  "isInternal": false
}

# Get comments
GET /api/tasks/{id}/comments?includeInternal=true

Response: 200 OK
[
  {
    "id": "uuid",
    "comment": "Please check product levels before refilling",
    "is_internal": false,
    "user": { "full_name": "Manager Name" },
    "created_at": "2025-12-20T09:00:00Z"
  }
]
```

### Automatic Comments

System automatically creates comments for:
- Task cancellation (with reason)
- Task postponement (with reason and new date)
- Task rejection (with reason)

---

## Task Items

### Overview

TaskItems track individual products/items for refill tasks:

```typescript
@Entity('task_items')
class TaskItem extends BaseEntity {
  @Column({ type: 'uuid' })
  task_id: string;

  @Column({ type: 'uuid' })
  nomenclature_id: string;

  @Column({ type: 'decimal', precision: 10, scale: 3 })
  planned_quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
  actual_quantity: number | null;

  @Column({ type: 'varchar', length: 50 })
  unit_of_measure_code: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
```

### Item Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                        TASK ITEM FLOW                                 │
└──────────────────────────────────────────────────────────────────────┘

1. TASK CREATION
   └── TaskItems created with planned_quantity
       [{nomenclature_id, planned_quantity: 10, unit: "kg"}]

2. INVENTORY RESERVATION
   └── Reserved from operator's inventory for 24 hours

3. TASK COMPLETION
   └── Operator reports actual_quantity (or uses planned if not specified)
       [{nomenclature_id, actual_quantity: 9.5, unit: "kg"}]

4. INVENTORY UPDATE
   └── Transfer actual_quantity from operator to machine
```

---

## Task Components

### Overview

TaskComponents track equipment components for replacement and maintenance tasks:

```typescript
export enum ComponentRole {
  OLD = 'old',      // Component being removed
  NEW = 'new',      // Component being installed
  TARGET = 'target' // Component being serviced
}

@Entity('task_components')
class TaskComponent extends BaseEntity {
  @Column({ type: 'uuid' })
  task_id: string;

  @Column({ type: 'uuid' })
  component_id: string;

  @Column({ type: 'enum', enum: ComponentRole })
  role: ComponentRole;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
```

### Component Assignment Examples

```typescript
// REPLACE_GRINDER task
{
  "type_code": "replace_grinder",
  "machine_id": "machine-uuid",
  "components": [
    {
      "component_id": "old-grinder-uuid",
      "role": "old",
      "notes": "Worn out, needs replacement"
    },
    {
      "component_id": "new-grinder-uuid",
      "role": "new",
      "notes": "New grinder from warehouse"
    }
  ]
}

// CLEANING task with target component
{
  "type_code": "cleaning",
  "machine_id": "machine-uuid",
  "components": [
    {
      "component_id": "brew-unit-uuid",
      "role": "target",
      "notes": "Deep cleaning required"
    }
  ]
}
```

---

## Notifications

### Task-Related Notifications

| Event | Recipient | Channel | Type |
|-------|-----------|---------|------|
| Task Assigned | Operator | IN_APP | TASK_ASSIGNED |
| Task Completed | Task Creator | IN_APP | TASK_COMPLETED |
| Task Rejected | Operator | IN_APP | SYSTEM_ALERT |
| Task Overdue (Escalated) | Task Creator | IN_APP | INCIDENT_CREATED |

### Notification Examples

```typescript
// Task Assignment Notification
await this.notificationsService.create({
  type: NotificationType.TASK_ASSIGNED,
  channel: NotificationChannel.IN_APP,
  recipient_id: userId,
  title: 'New task assigned',
  message: `You have been assigned a ${task.type_code} task for machine ${machine.machine_number}`,
  data: { task_id: task.id, machine_id: task.machine_id },
  action_url: `/tasks/${task.id}`,
});

// Task Completion Notification
await this.notificationsService.create({
  type: NotificationType.TASK_COMPLETED,
  channel: NotificationChannel.IN_APP,
  recipient_id: task.created_by_user_id,
  title: 'Task completed',
  message: `Task ${task.type_code} for machine ${machine.machine_number} has been completed`,
  data: { task_id: task.id, completed_by: userId },
  action_url: `/tasks/${task.id}`,
});
```

---

## API Reference

### Endpoints Overview

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| `POST` | `/tasks` | Create task | ADMIN, MANAGER |
| `GET` | `/tasks` | List tasks with filters | All authenticated |
| `GET` | `/tasks/stats` | Get task statistics | All authenticated |
| `GET` | `/tasks/overdue` | Get overdue tasks | All authenticated |
| `GET` | `/tasks/pending-photos` | Get tasks awaiting photos | All authenticated |
| `GET` | `/tasks/:id` | Get task by ID | All authenticated |
| `PATCH` | `/tasks/:id` | Update task | All authenticated |
| `DELETE` | `/tasks/:id` | Delete task (soft) | ADMIN |
| `POST` | `/tasks/:id/assign` | Assign to operator | ADMIN, MANAGER |
| `POST` | `/tasks/:id/start` | Start task | Assigned operator |
| `POST` | `/tasks/:id/complete` | Complete task | Assigned operator |
| `POST` | `/tasks/:id/cancel` | Cancel task | All authenticated |
| `POST` | `/tasks/:id/reject` | Reject completed task | ADMIN only |
| `POST` | `/tasks/:id/postpone` | Postpone task | All authenticated |
| `GET` | `/tasks/:id/photos` | Get task photos | All authenticated |
| `POST` | `/tasks/:id/upload-photos` | Confirm offline photos uploaded | All authenticated |
| `GET` | `/tasks/:id/comments` | Get task comments | All authenticated |
| `POST` | `/tasks/:id/comments` | Add comment | All authenticated |

### Request/Response Examples

#### Create Task

```
POST /api/tasks
Authorization: Bearer <token>
Content-Type: application/json

{
  "type_code": "refill",
  "priority": "normal",
  "machine_id": "uuid",
  "assigned_to_user_id": "uuid",
  "scheduled_date": "2025-12-21T10:00:00Z",
  "due_date": "2025-12-21T18:00:00Z",
  "description": "Regular refill for Monday",
  "items": [
    {
      "nomenclature_id": "uuid",
      "planned_quantity": 10,
      "unit_of_measure_code": "kg"
    }
  ]
}

Response: 201 Created
{
  "id": "uuid",
  "type_code": "refill",
  "status": "assigned",
  "priority": "normal",
  "machine": { "id": "uuid", "machine_number": "M-001" },
  "assigned_to": { "id": "uuid", "full_name": "John Doe" },
  "items": [
    {
      "nomenclature_id": "uuid",
      "planned_quantity": 10,
      "actual_quantity": null
    }
  ],
  "created_at": "2025-12-20T12:00:00Z"
}
```

#### Complete Task

```
POST /api/tasks/{id}/complete
Authorization: Bearer <operator_token>
Content-Type: application/json

{
  "items": [
    {
      "nomenclature_id": "uuid",
      "actual_quantity": 9.5
    }
  ],
  "actual_cash_amount": null,
  "completion_notes": "Completed successfully",
  "skip_photos": false
}

Response: 200 OK
{
  "id": "uuid",
  "status": "completed",
  "completed_at": "2025-12-20T14:30:00Z",
  "has_photo_before": true,
  "has_photo_after": true,
  "items": [
    {
      "planned_quantity": 10,
      "actual_quantity": 9.5
    }
  ]
}
```

#### List Tasks with Filters

```
GET /api/tasks?status=in_progress&type=refill&machineId=uuid&dateFrom=2025-12-01&dateTo=2025-12-31

Response: 200 OK
[
  {
    "id": "uuid",
    "type_code": "refill",
    "status": "in_progress",
    "machine": { "machine_number": "M-001" },
    "assigned_to": { "full_name": "John Doe" },
    "scheduled_date": "2025-12-20T10:00:00Z"
  }
]
```

---

## Sequence Diagrams

### Task Creation and Assignment

```
Manager          TasksController    TasksService    InventoryService    NotificationsService
   │                   │                │                   │                    │
   │  POST /tasks      │                │                   │                    │
   │──────────────────►│                │                   │                    │
   │                   │  create()      │                   │                    │
   │                   │───────────────►│                   │                    │
   │                   │                │                   │                    │
   │                   │                │ Check for active  │                    │
   │                   │                │ tasks on machine  │                    │
   │                   │                │                   │                    │
   │                   │                │ createReservation │                    │
   │                   │                │ (for refill)      │                    │
   │                   │                │──────────────────►│                    │
   │                   │                │                   │                    │
   │                   │                │◄──────────────────│                    │
   │                   │                │                   │                    │
   │                   │                │ Send assignment   │                    │
   │                   │                │ notification      │                    │
   │                   │                │─────────────────────────────────────►│
   │                   │                │                   │                    │
   │                   │◄───────────────│                   │                    │
   │◄──────────────────│                │                   │                    │
   │   201 Created     │                │                   │                    │
```

### Task Completion Flow

```
Operator         TasksController   TasksService   TaskCompletionService   FilesService   InventoryService
   │                   │                │                │                    │               │
   │  POST /complete   │                │                │                    │               │
   │──────────────────►│                │                │                    │               │
   │                   │ completeTask() │                │                    │               │
   │                   │───────────────►│                │                    │               │
   │                   │                │ completeTask() │                    │               │
   │                   │                │───────────────►│                    │               │
   │                   │                │                │                    │               │
   │                   │                │                │ validateTaskPhotos │               │
   │                   │                │                │───────────────────►│               │
   │                   │                │                │                    │               │
   │                   │                │                │◄───────────────────│               │
   │                   │                │                │ {before:✓,after:✓} │               │
   │                   │                │                │                    │               │
   │                   │                │                │ validateChecklist  │               │
   │                   │                │                │ (internal)         │               │
   │                   │                │                │                    │               │
   │                   │                │                │ processTaskType    │               │
   │                   │                │                │ (refill/collection)│               │
   │                   │                │                │────────────────────────────────────►│
   │                   │                │                │                    │               │
   │                   │                │                │◄────────────────────────────────────│
   │                   │                │                │                    │               │
   │                   │                │                │ finalizeTask       │               │
   │                   │                │                │ (status=completed) │               │
   │                   │                │                │                    │               │
   │                   │                │◄───────────────│                    │               │
   │                   │◄───────────────│                │                    │               │
   │◄──────────────────│                │                │                    │               │
   │   200 OK          │                │                │                    │               │
```

### Task Rejection Flow

```
Admin          TasksController   TasksService   TaskRejectionService   InventoryService   TransactionsService
  │                   │                │                │                    │                   │
  │  POST /reject     │                │                │                    │                   │
  │──────────────────►│                │                │                    │                   │
  │                   │ rejectTask()   │                │                    │                   │
  │                   │───────────────►│                │                    │                   │
  │                   │                │ rejectTask()   │                    │                   │
  │                   │                │───────────────►│                    │                   │
  │                   │                │                │                    │                   │
  │                   │                │                │ Validate admin role│                   │
  │                   │                │                │ Validate completed │                   │
  │                   │                │                │                    │                   │
  │                   │                │                │ rollbackRefill     │                   │
  │                   │                │                │ Inventory          │                   │
  │                   │                │                │───────────────────►│                   │
  │                   │                │                │                    │                   │
  │                   │                │                │◄───────────────────│                   │
  │                   │                │                │                    │                   │
  │                   │                │                │ rollbackCollection │                   │
  │                   │                │                │ Finances           │                   │
  │                   │                │                │──────────────────────────────────────►│
  │                   │                │                │                    │                   │
  │                   │                │                │◄──────────────────────────────────────│
  │                   │                │                │                    │                   │
  │                   │                │                │ Set status=REJECTED│                   │
  │                   │                │                │ Notify operator    │                   │
  │                   │                │                │                    │                   │
  │                   │                │◄───────────────│                    │                   │
  │                   │◄───────────────│                │                    │                   │
  │◄──────────────────│                │                │                    │                   │
  │   200 OK          │                │                │                    │                   │
```

---

## Error Handling

### Common Error Scenarios

#### Task Creation Errors

| Error | HTTP Status | Message |
|-------|-------------|---------|
| Active task exists on machine | 400 | "Cannot create task: machine already has an active task" |
| Machine not found | 404 | "Machine with ID {id} not found" |
| Invalid task type | 400 | "Invalid task type: {type}" |

#### Task Completion Errors

| Error | HTTP Status | Message |
|-------|-------------|---------|
| Not assigned operator | 403 | "Only assigned operator can complete the task" |
| Wrong status | 400 | "Cannot complete task with status {status}" |
| Missing photos (before) | 400 | "Cannot complete: photo BEFORE required" |
| Missing photos (after) | 400 | "Cannot complete: photo AFTER required" |
| Incomplete checklist | 400 | "Cannot complete: not all checklist items completed" |
| Missing cash amount | 400 | "actual_cash_amount is required for collection tasks" |

#### Task Rejection Errors

| Error | HTTP Status | Message |
|-------|-------------|---------|
| Not admin | 403 | "Only administrators can reject tasks" |
| Not completed | 400 | "Can only reject completed tasks" |
| Already rejected | 400 | "Task was already rejected at {date}" |

### Error Response Format

```json
{
  "statusCode": 400,
  "message": "Cannot complete task: photo BEFORE required. Upload photo with category task_photo_before or use skip_photos=true for offline mode.",
  "error": "Bad Request",
  "timestamp": "2025-12-20T12:00:00.000Z",
  "path": "/api/tasks/uuid/complete"
}
```

---

## Related Documentation

- [Inventory System](./INVENTORY_SYSTEM.md) - 3-level inventory flow
- [Transactions](./TRANSACTIONS.md) - Financial operations
- [Machines](./MACHINES.md) - Machine management
- [API Reference](./API_REFERENCE.md) - Complete API documentation
- [Architecture](./ARCHITECTURE.md) - System architecture

---

**Last Updated**: 2025-12-20
**Version**: 1.0.0
**Maintained By**: VendHub Development Team
