# Системные справочники VendHub Manager

## Введение

Справочники - это фундамент системы. Они обеспечивают:
- Единообразие данных
- Валидацию значений
- Мультиязычность
- Расширяемость

Все справочники имеют структуру:

```typescript
interface Dictionary {
  id: UUID;
  code: string;          // Уникальный код (machine_statuses)
  name: string;          // Название
  name_en?: string;      // Английское название
  name_ru?: string;      // Русское название
  name_uz?: string;      // Узбекское название
  items: DictionaryItem[];
}

interface DictionaryItem {
  id: UUID;
  code: string;          // Уникальный код элемента
  name: string;          // Название
  name_en?: string;
  name_ru?: string;
  name_uz?: string;
  sort_order: number;    // Порядок сортировки
  is_active: boolean;    // Активен ли элемент
  metadata?: JSON;       // Дополнительные данные
}
```

---

## БЛОК 1: Номенклатура и товары

### 1.1. Категории товаров (product_categories)

```yaml
code: product_categories
items:
  - code: hot_drinks
    name: Напитки горячие
    name_en: Hot Drinks
    sort_order: 1

  - code: cold_drinks
    name: Напитки холодные
    name_en: Cold Drinks
    sort_order: 2

  - code: snacks
    name: Снеки
    name_en: Snacks
    sort_order: 3

  - code: consumables
    name: Расходники
    name_en: Consumables
    sort_order: 4

  - code: ingredients
    name: Ингредиенты
    name_en: Ingredients
    sort_order: 5
```

### 1.2. Единицы измерения (units_of_measure)

```yaml
code: units_of_measure
items:
  - code: pcs
    name: штук
    name_en: pieces
    symbol: шт
    sort_order: 1

  - code: kg
    name: килограмм
    name_en: kilograms
    symbol: кг
    sort_order: 2

  - code: g
    name: грамм
    name_en: grams
    symbol: г
    sort_order: 3

  - code: l
    name: литр
    name_en: liters
    symbol: л
    sort_order: 4

  - code: ml
    name: миллилитр
    name_en: milliliters
    symbol: мл
    sort_order: 5

  - code: pack
    name: упаковка
    name_en: package
    symbol: уп
    sort_order: 6
```

### 1.3. Типы рецептов (recipe_types)

```yaml
code: recipe_types
items:
  - code: primary
    name: Основной
    name_en: Primary
    description: Используется по умолчанию
    sort_order: 1

  - code: alternative
    name: Альтернативный
    name_en: Alternative
    description: Временный, при отсутствии ингредиентов
    sort_order: 2

  - code: test
    name: Тестовый
    name_en: Test
    description: Не для продакшена
    sort_order: 3
```

---

## БЛОК 2: Оборудование

### 2.1. Типы компонентов (component_types) ⭐ ОБЯЗАТЕЛЬНО

```yaml
code: component_types
items:
  - code: BUN
    name: Бункер
    name_en: Hopper
    sort_order: 1
    metadata:
      requires_regular_cleaning: true
      cleaning_interval_varies_by_subtype: true

  - code: GRN
    name: Гриндер
    name_en: Grinder
    sort_order: 2
    metadata:
      requires_regular_cleaning: true
      cleaning_interval_days: 10

  - code: BRW
    name: Варочная группа
    name_en: Brewing Unit
    sort_order: 3
    metadata:
      requires_regular_cleaning: true
      cleaning_interval_days: 14

  - code: MIX
    name: Миксер
    name_en: Mixer
    sort_order: 4
    metadata:
      requires_regular_cleaning: true
      cleaning_interval_days: 7

  - code: PMP
    name: Насос
    name_en: Pump
    sort_order: 5
    metadata:
      requires_regular_cleaning: false

  - code: VLV
    name: Клапан
    name_en: Valve
    sort_order: 6
```

### 2.2. Типы бункеров (hopper_types) ⭐ ОБЯЗАТЕЛЬНО

