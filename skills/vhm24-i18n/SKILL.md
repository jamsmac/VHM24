---
name: vhm24-i18n
description: |
  VendHub Internationalization - русская локализация и интернационализация VendHub.
  Переводы, форматирование дат/чисел/валют для узбекского рынка.
  Использовать при добавлении текстов, форматировании данных, локализации.
---

# VendHub Internationalization

Локализация и интернационализация VendHub OS для узбекского рынка.

## Назначение

- Русская локализация интерфейса
- Форматирование дат, чисел, валют (UZS)
- Единообразие текстов
- Поддержка множественных форм

## Когда использовать

- Добавление текстов в интерфейс
- Форматирование данных для отображения
- Перевод или локализация экрана
- Работа с датами и валютами

## Языковые настройки

### Основной язык: Русский

```typescript
// Локаль
const locale = "ru-RU";

// Часовой пояс (Ташкент)
const timezone = "Asia/Tashkent";

// Валюта
const currency = "UZS";
```

## Форматирование

### Валюта (UZS)

```typescript
// Форматтер
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "UZS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Примеры
formatCurrency(150000);    // "150 000 UZS"
formatCurrency(1500000);   // "1 500 000 UZS"

// Компактный формат
const formatCompactCurrency = (amount: number): string => {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)} млн`;
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(0)} тыс`;
  }
  return formatCurrency(amount);
};

// Примеры
formatCompactCurrency(1500000);  // "1.5 млн"
formatCompactCurrency(150000);   // "150 тыс"
```

### Даты

```typescript
import { format, formatDistance, formatRelative } from "date-fns";
import { ru } from "date-fns/locale";

// Полная дата
format(date, "d MMMM yyyy", { locale: ru });
// "15 января 2026"

// Дата и время
format(date, "d MMM yyyy, HH:mm", { locale: ru });
// "15 янв 2026, 14:30"

// Только время
format(date, "HH:mm", { locale: ru });
// "14:30"

// Относительное время
formatDistance(date, new Date(), { locale: ru, addSuffix: true });
// "5 минут назад"
// "через 2 часа"
// "3 дня назад"

// Календарная дата
formatRelative(date, new Date(), { locale: ru });
// "вчера в 14:30"
// "в понедельник в 10:00"
```

### Числа

```typescript
// Обычные числа
const formatNumber = (num: number): string => {
  return new Intl.NumberFormat("ru-RU").format(num);
};

formatNumber(1234567);  // "1 234 567"

// Проценты
const formatPercent = (value: number): string => {
  return new Intl.NumberFormat("ru-RU", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
};

formatPercent(75.5);  // "75,5 %"

// Единицы измерения
const formatWeight = (grams: number): string => {
  if (grams >= 1000) {
    return `${(grams / 1000).toFixed(1)} кг`;
  }
  return `${grams} г`;
};

const formatVolume = (ml: number): string => {
  if (ml >= 1000) {
    return `${(ml / 1000).toFixed(1)} л`;
  }
  return `${ml} мл`;
};
```

## Множественные формы

### Функция склонения

```typescript
const pluralize = (
  count: number,
  forms: [string, string, string]
): string => {
  const cases = [2, 0, 1, 1, 1, 2];
  const index =
    count % 100 > 4 && count % 100 < 20
      ? 2
      : cases[Math.min(count % 10, 5)];
  return forms[index];
};

// Использование
pluralize(1, ["товар", "товара", "товаров"]);   // "товар"
pluralize(2, ["товар", "товара", "товаров"]);   // "товара"
pluralize(5, ["товар", "товара", "товаров"]);   // "товаров"
pluralize(21, ["товар", "товара", "товаров"]);  // "товар"

// С числом
const formatCount = (
  count: number,
  forms: [string, string, string]
): string => {
  return `${formatNumber(count)} ${pluralize(count, forms)}`;
};

formatCount(5, ["заказ", "заказа", "заказов"]);  // "5 заказов"
formatCount(21, ["день", "дня", "дней"]);        // "21 день"
```

### Частые формы

