# VendHub OS - Чеклист задач по внедрению дизайна

## Условные обозначения
- 🔴 Не начато
- 🟡 В процессе
- 🟢 Завершено
- ⏭️ Пропущено (не требуется)

---

## ЭТАП 0: Подготовка базы (1 день)

### 0.1 Цветовая схема
| # | Задача | Файл | Статус |
|---|--------|------|--------|
| 0.1.1 | Добавить CSS переменные Warm Brew | `globals.css` | 🔴 |
| 0.1.2 | Обновить primary цвет на amber-500 | `globals.css` | 🔴 |
| 0.1.3 | Обновить accent цвет на orange-500 | `globals.css` | 🔴 |

### 0.2 Утилитарные компоненты
| # | Задача | Файл | Статус |
|---|--------|------|--------|
| 0.2.1 | Создать WarmCard компонент | `components/ui/warm-card.tsx` | 🔴 |
| 0.2.2 | Создать StatusBadge компонент | `components/ui/status-badge.tsx` | 🔴 |
| 0.2.3 | Создать LevelBar компонент | `components/ui/level-bar.tsx` | 🔴 |
| 0.2.4 | Создать TrendBadge компонент | `components/ui/trend-badge.tsx` | 🔴 |

---

## ЭТАП 1: Dashboard (3 дня)

### 1.1 Layout
| # | Задача | Файл | Статус |
|---|--------|------|--------|
| 1.1.1 | Добавить gradient background | `app/dashboard/layout.tsx` | 🔴 |
| 1.1.2 | Обновить общий padding/spacing | `app/dashboard/layout.tsx` | 🔴 |

### 1.2 Sidebar
| # | Задача | Файл | Статус |
|---|--------|------|--------|
| 1.2.1 | Изменить фон на stone-900 | `components/layout/CollapsibleSidebar.tsx` | 🔴 |
| 1.2.2 | Обновить логотип (gradient amber) | `components/layout/CollapsibleSidebar.tsx` | 🔴 |
| 1.2.3 | Стилизовать активный пункт меню | `components/layout/CollapsibleSidebar.tsx` | 🔴 |
| 1.2.4 | Стилизовать hover состояние | `components/layout/CollapsibleSidebar.tsx` | 🔴 |
| 1.2.5 | Добавить badges с количеством | `components/layout/CollapsibleSidebar.tsx` | 🔴 |
| 1.2.6 | Стилизовать user section внизу | `components/layout/CollapsibleSidebar.tsx` | 🔴 |

### 1.3 Header
| # | Задача | Файл | Статус |
|---|--------|------|--------|
| 1.3.1 | Обновить фон и border | `components/layout/Header.tsx` | 🔴 |
| 1.3.2 | Стилизовать search bar | `components/layout/Header.tsx` | 🔴 |
| 1.3.3 | Добавить keyboard shortcut hint | `components/layout/Header.tsx` | 🔴 |
| 1.3.4 | Стилизовать notification bell | `components/layout/Header.tsx` | 🔴 |
| 1.3.5 | Обновить user avatar gradient | `components/layout/Header.tsx` | 🔴 |
| 1.3.6 | Добавить live clock (опционально) | `components/layout/Header.tsx` | 🔴 |

### 1.4 Dashboard Page
| # | Задача | Файл | Статус |
|---|--------|------|--------|
| 1.4.1 | Обновить заголовок и подзаголовок | `app/dashboard/page.tsx` | 🔴 |
| 1.4.2 | Добавить date picker | `app/dashboard/page.tsx` | 🔴 |
| 1.4.3 | Добавить export button | `app/dashboard/page.tsx` | 🔴 |

### 1.5 Stat Cards
| # | Задача | Файл | Статус |
|---|--------|------|--------|
| 1.5.1 | Обновить стиль карточек (rounded-2xl) | `components/dashboard/StatsRow.tsx` | 🔴 |
| 1.5.2 | Добавить icon containers | `components/dashboard/StatsRow.tsx` | 🔴 |
| 1.5.3 | Добавить trend badges | `components/dashboard/StatsRow.tsx` | 🔴 |
| 1.5.4 | Стилизовать hover эффекты | `components/dashboard/StatsRow.tsx` | 🔴 |

### 1.6 Quick Actions
| # | Задача | Файл | Статус |
|---|--------|------|--------|
| 1.6.1 | Создать QuickActions компонент | `components/dashboard/QuickActions.tsx` | 🔴 |
| 1.6.2 | Добавить 4 action кнопки | `components/dashboard/QuickActions.tsx` | 🔴 |
| 1.6.3 | Интегрировать на dashboard | `app/dashboard/page.tsx` | 🔴 |

