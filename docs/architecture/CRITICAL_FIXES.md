# Критические архитектурные проблемы и решения

## 🔴 Критичность: ВЫСОКАЯ

### 1. Проблема: Локальное хранение файлов

#### Текущая ситуация
```typescript
// backend/src/modules/files/files.service.ts:11
private readonly uploadDir = process.env.UPLOAD_PATH || './uploads';

// docker-compose.yml:65
volumes:
  - ./uploads:/app/uploads  // Локальный том
```

#### Последствия
- ❌ **Не работает в Kubernetes/Docker Swarm** - разные поды не видят файлы друг друга
- ❌ **Потеря данных при рестарте контейнера** - если не используется volume
- ❌ **Проблемы с балансировкой** - файлы доступны только на одном инстансе
- ❌ **Нет бэкапов** - риск потери фото задач и документов
- ❌ **Ограничение масштабирования** - нельзя запустить несколько реплик

#### Решение: S3-совместимое хранилище

**Варианты**:
1. **AWS S3** - полностью управляемое, дорого
2. **MinIO** - self-hosted S3-compatible, бесплатно
3. **DigitalOcean Spaces** - доступно, S3-compatible
4. **Cloudflare R2** - дешево, без платы за трафик

**Рекомендация**: MinIO для self-hosted или Cloudflare R2 для cloud

#### Имплементация

**Шаг 1**: Добавить MinIO в docker-compose

```yaml
# docker-compose.yml
services:
  minio:
    image: minio/minio:latest
    container_name: vendhub-minio
    restart: unless-stopped
    ports:
      - "9000:9000"  # API
      - "9001:9001"  # Console
    environment:
      MINIO_ROOT_USER: vendhub_minio
      MINIO_ROOT_PASSWORD: vendhub_minio_password_dev
    volumes:
      - minio-data:/data
    command: server /data --console-address ":9001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  minio-data:
```

**Шаг 2**: Установить AWS SDK

```bash
npm install @aws-sdk/client-s3 @aws-sdk/lib-storage
```

**Шаг 3**: Создать S3StorageService

```typescript
// backend/src/modules/files/s3-storage.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3StorageService {
  private readonly logger = new Logger(S3StorageService.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;

  constructor() {
    this.bucket = process.env.S3_BUCKET || 'vendhub';

    this.s3Client = new S3Client({
      region: process.env.S3_REGION || 'us-east-1',
      endpoint: process.env.S3_ENDPOINT || 'http://minio:9000',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || 'vendhub_minio',
        secretAccessKey: process.env.S3_SECRET_KEY || 'vendhub_minio_password_dev',
      },
      forcePathStyle: true, // Required for MinIO
    });
  }

  /**
   * Upload file to S3
   */
  async uploadFile(
    key: string,
    file: Buffer,
    metadata: Record<string, string> = {},
  ): Promise<string> {
    const upload = new Upload({
      client: this.s3Client,
      params: {
        Bucket: this.bucket,
        Key: key,
        Body: file,
        Metadata: metadata,
      },
    });

    await upload.done();
    this.logger.log(`File uploaded: ${key}`);

    return key;
  }

  /**
   * Get file from S3
   */
  async getFile(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const response = await this.s3Client.send(command);
    const chunks: Uint8Array[] = [];

    for await (const chunk of response.Body as any) {
      chunks.push(chunk);
    }

    return Buffer.concat(chunks);
  }

  /**
   * Get signed URL for temporary access
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  /**
   * Delete file from S3
   */
  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.s3Client.send(command);
    this.logger.log(`File deleted: ${key}`);
  }

  /**
   * Check if file exists
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      if (error.name === 'NoSuchKey') {
        return false;
      }
      throw error;
    }
  }
}
```

**Шаг 4**: Обновить FilesService

