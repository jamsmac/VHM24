# Locations Documentation

> **Модуль**: `backend/src/modules/locations/`
> **Версия**: 1.0.0
> **Последнее обновление**: 2025-12-20

---

## Обзор

Модуль управления локациями — физическими точками размещения вендинговых аппаратов. Локации привязаны к контрагентам (владельцам помещений) и содержат информацию об аренде, контактах и координатах.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        LOCATIONS SYSTEM                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                      LOCATION                                  │  │
│  │  ├── Адресные данные: город, адрес, координаты                │  │
│  │  ├── Контактная информация                                    │  │
│  │  ├── Аренда и контракт                                        │  │
│  │  ├── Рабочие часы (JSONB)                                     │  │
│  │  ├── Связь с контрагентом                                     │  │
│  │  └── Статусы: active, inactive, pending                       │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                     ИНТЕГРАЦИИ                                 │  │
│  │  ├── Machines → machine.location_id                           │  │
│  │  ├── Counterparty → владелец локации                          │  │
│  │  ├── Map API → данные для карты                               │  │
│  │  └── Client Public → публичный список локаций                 │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Entity: Location

```typescript
@Entity('locations')
@Index(['city', 'name'])
export class Location extends BaseEntity {
  // Основные данные
  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 50 })
  type_code: string;  // from dictionaries: location_types

  @Column({
    type: 'enum',
    enum: LocationStatus,
    default: LocationStatus.ACTIVE,
  })
  status: LocationStatus;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  // Адрес
  @Column({ type: 'varchar', length: 100 })
  city: string;

  @Column({ type: 'varchar', length: 200 })
  address: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  postal_code: string | null;

  // Координаты
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude: number | null;

  // Контакты
  @Column({ type: 'varchar', length: 100, nullable: true })
  contact_person: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  contact_phone: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  contact_email: string | null;

  // Бизнес-информация
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  monthly_rent: number | null;  // Аренда в месяц (UZS)

  @Column({ type: 'uuid', nullable: true })
  counterparty_id: string | null;

  @ManyToOne(() => Counterparty, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'counterparty_id' })
  counterparty: Counterparty | null;

  @Column({ type: 'integer', default: 0 })
  estimated_traffic: number;  // Примерное количество людей в день

  // Рабочие часы
  @Column({ type: 'jsonb', nullable: true })
  working_hours: WorkingHours | null;

  // Контракт
  @Column({ type: 'date', nullable: true })
  contract_start_date: Date | null;

  @Column({ type: 'date', nullable: true })
  contract_end_date: Date | null;

  @Column({ type: 'text', nullable: true })
  contract_notes: string | null;

  // Метаданные
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}
```

---

## LocationStatus

```typescript
export enum LocationStatus {
  ACTIVE = 'active',     // Активная локация
  INACTIVE = 'inactive', // Неактивная (нет аппаратов)
  PENDING = 'pending',   // Ожидает активации
}
```

---

## Типы локаций (type_code)

| Код | Описание |
|-----|----------|
| mall | Торговый центр |
| office | Офисное здание |
| university | Университет, ВУЗ |
| hospital | Больница, клиника |
| transport | Транспортный узел (вокзал, аэропорт) |
| factory | Производство, фабрика |
| hotel | Гостиница |
| other | Другое |

---

## Рабочие часы (WorkingHours)

```typescript
interface WorkingHours {
  monday?: { from: string; to: string };
  tuesday?: { from: string; to: string };
  wednesday?: { from: string; to: string };
  thursday?: { from: string; to: string };
  friday?: { from: string; to: string };
  saturday?: { from: string; to: string };
  sunday?: { from: string; to: string };
}

// Пример
{
  "monday": { "from": "08:00", "to": "22:00" },
  "tuesday": { "from": "08:00", "to": "22:00" },
  "wednesday": { "from": "08:00", "to": "22:00" },
  "thursday": { "from": "08:00", "to": "22:00" },
  "friday": { "from": "08:00", "to": "22:00" },
  "saturday": { "from": "10:00", "to": "20:00" },
  "sunday": { "from": "10:00", "to": "18:00" }
}
```

---

## Сервис LocationsService

### Основные методы