### 1.7 Alerts Widget
| # | Задача | Файл | Статус |
|---|--------|------|--------|
| 1.7.1 | Обновить header с count | `components/dashboard/widgets/RecentAlertsWidget.tsx` | 🔴 |
| 1.7.2 | Стилизовать alert rows | `components/dashboard/widgets/RecentAlertsWidget.tsx` | 🔴 |
| 1.7.3 | Добавить colored dots по типу | `components/dashboard/widgets/RecentAlertsWidget.tsx` | 🔴 |
| 1.7.4 | Стилизовать "Все алерты" link | `components/dashboard/widgets/RecentAlertsWidget.tsx` | 🔴 |

### 1.8 Activity Feed
| # | Задача | Файл | Статус |
|---|--------|------|--------|
| 1.8.1 | Обновить activity icons | `components/dashboard/widgets/RecentActivityWidget.tsx` | 🔴 |
| 1.8.2 | Стилизовать amount в emerald | `components/dashboard/widgets/RecentActivityWidget.tsx` | 🔴 |
| 1.8.3 | Стилизовать timestamps | `components/dashboard/widgets/RecentActivityWidget.tsx` | 🔴 |

### 1.9 Sales Chart
| # | Задача | Файл | Статус |
|---|--------|------|--------|
| 1.9.1 | Обновить period selector | `components/dashboard/widgets/SalesOverviewChart.tsx` | 🔴 |
| 1.9.2 | Изменить gradient на amber | `components/dashboard/widgets/SalesOverviewChart.tsx` | 🔴 |
| 1.9.3 | Стилизовать tooltip | `components/dashboard/widgets/SalesOverviewChart.tsx` | 🔴 |
| 1.9.4 | Добавить legend | `components/dashboard/widgets/SalesOverviewChart.tsx` | 🔴 |

---

## ЭТАП 2: Machines List (4 дня)

### 2.1 Machines Page
| # | Задача | Файл | Статус |
|---|--------|------|--------|
| 2.1.1 | Обновить header секцию | `app/dashboard/machines/page.tsx` | 🔴 |
| 2.1.2 | Добавить stats bar | `app/dashboard/machines/page.tsx` | 🔴 |
| 2.1.3 | Добавить view mode toggle | `app/dashboard/machines/page.tsx` | 🔴 |
| 2.1.4 | Обновить search стили | `app/dashboard/machines/page.tsx` | 🔴 |

### 2.2 MachineCard (Grid view)
| # | Задача | Файл | Статус |
|---|--------|------|--------|
| 2.2.1 | Создать MachineCard компонент | `components/machines/MachineCard.tsx` | 🔴 |
| 2.2.2 | Status icon container | `components/machines/MachineCard.tsx` | 🔴 |
| 2.2.3 | Favorite star toggle | `components/machines/MachineCard.tsx` | 🔴 |
| 2.2.4 | Mini sales chart | `components/machines/MachineCard.tsx` | 🔴 |
| 2.2.5 | Level bars для запасов | `components/machines/MachineCard.tsx` | 🔴 |
| 2.2.6 | Temperature + operator info | `components/machines/MachineCard.tsx` | 🔴 |
| 2.2.7 | Context menu | `components/machines/MachineCard.tsx` | 🔴 |

### 2.3 MachineRow (List view)
| # | Задача | Файл | Статус |
|---|--------|------|--------|
| 2.3.1 | Создать MachineRow компонент | `components/machines/MachineRow.tsx` | 🔴 |
| 2.3.2 | Checkbox для selection | `components/machines/MachineRow.tsx` | 🔴 |
| 2.3.3 | StatusBadge интеграция | `components/machines/MachineRow.tsx` | 🔴 |
| 2.3.4 | Sales trend badge | `components/machines/MachineRow.tsx` | 🔴 |
| 2.3.5 | Mini inventory bar | `components/machines/MachineRow.tsx` | 🔴 |

### 2.4 FilterPanel
| # | Задача | Файл | Статус |
|---|--------|------|--------|
| 2.4.1 | Создать FilterPanel компонент | `components/machines/FilterPanel.tsx` | 🔴 |
| 2.4.2 | Status filter buttons | `components/machines/FilterPanel.tsx` | 🔴 |
| 2.4.3 | Inventory level filter | `components/machines/FilterPanel.tsx` | 🔴 |
| 2.4.4 | Alerts/Favorites checkboxes | `components/machines/FilterPanel.tsx` | 🔴 |
| 2.4.5 | Reset/Apply buttons | `components/machines/FilterPanel.tsx` | 🔴 |