```typescript
// backend/src/modules/files/files.service.ts
@Injectable()
export class FilesService {
  constructor(
    @InjectRepository(File)
    private readonly fileRepository: Repository<File>,
    private readonly auditLogService: AuditLogService,
    private readonly s3StorageService: S3StorageService, // NEW
  ) {}

  async uploadFile(
    file: Express.Multer.File,
    uploadFileDto: UploadFileDto,
    userId: string,
  ): Promise<File> {
    // Generate unique key
    const key = `${uploadFileDto.entity_type}/${uploadFileDto.entity_id}/${Date.now()}-${file.originalname}`;

    // Upload to S3
    await this.s3StorageService.uploadFile(key, file.buffer, {
      contentType: file.mimetype,
      uploadedBy: userId,
      category: uploadFileDto.category,
    });

    // Save metadata to database
    const fileEntity = this.fileRepository.create({
      file_name: file.originalname,
      file_path: key, // S3 key instead of local path
      file_size: file.size,
      file_type: file.mimetype,
      category: uploadFileDto.category,
      entity_type: uploadFileDto.entity_type,
      entity_id: uploadFileDto.entity_id,
      uploaded_by_user_id: userId,
      tags: uploadFileDto.tags,
    });

    const savedFile = await this.fileRepository.save(fileEntity);

    // Audit log
    await this.auditLogService.log({
      user_id: userId,
      action: AuditAction.CREATE,
      entity_type: AuditEntity.FILE,
      entity_id: savedFile.id,
      entity_name: file.originalname,
      description: `Uploaded file to S3: ${key}`,
      metadata: { s3_key: key, size: file.size },
    });

    return savedFile;
  }

  async getFileUrl(fileId: string): Promise<string> {
    const file = await this.fileRepository.findOne({ where: { id: fileId } });
    if (!file) {
      throw new NotFoundException('File not found');
    }

    // Return signed URL (expires in 1 hour)
    return this.s3StorageService.getSignedUrl(file.file_path, 3600);
  }

  async deleteFile(fileId: string, userId: string): Promise<void> {
    const file = await this.fileRepository.findOne({ where: { id: fileId } });
    if (!file) {
      throw new NotFoundException('File not found');
    }

    // Delete from S3
    await this.s3StorageService.deleteFile(file.file_path);

    // Delete from database
    await this.fileRepository.softDelete(fileId);

    // Audit log
    await this.auditLogService.log({
      user_id: userId,
      action: AuditAction.DELETE,
      entity_type: AuditEntity.FILE,
      entity_id: fileId,
      entity_name: file.file_name,
      description: `Deleted file from S3: ${file.file_path}`,
    });
  }
}
```

**Шаг 5**: Environment Variables

```env
# .env
S3_ENDPOINT=http://minio:9000
S3_BUCKET=vendhub
S3_ACCESS_KEY=vendhub_minio
S3_SECRET_KEY=vendhub_minio_password_dev
S3_REGION=us-east-1
```

**Шаг 6**: Миграция существующих файлов

```typescript
// scripts/migrate-files-to-s3.ts
import * as fs from 'fs/promises';
import * as path from 'path';
import { S3StorageService } from '../backend/src/modules/files/s3-storage.service';

async function migrateFilesToS3() {
  const s3 = new S3StorageService();
  const uploadsDir = './uploads';

  const files = await fs.readdir(uploadsDir, { recursive: true });

  for (const file of files) {
    const filePath = path.join(uploadsDir, file);
    const stats = await fs.stat(filePath);

    if (stats.isFile()) {
      const buffer = await fs.readFile(filePath);
      const s3Key = file.replace(/\\/g, '/'); // Normalize path

      await s3.uploadFile(s3Key, buffer);
      console.log(`Migrated: ${s3Key}`);
    }
  }

  console.log('Migration complete!');
}

migrateFilesToS3();
```

---

### 2. Проблема: Конфликт двух Telegram-ботов

#### Текущая ситуация

