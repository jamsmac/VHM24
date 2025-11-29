# VendHub Manager Frontend

Web-интерфейс для системы управления вендинговыми автоматами.

## Технологии

- **Next.js 14** - React фреймворк с App Router
- **TypeScript** - типизация
- **Tailwind CSS** - стилизация
- **Zustand** - управление состоянием
- **React Hook Form** - работа с формами
- **Axios** - HTTP клиент

## Быстрый старт

### Локальная разработка

```bash
# Установка зависимостей
npm install

# Запуск в dev режиме
npm run dev
```

Откройте http://localhost:3001

### С Docker

```bash
# Из корня проекта
docker-compose up frontend
```

## Структура проекта

```
frontend/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── (auth)/       # Группа аутентификации
│   │   ├── (dashboard)/  # Группа дашборда
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/       # React компоненты
│   │   ├── ui/          # UI компоненты
│   │   ├── forms/       # Формы
│   │   └── layout/      # Компоненты макета
│   ├── lib/             # Утилиты
│   ├── hooks/           # Custom hooks
│   ├── types/           # TypeScript типы
│   └── store/           # Zustand store
└── public/              # Статические файлы
```

## Переменные окружения

Создайте `.env.local` файл:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## Команды

```bash
# Разработка
npm run dev             # Запуск dev сервера
npm run build          # Сборка для production
npm run start          # Запуск production сервера

# Линтинг и типы
npm run lint           # ESLint проверка
npm run type-check     # TypeScript проверка
```

## Основные страницы

- `/` - Главная страница
- `/login` - Авторизация
- `/dashboard` - Дашборд
- `/tasks` - Задачи
- `/machines` - Аппараты
- `/inventory` - Склад
- `/reports` - Отчеты

## Стилизация

Используется Tailwind CSS. Основные цвета настроены в `tailwind.config.js`:

```js
colors: {
  primary: { ... }  // Основной цвет
}
```
