# Complaints - Жалобы клиентов

> **Модуль**: `backend/src/modules/complaints/`
> **Версия**: 1.0.0
> **Последнее обновление**: 2025-12-20

---

## Обзор

Система жалоб позволяет клиентам подавать жалобы через QR-код на аппарате без авторизации. Жалобы обрабатываются сотрудниками и могут включать возврат средств.

```
┌─────────────────────────────────────────────────────────────────────┐
│                      COMPLAINT FLOW                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│     ┌──────────────┐                                                │
│     │  QR-код на   │                                                │
│     │   аппарате   │                                                │
│     └──────┬───────┘                                                │
│            │ Сканирование                                           │
│            ▼                                                        │
│     ┌──────────────┐                                                │
│     │ Публичная    │  POST /complaints/public/qr                    │
│     │ форма жалобы │  (без авторизации)                             │
│     └──────┬───────┘                                                │
│            │                                                        │
│            ▼                                                        │
│     ┌────────────┐                                                  │
│     │    NEW     │◀───────── Жалоба создана                        │
│     │  (новая)   │                                                  │
│     └─────┬──────┘                                                  │
│           │ takeInReview()                                          │
│           ▼                                                         │
│     ┌────────────┐                                                  │
│     │ IN_REVIEW  │◀───────── Взята в обработку                     │
│     │(на рассмотр)│                                                 │
│     └─────┬──────┘                                                  │
│           │                                                         │
│     ┌─────┴──────┐                                                  │
│     │            │                                                  │
│     ▼            ▼                                                  │
│┌──────────┐ ┌──────────┐                                           │
││ RESOLVED │ │ REJECTED │                                           │
││ (решена) │ │(отклонена)│                                           │
│└──────────┘ └──────────┘                                           │
│     │                                                               │
│     ▼                                                               │
│  Возврат средств (опционально)                                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Entity: Complaint

```typescript
@Entity('complaints')
@Index(['complaint_type'])
@Index(['status'])
@Index(['machine_id'])
@Index(['submitted_at'])
export class Complaint extends BaseEntity {
  // Классификация
  @Column({ type: 'enum', enum: ComplaintType })
  complaint_type: ComplaintType;

  @Column({ type: 'enum', enum: ComplaintStatus, default: ComplaintStatus.NEW })
  status: ComplaintStatus;

  // Привязка к аппарату
  @Column({ type: 'uuid' })
  machine_id: string;

  @ManyToOne(() => Machine, { onDelete: 'CASCADE', eager: true })
  machine: Machine;

  // Описание жалобы
  @Column({ type: 'text' })
  description: string;

  // Контактные данные клиента (опционально)
  @Column({ type: 'varchar', length: 200, nullable: true })
  customer_name: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  customer_phone: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  customer_email: string | null;

  // Дата подачи
  @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  submitted_at: Date;

  // Обработка
  @Column({ type: 'uuid', nullable: true })
  handled_by_user_id: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  resolved_at: Date | null;

  @Column({ type: 'text', nullable: true })
  response: string | null;

  // Возврат
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  refund_amount: number | null;

  @Column({ type: 'uuid', nullable: true })
  refund_transaction_id: string | null;

  // Оценка
  @Column({ type: 'integer', nullable: true })
  rating: number | null;  // 1-5

  // Метаданные
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}
```

---

## Типы жалоб (ComplaintType)

```typescript
export enum ComplaintType {
  PRODUCT_QUALITY = 'product_quality',       // Качество продукта
  NO_CHANGE = 'no_change',                   // Не выдана сдача
  PRODUCT_NOT_DISPENSED = 'product_not_dispensed', // Продукт не выдан
  MACHINE_DIRTY = 'machine_dirty',           // Грязный аппарат
  OTHER = 'other',                           // Прочее
}
```

| Тип | Описание | Частота |
|-----|----------|---------|
| `product_quality` | Холодный кофе, плохой вкус | ~30% |
| `no_change` | Не выдана сдача | ~25% |
| `product_not_dispensed` | Продукт не выдан, деньги списаны | ~25% |
| `machine_dirty` | Грязный аппарат, неприятный запах | ~10% |
| `other` | Прочие жалобы | ~10% |

---

## Статусы (ComplaintStatus)

```typescript
export enum ComplaintStatus {
  NEW = 'new',             // Новая, ожидает рассмотрения
  IN_REVIEW = 'in_review', // На рассмотрении
  RESOLVED = 'resolved',   // Решена
  REJECTED = 'rejected',   // Отклонена
}
```

---

## Публичный API (без авторизации)

### QR-код на аппарате

Каждый аппарат имеет уникальный QR-код, ведущий на форму жалобы:

```
https://vendhub.uz/public/complaint/QR-M7K3F92A8B1C
```

### Создание жалобы через QR

```http
POST /api/complaints/public/qr
Content-Type: application/json

