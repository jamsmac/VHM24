# Схема базы данных VendHub Manager

## Общая информация

**СУБД**: PostgreSQL 14+
**Общее количество таблиц**: ~45
**Партиционирование**: транзакции, audit_logs (по месяцам)
**Индексы**: на всех foreign keys, часто используемых полях

---

## Структура таблиц по блокам

### БЛОК 1: Фундамент

#### 1.1. users (Пользователи)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,

  role_id UUID REFERENCES dictionary_items(id), -- справочник user_roles

  is_active BOOLEAN DEFAULT TRUE,
  is_2fa_enabled BOOLEAN DEFAULT FALSE,
  totp_secret VARCHAR(32),

  last_login_at TIMESTAMP,
  last_login_ip INET,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id)
);

CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
```

#### 1.2. dictionaries (Справочники)

```sql
CREATE TABLE dictionaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  name_en VARCHAR(255),
  name_ru VARCHAR(255),
  name_uz VARCHAR(255),
  description TEXT,

  is_system BOOLEAN DEFAULT FALSE, -- системный справочник (нельзя удалить)
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_dictionaries_code ON dictionaries(code);
```

#### 1.3. dictionary_items (Элементы справочников)

```sql
CREATE TABLE dictionary_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dictionary_id UUID REFERENCES dictionaries(id) ON DELETE CASCADE,

  code VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  name_en VARCHAR(255),
  name_ru VARCHAR(255),
  name_uz VARCHAR(255),

  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,

  metadata JSONB, -- дополнительные поля специфичные для каждого справочника

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(dictionary_id, code)
);

CREATE INDEX idx_dict_items_dict ON dictionary_items(dictionary_id);
CREATE INDEX idx_dict_items_code ON dictionary_items(code);
CREATE INDEX idx_dict_items_active ON dictionary_items(is_active);
```

#### 1.4. settings (Глобальные настройки)

```sql
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT,
  value_type VARCHAR(50) DEFAULT 'string', -- string, number, boolean, json

  group_name VARCHAR(100), -- company, localization, integrations, sla, etc.
  description TEXT,

  is_system BOOLEAN DEFAULT FALSE,
  is_encrypted BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_settings_key ON settings(key);
CREATE INDEX idx_settings_group ON settings(group_name);
```

---

### БЛОК 2: Локации и аппараты

#### 2.1. locations (Локации)

```sql
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,

  type_id UUID REFERENCES dictionary_items(id), -- location_types

  address TEXT NOT NULL,
  city VARCHAR(100),
  district VARCHAR(100),

  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),

  owner_id UUID REFERENCES counterparties(id), -- владелец локации

  contact_person VARCHAR(255),
  contact_phone VARCHAR(20),
  contact_email VARCHAR(255),

  access_schedule TEXT, -- "Пн-Пт 8:00-20:00, Сб-Вс 10:00-18:00"
  access_notes TEXT, -- "Ключ у охраны, вход с торца"

  commission_percent DECIMAL(5, 2), -- процент владельцу локации
  monthly_rent DECIMAL(12, 2), -- фиксированная аренда

  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_locations_code ON locations(code);
CREATE INDEX idx_locations_owner ON locations(owner_id);
CREATE INDEX idx_locations_type ON locations(type_id);
CREATE INDEX idx_locations_active ON locations(is_active);
```

#### 2.2. machines (Аппараты)

```sql
CREATE TABLE machines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL, -- MAC-001
  name VARCHAR(255) NOT NULL,

  manufacturer VARCHAR(100),
  model VARCHAR(100),
  serial_number VARCHAR(100) UNIQUE,
  manufacturing_year INT,

  location_id UUID REFERENCES locations(id),

  assigned_operator_id UUID REFERENCES users(id),
  assigned_technician_id UUID REFERENCES users(id),

  status_id UUID REFERENCES dictionary_items(id), -- machine_statuses

  -- Характеристики (без прямой интеграции - заполняются вручную)
  capacity_cups INT, -- емкость стаканов
  max_products INT, -- максимум товарных позиций

  -- Финансовые данные (обновляются вручную через задачи)
  purchase_price DECIMAL(12, 2),
  purchase_date DATE,
  depreciation_period_months INT DEFAULT 36, -- 3 года
  residual_value DECIMAL(12, 2),

  -- Даты обслуживания (обновляются через задачи)
  last_maintenance_at TIMESTAMP,
  maintenance_interval_days INT DEFAULT 30,

  last_collection_at TIMESTAMP,

  installation_date DATE,
  removal_date DATE,

  notes TEXT,

  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_machines_code ON machines(code);
