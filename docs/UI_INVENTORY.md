# VHM24 UI Inventory

> Полная инвентаризация пользовательского интерфейса VendHub Manager
> Версия: 2.0 | Дата: 2026-01-26

## Summary Metrics

| Метрика | Значение |
|---------|----------|
| Всего страниц Web | 111 |
| Всего экранов Mobile | 13 |
| Всего API endpoints | 220+ |
| Backend контроллеров | 84 |
| Frontend API клиентов | 37 |

---

## ЧАСТЬ 1: Frontend Web Dashboard

### Навигация и Layout

#### Sidebar Navigation
- **Dashboard** — главная панель
- **Machines** — управление автоматами
- **Tasks** — задачи операторов
- **Inventory** — склад и остатки
- **Transactions** — финансовые операции
- **Reports** — отчётность
- **Equipment** — оборудование и компоненты
- **Settings** — настройки системы

#### Header
- Search — глобальный поиск (Cmd+K)
- Notifications — уведомления
- User menu — профиль пользователя

---

## 1.1 Auth Pages (2 страницы)

### /login

**Route:** `/login`
**Файл:** `frontend/src/app/(auth)/login/page.tsx`
**Размер:** 13 KB
**Статус:** ✅ Реализован

#### Назначение
Авторизация пользователей в системе с поддержкой 2FA.

#### Компоненты
- LoginForm — форма входа
- TwoFactorInput — ввод 2FA кода
- ForgotPasswordLink — восстановление пароля

#### API Integration
| Действие | Method | Endpoint |
|----------|--------|----------|
| Вход | POST | /auth/login |
| 2FA верификация | POST | /auth/2fa/verify |
| 2FA вход | POST | /auth/2fa/login |

---

### /change-password

**Route:** `/change-password`
**Файл:** `frontend/src/app/(auth)/change-password/page.tsx`
**Размер:** 9.7 KB
**Статус:** ✅ Реализован

#### Назначение
Принудительная смена пароля при первом входе.

---

## 1.2 Public Pages (8 страниц)

### /(public)

**Route:** `/`
**Файл:** `frontend/src/app/(public)/page.tsx`
**Размер:** 8.7 KB
**Статус:** ✅ Реализован

#### Назначение
Публичная главная страница для клиентов.

---

### /locations

**Route:** `/locations`
**Файл:** `frontend/src/app/(public)/locations/page.tsx`
**Размер:** 6.5 KB
**Статус:** ✅ Реализован

#### Назначение
Карта расположения автоматов для клиентов.

---

### /menu

**Route:** `/menu`
**Файл:** `frontend/src/app/(public)/menu/page.tsx`
**Размер:** 7.7 KB
**Статус:** ✅ Реализован

#### Назначение
Публичное меню продуктов.

---

### /cooperation

**Route:** `/cooperation`
**Файл:** `frontend/src/app/(public)/cooperation/page.tsx`
**Размер:** 9.5 KB
**Статус:** ✅ Реализован

#### Назначение
Форма заявки на сотрудничество.

---

### /my (Личный кабинет клиента)

| Route | Файл | Размер | Назначение |
|-------|------|--------|------------|
| /my | my/page.tsx | 9.2 KB | Главная ЛК |
| /my/bonuses | my/bonuses/page.tsx | 9.0 KB | Бонусы и баллы |
| /my/history | my/history/page.tsx | 9.2 KB | История заказов |
| /my/settings | my/settings/page.tsx | 9.2 KB | Настройки профиля |

---

## 1.3 Dashboard Pages (91 страница)

### /dashboard (Главная)

**Route:** `/dashboard`
**Файл:** `frontend/src/app/dashboard/page.tsx`
**Размер:** 22 KB
**Статус:** ✅ Реализован

#### Назначение
Главный дашборд с обзором ключевых метрик.

#### Доступ
- Роли: ADMIN, MANAGER, OPERATOR

#### Структура страницы

| Секция | Компоненты | Описание |
|--------|------------|----------|
| Stats Cards | RevenueCard, TasksCard, MachinesCard | Ключевые метрики |
| Charts | RevenueChart, SalesChart | Графики выручки |
| Tables | RecentTasks, ActiveIncidents | Последние события |

#### API Integration
| Действие | Method | Endpoint |
|----------|--------|----------|
| Статистика | GET | /reports/dashboard |
| Недавние задачи | GET | /tasks?limit=5 |
| Активные инциденты | GET | /incidents?status=active |

---

### /dashboard/profile

**Route:** `/dashboard/profile`
**Файл:** `frontend/src/app/dashboard/profile/page.tsx`
**Размер:** 26 KB
**Статус:** ✅ Реализован

