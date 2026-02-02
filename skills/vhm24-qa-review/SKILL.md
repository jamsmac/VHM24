---
name: vhm24-qa-review
description: |
  VendHub QA Review - проверяет сгенерированный код на качество, консистентность и соответствие стандартам.
  Использовать ПОСЛЕ генерации кода для финальной проверки перед коммитом.
  Triggers: "проверь код", "QA review", "ревью экрана", "проверка качества",
  "найди ошибки", "проверь на баги", "code review"
---

# VendHub QA Review

## 🎯 Когда использовать

```
vhm24-ux-spec → vhm24-ui-generator → [vhm24-qa-review] → Готово!
```

Использовать ПОСЛЕ генерации кода для проверки качества.

---

## ✅ Быстрый чеклист

### Критические (блокеры)
```
□ TypeScript компилируется без ошибок
□ Все imports существуют
□ tRPC endpoints определены
□ Нет hardcoded secrets
```

### Важные
```
□ Dark mode работает
□ Все состояния (loading/empty/error) реализованы
□ Формы валидируются
□ Кнопки имеют обработчики
```

### Желательные
```
□ Accessibility (alt, aria-label)
□ Responsive дизайн
□ Оптимизация производительности
□ Консистентный стиль кода
```

---

## 📋 Полный Review

### 1. Code Quality

**TypeScript:**
```typescript
// ❌ Плохо
const data: any = await fetch();
const handler = (e) => {};

// ✅ Хорошо
const data: Product[] = await trpc.products.list.query();
const handler = (e: React.MouseEvent<HTMLButtonElement>) => {};
```

**Imports:**
```typescript
// ✅ Правильные импорты VendHub
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Coffee, Plus } from "lucide-react";
```

### 2. UI Consistency

**Цвета дизайн-системы:**
```tsx
// ✅ Правильные цвета
className="bg-amber-500 hover:bg-amber-600"  // Primary
className="bg-green-100 text-green-700"      // Success
className="bg-red-100 text-red-700"          // Error
className="bg-blue-100 text-blue-700"        // Info
```

**Dark Mode:**
```tsx
// ✅ С dark mode
className="bg-white dark:bg-gray-800"
className="text-gray-900 dark:text-white"
className="border-gray-200 dark:border-gray-700"
```

### 3. Functionality

**tRPC хуки:**
```tsx
// ✅ Правильное использование
const { data, isLoading, error } = trpc.products.list.useQuery();

const createMutation = trpc.products.create.useMutation({
  onSuccess: () => {
    utils.products.list.invalidate();
    toast.success("Создано");
  },
  onError: (error) => {
    toast.error(error.message);
  },
});
```

**Состояния экрана:**
```tsx
// ✅ Все состояния покрыты
if (isLoading) return <Skeleton />;
if (error) return <Alert variant="destructive">{error.message}</Alert>;
if (!data?.length) return <EmptyState icon={Coffee} title="Нет данных" />;
return <DataTable data={data} />;
```

### 4. Localization

**Русский язык:**
```tsx
// ✅ Русский UI
<Button>Добавить</Button>
<span>Загрузка...</span>
<p>Нет данных</p>
toast.success("Успешно сохранено");
```

**Валюта:**
```tsx
// ✅ Формат UZS
const formatCurrency = (value: number) =>
  new Intl.NumberFormat('ru-RU').format(value) + ' UZS';

// Результат: "1 234 567 UZS"
```

---

## 🔍 Как проводить Review

### Шаг 1: Статический анализ
1. Проверить TypeScript ошибки
2. Проверить импорты
3. Проверить naming conventions

### Шаг 2: UI проверка
1. Открыть в браузере
2. Проверить light/dark mode
3. Проверить responsive (mobile/tablet/desktop)
4. Проверить все состояния

### Шаг 3: Функциональная проверка
1. Протестировать все действия
2. Проверить формы
3. Проверить ошибки
4. Проверить edge cases

### Шаг 4: Документация
1. Заполнить отчёт
2. Список найденных проблем
3. Рекомендации

---

## 📝 Шаблон отчёта

```markdown
## QA Review: [Название экрана]

**Файл:** [path/to/file.tsx]
**Дата:** [YYYY-MM-DD]

### Результаты

| Категория | Статус | Комментарий |
|-----------|--------|-------------|
| TypeScript | ✅ | Без ошибок |
| UI Consistency | ⚠️ | Нет dark mode на badge |
| Functionality | ✅ | Все работает |
| Localization | ✅ | Русский |
| Accessibility | ⚠️ | Нет aria-label на иконках |

### Критические проблемы
_Нет_

### Требует исправления
1. Добавить dark mode для StatusBadge
2. Добавить aria-label на кнопки-иконки

### Рекомендации
1. Использовать useMemo для фильтрации списка

---
**Вердикт:** ⚠️ REQUIRES FIXES
```

---

## References

- **QA Checklist**: See [references/qa-checklist.md](references/qa-checklist.md) - полный чеклист
