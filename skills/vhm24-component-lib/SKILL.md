---
name: vhm24-component-lib
description: |
  VendHub Component Library - создаёт кастомные shadcn/ui компоненты для VendHub.
  Разрабатывает переиспользуемые UI компоненты, соблюдая дизайн-систему "Warm Brew".
  Использовать при создании новых базовых компонентов, кастомизации shadcn/ui.
---

# VendHub Component Library

Библиотека переиспользуемых компонентов на базе shadcn/ui для VendHub OS.

## Назначение

- Создание кастомных UI компонентов
- Расширение shadcn/ui компонентов
- Соблюдение дизайн-системы "Warm Brew"
- Единообразие интерфейса

## Когда использовать

- Нужен компонент, которого нет в shadcn/ui
- Требуется кастомизация существующего компонента
- Создание составных компонентов
- Компонент будет использоваться в нескольких местах

## Дизайн-система "Warm Brew"

### Цветовая палитра

```css
/* Основные цвета */
--primary: amber-600       /* #d97706 */
--primary-hover: amber-700 /* #b45309 */
--secondary: amber-100     /* #fef3c7 */

/* Акценты */
--accent: orange-500       /* #f97316 */
--success: emerald-500     /* #10b981 */
--warning: amber-500       /* #f59e0b */
--error: red-500           /* #ef4444 */

/* Нейтральные */
--background: stone-50     /* #fafaf9 */
--surface: white
--border: stone-200        /* #e7e5e4 */
--text: stone-900          /* #1c1917 */
--muted: stone-500         /* #78716c */

/* Dark mode */
--dark-bg: stone-900
--dark-surface: stone-800
--dark-border: stone-700
```

### Типографика

```css
/* Шрифты */
font-family: 'Inter', sans-serif;

/* Размеры */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
```

### Отступы и скругления

```css
/* Spacing */
--space-1: 0.25rem;  /* 4px */
--space-2: 0.5rem;   /* 8px */
--space-3: 0.75rem;  /* 12px */
--space-4: 1rem;     /* 16px */
--space-6: 1.5rem;   /* 24px */
--space-8: 2rem;     /* 32px */

/* Border radius */
--radius-sm: 0.25rem;
--radius-md: 0.375rem;
--radius-lg: 0.5rem;
--radius-xl: 0.75rem;
```

## Базовые компоненты VendHub

### StatusBadge

```tsx
// components/ui/status-badge.tsx
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "~/lib/utils";

const statusBadgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-300",
        success: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
        warning: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
        error: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
        info: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
  children: React.ReactNode;
}

export function StatusBadge({ className, variant, children, ...props }: StatusBadgeProps) {
  return (
    <span className={cn(statusBadgeVariants({ variant }), className)} {...props}>
      {children}
    </span>
  );
}
```

### DataCard

```tsx
// components/ui/data-card.tsx
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { cn } from "~/lib/utils";
import type { LucideIcon } from "lucide-react";

interface DataCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function DataCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  className,
}: DataCardProps) {
  return (
    <Card className={cn("", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        {trend && (
          <p className={cn(
            "text-xs",
            trend.isPositive ? "text-emerald-600" : "text-red-600"
          )}>
            {trend.isPositive ? "+" : ""}{trend.value}%
          </p>
        )}
      </CardContent>
    </Card>
  );
}
```

### PageHeader

```tsx
// components/ui/page-header.tsx
import { Button } from "~/components/ui/button";
import { Plus } from "lucide-react";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  children?: React.ReactNode;
}

export function PageHeader({ title, description, action, children }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between pb-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-4">
        {children}
        {action && (
          <Button onClick={action.onClick} className="bg-amber-600 hover:bg-amber-700">
            {action.icon || <Plus className="mr-2 h-4 w-4" />}
            {action.label}
          </Button>
        )}
      </div>
    </div>
  );
}
```

### DataTable с фильтрами

```tsx
// components/ui/data-table.tsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";

interface Column<T> {
  key: keyof T | string;
  header: string;
  cell?: (item: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  searchPlaceholder?: string;
  onSearch?: (value: string) => void;
  pagination?: {
    page: number;
    pages: number;
    onPageChange: (page: number) => void;
  };
  isLoading?: boolean;
  emptyMessage?: string;
}

export function DataTable<T extends { id: number | string }>({
  columns,
  data,
  searchPlaceholder = "Поиск...",
  onSearch,
  pagination,
  isLoading,
  emptyMessage = "Нет данных",
}: DataTableProps<T>) {
  return (
    <div className="space-y-4">
      {onSearch && (
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              className="pl-9"
              onChange={(e) => onSearch(e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={String(column.key)} className={column.className}>
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8">
                  Загрузка...
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8 text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => (
                <TableRow key={item.id}>
                  {columns.map((column) => (
                    <TableCell key={String(column.key)} className={column.className}>
                      {column.cell
                        ? column.cell(item)
                        : String(item[column.key as keyof T] ?? "")}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => pagination.onPageChange(pagination.page - 1)}
            disabled={pagination.page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            {pagination.page} / {pagination.pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => pagination.onPageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.pages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
```

## Создание нового компонента

### Шаг 1: Определить интерфейс

```typescript
interface MyComponentProps {
  // Обязательные
  title: string;

  // Опциональные
  description?: string;
  variant?: "default" | "primary" | "secondary";
  size?: "sm" | "md" | "lg";

  // Callback
  onClick?: () => void;

  // Children
  children?: React.ReactNode;

  // Расширение HTML
  className?: string;
}
```

### Шаг 2: Использовать CVA для вариантов

```typescript
import { cva, type VariantProps } from "class-variance-authority";

const myComponentVariants = cva(
  // Базовые стили
  "inline-flex items-center justify-center rounded-md font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-stone-100 text-stone-900",
        primary: "bg-amber-600 text-white hover:bg-amber-700",
        secondary: "bg-amber-100 text-amber-900",
      },
      size: {
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4",
        lg: "h-12 px-6 text-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);
```

### Шаг 3: Реализовать компонент

```typescript
import { cn } from "~/lib/utils";

export function MyComponent({
  title,
  description,
  variant,
  size,
  onClick,
  children,
  className,
}: MyComponentProps & VariantProps<typeof myComponentVariants>) {
  return (
    <div
      className={cn(myComponentVariants({ variant, size }), className)}
      onClick={onClick}
    >
      <span>{title}</span>
      {description && <span className="text-muted-foreground">{description}</span>}
      {children}
    </div>
  );
}
```

## Специфичные компоненты VendHub

### MachineStatusCard

Карточка статуса вендингового автомата.

### IngredientLevel

Индикатор уровня ингредиента в бункере.

### OrderTimeline

Таймлайн истории заказа.

### SalesChart

График продаж (recharts).

### TaskCard

Карточка задачи для сотрудника.

## Ссылки

- `references/component-catalog.md` - Каталог всех компонентов
- `references/design-tokens.md` - Дизайн токены
- `assets/component-template.tsx` - Шаблон компонента