#### Назначение
Профиль текущего пользователя, смена пароля, 2FA настройки.

#### API Integration
| Действие | Method | Endpoint |
|----------|--------|----------|
| Профиль | GET | /auth/profile |
| Смена пароля | POST | /auth/first-login-change-password |
| Сессии | GET | /auth/sessions |
| 2FA статус | GET | /auth/2fa/status |

---

### /dashboard/machines (Автоматы)

| Route | Файл | Размер | Назначение |
|-------|------|--------|------------|
| /dashboard/machines | machines/page.tsx | 6.4 KB | Список автоматов |
| /dashboard/machines/[id] | machines/[id]/page.tsx | 12 KB | Детали автомата |
| /dashboard/machines/[id]/access | machines/[id]/access/page.tsx | 5.6 KB | Доступ к автомату |
| /dashboard/machines/[id]/tasks | machines/[id]/tasks/page.tsx | 3.3 KB | Задачи автомата |
| /dashboard/machines/access | machines/access/page.tsx | 6.7 KB | Управление доступом |
| /dashboard/machines/create | machines/create/page.tsx | 6.1 KB | Создание автомата |

#### API Integration (machines)
| Действие | Method | Endpoint |
|----------|--------|----------|
| Список | GET | /machines |
| Детали | GET | /machines/:id |
| Создание | POST | /machines |
| Обновление | PATCH | /machines/:id |
| Удаление | DELETE | /machines/:id |
| Статус | PATCH | /machines/:id/status |
| QR код | GET | /machines/:id/qr-code |

---

### /dashboard/tasks (Задачи)

| Route | Файл | Размер | Назначение |
|-------|------|--------|------------|
| /dashboard/tasks | tasks/page.tsx | 8.3 KB | Список задач |
| /dashboard/tasks/[id] | tasks/[id]/page.tsx | 23 KB | Детали задачи |
| /dashboard/tasks/[id]/complete | tasks/[id]/complete/page.tsx | 13 KB | Завершение задачи |
| /dashboard/tasks/create | tasks/create/page.tsx | 8.7 KB | Создание задачи |
| /dashboard/tasks/mobile | tasks/mobile/page.tsx | 9.1 KB | Мобильный вид |

#### API Integration (tasks)
| Действие | Method | Endpoint |
|----------|--------|----------|
| Список | GET | /tasks |
| Детали | GET | /tasks/:id |
| Создание | POST | /tasks |
| Назначение | POST | /tasks/:id/assign |
| Начать | POST | /tasks/:id/start |
| Завершить | POST | /tasks/:id/complete |
| Отменить | POST | /tasks/:id/cancel |
| Перенести | POST | /tasks/:id/postpone |
| Фото | GET | /tasks/:id/photos |
| Загрузить фото | POST | /tasks/:id/upload-photos |
| Комментарии | GET/POST | /tasks/:id/comments |

---

### /dashboard/inventory (Склад)

| Route | Файл | Размер | Назначение |
|-------|------|--------|------------|
| /dashboard/inventory/warehouse | inventory/warehouse/page.tsx | 4.5 KB | Склад |
| /dashboard/inventory/operators | inventory/operators/page.tsx | 7.3 KB | Остатки операторов |
| /dashboard/inventory/machines | inventory/machines/page.tsx | 9.9 KB | Остатки в автоматах |
| /dashboard/inventory/count | inventory/count/page.tsx | 9.3 KB | Инвентаризация |
| /dashboard/inventory/transfer/warehouse-operator | ... | 8.3 KB | Перемещение склад→оператор |
| /dashboard/inventory/transfer/operator-machine | ... | 11 KB | Перемещение оператор→автомат |

#### API Integration (inventory)
| Действие | Method | Endpoint |
|----------|--------|----------|
| Склад | GET | /inventory/warehouse |
| Оператор | GET | /inventory/operator/:id |
| Автомат | GET | /inventory/machine/:id |
| Перемещение склад→оператор | POST | /inventory/transfer/warehouse-to-operator |
| Перемещение оператор→автомат | POST | /inventory/transfer/operator-to-machine |
| Движения | GET | /inventory/movements |

---

### /dashboard/transactions (Транзакции)

| Route | Файл | Размер | Назначение |
|-------|------|--------|------------|
| /dashboard/transactions | transactions/page.tsx | 8.8 KB | Список транзакций |
| /dashboard/transactions/[id] | transactions/[id]/page.tsx | 11 KB | Детали транзакции |
| /dashboard/transactions/reports | transactions/reports/page.tsx | 12 KB | Отчёты |

