# Client Loyalty - Программа лояльности

> **Модуль**: `backend/src/modules/client/`
> **Версия**: 1.0.0
> **Последнее обновление**: 2025-12-20

---

## Обзор

Программа лояльности для клиентов. Баллы начисляются за покупки и могут использоваться для скидок. Поддержка бонусных программ и реферальной системы.

```
┌─────────────────────────────────────────────────────────────────────┐
│                      LOYALTY SYSTEM                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                LOYALTY ACCOUNT                                 │  │
│  │  ├── points_balance (текущий баланс)                          │  │
│  │  ├── lifetime_points (всего заработано)                       │  │
│  │  └── Один аккаунт на пользователя                             │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                LOYALTY LEDGER                                  │  │
│  │  ├── Неизменяемая история транзакций                          │  │
│  │  ├── delta (+/- баллов)                                       │  │
│  │  ├── reason (тип операции)                                    │  │
│  │  └── balance_after (баланс после операции)                    │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                  EARNING RULES                                 │  │
│  │  ├── 1% от суммы заказа = баллы                               │  │
│  │  ├── 1 балл = 100 UZS                                         │  │
│  │  └── Реферальные и промо бонусы                               │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Entity: ClientLoyaltyAccount

Хранит текущий баланс баллов клиента.

```typescript
@Entity('client_loyalty_accounts')
@Index(['client_user_id'], { unique: true })
export class ClientLoyaltyAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  client_user_id: string;

  @OneToOne(() => ClientUser, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_user_id' })
  client_user: ClientUser;

  @Column({ type: 'integer', default: 0 })
  points_balance: number;  // Текущий баланс

  @Column({ type: 'integer', default: 0 })
  lifetime_points: number;  // Всего заработано за всё время

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;
}
```

---

## Entity: ClientLoyaltyLedger

Неизменяемая история всех операций с баллами.

```typescript
@Entity('client_loyalty_ledger')
@Index(['client_user_id'])
@Index(['order_id'])
@Index(['created_at'])
export class ClientLoyaltyLedger {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  client_user_id: string;

  @ManyToOne(() => ClientUser, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_user_id' })
  client_user: ClientUser;

  @Column({ type: 'integer' })
  delta: number;  // +N или -N баллов

  @Column({
    type: 'enum',
    enum: LoyaltyTransactionReason,
  })
  reason: LoyaltyTransactionReason;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'uuid', nullable: true })
  order_id: string | null;

  @ManyToOne(() => ClientOrder, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'order_id' })
  order: ClientOrder | null;

  @Column({ type: 'integer' })
  balance_after: number;  // Баланс после операции

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;
}
```

---

## LoyaltyTransactionReason

```typescript
export enum LoyaltyTransactionReason {
  ORDER_EARNED = 'order_earned',         // Начисление за заказ
  ORDER_REDEEMED = 'order_redeemed',     // Списание на скидку
  REFERRAL_BONUS = 'referral_bonus',     // Реферальный бонус
  PROMO_BONUS = 'promo_bonus',           // Промо-бонус
  MANUAL_ADJUSTMENT = 'manual_adjustment', // Ручная корректировка
  EXPIRATION = 'expiration',             // Истечение срока (планируется)
}
```

### Типы транзакций

| Тип | Delta | Описание |
|-----|-------|----------|
| order_earned | +N | Начисление за заказ |
| order_redeemed | -N | Списание на скидку |
| referral_bonus | +N | Бонус за приглашение |
| promo_bonus | +N | Промо-акция |
| manual_adjustment | ±N | Ручная корректировка админом |
| expiration | -N | Сгорание баллов (планируется) |

---

## Правила начисления и списания

### Начисление (Earning)

```
EARN RATE = 1% от суммы заказа

Формула: points = floor(final_amount × 0.01)

Пример:
  Сумма заказа: 50,000 UZS
  Баллов: floor(50,000 × 0.01) = 500 баллов
```

### Списание (Redemption)

```
POINTS VALUE = 1 балл = 100 UZS

Формула: discount = points × 100 UZS

Пример:
  Баллов: 100
  Скидка: 100 × 100 = 10,000 UZS