**Два бота в проекте**:
1. `telegram-bot/` - простой standalone сервис
2. `backend/src/modules/telegram/` - полноценный интегрированный модуль

**docker-compose.yml запускает оба**:
```yaml
# Строка 85
telegram-bot:
  build:
    context: ./telegram-bot
  environment:
    TELEGRAM_BOT_TOKEN: ${TELEGRAM_BOT_TOKEN}  # Один токен на двоих!
```

#### Последствия
- ❌ **Ошибка "long-polling already_started"** - два бота дерутся за один токен
- ❌ **Непредсказуемое поведение** - неизвестно, какой бот обработает команду
- ❌ **Потеря сообщений** - сообщения могут теряться
- ❌ **Confusion для разработчиков** - непонятно, какой бот использовать

#### Решение: Удалить standalone бот

**Рекомендация**: Использовать только `backend/src/modules/telegram/` - он полноценный и интегрированный

**Шаг 1**: Удалить telegram-bot сервис из docker-compose

```yaml
# docker-compose.yml
# УДАЛИТЬ блок:
# telegram-bot:
#   build:
#     context: ./telegram-bot
#   ...
```

**Шаг 2**: Удалить директорию telegram-bot

```bash
rm -rf telegram-bot/
```

**Шаг 3**: Обновить .gitignore (если нужно)

```
# .gitignore
telegram-bot/  # Добавить если хотим сохранить историю в git но не в проекте
```

**Шаг 4**: Документировать в README

```markdown
## Telegram Bot

VendHub использует интегрированный Telegram модуль в backend:
- Модуль: `backend/src/modules/telegram/`
- Документация: `TELEGRAM_MODULE_README.md`
- Настройка: См. `/telegram/settings` в админ-панели

⚠️ **Важно**: Не используйте standalone бот из `telegram-bot/` (удален)
```

---

## 🟡 Критичность: СРЕДНЯЯ

### 3. Проблема: Отсутствие Rollback задач

#### Текущая ситуация

**manual-operations.md** (Шаг 8) упоминает:
> Админ видит в web-панели: [Принять] [Запросить уточнение] [Отклонить]

**Но в tasks.service.ts** НЕТ логики для "Отклонить"

#### Последствия
- ❌ **Необратимость ошибок** - если оператор ошибся, откатить невозможно
- ❌ **Некорректные остатки** - inventory уже обновлен
- ❌ **Финансовые ошибки** - деньги записаны, но задача неверна

#### Решение: Компенсирующие транзакции

**Концепция**: Не удаляем данные, создаем обратные движения

**Шаг 1**: Добавить статус REJECTED

```typescript
// backend/src/modules/tasks/entities/task.entity.ts
export enum TaskStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  REJECTED = 'rejected',  // NEW - отклонено админом
  POSTPONED = 'postponed',
  CANCELLED = 'cancelled',
}
```

**Шаг 2**: Добавить rejection tracking

```typescript
// backend/src/modules/tasks/entities/task.entity.ts
@Entity('tasks')
export class Task extends BaseEntity {
  // ...

  @Column({ type: 'uuid', nullable: true })
  rejected_by_user_id: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'rejected_by_user_id' })
  rejected_by: User | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  rejected_at: Date | null;

  @Column({ type: 'text', nullable: true })
  rejection_reason: string | null;
}
```

**Шаг 3**: Создать метод rejectTask

