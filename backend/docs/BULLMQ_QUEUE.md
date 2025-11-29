# BullMQ Job Queue

VendHub использует BullMQ с Redis для фоновой обработки тяжелых операций, которые не должны блокировать API.

## Архитектура

```
┌─────────────┐      ┌──────────────┐      ┌────────────────┐
│   Client    │─────▶│ API Endpoint │─────▶│  Redis Queue   │
└─────────────┘      └──────────────┘      └────────────────┘
                              │                      │
                              │                      ▼
                              │             ┌────────────────┐
                              │             │   Processor    │
                              │             └────────────────┘
                              │                      │
                              ▼                      ▼
                     ┌──────────────┐      ┌────────────────┐
                     │ Job Status   │      │   Database     │
                     │  (jobId)     │      │   (results)    │
                     └──────────────┘      └────────────────┘
```

## Конфигурация

### Redis

Настройки Redis в `.env`:
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

### BullModule

`app.module.ts`:
```typescript
BullModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (configService: ConfigService) => ({
    redis: {
      host: configService.get('REDIS_HOST', 'localhost'),
      port: configService.get('REDIS_PORT', 6379),
      password: configService.get('REDIS_PASSWORD'),
    },
    defaultJobOptions: {
      removeOnComplete: 100, // Хранить последние 100 успешных задач
      removeOnFail: 200,     // Хранить последние 200 неуспешных задач
    },
  }),
  inject: [ConfigService],
}),
```

## Реализованные очереди

### 1. Sales Import Queue (`sales-import`)

Обработка импорта продаж из CSV/Excel файлов.

**Модуль:** `SalesImportModule`
**Процессор:** `SalesImportProcessor`
**Сервис:** `SalesImportService`

#### Процесс

1. **Загрузка файла** → API endpoint `/sales-import/upload`
   - Файл загружается через `POST /sales-import/upload`
   - Создается запись `SalesImport` со статусом `PENDING`
   - Задача добавляется в очередь Redis
   - API возвращает `{ importRecord, jobId }`

2. **Фоновая обработка** → `SalesImportProcessor.handleProcessFile()`
   - Парсинг CSV/Excel файла
   - Создание транзакций продаж
   - Списание инвентаря с аппаратов
   - Обновление progress (10% → 30% → 95% → 100%)
   - Обновление статуса: `PROCESSING` → `COMPLETED`/`FAILED`

3. **Отслеживание статуса** → API endpoint `/sales-import/job/:jobId`
   - Получение текущего состояния задачи
   - Progress (0-100%)
   - Количество попыток
   - Причина ошибки (если failed)

#### Retry Policy

```typescript
{
  attempts: 3,                      // Максимум 3 попытки
  backoff: {
    type: 'exponential',            // Экспоненциальная задержка
    delay: 2000,                    // Начальная задержка 2s, потом 4s, 8s
  },
  removeOnComplete: false,          // Сохранить успешные для истории
  removeOnFail: false,              // Сохранить неуспешные для отладки
}
```

#### API Endpoints

##### Upload file
```http
POST /sales-import/upload
Content-Type: multipart/form-data

{
  "file": <file.csv или file.xlsx>
}

Response:
{
  "importRecord": {
    "id": "uuid",
    "status": "PENDING",
    "filename": "sales_2024.csv",
    ...
  },
  "jobId": "12345"
}
```

##### Get job status
```http
GET /sales-import/job/:jobId

Response:
{
  "jobId": "12345",
  "state": "active",               // waiting|active|completed|failed|delayed
  "progress": 45,                  // 0-100
  "data": { ... },
  "attemptsMade": 1,
  "processedOn": 1699123456789,
  "finishedOn": null
}
```

##### Get import record
```http
GET /sales-import/:id

Response:
{
  "id": "uuid",
  "status": "COMPLETED",
  "filename": "sales_2024.csv",
  "total_rows": 150,
  "processed_rows": 148,
  "failed_rows": 2,
  "error_log": "Row 5: Machine M-001 not found\nRow 12: ...",
  "started_at": "2024-11-14T10:00:00Z",
  "completed_at": "2024-11-14T10:02:30Z",
  ...
}
```

##### Retry failed import
```http
POST /sales-import/:id/retry

Response: <updated import record>
```

## Формат файлов импорта

### CSV/Excel columns

Поддерживаются русские и английские названия колонок:

