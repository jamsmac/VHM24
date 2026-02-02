# VendHub OS - План реализации дизайн-системы "Warm Brew"

## Системный промпт для реализации

```
Ты работаешь над проектом VendHub OS - системой управления вендинговыми автоматами.

КОНТЕКСТ ПРОЕКТА:
- Стек: Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, tRPC, Drizzle ORM
- Локация: /sessions/focused-compassionate-turing/mnt/VHM24-repo/frontend/
- Язык интерфейса: Русский
- Рынок: Узбекистан (валюта UZS - сум)

ДИЗАЙН-СИСТЕМА "WARM BREW":
- Фон: градиент from-stone-50 via-orange-50 to-amber-50
- Sidebar: bg-stone-900 (тёмный)
- Акцент: amber-500, orange-500
- Карточки: bg-white rounded-2xl shadow-lg border border-stone-200
- Hover: hover:border-amber-300 hover:shadow-lg
- Кнопки: bg-amber-500 hover:bg-amber-600 text-white rounded-xl
- Статусы: emerald (online/ok), amber (warning), red (error/offline), stone (neutral)

СТИЛЬ КОДА:
- Компоненты в /components/, страницы в /app/
- Использовать lucide-react для иконок
- Recharts для графиков
- React Query (@tanstack/react-query) для данных
- Zustand для локального состояния
- I18n через useTranslations() из @/providers/I18nProvider

ПРИ ИЗМЕНЕНИИ:
1. Сохранять существующую бизнес-логику
2. Обновлять только визуальную часть
3. Не ломать типизацию TypeScript
4. Тестировать через npm run build
```

---

## Фаза 0: Подготовка (День 1)

### 0.1 Обновление глобальных стилей

**Файл:** `/frontend/src/app/globals.css`

**Изменения:**
```css
/* Добавить в :root */
--warm-bg-start: 30 20% 98%;    /* stone-50 */
--warm-bg-via: 33 100% 96%;      /* orange-50 */
--warm-bg-end: 48 96% 89%;       /* amber-100 */
--warm-accent: 38 92% 50%;       /* amber-500 */
--warm-accent-hover: 32 95% 44%; /* amber-600 */
```

### 0.2 Создание утилитарных компонентов

**Создать:** `/frontend/src/components/ui/warm-card.tsx`
```tsx
// WarmCard - базовая карточка в стиле Warm Brew
export const WarmCard = ({ children, className, hover = true }) => (
  <div className={cn(
    "bg-white rounded-2xl border border-stone-200 shadow-sm",
    hover && "hover:border-amber-300 hover:shadow-lg transition-all",
    className
  )}>
    {children}
  </div>
);
```

**Создать:** `/frontend/src/components/ui/status-badge.tsx`
```tsx
// StatusBadge - унифицированный badge статуса
const statusConfig = {
  online: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: Wifi },
  offline: { bg: 'bg-red-100', text: 'text-red-700', icon: WifiOff },
  warning: { bg: 'bg-amber-100', text: 'text-amber-700', icon: AlertTriangle },
  // ...
};
```

---

## Фаза 1: Dashboard (Дни 2-4)

### 1.1 Обновление Layout

**Файл:** `/frontend/src/app/dashboard/layout.tsx`

**Задачи:**
- [ ] Добавить gradient background: `bg-gradient-to-br from-stone-50 via-orange-50 to-amber-50`
- [ ] Обновить min-height на `min-h-screen`

### 1.2 Обновление Sidebar

**Файл:** `/frontend/src/components/layout/CollapsibleSidebar.tsx`

**Задачи:**
- [ ] Изменить фон на `bg-stone-900`
- [ ] Обновить логотип с gradient: `bg-gradient-to-br from-amber-500 to-amber-600`
- [ ] Активный пункт меню: `bg-amber-500/20 text-amber-400`
- [ ] Hover: `hover:bg-stone-800 text-stone-400 hover:text-white`
- [ ] Добавить badge для разделов (кол-во машин, задач)

### 1.3 Обновление Header

**Файл:** `/frontend/src/components/layout/Header.tsx`

