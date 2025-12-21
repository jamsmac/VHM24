# Analytics Documentation

> **Модуль**: `backend/src/modules/analytics/`
> **Версия**: 1.0.0
> **Последнее обновление**: 2025-12-21

---

## Обзор

Модуль аналитики с предрасчитанными метриками, настраиваемыми дашбордами и пользовательскими отчётами. Поддерживает различные типы метрик, группировку данных и создание снапшотов для быстрого доступа.

```
┌─────────────────────────────────────────────────────────────────────┐
│                      ANALYTICS SYSTEM                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                   DAILY STATS                                  │  │
│  │  ├── total_revenue (выручка)                                   │  │
│  │  ├── total_sales_count (кол-во продаж)                        │  │
│  │  ├── average_sale_amount (средний чек)                        │  │
│  │  ├── total_collections (инкассации)                           │  │
│  │  ├── active_machines_count                                     │  │
│  │  ├── *_tasks_completed (по типам)                             │  │
│  │  ├── top_products (JSONB)                                      │  │
│  │  └── top_machines (JSONB)                                      │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                 ANALYTICS SNAPSHOTS                            │  │
│  │  ├── snapshot_type (daily/weekly/monthly/yearly)               │  │
│  │  ├── machine_id / location_id / product_id                    │  │
│  │  ├── Sales: transactions, revenue, units_sold                  │  │
│  │  ├── Machine: uptime, downtime, availability                   │  │
│  │  ├── Stock: refills, out_of_stock                             │  │
│  │  ├── Service: maintenance, incidents, complaints               │  │
│  │  └── Financial: costs, profit_margin                           │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                 DASHBOARD WIDGETS                              │  │
│  │  ├── 10 типов виджетов (sales_chart, top_machines, etc.)      │  │
│  │  ├── 7 типов графиков (line, bar, pie, etc.)                  │  │
│  │  ├── 8 временных диапазонов                                    │  │
│  │  ├── Настраиваемая сетка (width, height, position)            │  │
│  │  └── Персональные для каждого пользователя                    │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                  CUSTOM REPORTS                                │  │
│  │  ├── 6 типов отчётов (sales, financial, inventory, etc.)      │  │
│  │  ├── 4 формата экспорта (PDF, Excel, CSV, JSON)               │  │
│  │  ├── Планирование (once, daily, weekly, monthly)              │  │
│  │  └── Email рассылка по расписанию                             │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Enums

### MetricType

```typescript
export enum MetricType {
  REVENUE = 'revenue',                    // Выручка
  TRANSACTIONS = 'transactions',          // Количество транзакций
  UNITS_SOLD = 'units_sold',              // Продано единиц
  AVERAGE_TRANSACTION = 'average_transaction', // Средний чек
  UPTIME = 'uptime',                      // Время работы (мин)
  DOWNTIME = 'downtime',                  // Время простоя (мин)
  AVAILABILITY = 'availability',          // Доступность (%)
  PROFIT_MARGIN = 'profit_margin',        // Прибыль (%)
}
```

### GroupByType

```typescript
export enum GroupByType {
  HOUR = 'hour',         // По часам
  DAY = 'day',           // По дням
  WEEK = 'week',         // По неделям
  MONTH = 'month',       // По месяцам
  MACHINE = 'machine',   // По аппаратам
  LOCATION = 'location', // По локациям
  PRODUCT = 'product',   // По продуктам
}
```

### WidgetType

```typescript
export enum WidgetType {
  SALES_CHART = 'sales_chart',       // График продаж
  REVENUE_CHART = 'revenue_chart',   // График выручки
  TOP_MACHINES = 'top_machines',     // Топ аппаратов
  TOP_PRODUCTS = 'top_products',     // Топ продуктов
  MACHINE_STATUS = 'machine_status', // Статус аппаратов
  STOCK_LEVELS = 'stock_levels',     // Уровни запасов
  TASKS_SUMMARY = 'tasks_summary',   // Сводка задач
  INCIDENTS_MAP = 'incidents_map',   // Карта инцидентов
  KPI_METRIC = 'kpi_metric',         // KPI метрика
  CUSTOM_CHART = 'custom_chart',     // Произвольный график
}
```

### ChartType

```typescript
export enum ChartType {
  LINE = 'line',       // Линейный
  BAR = 'bar',         // Столбчатый
  PIE = 'pie',         // Круговой
  AREA = 'area',       // С заливкой
  DONUT = 'donut',     // Кольцевой
  HEATMAP = 'heatmap', // Тепловая карта
  SCATTER = 'scatter', // Точечный
}
```

### TimeRange

```typescript
export enum TimeRange {
  TODAY = 'today',                 // Сегодня
  YESTERDAY = 'yesterday',         // Вчера
  LAST_7_DAYS = 'last_7_days',     // Последние 7 дней
  LAST_30_DAYS = 'last_30_days',   // Последние 30 дней
  THIS_MONTH = 'this_month',       // Этот месяц
  LAST_MONTH = 'last_month',       // Прошлый месяц
  THIS_YEAR = 'this_year',         // Этот год
  CUSTOM = 'custom',               // Произвольный период
}
```

### SnapshotType

```typescript
export enum SnapshotType {
  DAILY = 'daily',     // Ежедневный
  WEEKLY = 'weekly',   // Еженедельный
  MONTHLY = 'monthly', // Ежемесячный
  YEARLY = 'yearly',   // Годовой
}
```

### ReportType (Custom Reports)

```typescript
export enum ReportType {
  SALES = 'sales',           // Продажи
  FINANCIAL = 'financial',   // Финансы
  INVENTORY = 'inventory',   // Инвентарь
  MACHINES = 'machines',     // Аппараты
  TASKS = 'tasks',           // Задачи
  CUSTOM = 'custom',         // Произвольный
}
```

### ReportFormat

```typescript
export enum ReportFormat {
  PDF = 'pdf',
  EXCEL = 'excel',
  CSV = 'csv',
  JSON = 'json',
}
```

### ScheduleFrequency

```typescript
export enum ScheduleFrequency {
  ONCE = 'once',       // Однократно
  DAILY = 'daily',     // Ежедневно
  WEEKLY = 'weekly',   // Еженедельно
  MONTHLY = 'monthly', // Ежемесячно
}
```

---

## Entities

### DailyStats Entity

Агрегированная статистика за день. Обновляется в реальном времени при создании транзакций и задач.

```typescript
@Entity('daily_stats')
@Unique(['stat_date'])
@Index(['stat_date'])
export class DailyStats extends BaseEntity {
  @Column({ type: 'date' })
  stat_date: Date;