```typescript
// backend/src/modules/tasks/tasks.service.ts

async rejectTask(
  id: string,
  userId: string,
  reason: string,
): Promise<Task> {
  const task = await this.findOne(id);

  // Только завершенные задачи можно отклонить
  if (task.status !== TaskStatus.COMPLETED) {
    throw new BadRequestException(
      'Можно отклонить только завершенные задачи',
    );
  }

  // Только админы могут отклонять
  const user = await this.usersService.findOne(userId);
  if (user.role !== 'admin') {
    throw new ForbiddenException(
      'Только администраторы могут отклонять задачи',
    );
  }

  // Использовать транзакцию для атомарности
  await this.dataSource.transaction(async (transactionManager) => {
    // 1. Откат инвентаря для REFILL задач
    if (task.type_code === TaskType.REFILL) {
      for (const taskItem of task.items) {
        const actualQty = taskItem.actual_quantity || taskItem.planned_quantity;

        // Создать обратное движение: Аппарат -> Оператор
        await this.inventoryService.transferMachineToOperator(
          {
            operator_id: task.assigned_to_user_id,
            machine_id: task.machine_id,
            nomenclature_id: taskItem.nomenclature_id,
            quantity: Number(actualQty),
            notes: `ОТКАТ задачи ${task.id}: возврат ${actualQty} единиц. Причина: ${reason}`,
          },
          userId,
        );
      }
    }

    // 2. Откат финансов для COLLECTION задач
    if (task.type_code === TaskType.COLLECTION && task.actual_cash_amount) {
      // Создать компенсирующую транзакцию
      await this.transactionsService.create({
        type: TransactionType.ADJUSTMENT,
        machine_id: task.machine_id,
        amount: -task.actual_cash_amount, // Отрицательная сумма
        description: `ОТКАТ инкассации задачи ${task.id}. Причина: ${reason}`,
        metadata: {
          original_task_id: task.id,
          rejection_reason: reason,
        },
      });

      // Восстановить cash в аппарате
      await this.machinesService.updateStats(task.machine_id, {
        current_cash_amount: task.actual_cash_amount,
      });
    }

    // 3. Обновить задачу
    task.status = TaskStatus.REJECTED;
    task.rejected_by_user_id = userId;
    task.rejected_at = new Date();
    task.rejection_reason = reason;

    await transactionManager.save(task);

    // 4. Создать комментарий
    const comment = this.taskCommentRepository.create({
      task_id: task.id,
      user_id: userId,
      comment: `Задача ОТКЛОНЕНА. Причина: ${reason}`,
      is_internal: false,
    });
    await transactionManager.save(comment);

    // 5. Аудит лог
    await this.auditLogService.log({
      user_id: userId,
      action: AuditAction.UPDATE,
      entity_type: AuditEntity.TASK,
      entity_id: task.id,
      entity_name: `Задача ${task.type_code} - ОТКЛОНЕНА`,
      description: `Задача отклонена администратором. Выполнены компенсирующие транзакции. Причина: ${reason}`,
      is_sensitive: true,
      metadata: {
        task_id: task.id,
        machine_id: task.machine_id,
        operator_id: task.assigned_to_user_id,
        rejection_reason: reason,
      },
    });

    // 6. Уведомить оператора
    await this.notificationsService.create({
      type: NotificationType.TASK_REJECTED,
      channel: NotificationChannel.IN_APP,
      recipient_id: task.assigned_to_user_id,
      title: 'Задача отклонена',
      message: `Ваша задача ${task.type_code} для аппарата ${task.machine?.machine_number} отклонена. Причина: ${reason}`,
      data: {
        task_id: task.id,
        rejection_reason: reason,
      },
      action_url: `/tasks/${task.id}`,
    });
  });

  return task;
}
```

**Шаг 4**: API Endpoint

```typescript
// backend/src/modules/tasks/tasks.controller.ts

@Post(':id/reject')
@ApiOperation({
  summary: 'Отклонить завершенную задачу (только админы)',
  description:
    'Отклонение задачи с автоматическим откатом всех изменений (инвентарь, финансы). ' +
    'Создаются компенсирующие транзакции для восстановления состояния.',
})
@ApiParam({ name: 'id', description: 'UUID задачи' })
@ApiResponse({
  status: 200,
  description: 'Задача отклонена, изменения откачены',
  type: Task,
})
@ApiResponse({
  status: 400,
  description: 'Можно отклонить только завершенные задачи',
})
@ApiResponse({
  status: 403,
  description: 'Доступ запрещен (только админы)',
})
rejectTask(
  @Param('id') id: string,
  @Body('reason') reason: string,
  @Request() req,
): Promise<Task> {
  const userId = req.user.id;
  return this.tasksService.rejectTask(id, userId, reason);
}
```

