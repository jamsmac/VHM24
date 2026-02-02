---
name: vhm24-charts
description: |
  VendHub Charts & Analytics - паттерны Recharts для дашбордов и аналитики.
  KPI виджеты, графики продаж, тепловые карты, конструктор отчётов.
  Использовать при создании аналитических дашбордов и графиков.
---

# VendHub Charts & Analytics

Паттерны для аналитических дашбордов и визуализаций данных.

## Когда использовать

- KPI дашборды
- Графики продаж
- Аналитические отчёты
- Тепловые карты
- Конструктор отчётов

## Recharts импорты

```typescript
import {
  LineChart, Line,
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  ComposedChart,
  XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
  ReferenceLine, Brush,
} from "recharts";
```

## Цвета для графиков

```typescript
const CHART_COLORS = {
  primary: "#f59e0b",    // amber-500
  secondary: "#d97706",  // amber-600
  success: "#10b981",    // green-500
  danger: "#ef4444",     // red-500
  info: "#3b82f6",       // blue-500
  warning: "#eab308",    // yellow-500
  purple: "#8b5cf6",     // violet-500
  pink: "#ec4899",       // pink-500
};

const SERIES_COLORS = [
  "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6",
  "#ec4899", "#ef4444", "#06b6d4", "#84cc16",
];
```

## Базовые графики

### Line Chart (Продажи по дням)

