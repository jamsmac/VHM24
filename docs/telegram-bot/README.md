# Telegram Bot Module

## Overview

The Telegram Bot module provides a Telegram-based interface for VendHub Manager operators. It enables task management, statistics viewing, and commission tracking directly through Telegram.

## Key Features

- Operator account linking
- Task viewing and management
- Personal statistics
- Commission status monitoring
- Overdue payment alerts
- Contract management
- Real-time notifications
- Interactive inline keyboards

## Module Structure

```
telegram/
├── telegram-bot.service.ts     # Bot service (legacy location)
└── telegram.module.ts

telegram-bot/
├── telegram-bot.service.ts     # Main bot service
├── telegram-bot.module.ts
└── telegram-bot.service.spec.ts
```

## Service

### TelegramBotService

**File**: `backend/src/modules/telegram-bot/telegram-bot.service.ts`

```typescript
@Injectable()
export class TelegramBotService implements OnModuleInit, OnModuleDestroy {
  private bot: Telegraf<BotContext> | null = null;
  private enabled = false;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Task) private readonly taskRepository: Repository<Task>,
    @InjectRepository(Contract) private readonly contractRepository: Repository<Contract>,
    @InjectRepository(CommissionCalculation) private readonly commissionRepository: Repository<CommissionCalculation>,
    @InjectQueue('commission-calculations') private readonly commissionQueue: Queue,
  ) {}

  async onModuleInit() {
    const botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      this.logger.warn('TELEGRAM_BOT_TOKEN not configured. Bot is disabled.');
      return;
    }
    this.bot = new Telegraf<BotContext>(botToken);
    this.setupCommands();
    await this.bot.launch();
    this.enabled = true;
  }

  async onModuleDestroy() {
    if (this.bot) {
      this.bot.stop('SIGTERM');
    }
  }
}
```

## Bot Commands

### General Commands

| Command | Description | Example |
|---------|-------------|---------|
| `/start` | Welcome message | `/start` |
| `/link <email>` | Link Telegram to account (deprecated) | `/link user@email.com` |
| `/help` | Show available commands | `/help` |
| `/stats` | Personal statistics | `/stats` |

### Task Commands

| Command | Description | Example |
|---------|-------------|---------|
| `/mytasks` | View active tasks | `/mytasks` |
| `/task <id>` | View task details | `/task uuid-here` |

### Commission Commands

| Command | Description |
|---------|-------------|
| `/commissions` | Commission status summary |
| `/overdue` | View overdue payments |
| `/calculate` | Trigger commission calculation |
| `/contracts` | View active contracts |

## Account Linking

### Security Note

The `/link` command is **deprecated** for security reasons. Users must now:

1. Login to web interface
2. Go to profile settings
3. Click "Link Telegram"
4. Receive verification code
5. Send code to bot

```typescript
this.bot.command('link', async (ctx) => {
  await ctx.reply(
    '⚠️ Команда /link отключена по соображениям безопасности.\n\n' +
    '🔐 Для безопасной привязки аккаунта:\n' +
    '1. Войдите в веб-интерфейс VendHub\n' +
    '2. Перейдите в настройки профиля\n' +
    '3. Нажмите "Привязать Telegram"\n' +
    '4. Получите код верификации\n' +
    '5. Отправьте этот код мне'
  );
});
```

## Task Management

### My Tasks

```typescript
private async handleMyTasks(ctx: BotContext, telegramUserId: number) {
  const user = await this.userRepository.findOne({
    where: { telegram_user_id: telegramUserId.toString() },
  });

  const tasks = await this.taskRepository.find({
    where: {
      assigned_to_user_id: user.id,
      status: TaskStatus.IN_PROGRESS,
    },
    relations: ['machine'],
    order: { due_date: 'ASC' },
  });

  // Format and send task list
}
```

### Task Details

Shows:
- Task type and status
- Machine number
- Priority level
- Due date
- Assignee
- Description
- Task items (products)

## Commission Management

### Commission Status

```typescript
private async handleCommissions(ctx: BotContext, telegramUserId: number) {
  const [pending, paid, overdue, total] = await Promise.all([
    this.commissionRepository.count({ where: { payment_status: PaymentStatus.PENDING } }),
    this.commissionRepository.count({ where: { payment_status: PaymentStatus.PAID } }),
    this.commissionRepository.count({ where: { payment_status: PaymentStatus.OVERDUE } }),
    this.commissionRepository.count({}),
  ]);

  // Also get amounts for each status
  // Return with inline keyboard for actions
}
```

### Calculate Commissions

Triggers BullMQ job for commission calculation:

