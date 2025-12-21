# Equipment Components - Компоненты Оборудования

> **Модуль**: `backend/src/modules/equipment/`
> **Версия**: 1.0.0
> **Последнее обновление**: 2025-12-20

---

## Обзор

Модуль Equipment управляет компонентами вендинговых аппаратов - бункерами, кофемолками, миксерами, платёжными терминалами и другим оборудованием. Система отслеживает жизненный цикл компонентов, их местоположение, обслуживание и замену.

```
┌─────────────────────────────────────────────────────────────────────┐
│                     EQUIPMENT COMPONENT SYSTEM                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────┐    ┌────────────────┐    ┌───────────────┐      │
│  │   WAREHOUSE   │───▶│    MACHINE     │───▶│   WASHING     │      │
│  │   (склад)     │    │   (аппарат)    │    │   (мойка)     │      │
│  └───────────────┘    └────────────────┘    └───────────────┘      │
│         ▲                     │                     │               │
│         │                     │                     ▼               │
│         │                     │            ┌───────────────┐        │
│         │                     └───────────▶│   DRYING      │        │
│         │                                  │   (сушка)     │        │
│         │                                  └───────────────┘        │
│         │                                          │                │
│         └──────────────────────────────────────────┘                │
│                                                                     │
│  ┌───────────────┐                                                  │
│  │    REPAIR     │◀─── Компоненты требующие ремонта                │
│  │   (ремонт)    │                                                  │
│  └───────────────┘                                                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Entity: EquipmentComponent

Основная сущность для учёта компонентов оборудования.

```typescript
@Entity('equipment_components')
@Index(['machine_id'])
@Index(['component_type'])
@Index(['serial_number'], { unique: true, where: "serial_number IS NOT NULL" })
export class EquipmentComponent extends BaseEntity {
  // Идентификация
  @Column({ type: 'uuid', nullable: true })
  machine_id: string | null;

  @Column({ type: 'enum', enum: ComponentType })
  component_type: ComponentType;

  @Column({ type: 'varchar', length: 100, nullable: true, unique: true })
  serial_number: string | null;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  // Статус и местоположение
  @Column({ type: 'enum', enum: ComponentStatus, default: ComponentStatus.IN_STOCK })
  status: ComponentStatus;

  @Column({ type: 'enum', enum: ComponentLocationType, default: ComponentLocationType.WAREHOUSE })
  current_location_type: ComponentLocationType;

  @Column({ type: 'varchar', length: 100, nullable: true })
  current_location_ref: string | null;

  // Даты жизненного цикла
  @Column({ type: 'date', nullable: true })
  installation_date: Date | null;

  @Column({ type: 'date', nullable: true })
  last_maintenance_date: Date | null;

  @Column({ type: 'date', nullable: true })
  next_maintenance_date: Date | null;

  @Column({ type: 'date', nullable: true })
  replacement_date: Date | null;

  // Ресурс и обслуживание
  @Column({ type: 'integer', nullable: true })
  working_hours: number | null;

  @Column({ type: 'integer', nullable: true })
  expected_lifetime_hours: number | null;

  @Column({ type: 'integer', nullable: true })
  maintenance_interval_days: number | null;

  // Замена
  @Column({ type: 'uuid', nullable: true })
  replaces_component_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  replaced_by_component_id: string | null;

