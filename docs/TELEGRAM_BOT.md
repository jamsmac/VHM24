# Telegram Bot Integration - VendHub Manager

> **Version**: 1.0.0
> **Last Updated**: 2025-12-20
> **Module**: `backend/src/modules/telegram/`

This document provides comprehensive documentation for the Telegram Bot integration, covering user management, notifications, task workflows, and the access request system.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Telegram User Entity](#telegram-user-entity)
4. [User Registration Flow](#user-registration-flow)
5. [Access Request System](#access-request-system)
6. [Bot Commands](#bot-commands)
7. [Keyboard Menus](#keyboard-menus)
8. [Notifications](#notifications)
9. [Task Management](#task-management)
10. [Localization](#localization)
11. [Client Platform Auth](#client-platform-auth)
12. [API Reference](#api-reference)
13. [Configuration](#configuration)

---

## Overview

### Purpose

The Telegram Bot serves multiple functions in VendHub Manager:

```
┌────────────────────────────────────────────────────────────────────┐
│                    TELEGRAM BOT FUNCTIONS                          │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  STAFF PLATFORM                    CLIENT PLATFORM                 │
│  ─────────────────                 ──────────────────              │
│  ├── User onboarding               ├── Authentication             │
│  ├── Access request workflow       ├── Order notifications        │
│  ├── Task notifications            ├── Loyalty updates            │
│  ├── Machine alerts                └── Support channel            │
│  ├── Quick actions                                                 │
│  └── Manager tools                                                 │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Key Features

1. **Multi-language support** (Russian, English, Uzbek)
2. **Role-based menus** (Operator, Manager, Admin)
3. **Resilient message delivery** (retry with exponential backoff)
4. **Notification preferences** (per user)
5. **Quick actions** (start task, view machines, etc.)
6. **Photo/location handling** (for task completion)
7. **Voice message processing** (optional)

---

## Architecture

### Module Structure

```
telegram/
├── entities/
│   ├── telegram-user.entity.ts          # User registration
│   ├── telegram-settings.entity.ts      # Global bot settings
│   └── telegram-message-log.entity.ts   # Message logging
├── services/
│   ├── telegram-bot.service.ts          # Core bot service
│   ├── telegram-users.service.ts        # User management
│   ├── telegram-notifications.service.ts # Notification delivery
│   ├── telegram-settings.service.ts     # Settings management
│   ├── telegram-session.service.ts      # Session/state management
│   ├── telegram-quick-actions.service.ts # Quick action handlers
│   ├── telegram-manager-tools.service.ts # Manager features
│   ├── telegram-i18n.service.ts         # Localization
│   ├── telegram-location.service.ts     # Location handling
│   ├── telegram-photo-compression.service.ts # Photo processing
│   ├── telegram-voice.service.ts        # Voice messages
│   ├── telegram-qr.service.ts           # QR code scanning
│   ├── telegram-resilient-api.service.ts # Retry/resilience
│   └── cart-storage.service.ts          # Client cart storage
├── handlers/
│   ├── telegram-keyboard.handler.ts     # Keyboard generation
│   ├── telegram-message.handler.ts      # Message handling
│   ├── telegram-task.handler.ts         # Task workflows
│   ├── catalog.handler.ts               # Client catalog
│   ├── cart.handler.ts                  # Client cart
│   ├── keyboards.ts                     # Keyboard templates
│   └── fsm-states.ts                    # State machine
├── controllers/
│   ├── telegram-users.controller.ts
│   ├── telegram-notifications.controller.ts
│   └── telegram-settings.controller.ts
├── processors/
│   └── telegram-queue.processor.ts      # Background processing
├── dto/
│   ├── send-telegram-message.dto.ts
│   ├── update-telegram-settings.dto.ts
│   ├── update-telegram-user.dto.ts
│   └── link-telegram.dto.ts
└── types/
    └── telegram.types.ts
```

### Technology Stack

| Component | Technology |
|-----------|------------|
| Bot Framework | Telegraf 4.x |
| Queue | Bull (Redis) |
| State Management | Redis sessions |
| Localization | Custom i18n service |

---

## Telegram User Entity

### Entity Definition

```typescript
export enum TelegramUserStatus {
  ACTIVE = 'active',
  BLOCKED = 'blocked',
  INACTIVE = 'inactive',
}

export enum TelegramLanguage {
  RU = 'ru',
  EN = 'en',
  UZ = 'uz',
}

@Entity('telegram_users')
export class TelegramUser extends BaseEntity {
  @Column({ type: 'bigint', unique: true })
  telegram_id: string;               // Telegram user ID

  @Column({ type: 'uuid' })
  user_id: string;                   // Link to VendHub User

  @ManyToOne(() => User)
  user: User;

  @Column({ type: 'bigint' })
  chat_id: string;                   // Chat ID for messages

  @Column({ type: 'varchar', length: 255, nullable: true })
  username: string | null;           // @username

  @Column({ type: 'varchar', length: 255, nullable: true })
  first_name: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  last_name: string | null;

  @Column({ type: 'enum', enum: TelegramLanguage, default: TelegramLanguage.RU })
  language: TelegramLanguage;

  @Column({ type: 'enum', enum: TelegramUserStatus, default: TelegramUserStatus.ACTIVE })
  status: TelegramUserStatus;

  @Column({ type: 'jsonb', default: {} })
  notification_preferences: {
    machine_offline?: boolean;
    machine_online?: boolean;
    low_stock?: boolean;
    sales_milestone?: boolean;
    maintenance_due?: boolean;
    equipment_needs_maintenance?: boolean;
    equipment_low_stock?: boolean;
    equipment_washing_due?: boolean;
    payment_failed?: boolean;
    task_assigned?: boolean;
    task_completed?: boolean;
    custom?: boolean;
  };

  @Column({ type: 'timestamp', nullable: true })
  last_interaction_at: Date | null;

  // Verification (for linking accounts)
  @Column({ type: 'varchar', length: 50, nullable: true })
  verification_code: string | null;

  @Column({ type: 'timestamp', nullable: true })
  verification_code_expires_at: Date | null;

  @Column({ type: 'integer', default: 0 })
  verification_attempts: number;

  @Column({ type: 'timestamp', nullable: true })
  last_verification_attempt_at: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  blocked_until: Date | null;

  @Column({ type: 'boolean', default: false })
  is_verified: boolean;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;
}
```

---

## User Registration Flow

### Overview

New users go through an access request workflow:

```
┌────────────────────────────────────────────────────────────────────┐
│                    USER REGISTRATION FLOW                          │
└────────────────────────────────────────────────────────────────────┘

  1. USER: Sends /start to bot
     │
     ▼
  2. BOT: Creates access request
     │     - Records telegram_id, username, first_name
     │     - Status: PENDING
     │
     ▼
  3. BOT: Notifies admins
     │     - Inline approve/reject buttons
     │
     ▼
  4. ADMIN: Reviews request
     │
     ├──► APPROVE
     │    - Create User account
     │    - Create TelegramUser link
     │    - Set is_verified = true
     │    - Notify user of approval
     │
     └──► REJECT
          - Set request status REJECTED
          - Notify user of rejection
```

### Access Request Entity

```typescript
// From access-requests module
@Entity('access_requests')
export class AccessRequest extends BaseEntity {
  @Column({ type: 'bigint' })
  telegram_id: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  telegram_username: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  telegram_first_name: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  telegram_last_name: string | null;

  @Column({
    type: 'enum',
    enum: AccessRequestStatus,
    default: AccessRequestStatus.PENDING
  })
  status: AccessRequestStatus;

  @Column({ type: 'uuid', nullable: true })
  processed_by_user_id: string | null;

  @Column({ type: 'timestamp', nullable: true })
  processed_at: Date | null;

  @Column({ type: 'text', nullable: true })
  rejection_reason: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  assigned_role: string | null;

  @Column({ type: 'uuid', nullable: true })
  created_user_id: string | null;  // User created on approval
}
```

---

## Access Request System

### Approval Workflow

```
┌────────────────────────────────────────────────────────────────────┐
│                    ADMIN APPROVAL KEYBOARD                         │
└────────────────────────────────────────────────────────────────────┘

  📋 Новая заявка на доступ

  👤 Пользователь: John Doe
  📱 Username: @johndoe
  📅 Дата: 2025-12-20 10:30

  ┌─────────────────────────────────────┐
  │ ✅ Одобрить   │   ❌ Отклонить     │
  └─────────────────────────────────────┘
```

### Approval Handler

```typescript
// Admin clicks "Approve"
async handleApproveRequest(requestId: string, adminUserId: string) {
  const request = await this.accessRequestsService.findOne(requestId);

  // 1. Create VendHub User account
  const user = await this.usersService.create({
    email: `tg_${request.telegram_id}@telegram.local`,
    full_name: `${request.telegram_first_name} ${request.telegram_last_name || ''}`.trim(),
    role: UserRole.OPERATOR,
    telegram_id: request.telegram_id,
    password: generateSecurePassword(),
    require_password_change: true,
  });

  // 2. Create TelegramUser link
  const telegramUser = await this.telegramUsersService.create({
    telegram_id: request.telegram_id,
    user_id: user.id,
    chat_id: request.telegram_id,
    username: request.telegram_username,
    first_name: request.telegram_first_name,
    last_name: request.telegram_last_name,
    is_verified: true,
  });

  // 3. Update access request
  await this.accessRequestsService.approve(requestId, adminUserId, user.id);

  // 4. Notify user
  await this.telegramNotificationsService.sendNotification({
    userId: user.id,
    type: 'access_approved',
    title: 'Access Approved',
    message: 'Your access request has been approved. You can now use the bot.',
  });
}
```

---

## Bot Commands

### Available Commands

| Command | Description | Who Can Use |
|---------|-------------|-------------|
| `/start` | Start bot / Request access | Everyone |
| `/menu` | Show main menu | Verified users |
| `/tasks` | Show my tasks | Operators |
| `/machines` | Show machines | All verified |
| `/alerts` | Show active alerts | Managers/Admins |
| `/stats` | Show statistics | Managers/Admins |
| `/settings` | Notification settings | All verified |
| `/help` | Show help | Everyone |
| `/language` | Change language | All verified |

### Command Handler Example

```typescript
// /start command handler
bot.command('start', async (ctx) => {
  const telegramId = ctx.from.id.toString();

  // Check if user already linked
  const existingUser = await this.telegramUsersService.findByTelegramId(telegramId);

  if (existingUser?.is_verified) {
    // Show main menu
    await ctx.reply(
      this.i18n.t(existingUser.language, 'welcome_back'),
      this.keyboardHandler.getMainMenuKeyboard(existingUser.language)
    );
    return;
  }

  // Check for pending request
  const pendingRequest = await this.accessRequestsService.findPending(telegramId);

  if (pendingRequest) {
    await ctx.reply(
      this.i18n.t('ru', 'request_pending'),
      this.keyboardHandler.getVerificationKeyboard('ru')
    );
    return;
  }

  // Create new access request
  await this.accessRequestsService.create({
    telegram_id: telegramId,
    telegram_username: ctx.from.username,
    telegram_first_name: ctx.from.first_name,
    telegram_last_name: ctx.from.last_name,
  });

  // Notify admins
  await this.notifyAdminsAboutNewRequest({...});

  await ctx.reply(
    this.i18n.t('ru', 'request_submitted'),
    this.keyboardHandler.getVerificationKeyboard('ru')
  );
});
```

---

## Keyboard Menus

### Main Menu

```typescript
getMainMenuKeyboard(lang: TelegramLanguage) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(`📋 ${this.i18n.t(lang, 'tasks')}`, 'menu_tasks'),
      Markup.button.callback(`🖥 ${this.i18n.t(lang, 'machines')}`, 'menu_machines'),
    ],
    [
      Markup.button.callback(`🔔 ${this.i18n.t(lang, 'alerts')}`, 'menu_alerts'),
      Markup.button.callback(`📊 ${this.i18n.t(lang, 'statistics')}`, 'menu_stats'),
    ],
    [Markup.button.callback(`⚙️ ${this.i18n.t(lang, 'settings')}`, 'menu_settings')],
    [
      Markup.button.url(
        this.i18n.t(lang, 'open_web_app'),
        process.env.FRONTEND_URL || 'https://vendhub.com',
      ),
    ],
  ]);
}
```

### Visual Layout

```
┌────────────────────────────────────────────────────────────────┐
│                      MAIN MENU                                  │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌────────────────┐   ┌────────────────┐                     │
│   │ 📋 Tasks       │   │ 🖥 Machines    │                     │
│   └────────────────┘   └────────────────┘                     │
│                                                                 │
│   ┌────────────────┐   ┌────────────────┐                     │
│   │ 🔔 Alerts      │   │ 📊 Statistics  │                     │
│   └────────────────┘   └────────────────┘                     │
│                                                                 │
│   ┌─────────────────────────────────────┐                     │
│   │        ⚙️ Settings                  │                     │
│   └─────────────────────────────────────┘                     │
│                                                                 │
│   ┌─────────────────────────────────────┐                     │
│   │      🌐 Open Web App                │                     │
│   └─────────────────────────────────────┘                     │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### Notification Settings Keyboard

```typescript
getNotificationSettingsKeyboard(lang: TelegramLanguage, user: TelegramUser) {
  const prefs = user.notification_preferences || {};

  return Markup.inlineKeyboard([
    [
      Markup.button.callback(
        `${prefs.machine_offline ? '✅' : '⬜'} Machine Offline`,
        'toggle_machine_offline',
      ),
    ],
    [
      Markup.button.callback(
        `${prefs.low_stock ? '✅' : '⬜'} Low Stock`,
        'toggle_low_stock',
      ),
    ],
    [
      Markup.button.callback(
        `${prefs.task_assigned ? '✅' : '⬜'} Task Assigned`,
        'toggle_task_assigned',
      ),
    ],
    [Markup.button.callback(this.i18n.t(lang, 'back'), 'menu_settings')],
  ]);
}
```

---

## Notifications

### Notification Types

| Type | Description | Default |
|------|-------------|---------|
| `machine_offline` | Machine went offline | ON |
| `machine_online` | Machine back online | OFF |
| `low_stock` | Low inventory alert | ON |
| `sales_milestone` | Sales target reached | OFF |
| `maintenance_due` | Maintenance needed | ON |
| `equipment_low_stock` | Equipment supplies low | ON |
| `equipment_washing_due` | Cleaning needed | ON |
| `payment_failed` | Payment issue | ON |
| `task_assigned` | New task assigned | ON |
| `task_completed` | Task completed | OFF |

### Notification Payload

```typescript
interface NotificationPayload {
  userId?: string;           // Send to specific user
  userIds?: string[];        // Send to multiple users
  broadcast?: boolean;       // Send to all active users
  type: string;             // Notification type
  title: string;            // Notification title
  message: string;          // Message body
  data?: Record<string, any>; // Additional data
  actions?: Array<{         // Inline keyboard buttons
    text: string;
    url?: string;
    callback_data?: string;
  }>;
}
```

### Resilient Delivery

```typescript
async sendNotification(payload: NotificationPayload): Promise<void> {
  const users = await this.getTargetUsers(payload);

  for (const user of users) {
    // Check user preferences
    if (!this.shouldSendNotification(user, payload.type)) {
      continue;
    }

    // Use resilient API with retry
    await this.resilientApi.sendText(
      user.chat_id,
      message,
      { reply_markup: keyboard.reply_markup, parse_mode: 'HTML' },
      {
        priority: 1,      // High priority
        attempts: 5,      // Retry up to 5 times
        metadata: {
          userId: user.id,
          messageType: TelegramMessageType.NOTIFICATION,
        },
      },
    );
  }
}
```

### Message Logging

```typescript
@Entity('telegram_message_logs')
export class TelegramMessageLog extends BaseEntity {
  @Column({ type: 'uuid' })
  telegram_user_id: string;

  @Column({ type: 'bigint' })
  chat_id: string;

  @Column({ type: 'enum', enum: TelegramMessageType })
  message_type: TelegramMessageType;

  @Column({ type: 'enum', enum: TelegramMessageStatus })
  status: TelegramMessageStatus;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'text', nullable: true })
  error_message: string | null;

  @Column({ type: 'integer', nullable: true })
  telegram_message_id: number | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}
```

---

## Task Management

### Task List Keyboard

```typescript
getTasksKeyboard(tasks: TelegramTaskInfo[], lang: TelegramLanguage) {
  const buttons = [];

  tasks.slice(0, 8).forEach((task) => {
    const typeIcon = this.getTaskTypeIcon(task.type_code);
    const statusIcon = this.getTaskStatusIcon(task.status);
    const machineLabel = task.machine?.machine_number || 'Unknown';

    const buttonText = task.status === TaskStatus.IN_PROGRESS
      ? `${statusIcon} Continue`
      : `▶️ Start`;

    buttons.push([
      Markup.button.callback(
        `${typeIcon} ${machineLabel} - ${buttonText}`,
        `task_start_${task.id}`
      ),
    ]);
  });

  buttons.push([
    Markup.button.callback(this.i18n.t(lang, 'back'), 'back_to_menu'),
  ]);

  return Markup.inlineKeyboard(buttons);
}
```

### Task Type Icons

```typescript
getTaskTypeIcon(typeCode: string): string {
  const icons: Record<string, string> = {
    refill: '📦',
    collection: '💰',
    cleaning: '🧹',
    repair: '🔧',
    inspection: '🔍',
    install: '🔩',
    removal: '📤',
    audit: '📋',
    replace_hopper: '🥤',
    replace_grinder: '⚙️',
    replace_brew_unit: '☕',
    replace_mixer: '🔄',
  };
  return icons[typeCode] || '📝';
}
```

### Task Workflow via Bot

```
┌────────────────────────────────────────────────────────────────────┐
│                    TASK WORKFLOW VIA BOT                           │
└────────────────────────────────────────────────────────────────────┘

  1. Operator receives task notification
     │
     ▼
  2. Opens /tasks menu
     │
     ▼
  3. Clicks "▶️ Start" on task
     │
     ▼
  4. Bot prompts for "before" photo
     │
     ▼
  5. Operator sends photo
     │     - Photo uploaded to Files service
     │     - Linked to task
     │
     ▼
  6. Operator performs physical work
     │
     ▼
  7. Bot prompts for "after" photo
     │
     ▼
  8. Operator sends photo
     │
     ▼
  9. Bot asks for confirmation / additional data
     │     - For collection: Cash amount
     │     - For refill: Actual quantities
     │
     ▼
  10. Task marked complete
      │
      ▼
  11. Manager notified
```

---

## Localization

### Supported Languages

| Code | Language | Default |
|------|----------|---------|
| `ru` | Russian | ✓ |
| `en` | English | |
| `uz` | Uzbek | |

### I18n Service

```typescript
@Injectable()
export class TelegramI18nService {
  private translations: Record<TelegramLanguage, Record<string, string>> = {
    ru: {
      welcome: 'Добро пожаловать в VendHub!',
      tasks: 'Задачи',
      machines: 'Аппараты',
      alerts: 'Уведомления',
      statistics: 'Статистика',
      settings: 'Настройки',
      back: '◀️ Назад',
      request_pending: 'Ваша заявка на рассмотрении...',
      access_approved: 'Ваша заявка одобрена!',
      // ... more translations
    },
    en: {
      welcome: 'Welcome to VendHub!',
      tasks: 'Tasks',
      machines: 'Machines',
      // ... more translations
    },
    uz: {
      welcome: "VendHub'ga xush kelibsiz!",
      // ... Uzbek translations
    },
  };

  t(lang: TelegramLanguage, key: string): string {
    return this.translations[lang]?.[key] || this.translations.ru[key] || key;
  }
}
```

### Language Selection Keyboard

```typescript
getLanguageKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🇷🇺 Русский', 'lang_ru')],
    [Markup.button.callback('🇺🇸 English', 'lang_en')],
    [Markup.button.callback('🇺🇿 O\'zbekcha', 'lang_uz')],
    [Markup.button.callback('◀️ Назад', 'menu_settings')],
  ]);
}
```

---

## Client Platform Auth

### Telegram Mini App Authentication

The Client Platform uses Telegram's initData for authentication:

```typescript
// Client sends Telegram initData
// Header: x-telegram-init-data: <initData>

@Injectable()
export class ClientAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const initData = request.headers['x-telegram-init-data'];

    if (!initData) {
      throw new UnauthorizedException('Telegram init data required');
    }

    // Validate with Telegram Bot API
    const validated = await this.validateInitData(initData);

    if (!validated) {
      throw new UnauthorizedException('Invalid init data');
    }

    // Find or create client user
    const clientUser = await this.clientService.findOrCreateByTelegramId(
      validated.user.id,
      validated.user
    );

    request.clientUser = clientUser;
    return true;
  }
}
```

---

## API Reference

### Telegram Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/telegram/users` | List Telegram users |
| `GET` | `/telegram/users/:id` | Get user by ID |
| `PATCH` | `/telegram/users/:id` | Update user |
| `DELETE` | `/telegram/users/:id` | Unlink user |

### Telegram Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/telegram/notifications/send` | Send notification |
| `POST` | `/telegram/notifications/broadcast` | Broadcast to all |
| `GET` | `/telegram/notifications/logs` | Get message logs |

### Telegram Settings

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/telegram/settings` | Get bot settings |
| `PATCH` | `/telegram/settings` | Update settings |

---

## Configuration

### Environment Variables

```bash
# Telegram Bot Token
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz

# Bot Username (without @)
TELEGRAM_BOT_USERNAME=vendhub_bot

# Frontend URL (for Web App links)
FRONTEND_URL=https://app.vendhub.uz

# Admin Chat IDs (comma-separated)
TELEGRAM_ADMIN_CHAT_IDS=123456789,987654321

# Enable/Disable notifications
TELEGRAM_NOTIFICATIONS_ENABLED=true

# Redis for sessions
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Global Settings Entity

```typescript
@Entity('telegram_settings')
export class TelegramSettings extends BaseEntity {
  @Column({ type: 'boolean', default: true })
  send_notifications: boolean;

  @Column({ type: 'boolean', default: true })
  bot_enabled: boolean;

  @Column({ type: 'varchar', length: 10, default: 'ru' })
  default_language: string;

  @Column({ type: 'jsonb', nullable: true })
  welcome_message: Record<string, string>;

  @Column({ type: 'jsonb', nullable: true })
  admin_chat_ids: string[];

  @Column({ type: 'jsonb', nullable: true })
  blocked_users: string[];

  @Column({ type: 'integer', default: 5 })
  rate_limit_per_minute: number;
}
```

---

## Related Documentation

- [Auth Flows](./AUTH_FLOWS.md) - Telegram authentication flows
- [Task System](./TASK_SYSTEM.md) - Task workflows
- [Notifications](./ARCHITECTURE.md) - Notification system
- [Client Platform](./PROJECT_DESCRIPTION_EN.md) - Client platform overview

---

**Last Updated**: 2025-12-20
**Version**: 1.0.0
**Maintained By**: VendHub Development Team