```

### Визуализация

```
┌─────────────────────────────────────────────────────────────────────┐
│                    LOYALTY ECONOMICS                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────────┐       ┌───────────────────────┐          │
│  │      EARNING          │       │      REDEMPTION       │          │
│  │                       │       │                       │          │
│  │  100,000 UZS заказ    │       │  1000 баллов          │          │
│  │        ↓              │       │        ↓              │          │
│  │  × 0.01 (1%)          │       │  × 100 UZS            │          │
│  │        ↓              │       │        ↓              │          │
│  │  = 1000 баллов        │       │  = 100,000 UZS скидка │          │
│  │                       │       │                       │          │
│  └───────────────────────┘       └───────────────────────┘          │
│                                                                     │
│  ROI для клиента:                                                   │
│  ─────────────────                                                  │
│  Потратил: 100,000 UZS → Получил: 1000 баллов                       │
│  Использовал: 1000 баллов → Скидка: 100,000 UZS                     │
│                                                                     │
│  Эффективный кэшбэк: 1% × 100 = 100% (при полном использовании)     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Сервис ClientLoyaltyService

### Константы

```typescript
@Injectable()
export class ClientLoyaltyService {
  // 1 балл = 100 UZS
  private readonly POINTS_VALUE_UZS = 100;

  // 1% от суммы заказа
  private readonly POINTS_EARN_RATE = 0.01;
}
```

### Основные методы

```typescript
@Injectable()
export class ClientLoyaltyService {
  // Получить или создать аккаунт лояльности
  async getOrCreateAccount(clientUserId: string): Promise<ClientLoyaltyAccount>;

  // Получить баланс
  async getBalance(clientUserId: string): Promise<{
    points_balance: number;
    lifetime_points: number;
    points_value_uzs: number;  // Эквивалент в UZS
  }>;

  // Рассчитать баллы за сумму
  calculatePointsToEarn(amountUzs: number): number;

  // Рассчитать стоимость баллов
  calculatePointsValue(points: number): number;

  // Начислить баллы за заказ
  async earnPoints(
    clientUserId: string,
    points: number,
    orderId: string,
    description?: string,
  ): Promise<ClientLoyaltyLedger>;

  // Списать баллы на скидку
  async redeemPoints(
    clientUserId: string,
    points: number,
    orderId: string,
    description?: string,
  ): Promise<ClientLoyaltyLedger>;

  // Добавить бонусные баллы
  async addBonusPoints(
    clientUserId: string,
    points: number,
    reason: LoyaltyTransactionReason.REFERRAL_BONUS | LoyaltyTransactionReason.PROMO_BONUS,
    description: string,
  ): Promise<ClientLoyaltyLedger>;

  // Ручная корректировка (admin)
  async adjustPoints(
    clientUserId: string,
    points: number,  // может быть отрицательным
    description: string,
  ): Promise<ClientLoyaltyLedger>;

  // История транзакций
  async getHistory(
    clientUserId: string,
    options: { page?: number; limit?: number },
  ): Promise<{
    data: ClientLoyaltyLedger[];
    total: number;
    page: number;
    limit: number;
  }>;
}
```

### Атомарные транзакции

Все операции с балансом выполняются в транзакции с блокировкой:

```typescript
private async createTransaction(
  clientUserId: string,
  delta: number,
  reason: LoyaltyTransactionReason,
  orderId: string | null,
  description: string,
): Promise<ClientLoyaltyLedger> {
  return this.dataSource.transaction(async (manager) => {
    const accountRepo = manager.getRepository(ClientLoyaltyAccount);
    const ledgerRepo = manager.getRepository(ClientLoyaltyLedger);

    // Lock account row for update (pessimistic lock)
    const account = await accountRepo.findOne({
      where: { client_user_id: clientUserId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!account) {
      throw new BadRequestException('Loyalty account not found');
    }

    const newBalance = account.points_balance + delta;

    if (newBalance < 0) {
      throw new BadRequestException('Insufficient points balance');
    }

    // Update account balance
    account.points_balance = newBalance;
    if (delta > 0) {
      account.lifetime_points += delta;
    }
    await accountRepo.save(account);

    // Create ledger entry
    const ledgerEntry = ledgerRepo.create({
      client_user_id: clientUserId,
      delta,
      reason,
      description,
      order_id: orderId,
      balance_after: newBalance,
    });

    return await ledgerRepo.save(ledgerEntry);
  });
}
```

---

## API Endpoints

### Получить баланс

```http
GET /api/client/loyalty/balance
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "points_balance": 1500,
  "lifetime_points": 5000,
  "points_value_uzs": 150000
}
```

### Получить историю