```yaml
code: hopper_types
items:
  - code: coffee
    name: Кофе
    name_en: Coffee
    sort_order: 1
    metadata:
      cleaning_interval_days: 7
      volume_capacity_liters: 2.0

  - code: milk
    name: Молоко
    name_en: Milk
    sort_order: 2
    metadata:
      cleaning_interval_days: 3
      volume_capacity_liters: 3.0
      critical_hygiene: true

  - code: sugar
    name: Сахар
    name_en: Sugar
    sort_order: 3
    metadata:
      cleaning_interval_days: 14
      volume_capacity_liters: 1.5

  - code: cocoa
    name: Какао
    name_en: Cocoa
    sort_order: 4
    metadata:
      cleaning_interval_days: 10
      volume_capacity_liters: 1.0

  - code: matcha
    name: Матча
    name_en: Matcha
    sort_order: 5
    metadata:
      cleaning_interval_days: 10
      volume_capacity_liters: 0.5

  - code: water
    name: Вода
    name_en: Water
    sort_order: 6
    metadata:
      cleaning_interval_days: 30
      volume_capacity_liters: 5.0
```

### 2.3. Типы запчастей (spare_part_types) ⭐ ОБЯЗАТЕЛЬНО

```yaml
code: spare_part_types
items:
  - code: pump
    name: Насосы
    name_en: Pumps
    sort_order: 1

  - code: board
    name: Платы
    name_en: Boards
    sort_order: 2

  - code: sensor
    name: Датчики
    name_en: Sensors
    sort_order: 3

  - code: motor
    name: Моторы
    name_en: Motors
    sort_order: 4

  - code: valve
    name: Клапаны
    name_en: Valves
    sort_order: 5

  - code: seal
    name: Прокладки
    name_en: Seals
    sort_order: 6

  - code: filter
    name: Фильтры
    name_en: Filters
    sort_order: 7

  - code: hose
    name: Шланги
    name_en: Hoses
    sort_order: 8

  - code: display
    name: Дисплеи
    name_en: Displays
    sort_order: 9

  - code: coin_acceptor
    name: Монетоприёмники
    name_en: Coin Acceptors
    sort_order: 10

  - code: bill_acceptor
    name: Купюроприёмники
    name_en: Bill Acceptors
    sort_order: 11
```

### 2.4. Статусы компонентов (component_statuses) ⭐ ОБЯЗАТЕЛЬНО

```yaml
code: component_statuses
items:
  - code: in_machine
    name: В аппарате
    name_en: In Machine
    color: green
    sort_order: 1

  - code: in_storage
    name: На складе
    name_en: In Storage
    color: blue
    sort_order: 2

  - code: being_cleaned
    name: В мойке
    name_en: Being Cleaned
    color: cyan
    sort_order: 3

  - code: with_operator
    name: У оператора
    name_en: With Operator
    color: yellow
    sort_order: 4

  - code: with_technician
    name: У техника
    name_en: With Technician
    color: orange
    sort_order: 5

  - code: faulty
    name: Неисправен
    name_en: Faulty
    color: red
    sort_order: 6

  - code: to_be_written_off
    name: На списание
    name_en: To Be Written Off
    color: gray
    sort_order: 7
```

---

## БЛОК 3: Задачи

### 3.1. Типы задач (task_types) ⭐ ОБЯЗАТЕЛЬНО

```yaml
code: task_types
items:
  - code: refill
    name: Пополнение
    name_en: Refill
    icon: 📦
    requires_photos: true
    requires_items: true
    requires_checklist: true
    sort_order: 1

  - code: collection
    name: Инкассация
    name_en: Collection
    icon: 💰
    requires_photos: true
    requires_amount: true
    sort_order: 2

  - code: repair
    name: Ремонт
    name_en: Repair
    icon: 🔧
    requires_photos: true
    requires_description: true
    sort_order: 3

  - code: maintenance
    name: Техническое обслуживание
    name_en: Maintenance
    icon: ⚙️
    requires_photos: true
    requires_checklist: true
    sort_order: 4

  - code: cleaning
    name: Мойка компонента
    name_en: Cleaning
    icon: 🧼
    requires_photos: true
    requires_component: true
    sort_order: 5

  - code: installation
    name: Установка
    name_en: Installation
    icon: 📥
    requires_photos: true
    requires_component: true
    sort_order: 6

  - code: removal
    name: Снятие
    name_en: Removal
    icon: 📤
    requires_photos: true
    requires_component: true
    sort_order: 7

  - code: inspection
    name: Ревизия
    name_en: Inspection
    icon: 🔍
    requires_photos: true
    requires_items: true
    sort_order: 8
```

