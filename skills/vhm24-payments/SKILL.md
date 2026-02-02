---
name: vhm24-payments
description: |
  VendHub Payments - интеграция платёжных систем Узбекистана.
  Payme, Click, Uzum, HUMO, UZCARD, Multikassa фискализация.
  Использовать при работе с платежами и финансовым модулем.
---

# VendHub Payments

Интеграция платёжных систем для вендинговых автоматов в Узбекистане.

## Поддерживаемые системы

| Система | Тип | Назначение |
|---------|-----|------------|
| Payme | Кошелёк | Мобильные платежи |
| Click | Кошелёк | Мобильные платежи |
| Uzum Bank | Банк | Банковские карты |
| HUMO | Карты | Национальная карта |
| UZCARD | Карты | Национальная карта |
| OSON | Кошелёк | Мобильные платежи |
| Apelsin | Кошелёк | Мобильные платежи |
| Multikassa | Фискализация | Чеки, отчёты |

## Типы платежей

```typescript
// types/payment.ts
export enum PaymentMethod {
  CASH = "cash",
  PAYME = "payme",
  CLICK = "click",
  UZUM = "uzum",
  HUMO = "humo",
  UZCARD = "uzcard",
  OSON = "oson",
  APELSIN = "apelsin",
}

export enum PaymentStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
  REFUNDED = "refunded",
  CANCELLED = "cancelled",
}

export interface Payment {
  id: string;
  orderId: number;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId?: string;
  fiscalReceiptId?: string;
  createdAt: Date;
  completedAt?: Date;
  metadata?: Record<string, unknown>;
}
```

## Payme интеграция

### Инициализация платежа

```typescript
// server/payments/payme.ts
import crypto from "crypto";

const PAYME_MERCHANT_ID = process.env.PAYME_MERCHANT_ID!;
const PAYME_KEY = process.env.PAYME_KEY!;
const PAYME_URL = "https://checkout.paycom.uz";

export async function createPaymePayment(order: Order): Promise<string> {
  const params = {
    m: PAYME_MERCHANT_ID,
    ac: { order_id: order.id },
    a: order.amount * 100, // В тийинах (1 UZS = 100 тийин)
    c: generatePaymentUrl(order.id),
  };

  const base64Params = Buffer.from(JSON.stringify(params)).toString("base64");
  return `${PAYME_URL}/${base64Params}`;
}

// Webhook обработчик
export async function handlePaymeWebhook(body: PaymeWebhookBody) {
  const { method, params, id } = body;

  switch (method) {
    case "CheckPerformTransaction":
      return await checkPerformTransaction(params);

    case "CreateTransaction":
      return await createTransaction(params);

    case "PerformTransaction":
      return await performTransaction(params);

    case "CancelTransaction":
      return await cancelTransaction(params);

    case "CheckTransaction":
      return await checkTransaction(params);

    default:
      throw new PaymeError(-32601, "Method not found");
  }
}
```

### Payme Webhook Types

```typescript
interface PaymeWebhookBody {
  method: string;
  params: PaymeParams;
  id: number;
}

interface PaymeParams {
  id?: string;
  time?: number;
  amount?: number;
  account?: {
    order_id: number;
  };
  reason?: number;
}

class PaymeError extends Error {
  constructor(public code: number, message: string) {
    super(message);
  }
}
```

## Click интеграция

```typescript
// server/payments/click.ts
const CLICK_MERCHANT_ID = process.env.CLICK_MERCHANT_ID!;
const CLICK_SERVICE_ID = process.env.CLICK_SERVICE_ID!;
const CLICK_SECRET_KEY = process.env.CLICK_SECRET_KEY!;

export function generateClickUrl(order: Order): string {
  const params = new URLSearchParams({
    merchant_id: CLICK_MERCHANT_ID,
    service_id: CLICK_SERVICE_ID,
    amount: order.amount.toString(),
    transaction_param: order.id.toString(),
    return_url: `${process.env.APP_URL}/payment/success`,
  });

  return `https://my.click.uz/services/pay?${params}`;
}