```typescript
private async triggerCalculation(ctx: BotContext, period: string) {
  const job = await this.commissionQueue.add('calculate-manual', { period });
  await ctx.reply(
    `✅ Расчет ${period} комиссий запущен!\n` +
    `Job ID: \`${job.id}\``,
    { parse_mode: 'Markdown' }
  );
}
```

Periods: `daily`, `weekly`, `monthly`, `all`

## Notifications

### Send Notification

```typescript
async sendNotification(telegramUserId: number, message: string): Promise<boolean> {
  if (!this.enabled || !this.bot) return false;
  await this.bot.telegram.sendMessage(telegramUserId, message, {
    parse_mode: 'Markdown',
  });
  return true;
}
```

### Notification Types

| Method | Purpose |
|--------|---------|
| `notifyTaskAssigned()` | New task notification |
| `notifyTaskOverdue()` | Task overdue warning |
| `notifyOverduePayment()` | Payment overdue alert |
| `notifyCalculationCompleted()` | Calculation success |
| `notifyCalculationFailed()` | Calculation error |
| `sendOverdueSummary()` | Daily overdue summary |

### Task Assignment Notification

```typescript
async notifyTaskAssigned(task: Task, telegramUserId: number) {
  const priority = this.getPriorityEmoji(task.priority);
  const dueDate = task.due_date ? new Date(task.due_date).toLocaleString('ru-RU') : 'Не указан';

  const message =
    `🔔 **Новая задача назначена**\n\n` +
    `${priority} Тип: ${task.type_code}\n` +
    `📍 Аппарат: ${task.machine?.machine_number}\n` +
    `⏰ Срок: ${dueDate}\n\n` +
    `Используйте /task ${task.id} для просмотра деталей`;

  return this.sendNotification(telegramUserId, message);
}
```

## Inline Keyboards

Interactive buttons for quick actions:

```typescript
const keyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback('📊 Обновить', 'refresh_commissions'),
    Markup.button.callback('⚠️ Просрочено', 'view_overdue'),
  ],
  [
    Markup.button.callback('🔄 Рассчитать', 'calculate_all'),
    Markup.button.callback('📋 Договоры', 'view_contracts'),
  ],
]);
```

### Callback Handlers

```typescript
private async handleCallbackQuery(ctx: BotContext) {
  const callbackData = ctx.callbackQuery?.data;

  switch (callbackData) {
    case 'refresh_commissions':
      await this.handleCommissions(ctx, telegramUserId);
      break;
    case 'view_overdue':
      await this.handleOverduePayments(ctx, telegramUserId);
      break;
    case 'calculate_all':
      await this.triggerCalculation(ctx, 'all');
      break;
    // ... more handlers
  }
}
```

## Utility Methods

### Priority Emoji

```typescript
private getPriorityEmoji(priority: string): string {
  const map: Record<string, string> = {
    low: '🟢',
    normal: '🟡',
    high: '🟠',
    urgent: '🔴',
  };
  return map[priority] || '⚪';
}
```

### Status Emoji

```typescript
private getStatusEmoji(status: TaskStatus): string {
  const map: Record<TaskStatus, string> = {
    [TaskStatus.PENDING]: '⏸',
    [TaskStatus.ASSIGNED]: '📌',
    [TaskStatus.IN_PROGRESS]: '🔄',
    [TaskStatus.COMPLETED]: '✅',
    [TaskStatus.REJECTED]: '🚫',
    [TaskStatus.POSTPONED]: '⏰',
    [TaskStatus.CANCELLED]: '❌',
  };
  return map[status] || '❓';
}
```

### Currency Formatting

```typescript
private formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'UZS',
    minimumFractionDigits: 0,
  }).format(amount);
}
```

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `TELEGRAM_BOT_TOKEN` | Bot token from @BotFather | Yes |

### Bot Setup

1. Create bot with @BotFather
2. Get bot token
3. Set `TELEGRAM_BOT_TOKEN` in `.env`
4. Bot auto-starts with application

## User Entity Integration

The User entity has a `telegram_user_id` field for linking:

```typescript
@Entity('users')
class User extends BaseEntity {
  @Column({ type: 'varchar', length: 50, nullable: true })
  telegram_user_id: string | null;  // Telegram user ID (string)
}
```

## Error Handling

```typescript
this.bot.catch((err, ctx) => {
  this.logger.error(`Bot error for ${ctx.updateType}:`, err);
  ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
});
```

## Related Modules

- [Users](../users/README.md) - User management
- [Tasks](../tasks/README.md) - Task management
- [Counterparty](../counterparty/README.md) - Contracts and commissions
- [Notifications](../notifications/README.md) - Multi-channel notifications

## Extended Documentation

For comprehensive Telegram integration details, see: [TELEGRAM_BOT.md](../TELEGRAM_BOT.md)
