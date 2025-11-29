# 📋 ПОЛНЫЙ ПЛАН РАЗРАБОТКИ FRONTEND (100%)

## ✅ УЖЕ РЕАЛИЗОВАНО (Commit: b462db9)

### 1. Infrastructure ✅
- React Query Provider с настройками кэширования
- Error Boundary для обработки ошибок
- useAuth hook для управления аутентификацией
- Utility functions (formatDate, formatCurrency, getStatusColor)
- UI Components (Button, Badge, LoadingSkeleton)

### 2. Dashboard Layout ✅
- Sidebar с полным меню навигации (15 модулей)
- Header с поиском, уведомлениями и user menu
- Responsive layout
- Toast notifications

### 3. Authentication ✅
- Login page с формой
- Auth API client
- Protected routes logic

---

## 🚧 ОСТАЛОСЬ РЕАЛИЗОВАТЬ (11 модулей)

### ШАГ 4: MAIN DASHBOARD (КРИТИЧНО)
**Файлы:**
- `/app/(dashboard)/dashboard/page.tsx`
- `/lib/dashboard-api.ts`
- `/types/dashboard.ts`
- `/components/dashboard/StatCard.tsx`
- `/components/dashboard/RevenueChart.tsx`

**Функционал:**
- 4 статистические карточки (Revenue, Tasks, Incidents, Machines)
- График Revenue vs Expenses (recharts)
- Список последних задач
- Список активных инцидентов
- Quick actions кнопки

**API Endpoints используемые:**
- GET /dashboard/stats
- GET /tasks?limit=5
- GET /incidents?status=open&limit=5

---

### ШАГ 5: TASKS MODULE (КРИТИЧНО - интеграция с новыми backend фичами!)

**Структура:**
```
/app/(dashboard)/tasks/
  ├── page.tsx              # Список задач (Kanban или List view)
  ├── [id]/page.tsx         # Детали задачи
  ├── [id]/complete/page.tsx # Форма завершения с фото
  └── create/page.tsx       # Создание задачи

/lib/tasks-api.ts           # API клиент
/types/tasks.ts             # TypeScript типы
/components/tasks/
  ├── TaskCard.tsx          # Карточка задачи
  ├── TaskStatusBadge.tsx   # Badge статуса
  ├── TaskPriorityBadge.tsx # Badge приоритета
  ├── PhotoUpload.tsx       # Компонент загрузки фото
  └── CompletionForm.tsx    # Форма завершения
```

**КРИТИЧНО - Новые фичи backend:**

**1. Collection Task Completion (Инкассация):**
```typescript
// При завершении инкассации нужно показать:
interface CollectionCompletion {
  expected_cash_amount: number  // Ожидаемая сумма (из machine.current_cash_amount)
  actual_cash_amount: number    // Фактически собранная (вводит пользователь)
  discrepancy: number           // Разница
  discrepancy_percent: number   // Процент расхождения
  created_incident?: {          // Если расхождение > 10%
    id: string
    title: string
    priority: string
  }
  transaction_created: {        // Всегда создается транзакция
    id: string
    amount: number
  }
}

// Компонент должен:
- Показывать ожидаемую сумму из аппарата
- Позволять ввести фактическую сумму
- Автоматически рассчитывать и показывать разницу
- ПРЕДУПРЕЖДАТЬ если разница > 10% (будет создан инцидент!)
- Показывать success message с линком на созданную транзакцию
- Если создан инцидент - показать warning с линком на инцидент
```

**2. Refill Task (Пополнение) - Transactional Integrity:**
```typescript
// Теперь inventory updates АТОМАРНЫ - либо все, либо ничего
// Если ошибка - показать user-friendly сообщение:
try {
  await tasksApi.complete(taskId, data)
} catch (error) {
  if (error.message.includes('insufficient stock')) {
    toast.error('Недостаточно товара у оператора для пополнения')
  } else {
    toast.error('Ошибка при обновлении инвентаря')
  }
}
```