CREATE INDEX idx_machines_location ON machines(location_id);
CREATE INDEX idx_machines_operator ON machines(assigned_operator_id);
CREATE INDEX idx_machines_status ON machines(status_id);
CREATE INDEX idx_machines_active ON machines(is_active);
```

---

### БЛОК 3: Номенклатура

#### 3.1. nomenclature (Номенклатура: товары и ингредиенты)

```sql
CREATE TABLE nomenclature (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,

  type VARCHAR(20) NOT NULL, -- 'product' или 'ingredient'
  category_id UUID REFERENCES dictionary_items(id), -- product_categories

  unit_id UUID REFERENCES dictionary_items(id), -- units_of_measure

  -- Цены
  purchase_price DECIMAL(12, 2), -- цена закупки
  sale_price DECIMAL(12, 2), -- цена продажи

  -- Штрих-код
  barcode VARCHAR(100),
  sku VARCHAR(100),

  -- Срок годности (для ингредиентов)
  shelf_life_days INT, -- срок годности в днях
  expiry_alert_days INT DEFAULT 7, -- за сколько дней предупреждать

  -- НДС
  vat_group_id UUID REFERENCES dictionary_items(id), -- vat_groups

  -- Использование (для контроля перед удалением)
  used_in_recipes_count INT DEFAULT 0,
  used_in_machines_count INT DEFAULT 0,
  can_delete BOOLEAN DEFAULT TRUE, -- автоматически false если используется

  -- Изображение
  image_url TEXT,

  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_nomenclature_code ON nomenclature(code);
CREATE INDEX idx_nomenclature_type ON nomenclature(type);
CREATE INDEX idx_nomenclature_category ON nomenclature(category_id);
CREATE INDEX idx_nomenclature_barcode ON nomenclature(barcode);
CREATE INDEX idx_nomenclature_active ON nomenclature(is_active);
```

#### 3.2. recipes (Рецепты)

```sql
CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  product_id UUID REFERENCES nomenclature(id), -- товар (напиток)

  version INT DEFAULT 1,
  recipe_type_id UUID REFERENCES dictionary_items(id), -- recipe_types (primary/alternative/test)

  name VARCHAR(255), -- "Капучино стандартный"
  description TEXT,

  -- Себестоимость (рассчитывается автоматически)
  cost_price DECIMAL(12, 2),

  is_active BOOLEAN DEFAULT TRUE,
  activated_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  UNIQUE(product_id, version)
);

CREATE INDEX idx_recipes_product ON recipes(product_id);
CREATE INDEX idx_recipes_type ON recipes(recipe_type_id);
CREATE INDEX idx_recipes_active ON recipes(is_active);
```

#### 3.3. recipe_items (Состав рецепта)

```sql
CREATE TABLE recipe_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,

  ingredient_id UUID REFERENCES nomenclature(id), -- ингредиент

  quantity DECIMAL(10, 3) NOT NULL, -- количество
  unit_id UUID REFERENCES dictionary_items(id), -- units_of_measure

  cost DECIMAL(12, 2), -- стоимость этого ингредиента в рецепте

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_recipe_items_recipe ON recipe_items(recipe_id);
CREATE INDEX idx_recipe_items_ingredient ON recipe_items(ingredient_id);
```

---

### БЛОК 4: Задачи

#### 4.1. tasks (Задачи)

```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL, -- TSK-12345

  type_id UUID REFERENCES dictionary_items(id), -- task_types
  status_id UUID REFERENCES dictionary_items(id), -- task_statuses
  priority_id UUID REFERENCES dictionary_items(id), -- task_priorities

  title VARCHAR(255) NOT NULL,
  description TEXT,

  machine_id UUID REFERENCES machines(id),
  location_id UUID REFERENCES locations(id),

  assigned_to UUID REFERENCES users(id),
  created_by UUID REFERENCES users(id),

  -- Даты
  scheduled_date TIMESTAMP, -- планируемая дата
  deadline TIMESTAMP, -- крайний срок

  started_at TIMESTAMP,
  completed_at TIMESTAMP,

  -- Фактические данные (для инкассации)
  expected_amount DECIMAL(12, 2), -- ожидаемая сумма
  actual_amount DECIMAL(12, 2), -- фактическая сумма
  discrepancy DECIMAL(12, 2), -- расхождение
  discrepancy_percent DECIMAL(5, 2),

  -- Откладывание задачи
  postpone_count INT DEFAULT 0,
  postpone_reason_id UUID REFERENCES dictionary_items(id), -- postpone_reasons
  postpone_comment TEXT,
  postpone_until TIMESTAMP,
  postponed_at TIMESTAMP,

  -- Привязка к компоненту (для мойки/установки)
  component_id UUID REFERENCES components(id),

  -- Результат
  result TEXT,

  -- Валидация
  has_photos_before BOOLEAN DEFAULT FALSE,
  has_photos_after BOOLEAN DEFAULT FALSE,
  checklist_completed BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tasks_code ON tasks(code);