**Шаг 5**: Миграция

```typescript
// backend/src/database/migrations/1731680000001-AddTaskRejection.ts
import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddTaskRejection1731680000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add 'rejected' to TaskStatus enum
    await queryRunner.query(`
      ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'rejected';
    `);

    // Add rejection tracking fields
    await queryRunner.addColumn(
      'tasks',
      new TableColumn({
        name: 'rejected_by_user_id',
        type: 'uuid',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'tasks',
      new TableColumn({
        name: 'rejected_at',
        type: 'timestamp with time zone',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'tasks',
      new TableColumn({
        name: 'rejection_reason',
        type: 'text',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('tasks', 'rejection_reason');
    await queryRunner.dropColumn('tasks', 'rejected_at');
    await queryRunner.dropColumn('tasks', 'rejected_by_user_id');
  }
}
```

---

### 4. Проблема: Медленные отчеты

#### Текущая ситуация

```typescript
// backend/src/modules/reports/reports.service.ts
async getDashboard(): Promise<DashboardDto> {
  // Прямые агрегации по миллионам строк
  const totalSales = await this.transactionRepository
    .createQueryBuilder('t')
    .select('SUM(t.amount)', 'total')
    .where('t.type = :type', { type: 'sale' })
    .getRawOne();  // ❌ МЕДЛЕННО на больших данных
}
```

#### Последствия
- ❌ **Тайм-ауты** - запросы не успевают за 30 сек
- ❌ **Высокая нагрузка на DB** - постоянные тяжелые аггрегации
- ❌ **Плохой UX** - пользователь ждет минуты
- ❌ **Блокировка транзакций** - долгие SELECT блокируют INSERT

#### Решение: Материализованные представления + фоновая агрегация

**Вариант 1**: PostgreSQL Materialized Views

```sql
-- backend/database/views/dashboard_stats.sql
CREATE MATERIALIZED VIEW dashboard_stats AS
SELECT
  COUNT(DISTINCT m.id) as total_machines,
  COUNT(DISTINCT CASE WHEN m.status = 'online' THEN m.id END) as online_machines,
  COUNT(DISTINCT CASE WHEN m.status = 'offline' THEN m.id END) as offline_machines,
  COALESCE(SUM(CASE WHEN DATE(t.created_at) = CURRENT_DATE THEN t.amount END), 0) as today_revenue,
  COUNT(CASE WHEN DATE(t.created_at) = CURRENT_DATE THEN t.id END) as today_sales,
  COUNT(CASE WHEN tk.status = 'pending' THEN tk.id END) as pending_tasks
FROM machines m
LEFT JOIN transactions t ON t.machine_id = m.id AND t.type = 'sale'
LEFT JOIN tasks tk ON tk.machine_id = m.id;

-- Index for faster refresh
CREATE UNIQUE INDEX ON dashboard_stats (total_machines);

-- Auto-refresh every 5 minutes
-- (Настраивается через pg_cron или app scheduler)
```

**Refresh в приложении**:

```typescript
// backend/src/modules/reports/reports.service.ts

@Cron('*/5 * * * *') // Every 5 minutes
async refreshDashboardStats(): Promise<void> {
  await this.dataSource.query('REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_stats');
  this.logger.log('Dashboard stats refreshed');
}

async getDashboard(): Promise<DashboardDto> {
  // ✅ Быстрый запрос к материализованному представлению
  const stats = await this.dataSource.query('SELECT * FROM dashboard_stats');
  return stats[0];
}
```