**3. Task Creation - Conflict Prevention:**
```typescript
// Теперь нельзя создать задачу если есть активная на том же аппарате
// Backend вернет ошибку - нужно показать:
if (error.response?.status === 400 && error.response?.data?.message.includes('активная задача')) {
  toast.error(`На этом аппарате уже есть активная задача.
               Завершите или отмените её перед созданием новой.`)
}
```

**4. Escalation - Overdue Tasks UI:**
```typescript
// Добавить визуальный индикатор для просроченных задач
const isOverdue = task.due_date && new Date(task.due_date) < new Date()
const overdueHours = isOverdue
  ? Math.floor((Date.now() - new Date(task.due_date).getTime()) / (1000 * 60 * 60))
  : 0

// Показать badge:
{isOverdue && overdueHours > 4 && (
  <Badge variant="danger">
    Просрочена {overdueHours} ч. (инцидент создан)
  </Badge>
)}
```

**API Endpoints:**
- GET /tasks - список
- GET /tasks/:id - детали
- POST /tasks - создание
- POST /tasks/:id/start - начать
- POST /tasks/:id/complete - завершить (НОВАЯ ЛОГИКА!)
- POST /tasks/:id/cancel - отменить
- GET /tasks/overdue - просроченные
- POST /tasks/escalate - эскалация (для admin)

---

### ШАГ 6: MACHINES MODULE (КРИТИЧНО)

**Структура:**
```
/app/(dashboard)/machines/
  ├── page.tsx              # Grid/List view всех аппаратов
  ├── [id]/page.tsx         # Детали аппарата
  ├── [id]/tasks/page.tsx   # История задач
  └── create/page.tsx       # Создание аппарата

/lib/machines-api.ts
/types/machines.ts
/components/machines/
  ├── MachineCard.tsx       # Карточка аппарата
  ├── MachineStatusBadge.tsx# Status badge
  ├── StockLevel.tsx        # Уровень запасов
  └── CashIndicator.tsx     # Индикатор наличных
```

**Функционал:**
- Grid view с карточками аппаратов
- Фильтры (status, location, low_stock)
- Real-time статусы (active, offline, error, maintenance)
- Отображение current_cash_amount (для инкассации)
- Отображение last_collection_date
- Список товаров в аппарате
- Кнопка "Создать задачу" для аппарата

**API Endpoints:**
- GET /machines
- GET /machines/:id
- GET /machines/:id/tasks
- GET /machines/:id/inventory
- GET /machines/:id/stats

---

### ШАГ 7: INCIDENTS MODULE (КРИТИЧНО - новый тип!)

**Структура:**
```
/app/(dashboard)/incidents/
  ├── page.tsx              # Список инцидентов
  ├── [id]/page.tsx         # Детали инцидента
  └── create/page.tsx       # Создание инцидента

/lib/incidents-api.ts
/types/incidents.ts         # + CASH_DISCREPANCY type!
/components/incidents/
  ├── IncidentCard.tsx
  ├── IncidentTypeBadge.tsx # + новый тип!
  └── IncidentPriorityBadge.tsx
```

