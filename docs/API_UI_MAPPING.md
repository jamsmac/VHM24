# VHM24 API → UI Mapping

> Маппинг backend endpoints на UI элементы
> Версия: 2.0 | Дата: 2026-01-26

## API Coverage Matrix

| Модуль Backend | Контроллеры | Endpoints | Web UI | Mobile | Telegram | Coverage |
|----------------|-------------|-----------|--------|--------|----------|----------|
| auth | 1 | 19 | ✅ | ✅ | ✅ | 100% |
| users | 1 | 13 | ✅ | ❌ | ❌ | 33% |
| machines | 1 | 20 | ✅ | ❌ | ❌ | 33% |
| tasks | 1 | 18 | ✅ | ✅ | ❌ | 67% |
| inventory | 6 | 53 | ✅ | ❌ | ❌ | 33% |
| transactions | 1 | 11 | ✅ | ❌ | ❌ | 33% |
| equipment | 5 | 36 | ✅ | ✅ | ❌ | 67% |
| reports | 1 | 25 | ✅ | ❌ | ❌ | 33% |
| locations | 1 | 7 | ✅ | ✅ | ❌ | 67% |
| incidents | 1 | 9 | ✅ | ❌ | ❌ | 33% |
| complaints | 1 | 9 | ✅ | ❌ | ❌ | 33% |
| alerts | 1 | 15 | ✅ | ❌ | ❌ | 33% |
| counterparty | 2 | 12 | ✅ | ❌ | ❌ | 33% |
| contracts | 1 | 15 | ✅ | ❌ | ❌ | 33% |
| commissions | 1 | 18 | ✅ | ❌ | ❌ | 33% |
| promo-codes | 1 | 8 | ✅ | ❌ | ❌ | 33% |
| notifications | 1 | 12 | ✅ | ✅ | ✅ | 100% |
| telegram | 3 | 15 | ✅ | ❌ | ✅ | 67% |
| security | 4 | 12 | ✅ | ❌ | ❌ | 33% |
| hr | 4 | 10 | ❌ | ❌ | ❌ | 0% |
| client | 5 | 20 | ✅ | ✅ | ✅ | 100% |
| ai-assistant | 1 | 8 | ✅ | ❌ | ❌ | 33% |
| integration | 4 | 12 | ✅ | ❌ | ❌ | 33% |
| warehouse | 4 | 8 | ✅ | ❌ | ❌ | 33% |
| **ИТОГО** | **84** | **220+** | **91%** | **38%** | **19%** | **~50%** |

---

## Модуль: AUTH

**Backend контроллер:** `auth.controller.ts` (24 KB)
**Frontend API:** `auth-api.ts`, `profile-api.ts`, `two-factor-api.ts`

### Endpoints → UI

| Endpoint | Method | Web Page | Mobile | Component |
|----------|--------|----------|--------|-----------|
| /auth/login | POST | /login | LoginScreen | LoginForm |
| /auth/register | POST | — | — | — |
| /auth/refresh | POST | (автоматически) | (автоматически) | — |
| /auth/logout | POST | Header menu | ProfileScreen | LogoutButton |
| /auth/profile | GET | /dashboard/profile | ProfileScreen | ProfileCard |
| /auth/password-reset/request | POST | /login | — | ForgotPasswordForm |
| /auth/password-reset/validate | POST | /change-password | — | — |
| /auth/password-reset/confirm | POST | /change-password | — | ChangePasswordForm |
| /auth/first-login-change-password | POST | /change-password | — | ChangePasswordForm |
| /auth/2fa/setup | POST | /dashboard/security/two-factor | — | TwoFactorSetup |
| /auth/2fa/enable | POST | /dashboard/security/two-factor | — | TwoFactorSetup |
| /auth/2fa/disable | POST | /dashboard/security/two-factor | — | TwoFactorSetup |
| /auth/2fa/verify | POST | /login | — | TwoFactorInput |
| /auth/2fa/login | POST | /login | LoginScreen | TwoFactorInput |
| /auth/2fa/login/backup | POST | /login | — | BackupCodeInput |
| /auth/sessions | GET | /dashboard/profile | — | SessionsList |
| /auth/sessions/all | GET | /dashboard/security/sessions | — | AllSessionsList |
| /auth/sessions/:id/revoke | POST | /dashboard/profile | — | RevokeButton |
| /auth/sessions/revoke-others | POST | /dashboard/profile | — | RevokeOthersButton |

