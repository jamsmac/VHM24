# Email Module

## Overview

The Email module provides email sending capabilities for VendHub Manager using NodeMailer with SMTP. It supports various notification types including task alerts, low stock warnings, and password resets.

## Key Features

- SMTP email sending via NodeMailer
- HTML and plain text email support
- Predefined email templates
- Attachment support
- Configuration verification
- Graceful degradation when not configured

## Configuration

### Environment Variables

```env
# SMTP Configuration
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASSWORD=your-password
SMTP_FROM_EMAIL=noreply@vendhub.com
SMTP_FROM_NAME=VendHub Manager
```

### Ports

| Port | Security | Description |
|------|----------|-------------|
| 25 | None | Standard SMTP (not recommended) |
| 465 | SSL | SMTP over SSL |
| 587 | TLS | SMTP with STARTTLS (recommended) |

## Service

**File**: `backend/src/modules/email/email.service.ts`

```typescript
@Injectable()
export class EmailService {
  private transporter: Transporter | null;
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.enabled = this.isEmailConfigured();
    if (this.enabled) {
      this.initializeTransporter();
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean>;
  async sendTaskNotification(to, taskType, machineNumber, dueDate): Promise<boolean>;
  async sendOverdueNotification(to, taskType, machineNumber, hoursOverdue): Promise<boolean>;
  async sendLowStockAlert(to, machineNumber, items): Promise<boolean>;
  async sendWelcomeEmail(to, name, role): Promise<boolean>;
  async sendPasswordResetEmail(to, name, token): Promise<boolean>;
  async verifyConfiguration(): Promise<boolean>;
}
```

## Email Options Interface

```typescript
interface EmailOptions {
  to: string | string[];           // Recipients
  subject: string;                 // Email subject
  text?: string;                   // Plain text content
  html?: string;                   // HTML content
  attachments?: Attachment[];      // File attachments
}

interface Attachment {
  filename: string;
  path?: string;                   // File path
  content?: string | Buffer;       // Inline content
}
```

## Email Templates

### Task Notification

Sent when a new task is assigned to an operator.

```html
┌────────────────────────────────────────────────────┐
│          🔔 Новая задача назначена                 │
├────────────────────────────────────────────────────┤
│                                                    │
│  Вам назначена новая задача:                       │
│                                                    │
│  • Тип задачи: Пополнение                         │
│  • Аппарат: M-001                                  │
│  • Срок выполнения: 15.12.2025 14:00              │
│                                                    │
│  Пожалуйста, войдите в систему для просмотра.     │
│                                                    │
└────────────────────────────────────────────────────┘
```

### Overdue Notification

Sent when a task is past its due date.

```html
┌────────────────────────────────────────────────────┐
│          ⚠️ Задача просрочена                      │
├────────────────────────────────────────────────────┤
│                                                    │
│  ⚠ Внимание! Задача просрочена на 4 часов.        │
│                                                    │
│  • Тип задачи: Инкассация                         │
│  • Аппарат: M-005                                  │
│  • Просрочено на: 4 часов                         │
│                                                    │
│  Пожалуйста, завершите задачу как можно скорее.   │
│                                                    │
└────────────────────────────────────────────────────┘
```

### Low Stock Alert

Sent when machine products are running low.

```html
┌────────────────────────────────────────────────────┐
│          📦 Низкий запас товара                    │
├────────────────────────────────────────────────────┤
│                                                    │
│  В аппарате M-003 заканчиваются товары:           │
│                                                    │
│  • Coca-Cola 0.5л: 2 из 10                        │
│  • Snickers: 3 из 15                              │
│  • Вода 0.5л: 1 из 20                             │
│                                                    │
│  Требуется пополнение.                            │
│                                                    │
└────────────────────────────────────────────────────┘
```

### Welcome Email

Sent to new users when their account is created.

```html
┌────────────────────────────────────────────────────┐
│          👋 Добро пожаловать в VendHub Manager!    │
├────────────────────────────────────────────────────┤
│                                                    │
│  Здравствуйте, Иван Иванов!                       │
│                                                    │
│  Ваш аккаунт успешно создан с ролью: Оператор.    │
│                                                    │
│  Вы можете войти в систему используя свои         │
│  учетные данные.                                  │
│                                                    │
└────────────────────────────────────────────────────┘
```

### Password Reset

Sent when user requests password reset (REQ-AUTH-45).