**ВАЖНО - Новый тип инцидента:**
```typescript
export enum IncidentType {
  TECHNICAL_FAILURE = 'technical_failure',
  OUT_OF_STOCK = 'out_of_stock',
  CASH_FULL = 'cash_full',
  CASH_DISCREPANCY = 'cash_discrepancy',  // НОВЫЙ ТИП!
  VANDALISM = 'vandalism',
  POWER_OUTAGE = 'power_outage',
  OTHER = 'other',
}

// Для CASH_DISCREPANCY инцидента показывать специальный UI:
{incident.incident_type === 'cash_discrepancy' && (
  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
    <h4 className="font-semibold text-orange-900">Расхождение в инкассации</h4>
    <dl className="mt-2 space-y-1">
      <div className="flex justify-between">
        <dt className="text-sm text-gray-600">Ожидалось:</dt>
        <dd className="text-sm font-medium">{formatCurrency(incident.metadata.expected_amount)}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-sm text-gray-600">Собрано:</dt>
        <dd className="text-sm font-medium">{formatCurrency(incident.metadata.actual_amount)}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-sm text-gray-600">Разница:</dt>
        <dd className="text-sm font-medium text-orange-700">
          {incident.metadata.discrepancy_percent.toFixed(1)}%
        </dd>
      </div>
    </dl>
    <Link href={`/dashboard/tasks/${incident.metadata.task_id}`}>
      <Button variant="secondary" size="sm" className="mt-3">
        Посмотреть задачу инкассации
      </Button>
    </Link>
  </div>
)}
```

**API Endpoints:**
- GET /incidents
- GET /incidents/:id
- POST /incidents
- PATCH /incidents/:id (update status, assign)

---

### ШАГ 8: TRANSACTIONS MODULE (КРИТИЧНО)

**Структура:**
```
/app/(dashboard)/transactions/
  ├── page.tsx              # Список транзакций
  ├── reports/page.tsx      # Финансовые отчеты
  └── [id]/page.tsx         # Детали транзакции

/lib/transactions-api.ts
/types/transactions.ts
/components/transactions/
  ├── TransactionsList.tsx
  ├── TransactionTypeBadge.tsx
  ├── RevenueChart.tsx      # recharts
  └── FinancialSummary.tsx
```

**Функционал:**
- Список всех транзакций (sales, collection, expense)
- Фильтры (type, date range, machine, user)
- Финансовая сводка (revenue, expenses, profit)
- График Revenue vs Expenses
- Export в Excel/PDF
- **СВЯЗЬ с задачами инкассации** (collection_task_id)

**Специальный UI для Collection:**
```typescript
{transaction.transaction_type === 'collection' && (
  <div className="bg-blue-50 p-3 rounded">
    <p className="text-sm text-blue-900">
      Инкассация аппарата {transaction.machine.machine_number}
    </p>
    {transaction.collection_task_id && (
      <Link href={`/dashboard/tasks/${transaction.collection_task_id}`}>
        <span className="text-xs text-blue-600 hover:underline">
          Посмотреть задачу →
        </span>
      </Link>
    )}
  </div>
)}
```

**API Endpoints:**
- GET /transactions
- GET /transactions/:id
- GET /transactions/stats
- GET /transactions/daily-revenue
- GET /transactions/machine/:id

---

### ШАГ 9: INVENTORY MODULE (ВЫСОКИЙ)

**Структура:**
```
/app/(dashboard)/inventory/
  ├── page.tsx              # 3-level view (tabs)
  ├── warehouse/page.tsx    # Склад
  ├── operators/page.tsx    # У операторов
  ├── machines/page.tsx     # В аппаратах
  └── movements/page.tsx    # История движений

/lib/inventory-api.ts
/types/inventory.ts
/components/inventory/
  ├── InventoryLevel.tsx    # Компонент уровня
  ├── TransferModal.tsx     # Форма перемещения
  ├── LowStockAlert.tsx     # Алерт низкого запаса
  └── BatchInfo.tsx         # Информация о партии
```

**Функционал:**
- 3-level tabs (Warehouse → Operator → Machine)
- Перемещение товаров между уровнями
- FEFO (First Expired First Out) индикаторы
- Low stock alerts
- Batch/lot tracking с сроками годности
- Stock reservations
- История всех движений

**API Endpoints:**
- GET /inventory/warehouse
- GET /inventory/operators
- GET /inventory/machines
- POST /inventory/transfer-warehouse-to-operator
- POST /inventory/transfer-operator-to-machine
- GET /inventory/movements
- GET /inventory/low-stock

---

### ШАГ 10: USERS MODULE (ВЫСОКИЙ)

