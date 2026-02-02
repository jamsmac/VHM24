# VendHub OS - План реализации v2 (ПРОВЕРЕННЫЙ)

## Результаты проверки

**Покрытие базы: ~65-70%** — Основная структура уже есть!

### Что УЖЕ реализовано:
- ✅ 42 страницы dashboard
- ✅ 50+ UI компонентов (Button, Card, Badge, Dialog, Modal, Table...)
- ✅ 15+ chart компонентов
- ✅ Layout система (Header, Sidebar, Breadcrumbs)
- ✅ Dashboard widgets (RecentActivityWidget, RecentAlertsWidget, AlertsSummaryWidget)
- ✅ MachineCard, TaskCard
- ✅ Все базовые страницы machines, tasks, inventory, reports

### Что НУЖНО сделать:
- ❌ **Цветовая схема** — сейчас фиолетовая, нужна Warm Brew (amber/orange)
- ❌ **4 компонента Machines** — MachineRow, FilterPanel, SlideOver, BulkActionsBar
- ❌ **5 компонентов Machine Detail** — BunkerCard, TelemetryGauge, TelemetryTab, RefillModal, BrewingHistoryTable
- ❌ **2 компонента Tasks** — KanbanBoard, TaskDetailModal
- ❌ **3 UI компонента** — WarmCard, LevelBar, TrendBadge

---

## Исправленные пути файлов

| План v1 | Реальный путь |
|---------|---------------|
| `components/dashboard/widgets/RecentAlertsWidget.tsx` | `components/dashboard/RecentAlertsWidget.tsx` |
| `components/dashboard/widgets/RecentActivityWidget.tsx` | `components/dashboard/RecentActivityWidget.tsx` |
| `components/dashboard/widgets/SalesOverviewChart.tsx` | `components/dashboard/RevenueChart.tsx` |
| `components/dashboard/StatsRow.tsx` | `components/dashboard/StatCard.tsx` |

---

## Системный промпт для работы

```
Ты работаешь над проектом VendHub OS - системой управления вендинговыми автоматами.

КОНТЕКСТ ПРОЕКТА:
- Стек: Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, tRPC, Drizzle ORM
- Путь: /sessions/focused-compassionate-turing/mnt/VHM24-repo/frontend/src/
- Язык интерфейса: Русский
- Рынок: Узбекистан (валюта UZS - сум)

ТЕКУЩИЕ ЦВЕТА (globals.css):
- Primary: 250 89% 65% (фиолетовый) → ИЗМЕНИТЬ на Amber
- Background: 260 20% 99% → ИЗМЕНИТЬ на warm gradient

ЦЕЛЕВАЯ ДИЗАЙН-СИСТЕМА "WARM BREW":
- Фон: gradient from-stone-50 via-orange-50 to-amber-50
- Sidebar: bg-stone-900 (тёмный)
- Primary: amber-500 (#f59e0b)
- Accent: orange-500 (#f97316)
- Карточки: bg-white rounded-2xl shadow-lg border border-stone-200
- Hover: hover:border-amber-300 hover:shadow-lg
- Кнопки: bg-amber-500 hover:bg-amber-600 text-white rounded-xl
- Статусы: emerald (online/ok), amber (warning), red (error/offline)

СУЩЕСТВУЮЩИЕ КОМПОНЕНТЫ (использовать их):
- components/ui/* — полная библиотека shadcn
- components/dashboard/StatCard.tsx — карточка статистики
- components/dashboard/RecentActivityWidget.tsx — лента активности
- components/dashboard/RecentAlertsWidget.tsx — алерты
- components/dashboard/RevenueChart.tsx — график выручки
- components/machines/MachineCard.tsx — карточка машины
- components/tasks/TaskCard.tsx — карточка задачи

ПРИ ИЗМЕНЕНИИ:
1. Сохранять существующую бизнес-логику
2. Обновлять только визуальную часть
3. Не ломать типизацию TypeScript
4. Тестировать: npm run build
```

---

## НОВЫЙ ПЛАН (сокращённый)

### Фаза 0: Цветовая схема (2-3 часа)

**Файл:** `frontend/src/app/globals.css`

```css
/* БЫЛО */
--primary: 250 89% 65%;
--primary-foreground: 0 0% 100%;

/* СТАНЕТ */
--primary: 38 92% 50%;           /* amber-500 */
--primary-foreground: 0 0% 100%;
--accent: 25 95% 53%;             /* orange-500 */
```

**Задачи:**
- [ ] Изменить --primary на amber (38 92% 50%)
- [ ] Изменить --accent на orange (25 95% 53%)
- [ ] Добавить --warm-* переменные для градиентов
- [ ] Обновить --ring на amber

---

### Фаза 1: UI компоненты (1 день)

**Создать 3 файла:**