```http
GET /api/client/loyalty/history?page=1&limit=20
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "delta": 500,
      "reason": "order_earned",
      "description": "Points earned from order",
      "order_id": "uuid-order",
      "balance_after": 1500,
      "created_at": "2025-01-15T12:00:00Z"
    },
    {
      "id": "uuid-2",
      "delta": -100,
      "reason": "order_redeemed",
      "description": "Points redeemed for discount",
      "order_id": "uuid-order-2",
      "balance_after": 1000,
      "created_at": "2025-01-14T10:00:00Z"
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 20
}
```

---

## Кошелёк (Phase 2)

### Entity: ClientWallet

```typescript
@Entity('client_wallets')
@Index(['client_user_id'], { unique: true })
export class ClientWallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  client_user_id: string;

  @OneToOne(() => ClientUser, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_user_id' })
  client_user: ClientUser;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  balance: number;  // Предоплаченный баланс в UZS

  @Column({ type: 'varchar', length: 3, default: 'UZS' })
  currency: string;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;
}
```

### Entity: ClientWalletLedger

```typescript
@Entity('client_wallet_ledger')
@Index(['client_user_id'])
@Index(['order_id'])
@Index(['payment_id'])
@Index(['created_at'])
export class ClientWalletLedger {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  client_user_id: string;

  @ManyToOne(() => ClientUser, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_user_id' })
  client_user: ClientUser;

  @Column({
    type: 'enum',
    enum: WalletTransactionType,
  })
  transaction_type: WalletTransactionType;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;  // +/- сумма

  @Column({ type: 'varchar', length: 3, default: 'UZS' })
  currency: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'uuid', nullable: true })
  order_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  payment_id: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  balance_after: number;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;
}
```

### WalletTransactionType

```typescript
export enum WalletTransactionType {
  TOP_UP = 'top_up',                   // Пополнение
  PURCHASE = 'purchase',               // Покупка
  REFUND = 'refund',                   // Возврат
  MANUAL_ADJUSTMENT = 'manual_adjustment', // Ручная корректировка
  BONUS = 'bonus',                     // Бонус
}
```

### Планируемый функционал кошелька

1. **Пополнение** через провайдеров (Click, Payme, Uzum)
2. **Оплата заказов** с кошелька (PaymentProvider.WALLET)
3. **Возврат средств** на кошелёк при отмене заказа
4. **Бонусы** от акций и промо-кодов

---

## Сценарии использования

### Сценарий 1: Первый заказ

```
1. Клиент регистрируется через Telegram
   → Создаётся ClientLoyaltyAccount с points_balance=0

2. Клиент делает заказ на 50,000 UZS
   → Начисляется 500 баллов (1%)
   → Ledger: +500, reason=order_earned
   → points_balance = 500, lifetime_points = 500
```

### Сценарий 2: Использование баллов

```
1. У клиента 1000 баллов

2. Клиент делает заказ на 30,000 UZS
   → Списывает 200 баллов
   → Скидка: 200 × 100 = 20,000 UZS
   → К оплате: 30,000 - 20,000 = 10,000 UZS

3. Начисление за заказ:
   → 1% от 10,000 = 100 баллов

4. Итоговый баланс:
   → 1000 - 200 + 100 = 900 баллов
```

### Сценарий 3: Реферальная программа

```
1. Клиент A приглашает клиента B

2. Клиент B делает первый заказ
   → Клиенту A начисляется 500 баллов (referral_bonus)
   → Клиенту B начисляется 500 баллов (promo_bonus)
```

### Сценарий 4: Отмена заказа

```
1. Клиент создаёт заказ и списывает 100 баллов

2. Клиент отменяет заказ
   → Возврат 100 баллов
   → Ledger: +100, reason=order_cancelled (или manual_adjustment)
```

---

## Интеграции

- **ClientOrder** - начисление и списание при заказах
- **ClientUser** - один аккаунт лояльности на пользователя
- **Referral System** (планируется) - реферальные бонусы
- **Promo Campaigns** (планируется) - промо-акции

---

## Requirements

| REQ ID | Описание |
|--------|----------|
| REQ-CLIENT-20 | Программа лояльности с баллами |
| REQ-CLIENT-21 | Начисление 1% от суммы заказа |
| REQ-CLIENT-22 | Списание 1 балл = 100 UZS |
| REQ-CLIENT-23 | История транзакций (ledger) |
| REQ-CLIENT-24 | Атомарные операции с балансом |
| REQ-CLIENT-25 | Реферальные бонусы |
| REQ-CLIENT-26 | Промо-бонусы |
| REQ-CLIENT-40 | Кошелёк (Phase 2) |
| REQ-CLIENT-41 | Пополнение кошелька |
| REQ-CLIENT-42 | Оплата с кошелька |