### 3.2. Статусы задач (task_statuses) ⭐ ОБЯЗАТЕЛЬНО

```yaml
code: task_statuses
items:
  - code: created
    name: Создана
    name_en: Created
    color: gray
    sort_order: 1

  - code: assigned
    name: Назначена
    name_en: Assigned
    color: blue
    sort_order: 2

  - code: in_progress
    name: В работе
    name_en: In Progress
    color: orange
    sort_order: 3

  - code: postponed
    name: Отложена
    name_en: Postponed
    color: yellow
    sort_order: 4

  - code: completed
    name: Выполнена
    name_en: Completed
    color: green
    sort_order: 5

  - code: cancelled
    name: Отменена
    name_en: Cancelled
    color: red
    sort_order: 6

  - code: overdue
    name: Просрочена
    name_en: Overdue
    color: darkred
    sort_order: 7
```

### 3.3. Приоритеты задач (task_priorities)

```yaml
code: task_priorities
items:
  - code: low
    name: Низкий
    name_en: Low
    color: green
    sort_order: 1

  - code: medium
    name: Средний
    name_en: Medium
    color: yellow
    sort_order: 2

  - code: high
    name: Высокий
    name_en: High
    color: orange
    sort_order: 3

  - code: urgent
    name: Срочный
    name_en: Urgent
    color: red
    sort_order: 4
```

### 3.4. Причины откладывания задачи (postpone_reasons) ⭐ НОВОЕ

```yaml
code: postpone_reasons
items:
  - code: location_closed
    name: Локация закрыта
    name_en: Location Closed
    sort_order: 1

  - code: no_access
    name: Нет доступа
    name_en: No Access
    sort_order: 2

  - code: no_key
    name: Нет ключа
    name_en: No Key
    sort_order: 3

  - code: security_denied
    name: Охрана не пустила
    name_en: Security Denied
    sort_order: 4

  - code: equipment_issue
    name: Проблема с оборудованием
    name_en: Equipment Issue
    sort_order: 5

  - code: no_materials
    name: Нет материалов/запчастей
    name_en: No Materials
    sort_order: 6

  - code: weather
    name: Погодные условия
    name_en: Weather Conditions
    sort_order: 7

  - code: other
    name: Прочее
    name_en: Other
    sort_order: 99
```

---

## БЛОК 4: Финансы

### 4.1. Типы платежей (payment_types)

```yaml
code: payment_types
items:
  - code: cash
    name: Наличные
    name_en: Cash
    icon: 💵
    sort_order: 1

  - code: card
    name: Банковская карта
    name_en: Bank Card
    icon: 💳
    sort_order: 2

  - code: qr
    name: QR-код (Click/Payme)
    name_en: QR Payment
    icon: 📱
    sort_order: 3

  - code: refund
    name: Возврат
    name_en: Refund
    icon: ↩️
    sort_order: 4
```

### 4.2. Категории расходов (expense_categories)