### 2.5 MachineDetailSlideOver
| # | Задача | Файл | Статус |
|---|--------|------|--------|
| 2.5.1 | Создать SlideOver компонент | `components/machines/MachineDetailSlideOver.tsx` | 🔴 |
| 2.5.2 | Colored header по статусу | `components/machines/MachineDetailSlideOver.tsx` | 🔴 |
| 2.5.3 | Tabs navigation | `components/machines/MachineDetailSlideOver.tsx` | 🔴 |
| 2.5.4 | Overview tab content | `components/machines/MachineDetailSlideOver.tsx` | 🔴 |
| 2.5.5 | Quick actions grid | `components/machines/MachineDetailSlideOver.tsx` | 🔴 |
| 2.5.6 | Slide-in animation | `components/machines/MachineDetailSlideOver.tsx` | 🔴 |

### 2.6 BulkActionsBar
| # | Задача | Файл | Статус |
|---|--------|------|--------|
| 2.6.1 | Создать BulkActionsBar компонент | `components/machines/BulkActionsBar.tsx` | 🔴 |
| 2.6.2 | Selected count badge | `components/machines/BulkActionsBar.tsx` | 🔴 |
| 2.6.3 | Action buttons | `components/machines/BulkActionsBar.tsx` | 🔴 |
| 2.6.4 | Clear selection button | `components/machines/BulkActionsBar.tsx` | 🔴 |

---

## ЭТАП 3: Machine Detail (4 дня)

### 3.1 Machine Detail Page
| # | Задача | Файл | Статус |
|---|--------|------|--------|
| 3.1.1 | Colored header по статусу | `app/dashboard/machines/[id]/page.tsx` | 🔴 |
| 3.1.2 | Breadcrumb navigation | `app/dashboard/machines/[id]/page.tsx` | 🔴 |
| 3.1.3 | Machine info header | `app/dashboard/machines/[id]/page.tsx` | 🔴 |
| 3.1.4 | Quick stats row | `app/dashboard/machines/[id]/page.tsx` | 🔴 |
| 3.1.5 | Tabs navigation | `app/dashboard/machines/[id]/page.tsx` | 🔴 |

### 3.2 BunkerCard
| # | Задача | Файл | Статус |
|---|--------|------|--------|
| 3.2.1 | Создать BunkerCard компонент | `components/machines/BunkerCard.tsx` | 🔴 |
| 3.2.2 | Border color по уровню | `components/machines/BunkerCard.tsx` | 🔴 |
| 3.2.3 | Level visualization bar | `components/machines/BunkerCard.tsx` | 🔴 |
| 3.2.4 | Days remaining calculation | `components/machines/BunkerCard.tsx` | 🔴 |
| 3.2.5 | Refill action button | `components/machines/BunkerCard.tsx` | 🔴 |

### 3.3 TelemetryGauge
| # | Задача | Файл | Статус |
|---|--------|------|--------|
| 3.3.1 | Создать TelemetryGauge компонент | `components/machines/TelemetryGauge.tsx` | 🔴 |
| 3.3.2 | Linear gauge visualization | `components/machines/TelemetryGauge.tsx` | 🔴 |
| 3.3.3 | Warning/Critical colors | `components/machines/TelemetryGauge.tsx` | 🔴 |
| 3.3.4 | Min/Max labels | `components/machines/TelemetryGauge.tsx` | 🔴 |

### 3.4 Telemetry Tab
| # | Задача | Файл | Статус |
|---|--------|------|--------|
| 3.4.1 | Current values grid | `components/machines/TelemetryTab.tsx` | 🔴 |
| 3.4.2 | Temperature chart | `components/machines/TelemetryTab.tsx` | 🔴 |
| 3.4.3 | System info cards | `components/machines/TelemetryTab.tsx` | 🔴 |

### 3.5 RefillModal
| # | Задача | Файл | Статус |
|---|--------|------|--------|
| 3.5.1 | Создать RefillModal компонент | `components/machines/RefillModal.tsx` | 🔴 |
| 3.5.2 | Bunker info display | `components/machines/RefillModal.tsx` | 🔴 |
| 3.5.3 | Amount input | `components/machines/RefillModal.tsx` | 🔴 |
| 3.5.4 | Quick fill buttons | `components/machines/RefillModal.tsx` | 🔴 |
| 3.5.5 | Submit/Cancel actions | `components/machines/RefillModal.tsx` | 🔴 |