  // Связи
  @ManyToOne(() => Machine, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'machine_id' })
  machine: Machine;
}
```

---

## Типы компонентов (ComponentType)

Система поддерживает 13 типов компонентов:

```typescript
export enum ComponentType {
  HOPPER = 'hopper',                     // Бункер для ингредиентов
  GRINDER = 'grinder',                   // Кофемолка
  BREWER = 'brewer',                     // Заварочный узел
  MIXER = 'mixer',                       // Миксер
  COOLING_UNIT = 'cooling_unit',         // Холодильный агрегат
  PAYMENT_TERMINAL = 'payment_terminal', // Платёжный терминал
  DISPENSER = 'dispenser',               // Дозатор
  PUMP = 'pump',                         // Помпа/насос
  WATER_FILTER = 'water_filter',         // Фильтр воды
  COIN_ACCEPTOR = 'coin_acceptor',       // Монетоприёмник
  BILL_ACCEPTOR = 'bill_acceptor',       // Купюроприёмник
  DISPLAY = 'display',                   // Дисплей
  OTHER = 'other',                       // Прочее
}
```

### Описание типов

| Тип | Описание | Требует мойки | Интервал обслуживания |
|-----|----------|---------------|----------------------|
| `hopper` | Бункеры для кофе, молока, сахара и др. | Да | 7-14 дней |
| `grinder` | Кофемолки (жернова, моторы) | Да | 30 дней |
| `brewer` | Заварочные группы | Да | 7 дней |
| `mixer` | Миксеры для растворимых напитков | Да | 7 дней |
| `cooling_unit` | Холодильные агрегаты | Нет | 90 дней |
| `payment_terminal` | Платёжные терминалы, NFC | Нет | 30 дней |
| `dispenser` | Дозаторы жидкостей | Да | 14 дней |
| `pump` | Водяные насосы | Нет | 60 дней |
| `water_filter` | Фильтры воды | Нет | Замена по ресурсу |
| `coin_acceptor` | Монетоприёмники | Нет | 30 дней |
| `bill_acceptor` | Купюроприёмники | Нет | 30 дней |
| `display` | Дисплеи, экраны | Нет | 90 дней |

---

## Статусы компонентов (ComponentStatus)

```typescript
export enum ComponentStatus {
  ACTIVE = 'active',                     // Установлен и работает
  IN_STOCK = 'in_stock',                 // На складе, готов к установке
  NEEDS_MAINTENANCE = 'needs_maintenance', // Требует обслуживания
  NEEDS_REPLACEMENT = 'needs_replacement', // Требует замены
  IN_REPAIR = 'in_repair',               // На ремонте
  REPLACED = 'replaced',                 // Заменён (архивный)
  RETIRED = 'retired',                   // Списан
  BROKEN = 'broken',                     // Сломан
}
```

### Диаграмма переходов статусов

```
                          ┌───────────────────┐
                          │     IN_STOCK      │
                          │  (на складе)      │
                          └─────────┬─────────┘
                                    │ install
                                    ▼
                          ┌───────────────────┐
              ┌──────────▶│      ACTIVE       │◀──────────┐
              │           │   (работает)      │           │
              │           └─────────┬─────────┘           │
              │                     │                     │
              │     ┌───────────────┼───────────────┐     │
              │     ▼               ▼               ▼     │
    ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
    │ NEEDS_MAINTENANCE│  │ NEEDS_REPLACEMENT│  │     BROKEN      │
    │ (треб. обслуж.) │  │ (треб. замены)  │  │   (сломан)      │
    └────────┬────────┘  └────────┬────────┘  └────────┬────────┘
             │                    │                    │
             │                    ▼                    │
             │           ┌─────────────────┐           │
             └──────────▶│    IN_REPAIR    │◀──────────┘
                         │   (ремонт)      │
                         └────────┬────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              ▼                   ▼                   ▼
    ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
    │     ACTIVE      │  │    REPLACED     │  │     RETIRED     │
    │ (восстановлен)  │  │   (заменён)     │  │   (списан)      │
    └─────────────────┘  └─────────────────┘  └─────────────────┘