CREATE INDEX idx_tasks_type ON tasks(type_id);
CREATE INDEX idx_tasks_status ON tasks(status_id);
CREATE INDEX idx_tasks_machine ON tasks(machine_id);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX idx_tasks_created_by ON tasks(created_by);
CREATE INDEX idx_tasks_scheduled ON tasks(scheduled_date);
CREATE INDEX idx_tasks_deadline ON tasks(deadline);
CREATE INDEX idx_tasks_component ON tasks(component_id);
```

#### 4.2. task_items (Товары в задаче пополнения)

```sql
CREATE TABLE task_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,

  nomenclature_id UUID REFERENCES nomenclature(id),

  planned_quantity DECIMAL(10, 2), -- плановое количество
  actual_quantity DECIMAL(10, 2), -- фактическое количество

  unit_id UUID REFERENCES dictionary_items(id), -- units_of_measure

  notes TEXT,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_task_items_task ON task_items(task_id);
CREATE INDEX idx_task_items_nomenclature ON task_items(nomenclature_id);
```

#### 4.3. task_checklist_items (Чек-лист задачи)

```sql
CREATE TABLE task_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,

  title VARCHAR(255) NOT NULL,
  description TEXT,

  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,

  sort_order INT DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_checklist_task ON task_checklist_items(task_id);
```

#### 4.4. task_comments (Чат по задаче)

```sql
CREATE TABLE task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,

  user_id UUID REFERENCES users(id),

  message TEXT NOT NULL,

  is_system BOOLEAN DEFAULT FALSE, -- системное сообщение

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_task_comments_task ON task_comments(task_id);
CREATE INDEX idx_task_comments_user ON task_comments(user_id);
CREATE INDEX idx_task_comments_created ON task_comments(created_at);
```

---

### БЛОК 5: Остатки и движения

#### 5.1. warehouse_inventory (Остатки на складах) - Уровень 1

```sql
CREATE TABLE warehouse_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  warehouse_id UUID REFERENCES warehouses(id),
  nomenclature_id UUID REFERENCES nomenclature(id),

  quantity DECIMAL(10, 2) DEFAULT 0,
  reserved_quantity DECIMAL(10, 2) DEFAULT 0, -- зарезервировано для задач
  available_quantity DECIMAL(10, 2) GENERATED ALWAYS AS (quantity - reserved_quantity) STORED,

  min_quantity DECIMAL(10, 2), -- минимальный остаток (для алерта)

  average_price DECIMAL(12, 2), -- средняя цена

  last_updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(warehouse_id, nomenclature_id)
);

CREATE INDEX idx_warehouse_inv_warehouse ON warehouse_inventory(warehouse_id);
CREATE INDEX idx_warehouse_inv_nomenclature ON warehouse_inventory(nomenclature_id);
CREATE INDEX idx_warehouse_inv_low_stock ON warehouse_inventory(available_quantity) WHERE available_quantity < min_quantity;
```

#### 5.2. user_inventory (Остатки у операторов) - Уровень 2

```sql
CREATE TABLE user_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID REFERENCES users(id), -- оператор/техник
  nomenclature_id UUID REFERENCES nomenclature(id),

  quantity DECIMAL(10, 2) DEFAULT 0,

  location_description TEXT, -- где находится
  assigned_to_tasks TEXT[], -- для каких задач (array of task_ids)

  last_updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id, nomenclature_id)
);