{
  "qr_code": "QR-M7K3F92A8B1C",
  "complaint_type": "product_not_dispensed",
  "description": "Заплатил за кофе, но ничего не получил",
  "customer_name": "Иван Иванов",
  "customer_phone": "+998901234567",
  "rating": 1
}
```

**Особенности:**
- Не требует авторизации
- Rate limiting: 10 жалоб/минуту с одного IP
- QR-код резолвится в machine_id
- Возвращает 404 если QR-код не найден

---

## Сервис ComplaintsService

### Основные методы

```typescript
@Injectable()
export class ComplaintsService {
  // Создание жалобы (стандартное)
  async create(dto: CreateComplaintDto): Promise<Complaint>;

  // Создание через QR-код
  async createFromQrCode(dto: CreatePublicComplaintDto): Promise<Complaint>;

  // Получение списка с фильтрацией
  async findAll(
    status?: ComplaintStatus,
    type?: ComplaintType,
    machineId?: string,
  ): Promise<Complaint[]>;

  // Получение по ID
  async findOne(id: string): Promise<Complaint>;

  // Взять в обработку
  async takeInReview(id: string, userId: string): Promise<Complaint>;

  // Решить жалобу
  async resolve(id: string, userId: string, dto: HandleComplaintDto): Promise<Complaint>;

  // Отклонить жалобу
  async reject(id: string, userId: string, reason: string): Promise<Complaint>;

  // Удаление (soft delete)
  async remove(id: string): Promise<void>;

  // Статистика
  async getStats(): Promise<ComplaintStats>;

  // Новые жалобы
  async getNewComplaints(): Promise<Complaint[]>;
}
```

---

## API Endpoints (с авторизацией)

### Получить список жалоб

```http
GET /api/complaints?status=new&type=product_quality
Authorization: Bearer <token>
```

### Получить статистику

```http
GET /api/complaints/stats
Authorization: Bearer <token>
```

**Response:**
```json
{
  "total": 250,
  "by_status": [
    { "status": "new", "count": 15 },
    { "status": "in_review", "count": 5 },
    { "status": "resolved", "count": 200 },
    { "status": "rejected", "count": 30 }
  ],
  "by_type": [
    { "type": "product_not_dispensed", "count": 70 },
    { "type": "no_change", "count": 60 }
  ],
  "avg_resolution_time_hours": 2.5,
  "total_refunds": 5000000,
  "avg_rating": 2.3
}
```

### Новые жалобы (требуют внимания)

```http
GET /api/complaints/new
Authorization: Bearer <token>
```

Возвращает жалобы в статусе NEW, отсортированные по времени.

### Взять в обработку

```http
POST /api/complaints/:id/take
Authorization: Bearer <token>
```

Текущий пользователь становится обработчиком.

### Решить жалобу

```http
POST /api/complaints/:id/resolve
Authorization: Bearer <token>

{
  "response": "Приносим извинения. Возврат средств выполнен.",
  "refund_amount": 15000,
  "refund_transaction_id": "uuid-транзакции"
}
```

### Отклонить жалобу

```http
POST /api/complaints/:id/reject
Authorization: Bearer <token>