```typescript
const PLURAL_FORMS = {
  order: ["заказ", "заказа", "заказов"],
  product: ["товар", "товара", "товаров"],
  machine: ["автомат", "автомата", "автоматов"],
  employee: ["сотрудник", "сотрудника", "сотрудников"],
  day: ["день", "дня", "дней"],
  hour: ["час", "часа", "часов"],
  minute: ["минута", "минуты", "минут"],
  item: ["позиция", "позиции", "позиций"],
  task: ["задача", "задачи", "задач"],
  ruble: ["сум", "сума", "сумов"],
} as const;
```

## Стандартные тексты

### Кнопки

```typescript
const BUTTON_LABELS = {
  create: "Создать",
  add: "Добавить",
  edit: "Редактировать",
  delete: "Удалить",
  save: "Сохранить",
  cancel: "Отмена",
  close: "Закрыть",
  confirm: "Подтвердить",
  back: "Назад",
  next: "Далее",
  submit: "Отправить",
  search: "Поиск",
  filter: "Фильтр",
  reset: "Сбросить",
  export: "Экспорт",
  import: "Импорт",
  download: "Скачать",
  upload: "Загрузить",
  refresh: "Обновить",
};
```

### Статусы

```typescript
const STATUS_LABELS = {
  // Общие
  active: "Активный",
  inactive: "Неактивный",
  pending: "Ожидание",
  completed: "Завершён",
  cancelled: "Отменён",

  // Заказы
  new: "Новый",
  processing: "В обработке",
  ready: "Готов",
  delivered: "Доставлен",

  // Автоматы
  online: "Онлайн",
  offline: "Офлайн",
  maintenance: "Обслуживание",
  error: "Ошибка",

  // Задачи
  assigned: "Назначена",
  inProgress: "В работе",
  done: "Выполнена",
  overdue: "Просрочена",
};
```

### Сообщения

```typescript
const MESSAGES = {
  // Успех
  created: "Успешно создано",
  updated: "Успешно обновлено",
  deleted: "Успешно удалено",
  saved: "Изменения сохранены",

  // Ошибки
  error: "Произошла ошибка",
  notFound: "Не найдено",
  accessDenied: "Доступ запрещён",
  invalidData: "Неверные данные",

  // Подтверждения
  confirmDelete: "Вы уверены, что хотите удалить?",
  confirmCancel: "Отменить изменения?",
  unsavedChanges: "Есть несохранённые изменения",

  // Пустые состояния
  noData: "Нет данных",
  noResults: "Ничего не найдено",
  noItems: "Список пуст",

  // Загрузка
  loading: "Загрузка...",
  saving: "Сохранение...",
  deleting: "Удаление...",
};
```

### Поля формы

```typescript
const FIELD_LABELS = {
  name: "Название",
  description: "Описание",
  email: "Email",
  phone: "Телефон",
  address: "Адрес",
  status: "Статус",
  type: "Тип",
  category: "Категория",
  price: "Цена",
  quantity: "Количество",
  date: "Дата",
  time: "Время",
  startDate: "Дата начала",
  endDate: "Дата окончания",
  notes: "Примечания",
  comment: "Комментарий",
};

const FIELD_PLACEHOLDERS = {
  search: "Введите для поиска...",
  name: "Введите название",
  email: "example@mail.com",
  phone: "+998 XX XXX XX XX",
  select: "Выберите...",
};

const VALIDATION_MESSAGES = {
  required: "Обязательное поле",
  minLength: (min: number) => `Минимум ${min} символов`,
  maxLength: (max: number) => `Максимум ${max} символов`,
  email: "Некорректный email",
  phone: "Некорректный номер телефона",
  positive: "Должно быть положительным числом",
  min: (min: number) => `Минимальное значение: ${min}`,
  max: (max: number) => `Максимальное значение: ${max}`,
};
```

## Константы файла локализации

```typescript
// lib/i18n.ts
export const i18n = {
  locale: "ru-RU",
  timezone: "Asia/Tashkent",
  currency: "UZS",

  buttons: BUTTON_LABELS,
  status: STATUS_LABELS,
  messages: MESSAGES,
  fields: FIELD_LABELS,
  placeholders: FIELD_PLACEHOLDERS,
  validation: VALIDATION_MESSAGES,
  plurals: PLURAL_FORMS,

  formatCurrency,
  formatNumber,
  formatDate,
  formatRelativeTime,
  pluralize,
  formatCount,
};
```

## Ссылки

- `references/glossary.md` - Глоссарий терминов VendHub
- `references/date-formats.md` - Форматы дат