// Prepare callback
export async function handleClickPrepare(params: ClickPrepareParams) {
  const { click_trans_id, merchant_trans_id, amount } = params;

  // Проверка подписи
  const signString = `${click_trans_id}${CLICK_SERVICE_ID}${CLICK_SECRET_KEY}${merchant_trans_id}${amount}`;
  const expectedSign = md5(signString);

  if (params.sign_string !== expectedSign) {
    return { error: -1, error_note: "Invalid sign" };
  }

  const order = await db.orders.findUnique({
    where: { id: parseInt(merchant_trans_id) },
  });

  if (!order) {
    return { error: -5, error_note: "Order not found" };
  }

  if (order.amount !== parseFloat(amount)) {
    return { error: -2, error_note: "Invalid amount" };
  }

  return {
    click_trans_id,
    merchant_trans_id,
    merchant_prepare_id: order.id,
    error: 0,
    error_note: "Success",
  };
}
```

## Multikassa фискализация

```typescript
// server/payments/multikassa.ts
const MULTIKASSA_URL = process.env.MULTIKASSA_URL!;
const MULTIKASSA_LOGIN = process.env.MULTIKASSA_LOGIN!;
const MULTIKASSA_PASSWORD = process.env.MULTIKASSA_PASSWORD!;

interface FiscalReceipt {
  id: string;
  qrCode: string;
  fiscalSign: string;
  receiptNumber: string;
  fiscalDocumentNumber: number;
}