| Поле | Варианты колонок | Обязательно | Пример |
|------|------------------|-------------|--------|
| Дата | `date`, `Date`, `Дата`, `дата`, `sale_date` | ✅ | `2024-11-14` |
| Аппарат | `machine`, `Machine`, `Аппарат`, `machine_number` | ✅ | `M-001` |
| Сумма | `amount`, `Amount`, `Сумма`, `total` | ✅ | `150.50` |
| Способ оплаты | `payment`, `Payment`, `payment_method`, `Способ оплаты` | ❌ | `cash`, `card`, `qr` |
| Товар | `product`, `Product`, `Товар`, `product_name` | ❌ | `Капучино` |
| Количество | `quantity`, `Quantity`, `Количество` | ❌ | `2` |

### Пример CSV
```csv
date,machine_number,amount,payment_method,product_name,quantity
2024-11-14,M-001,150.50,card,Капучино,1
2024-11-14,M-002,75.00,cash,Эспрессо,2
2024-11-14,M-001,200.00,qr,Латте,1
```

### Пример Excel

| date | machine_number | amount | payment_method | product_name | quantity |
|------|----------------|--------|----------------|--------------|----------|
| 2024-11-14 | M-001 | 150.50 | card | Капучино | 1 |
| 2024-11-14 | M-002 | 75.00 | cash | Эспрессо | 2 |

## Мониторинг

### Bull Board (опционально)

Для визуального мониторинга очередей можно добавить Bull Board:

```bash
npm install @bull-board/api @bull-board/express
```

```typescript
import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [new BullAdapter(salesImportQueue)],
  serverAdapter,
});

app.use('/admin/queues', serverAdapter.getRouter());
```

Доступ к мониторингу: `http://localhost:3000/admin/queues`

### Redis CLI

Проверка очередей через Redis CLI:

```bash
redis-cli

# Список ключей очередей
KEYS bull:sales-import:*

# Количество задач в очереди
LLEN bull:sales-import:waiting
LLEN bull:sales-import:active
LLEN bull:sales-import:completed
LLEN bull:sales-import:failed

# Очистка очереди
DEL bull:sales-import:waiting
DEL bull:sales-import:active
```

## Добавление новых очередей

### 1. Создать процессор

```typescript
// example.processor.ts
import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';

interface ExampleJob {
  data: any;
}

@Processor('example-queue')
export class ExampleProcessor {
  @Process('process-task')
  async handleTask(job: Job<ExampleJob>) {
    const { data } = job.data;

    // Обработка
    await job.progress(50);

    // Завершение
    await job.progress(100);

    return { success: true };
  }
}
```

### 2. Зарегистрировать очередь в модуле

```typescript
@Module({
  imports: [
    BullModule.registerQueue({
      name: 'example-queue',
    }),
  ],
  providers: [ExampleService, ExampleProcessor],
})
export class ExampleModule {}
```

### 3. Использовать в сервисе

```typescript
@Injectable()
export class ExampleService {
  constructor(
    @InjectQueue('example-queue')
    private readonly queue: Queue,
  ) {}

  async addTask(data: any) {
    const job = await this.queue.add('process-task', { data }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    });

    return { jobId: job.id };
  }

  async getJobStatus(jobId: string) {
    const job = await this.queue.getJob(jobId);
    return {
      state: await job.getState(),
      progress: job.progress(),
    };
  }
}
```

## Лучшие практики

1. **Используйте progress tracking** для длительных операций
2. **Настройте retry policy** с exponential backoff
3. **Логируйте ошибки** в processor для отладки
4. **Используйте транзакции БД** для атомарности
5. **Не храните большие данные** в job data (используйте ссылки)
6. **Настройте removeOnComplete/removeOnFail** для управления памятью
7. **Мониторьте длину очередей** для предотвращения переполнения

## Troubleshooting

### Redis не запущен
```
Error: Redis connection to localhost:6379 failed
```
Решение: Запустите Redis
```bash
redis-server
# или через Docker
docker run -d -p 6379:6379 redis:alpine
```

### Задачи застревают в waiting
- Проверьте, что процессор зарегистрирован в модуле
- Проверьте, что приложение запущено (процессор работает только пока приложение активно)
- Проверьте логи на ошибки

### Задачи всегда failed
- Проверьте логи процессора
- Проверьте, что все зависимости инжектированы
- Проверьте формат данных в job.data

## Дополнительная информация

- [BullMQ Documentation](https://docs.bullmq.io/)
- [NestJS Bull Module](https://docs.nestjs.com/techniques/queues)
- [Redis Documentation](https://redis.io/documentation)