**Структура:**
```
/app/(dashboard)/users/
  ├── page.tsx              # Список пользователей
  ├── [id]/page.tsx         # Детали и редактирование
  └── create/page.tsx       # Создание пользователя

/lib/users-api.ts
/types/users.ts
/components/users/
  ├── UserCard.tsx
  ├── RoleBadge.tsx
  └── UserForm.tsx
```

**Функционал:**
- Список всех пользователей
- Фильтры (role, status)
- Создание/редактирование
- Управление ролями (operator, manager, admin)
- Активация/деактивация

**API Endpoints:**
- GET /users
- GET /users/:id
- POST /users
- PATCH /users/:id
- DELETE /users/:id

---

### ШАГ 11: LOCATIONS MODULE (СРЕДНИЙ)

**Структура:**
```
/app/(dashboard)/locations/
  ├── page.tsx              # Список локаций
  ├── [id]/page.tsx         # Детали локации
  └── create/page.tsx       # Создание локации

/lib/locations-api.ts
/types/locations.ts
/components/locations/
  ├── LocationCard.tsx
  └── LocationForm.tsx
```

**Функционал:**
- Список точек размещения
- Аппараты на каждой точке
- Статистика по точке
- Карта (опционально)

**API Endpoints:**
- GET /locations
- GET /locations/:id
- GET /locations/:id/machines
- POST /locations
- PATCH /locations/:id

---

### ШАГ 12: SECURITY & AUDIT MODULE (СРЕДНИЙ)

**Структура:**
```
/app/(dashboard)/security/
  ├── page.tsx              # Overview
  ├── audit-logs/page.tsx   # Audit logs
  ├── sessions/page.tsx     # Active sessions
  ├── 2fa/page.tsx          # 2FA setup
  └── events/page.tsx       # Security events

/lib/security-api.ts
/types/security.ts
/components/security/
  ├── AuditLogTable.tsx
  ├── SessionCard.tsx
  └── TwoFactorSetup.tsx
```

**Функционал:**
- Просмотр audit logs (все действия пользователей)
- Фильтры (user, action, entity_type, date)
- Sensitive actions отдельно
- Активные сессии пользователей
- 2FA настройка (TOTP)
- Security events и investigations

**API Endpoints:**
- GET /security/audit-logs
- GET /security/audit-logs/sensitive
- GET /security/sessions
- POST /security/2fa/enable
- GET /security/events

---

### ШАГ 13: NOTIFICATIONS CENTER (ВЫСОКИЙ)

**Структура:**
```
/app/(dashboard)/notifications/
  └── page.tsx              # Список уведомлений

/lib/notifications-api.ts
/types/notifications.ts
/components/notifications/
  ├── NotificationBell.tsx  # Для Header (с badge)
  ├── NotificationCard.tsx
  └── NotificationSettings.tsx
```

**Функционал:**
- Notification bell в Header (с unread count)
- Dropdown с последними уведомлениями
- Страница всех уведомлений
- Mark as read/unread
- Notification settings
- Web Push subscriptions

**API Endpoints:**
- GET /notifications
- GET /notifications/unread-count
- PATCH /notifications/:id/read
- POST /notifications/settings
- POST /web-push/subscribe

---

### ШАГ 14: REPORTS MODULE (СРЕДНИЙ)

**Структура:**
```
/app/(dashboard)/reports/
  ├── page.tsx              # Overview отчетов
  ├── financial/page.tsx    # Финансовые отчеты
  ├── operational/page.tsx  # Операционные отчеты
  └── machines/page.tsx     # Отчеты по аппаратам

/lib/reports-api.ts
/types/reports.ts
/components/reports/
  ├── ReportCard.tsx
  ├── DateRangePicker.tsx
  └── ExportButton.tsx
```

**Функционал:**
- Финансовые отчеты (revenue, expenses, profit)
- Операционные отчеты (tasks completion, response time)
- Отчеты по аппаратам (sales, uptime, incidents)
- Date range filters
- Export в PDF/Excel
- Графики (recharts)