**Задачи:**
- [ ] Изменить фон на `bg-white border-b border-stone-200`
- [ ] Search bar: `bg-stone-100 hover:bg-stone-200 rounded-xl`
- [ ] Добавить keyboard shortcut hint (`⌘K`)
- [ ] Notification badge: `bg-red-500 text-white`
- [ ] User avatar: `bg-gradient-to-br from-amber-500 to-orange-600`

### 1.4 Обновление Dashboard Page

**Файл:** `/frontend/src/app/dashboard/page.tsx`

**Задачи:**
- [ ] Заголовок страницы с подзаголовком
- [ ] Date picker справа: `bg-white border rounded-xl`
- [ ] Export button: `bg-amber-500 text-white rounded-xl`

### 1.5 Обновление StatCards

**Файл:** `/frontend/src/components/dashboard/StatsRow.tsx` (или создать)

**Задачи:**
- [ ] Карточки: `bg-white rounded-2xl p-5 border border-stone-200`
- [ ] Icon container: `w-12 h-12 rounded-xl` с цветом по типу
- [ ] Trend badge: `px-2 py-1 rounded-full text-xs font-medium`
- [ ] Positive trend: `bg-emerald-100 text-emerald-700`
- [ ] Negative trend: `bg-red-100 text-red-700`

### 1.6 QuickActions компонент

**Создать:** `/frontend/src/components/dashboard/QuickActions.tsx`

**Задачи:**
- [ ] Grid из 4 кнопок быстрых действий
- [ ] Каждая: иконка + текст
- [ ] Hover: `hover:border-amber-300 hover:shadow-md`

### 1.7 AlertPanel компонент

**Файл:** `/frontend/src/components/dashboard/widgets/RecentAlertsWidget.tsx`

**Задачи:**
- [ ] Header с count критичных: `bg-red-100 text-red-700 rounded-full`
- [ ] Alert row с colored dot по типу
- [ ] Critical background: `bg-red-50/50`
- [ ] "Все алерты →" link: `text-amber-600 hover:text-amber-700`

### 1.8 ActivityFeed компонент

**Файл:** `/frontend/src/components/dashboard/widgets/RecentActivityWidget.tsx`

**Задачи:**
- [ ] Activity icon с цветом по типу (sale: emerald, refill: blue, alert: red)
- [ ] Amount в emerald: `text-emerald-600`
- [ ] Время серое: `text-stone-400`

### 1.9 SalesChart компонент

**Файл:** `/frontend/src/components/dashboard/widgets/SalesOverviewChart.tsx`

**Задачи:**
- [ ] Period selector: `bg-amber-500 text-white` для активного
- [ ] AreaChart gradient: `from-amber-500/30 to-amber-500/0`
- [ ] Tooltip: `bg-stone-900 text-white rounded-lg`
- [ ] Legend внизу

---

## Фаза 2: Machines (Дни 5-8)

### 2.1 Machines List Page

**Файл:** `/frontend/src/app/dashboard/machines/page.tsx`

**Задачи:**
- [ ] Stats bar: total, online (emerald), warning (amber), offline (red)
- [ ] View mode toggle: Grid/List
- [ ] Search: `bg-stone-100 rounded-xl border`
- [ ] Filter button с badge активных фильтров

### 2.2 MachineCard компонент

**Создать:** `/frontend/src/components/machines/MachineCard.tsx`

**Задачи:**
- [ ] Карточка: `bg-white rounded-2xl border-2`
- [ ] Status icon container с цветом
- [ ] Favorite star: `text-amber-500 fill-amber-500`
- [ ] Mini sales chart (AreaChart)
- [ ] Level bars для запасов
- [ ] Operator info внизу

### 2.3 MachineRow компонент (для List view)

**Создать:** `/frontend/src/components/machines/MachineRow.tsx`

**Задачи:**
- [ ] Checkbox для bulk select
- [ ] StatusBadge
- [ ] Sales trend badge
- [ ] Inventory mini-bar
- [ ] Actions menu

### 2.4 FilterPanel компонент

**Создать:** `/frontend/src/components/machines/FilterPanel.tsx`

**Задачи:**
- [ ] Dropdown panel: `bg-white rounded-xl shadow-xl border`
- [ ] Status filter buttons
- [ ] Inventory level filter
- [ ] Checkboxes: alerts only, favorites only
- [ ] Reset/Apply buttons

### 2.5 MachineDetailSlideOver

**Создать:** `/frontend/src/components/machines/MachineDetailSlideOver.tsx`