**Вариант 2**: Агрегирующие таблицы (Analytics Tables)

```typescript
// backend/src/modules/analytics/entities/daily-stats.entity.ts
@Entity('daily_stats')
export class DailyStats extends BaseEntity {
  @Column({ type: 'date', unique: true })
  date: Date;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  total_revenue: number;

  @Column({ type: 'integer', default: 0 })
  total_transactions: number;

  @Column({ type: 'integer', default: 0 })
  active_machines: number;

  @Column({ type: 'jsonb', nullable: true })
  top_products: Array<{ product_id: string; quantity: number; revenue: number }>;

  @Index()
  @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  last_updated_at: Date;
}
```

**Агрегация через EventEmitter**:

```typescript
// backend/src/modules/transactions/transactions.service.ts

async create(dto: CreateTransactionDto, userId: string): Promise<Transaction> {
  const transaction = await this.transactionRepository.save(...);

  // Emit event for analytics
  this.eventEmitter.emit('transaction.created', {
    transaction,
    date: new Date(transaction.sale_date),
  });

  return transaction;
}

// backend/src/modules/analytics/analytics.listener.ts
@Injectable()
export class AnalyticsListener {
  @OnEvent('transaction.created')
  async handleTransactionCreated(payload: { transaction: Transaction; date: Date }) {
    // Обновить дневную статистику
    await this.updateDailyStats(payload.date, payload.transaction);
  }

  private async updateDailyStats(date: Date, transaction: Transaction): Promise<void> {
    const dateStr = format(date, 'yyyy-MM-dd');

    let stats = await this.dailyStatsRepository.findOne({ where: { date: dateStr } });

    if (!stats) {
      stats = this.dailyStatsRepository.create({ date: dateStr });
    }

    stats.total_revenue = Number(stats.total_revenue) + Number(transaction.amount);
    stats.total_transactions += 1;
    stats.last_updated_at = new Date();

    await this.dailyStatsRepository.save(stats);
  }
}
```

**Шаг 3**: Cron для ежедневной агрегации (для пропущенных)

```typescript
// backend/src/modules/analytics/analytics.service.ts

@Cron('0 1 * * *') // Every day at 1 AM
async aggregatePreviousDay(): Promise<void> {
  const yesterday = subDays(new Date(), 1);
  const dateStr = format(yesterday, 'yyyy-MM-dd');

  // Полная пересборка статистики за вчера
  const stats = await this.dataSource
    .createQueryBuilder()
    .select([
      'DATE(t.sale_date) as date',
      'SUM(t.amount) as total_revenue',
      'COUNT(t.id) as total_transactions',
      'COUNT(DISTINCT t.machine_id) as active_machines',
    ])
    .from(Transaction, 't')
    .where('DATE(t.sale_date) = :date', { date: dateStr })
    .andWhere('t.type = :type', { type: TransactionType.SALE })
    .getRawOne();

  await this.dailyStatsRepository.upsert(
    {
      date: dateStr,
      total_revenue: stats.total_revenue || 0,
      total_transactions: stats.total_transactions || 0,
      active_machines: stats.active_machines || 0,
      last_updated_at: new Date(),
    },
    ['date'],
  );

  this.logger.log(`Aggregated stats for ${dateStr}`);
}
```

---

## ❌ Недостающие компоненты

### 5. Job Queue (BullMQ)

#### Для чего нужно
- ❌ **Тяжелые задачи блокируют API** - импорт файлов, генерация PDF
- ❌ **Нет retry механизма** - если операция упала, она потеряна
- ❌ **Нет приоритетов** - все операции равнозначны

#### Решение: BullMQ

```bash
npm install @nestjs/bull bull
```