---

## Модуль: USERS

**Backend контроллер:** `users.controller.ts` (12 KB)
**Frontend API:** `users-api.ts`

### Endpoints → UI

| Endpoint | Method | Web Page | Mobile | Component |
|----------|--------|----------|--------|-----------|
| /users | POST | /dashboard/users/create | — | UserCreateForm |
| /users | GET | /dashboard/users | — | UsersTable |
| /users/:id | GET | /dashboard/users/[id] | — | UserDetail |
| /users/:id | PATCH | /dashboard/users/[id] | — | UserEditForm |
| /users/:id | DELETE | /dashboard/users | — | DeleteDialog |
| /users/pending/approvals | GET | /dashboard/access-requests | — | PendingUsers |
| /users/:id/approve | POST | /dashboard/access-requests | — | ApproveButton |
| /users/:id/reject | POST | /dashboard/access-requests | — | RejectButton |
| /users/:id/ip-whitelist | PATCH | /dashboard/users/[id] | — | IpWhitelist |
| /users/:id/block | PATCH | /dashboard/users/[id] | — | BlockButton |
| /users/:id/unblock | PATCH | /dashboard/users/[id] | — | UnblockButton |
| /users/:id/deactivate | PATCH | /dashboard/users/[id] | — | DeactivateButton |
| /users/:id/activate | PATCH | /dashboard/users/[id] | — | ActivateButton |

---

## Модуль: MACHINES

**Backend контроллер:** `machines.controller.ts` (19 KB)
**Frontend API:** `machines-api.ts`

### Endpoints → UI

| Endpoint | Method | Web Page | Mobile | Component |
|----------|--------|----------|--------|-----------|
| /machines | POST | /dashboard/machines/create | — | MachineCreateForm |
| /machines | GET | /dashboard/machines | — | MachinesTable |
| /machines/stats | GET | /dashboard | — | MachineStats |
| /machines/by-number/:number | GET | — | — | — |
| /machines/by-qr/:qr | GET | /dashboard/scan | QrScanScreen | QrScanner |
| /machines/by-location/:id | GET | /dashboard/locations/[id] | — | LocationMachines |
| /machines/:id | GET | /dashboard/machines/[id] | — | MachineDetail |
| /machines/:id | PATCH | /dashboard/machines/[id] | — | MachineEditForm |
| /machines/:id/status | PATCH | /dashboard/machines/[id] | — | StatusSelect |
| /machines/:id | DELETE | /dashboard/machines | — | DeleteDialog |
| /machines/:id/writeoff | POST | /dashboard/machines/[id] | — | WriteoffButton |
| /machines/writeoff/bulk | POST | /dashboard/machines | — | BulkWriteoff |
| /machines/writeoff/job/:id | GET | /dashboard/machines | — | JobProgress |
| /machines/writeoff/job/:id | DELETE | /dashboard/machines | — | CancelJob |
| /machines/writeoff/jobs | GET | /dashboard/machines | — | JobsList |
| /machines/:id/location-history | GET | /dashboard/machines/[id] | — | LocationHistory |
| /machines/connectivity/status | GET | /dashboard/monitoring | — | ConnectivityStatus |
| /machines/:id/qr-code | GET | /dashboard/machines/[id] | — | QrCodeDisplay |
| /machines/:id/qr-code/download | GET | /dashboard/machines/[id] | — | DownloadQrButton |
| /machines/:id/qr-code/regenerate | POST | /dashboard/machines/[id] | — | RegenerateQrButton |

---

## Модуль: TASKS

