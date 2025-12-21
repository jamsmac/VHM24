# Sales Import Documentation

> **Модуль**: `backend/src/modules/sales-import/`
> **Версия**: 1.0.0
> **Последнее обновление**: 2025-12-21

---

## Обзор

Модуль импорта данных о продажах из Excel и CSV файлов. Поддерживает асинхронную обработку через очередь, автоматическое определение типа файла и маппинг колонок.

```
┌─────────────────────────────────────────────────────────────────────┐
│                      SALES IMPORT SYSTEM                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    IMPORT FLOW                                 │  │
│  │                                                                │  │
│  │  Upload File ──► Parse (Excel/CSV) ──► Process Rows           │  │
│  │       │                                      │                 │  │
│  │       ▼                                      ▼                 │  │
│  │  Create SalesImport ──► Bull Queue ──► Create Transactions    │  │
│  │       │                                      │                 │  │
│  │       ▼                                      ▼                 │  │
│  │  Return Job ID ◄─────────────────────  Update Inventory       │  │
│  │                                                                │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                 FILE FORMATS                                   │  │
│  │  ├── Excel (.xlsx, .xls)                                      │  │
│  │  └── CSV (.csv)                                               │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │              COLUMN DETECTION                                  │  │
│  │  Supports Russian and English column names:                    │  │
│  │  ├── date / Дата / sale_date                                  │  │
│  │  ├── machine / Аппарат / machine_number                       │  │
│  │  ├── amount / Сумма / total                                   │  │
│  │  ├── payment / Способ оплаты / payment_method                 │  │
│  │  ├── product / Товар / product_name                           │  │
│  │  └── quantity / Количество                                    │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Enums

### ImportStatus

```typescript
export enum ImportStatus {
  PENDING = 'pending',       // Ожидает обработки в очереди
  PROCESSING = 'processing', // Обрабатывается
  COMPLETED = 'completed',   // Успешно завершён (все строки)
  FAILED = 'failed',         // Полностью не удался
  PARTIAL = 'partial',       // Частично успешен (есть ошибки)
}
```

### ImportFileType

```typescript
export enum ImportFileType {
  EXCEL = 'excel', // .xlsx, .xls
  CSV = 'csv',     // .csv
}
```

---

## Entity

### SalesImport Entity

```typescript
@Entity('sales_imports')
export class SalesImport extends BaseEntity {
  @Column({ type: 'uuid' })
  uploaded_by_user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'uploaded_by_user_id' })
  uploaded_by: User;

  @Column({ type: 'varchar', length: 500 })
  filename: string;

  @Column({ type: 'enum', enum: ImportFileType })
  file_type: ImportFileType;

  @Column({ type: 'uuid', nullable: true })
  file_id: string | null;

  @Column({ type: 'enum', enum: ImportStatus, default: ImportStatus.PENDING })
  status: ImportStatus;

  @Column({ type: 'integer', default: 0 })
  total_rows: number;

  @Column({ type: 'integer', default: 0 })
  success_rows: number;

  @Column({ type: 'integer', default: 0 })
  failed_rows: number;

  @Column({ type: 'jsonb', nullable: true })
  errors: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  summary: Record<string, any> | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  started_at: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  completed_at: Date | null;

  @Column({ type: 'text', nullable: true })
  message: string | null;
}
```

---

## Service

### SalesImportService

```typescript
@Injectable()
export class SalesImportService {
  /**
   * Загрузить и обработать файл продаж
   * @param file - Multer файл
   * @param userId - ID загружающего пользователя
   * @param fileType - Тип файла (опционально, авто-определение)
   * @returns Import record и Job ID
   */
  async uploadSalesFile(
    file: Express.Multer.File,
    userId: string,
    fileType?: ImportFileType,
  ): Promise<{ importRecord: SalesImport; jobId: string }>;

  /**
   * Получить импорт по ID
   */
  async findOne(id: string): Promise<SalesImport>;

  /**
   * Получить все импорты с фильтрами
   */
  async findAll(status?: ImportStatus, userId?: string): Promise<SalesImport[]>;

  /**
   * Повторить неудачный импорт
   */
  async retryImport(id: string): Promise<SalesImport>;

  /**
   * Получить статус задачи в очереди
   */
  async getJobStatus(jobId: string): Promise<JobStatus>;