```html
┌────────────────────────────────────────────────────┐
│          🔐 Сброс пароля                           │
├────────────────────────────────────────────────────┤
│                                                    │
│  Здравствуйте, Иван!                              │
│                                                    │
│  Вы запросили сброс пароля для своего аккаунта.   │
│                                                    │
│       [ Сбросить пароль ]                          │
│                                                    │
│  ⚠ Важно:                                          │
│  • Ссылка действительна 1 час                     │
│  • Если вы не запрашивали сброс - игнорируйте     │
│                                                    │
└────────────────────────────────────────────────────┘
```

## Service Methods

| Method | Description |
|--------|-------------|
| `sendEmail()` | Send generic email with options |
| `sendTaskNotification()` | Notify about new task |
| `sendOverdueNotification()` | Notify about overdue task |
| `sendLowStockAlert()` | Alert about low stock |
| `sendWelcomeEmail()` | Welcome new user |
| `sendPasswordResetEmail()` | Password reset link |
| `verifyConfiguration()` | Test SMTP connection |

## Usage Examples

### Basic Email

```typescript
await this.emailService.sendEmail({
  to: 'user@example.com',
  subject: 'Test Email',
  text: 'This is a test email.',
  html: '<h1>This is a test email.</h1>',
});
```

### Task Notification

```typescript
await this.emailService.sendTaskNotification(
  'operator@example.com',
  'Пополнение',
  'M-001',
  new Date('2025-12-15T14:00:00'),
);
```

### Low Stock Alert

```typescript
await this.emailService.sendLowStockAlert(
  'manager@example.com',
  'M-003',
  [
    { name: 'Coca-Cola 0.5л', current: 2, minimum: 10 },
    { name: 'Snickers', current: 3, minimum: 15 },
  ],
);
```

### With Attachments

```typescript
await this.emailService.sendEmail({
  to: 'user@example.com',
  subject: 'Report',
  text: 'See attached report.',
  attachments: [
    {
      filename: 'report.pdf',
      path: '/tmp/report.pdf',
    },
  ],
});
```

## Error Handling

### Graceful Degradation

When email is not configured, the service logs a warning but doesn't throw errors:

```typescript
async sendEmail(options: EmailOptions): Promise<boolean> {
  if (!this.enabled || !this.transporter) {
    this.logger.warn('Email not sent - service is disabled or not configured');
    return false;
  }
  // ... send email
}
```

### Retry Logic

For critical emails, implement retry:

```typescript
async sendWithRetry(options: EmailOptions, maxRetries = 3): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = await this.sendEmail(options);
    if (result) return true;

    this.logger.warn(`Email attempt ${attempt} failed, retrying...`);
    await this.delay(attempt * 1000);  // Exponential backoff
  }
  return false;
}
```

## Integration with Other Modules

### Notifications

The Notifications module uses Email for delivery:

```typescript
if (notification.channel === 'email') {
  await this.emailService.sendEmail({
    to: user.email,
    subject: notification.title,
    html: notification.body,
  });
}
```

### Auth

Password reset emails (REQ-AUTH-45):

```typescript
async requestPasswordReset(email: string): Promise<void> {
  const user = await this.findByEmail(email);
  const token = this.generateResetToken(user.id);

  await this.emailService.sendPasswordResetEmail(
    user.email,
    user.name,
    token,
  );
}
```

### Tasks

Task assignment notifications:

```typescript
async assignTask(task: Task, operator: User): Promise<void> {
  await this.emailService.sendTaskNotification(
    operator.email,
    task.type,
    task.machine.machine_number,
    task.due_date,
  );
}
```

## Configuration Verification

Test SMTP connection on startup:

```typescript
async onModuleInit() {
  if (this.enabled) {
    const isValid = await this.verifyConfiguration();
    if (isValid) {
      this.logger.log('Email configuration verified successfully');
    } else {
      this.logger.error('Email configuration verification failed');
    }
  }
}
```

## Best Practices

1. **Always Provide Both**: Include both HTML and plain text versions
2. **Test Templates**: Preview templates before sending
3. **Monitor Delivery**: Track email delivery rates
4. **Avoid Spam Filters**: Use proper SPF/DKIM/DMARC
5. **Rate Limit**: Don't send too many emails at once
6. **Unsubscribe**: Provide unsubscribe option for marketing emails

## Security Considerations

- Store SMTP credentials in environment variables
- Use TLS/SSL for email transmission
- Validate email addresses before sending
- Sanitize user input in email templates
- Never include sensitive data in plain text

## Related Modules

- [Notifications](../notifications/README.md) - Multi-channel notifications
- [Auth](../auth/README.md) - Password reset
- [Tasks](../tasks/README.md) - Task notifications
- [Alerts](../alerts/README.md) - Alert delivery