  // ========== ПРОДАЖИ И ВЫРУЧКА ==========
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  total_revenue: number;

  @Column({ type: 'integer', default: 0 })
  total_sales_count: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  average_sale_amount: number;

  // ========== ИНКАССАЦИИ ==========
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  total_collections: number;

  @Column({ type: 'integer', default: 0 })
  collections_count: number;

  // ========== АППАРАТЫ ==========
  @Column({ type: 'integer', default: 0 })
  active_machines_count: number;

  @Column({ type: 'integer', default: 0 })
  online_machines_count: number;

  @Column({ type: 'integer', default: 0 })
  offline_machines_count: number;

  // ========== ЗАДАЧИ ==========
  @Column({ type: 'integer', default: 0 })
  refill_tasks_completed: number;

  @Column({ type: 'integer', default: 0 })
  collection_tasks_completed: number;

  @Column({ type: 'integer', default: 0 })
  cleaning_tasks_completed: number;

  @Column({ type: 'integer', default: 0 })
  repair_tasks_completed: number;

  @Column({ type: 'integer', default: 0 })
  total_tasks_completed: number;

  // ========== ИНВЕНТАРЬ ==========
  @Column({ type: 'integer', default: 0 })
  inventory_units_refilled: number;

  @Column({ type: 'integer', default: 0 })
  inventory_units_sold: number;

  // ========== ТОП ПРОДУКТЫ/АППАРАТЫ ==========
  @Column({ type: 'jsonb', nullable: true })
  top_products: Array<{
    nomenclature_id: string;
    name: string;
    quantity: number;
    revenue: number;
  }> | null;

  @Column({ type: 'jsonb', nullable: true })
  top_machines: Array<{
    machine_id: string;
    machine_number: string;
    sales_count: number;
    revenue: number;
  }> | null;

  // ========== ОПЕРАТОРЫ ==========
  @Column({ type: 'integer', default: 0 })
  active_operators_count: number;

  // ========== МЕТАДАННЫЕ ==========
  @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  last_updated_at: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  last_full_rebuild_at: Date | null;

  @Column({ type: 'boolean', default: false })
  is_finalized: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}
```

### AnalyticsSnapshot Entity

Детальные снапшоты для анализа по различным измерениям:

```typescript
@Entity('analytics_snapshots')
@Index(['snapshot_type', 'snapshot_date'])
@Index(['machine_id', 'snapshot_date'])
@Index(['location_id', 'snapshot_date'])
export class AnalyticsSnapshot extends BaseEntity {
  @Column({ type: 'enum', enum: SnapshotType })
  snapshot_type: SnapshotType;

