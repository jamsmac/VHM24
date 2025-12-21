# Client Orders - Заказы

> **Модуль**: `backend/src/modules/client/`
> **Версия**: 1.0.0
> **Последнее обновление**: 2025-12-20

---

## Обзор

Система заказов клиентской платформы. Клиенты создают заказы через мобильное приложение или веб-интерфейс, выбирая товары из меню аппарата и способ оплаты.

```
┌─────────────────────────────────────────────────────────────────────┐
│                      CLIENT ORDER SYSTEM                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    CLIENT ORDER                                │  │
│  │  ├── Привязка к machine_id                                    │  │
│  │  ├── Позиции заказа (items JSON)                              │  │
│  │  ├── 6 статусов жизненного цикла                              │  │
│  │  ├── 5 провайдеров оплаты                                     │  │
│  │  ├── Интеграция с лояльностью                                 │  │
│  │  └── Суммы: total, discount, final                            │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                   CLIENT PAYMENT                               │  │
│  │  ├── Сырые данные от провайдера                               │  │
│  │  ├── provider_tx_id (ID транзакции провайдера)                │  │
│  │  ├── raw_payload (JSON ответ провайдера)                      │  │
│  │  └── Статусы: pending, success, failed, refunded              │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Entity: ClientOrder

```typescript
@Entity('client_orders')
@Index(['client_user_id'])
@Index(['machine_id'])
@Index(['status'])
@Index(['created_at'])
export class ClientOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Связи
  @Column({ type: 'uuid' })
  client_user_id: string;

  @ManyToOne(() => ClientUser, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_user_id' })
  client_user: ClientUser;

  @Column({ type: 'uuid' })
  machine_id: string;

  @ManyToOne(() => Machine, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'machine_id' })
  machine: Machine;

  @Column({ type: 'uuid', nullable: true })
  location_id: string | null;

  @ManyToOne(() => Location, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'location_id' })
  location: Location | null;

  // Финансы
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total_amount: number;

  @Column({ type: 'varchar', length: 3, default: 'UZS' })
  currency: string;

  // Оплата
  @Column({
    type: 'enum',
    enum: PaymentProvider,
    default: PaymentProvider.TELEGRAM,
  })
  payment_provider: PaymentProvider;

  @Column({ type: 'varchar', length: 255, nullable: true })
  provider_tx_id: string | null;

  @Column({
    type: 'enum',
    enum: ClientOrderStatus,
    default: ClientOrderStatus.PENDING,
  })
  status: ClientOrderStatus;

  // Позиции заказа
  @Column({ type: 'jsonb', nullable: true })
  items: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    price: number;
  }> | null;

  // Лояльность
  @Column({ type: 'integer', default: 0 })
  loyalty_points_earned: number;

  @Column({ type: 'integer', default: 0 })
  loyalty_points_used: number;

  // Timestamps
  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  paid_at: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  completed_at: Date | null;
}
```

---

## ClientOrderStatus

```typescript
export enum ClientOrderStatus {
  PENDING = 'pending',       // Ожидает оплаты
  PAID = 'paid',             // Оплачен
  COMPLETED = 'completed',   // Выполнен (товар выдан)
  FAILED = 'failed',         // Ошибка оплаты
  CANCELLED = 'cancelled',   // Отменён клиентом
  REFUNDED = 'refunded',     // Возврат средств
}
```

### Жизненный цикл заказа

```
                    ┌──────────┐
                    │ PENDING  │ ◄─── Заказ создан
                    └────┬─────┘
                         │
          ┌──────────────┼──────────────┐
          │              │              │
          ▼              ▼              ▼
    ┌──────────┐   ┌──────────┐   ┌──────────┐
    │  FAILED  │   │   PAID   │   │CANCELLED │
    └──────────┘   └────┬─────┘   └──────────┘
                        │
                        ▼
                  ┌──────────┐
                  │COMPLETED │ ◄─── Товар выдан
                  └────┬─────┘
                       │
                       ▼
                  ┌──────────┐
                  │ REFUNDED │ ◄─── Возврат
                  └──────────┘