  /**
   * Удалить импорт
   */
  async remove(id: string): Promise<void>;
}
```

---

## Парсинг файлов

### Excel (ExcelJS)

```typescript
private async parseExcel(buffer: Buffer): Promise<ParsedRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.worksheets[0];
  const headers: string[] = [];
  const jsonData: Record<string, unknown>[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      // Первая строка - заголовки
      row.eachCell((cell) => headers.push(cell.value?.toString() || ''));
    } else {
      // Данные
      const rowData: Record<string, unknown> = {};
      row.eachCell((cell, colNumber) => {
        rowData[headers[colNumber - 1]] = cell.value;
      });
      jsonData.push(rowData);
    }
  });

  return jsonData.map((row) => this.normalizeRow(row));
}
```

### CSV (csv-parser)

```typescript
private async parseCSV(buffer: Buffer): Promise<ParsedRow[]> {
  return new Promise((resolve, reject) => {
    const rows: ParsedRow[] = [];
    const stream = Readable.from(buffer);

    stream
      .pipe(csv())
      .on('data', (row) => rows.push(this.normalizeRow(row)))
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
}
```

---

## Маппинг колонок

```typescript
interface ParsedRow {
  date: string;
  machine_number: string;
  amount: number;
  payment_method?: string;
  product_name?: string;
  quantity?: number;
}

private normalizeRow(row: Record<string, unknown>): ParsedRow {
  const dateField =
    row['date'] || row['Date'] || row['Дата'] || row['дата'] || row['sale_date'];

  const machineField =
    row['machine'] || row['Machine'] || row['Аппарат'] || row['machine_number'];

  const amountField =
    row['amount'] || row['Amount'] || row['Сумма'] || row['total'];

  const paymentField =
    row['payment'] || row['Payment'] || row['payment_method'] || row['Способ оплаты'];

  const productField =
    row['product'] || row['Product'] || row['Товар'] || row['product_name'];

  const quantityField =
    row['quantity'] || row['Quantity'] || row['Количество'];

  return {
    date: this.parseDate(dateField),
    machine_number: String(machineField).trim(),
    amount: parseFloat(String(amountField).replace(/[^\d.-]/g, '')),
    payment_method: String(paymentField).toLowerCase(),
    product_name: productField ? String(productField).trim() : undefined,
    quantity: quantityField ? parseInt(String(quantityField)) : undefined,
  };
}
```

---

## Обработка данных

### Performance оптимизация

```typescript
// Pre-fetch всех machines и nomenclature для избежания N+1 запросов
const uniqueMachineNumbers = [...new Set(rows.map((r) => r.machine_number))];
const machines = await this.machineRepository.find({
  where: { machine_number: In(uniqueMachineNumbers) },
});
const machineMap = new Map<string, Machine>(
  machines.map((m) => [m.machine_number, m])
);

const uniqueProductNames = [...new Set(rows.map((r) => r.product_name).filter(Boolean))];
const nomenclatures = await this.nomenclatureRepository.find({
  where: { name: In(uniqueProductNames) },
});
const nomenclatureMap = new Map<string, Nomenclature>(
  nomenclatures.map((n) => [n.name, n])
);
```

### Создание транзакций

```typescript
await this.dataSource.transaction(async (transactionManager) => {
  // Создаём транзакцию продажи
  const transaction = this.transactionRepository.create({
    transaction_type: TransactionType.SALE,
    transaction_date: new Date(row.date),
    machine_id: machine.id,
    amount: row.amount,
    payment_method: paymentMethod,
    quantity: row.quantity || 1,
    description: row.product_name
      ? `Sale: ${row.product_name} (${row.quantity || 1})`
      : 'Sale from import',
  });

  const savedTransaction = await transactionManager.save(transaction);

  // Обновляем инвентарь (если есть информация о товаре)
  if (nomenclature && row.quantity) {
    await this.inventoryService.recordSale({
      machine_id: machine.id,
      nomenclature_id: nomenclature.id,
      quantity: row.quantity,
      transaction_id: savedTransaction.id,
    }, 'system');
  }
});
```

---

## Маппинг способов оплаты

```typescript
private mapPaymentMethod(method?: string): PaymentMethod {
  if (!method) return PaymentMethod.CASH;

  const lower = method.toLowerCase();

  if (lower.includes('card') || lower.includes('карт')) {
    return PaymentMethod.CARD;
  }
  if (lower.includes('qr') || lower.includes('кью') || lower.includes('sbp')) {
    return PaymentMethod.QR;
  }
  if (lower.includes('online') || lower.includes('онлайн') || lower.includes('mobile')) {
    return PaymentMethod.MOBILE;
  }

  return PaymentMethod.CASH;
}
```

---

## Bull Queue

Асинхронная обработка через Bull:

```typescript
// Добавление в очередь
const job = await this.salesImportQueue.add(
  'process-file',
  {
    importId: saved.id,
    buffer: file.buffer,
    fileType,
    userId,
  },
  {
    attempts: 3,           // Повтор до 3 раз при ошибке
    backoff: {
      type: 'exponential',
      delay: 2000,         // Начальная задержка 2 секунды
    },
    removeOnComplete: false, // Сохранять завершённые задачи
    removeOnFail: false,     // Сохранять неудачные задачи
  },
);
```

---

## API Endpoints

### Загрузить файл

```http
POST /api/sales-import/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: sales_report_2025.xlsx
```

**Response:**
```json
{
  "importRecord": {
    "id": "uuid",
    "filename": "sales_report_2025.xlsx",
    "file_type": "excel",
    "status": "pending",
    "total_rows": 0,
    "success_rows": 0,
    "failed_rows": 0,
    "created_at": "2025-01-15T10:00:00Z"
  },
  "jobId": "123"
}
```

### Получить статус импорта

```http
GET /api/sales-import/:id
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "uuid",
  "filename": "sales_report_2025.xlsx",
  "file_type": "excel",
  "status": "completed",
  "total_rows": 150,
  "success_rows": 145,
  "failed_rows": 5,
  "errors": {
    "errors": [
      "Row 10: Machine M-999 not found",
      "Row 25: Missing date"
    ]
  },
  "summary": {
    "total_amount": 450000,
    "transactions_created": 145,
    "average_amount": 3103.45
  },
  "started_at": "2025-01-15T10:00:05Z",
  "completed_at": "2025-01-15T10:00:30Z",
  "message": "Import completed with 5 errors"
}
```

### Получить статус задачи в очереди

```http
GET /api/sales-import/job/:jobId
Authorization: Bearer <token>
```

**Response:**
```json
{
  "jobId": "123",
  "state": "completed",
  "progress": 100,
  "data": {
    "importId": "uuid"
  },
  "failedReason": null,
  "attemptsMade": 1,
  "processedOn": 1705312800000,
  "finishedOn": 1705312830000
}
```

### Получить список импортов

```http
GET /api/sales-import?status=completed
Authorization: Bearer <token>
```

### Повторить неудачный импорт

```http
POST /api/sales-import/:id/retry
Authorization: Bearer <token>
```

### Удалить импорт

```http
DELETE /api/sales-import/:id
Authorization: Bearer <token>
```

---

## Формат файла

### Пример Excel/CSV

| Дата | Аппарат | Сумма | Способ оплаты | Товар | Количество |
|------|---------|-------|---------------|-------|------------|
| 2025-01-15 | M-001 | 5000 | cash | Кофе эспрессо | 2 |
| 2025-01-15 | M-002 | 4500 | card | Капучино | 1 |
| 2025-01-15 | M-001 | 3000 | qr | Латте | 1 |

---

## Requirements

| REQ ID | Описание |
|--------|----------|
| REQ-IMP-01 | Поддержка Excel (.xlsx, .xls) |
| REQ-IMP-02 | Поддержка CSV |
| REQ-IMP-03 | 5 статусов импорта |
| REQ-IMP-10 | Автоматическое определение типа файла |
| REQ-IMP-11 | Маппинг колонок (RU/EN) |
| REQ-IMP-12 | Парсинг даты из Excel serial |
| REQ-IMP-20 | Асинхронная обработка через очередь |
| REQ-IMP-21 | Retry при ошибках (до 3 раз) |
| REQ-IMP-22 | Экспоненциальный backoff |
| REQ-IMP-30 | Создание транзакций продаж |
| REQ-IMP-31 | Обновление инвентаря аппарата |
| REQ-IMP-40 | Pre-fetch для оптимизации N+1 |
| REQ-IMP-41 | Атомарные транзакции |