  @Column({ type: 'date' })
  snapshot_date: Date;

  // Измерения (опционально)
  @Column({ type: 'uuid', nullable: true })
  machine_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  location_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  product_id: string | null;

  // ========== МЕТРИКИ ПРОДАЖ ==========
  @Column({ type: 'integer', default: 0 })
  total_transactions: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total_revenue: number;

  @Column({ type: 'integer', default: 0 })
  total_units_sold: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  average_transaction_value: number;

  // ========== МЕТРИКИ АППАРАТОВ ==========
  @Column({ type: 'integer', default: 0 })
  uptime_minutes: number;

  @Column({ type: 'integer', default: 0 })
  downtime_minutes: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  availability_percentage: number;

  // ========== МЕТРИКИ ЗАПАСОВ ==========
  @Column({ type: 'integer', default: 0 })
  stock_refills: number;

  @Column({ type: 'integer', default: 0 })
  out_of_stock_incidents: number;

  // ========== МЕТРИКИ ОБСЛУЖИВАНИЯ ==========
  @Column({ type: 'integer', default: 0 })
  maintenance_tasks_completed: number;

  @Column({ type: 'integer', default: 0 })
  incidents_reported: number;

  @Column({ type: 'integer', default: 0 })
  complaints_received: number;

  // ========== ФИНАНСОВЫЕ МЕТРИКИ ==========
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  operational_costs: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  profit_margin: number;

  // ========== ДЕТАЛЬНЫЕ МЕТРИКИ ==========
  @Column({ type: 'jsonb', default: {} })
  detailed_metrics: {
    hourly_distribution?: Record<string, number>;
    top_products?: Array<{ product_id: string; units: number; revenue: number }>;
    payment_methods?: Record<string, number>;
    error_codes?: Record<string, number>;
  };

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;
}
```

### DashboardWidget Entity

Настраиваемые виджеты для персонального дашборда:

```typescript
@Entity('dashboard_widgets')
export class DashboardWidget extends BaseEntity {
  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'enum', enum: WidgetType })
  widget_type: WidgetType;

  @Column({ type: 'enum', enum: ChartType, nullable: true })
  chart_type: ChartType | null;

  @Column({ type: 'enum', enum: TimeRange, default: TimeRange.LAST_7_DAYS })
  time_range: TimeRange;

  @Column({ type: 'integer' })
  position: number;

  @Column({ type: 'integer', default: 6 })
  width: number; // Grid width (1-12)

  @Column({ type: 'integer', default: 4 })
  height: number; // Grid height

  @Column({ type: 'jsonb', default: {} })
  config: {
    filters?: Record<string, any>;
    metrics?: string[];
    groupBy?: string;
    sortBy?: string;
    limit?: number;
    colors?: string[];
    showLegend?: boolean;
    showGrid?: boolean;
    customQuery?: string;
  };

  @Column({ type: 'boolean', default: true })
  is_visible: boolean;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;
}
```

### CustomReport Entity

Пользовательские отчёты с планированием:

```typescript
@Entity('custom_reports')
export class CustomReport extends BaseEntity {
  @Column({ type: 'uuid' })
  created_by_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by_id' })
  created_by: User;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'enum', enum: ReportType })
  report_type: ReportType;

  @Column({ type: 'enum', enum: ReportFormat, default: ReportFormat.PDF })
  format: ReportFormat;

  @Column({ type: 'jsonb', default: {} })
  config: {
    columns?: string[];
    filters?: Record<string, any>;
    groupBy?: string[];
    orderBy?: string[];
    aggregations?: Record<string, string>;
    dateRange?: { from: string; to: string };
  };

  @Column({ type: 'boolean', default: false })
  is_scheduled: boolean;

  @Column({ type: 'enum', enum: ScheduleFrequency, nullable: true })
  schedule_frequency: ScheduleFrequency | null;

  @Column({ type: 'time', nullable: true })
  schedule_time: string | null;

  @Column({ type: 'simple-array', nullable: true })
  schedule_days: string[] | null; // ['monday', 'friday']

  @Column({ type: 'simple-array', nullable: true })
  recipients: string[] | null; // Email addresses

  @Column({ type: 'timestamp', nullable: true })
  last_run_at: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  next_run_at: Date | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;
}
```

---

## Services

### AnalyticsCalculationService

Основной сервис расчёта аналитики:

```typescript
@Injectable()
export class AnalyticsCalculationService {
  /**
   * Расчёт метрик с группировкой
   */
  async calculateMetrics(query: AnalyticsQueryDto): Promise<AnalyticsResult>;

