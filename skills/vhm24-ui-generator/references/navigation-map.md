# VendHub OS Navigation Map

## Table of Contents
1. [Main Navigation](#main-navigation)
2. [Screen Actions](#screen-actions)
3. [Button → Screen Mapping](#button-screen-mapping)

---

## Main Navigation

Sidebar menu items and their target screens:

| Menu Item | Screen ID | Component | File |
|-----------|-----------|-----------|------|
| Дашборд | `dashboard` | AdminDashboard | `01-admin-dashboard.jsx` |
| Автоматы | `machines` | MachinesList | `02-machines-list.jsx` |
| Задачи | `tasks` | KanbanTaskBoard | `06-kanban-task-board.jsx` |
| Карта | `map` | RealtimeMap | `07-realtime-map.jsx` |
| Продукты | `products` | ProductsManagement | `08-products-management.jsx` |
| Склад | `inventory` | InventoryManagement | `09-inventory-management.jsx` |
| Справочники | `mdm` | MDMDirectoryBuilder | `04-mdm-directory-builder.jsx` |
| Отчёты | `reports` | ReportsAnalytics | `12-reports-analytics.jsx` |
| Финансы | `finance` | FinanceModule | `16-finance-module.jsx` |
| Команда | `team` | TeamManagement | `13-team-management.jsx` |
| Импорт | `import` | AIImportWizard | `15-ai-import-wizard.jsx` |
| Инвестор | `investor` | InvestorPortal | `17-investor-portal.jsx` |
| Настройки | `settings` | SettingsPage | `14-settings.jsx` |
| Справка | `help` | UtilityScreens | `18-utility-screens.jsx` |

### Mobile Apps Section
| Menu Item | Screen ID | Component | File |
|-----------|-----------|-----------|------|
| Приложение сотрудника | `staff-app` | StaffMobileApp | `10-staff-mobile-app.jsx` |
| Приложение клиента | `client-app` | ClientMobileApp | `11-client-mobile-app.jsx` |

---

## Screen Actions

### 01 - Admin Dashboard

| Element | Action Type | Opens |
|---------|-------------|-------|
| KPI Card (click) | Navigate | → Reports with filter |
| Alert (click) | Navigate | → Machine Detail |
| "Все алерты" button | Navigate | → Alerts List |
| Machine row (click) | Navigate | → Machine Detail |
| Activity item (click) | Navigate | → Related screen |
| "Обновить" button | Refresh | → Reload data |

### 02 - Machines List

| Element | Action Type | Opens |
|---------|-------------|-------|
| "+ Добавить" button | Modal | → Add Machine Modal |
| Table row (click) | Navigate | → Machine Detail |
| Status badge | Popover | → Quick status info |
| "Редактировать" action | Modal | → Edit Machine Modal |
| "Удалить" action | Confirm | → Delete confirmation |
| Bulk actions | Modal | → Bulk action modal |

### 03 - Machine Detail

| Element | Action Type | Opens |
|---------|-------------|-------|
| "Редактировать" button | Modal | → Edit Machine Modal |
| Tab buttons | Switch | → Tab content |
| "Добавить задачу" | Modal | → New Task Modal |
| "Инкассация" button | Modal | → Collection Modal |
| "Загрузка" button | Modal | → Refill Modal |
| Chart period selector | Filter | → Reload chart |
| Inventory item | Modal | → Edit Inventory Modal |

### 04 - MDM Directory Builder

| Element | Action Type | Opens |
|---------|-------------|-------|
| "+ Создать справочник" | Modal | → Create Directory Modal |
| Directory card | Navigate | → Directory Entries |
| "Настройки" icon | Modal | → Directory Settings Modal |
| Field drag | Reorder | → Update field order |

### 05 - Directory Entries

| Element | Action Type | Opens |
|---------|-------------|-------|
| "+ Добавить" button | Modal | → Add Entry Modal |
| Table row (click) | Modal | → Edit Entry Modal |
| "Удалить" action | Confirm | → Delete confirmation |
| "Импорт" button | Modal | → Import Wizard |
| "Экспорт" button | Download | → CSV/Excel file |

### 06 - Kanban Task Board

| Element | Action Type | Opens |
|---------|-------------|-------|
| "+ Новая задача" | Modal | → Create Task Modal |
| Task card (click) | Drawer | → Task Detail Drawer |
| Task card (drag) | Move | → Change status |
| Assignee avatar | Popover | → User quick info |
| Column "+" button | Modal | → Quick add task |

### 07 - Realtime Map

| Element | Action Type | Opens |
|---------|-------------|-------|
| Map marker (click) | Popup | → Machine popup |
| Popup "Подробнее" | Navigate | → Machine Detail |
| List item (click) | Focus | → Center map on machine |
| Filter buttons | Filter | → Update markers |
| Route button | Draw | → Draw route to machine |

### 08 - Products Management

| Element | Action Type | Opens |
|---------|-------------|-------|
| "+ Добавить продукт" | Modal | → Add Product Modal |
| Product card | Modal | → Edit Product Modal |
| "Рецепт" tab | Switch | → Recipe editor |
| Price field | Inline edit | → Update price |
| Category filter | Filter | → Filter products |

### 09 - Inventory Management

| Element | Action Type | Opens |
|---------|-------------|-------|
| "+ Приход" button | Modal | → Stock Arrival Modal |
| "Трансфер" button | Modal | → Transfer Modal |
| "Списание" button | Modal | → Write-off Modal |
| Stock item (click) | Drawer | → Stock Detail Drawer |
| Low stock alert | Navigate | → Create reorder task |

### 10 - Staff Mobile App

| Element | Action Type | Opens |
|---------|-------------|-------|
| "Начать смену" | Toggle | → Start duty |
| Task card | Navigate | → Task Detail screen |
| "Навигация" | External | → Open maps app |
| "Загрузить" button | Flow | → Refill flow screens |
| Bottom nav items | Navigate | → Switch tab |

### 11 - Client Mobile App

| Element | Action Type | Opens |
|---------|-------------|-------|
| Machine marker | Sheet | → Machine bottom sheet |
| Product card | Navigate | → Product Detail |
| "В корзину" | Add | → Update cart |
| Cart button | Navigate | → Cart screen |
| "Оплатить" | Flow | → Payment flow |

### 12 - Reports Analytics

| Element | Action Type | Opens |
|---------|-------------|-------|
| Report type card | Navigate | → Report Builder |
| "Создать отчёт" | Modal | → Report Builder Modal |
| Saved report (click) | Navigate | → View Report |
| "Экспорт" button | Download | → PDF/Excel |
| "Расписание" button | Modal | → Schedule Modal |

### 13 - Team Management

| Element | Action Type | Opens |
|---------|-------------|-------|
| "+ Добавить" | Modal | → Add Employee Modal |
| Employee row | Drawer | → Employee Detail Drawer |
| Role badge (click) | Modal | → Edit Role Modal |
| Schedule cell | Modal | → Edit Shift Modal |
| "Все разрешения" | Modal | → Permissions Modal |

### 14 - Settings

| Element | Action Type | Opens |
|---------|-------------|-------|
| Settings section | Expand | → Section details |
| Toggle switches | Toggle | → Update setting |
| "Сохранить" | Submit | → Save & notify |
| Integration card | Modal | → Integration Setup Modal |
| API key "Copy" | Clipboard | → Copy API key |

### 16 - Finance Module

| Element | Action Type | Opens |
|---------|-------------|-------|
| Transaction row | Drawer | → Transaction Detail |
| "+ Транзакция" | Modal | → Add Transaction Modal |
| Invoice row | Navigate | → Invoice Detail |
| "Multikassa" button | Modal | → Fiscal Receipt Modal |
| "Сверка" button | Modal | → Reconciliation Modal |

### 17 - Investor Portal

| Element | Action Type | Opens |
|---------|-------------|-------|
| Machine card | Navigate | → Machine Detail |
| ROI chart | Tooltip | → Period details |
| "Скачать отчёт" | Download | → PDF report |
| Projection slider | Update | → Recalculate projections |

### 18 - Utility Screens

| Element | Action Type | Opens |
|---------|-------------|-------|
| FAQ item | Expand | → Show answer |
| "Новый тикет" | Modal | → Create Ticket Modal |
| Ticket row | Navigate | → Ticket Detail |
| Profile field | Inline edit | → Update field |
| "Выйти" button | Confirm | → Logout confirmation |

---

## Button → Screen Mapping

### Standard Button Actions

```jsx
// Navigate to screen
onClick={() => setCurrentScreen('machine-detail')}

// Open modal
onClick={() => setShowAddModal(true)}

// Open drawer
onClick={() => setSelectedItem(item); setShowDrawer(true)}

// Confirm action
onClick={() => setShowConfirmDialog(true)}

// Inline action
onClick={() => handleQuickAction(item.id)}
```

### Action Button Types

| Button Label | Icon | Action Type | Color |
|-------------|------|-------------|-------|
| Добавить | Plus | Modal | Primary (amber) |
| Редактировать | Edit | Modal | Secondary |
| Удалить | Trash2 | Confirm | Danger (red) |
| Просмотр | Eye | Navigate/Drawer | Ghost |
| Экспорт | Download | Download | Secondary |
| Импорт | Upload | Modal | Secondary |
| Обновить | RefreshCw | Refresh | Ghost |
| Сохранить | Check | Submit | Primary |
| Отмена | X | Close | Secondary |
| Подробнее | ChevronRight | Navigate | Link |