#### API Integration (transactions)
| Действие | Method | Endpoint |
|----------|--------|----------|
| Список | GET | /transactions |
| Детали | GET | /transactions/:id |
| Статистика | GET | /transactions/stats |
| Дневная выручка | GET | /transactions/daily-revenue |
| Топ рецептов | GET | /transactions/top-recipes |

---

### /dashboard/equipment (Оборудование)

| Route | Файл | Размер | Назначение |
|-------|------|--------|------------|
| /dashboard/equipment | equipment/page.tsx | 17 KB | Обзор оборудования |
| /dashboard/equipment/components | equipment/components/page.tsx | 13 KB | Компоненты |
| /dashboard/equipment/components/[id] | equipment/components/[id]/page.tsx | 18 KB | Детали компонента |
| /dashboard/equipment/hopper-types | equipment/hopper-types/page.tsx | 18 KB | Типы хопперов |
| /dashboard/equipment/maintenance | equipment/maintenance/page.tsx | 6.9 KB | Обслуживание |
| /dashboard/equipment/spare-parts | equipment/spare-parts/page.tsx | 5.8 KB | Запчасти |
| /dashboard/equipment/washing | equipment/washing/page.tsx | 6.9 KB | Графики мойки |

---

### /dashboard/reports (Отчёты)

| Route | Файл | Размер | Назначение |
|-------|------|--------|------------|
| /dashboard/reports/sales | reports/sales/page.tsx | 3.3 KB | Отчёт по продажам |
| /dashboard/reports/inventory | reports/inventory/page.tsx | 4.0 KB | Отчёт по остаткам |
| /dashboard/reports/inventory-dashboard | reports/inventory-dashboard/page.tsx | 12 KB | Дашборд остатков |
| /dashboard/reports/inventory-differences | reports/inventory-differences/page.tsx | 13 KB | Расхождения |
| /dashboard/reports/financial | reports/financial/page.tsx | 3.3 KB | Финансовый отчёт |
| /dashboard/reports/tasks | reports/tasks/page.tsx | 2.9 KB | Отчёт по задачам |

---

### /dashboard/users (Пользователи)

| Route | Файл | Размер | Назначение |
|-------|------|--------|------------|
| /dashboard/users | users/page.tsx | 9.4 KB | Список пользователей |
| /dashboard/users/[id] | users/[id]/page.tsx | 9.6 KB | Профиль пользователя |
| /dashboard/users/create | users/create/page.tsx | 6.2 KB | Создание пользователя |

---

### /dashboard/locations (Локации)

| Route | Файл | Размер | Назначение |
|-------|------|--------|------------|
| /dashboard/locations | locations/page.tsx | 5.1 KB | Список локаций |
| /dashboard/locations/[id] | locations/[id]/page.tsx | 6.3 KB | Детали локации |
| /dashboard/locations/create | locations/create/page.tsx | 5.7 KB | Создание локации |

---

### /dashboard/products (Продукты)

| Route | Файл | Размер | Назначение |
|-------|------|--------|------------|
| /dashboard/products | products/page.tsx | 7.5 KB | Список продуктов |
| /dashboard/products/[id] | products/[id]/page.tsx | 12 KB | Детали продукта |
| /dashboard/products/create | products/create/page.tsx | 7.4 KB | Создание продукта |

---

### /dashboard/recipes (Рецепты)

| Route | Файл | Размер | Назначение |
|-------|------|--------|------------|
| /dashboard/recipes | recipes/page.tsx | 7.6 KB | Список рецептов |
| /dashboard/recipes/[id] | recipes/[id]/page.tsx | 17 KB | Детали рецепта |
| /dashboard/recipes/create | recipes/create/page.tsx | 13 KB | Создание рецепта |

---

### /dashboard/incidents (Инциденты)

| Route | Файл | Размер | Назначение |
|-------|------|--------|------------|
| /dashboard/incidents | incidents/page.tsx | 4.6 KB | Список инцидентов |
| /dashboard/incidents/[id] | incidents/[id]/page.tsx | 12 KB | Детали инцидента |
| /dashboard/incidents/create | incidents/create/page.tsx | 5.9 KB | Создание инцидента |

---

### /dashboard/complaints (Жалобы)

| Route | Файл | Размер | Назначение |
|-------|------|--------|------------|
| /dashboard/complaints | complaints/page.tsx | 5.9 KB | Список жалоб |
| /dashboard/complaints/[id] | complaints/[id]/page.tsx | 5.9 KB | Детали жалобы |

---

