# Routes Documentation

> **Модуль**: `backend/src/modules/routes/`
> **Версия**: 1.0.0
> **Последнее обновление**: 2025-12-21

---

## Обзор

Модуль планирования и оптимизации маршрутов для операторов. Поддерживает создание маршрутов с остановками, оптимизацию порядка посещения и отслеживание выполнения.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ROUTE SYSTEM                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    ROUTE                                       │  │
│  │  ├── driver_id (UUID) - назначенный водитель/оператор         │  │
│  │  ├── name (varchar) - название маршрута                        │  │
│  │  ├── route_type (enum) - тип маршрута                          │  │
│  │  ├── status (enum) - статус выполнения                         │  │
│  │  ├── planned_date (date) - планируемая дата                    │  │
│  │  ├── start_time / end_time (time) - время старта/финиша       │  │
│  │  ├── estimated_distance_km (decimal) - расстояние              │  │
│  │  ├── estimated_duration_minutes (int) - время в пути           │  │
│  │  └── estimated_cost (decimal) - стоимость                      │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                              │                                      │
│                              ▼                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    ROUTE STOPS                                 │  │
│  │  ├── machine_id (UUID) - аппарат                               │  │
│  │  ├── sequence (int) - порядок посещения                        │  │
│  │  ├── status (enum) - статус остановки                          │  │
│  │  ├── latitude/longitude (decimal) - координаты                 │  │
│  │  ├── planned_arrival_time (time)                               │  │
│  │  ├── actual_arrival_time (timestamp)                           │  │
│  │  ├── estimated_duration_minutes (int)                          │  │
│  │  ├── is_priority (boolean)                                     │  │
│  │  └── completion_data (jsonb) - результаты                      │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │               ROUTE OPTIMIZATION                               │  │
│  │  ├── Nearest Neighbor Algorithm                                │  │
│  │  ├── Priority-based scoring                                    │  │
│  │  ├── Haversine distance calculation                            │  │
│  │  └── Travel time estimation                                    │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Enums

### RouteType

```typescript
export enum RouteType {
  COLLECTION = 'collection',    // Инкассация
  REFILL = 'refill',            // Пополнение
  MAINTENANCE = 'maintenance',  // Обслуживание
  MIXED = 'mixed',              // Смешанный
}
```

### RouteStatus

```typescript
export enum RouteStatus {
  PLANNED = 'planned',         // Запланирован
  IN_PROGRESS = 'in_progress', // В процессе
  COMPLETED = 'completed',     // Завершён
  CANCELLED = 'cancelled',     // Отменён
}
```

### StopStatus

```typescript
export enum StopStatus {
  PENDING = 'pending',         // Ожидает
  IN_PROGRESS = 'in_progress', // В процессе
  COMPLETED = 'completed',     // Завершён
  SKIPPED = 'skipped',         // Пропущен
}
```

---

## Entities

### Route Entity

```typescript
@Entity('routes')
export class Route extends BaseEntity {
  @Column({ type: 'uuid' })
  driver_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'driver_id' })
  driver: User;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'enum', enum: RouteType })
  route_type: RouteType;

  @Column({ type: 'enum', enum: RouteStatus, default: RouteStatus.PLANNED })
  status: RouteStatus;

  @Column({ type: 'date' })
  planned_date: Date;

  @Column({ type: 'time', nullable: true })
  start_time: string | null;

  @Column({ type: 'time', nullable: true })
  end_time: string | null;

  @Column({ type: 'timestamp', nullable: true })
  actual_start_time: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  actual_end_time: Date | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  estimated_distance_km: number;

  @Column({ type: 'integer', default: 0 })
  estimated_duration_minutes: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  actual_distance_km: number | null;

  @Column({ type: 'integer', nullable: true })
  actual_duration_minutes: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  estimated_cost: number;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @OneToMany(() => RouteStop, (stop) => stop.route)
  stops: RouteStop[];

  @Column({ type: 'jsonb', default: {} })
  metadata: {
    vehicle_type?: string;
    vehicle_plate?: string;
    fuel_consumption?: number;
    traffic_conditions?: string;
  };
}
```

### RouteStop Entity