### 3.6 BrewingHistoryTable
| # | Задача | Файл | Статус |
|---|--------|------|--------|
| 3.6.1 | Создать таблицу истории варок | `components/machines/BrewingHistoryTable.tsx` | 🔴 |
| 3.6.2 | Payment method icons | `components/machines/BrewingHistoryTable.tsx` | 🔴 |
| 3.6.3 | Quality status badge | `components/machines/BrewingHistoryTable.tsx` | 🔴 |

---

## ЭТАП 4: Tasks (3 дня)

### 4.1 Tasks Page
| # | Задача | Файл | Статус |
|---|--------|------|--------|
| 4.1.1 | Добавить List/Kanban toggle | `app/dashboard/tasks/page.tsx` | 🔴 |
| 4.1.2 | Обновить stats cards | `app/dashboard/tasks/page.tsx` | 🔴 |
| 4.1.3 | Интегрировать Kanban view | `app/dashboard/tasks/page.tsx` | 🔴 |

### 4.2 KanbanBoard
| # | Задача | Файл | Статус |
|---|--------|------|--------|
| 4.2.1 | Создать KanbanBoard компонент | `components/tasks/KanbanBoard.tsx` | 🔴 |
| 4.2.2 | Column компонент | `components/tasks/KanbanBoard.tsx` | 🔴 |
| 4.2.3 | Drag-drop (@dnd-kit) | `components/tasks/KanbanBoard.tsx` | 🔴 |
| 4.2.4 | Column headers с count | `components/tasks/KanbanBoard.tsx` | 🔴 |

### 4.3 TaskCard
| # | Задача | Файл | Статус |
|---|--------|------|--------|
| 4.3.1 | Обновить стиль карточки | `components/tasks/TaskCard.tsx` | 🔴 |
| 4.3.2 | Priority indicator (left border) | `components/tasks/TaskCard.tsx` | 🔴 |
| 4.3.3 | Type icon | `components/tasks/TaskCard.tsx` | 🔴 |
| 4.3.4 | Assignee avatar | `components/tasks/TaskCard.tsx` | 🔴 |
| 4.3.5 | Due date badge | `components/tasks/TaskCard.tsx` | 🔴 |

### 4.4 TaskDetailModal
| # | Задача | Файл | Статус |
|---|--------|------|--------|
| 4.4.1 | Создать TaskDetailModal | `components/tasks/TaskDetailModal.tsx` | 🔴 |
| 4.4.2 | Full task info display | `components/tasks/TaskDetailModal.tsx` | 🔴 |
| 4.4.3 | Status change buttons | `components/tasks/TaskDetailModal.tsx` | 🔴 |
| 4.4.4 | Comments section | `components/tasks/TaskDetailModal.tsx` | 🔴 |

---

## ЭТАП 5: Finance Module (5 дней)

### 5.1 Finance Layout
| # | Задача | Файл | Статус |
|---|--------|------|--------|
| 5.1.1 | Создать finance layout | `app/dashboard/finance/layout.tsx` | 🔴 |
| 5.1.2 | Special gradient background | `app/dashboard/finance/layout.tsx` | 🔴 |
| 5.1.3 | Tabs navigation | `app/dashboard/finance/layout.tsx` | 🔴 |

### 5.2 Finance Overview
| # | Задача | Файл | Статус |
|---|--------|------|--------|
| 5.2.1 | Создать overview page | `app/dashboard/finance/page.tsx` | 🔴 |
| 5.2.2 | KPI cards row | `app/dashboard/finance/page.tsx` | 🔴 |
| 5.2.3 | Payment systems grid | `app/dashboard/finance/page.tsx` | 🔴 |
| 5.2.4 | Revenue chart | `app/dashboard/finance/page.tsx` | 🔴 |
| 5.2.5 | Recent transactions | `app/dashboard/finance/page.tsx` | 🔴 |

### 5.3 PaymentSystemCard
| # | Задача | Файл | Статус |
|---|--------|------|--------|
| 5.3.1 | Создать PaymentSystemCard | `components/finance/PaymentSystemCard.tsx` | 🔴 |
| 5.3.2 | Payment system logos | `components/finance/PaymentSystemCard.tsx` | 🔴 |
| 5.3.3 | Status indicator | `components/finance/PaymentSystemCard.tsx` | 🔴 |
| 5.3.4 | Balance display | `components/finance/PaymentSystemCard.tsx` | 🔴 |