```

---

## PaymentProvider

```typescript
export enum PaymentProvider {
  TELEGRAM = 'telegram',   // Telegram Payments
  CLICK = 'click',         // Click.uz
  PAYME = 'payme',         // Payme.uz
  UZUM = 'uzum',           // Uzum Bank
  WALLET = 'wallet',       // Внутренний кошелёк (Phase 2)
}
```

### Сравнение провайдеров

| Провайдер | Комиссия | Валюта | Статус |
|-----------|----------|--------|--------|
| Telegram | ~2% | UZS | ✅ Активен |
| Click | ~1% | UZS | ✅ Активен |
| Payme | ~1% | UZS | ✅ Активен |
| Uzum | ~0.5% | UZS | ✅ Активен |
| Wallet | 0% | UZS | 🔜 Phase 2 |

---

## Entity: ClientPayment

Хранит сырые данные о платежах от провайдеров.

```typescript
@Entity('client_payments')
@Index(['client_user_id'])
@Index(['provider'])
@Index(['provider_tx_id'])
@Index(['status'])
export class ClientPayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  client_user_id: string;

  @ManyToOne(() => ClientUser, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_user_id' })
  client_user: ClientUser;

  @Column({
    type: 'enum',
    enum: PaymentProvider,
  })
  provider: PaymentProvider;

  @Column({ type: 'varchar', length: 255, nullable: true })
  provider_tx_id: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 3, default: 'UZS' })
  currency: string;

  @Column({
    type: 'enum',
    enum: ClientPaymentStatus,
    default: ClientPaymentStatus.PENDING,
  })
  status: ClientPaymentStatus;

  @Column({ type: 'jsonb', nullable: true })
  raw_payload: Record<string, any> | null;

  @Column({ type: 'text', nullable: true })
  error_message: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  processed_at: Date | null;
}
```

### ClientPaymentStatus

```typescript
export enum ClientPaymentStatus {
  PENDING = 'pending',     // Ожидает обработки
  SUCCESS = 'success',     // Успешно
  FAILED = 'failed',       // Ошибка
  REFUNDED = 'refunded',   // Возврат
}
```

---

## Расчёт сумм

### Структура сумм в заказе

```
total_amount        = Σ (item.price × item.quantity)
discount_amount     = points_redeemed × 100 (UZS per point)
final_amount        = total_amount - discount_amount

points_earned       = floor(final_amount × 0.01) = 1% от final_amount
points_redeemed     = количество списанных баллов
```

### Пример расчёта

```
Заказ:
  Капучино × 1 = 25,000 UZS
  Латте × 2    = 50,000 UZS
  ─────────────────────────
  total_amount = 75,000 UZS

Списание баллов: 50 баллов
  discount_amount = 50 × 100 = 5,000 UZS

final_amount = 75,000 - 5,000 = 70,000 UZS

Начисление баллов:
  points_earned = floor(70,000 × 0.01) = 700 баллов
```

---

## Сервис ClientOrdersService

### Основные методы

```typescript
@Injectable()
export class ClientOrdersService {
  // Создание заказа
  async createOrder(
    clientUser: ClientUser,
    dto: CreateClientOrderDto,
  ): Promise<ClientOrderResponseDto>;

  // Получение заказов с пагинацией
  async getOrders(
    clientUser: ClientUser,
    query: ClientOrderQueryDto,
  ): Promise<{ data: ClientOrderResponseDto[]; total: number }>;

  // Получение заказа по ID
  async getOrder(
    clientUser: ClientUser,
    orderId: string,
  ): Promise<ClientOrderResponseDto>;

  // Отмена заказа
  async cancelOrder(
    clientUser: ClientUser,
    orderId: string,
  ): Promise<ClientOrderResponseDto>;
}
```

### Логика создания заказа

```typescript
async createOrder(clientUser: ClientUser, dto: CreateClientOrderDto) {
  // 1. Валидация аппарата
  const machine = await this.machineRepository.findOne({
    where: { id: dto.machine_id },
  });
  if (!machine || machine.status !== 'active') {
    throw new BadRequestException('Machine is not available');
  }

  // 2. Формирование позиций и расчёт суммы
  let totalAmount = 0;
  const orderItems = [];
  for (const item of dto.items) {
    const product = await this.nomenclatureRepository.findOne({
      where: { id: item.product_id },
    });
    const itemTotal = product.base_price * item.quantity;
    totalAmount += itemTotal;
    orderItems.push({ product_id, name, quantity, unit_price, total_price });
  }

  // 3. Расчёт списания баллов
  if (dto.redeem_points > 0) {
    const balance = await this.loyaltyService.getBalance(clientUser.id);
    const maxRedeemable = Math.min(dto.redeem_points, balance.points_balance);
    discountFromPoints = maxRedeemable * 100; // 1 point = 100 UZS
  }

  // 4. Расчёт итоговой суммы и начисляемых баллов
  const finalAmount = totalAmount - discountFromPoints;
  const pointsEarned = Math.floor(finalAmount / 1000); // 1% = 1 point per 1000 UZS

  // 5. Создание заказа
  const order = this.orderRepository.create({
    client_user_id: clientUser.id,
    machine_id: dto.machine_id,
    status: ClientOrderStatus.PENDING,
    items: orderItems,
    total_amount: totalAmount,
    discount_amount: discountFromPoints,
    final_amount: finalAmount,
    points_earned: pointsEarned,
    points_redeemed: maxRedeemable,
    payment_provider: dto.payment_provider,
  });

  return await this.orderRepository.save(order);
}
```

---

## API Endpoints

### Создать заказ

```http
POST /api/client/orders
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "machine_id": "uuid-аппарата",
  "items": [
    { "product_id": "uuid-капучино", "quantity": 1 },
    { "product_id": "uuid-латте", "quantity": 2 }
  ],
  "payment_provider": "click",
  "redeem_points": 50,
  "promo_code": "SUMMER2025"
}
```

**Response (201 Created):**
```json
{
  "id": "uuid",
  "status": "pending",
  "total_amount": 75000,
  "discount_amount": 5000,
  "final_amount": 70000,
  "points_earned": 700,
  "points_redeemed": 50,
  "payment_provider": "click",
  "machine": {
    "id": "uuid",
    "name": "Coffee Machine #1",
    "machine_number": "M-001"
  },
  "created_at": "2025-01-15T12:00:00Z",
  "paid_at": null
}
```

### Получить список заказов

```http
GET /api/client/orders?status=completed&page=1&limit=10
Authorization: Bearer <access_token>
```

**Query параметры:**

| Параметр | Тип | Описание |
|----------|-----|----------|
| status | string | Фильтр по статусу |
| page | number | Номер страницы (default: 1) |
| limit | number | Количество на странице (default: 20) |

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "status": "completed",
      "total_amount": 75000,
      "final_amount": 70000,
      "points_earned": 700,
      "machine": { "id": "uuid", "name": "Coffee Machine #1" },
      "created_at": "2025-01-15T12:00:00Z",
      "paid_at": "2025-01-15T12:01:00Z"
    }
  ],
  "total": 25
}
```

