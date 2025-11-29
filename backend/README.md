# VendHub Manager Backend

Backend API для системы управления вендинговыми автоматами.

## Технологии

- **NestJS** - прогрессивный Node.js фреймворк
- **TypeORM** - ORM для работы с PostgreSQL
- **PostgreSQL 14** - база данных
- **Redis** - кеширование и сессии
- **JWT** - аутентификация
- **Swagger** - документация API

## Быстрый старт

### Локальная разработка

```bash
# Установка зависимостей
npm install

# Запуск в dev режиме
npm run start:dev
```

### С Docker

```bash
# Из корня проекта
docker-compose up backend
```

## API Документация

После запуска сервера документация доступна по адресу:
- **Swagger UI**: http://localhost:3000/api/docs

## Структура проекта

```
backend/
├── src/
│   ├── modules/          # Модули приложения
│   │   ├── auth/         # Аутентификация и авторизация
│   │   ├── users/        # Пользователи
│   │   ├── dictionaries/ # Справочники
│   │   ├── tasks/        # Задачи
│   │   └── ...
│   ├── common/           # Общие компоненты
│   │   ├── decorators/
│   │   ├── guards/
│   │   ├── interceptors/
│   │   └── entities/
│   ├── config/           # Конфигурация
│   └── database/         # Миграции и seeds
├── test/                 # E2E тесты
└── uploads/             # Загруженные файлы
```

## Переменные окружения

Создайте `.env` файл (см. `.env.example`):

```env
DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_NAME=vendhub
DATABASE_USER=vendhub
DATABASE_PASSWORD=vendhub_password_dev

JWT_SECRET=your_secret_key
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
```

## Команды

```bash
# Разработка
npm run start:dev        # Запуск с hot-reload
npm run build           # Сборка проекта
npm run start:prod      # Запуск production

# Тестирование
npm run test            # Unit тесты
npm run test:cov        # С покрытием
npm run test:e2e        # E2E тесты

# База данных
npm run migration:generate -- AddUserTable  # Создать миграцию
npm run migration:run                       # Применить миграции
npm run migration:revert                    # Откатить миграцию
npm run seed                                # Заполнить тестовыми данными

# Линтинг
npm run lint            # Проверка кода
npm run format          # Форматирование кода
```

## Health Check

```bash
curl http://localhost:3000/api/v1/health
```

Ответ:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "service": "VendHub Manager API"
}
```