```yaml
code: expense_categories
items:
  - code: purchase_goods
    name: Закупка товаров
    name_en: Purchase of Goods
    sort_order: 1

  - code: purchase_ingredients
    name: Закупка сырья
    name_en: Purchase of Ingredients
    sort_order: 2

  - code: salary
    name: Зарплата
    name_en: Salary
    sort_order: 3

  - code: rent
    name: Аренда
    name_en: Rent
    sort_order: 4

  - code: repair
    name: Ремонт
    name_en: Repair
    sort_order: 5

  - code: spare_parts
    name: Запчасти
    name_en: Spare Parts
    sort_order: 6

  - code: transport
    name: Транспорт
    name_en: Transport
    sort_order: 7

  - code: utilities
    name: Коммунальные услуги
    name_en: Utilities
    sort_order: 8

  - code: taxes
    name: Налоги
    name_en: Taxes
    sort_order: 9

  - code: refund
    name: Возврат клиенту
    name_en: Customer Refund
    sort_order: 10

  - code: other
    name: Прочие
    name_en: Other
    sort_order: 99
```

### 4.3. Категории доходов (income_categories)

```yaml
code: income_categories
items:
  - code: sales
    name: Продажи
    name_en: Sales
    sort_order: 1

  - code: collection
    name: Инкассация
    name_en: Collection
    sort_order: 2

  - code: other
    name: Прочие поступления
    name_en: Other Income
    sort_order: 3
```

### 4.4. НДС группы (vat_groups)

```yaml
code: vat_groups
items:
  - code: vat_12
    name: 12%
    rate: 12
    sort_order: 1

  - code: vat_15
    name: 15%
    rate: 15
    sort_order: 2

  - code: vat_0
    name: 0%
    rate: 0
    sort_order: 3

  - code: vat_exempt
    name: Освобождён от НДС
    name_en: VAT Exempt
    rate: 0
    sort_order: 4
```

---

## БЛОК 5: Статусы

### 5.1. Статусы аппаратов (machine_statuses) ⭐ ОБЯЗАТЕЛЬНО

**Примечание:** Без прямой интеграции статусы обновляются вручную

```yaml
code: machine_statuses
items:
  - code: active
    name: Активен
    name_en: Active
    icon: ✓
    color: green
    sort_order: 1

  - code: inactive
    name: Неактивен
    name_en: Inactive
    icon: ○
    color: gray
    sort_order: 2

  - code: maintenance
    name: На обслуживании
    name_en: Under Maintenance
    icon: ⚙
    color: yellow
    sort_order: 3

  - code: error
    name: Ошибка / Поломка
    name_en: Error / Broken
    icon: ✗
    color: red
    sort_order: 4

  - code: removed
    name: Снят
    name_en: Removed
    icon: —
    color: gray
    sort_order: 5
```

### 5.2. Типы локаций (location_types)

```yaml
code: location_types
items:
  - code: shopping_mall
    name: Торговый центр
    name_en: Shopping Mall
    sort_order: 1

  - code: office
    name: Офисное здание
    name_en: Office Building
    sort_order: 2

  - code: transport_hub
    name: Вокзал / Аэропорт
    name_en: Transport Hub
    sort_order: 3

  - code: street
    name: Улица
    name_en: Street
    sort_order: 4

  - code: education
    name: Учебное заведение
    name_en: Educational Institution
    sort_order: 5

  - code: hospital
    name: Медицинское учреждение
    name_en: Hospital
    sort_order: 6

  - code: hotel
    name: Гостиница
    name_en: Hotel
    sort_order: 7

  - code: factory
    name: Производство / Завод
    name_en: Factory
    sort_order: 8

  - code: other
    name: Прочее
    name_en: Other
    sort_order: 99
```

### 5.3. Типы контрагентов (counterparty_types) ⭐ ОБЯЗАТЕЛЬНО

```yaml
code: counterparty_types
items:
  - code: supplier_goods
    name: Поставщик товаров
    name_en: Goods Supplier
    sort_order: 1

  - code: supplier_ingredients
    name: Поставщик ингредиентов
    name_en: Ingredients Supplier
    sort_order: 2

  - code: supplier_equipment
    name: Поставщик оборудования
    name_en: Equipment Supplier
    sort_order: 3

  - code: location_owner
    name: Владелец локации
    name_en: Location Owner
    sort_order: 4

  - code: service_company
    name: Сервисная компания
    name_en: Service Company
    sort_order: 5

  - code: distributor
    name: Дистрибьютор
    name_en: Distributor
    sort_order: 6
```

