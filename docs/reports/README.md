# Reports Documentation

> **Модуль**: `backend/src/modules/reports/`
> **Версия**: 1.0.0
> **Последнее обновление**: 2025-12-21

---

## Обзор

Модуль генерации отчётов с поддержкой множества форматов (JSON, PDF, Excel, CSV). Включает дашборды для разных ролей, отчёты по аппаратам, операторам, продажам и финансам.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        REPORTS SYSTEM                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    REPORT TYPES                                │  │
│  │  ├── Dashboard (сводная панель)                               │  │
│  │  ├── Machine Performance (производительность аппаратов)       │  │
│  │  ├── Sales (продажи)                                          │  │
│  │  ├── Inventory (остатки)                                      │  │
│  │  ├── Financial (финансы)                                      │  │
│  │  ├── Operator Performance (операторы)                         │  │
│  │  ├── Maintenance (обслуживание)                               │  │
│  │  └── Custom (пользовательские)                                │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    REPORT FORMATS                              │  │
│  │  ├── JSON - API response                                      │  │
│  │  ├── PDF - Печатные отчёты                                    │  │
│  │  ├── Excel - Таблицы для анализа                              │  │
│  │  ├── CSV - Экспорт данных                                     │  │
│  │  └── HTML - Веб-просмотр                                      │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                SPECIALIZED SERVICES                            │  │
│  │  ├── AdminDashboardService                                    │  │
│  │  ├── ManagerDashboardService                                  │  │
│  │  ├── OperatorDashboardService                                 │  │
│  │  ├── MachinePerformanceService                                │  │
│  │  ├── LocationPerformanceService                               │  │
│  │  ├── ProductSalesService                                      │  │
│  │  ├── CollectionsSummaryService                                │  │
│  │  ├── CashFlowService                                          │  │
│  │  ├── ProfitLossService                                        │  │
│  │  └── OperatorPerformanceReportService                         │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Enums

### ReportType

```typescript
export enum ReportType {
  DASHBOARD = 'dashboard',
  MACHINE_PERFORMANCE = 'machine_performance',
  SALES = 'sales',
  INVENTORY = 'inventory',
  FINANCIAL = 'financial',
  TAX = 'tax',
  OPERATOR_PERFORMANCE = 'operator_performance',
  MAINTENANCE = 'maintenance',
  CUSTOM = 'custom',
}
```

### ReportFormat

```typescript
export enum ReportFormat {
  JSON = 'json',
  PDF = 'pdf',
  EXCEL = 'excel',
  CSV = 'csv',
  HTML = 'html',
}
```

---

## Interfaces

### ReportParams

```typescript
export interface ReportParams {
  type: ReportType;
  format?: ReportFormat;
  period: DateRange;
  filters?: ReportFilters;
  groupBy?: string[];
  sortBy?: string;
  locale?: string;
  timezone?: string;
  includeCharts?: boolean;
  includeRawData?: boolean;
}
```

### Report

```typescript
export interface Report {
  id: string;
  type: ReportType;
  title: string;
  subtitle?: string;
  period: DateRange;
  generatedAt: Date;
  generationTimeMs: number;
  data: ReportData;
  metrics: ReportMetrics;
  charts?: ChartData[];
  summary: ReportSummary;
  metadata: ReportMetadata;
}
```

### ReportData

```typescript
export interface ReportData {
  rows: Record<string, unknown>[];
  columns: ColumnDefinition[];
  totals?: Record<string, number | string>;
  groupedData?: GroupedData[];
}
```

---

## Дашборды по ролям

### Admin Dashboard

Полная статистика по всей сети:
- Финансовые метрики (выручка, расходы, прибыль)
- Статистика задач (выполнено, просрочено)
- Инциденты и жалобы
- Состояние аппаратов

### Manager Dashboard

Статистика по управляемым локациям:
- Продажи по локациям
- Производительность операторов
- Инвентарь и пополнения

### Operator Dashboard

Персональная статистика:
- Назначенные задачи
- Выполненные инкассации
- Маршруты на сегодня

---

## Сервис ReportsService

