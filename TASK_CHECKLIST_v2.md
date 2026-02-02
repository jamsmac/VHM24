# VendHub OS - Чеклист задач v2 (ПРОВЕРЕННЫЙ)

## Сводка изменений

| Метрика | План v1 | План v2 |
|---------|---------|---------|
| Всего задач | 132 | 29 |
| Дней работы | 30 | 8-10 |
| Новых файлов | ~50 | 14 |
| Изменяемых файлов | ~30 | 10 |

**Причина сокращения:** 65-70% базы уже реализовано!

---

## ФАЗА 0: Цветовая схема (0.5 дня)

| # | Задача | Статус |
|---|--------|--------|
| 0.1 | Изменить --primary на amber (38 92% 50%) в globals.css | 🔴 |
| 0.2 | Изменить --accent на orange (25 95% 53%) | 🔴 |
| 0.3 | Добавить --warm-bg переменные для градиентов | 🔴 |
| 0.4 | Обновить --ring на amber оттенок | 🔴 |

**Файл:** `frontend/src/app/globals.css`

---

## ФАЗА 1: UI компоненты (1 день)

| # | Задача | Файл | Статус |
|---|--------|------|--------|
| 1.1 | Создать LevelBar компонент | `components/ui/level-bar.tsx` | 🔴 |
| 1.2 | Создать TrendBadge компонент | `components/ui/trend-badge.tsx` | 🔴 |
| 1.3 | Создать WarmCard компонент | `components/ui/warm-card.tsx` | 🔴 |

---

## ФАЗА 2: Layout обновление (1 день)

| # | Задача | Файл | Статус |
|---|--------|------|--------|
| 2.1 | Добавить gradient background | `app/dashboard/layout.tsx` | 🔴 |
| 2.2 | Sidebar: фон stone-900 | `components/layout/CollapsibleSidebar.tsx` | 🔴 |
| 2.3 | Sidebar: активный пункт amber | `components/layout/CollapsibleSidebar.tsx` | 🔴 |
| 2.4 | Sidebar: hover состояния | `components/layout/CollapsibleSidebar.tsx` | 🔴 |
| 2.5 | Header: search стили | `components/layout/Header.tsx` | 🔴 |
| 2.6 | Header: notification badge | `components/layout/Header.tsx` | 🔴 |

---

## ФАЗА 3: Machines компоненты (2 дня)

| # | Задача | Файл | Статус |
|---|--------|------|--------|
| 3.1 | Создать MachineRow (list view) | `components/machines/MachineRow.tsx` | 🔴 |
| 3.2 | Создать FilterPanel | `components/machines/FilterPanel.tsx` | 🔴 |
| 3.3 | Создать MachineDetailSlideOver | `components/machines/MachineDetailSlideOver.tsx` | 🔴 |
| 3.4 | Создать BulkActionsBar | `components/machines/BulkActionsBar.tsx` | 🔴 |

---

## ФАЗА 4: Machine Detail компоненты (2 дня)

| # | Задача | Файл | Статус |
|---|--------|------|--------|
| 4.1 | Создать BunkerCard | `components/machines/BunkerCard.tsx` | 🔴 |
| 4.2 | Создать TelemetryGauge | `components/machines/TelemetryGauge.tsx` | 🔴 |
| 4.3 | Создать TelemetryTab | `components/machines/TelemetryTab.tsx` | 🔴 |
| 4.4 | Создать RefillModal | `components/machines/RefillModal.tsx` | 🔴 |
| 4.5 | Создать BrewingHistoryTable | `components/machines/BrewingHistoryTable.tsx` | 🔴 |

---

## ФАЗА 5: Tasks Kanban (1 день)

| # | Задача | Файл | Статус |
|---|--------|------|--------|
| 5.1 | Создать KanbanBoard с drag-drop | `components/tasks/KanbanBoard.tsx` | 🔴 |
| 5.2 | Создать TaskDetailModal | `components/tasks/TaskDetailModal.tsx` | 🔴 |

---

## ФАЗА 6: Обновление стилей (1 день)

| # | Задача | Файл | Статус |
|---|--------|------|--------|
| 6.1 | StatCard: rounded-2xl, trend badge | `components/dashboard/StatCard.tsx` | 🔴 |
| 6.2 | RecentAlertsWidget: colored dots | `components/dashboard/RecentAlertsWidget.tsx` | 🔴 |
| 6.3 | RecentActivityWidget: colored icons | `components/dashboard/RecentActivityWidget.tsx` | 🔴 |
| 6.4 | RevenueChart: amber gradient | `components/dashboard/RevenueChart.tsx` | 🔴 |
| 6.5 | MachineCard: status ring, levels | `components/machines/MachineCard.tsx` | 🔴 |

---

## Прогресс

| Фаза | Задач | Выполнено | % |
|------|-------|-----------|---|
| 0. Цвета | 4 | 0 | 0% |
| 1. UI компоненты | 3 | 0 | 0% |
| 2. Layout | 6 | 0 | 0% |
| 3. Machines | 4 | 0 | 0% |
| 4. Machine Detail | 5 | 0 | 0% |
| 5. Tasks | 2 | 0 | 0% |
| 6. Стили | 5 | 0 | 0% |
| **ИТОГО** | **29** | **0** | **0%** |

---

## Порядок выполнения

```
День 1: Фаза 0 (цвета) + Фаза 1 (UI компоненты)
День 2: Фаза 2 (Layout)
День 3-4: Фаза 3 (Machines компоненты)
День 5-6: Фаза 4 (Machine Detail)
День 7: Фаза 5 (Tasks Kanban)
День 8: Фаза 6 (Обновление стилей) + Тестирование
```

---

## Чек перед началом каждой фазы

```bash
cd /sessions/focused-compassionate-turing/mnt/VHM24-repo/frontend
git status
npm run build  # должен проходить
```

## Чек после завершения каждой фазы

```bash
npm run build
npx tsc --noEmit
npm run lint
```

---

*Чеклист v2 создан: 2 февраля 2026*