  /**
   * Топ аппаратов по выручке
   */
  async getTopMachines(limit?: number, days?: number): Promise<TopMachineResult[]>;

  /**
   * Топ продуктов по продажам
   */
  async getTopProducts(limit?: number, days?: number): Promise<TopProductResult[]>;

  /**
   * Сводка статусов аппаратов
   */
  async getMachineStatusSummary(): Promise<MachineStatusSummary>;
}
```

### AnalyticsResult Interface

```typescript
export interface AnalyticsResult {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
  }>;
  summary: Record<string, number>;
}
```

### DashboardService

Управление виджетами дашборда:

```typescript
@Injectable()
export class DashboardService {
  /**
   * Получить виджеты пользователя
   */
  async getUserWidgets(userId: string): Promise<DashboardWidget[]>;

  /**
   * Создать виджет
   */
  async createWidget(userId: string, dto: CreateWidgetDto): Promise<DashboardWidget>;

  /**
   * Обновить виджет
   */
  async updateWidget(id: string, dto: Partial<CreateWidgetDto>): Promise<DashboardWidget>;

  /**
   * Удалить виджет
   */
  async deleteWidget(id: string): Promise<void>;

  /**
   * Переупорядочить виджеты
   */
  async reorderWidgets(userId: string, widgetIds: string[]): Promise<void>;
}
```

---

## Analytics Query DTO

```typescript
export class AnalyticsQueryDto {
  @IsDateString()
  @IsOptional()
  start_date?: string;

  @IsDateString()
  @IsOptional()
  end_date?: string;

  @IsArray()
  @IsOptional()
  machine_ids?: string[];

  @IsArray()
  @IsOptional()
  location_ids?: string[];

  @IsArray()
  @IsOptional()
  product_ids?: string[];

  @IsArray()
  @IsOptional()
  metrics?: MetricType[];

  @IsEnum(GroupByType)
  @IsOptional()
  group_by?: GroupByType;
}
```

---

## API Endpoints

### Аналитика

```http
GET /api/analytics?start_date=2025-01-01&end_date=2025-01-31&metrics[]=revenue&metrics[]=transactions&group_by=day
Authorization: Bearer <token>
```

**Response:**
```json
{
  "labels": ["2025-01-01", "2025-01-02", "..."],
  "datasets": [
    {
      "label": "Выручка",
      "data": [15000, 18000, "..."],
      "backgroundColor": "rgba(34, 197, 94, 0.5)",
      "borderColor": "rgba(34, 197, 94, 1)"
    },
    {
      "label": "Транзакции",
      "data": [45, 52, "..."],
      "backgroundColor": "rgba(59, 130, 246, 0.5)",
      "borderColor": "rgba(59, 130, 246, 1)"
    }
  ],
  "summary": {
    "revenue": 16500,
    "total_revenue": 495000,
    "transactions": 48.5,
    "total_transactions": 1455
  }
}
```

### Топ аппаратов

```http
GET /api/analytics/top-machines?limit=10&days=30
Authorization: Bearer <token>
```

### Топ продуктов

```http
GET /api/analytics/top-products?limit=10&days=30
Authorization: Bearer <token>
```

### Дневная статистика

```http
GET /api/analytics/daily-stats?date=2025-01-15
Authorization: Bearer <token>
```

---

### Dashboard Widgets

#### Получить виджеты

```http
GET /api/dashboard/widgets
Authorization: Bearer <token>
```

#### Создать виджет

```http
POST /api/dashboard/widgets
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Выручка за неделю",
  "widget_type": "revenue_chart",
  "chart_type": "line",
  "time_range": "last_7_days",
  "position": 1,
  "width": 6,
  "height": 4,
  "config": {
    "showLegend": true,
    "showGrid": true
  }
}
```

#### Переупорядочить виджеты

```http
PUT /api/dashboard/widgets/reorder
Authorization: Bearer <token>
Content-Type: application/json