### /dashboard/counterparties (Контрагенты)

| Route | Файл | Размер | Назначение |
|-------|------|--------|------------|
| /dashboard/counterparties | counterparties/page.tsx | 11 KB | Список контрагентов |
| /dashboard/counterparties/[id] | counterparties/[id]/page.tsx | 16 KB | Детали контрагента |
| /dashboard/counterparties/create | counterparties/create/page.tsx | 13 KB | Создание контрагента |

---

### /dashboard/contracts (Договоры)

| Route | Файл | Размер | Назначение |
|-------|------|--------|------------|
| /dashboard/contracts | contracts/page.tsx | 12 KB | Список договоров |
| /dashboard/contracts/[id] | contracts/[id]/page.tsx | 12 KB | Детали договора |
| /dashboard/contracts/create | contracts/create/page.tsx | 19 KB | Создание договора |

---

### /dashboard/purchases (Закупки)

| Route | Файл | Размер | Назначение |
|-------|------|--------|------------|
| /dashboard/purchases | purchases/page.tsx | 9.1 KB | Список закупок |
| /dashboard/purchases/[id] | purchases/[id]/page.tsx | 14 KB | Детали закупки |
| /dashboard/purchases/create | purchases/create/page.tsx | 8.0 KB | Создание закупки |

---

### /dashboard/promo-codes (Промокоды)

| Route | Файл | Размер | Назначение |
|-------|------|--------|------------|
| /dashboard/promo-codes | promo-codes/page.tsx | 16 KB | Список промокодов |
| /dashboard/promo-codes/[id] | promo-codes/[id]/page.tsx | 17 KB | Детали промокода |
| /dashboard/promo-codes/create | promo-codes/create/page.tsx | 13 KB | Создание промокода |

---

### /dashboard/alerts (Алерты)

| Route | Файл | Размер | Назначение |
|-------|------|--------|------------|
| /dashboard/alerts | alerts/page.tsx | 12 KB | Список алертов |
| /dashboard/alerts/[id] | alerts/[id]/page.tsx | 14 KB | Детали алерта |
| /dashboard/alerts/rules | alerts/rules/page.tsx | 17 KB | Правила алертов |

---

### /dashboard/security (Безопасность)

| Route | Файл | Размер | Назначение |
|-------|------|--------|------------|
| /dashboard/security/sessions | security/sessions/page.tsx | 2.8 KB | Активные сессии |
| /dashboard/security/api-keys | security/api-keys/page.tsx | 3.3 KB | API ключи |
| /dashboard/security/audit-logs | security/audit-logs/page.tsx | 5.4 KB | Журнал аудита |
| /dashboard/security/two-factor | security/two-factor/page.tsx | 11 KB | 2FA настройки |
| /dashboard/security/backups | security/backups/page.tsx | 4.9 KB | Резервные копии |
| /dashboard/security/access-control | security/access-control/page.tsx | 2.2 KB | Контроль доступа |

---

### /dashboard/telegram (Telegram интеграция)

| Route | Файл | Размер | Назначение |
|-------|------|--------|------------|
| /dashboard/telegram | telegram/page.tsx | 13 KB | Telegram пользователи |
| /dashboard/telegram/link | telegram/link/page.tsx | 16 KB | Привязка аккаунта |
| /dashboard/telegram/settings | telegram/settings/page.tsx | 15 KB | Настройки бота |

---

### Другие Dashboard страницы

| Route | Файл | Размер | Назначение |
|-------|------|--------|------------|
| /dashboard/analytics | analytics/page.tsx | 16 KB | Аналитика |
| /dashboard/monitoring | monitoring/page.tsx | 9.6 KB | Мониторинг |
| /dashboard/map | map/page.tsx | 11 KB | Карта автоматов |
| /dashboard/scan | scan/page.tsx | 16 KB | Сканер QR |
| /dashboard/import | import/page.tsx | 14 KB | Импорт данных |
| /dashboard/audit | audit/page.tsx | 12 KB | Аудит |
| /dashboard/agents | agents/page.tsx | 23 KB | Агенты интеграции |
| /dashboard/ai-assistant | ai-assistant/page.tsx | 34 KB | AI ассистент |
| /dashboard/commissions | commissions/page.tsx | 13 KB | Комиссии |
| /dashboard/notifications | notifications/page.tsx | 13 KB | Уведомления |
| /dashboard/opening-balances | opening-balances/page.tsx | 17 KB | Начальные остатки |
| /dashboard/scheduled-tasks | scheduled-tasks/page.tsx | 13 KB | Запланированные задачи |
| /dashboard/settings | settings/page.tsx | 14 KB | Настройки |
| /dashboard/settings/ai-providers | settings/ai-providers/page.tsx | 18 KB | AI провайдеры |
| /dashboard/setup-wizard | setup-wizard/page.tsx | 17 KB | Мастер настройки |
| /dashboard/access-requests | access-requests/page.tsx | 17 KB | Запросы доступа |