---

## БЛОК 6: Движения товаров

### 6.1. Типы движений товаров (inventory_movement_types)

```yaml
code: inventory_movement_types
items:
  - code: refill
    name: Пополнение
    name_en: Refill
    affects_quantity: increase
    sort_order: 1

  - code: sale
    name: Продажа
    name_en: Sale
    affects_quantity: decrease
    sort_order: 2

  - code: recipe_consumption
    name: Списание по рецепту
    name_en: Recipe Consumption
    affects_quantity: decrease
    sort_order: 3

  - code: adjustment
    name: Корректировка
    name_en: Adjustment
    affects_quantity: both
    sort_order: 4

  - code: writeoff
    name: Списание
    name_en: Write-off
    affects_quantity: decrease
    sort_order: 5

  - code: transfer
    name: Перемещение
    name_en: Transfer
    affects_quantity: neutral
    sort_order: 6

  - code: return
    name: Возврат
    name_en: Return
    affects_quantity: increase
    sort_order: 7
```

### 6.2. Причины списания (writeoff_reasons) ⭐ ОБЯЗАТЕЛЬНО

```yaml
code: writeoff_reasons
items:
  - code: defect
    name: Брак
    name_en: Defect
    sort_order: 1

  - code: expired
    name: Истёк срок годности
    name_en: Expired
    sort_order: 2

  - code: damaged
    name: Повреждено
    name_en: Damaged
    sort_order: 3

  - code: lost
    name: Утеря
    name_en: Lost
    sort_order: 4

  - code: return_to_supplier
    name: Возврат поставщику
    name_en: Return to Supplier
    sort_order: 5

  - code: testing
    name: Тестирование
    name_en: Testing
    sort_order: 6

  - code: other
    name: Прочее
    name_en: Other
    sort_order: 99
```

---

## БЛОК 7: Файлы и медиа

### 7.1. Категории файлов (file_categories) ⭐ ОБЯЗАТЕЛЬНО

```yaml
code: file_categories
items:
  - code: task_photo_before
    name: Фото задачи (ДО)
    name_en: Task Photo (Before)
    folder: tasks
    sort_order: 1

  - code: task_photo_after
    name: Фото задачи (ПОСЛЕ)
    name_en: Task Photo (After)
    folder: tasks
    sort_order: 2

  - code: machine_photo
    name: Фото аппарата
    name_en: Machine Photo
    folder: machines
    sort_order: 3

  - code: location_photo
    name: Фото локации
    name_en: Location Photo
    folder: locations
    sort_order: 4

  - code: component_photo
    name: Фото компонента
    name_en: Component Photo
    folder: components
    sort_order: 5

  - code: contract
    name: Договор
    name_en: Contract
    folder: documents
    sort_order: 6

  - code: invoice
    name: Счёт / Накладная
    name_en: Invoice
    folder: documents
    sort_order: 7

  - code: receipt
    name: Чек
    name_en: Receipt
    folder: documents
    sort_order: 8

  - code: import_sales
    name: Файл импорта продаж
    name_en: Sales Import File
    folder: imports
    sort_order: 9

  - code: complaint_photo
    name: Фото жалобы
    name_en: Complaint Photo
    folder: complaints
    sort_order: 10

  - code: other
    name: Прочее
    name_en: Other
    folder: misc
    sort_order: 99
```

---

## БЛОК 8: Уведомления

### 8.1. Типы уведомлений (notification_types)