```typescript
@Injectable()
export class ReportsService {
  // Сводный дашборд
  async getDashboard(filters: ReportFiltersDto): Promise<DashboardData>;

  // Отчёт по аппарату
  async getMachineReport(machineId: string, filters: ReportFiltersDto): Promise<MachineReport>;

  // Отчёт по пользователю
  async getUserReport(userId: string, filters: ReportFiltersDto): Promise<UserReport>;
}
```

### getDashboard Response

```json
{
  "period": { "from": "2025-01-01", "to": "2025-01-31" },
  "financial": {
    "revenue": 15000000,
    "expenses": 5000000,
    "collections": 12000000,
    "net_profit": 10000000
  },
  "tasks": {
    "total": 150,
    "completed": 140,
    "overdue": 3,
    "completion_rate": 93.3
  },
  "incidents": {
    "open": 5,
    "critical": 1
  },
  "complaints": {
    "new": 3
  },
  "machines": {
    "active": 45,
    "total": 50
  }
}
```

---

## Специализированные отчёты

### MachinePerformanceService

- Продажи по аппарату
- Инкассации
- Задачи по типам
- Инциденты и жалобы

### LocationPerformanceService

- Выручка по локациям
- Сравнение локаций
- Тренды

### ProductSalesService

- Топ продаваемых товаров
- Анализ по категориям
- ABC-анализ

### CollectionsSummaryService

- Сводка инкассаций
- По операторам
- По аппаратам

### ProfitLossService

- P&L отчёт
- По периодам
- По локациям

### CashFlowService

- Движение денежных средств
- Прогнозы
- Отклонения

---

## API Endpoints

### Дашборд

```http
GET /api/reports/dashboard?start_date=2025-01-01&end_date=2025-01-31
Authorization: Bearer <token>
```

### Отчёт по аппарату

```http
GET /api/reports/machines/:machineId?start_date=2025-01-01&end_date=2025-01-31
Authorization: Bearer <token>
```

### Отчёт по оператору

```http
GET /api/reports/users/:userId?start_date=2025-01-01&end_date=2025-01-31
Authorization: Bearer <token>
```

### Экспорт в Excel

```http
GET /api/reports/export/excel?type=sales&start_date=2025-01-01&end_date=2025-01-31
Authorization: Bearer <token>
```

### Экспорт в PDF

```http
GET /api/reports/export/pdf?type=machine_performance&machine_id=uuid
Authorization: Bearer <token>
```

---

## PDF Generator

Генерация PDF отчётов:

```typescript
@Injectable()
export class PdfGeneratorService {
  async generateReport(data: Report): Promise<Buffer>;
  async generateMachineReport(machineId: string, period: DateRange): Promise<Buffer>;
  async generateDailyReport(date: Date): Promise<Buffer>;
}
```

---

## Excel Export

Экспорт в Excel:

```typescript
@Injectable()
export class ExcelExportService {
  async exportToExcel(data: ReportData, options?: ExcelOptions): Promise<Buffer>;
  async exportSalesReport(period: DateRange): Promise<Buffer>;
  async exportInventoryReport(warehouseId?: string): Promise<Buffer>;
}
```

---

## Кэширование

Отчёты кэшируются для производительности:

```typescript
@UseInterceptors(CacheInterceptor)
@Get('dashboard')
async getDashboard(@Query() filters: ReportFiltersDto) {
  return this.reportsService.getDashboard(filters);
}
```

TTL кэша:
- Dashboard: 5 минут
- Machine reports: 10 минут
- Financial reports: 30 минут

---

## Requirements

| REQ ID | Описание |
|--------|----------|
| REQ-RPT-01 | 8 типов отчётов |
| REQ-RPT-02 | 5 форматов экспорта |
| REQ-RPT-10 | Дашборды по ролям |
| REQ-RPT-11 | Фильтрация по датам |
| REQ-RPT-12 | Фильтрация по аппаратам/локациям |
| REQ-RPT-20 | PDF генерация |
| REQ-RPT-21 | Excel экспорт |
| REQ-RPT-30 | Кэширование отчётов |