**Задачи:**
- [ ] Right slide-over panel: `w-[600px] animate-slide-in`
- [ ] Colored header по статусу
- [ ] Tabs: Обзор, Запасы, История, Настройки
- [ ] Quick actions grid

### 2.6 BulkActionsBar

**Создать:** `/frontend/src/components/machines/BulkActionsBar.tsx`

**Задачи:**
- [ ] Fixed bottom bar: `bg-stone-900 text-white rounded-2xl`
- [ ] Selected count badge: `bg-amber-500`
- [ ] Action buttons

---

## Фаза 3: Machine Detail (Дни 9-12)

### 3.1 Machine Detail Page

**Файл:** `/frontend/src/app/dashboard/machines/[id]/page.tsx`

**Задачи:**
- [ ] Colored header по статусу машины
- [ ] Quick stats row (продажи, варки, чек, температура, давление)
- [ ] Tabs навигация

### 3.2 BunkerCard компонент

**Создать:** `/frontend/src/components/machines/BunkerCard.tsx`

**Задачи:**
- [ ] Card с border по уровню (red/amber/normal)
- [ ] Level bar с процентом
- [ ] Days remaining расчёт
- [ ] "Пополнить" action

### 3.3 TelemetryGauge компонент

**Создать:** `/frontend/src/components/machines/TelemetryGauge.tsx`

**Задачи:**
- [ ] Circular or linear gauge
- [ ] Warning/Critical thresholds
- [ ] Animated value

### 3.4 RefillModal

**Создать:** `/frontend/src/components/machines/RefillModal.tsx`

**Задачи:**
- [ ] Modal с bunker info
- [ ] Amount input
- [ ] Quick buttons: "До полного", "50%"

### 3.5 BrewingHistoryTable

**Создать:** `/frontend/src/components/machines/BrewingHistoryTable.tsx`

**Задачи:**
- [ ] Table с историей варок
- [ ] Payment method icons
- [ ] Quality status badge

---

## Фаза 4: Tasks (Дни 13-15)

### 4.1 Tasks Page с Kanban

**Файл:** `/frontend/src/app/dashboard/tasks/page.tsx`

**Задачи:**
- [ ] View toggle: List/Kanban
- [ ] Stats cards row

### 4.2 KanbanBoard компонент

**Создать:** `/frontend/src/components/tasks/KanbanBoard.tsx`

**Задачи:**
- [ ] Columns: Pending, In Progress, Done
- [ ] Drag-drop между колонками (@dnd-kit)
- [ ] Column header с count

### 4.3 TaskCard компонент

**Обновить:** `/frontend/src/components/tasks/TaskCard.tsx`

**Задачи:**
- [ ] Card: `bg-white rounded-xl border`
- [ ] Priority indicator (цветная полоска слева)
- [ ] Type icon
- [ ] Assignee avatar
- [ ] Due date badge

### 4.4 TaskDetailModal

**Создать:** `/frontend/src/components/tasks/TaskDetailModal.tsx`

**Задачи:**
- [ ] SlideOver или Modal
- [ ] Full task info
- [ ] Status change buttons
- [ ] Comments section

---

## Фаза 5: Finance Module (Дни 16-20)

### 5.1 Finance Module Layout

**Создать:** `/frontend/src/app/dashboard/finance/layout.tsx`

**Задачи:**
- [ ] Special gradient: `from-amber-50 via-orange-50 to-yellow-50`
- [ ] Tabs navigation

### 5.2 Finance Overview Page

**Создать:** `/frontend/src/app/dashboard/finance/page.tsx`

**Задачи:**
- [ ] KPI cards row
- [ ] Payment systems status
- [ ] Revenue chart
- [ ] Recent transactions

### 5.3 PaymentSystemCard

**Создать:** `/frontend/src/components/finance/PaymentSystemCard.tsx`

**Задачи:**
- [ ] Card для Payme, Click, Uzum, HUMO, UZCARD, OSON, Cash
- [ ] Logo, status, balance
- [ ] Last sync time

### 5.4 Transactions Page

**Создать:** `/frontend/src/app/dashboard/finance/transactions/page.tsx`

**Задачи:**
- [ ] Filters: date range, payment method, status
- [ ] Transactions table
- [ ] Export functionality