```yaml
code: notification_types
items:
  - code: task_assigned
    name: Задача назначена
    name_en: Task Assigned
    channels: [telegram, push]
    priority: medium
    sort_order: 1

  - code: task_overdue
    name: Задача просрочена
    name_en: Task Overdue
    channels: [telegram, email, push]
    priority: high
    sort_order: 2

  - code: low_stock
    name: Низкий остаток
    name_en: Low Stock
    channels: [telegram, email]
    priority: medium
    sort_order: 3

  - code: machine_error
    name: Ошибка аппарата
    name_en: Machine Error
    channels: [telegram, email, sms]
    priority: high
    sort_order: 4

  - code: collection_required
    name: Требуется инкассация
    name_en: Collection Required
    channels: [telegram, push]
    priority: medium
    sort_order: 5

  - code: cleaning_required
    name: Требуется мойка
    name_en: Cleaning Required
    channels: [telegram]
    priority: medium
    sort_order: 6

  - code: discrepancy_alert
    name: Расхождение
    name_en: Discrepancy Alert
    channels: [telegram, email, sms]
    priority: high
    sort_order: 7

  - code: expiry_warning
    name: Предупреждение о сроке годности
    name_en: Expiry Warning
    channels: [telegram, email]
    priority: medium
    sort_order: 8

  - code: customer_complaint
    name: Жалоба клиента
    name_en: Customer Complaint
    channels: [telegram, push]
    priority: high
    sort_order: 9

  - code: incident_created
    name: Создан инцидент
    name_en: Incident Created
    channels: [telegram, email]
    priority: high
    sort_order: 10

  - code: system_alert
    name: Системное уведомление
    name_en: System Alert
    channels: [telegram, email]
    priority: medium
    sort_order: 11
```

---

## БЛОК 9: Инциденты ⭐ НОВОЕ

### 9.1. Типы инцидентов (incident_types)

```yaml
code: incident_types
items:
  - code: machine_breakdown
    name: Поломка аппарата
    name_en: Machine Breakdown
    priority_default: high
    sort_order: 1

  - code: money_discrepancy
    name: Расхождение по деньгам
    name_en: Money Discrepancy
    priority_default: high
    sort_order: 2

  - code: operator_violation
    name: Нарушение оператором
    name_en: Operator Violation
    priority_default: medium
    sort_order: 3

  - code: location_complaint
    name: Жалоба от локации
    name_en: Location Complaint
    priority_default: high
    sort_order: 4

  - code: customer_complaint
    name: Жалоба клиента
    name_en: Customer Complaint
    priority_default: high
    sort_order: 5

  - code: component_failure
    name: Отказ компонента
    name_en: Component Failure
    priority_default: high
    sort_order: 6

  - code: quality_issue
    name: Проблема качества
    name_en: Quality Issue
    priority_default: medium
    sort_order: 7

  - code: inventory_issue
    name: Проблема с остатками
    name_en: Inventory Issue
    priority_default: medium
    sort_order: 8

  - code: other
    name: Прочее
    name_en: Other
    priority_default: low
    sort_order: 99
```

### 9.2. Статусы инцидентов (incident_statuses)

```yaml
code: incident_statuses
items:
  - code: reported
    name: Зарегистрирован
    name_en: Reported
    color: red
    sort_order: 1

  - code: investigating
    name: Расследуется
    name_en: Investigating
    color: orange
    sort_order: 2

  - code: in_progress
    name: В работе
    name_en: In Progress
    color: blue
    sort_order: 3

  - code: resolved
    name: Решён
    name_en: Resolved
    color: green
    sort_order: 4

  - code: closed
    name: Закрыт
    name_en: Closed
    color: gray
    sort_order: 5
```

---

## БЛОК 10: Клиентские жалобы ⭐ НОВОЕ

### 10.1. Типы жалоб (complaint_types)

```yaml
code: complaint_types
items:
  - code: product_quality
    name: Качество продукта
    name_en: Product Quality
    sort_order: 1

  - code: payment_issue
    name: Проблема с оплатой
    name_en: Payment Issue
    sort_order: 2

  - code: no_change
    name: Не выдал сдачу
    name_en: No Change Given
    sort_order: 3

  - code: machine_error
    name: Ошибка аппарата
    name_en: Machine Error
    sort_order: 4

  - code: out_of_stock
    name: Нет товара
    name_en: Out of Stock
    sort_order: 5

  - code: dirty_machine
    name: Грязный аппарат
    name_en: Dirty Machine
    sort_order: 6

  - code: no_product_dispensed
    name: Не выдал товар
    name_en: No Product Dispensed
    sort_order: 7

  - code: wrong_product
    name: Выдал не тот товар
    name_en: Wrong Product
    sort_order: 8

  - code: other
    name: Прочее
    name_en: Other
    sort_order: 99
```