### 5.4 Transactions Page
| # | Задача | Файл | Статус |
|---|--------|------|--------|
| 5.4.1 | Создать transactions page | `app/dashboard/finance/transactions/page.tsx` | 🔴 |
| 5.4.2 | Date range filter | `app/dashboard/finance/transactions/page.tsx` | 🔴 |
| 5.4.3 | Payment method filter | `app/dashboard/finance/transactions/page.tsx` | 🔴 |
| 5.4.4 | Transactions table | `app/dashboard/finance/transactions/page.tsx` | 🔴 |

### 5.5 Reconciliation Page
| # | Задача | Файл | Статус |
|---|--------|------|--------|
| 5.5.1 | Создать reconciliation page | `app/dashboard/finance/reconciliation/page.tsx` | 🔴 |
| 5.5.2 | Cash vs Digital comparison | `app/dashboard/finance/reconciliation/page.tsx` | 🔴 |
| 5.5.3 | Discrepancy alerts | `app/dashboard/finance/reconciliation/page.tsx` | 🔴 |

---

## ЭТАП 6: Investor Portal (4 дня)

### 6.1 Investor Layout
| # | Задача | Файл | Статус |
|---|--------|------|--------|
| 6.1.1 | Создать investor layout | `app/investor/layout.tsx` | 🔴 |
| 6.1.2 | Dark theme styles | `app/investor/layout.tsx` | 🔴 |
| 6.1.3 | Separate navigation | `app/investor/layout.tsx` | 🔴 |

### 6.2 Investor Dashboard
| # | Задача | Файл | Статус |
|---|--------|------|--------|
| 6.2.1 | Создать investor dashboard | `app/investor/page.tsx` | 🔴 |
| 6.2.2 | Investment KPI cards | `app/investor/page.tsx` | 🔴 |
| 6.2.3 | ROI/IRR metrics | `app/investor/page.tsx` | 🔴 |
| 6.2.4 | Asset allocation chart | `app/investor/page.tsx` | 🔴 |
| 6.2.5 | Top locations by ROI | `app/investor/page.tsx` | 🔴 |

### 6.3 InvestorMetricCard
| # | Задача | Файл | Статус |
|---|--------|------|--------|
| 6.3.1 | Создать InvestorMetricCard | `components/investor/InvestorMetricCard.tsx` | 🔴 |
| 6.3.2 | Dark card styling | `components/investor/InvestorMetricCard.tsx` | 🔴 |
| 6.3.3 | Accent colors | `components/investor/InvestorMetricCard.tsx` | 🔴 |

---

## ЭТАП 7: Финализация (2 дня)

### 7.1 Mobile Optimization
| # | Задача | Файл | Статус |
|---|--------|------|--------|
| 7.1.1 | Проверить responsive на всех страницах | various | 🔴 |
| 7.1.2 | Оптимизировать touch targets | various | 🔴 |

### 7.2 Testing
| # | Задача | Файл | Статус |
|---|--------|------|--------|
| 7.2.1 | Проверить npm run build | - | 🔴 |
| 7.2.2 | Проверить TypeScript типы | - | 🔴 |
| 7.2.3 | Проверить lint errors | - | 🔴 |
| 7.2.4 | Визуальное тестирование всех страниц | - | 🔴 |

### 7.3 Documentation
| # | Задача | Файл | Статус |
|---|--------|------|--------|
| 7.3.1 | Обновить README с новым дизайном | `README.md` | 🔴 |
| 7.3.2 | Документировать новые компоненты | `docs/` | 🔴 |

---

## Прогресс

| Этап | Всего задач | Выполнено | % |
|------|-------------|-----------|---|
| 0. Подготовка | 7 | 0 | 0% |
| 1. Dashboard | 28 | 0 | 0% |
| 2. Machines List | 28 | 0 | 0% |
| 3. Machine Detail | 21 | 0 | 0% |
| 4. Tasks | 14 | 0 | 0% |
| 5. Finance | 17 | 0 | 0% |
| 6. Investor | 10 | 0 | 0% |
| 7. Финализация | 7 | 0 | 0% |
| **ИТОГО** | **132** | **0** | **0%** |

---

*Чеклист создан: 2 февраля 2026*