**Backend контроллер:** `tasks.controller.ts` (16 KB)
**Frontend API:** `tasks-api.ts`

### Endpoints → UI

| Endpoint | Method | Web Page | Mobile | Component |
|----------|--------|----------|--------|-----------|
| /tasks | POST | /dashboard/tasks/create | — | TaskCreateForm |
| /tasks | GET | /dashboard/tasks | TaskListScreen | TasksTable / TaskList |
| /tasks/stats | GET | /dashboard | — | TaskStats |
| /tasks/overdue | GET | /dashboard/tasks | TaskListScreen | OverdueTasks |
| /tasks/:id | GET | /dashboard/tasks/[id] | TaskDetailScreen | TaskDetail |
| /tasks/:id | PATCH | /dashboard/tasks/[id] | — | TaskEditForm |
| /tasks/:id/assign | POST | /dashboard/tasks/[id] | — | AssignSelect |
| /tasks/:id/start | POST | /dashboard/tasks/[id] | TaskDetailScreen | StartButton |
| /tasks/:id/complete | POST | /dashboard/tasks/[id]/complete | TaskDetailScreen | CompleteForm |
| /tasks/:id/photos | GET | /dashboard/tasks/[id] | TaskDetailScreen | PhotoGallery |
| /tasks/:id/upload-photos | POST | /dashboard/tasks/[id] | TaskCameraScreen | PhotoUpload |
| /tasks/pending-photos | GET | /dashboard/tasks | — | PendingPhotos |
| /tasks/:id/cancel | POST | /dashboard/tasks/[id] | TaskDetailScreen | CancelButton |
| /tasks/:id/reject | POST | /dashboard/tasks/[id] | — | RejectButton |
| /tasks/:id/postpone | POST | /dashboard/tasks/[id] | TaskDetailScreen | PostponeDialog |
| /tasks/:id/comments | POST | /dashboard/tasks/[id] | TaskDetailScreen | CommentForm |
| /tasks/:id/comments | GET | /dashboard/tasks/[id] | TaskDetailScreen | CommentsList |
| /tasks/:id | DELETE | /dashboard/tasks | — | DeleteDialog |

---

## Модуль: INVENTORY (6 контроллеров)

**Backend контроллеры:**
- `inventory.controller.ts` (17 KB)
- `inventory-adjustments.controller.ts` (4.6 KB)
- `inventory-counts.controller.ts` (4.8 KB)
- `inventory-differences.controller.ts` (7.4 KB)
- `inventory-thresholds.controller.ts` (11 KB)
- `inventory-report-presets.controller.ts` (3.8 KB)

**Frontend API:** `inventory-api.ts`

### Endpoints → UI (основные)