CREATE INDEX idx_user_inv_user ON user_inventory(user_id);
CREATE INDEX idx_user_inv_nomenclature ON user_inventory(nomenclature_id);
```

#### 5.3. machine_inventory (Остатки в аппаратах) - Уровень 3

```sql
CREATE TABLE machine_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  machine_id UUID REFERENCES machines(id),
  nomenclature_id UUID REFERENCES nomenclature(id),

  current_quantity DECIMAL(10, 2) DEFAULT 0,
  min_quantity DECIMAL(10, 2), -- минимальный остаток
  max_quantity DECIMAL(10, 2), -- максимальный остаток

  last_refill_date TIMESTAMP,
  last_refill_quantity DECIMAL(10, 2),

  UNIQUE(machine_id, nomenclature_id)
);

CREATE INDEX idx_machine_inv_machine ON machine_inventory(machine_id);
CREATE INDEX idx_machine_inv_nomenclature ON machine_inventory(nomenclature_id);
CREATE INDEX idx_machine_inv_low_stock ON machine_inventory(current_quantity) WHERE current_quantity < min_quantity;
```

#### 5.4. inventory_movements (Движения товаров)

```sql
CREATE TABLE inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  movement_type_id UUID REFERENCES dictionary_items(id), -- inventory_movement_types

  nomenclature_id UUID REFERENCES nomenclature(id),

  -- Откуда
  from_type VARCHAR(20), -- 'warehouse', 'user', 'machine', NULL
  from_id UUID, -- ID склада/пользователя/машины

  -- Куда
  to_type VARCHAR(20), -- 'warehouse', 'user', 'machine', NULL (продажа)
  to_id UUID,

  quantity DECIMAL(10, 2) NOT NULL,
  unit_id UUID REFERENCES dictionary_items(id),

  price DECIMAL(12, 2), -- цена на момент движения

  -- Связи
  task_id UUID REFERENCES tasks(id),
  transaction_id UUID REFERENCES transactions(id),
  batch_id UUID REFERENCES batches(id),

  reason TEXT,

  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_inv_movements_nomenclature ON inventory_movements(nomenclature_id);
CREATE INDEX idx_inv_movements_from ON inventory_movements(from_type, from_id);
CREATE INDEX idx_inv_movements_to ON inventory_movements(to_type, to_id);
CREATE INDEX idx_inv_movements_task ON inventory_movements(task_id);
CREATE INDEX idx_inv_movements_transaction ON inventory_movements(transaction_id);
CREATE INDEX idx_inv_movements_created ON inventory_movements(created_at);
```

---

### БЛОК 6: Продажи

#### 6.1. transactions (Транзакции/Продажи)

**ВАЖНО**: Партиционирование по месяцам!

```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  external_id VARCHAR(100), -- ID из импорта

  transaction_date TIMESTAMP NOT NULL,

  machine_id UUID REFERENCES machines(id),
  nomenclature_id UUID REFERENCES nomenclature(id),

  quantity DECIMAL(10, 2) NOT NULL,
  price DECIMAL(12, 2) NOT NULL,
  total DECIMAL(12, 2) NOT NULL,

  payment_type_id UUID REFERENCES dictionary_items(id), -- payment_types

  -- Импорт
  import_batch_id UUID REFERENCES import_batches(id),
  import_row_number INT,

  created_at TIMESTAMP DEFAULT NOW()
) PARTITION BY RANGE (transaction_date);

-- Партиции (создаются автоматически)
CREATE TABLE transactions_2025_01 PARTITION OF transactions
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE transactions_2025_02 PARTITION OF transactions
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

-- И так далее...

CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_machine ON transactions(machine_id);
CREATE INDEX idx_transactions_nomenclature ON transactions(nomenclature_id);
CREATE INDEX idx_transactions_external ON transactions(external_id);
CREATE INDEX idx_transactions_import_batch ON transactions(import_batch_id);
```

#### 6.2. import_batches (Батчи импорта продаж)

```sql
CREATE TABLE import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  file_name VARCHAR(255) NOT NULL,
  file_id UUID REFERENCES files(id),

  total_rows INT,
  processed_rows INT DEFAULT 0,
  successful_rows INT DEFAULT 0,
  failed_rows INT DEFAULT 0,

  date_from DATE,
  date_to DATE,

  total_amount DECIMAL(12, 2),

  status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed

  error_log TEXT,

  imported_by UUID REFERENCES users(id),
  imported_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE INDEX idx_import_batches_status ON import_batches(status);