```

---

## Типы местоположения (ComponentLocationType)

```typescript
export enum ComponentLocationType {
  MACHINE = 'machine',       // Установлен в аппарате
  WAREHOUSE = 'warehouse',   // На складе
  WASHING = 'washing',       // На мойке
  DRYING = 'drying',         // На сушке
  REPAIR = 'repair',         // На ремонте
}
```

### Логика переходов

Компонент может находиться только в одном месте. При перемещении создаётся запись в истории (ComponentMovement).

| Из локации | В локацию | Условие |
|------------|-----------|---------|
| `warehouse` | `machine` | Установка в аппарат |
| `machine` | `warehouse` | Снятие для хранения |
| `machine` | `washing` | Снятие для мойки |
| `washing` | `drying` | После мойки |
| `drying` | `warehouse` | После сушки |
| `machine` | `repair` | Поломка, отправка в ремонт |
| `warehouse` | `repair` | Обнаружен дефект |
| `repair` | `warehouse` | После ремонта |
| `repair` | `machine` | Установка после ремонта |

---

## Жизненный цикл компонента

### 1. Создание (IN_STOCK)

```typescript
POST /api/equipment/components
{
  "component_type": "hopper",
  "name": "Бункер кофе 1.5кг",
  "serial_number": "HOP-2024-001",
  "expected_lifetime_hours": 5000,
  "maintenance_interval_days": 14
}
```

Компонент создаётся со статусом `IN_STOCK` и локацией `WAREHOUSE`.

### 2. Установка (ACTIVE)

```typescript
POST /api/equipment/components/:id/install
{
  "machine_id": "uuid-машины",
  "comment": "Установка нового бункера"
}
```

Создаётся запись движения (ComponentMovement) с типом `INSTALL`.

### 3. Обслуживание

При достижении `next_maintenance_date` статус меняется на `NEEDS_MAINTENANCE`. После обслуживания создаётся запись ComponentMaintenance.

### 4. Замена

```typescript
POST /api/equipment/components/:oldId/replace
{
  "new_component_id": "uuid-нового-компонента",
  "reason": "Износ жерновов"
}
```

Старый компонент получает статус `REPLACED`, новый - `ACTIVE`.

### 5. Списание (RETIRED)

```typescript
PATCH /api/equipment/components/:id
{
  "status": "retired"
}
```

---

## Сервис ComponentsService

### Основные методы

```typescript
@Injectable()
export class ComponentsService {
  // Создание компонента
  async create(dto: CreateComponentDto): Promise<EquipmentComponent>;

  // Получение списка с фильтрацией
  async findAll(
    machineId?: string,
    componentType?: ComponentType,
    status?: ComponentStatus,
  ): Promise<EquipmentComponent[]>;

  // Получение по ID
  async findOne(id: string): Promise<EquipmentComponent>;

  // Обновление
  async update(id: string, dto: UpdateComponentDto): Promise<EquipmentComponent>;

  // Удаление (soft delete)
  async remove(id: string): Promise<void>;

  // Замена компонента
  async replaceComponent(
    oldComponentId: string,
    dto: ReplaceComponentDto,
  ): Promise<EquipmentComponent>;

  // Компоненты требующие обслуживания
  async getComponentsNeedingMaintenance(): Promise<EquipmentComponent[]>;

  // Компоненты близкие к выработке ресурса (90%+)
  async getComponentsNearingLifetime(): Promise<EquipmentComponent[]>;

  // Статистика
  async getComponentStats(machineId?: string): Promise<{
    total: number;
    by_type: { type: string; count: number }[];
    by_status: { status: string; count: number }[];
    needing_maintenance: number;
  }>;
}
```

### Автоматический расчёт даты обслуживания

При создании или обновлении компонента с `maintenance_interval_days` автоматически рассчитывается `next_maintenance_date`:

```typescript
if (dto.maintenance_interval_days && dto.installation_date) {
  const nextDate = new Date(dto.installation_date);
  nextDate.setDate(nextDate.getDate() + dto.maintenance_interval_days);
  component.next_maintenance_date = nextDate;
}
```

---

## Права доступа

| Операция | Роли |
|----------|------|
| Просмотр | Все авторизованные |
| Создание | Admin, Manager, SuperAdmin, Technician |
| Редактирование | Admin, Manager, SuperAdmin, Technician |
| Удаление | Admin, Manager, SuperAdmin, Technician |
| Установка/снятие | Admin, Manager, SuperAdmin, Technician |
| Замена | Admin, Manager, SuperAdmin, Technician |

---

## Связанные сущности

- **Machine** - аппарат, в который установлен компонент
- **ComponentMaintenance** - история обслуживания
- **ComponentMovement** - история перемещений
- **Task** - задачи по обслуживанию
- **HopperType** - типы бункеров (для компонентов типа hopper)

---

## Requirements

| REQ ID | Описание |
|--------|----------|
| REQ-ASSET-01 | Учёт компонентов оборудования |
| REQ-ASSET-02 | 13 типов компонентов |
| REQ-ASSET-03 | Отслеживание статуса и местоположения |
| REQ-ASSET-10 | Контроль сроков обслуживания |
| REQ-ASSET-11 | История перемещений компонентов |
| REQ-ASSET-12 | Учёт замены компонентов |
| REQ-ASSET-BH-01 | Классификация типов бункеров |