```typescript
@Entity('route_stops')
export class RouteStop extends BaseEntity {
  @Column({ type: 'uuid' })
  route_id: string;

  @ManyToOne(() => Route, (route) => route.stops)
  @JoinColumn({ name: 'route_id' })
  route: Route;

  @Column({ type: 'uuid' })
  machine_id: string;

  @Column({ type: 'integer' })
  sequence: number;

  @Column({ type: 'enum', enum: StopStatus, default: StopStatus.PENDING })
  status: StopStatus;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude: number | null;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude: number | null;

  @Column({ type: 'time', nullable: true })
  planned_arrival_time: string | null;

  @Column({ type: 'timestamp', nullable: true })
  actual_arrival_time: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  actual_departure_time: Date | null;

  @Column({ type: 'integer', default: 15 })
  estimated_duration_minutes: number;

  @Column({ type: 'boolean', default: false })
  is_priority: boolean;

  @Column({ type: 'text', nullable: true })
  tasks: string | null; // JSON array of task IDs

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'jsonb', default: {} })
  completion_data: {
    collected_cash?: number;
    refilled_items?: Record<string, number>;
    issues?: string[];
    photos?: string[];
  };

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;
}
```

---

## Route Optimization Service

Сервис оптимизации маршрутов использует алгоритм ближайшего соседа с учётом приоритета:

```typescript
@Injectable()
export class RouteOptimizationService {
  /**
   * Оптимизация маршрута с учётом приоритета
   * @param start - начальная точка
   * @param locations - точки для посещения
   * @returns отсортированный массив точек
   */
  optimizeRoute(start: Location, locations: Location[]): Location[];

  /**
   * Расчёт расстояния по формуле Haversine
   * @param point1 - первая точка
   * @param point2 - вторая точка
   * @returns расстояние в километрах
   */
  calculateDistance(point1: Location, point2: Location): number;

  /**
   * Расчёт общего расстояния маршрута
   */
  calculateTotalDistance(route: Location[]): number;

  /**
   * Оценка времени в пути
   * @param distanceKm - расстояние в км
   * @param avgSpeedKmh - средняя скорость (по умолчанию 40 км/ч)
   * @returns время в минутах
   */
  estimateTravelTime(distanceKm: number, avgSpeedKmh?: number): number;
}
```

### Алгоритм оптимизации

```typescript
// Nearest Neighbor с приоритетом
while (remaining.length > 0) {
  let nearestIndex = 0;
  let minScore = Infinity;

  for (let i = 0; i < remaining.length; i++) {
    const distance = this.calculateDistance(current, remaining[i]);
    const priorityFactor = remaining[i].priority || 1;
    const score = distance / priorityFactor; // Меньше score = лучше

    if (score < minScore) {
      minScore = score;
      nearestIndex = i;
    }
  }

  const nearest = remaining.splice(nearestIndex, 1)[0];
  optimized.push(nearest);
  current = nearest;
}
```

### Haversine Formula

```typescript
calculateDistance(point1: Location, point2: Location): number {
  const R = 6371; // Радиус Земли в км
  const dLat = this.toRad(point2.lat - point1.lat);
  const dLng = this.toRad(point2.lng - point1.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(this.toRad(point1.lat)) *
      Math.cos(this.toRad(point2.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
```

---

## Жизненный цикл маршрута

```
┌─────────────────────────────────────────────────────────────────┐
│                    ROUTE LIFECYCLE                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  PLANNED ──────────┬──────────► IN_PROGRESS                     │
│     │              │                 │                          │
│     │              │                 ▼                          │
│     │              │            STOP 1: pending                 │
│     │              │               │                            │
│     │              │               ▼                            │
│     │              │            STOP 1: in_progress             │
│     │              │               │                            │
│     │              │               ▼                            │
│     │              │            STOP 1: completed/skipped       │
│     │              │               │                            │
│     │              │               ▼                            │
│     │              │            STOP 2: in_progress             │
│     │              │               │                            │
│     │              │              ...                           │
│     │              │               │                            │
│     │              │               ▼                            │
│     ▼              ▼            COMPLETED                       │
│  CANCELLED                         │                            │
│                                    ▼                            │
│                            Сохранение actual_*                  │
│                            Обновление статистики                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### Создание маршрута

```http
POST /api/routes
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Утренний маршрут инкассации",
  "route_type": "collection",
  "driver_id": "uuid",
  "planned_date": "2025-01-15",
  "start_time": "09:00",
  "stops": [
    {
      "machine_id": "uuid-1",
      "sequence": 1,
      "planned_arrival_time": "09:30",
      "is_priority": true
    },
    {
      "machine_id": "uuid-2",
      "sequence": 2,
      "planned_arrival_time": "10:15"
    }
  ]
}
```

### Получение маршрутов оператора

```http
GET /api/routes/my?date=2025-01-15
Authorization: Bearer <token>
```

### Оптимизация маршрута

```http
POST /api/routes/:id/optimize
Authorization: Bearer <token>
Content-Type: application/json