CREATE INDEX idx_import_batches_imported ON import_batches(imported_at);
```

---

### БЛОК 7: Оборудование

#### 7.1. components (Компоненты - нумерованные)

```sql
CREATE TABLE components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  serial_number VARCHAR(50) UNIQUE NOT NULL, -- BUN-001, GRN-001

  component_type_id UUID REFERENCES dictionary_items(id), -- component_types
  component_subtype_id UUID REFERENCES dictionary_items(id), -- для бункеров: hopper_types

  manufacturer VARCHAR(100),
  model VARCHAR(100),

  -- Текущий статус и расположение
  status_id UUID REFERENCES dictionary_items(id), -- component_statuses

  current_location_type VARCHAR(20), -- 'machine', 'warehouse', 'user'
  current_location_id UUID, -- ID машины/склада/пользователя

  current_machine_id UUID REFERENCES machines(id),

  -- История обслуживания
  last_cleaning_date DATE,
  cleaning_count INT DEFAULT 0,
  next_cleaning_due DATE,
  cleaning_interval_days INT, -- из справочника по типу
  is_cleaning_overdue BOOLEAN DEFAULT FALSE,

  last_repair_date DATE,
  repair_count INT DEFAULT 0,

  -- Технические данные
  capacity DECIMAL(10, 2), -- объём (для бункеров)
  technical_specs JSONB,

  purchase_date DATE,
  purchase_price DECIMAL(12, 2),

  notes TEXT,

  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_components_serial ON components(serial_number);
CREATE INDEX idx_components_type ON components(component_type_id);
CREATE INDEX idx_components_subtype ON components(component_subtype_id);
CREATE INDEX idx_components_status ON components(status_id);
CREATE INDEX idx_components_machine ON components(current_machine_id);
CREATE INDEX idx_components_cleaning_overdue ON components(is_cleaning_overdue) WHERE is_cleaning_overdue = TRUE;
```

#### 7.2. component_movements (История перемещений компонентов)

```sql
CREATE TABLE component_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  component_id UUID REFERENCES components(id),

  from_status_id UUID REFERENCES dictionary_items(id),
  to_status_id UUID REFERENCES dictionary_items(id),

  from_location_type VARCHAR(20),
  from_location_id UUID,

  to_location_type VARCHAR(20),
  to_location_id UUID,

  task_id UUID REFERENCES tasks(id),

  reason TEXT,

  moved_by UUID REFERENCES users(id),
  moved_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_component_movements_component ON component_movements(component_id);
CREATE INDEX idx_component_movements_task ON component_movements(task_id);
CREATE INDEX idx_component_movements_moved ON component_movements(moved_at);
```

#### 7.3. spare_parts (Запчасти)

```sql
CREATE TABLE spare_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,

  type_id UUID REFERENCES dictionary_items(id), -- spare_part_types

  manufacturer VARCHAR(100),
  model VARCHAR(100),
  part_number VARCHAR(100),

  compatible_machines TEXT[], -- массив моделей машин

  unit_id UUID REFERENCES dictionary_items(id), -- units_of_measure

  purchase_price DECIMAL(12, 2),

  quantity_in_stock DECIMAL(10, 2) DEFAULT 0,
  min_quantity DECIMAL(10, 2), -- минимальный остаток

  supplier_id UUID REFERENCES counterparties(id),

  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_spare_parts_code ON spare_parts(code);
CREATE INDEX idx_spare_parts_type ON spare_parts(type_id);
CREATE INDEX idx_spare_parts_supplier ON spare_parts(supplier_id);
CREATE INDEX idx_spare_parts_low_stock ON spare_parts(quantity_in_stock) WHERE quantity_in_stock < min_quantity;
```

#### 7.4. spare_part_usage (Использование запчастей)

```sql
CREATE TABLE spare_part_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  spare_part_id UUID REFERENCES spare_parts(id),

  task_id UUID REFERENCES tasks(id), -- задача ремонта
  machine_id UUID REFERENCES machines(id),

  quantity DECIMAL(10, 2) NOT NULL,
  price DECIMAL(12, 2),

  notes TEXT,

  used_by UUID REFERENCES users(id),
  used_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_spare_usage_part ON spare_part_usage(spare_part_id);