#### 1.1 `components/ui/level-bar.tsx`
```tsx
interface LevelBarProps {
  value: number;      // текущее значение
  max: number;        // максимум
  threshold?: number; // порог низкого уровня
  showPercent?: boolean;
  size?: 'sm' | 'md' | 'lg';
}
```

#### 1.2 `components/ui/trend-badge.tsx`
```tsx
interface TrendBadgeProps {
  value: number;      // +5.2 или -3.1
  suffix?: string;    // "%" или "сум"
}
// Зелёный для положительных, красный для отрицательных
```

#### 1.3 `components/ui/warm-card.tsx`
```tsx
interface WarmCardProps {
  children: React.ReactNode;
  hover?: boolean;    // hover эффект
  status?: 'normal' | 'warning' | 'critical';
}
// Карточка в стиле Warm Brew с rounded-2xl
```

---

### Фаза 2: Обновление Layout (1 день)

#### 2.1 `app/dashboard/layout.tsx`
- [ ] Добавить gradient background
- [ ] Обновить className на `bg-gradient-to-br from-stone-50 via-orange-50/30 to-amber-50/20`

#### 2.2 `components/layout/CollapsibleSidebar.tsx`
- [ ] Фон: bg-stone-900
- [ ] Активный пункт: bg-amber-500/20 text-amber-400
- [ ] Hover: hover:bg-stone-800

#### 2.3 `components/layout/Header.tsx`
- [ ] Search: bg-stone-100 rounded-xl
- [ ] Notification badge: bg-red-500

---

### Фаза 3: Компоненты Machines (2 дня)

**Создать 4 файла в `components/machines/`:**

#### 3.1 `MachineRow.tsx`
Строка для list view с: checkbox, status badge, sales trend, inventory mini-bar, actions.

#### 3.2 `FilterPanel.tsx`
Dropdown панель с фильтрами: статус, уровень запасов, только с алертами, только избранные.

#### 3.3 `MachineDetailSlideOver.tsx`
Боковая панель (600px) с табами: Обзор, Запасы, История, Настройки.

#### 3.4 `BulkActionsBar.tsx`
Fixed bottom bar для массовых операций: "Выбрано N", кнопки действий, очистить выбор.

---

### Фаза 4: Machine Detail (2 дня)

**Создать 5 файлов в `components/machines/`:**

#### 4.1 `BunkerCard.tsx`
Карточка бункера с визуализацией уровня, порогами, днями до пустого, кнопкой "Пополнить".

#### 4.2 `TelemetryGauge.tsx`
Linear gauge с value, max, warning/critical порогами.

#### 4.3 `TelemetryTab.tsx`
Контент таба телеметрии: текущие значения + графики температуры/давления.

#### 4.4 `RefillModal.tsx`
Модалка пополнения бункера: инфо о бункере, input количества, кнопки "До полного"/"50%".

#### 4.5 `BrewingHistoryTable.tsx`
Таблица варок: время, напиток, сумма, способ оплаты (иконка), температура, качество.

---

### Фаза 5: Tasks Kanban (1 день)

**Создать 2 файла в `components/tasks/`:**

#### 5.1 `KanbanBoard.tsx`
Канбан доска с колонками (Pending, In Progress, Done), drag-drop через @dnd-kit.

#### 5.2 `TaskDetailModal.tsx`
Модалка/SlideOver с полной информацией о задаче, кнопками смены статуса.

---

### Фаза 6: Обновление существующих компонентов (1 день)

Применить Warm Brew стили к:
- [ ] `components/dashboard/StatCard.tsx` — rounded-2xl, trend badge
- [ ] `components/dashboard/RecentAlertsWidget.tsx` — colored dots, amber links
- [ ] `components/dashboard/RecentActivityWidget.tsx` — colored icons
- [ ] `components/dashboard/RevenueChart.tsx` — amber gradient
- [ ] `components/machines/MachineCard.tsx` — status ring, level bars

---

## Итого: ~8-10 рабочих дней

| Фаза | Дней | Задач | Приоритет |
|------|------|-------|-----------|
| 0. Цвета | 0.5 | 4 | 🔴 Критично |
| 1. UI компоненты | 1 | 3 | 🔴 Критично |
| 2. Layout | 1 | 6 | 🟠 Высокий |
| 3. Machines компоненты | 2 | 4 | 🟠 Высокий |
| 4. Machine Detail | 2 | 5 | 🟡 Средний |
| 5. Tasks Kanban | 1 | 2 | 🟡 Средний |
| 6. Обновление стилей | 1 | 5 | 🟢 Низкий |
| **Итого** | **8-10** | **29** | |

---

## Команды проверки

```bash
# После каждого этапа
cd /sessions/focused-compassionate-turing/mnt/VHM24-repo/frontend
npm run build
npx tsc --noEmit
```

---

*План v2 создан: 2 февраля 2026*
*Учтена реальная структура проекта*