```tsx
interface SalesData {
  date: string;
  revenue: number;
  orders: number;
}

function SalesLineChart({ data }: { data: SalesData[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="date"
          tickFormatter={(date) => format(new Date(date), "dd.MM")}
          stroke="#9ca3af"
          fontSize={12}
        />
        <YAxis
          yAxisId="left"
          tickFormatter={(value) => formatCompact(value)}
          stroke="#9ca3af"
          fontSize={12}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          stroke="#9ca3af"
          fontSize={12}
        />
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ stroke: "#d1d5db", strokeDasharray: "5 5" }}
        />
        <Legend />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="revenue"
          name="Выручка"
          stroke="#f59e0b"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 6 }}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="orders"
          name="Заказы"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

### Area Chart (с градиентом)

```tsx
function RevenueAreaChart({ data }: { data: SalesData[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="date" tickFormatter={formatDate} />
        <YAxis tickFormatter={formatCompact} />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#f59e0b"
          strokeWidth={2}
          fill="url(#colorRevenue)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
```

### Bar Chart (Сравнение периодов)

```tsx
interface ComparisonData {
  name: string;
  current: number;
  previous: number;
}

function ComparisonBarChart({ data }: { data: ComparisonData[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} barGap={2}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="name" />
        <YAxis tickFormatter={formatCompact} />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Bar
          dataKey="previous"
          name="Прошлый период"
          fill="#d1d5db"
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="current"
          name="Текущий период"
          fill="#f59e0b"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

### Pie/Donut Chart

```tsx
interface CategoryData {
  name: string;
  value: number;
  color: string;
}

function CategoryPieChart({ data }: { data: CategoryData[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          dataKey="value"
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => [formatCurrency(value), "Сумма"]}
        />

        {/* Center label */}
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
          <tspan x="50%" dy="-0.5em" className="text-2xl font-bold">
            {formatCompact(total)}
          </tspan>
          <tspan x="50%" dy="1.5em" className="text-sm text-gray-500">
            Всего
          </tspan>
        </text>
      </PieChart>
    </ResponsiveContainer>
  );
}
```

## KPI Widgets

### Stat Card с трендом

```tsx
interface KPICardProps {
  title: string;
  value: number;
  previousValue?: number;
  format?: "number" | "currency" | "percent";
  icon: React.ReactNode;
  sparklineData?: number[];
}

function KPICard({ title, value, previousValue, format = "number", icon, sparklineData }: KPICardProps) {
  const change = previousValue ? ((value - previousValue) / previousValue) * 100 : 0;
  const trend = change > 0 ? "up" : change < 0 ? "down" : "neutral";

  const formatValue = (val: number) => {
    switch (format) {
      case "currency": return formatCurrency(val);
      case "percent": return `${val.toFixed(1)}%`;
      default: return formatCompact(val);
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {title}
            </p>
            <p className="text-3xl font-bold">{formatValue(value)}</p>

            {previousValue !== undefined && (
              <div className={cn(
                "flex items-center gap-1 text-sm",
                trend === "up" && "text-green-600",
                trend === "down" && "text-red-600",
                trend === "neutral" && "text-gray-500"
              )}>
                {trend === "up" && <TrendingUp className="w-4 h-4" />}
                {trend === "down" && <TrendingDown className="w-4 h-4" />}
                <span>{change > 0 ? "+" : ""}{change.toFixed(1)}%</span>
                <span className="text-gray-400">vs прошлый период</span>
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600">
              {icon}
            </div>

            {sparklineData && (
              <div className="w-20 h-8">
                <ResponsiveContainer>
                  <LineChart data={sparklineData.map((v, i) => ({ v }))}>
                    <Line
                      type="monotone"
                      dataKey="v"
                      stroke={trend === "up" ? "#10b981" : "#ef4444"}
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

### Progress Ring

```tsx
function ProgressRing({ value, max, label, color = "#f59e0b" }: ProgressRingProps) {
  const percentage = (value / max) * 100;
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg className="w-32 h-32 -rotate-90">
        {/* Background circle */}
        <circle
          cx="64"
          cy="64"
          r={radius}
          stroke="#e5e7eb"
          strokeWidth="8"
          fill="none"
        />
        {/* Progress circle */}
        <circle
          cx="64"
          cy="64"
          r={radius}
          stroke={color}
          strokeWidth="8"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold">{percentage.toFixed(0)}%</span>
        <span className="text-xs text-gray-500">{label}</span>
      </div>
    </div>
  );
}
```

## Custom Tooltip

```tsx
function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border p-3 min-w-[150px]">
      <p className="text-sm font-medium text-gray-500 mb-2">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm">{entry.name}</span>
          </div>
          <span className="text-sm font-medium">
            {typeof entry.value === "number"
              ? formatCurrency(entry.value)
              : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}
```

## Тепловая карта (Heatmap)

```tsx
interface HeatmapData {
  day: string;
  hour: number;
  value: number;
}

function SalesHeatmap({ data }: { data: HeatmapData[] }) {
  const maxValue = Math.max(...data.map((d) => d.value));

  const getColor = (value: number) => {
    const intensity = value / maxValue;
    if (intensity < 0.2) return "bg-amber-100";
    if (intensity < 0.4) return "bg-amber-200";
    if (intensity < 0.6) return "bg-amber-300";
    if (intensity < 0.8) return "bg-amber-400";
    return "bg-amber-500";
  };

  const days = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="overflow-x-auto">
      <div className="inline-block">
        {/* Hour labels */}
        <div className="flex gap-1 ml-10 mb-1">
          {hours.map((hour) => (
            <div key={hour} className="w-6 text-center text-xs text-gray-500">
              {hour}
            </div>
          ))}
        </div>

        {/* Grid */}
        {days.map((day, dayIndex) => (
          <div key={day} className="flex items-center gap-1">
            <div className="w-8 text-xs text-gray-500">{day}</div>
            {hours.map((hour) => {
              const cell = data.find(
                (d) => d.day === day && d.hour === hour
              );
              return (
                <Tooltip key={hour} content={`${day} ${hour}:00 - ${cell?.value || 0} продаж`}>
                  <div
                    className={cn(
                      "w-6 h-6 rounded cursor-pointer transition-colors",
                      cell ? getColor(cell.value) : "bg-gray-100"
                    )}
                  />
                </Tooltip>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Форматирование

```typescript
// lib/formatters.ts

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("ru-RU").format(value) + " UZS";
};

export const formatCompact = (value: number): string => {
  if (value >= 1_000_000_000) {
    return (value / 1_000_000_000).toFixed(1) + " млрд";
  }
  if (value >= 1_000_000) {
    return (value / 1_000_000).toFixed(1) + " млн";
  }
  if (value >= 1_000) {
    return (value / 1_000).toFixed(1) + " тыс";
  }
  return value.toString();
};

export const formatPercent = (value: number): string => {
  return value.toFixed(1) + "%";
};

export const formatDate = (date: string): string => {
  return format(new Date(date), "dd.MM", { locale: ru });
};
```

## Период выбора

```tsx
function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const presets = [
    { label: "Сегодня", range: () => ({ from: startOfToday(), to: endOfToday() }) },
    { label: "Вчера", range: () => ({ from: startOfYesterday(), to: endOfYesterday() }) },
    { label: "7 дней", range: () => ({ from: subDays(new Date(), 7), to: new Date() }) },
    { label: "30 дней", range: () => ({ from: subDays(new Date(), 30), to: new Date() }) },
    { label: "Этот месяц", range: () => ({ from: startOfMonth(new Date()), to: new Date() }) },
    { label: "Прошлый месяц", range: () => ({
      from: startOfMonth(subMonths(new Date(), 1)),
      to: endOfMonth(subMonths(new Date(), 1))
    }) },
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-[240px] justify-start">
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value?.from && value?.to
            ? `${format(value.from, "dd.MM.yy")} - ${format(value.to, "dd.MM.yy")}`
            : "Выберите период"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <div className="flex">
          <div className="border-r p-2 space-y-1">
            {presets.map((preset) => (
              <Button
                key={preset.label}
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => onChange(preset.range())}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <Calendar
            mode="range"
            selected={value}
            onSelect={onChange}
            numberOfMonths={2}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

## Ссылки

- `references/recharts-patterns.md` - Все паттерны Recharts
- `references/dashboard-layouts.md` - Макеты дашбордов