CREATE INDEX idx_spare_usage_task ON spare_part_usage(task_id);
CREATE INDEX idx_spare_usage_machine ON spare_part_usage(machine_id);
```

---

### БЛОК 8: Инциденты и жалобы

#### 8.1. incidents (Инциденты)

```sql
CREATE TABLE incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL, -- INC-12345

  type_id UUID REFERENCES dictionary_items(id), -- incident_types
  status_id UUID REFERENCES dictionary_items(id), -- incident_statuses
  priority_id UUID REFERENCES dictionary_items(id), -- task_priorities

  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  consequences TEXT,

  machine_id UUID REFERENCES machines(id),
  task_id UUID REFERENCES tasks(id),
  transaction_id UUID REFERENCES transactions(id),

  assigned_to UUID REFERENCES users(id),
  reported_by UUID REFERENCES users(id),

  reported_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP,
  closed_at TIMESTAMP,

  root_cause TEXT,
  solution TEXT,
  preventive_actions TEXT,

  financial_loss DECIMAL(12, 2),

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_incidents_code ON incidents(code);
CREATE INDEX idx_incidents_type ON incidents(type_id);
CREATE INDEX idx_incidents_status ON incidents(status_id);
CREATE INDEX idx_incidents_machine ON incidents(machine_id);
CREATE INDEX idx_incidents_assigned ON incidents(assigned_to);
CREATE INDEX idx_incidents_reported ON incidents(reported_at);
```

#### 8.2. customer_complaints (Клиентские жалобы)

```sql
CREATE TABLE customer_complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL, -- CMP-12345

  type_id UUID REFERENCES dictionary_items(id), -- complaint_types
  status_id UUID REFERENCES dictionary_items(id), -- complaint_statuses
  source_id UUID REFERENCES dictionary_items(id), -- complaint_sources

  machine_id UUID REFERENCES machines(id) NOT NULL,

  description TEXT NOT NULL,

  customer_phone VARCHAR(20),
  customer_email VARCHAR(255),
  customer_telegram VARCHAR(100),

  received_at TIMESTAMP DEFAULT NOW(),
  response_deadline TIMESTAMP, -- +2 часа от received_at
  acknowledged_at TIMESTAMP,
  resolved_at TIMESTAMP,

  assigned_to UUID REFERENCES users(id),

  response_message TEXT,
  resolution_details TEXT,
  compensation_offered TEXT,

  customer_satisfaction INT CHECK (customer_satisfaction BETWEEN 1 AND 5),
  customer_feedback TEXT,

  task_id UUID REFERENCES tasks(id), -- созданная задача для решения
  incident_id UUID REFERENCES incidents(id), -- созданный инцидент (если серьёзно)

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_complaints_code ON customer_complaints(code);
CREATE INDEX idx_complaints_type ON customer_complaints(type_id);
CREATE INDEX idx_complaints_status ON customer_complaints(status_id);
CREATE INDEX idx_complaints_machine ON customer_complaints(machine_id);
CREATE INDEX idx_complaints_assigned ON customer_complaints(assigned_to);
CREATE INDEX idx_complaints_received ON customer_complaints(received_at);
```

---

### БЛОК 9: Финансы

#### 9.1. finance_operations (Финансовые операции)

```sql
CREATE TABLE finance_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  operation_type VARCHAR(20) NOT NULL, -- 'income', 'expense'

  category_id UUID REFERENCES dictionary_items(id), -- income/expense_categories

  amount DECIMAL(12, 2) NOT NULL,

  operation_date DATE NOT NULL,

  machine_id UUID REFERENCES machines(id),
  counterparty_id UUID REFERENCES counterparties(id),
  task_id UUID REFERENCES tasks(id),
  complaint_id UUID REFERENCES customer_complaints(id),

  description TEXT,

  payment_method VARCHAR(50), -- cash, card, transfer

  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_finance_ops_type ON finance_operations(operation_type);