| Endpoint | Method | Web Page | Component |
|----------|--------|----------|-----------|
| /inventory/warehouse | GET | /dashboard/inventory/warehouse | WarehouseTable |
| /inventory/warehouse/low-stock | GET | /dashboard/inventory/warehouse | LowStockAlert |
| /inventory/warehouse/add | POST | /dashboard/inventory/warehouse | AddStockForm |
| /inventory/warehouse/remove | POST | /dashboard/inventory/warehouse | RemoveStockForm |
| /inventory/operator/:id | GET | /dashboard/inventory/operators | OperatorInventory |
| /inventory/machine/:id | GET | /dashboard/inventory/machines | MachineInventory |
| /inventory/machines/low-stock | GET | /dashboard/inventory/machines | LowStockMachines |
| /inventory/transfer/warehouse-to-operator | POST | /dashboard/inventory/transfer/warehouse-operator | TransferForm |
| /inventory/transfer/operator-to-machine | POST | /dashboard/inventory/transfer/operator-machine | TransferForm |
| /inventory/movements | GET | /dashboard/inventory/* | MovementsTable |
| /inventory-counts | POST | /dashboard/inventory/count | CountForm |
| /inventory-counts | GET | /dashboard/inventory/count | CountsList |
| /inventory-differences | GET | /dashboard/reports/inventory-differences | DifferencesTable |
| /inventory-differences/dashboard | GET | /dashboard/reports/inventory-dashboard | DiffDashboard |
| /inventory/thresholds | GET/POST | /dashboard/settings | ThresholdsTable |

---

## Модуль: TRANSACTIONS

**Backend контроллер:** `transactions.controller.ts` (7.7 KB)
**Frontend API:** `transactions-api.ts`

### Endpoints → UI

| Endpoint | Method | Web Page | Component |
|----------|--------|----------|-----------|
| /transactions | POST | — | — |
| /transactions/sale | POST | — | (автоматически) |
| /transactions/collection | POST | — | — |
| /transactions/expense | POST | — | — |
| /transactions | GET | /dashboard/transactions | TransactionsTable |
| /transactions/stats | GET | /dashboard | TransactionStats |
| /transactions/daily-revenue | GET | /dashboard | RevenueChart |
| /transactions/top-recipes | GET | /dashboard | TopRecipesChart |
| /transactions/machine/:id/stats | GET | /dashboard/machines/[id] | MachineStats |
| /transactions/:id | GET | /dashboard/transactions/[id] | TransactionDetail |
| /transactions/:id | DELETE | /dashboard/transactions | DeleteDialog |

---

## Модуль: EQUIPMENT (5 контроллеров)

**Backend контроллеры:**
- `components.controller.ts` (12 KB)
- `hopper-types.controller.ts` (5.1 KB)
- `maintenance.controller.ts` (4.9 KB)
- `spare-parts.controller.ts` (4.8 KB)
- `washing-schedules.controller.ts` (5.7 KB)

**Frontend API:** `equipment-api.ts`

### Endpoints → UI (основные)

| Endpoint | Method | Web Page | Mobile | Component |
|----------|--------|----------|--------|-----------|
| /equipment/components | GET | /dashboard/equipment/components | — | ComponentsTable |
| /equipment/components/:id | GET | /dashboard/equipment/components/[id] | — | ComponentDetail |
| /equipment/components/needs-maintenance | GET | /dashboard/equipment/maintenance | — | MaintenanceNeeded |
| /equipment/components/nearing-lifetime | GET | /dashboard/equipment | — | NearingLifetime |
| /equipment/components/:id/install | POST | /dashboard/equipment/components/[id] | — | InstallForm |
| /equipment/components/:id/remove | POST | /dashboard/equipment/components/[id] | — | RemoveButton |
| /equipment/hopper-types | GET | /dashboard/equipment/hopper-types | — | HopperTypesTable |
| /equipment/maintenance | GET | /dashboard/equipment/maintenance | — | MaintenanceTable |
| /equipment/spare-parts | GET | /dashboard/equipment/spare-parts | — | SparePartsTable |
| /equipment/spare-parts/low-stock | GET | /dashboard/equipment/spare-parts | — | LowStockAlert |
| /equipment/washing-schedules | GET | /dashboard/equipment/washing | — | WashingTable |
| /equipment/washing-schedules/overdue | GET | /dashboard/equipment/washing | — | OverdueWashing |
| /equipment/washing-schedules/:id/complete | POST | /dashboard/equipment/washing | — | CompleteButton |

---

## Модуль: REPORTS

**Backend контроллер:** `reports.controller.ts` (28 KB)
**Frontend API:** `reports-api.ts`

### Endpoints → UI

| Endpoint | Method | Web Page | Component |
|----------|--------|----------|-----------|
| /reports/dashboard | GET | /dashboard | DashboardStats |
| /reports/machine/:id | GET | /dashboard/machines/[id] | MachineReport |
| /reports/user/:id | GET | /dashboard/users/[id] | UserReport |
| /reports/dashboard/pdf | GET | /dashboard | ExportPdfButton |
| /reports/network-summary | GET | /dashboard/analytics | NetworkSummary |
| /reports/profit-loss | GET | /dashboard/reports/financial | ProfitLossReport |
| /reports/cash-flow | GET | /dashboard/reports/financial | CashFlowReport |
| /reports/machine-performance/:id | GET | /dashboard/machines/[id] | PerformanceChart |
| /reports/location-performance/:id | GET | /dashboard/locations/[id] | LocationPerformance |
| /reports/product-sales/:id | GET | /dashboard/products/[id] | ProductSalesChart |
| /reports/product-sales | GET | /dashboard/reports/sales | SalesReport |
| /reports/collections-summary | GET | /dashboard/transactions/reports | CollectionsSummary |
| /reports/operator-performance/:id | GET | /dashboard/users/[id] | OperatorPerformance |
| /reports/operator-performance | GET | /dashboard/reports/tasks | OperatorsPerformance |
| /reports/task-execution-stats | GET | /dashboard/reports/tasks | TaskExecutionStats |
| /reports/warehouse-inventory/:id | GET | /dashboard/reports/inventory | WarehouseReport |
| /reports/depreciation | GET | /dashboard/reports/financial | DepreciationReport |
| /reports/expiry-tracking | GET | /dashboard/inventory/* | ExpiryTracking |
| /reports/incidents-stats | GET | /dashboard/incidents | IncidentsStats |
| /reports/complaints-stats | GET | /dashboard/complaints | ComplaintsStats |
| /reports/dashboards/admin | GET | /dashboard | AdminDashboard |
| /reports/dashboards/manager | GET | /dashboard | ManagerDashboard |
| /reports/dashboards/operator/:id | GET | /dashboard | OperatorDashboard |

---

## Непокрытые endpoints (Gaps)

### HR Module — 0% UI покрытие

| Endpoint | Приоритет | Предлагаемая страница |
|----------|-----------|----------------------|
| /employees | P1 | /dashboard/hr/employees |
| /attendance | P2 | /dashboard/hr/attendance |
| /leave-request | P2 | /dashboard/hr/leave-requests |
| /payroll | P1 | /dashboard/hr/payroll |

### Integration Module — Частичное покрытие

| Endpoint | Приоритет | Предлагаемая страница |
|----------|-----------|----------------------|
| /integration-log | P3 | /dashboard/integration/logs |
| /webhook | P2 | /dashboard/integration/webhooks |
| /sync-job | P2 | /dashboard/integration/sync-jobs |

### Warehouse Module — Частичное покрытие

| Endpoint | Приоритет | Предлагаемая страница |
|----------|-----------|----------------------|
| /stock-reservation | P3 | /dashboard/inventory/reservations |
| /stock-movement | P2 | /dashboard/inventory/movements |
| /inventory-batch | P2 | /dashboard/inventory/batches |

---

## Mobile App Coverage

### Реализованные модули

| Модуль | Экраны | Endpoints используются |
|--------|--------|----------------------|
| Auth | LoginScreen | /auth/login, /auth/refresh |
| Tasks | TaskListScreen, TaskDetailScreen, TaskCameraScreen | /tasks, /tasks/:id, /tasks/:id/start, /tasks/:id/complete, /tasks/:id/upload-photos |
| Profile | ProfileScreen | /auth/profile |
| Equipment | EquipmentMapScreen | /machines, /equipment/* |
| Client | 6 экранов | /client/* endpoints |

### Нереализованные модули

| Модуль | Приоритет | Причина |
|--------|-----------|---------|
| Inventory | P1 | Нужен для операторов |
| Incidents | P2 | Создание инцидентов в поле |
| Machines | P2 | Просмотр информации об автоматах |

---

## Telegram Mini App Coverage

### Реализованные модули

| Модуль | Страницы | Endpoints используются |
|--------|----------|----------------------|
| Menu | /tg/menu | /client/menu |
| Cart | /tg/cart | /client/orders |
| Profile | /tg/profile/* | /client/me, /client/loyalty |
| Auth | (автоматически) | /client/auth/telegram |

### Ограничения TWA

- Только клиентские функции (не для операторов)
- Нет доступа к камере (только через native app)
- Ограниченный offline режим

---

*Документ сгенерирован автоматически на основе анализа исходного кода VHM24*
