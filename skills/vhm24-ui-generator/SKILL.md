---
name: vhm24-ui-generator
description: |
  Generate consistent TypeScript/React screens for VendHub OS vending machine management system.
  Full-stack patterns: shadcn/ui components, tRPC API, Drizzle ORM, Zustand stores.
  ВАЖНО: Перед генерацией используй vhm24-ux-spec для создания спецификации!
  Triggers: "создай экран", "добавь страницу", "сделай модалку", "UI для VendHub",
  "новый модуль VendHub", "экран для автоматов", "VHM24 screen", "vendhub page",
  "admin page", "tRPC router", "database table"
---

# VHM24 UI Generator

Generate full-stack React/TypeScript screens for VendHub OS following the "Warm Brew" design system.

## ⚠️ Prerequisite

**Перед генерацией кода ОБЯЗАТЕЛЬНО:**
1. Использовать `vhm24-ux-spec` для создания спецификации
2. Получить утверждение спецификации
3. Только потом генерировать код

```
vhm24-ux-spec (спецификация) → [Утверждение] → vhm24-ui-generator (код)
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Tailwind CSS |
| Components | shadcn/ui, Lucide React icons |
| Data Fetching | tRPC, React Query |
| State | Zustand |
| Backend | Express, tRPC, Zod |
| Database | MySQL, Drizzle ORM |
| Auth | Telegram WebApp, Cookies |

## Quick Start

### Admin Page Template
```tsx
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Plus, Coffee } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PageName() {
  const { data, isLoading } = trpc.resourceName.list.useQuery();

  return (
    <AdminLayout title="Заголовок" description="Описание страницы">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Метрика" value={data?.length || 0} icon={<Coffee />} />
      </div>

      {/* Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Список
            <Button size="sm"><Plus className="w-4 h-4 mr-2" />Добавить</Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Table or grid */}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
```

### StatCard Component
```tsx
interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  trend?: "up" | "down" | "neutral";
}

function StatCard({ title, value, change, icon, trend }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
            {change !== undefined && (
              <span className={cn("text-sm", trend === "up" ? "text-green-600" : "text-red-600")}>
                {change > 0 ? "+" : ""}{change}%
              </span>
            )}
          </div>
          <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

### Status Badge Pattern
```tsx
const statusConfig: Record<string, { label: string; className: string }> = {
  online: { label: "Онлайн", className: "bg-green-100 text-green-700 dark:bg-green-900/30" },
  offline: { label: "Офлайн", className: "bg-red-100 text-red-700 dark:bg-red-900/30" },
  maintenance: { label: "ТО", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30" },
  pending: { label: "Ожидает", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30" },
};

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || statusConfig.pending;
  return (
    <span className={cn("px-2 py-1 rounded-full text-xs font-medium", config.className)}>
      {config.label}
    </span>
  );
}
```

## tRPC Router Pattern
```typescript
// server/routers/resourceName.ts
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";

export const resourceRouter = router({
  list: protectedProcedure.query(async () => {
    return await db.getAllResources();
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await db.getResourceById(input.id);
    }),

  create: adminProcedure
    .input(z.object({
      name: z.string().min(1),
      status: z.enum(["active", "inactive"]),
    }))
    .mutation(async ({ input }) => {
      return await db.createResource(input);
    }),

  update: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      status: z.enum(["active", "inactive"]).optional(),
    }))
    .mutation(async ({ input }) => {
      return await db.updateResource(input.id, input);
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return await db.deleteResource(input.id);
    }),
});
```

## Colors

```
Primary:    amber-500 (#f59e0b) - buttons, active states, accents
Success:    green-500 (#10b981) - online, completed, positive
Error:      red-500 (#ef4444) - offline, cancelled, negative
Warning:    yellow-500 (#eab308) - pending, maintenance
Info:       blue-500 (#3b82f6) - info, in_progress
Background: gray-50 (light) / gray-900 (dark)
```

## Dark Mode

Always include dark mode variants:
```tsx
className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
className="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
className="border-gray-200 dark:border-gray-700"
```

## Currency Formatting
```typescript
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('ru-RU').format(value) + ' UZS';
};

// Usage: formatCurrency(2450000) → "2 450 000 UZS"
```

## Checklist

Before completing, verify:

- [ ] TypeScript with proper interfaces
- [ ] Uses shadcn/ui components (Card, Button, Input, etc.)
- [ ] tRPC hooks for data fetching
- [ ] Dark mode support (dark: prefix)
- [ ] Russian language UI
- [ ] Currency in UZS format
- [ ] Lucide React icons
- [ ] Responsive grid (md:, lg: breakpoints)
- [ ] Loading states with Spinner
- [ ] Empty states for lists

## References

- **Design System**: See [references/design-system.md](references/design-system.md) - colors, typography
- **Screen Patterns**: See [references/screen-patterns.md](references/screen-patterns.md) - dashboard, list, detail, form
- **Navigation Map**: See [references/navigation-map.md](references/navigation-map.md) - button → screen mapping
- **TypeScript Patterns**: See [references/typescript-patterns.md](references/typescript-patterns.md) - props, hooks, forms
- **Database Schema**: See [references/database-schema.md](references/database-schema.md) - tables, enums, relations

## Assets

- `components.jsx` - Legacy shared UI components (for reference)
- `constants.js` - Status/type constants, formatters