---

## 1.4 Telegram Mini App (8 страниц)

**Путь:** `frontend/src/app/tg/`

| Route | Файл | Размер | Назначение |
|-------|------|--------|------------|
| /tg | tg/page.tsx | 6.0 KB | Главная TWA |
| /tg/menu | tg/menu/page.tsx | 10 KB | Меню продуктов |
| /tg/cart | tg/cart/page.tsx | 15 KB | Корзина |
| /tg/profile | tg/profile/page.tsx | 8.0 KB | Профиль |
| /tg/profile/bonuses | tg/profile/bonuses/page.tsx | 11 KB | Бонусы |
| /tg/profile/history | tg/profile/history/page.tsx | 14 KB | История заказов |
| /tg/profile/settings | tg/profile/settings/page.tsx | 11 KB | Настройки |
| /tg/profile/help | tg/profile/help/page.tsx | 7.5 KB | Помощь |

### TWA Features
- Theme sync — синхронизация темы с Telegram
- Haptic feedback — вибрация при действиях
- Native navigation — нативная навигация
- Telegram auth — авторизация через Telegram

---

## ЧАСТЬ 2: Mobile App (13 экранов)

**Путь:** `mobile/src/screens/`

### Auth

| Экран | Файл | Размер | Назначение |
|-------|------|--------|------------|
| LoginScreen | Auth/LoginScreen.tsx | 4.1 KB | Авторизация |

### Tasks

| Экран | Файл | Размер | Назначение |
|-------|------|--------|------------|
| TaskListScreen | Tasks/TaskListScreen.tsx | 9.1 KB | Список задач |
| TaskDetailScreen | Tasks/TaskDetailScreen.tsx | 22 KB | Детали задачи |
| TaskCameraScreen | Tasks/TaskCameraScreen.tsx | 13 KB | Камера для фото |

### Profile

| Экран | Файл | Размер | Назначение |
|-------|------|--------|------------|
| ProfileScreen | Profile/ProfileScreen.tsx | 18 KB | Профиль оператора |

### Equipment

| Экран | Файл | Размер | Назначение |
|-------|------|--------|------------|
| EquipmentMapScreen | Equipment/EquipmentMapScreen.tsx | 19 KB | Карта оборудования |

### Client (для клиентов)

| Экран | Файл | Размер | Назначение |
|-------|------|--------|------------|
| ClientMenuScreen | Client/ClientMenuScreen.tsx | 11 KB | Меню |
| ClientProfileScreen | Client/ClientProfileScreen.tsx | 7.2 KB | Профиль клиента |
| OrdersScreen | Client/OrdersScreen.tsx | 7.2 KB | Заказы |
| LoyaltyScreen | Client/LoyaltyScreen.tsx | 8.0 KB | Лояльность |
| QrScanScreen | Client/QrScanScreen.tsx | 6.4 KB | Сканер QR |
| LocationsScreen | Client/LocationsScreen.tsx | 7.2 KB | Локации |

### Компоненты

| Компонент | Файл | Размер |
|-----------|------|--------|
| LoadingScreen | components/LoadingScreen.tsx | 4.0 KB |

### Native Features
- Camera — съёмка фото для задач
- Geolocation — определение местоположения
- Push Notifications — push уведомления
- Offline Storage — работа офлайн

---

## ЧАСТЬ 3: Размеры файлов

### Самые большие страницы (Web)

| Route | Размер | Описание |
|-------|--------|----------|
| /dashboard/ai-assistant | 34 KB | AI ассистент |
| /dashboard/profile | 26 KB | Профиль пользователя |
| /dashboard/agents | 23 KB | Агенты интеграции |
| /dashboard/tasks/[id] | 23 KB | Детали задачи |
| /dashboard/page | 22 KB | Главный дашборд |

### Самые большие экраны (Mobile)

| Экран | Размер | Описание |
|-------|--------|----------|
| TaskDetailScreen | 22 KB | Детали задачи |
| EquipmentMapScreen | 19 KB | Карта оборудования |
| ProfileScreen | 18 KB | Профиль оператора |
| TaskCameraScreen | 13 KB | Камера |

---

*Документ сгенерирован автоматически на основе анализа исходного кода VHM24*