{
  "widget_ids": ["uuid-1", "uuid-2", "uuid-3"]
}
```

---

### Custom Reports

#### Создать отчёт

```http
POST /api/analytics/reports
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Еженедельный отчёт по продажам",
  "report_type": "sales",
  "format": "excel",
  "config": {
    "columns": ["date", "machine_number", "product", "quantity", "revenue"],
    "groupBy": ["machine_number"],
    "orderBy": ["revenue DESC"]
  },
  "is_scheduled": true,
  "schedule_frequency": "weekly",
  "schedule_time": "09:00",
  "schedule_days": ["monday"],
  "recipients": ["manager@company.com"]
}
```

#### Запустить отчёт

```http
POST /api/analytics/reports/:id/run
Authorization: Bearer <token>
```

---

## Цвета метрик

```typescript
const colors: Record<MetricType, string> = {
  [MetricType.REVENUE]: 'rgba(34, 197, 94, α)',        // green
  [MetricType.TRANSACTIONS]: 'rgba(59, 130, 246, α)', // blue
  [MetricType.UNITS_SOLD]: 'rgba(168, 85, 247, α)',   // purple
  [MetricType.AVERAGE_TRANSACTION]: 'rgba(249, 115, 22, α)', // orange
  [MetricType.UPTIME]: 'rgba(16, 185, 129, α)',       // emerald
  [MetricType.DOWNTIME]: 'rgba(239, 68, 68, α)',      // red
  [MetricType.AVAILABILITY]: 'rgba(14, 165, 233, α)', // sky
  [MetricType.PROFIT_MARGIN]: 'rgba(132, 204, 22, α)', // lime
};
```

---

## Группировка данных

```
Hour:     '2025-01-15 09:00'
Day:      '2025-01-15'
Week:     '2025-01-13' (начало недели)
Month:    '2025-01'
Machine:  'machine-uuid'
Location: 'location-uuid'
Product:  'product-uuid'
```

---

## Жизненный цикл данных

```
┌─────────────────────────────────────────────────────────────────┐
│                   DATA FLOW                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Транзакции/Задачи ──┐                                          │
│                      │                                          │
│                      ▼                                          │
│              DailyStats (real-time update)                      │
│                      │                                          │
│                      ▼                                          │
│         ┌────────────┴────────────┐                             │
│         │                         │                             │
│         ▼                         ▼                             │
│  AnalyticsSnapshot          AnalyticsSnapshot                   │
│  (machine_id)               (location_id)                       │
│         │                         │                             │
│         └──────────┬──────────────┘                             │
│                    ▼                                            │
│            Dashboard Widgets                                     │
│            Custom Reports                                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

Снапшоты создаются:
- Daily: каждую ночь в 00:05
- Weekly: по воскресеньям
- Monthly: 1-го числа
- Yearly: 1 января
```

---

## Requirements

| REQ ID | Описание |
|--------|----------|
| REQ-ANL-01 | 8 типов метрик |
| REQ-ANL-02 | 7 типов группировки |
| REQ-ANL-10 | Дневная агрегированная статистика |
| REQ-ANL-11 | Топ-10 продуктов/аппаратов |
| REQ-ANL-12 | Счётчики задач по типам |
| REQ-ANL-20 | Снапшоты (daily/weekly/monthly/yearly) |
| REQ-ANL-21 | Фильтрация по machine/location/product |
| REQ-ANL-30 | 10 типов виджетов |
| REQ-ANL-31 | 7 типов графиков |
| REQ-ANL-32 | Персональные дашборды |
| REQ-ANL-33 | Перетаскивание виджетов |
| REQ-ANL-40 | Пользовательские отчёты |
| REQ-ANL-41 | 4 формата экспорта |
| REQ-ANL-42 | Планирование отчётов |
| REQ-ANL-43 | Email рассылка |

---

## Примеры использования

### Получение аналитики продаж за месяц

```typescript
const result = await analyticsService.calculateMetrics({
  start_date: '2025-01-01',
  end_date: '2025-01-31',
  metrics: [MetricType.REVENUE, MetricType.TRANSACTIONS],
  group_by: GroupByType.DAY,
});

// result.labels = ['2025-01-01', '2025-01-02', ...]
// result.datasets[0].data = [15000, 18000, ...]
// result.summary.total_revenue = 495000
```

### Создание виджета топ-аппаратов

```typescript
const widget = await dashboardService.createWidget(userId, {
  title: 'Топ-5 аппаратов',
  widget_type: WidgetType.TOP_MACHINES,
  time_range: TimeRange.LAST_30_DAYS,
  position: 2,
  width: 6,
  height: 4,
  config: {
    limit: 5,
    sortBy: 'revenue',
  },
});
```

### Настройка еженедельного отчёта

```typescript
const report = await reportsService.create({
  name: 'Еженедельная сводка',
  report_type: ReportType.SALES,
  format: ReportFormat.EXCEL,
  is_scheduled: true,
  schedule_frequency: ScheduleFrequency.WEEKLY,
  schedule_time: '08:00',
  schedule_days: ['monday'],
  recipients: ['team@company.com'],
  config: {
    columns: ['date', 'machine_number', 'revenue', 'transactions'],
    groupBy: ['machine_number'],
  },
});
```