CREATE INDEX idx_finance_ops_category ON finance_operations(category_id);
CREATE INDEX idx_finance_ops_date ON finance_operations(operation_date);
CREATE INDEX idx_finance_ops_machine ON finance_operations(machine_id);
CREATE INDEX idx_finance_ops_task ON finance_operations(task_id);
```

#### 9.2. counterparties (Контрагенты)

```sql
CREATE TABLE counterparties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,

  type_id UUID REFERENCES dictionary_items(id), -- counterparty_types

  legal_name VARCHAR(255),
  tax_id VARCHAR(50), -- ИНН

  address TEXT,
  phone VARCHAR(20),
  email VARCHAR(255),

  contact_person VARCHAR(255),
  contact_phone VARCHAR(20),

  payment_terms TEXT, -- "Оплата в течение 14 дней"

  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_counterparties_code ON counterparties(code);
CREATE INDEX idx_counterparties_type ON counterparties(type_id);
CREATE INDEX idx_counterparties_active ON counterparties(is_active);
```

---

### БЛОК 10: Файлы и Audit

#### 10.1. files (Файлы)

```sql
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,

  path TEXT NOT NULL,
  url TEXT,

  mime_type VARCHAR(100),
  size_bytes BIGINT,

  category_id UUID REFERENCES dictionary_items(id), -- file_categories

  -- Полиморфная связь
  entity_type VARCHAR(50), -- 'task', 'machine', 'complaint', etc.
  entity_id UUID,

  -- Теги для быстрого поиска
  tags TEXT[], -- array: ['пополнение', 'MAC-001', 'до']

  -- Метаданные (из EXIF для фото)
  geolocation POINT, -- GPS координаты
  taken_at TIMESTAMP, -- когда сделано фото

  uploaded_by UUID REFERENCES users(id),
  uploaded_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_files_entity ON files(entity_type, entity_id);
CREATE INDEX idx_files_category ON files(category_id);
CREATE INDEX idx_files_tags ON files USING GIN(tags);
CREATE INDEX idx_files_uploaded_by ON files(uploaded_by);
CREATE INDEX idx_files_uploaded_at ON files(uploaded_at);
```

#### 10.2. audit_logs (Audit логи)

**ВАЖНО**: Партиционирование по месяцам!

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID REFERENCES users(id),
  user_role VARCHAR(50),

  action VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete', 'login', 'logout'

  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,

  old_values JSONB,
  new_values JSONB,
  changed_fields TEXT[],

  ip_address INET,
  user_agent TEXT,
  device_type VARCHAR(50),

  reason TEXT,
  request_id UUID,

  created_at TIMESTAMP DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Партиции
CREATE TABLE audit_logs_2025_01 PARTITION OF audit_logs
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);
```

#### 10.3. notifications (Уведомления)

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID REFERENCES users(id),

  type_id UUID REFERENCES dictionary_items(id), -- notification_types

  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,

  -- Связь с сущностью
  entity_type VARCHAR(50),
  entity_id UUID,

  -- Каналы доставки
  sent_to_telegram BOOLEAN DEFAULT FALSE,
  sent_to_email BOOLEAN DEFAULT FALSE,
  sent_to_push BOOLEAN DEFAULT FALSE,
  sent_to_sms BOOLEAN DEFAULT FALSE,

  sent_at TIMESTAMP,

  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(type_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at);
```

---

## Итого

**Общее количество таблиц**: ~45

**Разбивка по блокам:**
- Фундамент: 4 таблицы
- Локации и аппараты: 2 таблицы
- Номенклатура: 3 таблицы
- Задачи: 4 таблицы
- Остатки: 4 таблицы
- Продажи: 2 таблицы
- Оборудование: 4 таблицы
- Инциденты и жалобы: 2 таблицы
- Финансы: 2 таблицы
- Файлы и Audit: 3 таблицы
- Дополнительные: ~15 таблиц

**Партиционирование:**
- `transactions` - по месяцам
- `audit_logs` - по месяцам

**Индексы**: На всех FK, часто используемых полях, полях для поиска

**Миграции**: TypeORM / Alembic / Prisma

**Бэкапы**: Ежедневные автоматические бэкапы с ротацией на 30 дней