### 10.2. Статусы жалоб (complaint_statuses)

```yaml
code: complaint_statuses
items:
  - code: new
    name: Новая
    name_en: New
    color: red
    sort_order: 1

  - code: acknowledged
    name: Принята в работу
    name_en: Acknowledged
    color: orange
    sort_order: 2

  - code: resolved
    name: Решена
    name_en: Resolved
    color: green
    sort_order: 3

  - code: rejected
    name: Отклонена
    name_en: Rejected
    color: gray
    sort_order: 4
```

### 10.3. Источники жалоб (complaint_sources)

```yaml
code: complaint_sources
items:
  - code: qr_scan
    name: QR-код на аппарате
    name_en: QR Scan
    sort_order: 1

  - code: phone
    name: Телефон
    name_en: Phone
    sort_order: 2

  - code: email
    name: Email
    name_en: Email
    sort_order: 3

  - code: telegram
    name: Telegram
    name_en: Telegram
    sort_order: 4

  - code: manual
    name: Внесено вручную
    name_en: Manual Entry
    sort_order: 5
```

---

## БЛОК 11: Пользователи и доступ

### 11.1. Роли пользователей (user_roles)

```yaml
code: user_roles
items:
  - code: super_admin
    name: Супер-администратор
    name_en: Super Administrator
    permissions: all
    sort_order: 1

  - code: admin
    name: Администратор
    name_en: Administrator
    permissions: manage_all_except_system
    sort_order: 2

  - code: manager
    name: Менеджер
    name_en: Manager
    permissions: manage_operations
    sort_order: 3

  - code: operator
    name: Оператор
    name_en: Operator
    permissions: own_tasks_only
    sort_order: 4

  - code: collector
    name: Инкассатор
    name_en: Collector
    permissions: collection_tasks_only
    sort_order: 5

  - code: technician
    name: Техник
    name_en: Technician
    permissions: maintenance_tasks_only
    sort_order: 6

  - code: viewer
    name: Наблюдатель
    name_en: Viewer
    permissions: read_only
    sort_order: 7
```

---

## Загрузка справочников

### Команда для seeding

```bash
npm run seed:dictionaries
```

### Порядок загрузки

1. Базовые справочники (категории, единицы, типы)
2. Оборудование (компоненты, статусы)
3. Задачи (типы, статусы, приоритеты)
4. Финансы (платежи, категории)
5. Инциденты и жалобы
6. Файлы и уведомления

### SQL пример загрузки

```sql
-- Создание справочника
INSERT INTO dictionaries (id, code, name, name_en, created_at)
VALUES (gen_random_uuid(), 'task_types', 'Типы задач', 'Task Types', NOW());

-- Получение ID справочника
SET @dict_id = (SELECT id FROM dictionaries WHERE code = 'task_types');

-- Добавление элементов
INSERT INTO dictionary_items (id, dictionary_id, code, name, name_en, sort_order, is_active)
VALUES
  (gen_random_uuid(), @dict_id, 'refill', 'Пополнение', 'Refill', 1, TRUE),
  (gen_random_uuid(), @dict_id, 'collection', 'Инкассация', 'Collection', 2, TRUE),
  (gen_random_uuid(), @dict_id, 'repair', 'Ремонт', 'Repair', 3, TRUE);
```

---

## Итого

**Всего справочников: 30+**

Разбито по блокам:
- Номенклатура: 3
- Оборудование: 4
- Задачи: 4
- Финансы: 4
- Статусы: 3
- Движения: 2
- Файлы: 1
- Уведомления: 1
- Инциденты: 2
- Жалобы: 3
- Пользователи: 1

Все справочники готовы к использованию в production.