export async function createFiscalReceipt(order: Order): Promise<FiscalReceipt> {
  const items = order.items.map((item) => ({
    name: item.product.name,
    price: item.price,
    quantity: item.quantity,
    vat_percent: 12, // НДС 12%
    product_code: item.product.sku,
  }));

  const response = await fetch(`${MULTIKASSA_URL}/api/v1/receipt`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${MULTIKASSA_LOGIN}:${MULTIKASSA_PASSWORD}`).toString("base64")}`,
    },
    body: JSON.stringify({
      receipt_type: "SALE",
      items,
      payments: [
        {
          type: mapPaymentMethod(order.paymentMethod),
          amount: order.amount,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to create fiscal receipt");
  }

  return response.json();
}

function mapPaymentMethod(method: PaymentMethod): string {
  switch (method) {
    case PaymentMethod.CASH:
      return "CASH";
    case PaymentMethod.HUMO:
    case PaymentMethod.UZCARD:
      return "CARD";
    default:
      return "ELECTRONIC";
  }
}
```

## UI компоненты

### Payment Method Selector

```tsx
function PaymentMethodSelector({
  value,
  onChange,
}: {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
}) {
  const methods = [
    { id: PaymentMethod.PAYME, name: "Payme", icon: "/icons/payme.svg" },
    { id: PaymentMethod.CLICK, name: "Click", icon: "/icons/click.svg" },
    { id: PaymentMethod.UZUM, name: "Uzum Bank", icon: "/icons/uzum.svg" },
    { id: PaymentMethod.HUMO, name: "HUMO", icon: "/icons/humo.svg" },
    { id: PaymentMethod.UZCARD, name: "UZCARD", icon: "/icons/uzcard.svg" },
    { id: PaymentMethod.CASH, name: "Наличные", icon: "/icons/cash.svg" },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {methods.map((method) => (
        <button
          key={method.id}
          onClick={() => onChange(method.id)}
          className={cn(
            "flex flex-col items-center p-4 rounded-xl border-2 transition-all",
            value === method.id
              ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20"
              : "border-gray-200 dark:border-gray-700 hover:border-amber-300"
          )}
        >
          <img src={method.icon} alt={method.name} className="w-12 h-12 mb-2" />
          <span className="text-sm font-medium">{method.name}</span>
        </button>
      ))}
    </div>
  );
}
```

### Payment Status Badge

```tsx
const paymentStatusConfig: Record<PaymentStatus, { label: string; className: string; icon: LucideIcon }> = {
  [PaymentStatus.PENDING]: {
    label: "Ожидает",
    className: "bg-yellow-100 text-yellow-700",
    icon: Clock,
  },
  [PaymentStatus.PROCESSING]: {
    label: "Обработка",
    className: "bg-blue-100 text-blue-700",
    icon: Loader2,
  },
  [PaymentStatus.COMPLETED]: {
    label: "Оплачено",
    className: "bg-green-100 text-green-700",
    icon: CheckCircle,
  },
  [PaymentStatus.FAILED]: {
    label: "Ошибка",
    className: "bg-red-100 text-red-700",
    icon: XCircle,
  },
  [PaymentStatus.REFUNDED]: {
    label: "Возврат",
    className: "bg-purple-100 text-purple-700",
    icon: RotateCcw,
  },
  [PaymentStatus.CANCELLED]: {
    label: "Отменён",
    className: "bg-gray-100 text-gray-700",
    icon: Ban,
  },
};

function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const config = paymentStatusConfig[status];
  const Icon = config.icon;

  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium", config.className)}>
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
}
```

### Transaction History

```tsx
function TransactionHistory({ machineId }: { machineId?: number }) {
  const { data, isLoading } = api.payments.list.useQuery({
    machineId,
    limit: 50,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>История транзакций</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Дата</TableHead>
              <TableHead>Способ</TableHead>
              <TableHead>Сумма</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Чек</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.items.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell className="font-mono text-sm">
                  {payment.transactionId || payment.id}
                </TableCell>
                <TableCell>
                  {format(payment.createdAt, "dd.MM.yy HH:mm")}
                </TableCell>
                <TableCell>
                  <PaymentMethodBadge method={payment.method} />
                </TableCell>
                <TableCell className="font-medium">
                  {formatCurrency(payment.amount)}
                </TableCell>
                <TableCell>
                  <PaymentStatusBadge status={payment.status} />
                </TableCell>
                <TableCell>
                  {payment.fiscalReceiptId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => downloadReceipt(payment.fiscalReceiptId)}
                    >
                      <Receipt className="w-4 h-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
```

## Инкассация

```typescript
// types/collection.ts
export interface CashCollection {
  id: number;
  machineId: number;
  collectorId: number;
  amount: number;
  denominations: Record<number, number>; // { 1000: 5, 5000: 10, ... }
  collectedAt: Date;
  syncedAt?: Date;
  signature?: string;
  photos?: string[];
}

// Подсчёт купюр
function DenominationCounter({ value, onChange }: DenominationCounterProps) {
  const denominations = [100000, 50000, 20000, 10000, 5000, 2000, 1000, 500, 200, 100];

  const total = Object.entries(value).reduce(
    (sum, [denom, count]) => sum + parseInt(denom) * count,
    0
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {denominations.map((denom) => (
          <div key={denom} className="flex items-center gap-2 p-2 border rounded-lg">
            <span className="w-24 font-mono">{formatCurrency(denom)}</span>
            <Input
              type="number"
              min={0}
              value={value[denom] || 0}
              onChange={(e) =>
                onChange({ ...value, [denom]: parseInt(e.target.value) || 0 })
              }
              className="w-20 text-center"
            />
            <span className="text-sm text-gray-500">
              = {formatCurrency(denom * (value[denom] || 0))}
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
        <span className="font-medium">Итого:</span>
        <span className="text-2xl font-bold">{formatCurrency(total)}</span>
      </div>
    </div>
  );
}
```

## Ссылки

- `references/payme-api.md` - Документация Payme API
- `references/click-api.md` - Документация Click API
- `references/multikassa-api.md` - Документация Multikassa