### 5.5 Reconciliation Page

**Создать:** `/frontend/src/app/dashboard/finance/reconciliation/page.tsx`

**Задачи:**
- [ ] Cash vs Digital comparison
- [ ] Discrepancy alerts
- [ ] Match/Unmatch actions

---

## Фаза 6: Investor Portal (Дни 21-24)

### 6.1 Investor Portal Layout

**Создать:** `/frontend/src/app/investor/layout.tsx`

**Задачи:**
- [ ] Dark theme: `from-slate-900 via-slate-800 to-slate-900`
- [ ] Separate navigation

### 6.2 Investor Dashboard

**Создать:** `/frontend/src/app/investor/page.tsx`

**Задачи:**
- [ ] Investment KPI cards
- [ ] ROI/IRR metrics
- [ ] Asset allocation pie chart
- [ ] Top locations by ROI

### 6.3 InvestorMetricCard

**Создать:** `/frontend/src/components/investor/InvestorMetricCard.tsx`

**Задачи:**
- [ ] Dark card style: `bg-slate-800/50 border-slate-700`
- [ ] Accent colors for metrics

### 6.4 Documents Page

**Создать:** `/frontend/src/app/investor/documents/page.tsx`

**Задачи:**
- [ ] Document list
- [ ] Download/View actions
- [ ] Category filters

---

## Фаза 7: Mobile Optimization (Дни 25-28)

### 7.1 Staff Mobile App improvements

**Файлы:** `/frontend/src/app/dashboard/tasks/mobile/`

**Задачи:**
- [ ] Touch-optimized task cards
- [ ] Bottom navigation
- [ ] QR scanner integration
- [ ] Photo upload for reports

### 7.2 Client Mobile App (Telegram)

**Файлы:** `/frontend/src/app/tg/`

**Задачи:**
- [ ] Improve product menu
- [ ] Bonus system UI
- [ ] Order history
- [ ] Nearby machines

---

## Фаза 8: Utility Screens (Дни 29-30)

### 8.1 Help Center

**Создать:** `/frontend/src/app/dashboard/help/page.tsx`

**Задачи:**
- [ ] FAQ accordion
- [ ] Search functionality
- [ ] Contact support form

### 8.2 Notifications Center

**Обновить:** `/frontend/src/app/dashboard/notifications/page.tsx`

**Задачи:**
- [ ] Filter tabs: All, Unread, Alerts, Success
- [ ] Mark all as read
- [ ] Notification settings link

### 8.3 Profile Settings

**Обновить:** `/frontend/src/app/dashboard/profile/page.tsx`

**Задачи:**
- [ ] Sections: Personal, Security, Notifications, Preferences
- [ ] Theme selector (Light/Dark/Auto)
- [ ] Session management

---

## Checklist для каждого компонента

При обновлении каждого компонента проверять:

- [ ] Цвета соответствуют Warm Brew палитре
- [ ] Border-radius: rounded-xl или rounded-2xl
- [ ] Shadows: shadow-sm базово, shadow-lg на hover
- [ ] Transitions: transition-all или transition-colors
- [ ] Hover states определены
- [ ] Dark mode поддержка (если есть)
- [ ] Mobile responsive
- [ ] TypeScript типы корректны
- [ ] Нет console.log/errors
- [ ] npm run build проходит

---

## Приоритеты

### Критично (делать первым):
1. Globals.css + утилитарные компоненты
2. Dashboard layout + Sidebar + Header
3. StatCards + AlertPanel
4. Machines list (Grid view)
5. Machine detail (Bunkers tab)

### Важно (делать вторым):
6. Tasks Kanban
7. Finance overview
8. Filters и SlideOvers

### Желательно (делать третьим):
9. Investor Portal
10. Mobile optimization
11. Help Center

---

## Команды для проверки

```bash
# Проверка сборки
cd /sessions/focused-compassionate-turing/mnt/VHM24-repo/frontend && npm run build

# Проверка типов
cd /sessions/focused-compassionate-turing/mnt/VHM24-repo/frontend && npx tsc --noEmit

# Линтинг
cd /sessions/focused-compassionate-turing/mnt/VHM24-repo/frontend && npm run lint
```

---

*План создан: 2 февраля 2026*
*Автор: Claude Opus 4.5*