**API Endpoints:**
- GET /reports/financial
- GET /reports/operational
- GET /reports/machines/:id
- GET /transactions/daily-revenue (для графиков)

---

## 📊 ПРОГРЕСС

**Реализовано:**
- ✅ Infrastructure (3/3)
- ✅ Dashboard Layout (2/2)
- ✅ Authentication (2/2)
- ✅ Equipment Module (7/7) - было ранее
- ✅ Telegram Module (3/3) - было ранее

**ИТОГО: 17/62 страниц (27%)**

**Осталось реализовать:**
- ⏳ Main Dashboard (1 страница)
- ⏳ Tasks (4 страницы) - КРИТИЧНО!
- ⏳ Machines (4 страницы) - КРИТИЧНО!
- ⏳ Incidents (3 страницы) - КРИТИЧНО!
- ⏳ Transactions (3 страницы) - КРИТИЧНО!
- ⏳ Inventory (5 страниц)
- ⏳ Users (3 страницы)
- ⏳ Locations (3 страницы)
- ⏳ Security (5 страниц)
- ⏳ Notifications (1 страница)
- ⏳ Reports (4 страниц)
- ⏳ Complaints (2 страницы) - backend есть
- ⏳ Settings (1 страница)

**ИТОГО ОСТАЛОСЬ: 39 страниц**

---

## 🚀 ПОРЯДОК РЕАЛИЗАЦИИ

**Фаза 1 - КРИТИЧНО (следующая):**
1. Main Dashboard
2. Tasks Module (с интеграцией новых фич!)
3. Machines Module
4. Incidents Module (с CASH_DISCREPANCY)
5. Transactions Module

**Фаза 2 - ВЫСОКИЙ:**
6. Inventory Module
7. Users Module
8. Notifications Center

**Фаза 3 - СРЕДНИЙ:**
9. Locations Module
10. Security & Audit Module
11. Reports Module
12. Settings

**Фаза 4 - НИЗКИЙ:**
13. Complaints Module

---

## 💡 ОБЩИЕ РЕКОМЕНДАЦИИ

**1. Для всех списков использовать:**
```typescript
// React Query для data fetching
const { data, isLoading, error } = useQuery({
  queryKey: ['tasks', filters],
  queryFn: () => tasksApi.getAll(filters),
})

// Loading state
if (isLoading) return <TableSkeleton rows={5} />

// Error state
if (error) return <ErrorMessage error={error} />

// Success state
return <TasksList tasks={data} />
```

**2. Для форм использовать:**
```typescript
// React Hook Form + Zod
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  // validation rules
})

const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(schema)
})
```

**3. Для mutations использовать:**
```typescript
// React Query mutations
const mutation = useMutation({
  mutationFn: tasksApi.create,
  onSuccess: () => {
    queryClient.invalidateQueries(['tasks'])
    toast.success('Задача создана!')
  },
  onError: (error) => {
    toast.error(error.message)
  }
})
```

**4. Для real-time updates:**
```typescript
// Polling для критичных данных
const { data } = useQuery({
  queryKey: ['machines', 'active'],
  queryFn: machinesApi.getAll,
  refetchInterval: 30000, // 30 seconds
})
```

---

## 🎯 ИТОГОВАЯ ЦЕЛЬ: 100% FRONTEND

После завершения всех модулей у нас будет:
- ✅ 62 страницы
- ✅ 11 полноценных модулей
- ✅ Полная интеграция с backend API
- ✅ Real-time обновления
- ✅ Красивый, современный UI
- ✅ Responsive design
- ✅ Error handling
- ✅ Loading states
- ✅ Type safety (TypeScript)
- ✅ Optimistic updates
- ✅ Data caching (React Query)

**FRONTEND ГОТОВ К PRODUCTION! 🚀**