```typescript
// backend/src/modules/sales-import/sales-import.module.ts
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'sales-import',
    }),
  ],
})
export class SalesImportModule {}

// backend/src/modules/sales-import/sales-import.processor.ts
import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';

@Processor('sales-import')
export class SalesImportProcessor {
  @Process('process-file')
  async handleProcessFile(job: Job<{ fileId: string; userId: string }>) {
    const { fileId, userId } = job.data;

    // Тяжелая обработка в фоне
    await this.salesImportService.processFile(fileId, userId);

    return { success: true, processedRows: 1000 };
  }
}

// backend/src/modules/sales-import/sales-import.service.ts
async uploadAndQueue(file: Express.Multer.File, userId: string): Promise<{ jobId: string }> {
  // Сохранить файл
  const savedFile = await this.filesService.uploadFile(file, {...}, userId);

  // Добавить в очередь
  const job = await this.salesImportQueue.add('process-file', {
    fileId: savedFile.id,
    userId,
  }, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  });

  return { jobId: job.id };
}
```

---

### 6. Event-Driven Architecture

#### Проблема
Жесткая связь между модулями:

```typescript
// ❌ BAD
class SalesImportService {
  constructor(
    private inventoryService: InventoryService,
    private notificationsService: NotificationsService,
    private analyticsService: AnalyticsService,
  ) {}
}
```

#### Решение: EventEmitter

```typescript
// ✅ GOOD
class SalesImportService {
  constructor(
    private eventEmitter: EventEmitter2,
  ) {}

  async processFile() {
    // ... process

    // Просто генерируем событие
    this.eventEmitter.emit('sales.imported', {
      importId,
      rows: processedRows,
      timestamp: new Date(),
    });
  }
}

// Слушатели в других модулях
@Injectable()
export class InventoryListener {
  @OnEvent('sales.imported')
  async handleSalesImported(payload) {
    // Обновить остатки
    await this.inventoryService.deductFromSales(payload.rows);
  }
}

@Injectable()
export class AnalyticsListener {
  @OnEvent('sales.imported')
  async handleSalesImported(payload) {
    // Обновить статистику
    await this.analyticsService.updateDailyStats(payload);
  }
}
```

---

### 7. Версионирование сущностей

#### Проблема
Изменение recipe влияет на прошлые продажи:

```typescript
// ❌ Если изменить recipe.items, все старые продажи покажут новый состав
recipe.items = [/* новый состав */];
```

#### Решение: Snapshot versioning

```typescript
// backend/src/modules/recipes/entities/recipe-snapshot.entity.ts
@Entity('recipe_snapshots')
export class RecipeSnapshot extends BaseEntity {
  @Column({ type: 'uuid' })
  recipe_id: string;

  @Column({ type: 'integer' })
  version: number;

  @Column({ type: 'jsonb' })
  snapshot: {
    name: string;
    items: Array<{ nomenclature_id: string; quantity: number }>;
  };

  @Column({ type: 'timestamp with time zone' })
  valid_from: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  valid_to: Date | null; // null = current version
}

// При создании продажи
const currentRecipe = await this.recipeSnapshotRepository.findOne({
  where: {
    recipe_id: dto.recipe_id,
    valid_to: IsNull(),
  },
});

await this.transactionRepository.save({
  recipe_snapshot_id: currentRecipe.id, // Ссылка на версию
  recipe_version: currentRecipe.version,
});
```

---

## Приоритет реализации

### 🔴 Критично - немедленно
1. **S3 Storage** - файлы теряются при рестарте
2. **Удаление дублирующего Telegram-бота** - конфликт токенов

### 🟡 Важно - в течение месяца
3. **Task Rollback** - для контроля качества
4. **Analytics Tables** - для масштабирования

### 🟢 Хорошо иметь - в течение квартала
5. **BullMQ** - для тяжелых операций
6. **EventEmitter** - для decoupling
7. **Recipe Versioning** - для точности отчетов

---

## Заключение

Все проблемы решаемы и имеют четкие пути реализации. Критичные вопросы (файлы + бот) можно закрыть за 1-2 дня работы.
