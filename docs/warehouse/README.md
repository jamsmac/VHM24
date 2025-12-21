# Warehouse Documentation

> **Модуль**: `backend/src/modules/warehouse/`
> **Версия**: 1.0.0
> **Последнее обновление**: 2025-12-20

---

## Обзор

Модуль управления складами и складскими операциями. Поддерживает несколько складов, зоны хранения, движение товаров, инвентаризацию и резервирование.

```
┌─────────────────────────────────────────────────────────────────────┐
│                      WAREHOUSE SYSTEM                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                     WAREHOUSE                                  │  │
│  │  ├── 4 типа: main, regional, transit, virtual                 │  │
│  │  ├── Зоны хранения (zones)                                    │  │
│  │  ├── Привязка к локации                                       │  │
│  │  └── Менеджер склада                                          │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                   WAREHOUSE ZONE                               │  │
│  │  ├── 7 типов: receiving, storage, picking, packing, ...       │  │
│  │  ├── Площадь и вместимость                                    │  │
│  │  └── Текущая заполненность                                    │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                  STOCK MOVEMENT                                │  │
│  │  ├── 8 типов: receipt, shipment, transfer, adjustment, ...    │  │
│  │  ├── 5 статусов: draft → pending → in_progress → completed    │  │
│  │  └── Номер документа, количество, стоимость                   │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Entity: Warehouse

```typescript
@Entity('warehouses')
export class Warehouse extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'enum', enum: WarehouseType, default: WarehouseType.MAIN })
  warehouse_type: WarehouseType;

  @Column({ type: 'uuid', nullable: true })
  location_id: string | null;

  @ManyToOne(() => Location, { nullable: true })
  @JoinColumn({ name: 'location_id' })
  location: Location | null;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  total_area_sqm: number | null;

  @Column({ type: 'uuid', nullable: true })
  manager_id: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  email: string | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'simple-array', nullable: true })
  working_hours: string[] | null;  // ['Mon-Fri: 9-18', 'Sat: 10-14']

  @OneToMany(() => WarehouseZone, (zone) => zone.warehouse)
  zones: WarehouseZone[];

  @Column({ type: 'jsonb', default: {} })
  metadata: {
    capacity?: number;
    temperature_controlled?: boolean;
    security_level?: string;
    equipment?: string[];
  };
}
```

---

## WarehouseType

```typescript
export enum WarehouseType {
  MAIN = 'main',           // Главный склад
  REGIONAL = 'regional',   // Региональный склад
  TRANSIT = 'transit',     // Транзитный склад
  VIRTUAL = 'virtual',     // Виртуальный склад
}
```

| Тип | Описание |
|-----|----------|
| main | Центральный склад компании |
| regional | Региональные склады в городах |
| transit | Промежуточные склады для доставки |
| virtual | Виртуальные склады (у операторов) |

---

## Entity: WarehouseZone

```typescript
@Entity('warehouse_zones')
export class WarehouseZone extends BaseEntity {
  @Column({ type: 'uuid' })
  warehouse_id: string;

  @ManyToOne(() => Warehouse, (warehouse) => warehouse.zones)
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: Warehouse;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({ type: 'enum', enum: ZoneType })
  zone_type: ZoneType;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  area_sqm: number | null;

  @Column({ type: 'integer', nullable: true })
  capacity: number | null;

  @Column({ type: 'integer', default: 0 })
  current_occupancy: number;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: {
    temperature?: number;
    humidity?: number;
    shelves?: number;
    rows?: number;
    positions_per_row?: number;
  };
}
```

---

## ZoneType

```typescript
export enum ZoneType {
  RECEIVING = 'receiving',     // Зона приёмки
  STORAGE = 'storage',         // Зона хранения
  PICKING = 'picking',         // Зона комплектации
  PACKING = 'packing',         // Зона упаковки
  SHIPPING = 'shipping',       // Зона отгрузки
  QUARANTINE = 'quarantine',   // Карантинная зона
  RETURNS = 'returns',         // Зона возвратов
}
```

### Workflow зон

```
┌─────────────────────────────────────────────────────────────────────┐
│                     WAREHOUSE ZONES FLOW                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  RECEIVING  →  QUARANTINE (optional)  →  STORAGE                    │
│      │              │                        │                      │
│      │              └────────────────────────┤                      │
│      │                                       ▼                      │
│      │                                    PICKING                   │
│      │                                       │                      │
│      │                                       ▼                      │
│      └───────────────────────────────→   PACKING                    │
│                                              │                      │
│                                              ▼                      │
│                                          SHIPPING                   │
│                                                                     │
│  RETURNS  ←────────────────────────────────                         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Entity: StockMovement