{
  "reason": "Невозможно подтвердить факт оплаты"
}
```

---

## Rate Limiting

Публичные endpoints защищены от злоупотреблений:

```typescript
@Throttle({ default: { limit: 10, ttl: 60000 } })
@Post('public/qr')
createFromQrCode(@Body() dto: CreatePublicComplaintDto) { ... }
```

10 запросов в минуту с одного IP-адреса.

---

## Оценки (Rating)

Клиенты могут оставить оценку при подаче жалобы:

```typescript
@Column({ type: 'integer', nullable: true })
rating: number | null;  // 1-5
```

Используется для:
- Аналитики качества обслуживания
- Выявления проблемных аппаратов
- Мотивации операторов

---

## Права доступа

| Операция | Требуется авторизация | Роли |
|----------|----------------------|------|
| Создание (публичное) | Нет | - |
| Просмотр списка | Да | Все авторизованные |
| Просмотр по ID | Да | Все авторизованные |
| Взять в обработку | Да | Все авторизованные |
| Решить | Да | Все авторизованные |
| Отклонить | Да | Все авторизованные |
| Удалить | Да | Admin, Manager |

---

## Интеграция с QR-кодами

### Генерация QR-кода

QR-код генерируется при создании аппарата (см. QrCodeService):

```typescript
async generateQrCodeImage(machineId: string): Promise<string> {
  const machine = await this.machineRepository.findOne({
    where: { id: machineId },
  });

  const complaintUrl = this.getComplaintUrl(machine.qr_code);
  // https://vendhub.uz/public/complaint/QR-XXX

  return await QRCode.toDataURL(complaintUrl, {
    errorCorrectionLevel: 'M',
    width: 400,
  });
}
```

### Резолвинг QR-кода

```typescript
async createFromQrCode(dto: CreatePublicComplaintDto): Promise<Complaint> {
  // Находим аппарат по QR-коду
  const machine = await this.machinesService.findByQrCodePublic(dto.qr_code);

  // Создаём жалобу с machine_id
  const complaint = this.complaintRepository.create({
    machine_id: machine.id,
    complaint_type: dto.complaint_type,
    description: dto.description,
    customer_name: dto.customer_name,
    customer_phone: dto.customer_phone,
    status: ComplaintStatus.NEW,
  });

  return this.complaintRepository.save(complaint);
}
```

---

## Возвраты

При решении жалобы можно указать сумму возврата:

```typescript
complaint.refund_amount = dto.refund_amount || null;
complaint.refund_transaction_id = dto.refund_transaction_id || null;
```

### Интеграция с транзакциями

```typescript
// При решении жалобы с возвратом
if (dto.refund_amount) {
  const transaction = await this.transactionsService.createRefund({
    machine_id: complaint.machine_id,
    amount: dto.refund_amount,
    reason: `Возврат по жалобе #${complaint.id}`,
  });
  dto.refund_transaction_id = transaction.id;
}
```

---

## Уведомления

| Событие | Получатели | Каналы |
|---------|------------|--------|
| Новая жалоба | Manager | Push, Dashboard |
| Много жалоб на аппарат | Admin, Manager | Email |
| Жалоба не обработана >24ч | Manager | Push, Email |

---

## Метрики

```sql
-- Среднее время обработки
SELECT
  AVG(EXTRACT(EPOCH FROM (resolved_at - submitted_at)) / 3600) as avg_hours
FROM complaints
WHERE resolved_at IS NOT NULL;

-- Аппараты с наибольшим количеством жалоб
SELECT
  m.machine_number,
  m.name,
  COUNT(c.id) as complaint_count,
  AVG(c.rating) as avg_rating
FROM complaints c
JOIN machines m ON c.machine_id = m.id
WHERE c.submitted_at > NOW() - INTERVAL '30 days'
GROUP BY m.id
ORDER BY complaint_count DESC
LIMIT 10;

-- Сумма возвратов по месяцам
SELECT
  DATE_TRUNC('month', resolved_at) as month,
  SUM(refund_amount) as total_refunds
FROM complaints
WHERE refund_amount IS NOT NULL
GROUP BY month
ORDER BY month DESC;
```

---

## Requirements

| REQ ID | Описание |
|--------|----------|
| REQ-COMP-01 | Публичная форма жалоб через QR-код |
| REQ-COMP-02 | 5 типов жалоб |
| REQ-COMP-03 | Контактные данные клиента (опционально) |
| REQ-COMP-10 | Workflow обработки жалоб |
| REQ-COMP-11 | Возможность возврата средств |
| REQ-COMP-20 | Rate limiting публичного API |
| REQ-COMP-30 | Оценка клиента (1-5) |
| REQ-COMP-40 | Статистика и метрики |