### Получить заказ по ID

```http
GET /api/client/orders/:id
Authorization: Bearer <access_token>
```

### Отменить заказ

```http
DELETE /api/client/orders/:id
Authorization: Bearer <access_token>
```

**Ограничения:**
- Можно отменить только заказы со статусами `pending` или `created`
- При отмене возвращаются списанные баллы

---

## DTO

### CreateClientOrderDto

```typescript
export class CreateClientOrderDto {
  @IsUUID()
  machine_id: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsEnum(PaymentProvider)
  payment_provider: PaymentProvider;

  @IsOptional()
  @IsNumber()
  @Min(0)
  redeem_points?: number;

  @IsOptional()
  @IsString()
  promo_code?: string;
}

export class OrderItemDto {
  @IsUUID()
  product_id: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unit_price?: number;
}
```

### ClientOrderQueryDto

```typescript
export class ClientOrderQueryDto {
  @IsOptional()
  @IsEnum(ClientOrderStatus)
  status?: ClientOrderStatus;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
```

---

## Позиции заказа (items)

Структура JSONB:

```json
[
  {
    "product_id": "uuid-1",
    "product_name": "Капучино",
    "quantity": 1,
    "price": 25000
  },
  {
    "product_id": "uuid-2",
    "product_name": "Латте",
    "quantity": 2,
    "price": 25000
  }
]
```

---

## Интеграция с лояльностью

### При создании заказа

1. Проверка баланса баллов клиента
2. Расчёт скидки: `redeem_points × 100 UZS`
3. Расчёт начисляемых баллов: `1% от final_amount`

### При отмене заказа

1. Возврат списанных баллов
2. Отмена начисленных баллов (если были)

```typescript
async cancelOrder(clientUser: ClientUser, orderId: string) {
  const order = await this.orderRepository.findOne({ ... });

  // Проверка возможности отмены
  if (![ClientOrderStatus.CREATED, ClientOrderStatus.PENDING_PAYMENT].includes(order.status)) {
    throw new BadRequestException('Order cannot be cancelled');
  }

  // Возврат баллов
  if (order.points_redeemed > 0) {
    await this.loyaltyService.addPoints(
      clientUser,
      order.points_redeemed,
      'order_cancelled',
      `Refund for order ${order.id}`,
    );
  }

  order.status = ClientOrderStatus.CANCELLED;
  await this.orderRepository.save(order);
}
```

---

## Связи

- **ClientUser** - N:1 владелец заказа
- **Machine** - N:1 аппарат
- **Location** - N:1 локация (опционально)
- **ClientLoyaltyLedger** - 1:N транзакции баллов
- **ClientPayment** - 1:N платежи

---

## Requirements

| REQ ID | Описание |
|--------|----------|
| REQ-CLIENT-10 | Создание заказов через API |
| REQ-CLIENT-11 | Интеграция с провайдерами оплаты |
| REQ-CLIENT-12 | 6 статусов жизненного цикла |
| REQ-CLIENT-13 | Списание и начисление баллов лояльности |
| REQ-CLIENT-14 | Отмена заказов (pending/created) |
| REQ-CLIENT-15 | Возврат баллов при отмене |
| REQ-CLIENT-16 | Поддержка промо-кодов |