```typescript
@Injectable()
export class LocationsService {
  // CRUD
  async create(createLocationDto: CreateLocationDto): Promise<Location>;
  async findAll(status?: LocationStatus): Promise<Location[]>;
  async findOne(id: string): Promise<Location>;
  async update(id: string, updateLocationDto: UpdateLocationDto): Promise<Location>;
  async remove(id: string): Promise<void>;

  // Поиск
  async findByCity(city: string): Promise<Location[]>;
  async findByType(type_code: string): Promise<Location[]>;

  // Статистика
  async getStats(): Promise<LocationStats>;

  // Данные для карты
  async getMapData(): Promise<MapLocationData[]>;
}
```

### MapLocationData

Данные для отображения локаций на карте с агрегированной статистикой по аппаратам:

```typescript
interface MapLocationData {
  id: string;
  name: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  status: LocationStatus;
  machine_count: number;       // Всего аппаратов
  machines_active: number;     // Активных
  machines_error: number;      // С ошибками
  machines_low_stock: number;  // Требуют пополнения
}
```

---

## API Endpoints

### Создать локацию

```http
POST /api/locations
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Samarkand Plaza",
  "type_code": "mall",
  "city": "Tashkent",
  "address": "Navoi Street 12",
  "latitude": 41.311081,
  "longitude": 69.280037,
  "contact_person": "Иван Петров",
  "contact_phone": "+998901234567",
  "monthly_rent": 5000000,
  "estimated_traffic": 10000,
  "working_hours": {
    "monday": { "from": "08:00", "to": "22:00" }
  }
}
```

**Response (201 Created):**
```json
{
  "id": "uuid",
  "name": "Samarkand Plaza",
  "type_code": "mall",
  "status": "active",
  "city": "Tashkent",
  "address": "Navoi Street 12",
  "latitude": 41.311081,
  "longitude": 69.280037,
  "created_at": "2025-01-15T10:00:00Z"
}
```

### Получить список локаций

```http
GET /api/locations?status=active
Authorization: Bearer <token>
```

### Получить локацию по ID

```http
GET /api/locations/:id
Authorization: Bearer <token>
```

### Получить локации по городу

```http
GET /api/locations/city/:city
Authorization: Bearer <token>
```

### Получить данные для карты

```http
GET /api/locations/map
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Samarkand Plaza",
    "address": "Navoi Street 12",
    "city": "Tashkent",
    "latitude": 41.311081,
    "longitude": 69.280037,
    "status": "active",
    "machine_count": 5,
    "machines_active": 4,
    "machines_error": 0,
    "machines_low_stock": 1
  }
]
```

### Статистика

```http
GET /api/locations/stats
Authorization: Bearer <token>
```

**Response:**
```json
{
  "total": 50,
  "active": 45,
  "inactive": 3,
  "pending": 2
}
```

### Обновить локацию

```http
PATCH /api/locations/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "monthly_rent": 6000000,
  "contact_phone": "+998901111111"
}
```

### Удалить локацию

```http
DELETE /api/locations/:id
Authorization: Bearer <token>
```

---

## Валидация

- `name` - уникальный в пределах города
- `city` - обязательное поле
- `address` - обязательное поле
- `type_code` - из справочника dictionaries
- `latitude` - от -90 до 90
- `longitude` - от -180 до 180
- `monthly_rent` - >= 0

---

## Связи

- **Machine** - N:1 (много аппаратов на одной локации)
- **Counterparty** - N:1 (владелец локации)
- **Dictionaries** - type_code

---

## Права доступа

| Операция | Роли |
|----------|------|
| Просмотр | Все авторизованные |
| Создание | Admin, Manager |
| Редактирование | Admin, Manager |
| Удаление | Admin |

---

## Requirements

| REQ ID | Описание |
|--------|----------|
| REQ-LOC-01 | CRUD для локаций |
| REQ-LOC-02 | Геокоординаты для карты |
| REQ-LOC-03 | Рабочие часы (JSONB) |
| REQ-LOC-10 | Связь с контрагентами |
| REQ-LOC-11 | Учёт аренды |
| REQ-LOC-20 | Статистика по аппаратам на локации |
| REQ-LOC-21 | Данные для карты (MapData) |