```typescript
@Entity('stock_movements')
@Index(['warehouse_id', 'movement_date'])
@Index(['product_id', 'movement_date'])
export class StockMovement extends BaseEntity {
  @Column({ type: 'varchar', length: 50, unique: true })
  movement_number: string;

  @Column({ type: 'enum', enum: MovementType })
  movement_type: MovementType;

  @Column({ type: 'enum', enum: MovementStatus, default: MovementStatus.DRAFT })
  status: MovementStatus;

  @Column({ type: 'uuid' })
  warehouse_id: string;

  @ManyToOne(() => Warehouse)
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: Warehouse;

  @Column({ type: 'uuid', nullable: true })
  destination_warehouse_id: string | null;  // Для трансферов

  @Column({ type: 'uuid' })
  product_id: string;

  @Column({ type: 'uuid', nullable: true })
  batch_id: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 3 })
  quantity: number;

  @Column({ type: 'varchar', length: 20 })
  unit: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  unit_cost: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  total_cost: number | null;

  @Column({ type: 'timestamp' })
  movement_date: Date;

  @Column({ type: 'uuid', nullable: true })
  performed_by_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  zone_id: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  location_code: string | null;  // Shelf/bin

  @Column({ type: 'text', nullable: true })
  reference_document: string | null;  // PO, SO, etc.

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: {
    supplier?: string;
    carrier?: string;
    tracking_number?: string;
    quality_check?: boolean;
    damage_report?: string;
  };
}
```

---

## MovementType

```typescript
export enum MovementType {
  RECEIPT = 'receipt',           // Приёмка
  SHIPMENT = 'shipment',         // Отгрузка
  TRANSFER = 'transfer',         // Перемещение между складами
  ADJUSTMENT = 'adjustment',     // Корректировка
  RETURN = 'return',             // Возврат
  WRITE_OFF = 'write_off',       // Списание
  PRODUCTION = 'production',     // Производство
  ASSEMBLY = 'assembly',         // Сборка
}
```

| Тип | Влияние на остатки | Описание |
|-----|-------------------|----------|
| receipt | +quantity | Поступление товара |
| shipment | -quantity | Отгрузка |
| transfer | -/+ | Перемещение между складами |
| adjustment | ±quantity | Корректировка инвентаризации |
| return | +quantity | Возврат от клиента/оператора |
| write_off | -quantity | Списание (порча, истечение срока) |
| production | +quantity | Произведённая продукция |
| assembly | +/- | Сборка из комплектующих |

---

## MovementStatus

```typescript
export enum MovementStatus {
  DRAFT = 'draft',               // Черновик
  PENDING = 'pending',           // Ожидает выполнения
  IN_PROGRESS = 'in_progress',   // В процессе
  COMPLETED = 'completed',       // Завершено
  CANCELLED = 'cancelled',       // Отменено
}
```

---

## Связь с 3-Level Inventory

```
┌─────────────────────────────────────────────────────────────────────┐
│                 3-LEVEL INVENTORY INTEGRATION                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  WAREHOUSE                                                          │
│  (warehouse_inventory)                                              │
│       │                                                             │
│       │ TRANSFER (to operator)                                      │
│       ▼                                                             │
│  OPERATOR                                                           │
│  (operator_inventory)                                               │
│       │                                                             │
│       │ REFILL TASK                                                 │
│       ▼                                                             │
│  MACHINE                                                            │
│  (machine_inventory)                                                │
│                                                                     │
│  Warehouse module обслуживает уровень warehouse_inventory           │
│  Inventory module обслуживает operator/machine_inventory            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### Склады

```http
POST /api/warehouses
GET /api/warehouses
GET /api/warehouses/:id
PATCH /api/warehouses/:id
DELETE /api/warehouses/:id
```

### Зоны

```http
POST /api/warehouses/:warehouseId/zones
GET /api/warehouses/:warehouseId/zones
GET /api/warehouse-zones/:id
PATCH /api/warehouse-zones/:id
DELETE /api/warehouse-zones/:id
```

### Движения

```http
POST /api/stock-movements
GET /api/stock-movements?warehouse_id=uuid&movement_type=receipt
GET /api/stock-movements/:id
PATCH /api/stock-movements/:id
POST /api/stock-movements/:id/complete
POST /api/stock-movements/:id/cancel
```

### Пример создания приёмки

```http
POST /api/stock-movements
Authorization: Bearer <token>
Content-Type: application/json

{
  "movement_type": "receipt",
  "warehouse_id": "uuid-склада",
  "product_id": "uuid-товара",
  "quantity": 100,
  "unit": "kg",
  "unit_cost": 50000,
  "movement_date": "2025-01-15T10:00:00Z",
  "zone_id": "uuid-зоны-приёмки",
  "reference_document": "PO-2025-001",
  "metadata": {
    "supplier": "Coffee Beans Inc.",
    "quality_check": true
  }
}
```

---

## Дополнительные сущности

### InventoryBatch

Партии товаров с датами производства и годности.

### StockTake

Инвентаризация с фиксацией фактических остатков.

### StockReservation

Резервирование товаров под заказы.

---

## Права доступа

| Операция | Роли |
|----------|------|
| Просмотр складов | Все авторизованные |
| Создание/редактирование | Admin, Manager |
| Движения товаров | Admin, Manager, Operator |
| Завершение движений | Admin, Manager |

---

## Requirements

| REQ ID | Описание |
|--------|----------|
| REQ-WH-01 | Несколько складов |
| REQ-WH-02 | 4 типа складов |
| REQ-WH-10 | Зоны хранения |
| REQ-WH-11 | 7 типов зон |
| REQ-WH-20 | Движения товаров |
| REQ-WH-21 | 8 типов движений |
| REQ-WH-22 | Статусы движений |
| REQ-WH-30 | Партии товаров (batches) |
| REQ-WH-31 | Инвентаризация |
| REQ-WH-32 | Резервирование |