{
  "start_location": {
    "lat": 41.311081,
    "lng": 69.240562
  }
}
```

### Начать маршрут

```http
POST /api/routes/:id/start
Authorization: Bearer <token>
```

### Завершить остановку

```http
POST /api/routes/:routeId/stops/:stopId/complete
Authorization: Bearer <token>
Content-Type: application/json

{
  "collected_cash": 150000,
  "refilled_items": {
    "product-uuid-1": 10,
    "product-uuid-2": 5
  },
  "photos": ["photo-uuid-1", "photo-uuid-2"]
}
```

### Пропустить остановку

```http
POST /api/routes/:routeId/stops/:stopId/skip
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Аппарат недоступен"
}
```

### Завершить маршрут

```http
POST /api/routes/:id/complete
Authorization: Bearer <token>
```

---

## Completion Data

При завершении остановки сохраняются данные о выполнении:

```typescript
completion_data: {
  collected_cash?: number;        // Собрано наличных
  refilled_items?: Record<string, number>; // Пополненные товары
  issues?: string[];              // Обнаруженные проблемы
  photos?: string[];              // UUID прикреплённых фото
}
```

---

## Metadata

### Route Metadata

```typescript
metadata: {
  vehicle_type?: string;      // Тип транспорта
  vehicle_plate?: string;     // Гос. номер
  fuel_consumption?: number;  // Расход топлива л/100км
  traffic_conditions?: string; // Условия трафика
}
```

---

## Интеграция с Tasks

Маршруты тесно связаны с модулем задач:

```
Route Stop ──► Tasks
    │
    ├── При создании остановки можно привязать задачи
    ├── При завершении остановки задачи отмечаются выполненными
    └── Фото из completion_data привязываются к задачам
```

---

## Requirements

| REQ ID | Описание |
|--------|----------|
| REQ-RTE-01 | Создание маршрутов с остановками |
| REQ-RTE-02 | 4 типа маршрутов (инкассация, пополнение, обслуживание, смешанный) |
| REQ-RTE-03 | 4 статуса маршрута |
| REQ-RTE-10 | Оптимизация порядка остановок |
| REQ-RTE-11 | Учёт приоритета остановок |
| REQ-RTE-12 | Расчёт расстояния (Haversine) |
| REQ-RTE-13 | Оценка времени в пути |
| REQ-RTE-20 | Отслеживание фактического выполнения |
| REQ-RTE-21 | Сохранение данных инкассации/пополнения |
| REQ-RTE-22 | Привязка фото к остановкам |
| REQ-RTE-30 | Интеграция с модулем задач |

---

## Примеры использования

### Создание оптимизированного маршрута

```typescript
// 1. Получить список аппаратов для посещения
const machines = await machinesService.findByLocation(locationId);

// 2. Создать маршрут
const route = await routesService.create({
  name: 'Маршрут инкассации #1',
  route_type: RouteType.COLLECTION,
  driver_id: operatorId,
  planned_date: new Date(),
});

// 3. Добавить остановки
const stops = machines.map((machine, index) => ({
  route_id: route.id,
  machine_id: machine.id,
  sequence: index + 1,
  latitude: machine.location.latitude,
  longitude: machine.location.longitude,
}));

// 4. Оптимизировать порядок
const optimizedStops = optimizationService.optimizeRoute(
  startLocation,
  stops.map(s => ({ id: s.machine_id, lat: s.latitude, lng: s.longitude }))
);

// 5. Обновить sequence
optimizedStops.forEach((stop, index) => {
  const original = stops.find(s => s.machine_id === stop.id);
  original.sequence = index + 1;
});

// 6. Сохранить остановки
await routeStopsService.createMany(stops);

// 7. Рассчитать метрики
route.estimated_distance_km = optimizationService.calculateTotalDistance(optimizedStops);
route.estimated_duration_minutes = optimizationService.estimateTravelTime(route.estimated_distance_km);
await routesService.save(route);
```

### Выполнение маршрута

```typescript
// 1. Начать маршрут
await routesService.start(routeId);

// 2. Для каждой остановки
for (const stop of route.stops) {
  // Прибыть на остановку
  await routeStopsService.arrive(stop.id);

  // Выполнить задачи (инкассация/пополнение)
  const completionData = await performTasks(stop);

  // Завершить остановку
  await routeStopsService.complete(stop.id, completionData);
}

// 3. Завершить маршрут
await routesService.complete(routeId);
```
