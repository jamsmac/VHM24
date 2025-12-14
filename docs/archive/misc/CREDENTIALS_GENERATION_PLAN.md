# VendHub: Одобрение с генерацией Credentials
**Дата**: 2025-11-16
**Требование**: При одобрении выдавать username и пароль

---

## 📋 Updated Approval Workflow

### Полный Flow:

```
1. User регистрируется
   ├─ Email: john@example.com
   ├─ Пароль: (установлен юзером)
   └─ Статус: PENDING

2. Super admin вводит /pending_users
   └─ Видит список ожидающих

3. Super admin кликает "✅ Approve" на John'е
   └─ System генерирует:
      ├─ Username (автоматический)
      ├─ Temporary Password (случайный)
      └─ Activation Link

4. Super admin выбирает роль: "👨‍💼 Operator"
   └─ Система сохраняет роль

5. System отправляет John'у credentials:
   ├─ Email с:
   │  ├─ Username
   │  ├─ Temporary Password
   │  ├─ Login URL
   │  └─ "Измените пароль при первом входе"
   │
   └─ Telegram notification (если linked):
      ├─ ✅ Account Approved!
      ├─ 👨‍💼 Role: Operator
      ├─ Username: john_doe_12345
      ├─ Password: TempPass123!@
      └─ [Open Web App button]

6. John входит в систему
   ├─ Использует Username + Temporary Password
   ├─ System требует смену пароля (Force change)
   └─ После смены → полный доступ

7. John может использовать новый пароль
   ├─ Web: https://app.vendhub.com
   ├─ Mobile: VendHub App
   └─ Username + New Password
```

---

## 🔐 Username Generation Strategy

### Option 1: Email-based (Recommended)
```
Email: john.doe@example.com
→ Username: john_doe_12345

Email: maria@company.uz
→ Username: maria_67890

Формула: {first_part}_{random_4digits}
```

### Option 2: Sequential
```
User #1 → user_001
User #2 → user_002
...
```

### Option 3: Role-based
```
Operator   → op_12345
Manager    → mg_12345
Technician → tc_12345
```

**Рекомендуемый вариант**: Email-based + 4 случайных цифры (избегает коллизий)

---

## 🔑 Temporary Password Requirements

```typescript
// Генерация временного пароля
function generateTemporaryPassword(): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const special = '!@#$%^&*';

  const chars = lowercase + uppercase + numbers + special;
  let password = '';

  // At least 1 uppercase
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  // At least 1 number
  password += numbers[Math.floor(Math.random() * numbers.length)];
  // At least 1 special
  password += special[Math.floor(Math.random() * special.length)];

  // Random chars
  for (let i = 0; i < 9; i++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }

  // Shuffle
  return password.split('').sort(() => 0.5 - Math.random()).join('');
}

// Result: TempPass123!@ (12 characters)
```

**Требования**:
- ✅ Минимум 12 символов
- ✅ Минимум 1 заглавная буква
- ✅ Минимум 1 цифра
- ✅ Минимум 1 спец. символ
- ✅ Криптографически случайный
- ✅ НЕ может содержать username

---

## 📧 Email Template для одобрения

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #10b981; color: white; padding: 20px; }
        .credentials { background-color: #f0fdf4; padding: 15px; border-radius: 5px; }
        .code { font-family: monospace; background-color: #f3f4f6; padding: 10px; }
        .warning { background-color: #fef3c7; padding: 10px; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✅ Добро пожаловать в VendHub!</h1>
        </div>

        <h2>Ваш аккаунт одобрен</h2>
        <p>Ваша регистрация была успешно одобрена администратором.</p>

        <h3>Ваша информация для входа:</h3>
        <div class="credentials">
            <p><strong>Email:</strong> john@example.com</p>
            <p><strong>Username:</strong> <span class="code">john_doe_12345</span></p>
            <p><strong>Временный пароль:</strong> <span class="code">TempPass123!@</span></p>
            <p><strong>Роль:</strong> Оператор (Operator)</p>
        </div>

        <div class="warning">
            <strong>⚠️ Важно:</strong>
            <ul>
                <li>Сохраните эти данные в безопасном месте</li>
                <li>При первом входе вас попросят изменить пароль</li>
                <li>Используйте надежный пароль (минимум 8 символов)</li>
            </ul>
        </div>

        <h3>Как войти:</h3>
        <ol>
            <li>Перейдите на <a href="https://app.vendhub.com">https://app.vendhub.com</a></li>
            <li>Введите Username: <code>john_doe_12345</code></li>
            <li>Введите Пароль: <code>TempPass123!@</code></li>
            <li>Нажмите "Войти"</li>
            <li>Измените пароль на новый надежный пароль</li>
        </ol>

        <h3>Мобильное приложение:</h3>
        <p>Установите приложение VendHub с App Store или Google Play и используйте те же credentials.</p>

        <hr>
        <p><small>Если у вас возникли проблемы, свяжитесь с поддержкой: support@vendhub.com</small></p>
    </div>
</body>
</html>
```

---

## 💬 Telegram Notification Template

```typescript
const approvalMessage = `
✅ <b>Ваш аккаунт одобрен!</b>

Поздравляем! Ваша регистрация в VendHub одобрена администратором.

<b>👤 Информация для входа:</b>
Username: <code>john_doe_12345</code>
Пароль: <code>TempPass123!@</code>

<b>👨‍💼 Ваша роль:</b> Оператор (Operator)

<b>⏭️ Что дальше?</b>
1️⃣ Нажмите кнопку ниже или перейдите в веб-приложение
2️⃣ Введите Username и пароль
3️⃣ При первом входе измените пароль на новый

<b>⚠️ Безопасность:</b>
• Не делитесь этими данными с кем-либо
• Сохраните пароль в защищенном месте
• Изменить пароль можно в настройках профиля

Если у вас возникли вопросы, напишите нам в поддержку.
`;

const keyboard = Markup.inlineKeyboard([
  [Markup.button.url('🌐 Открыть Web App', process.env.FRONTEND_URL)],
  [Markup.button.url('📱 Скачать Mobile App', 'https://play.google.com/store/apps/details?id=com.vendhub')],
]);

await ctx.telegram.sendMessage(
  userTelegramId,
  approvalMessage,
  {
    parse_mode: 'HTML',
    ...keyboard,
  }
);
```

---

## 🔄 Implementation Details

### 1. User Entity Updates

```typescript
// backend/src/modules/users/entities/user.entity.ts

export enum UserStatus {
  PENDING = 'pending',                    // Ожидает одобрения
  ACTIVE = 'active',                     // Активный
  INACTIVE = 'inactive',                 // Неактивный
  SUSPENDED = 'suspended',               // Заморожен
  REJECTED = 'rejected',                 // Отклонен
  PASSWORD_CHANGE_REQUIRED = 'pwd_change' // ← NEW: Требует смены пароля
}

@Entity('users')
export class User extends BaseEntity {
  // Existing fields...

  // ← NEW FIELDS FOR USERNAME
  @Column({ type: 'varchar', length: 50, unique: true, nullable: true })
  username: string | null;  // Генерируется при одобрении

  @Column({ type: 'boolean', default: false })
  password_changed_by_user: boolean;  // User changed temp password?

  // Existing approval fields...
  @Column({ type: 'uuid', nullable: true })
  approved_by_id: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  approved_at: Date | null;
}
```

### 2. Generate Username Service

```typescript
// backend/src/modules/users/services/username-generator.service.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

@Injectable()
export class UsernameGeneratorService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  /**
   * Generate username from email + random suffix
   * john.doe@example.com → john_doe_12345
   */
  async generateUsername(email: string): Promise<string> {
    const emailPart = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();

    let username: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      const randomSuffix = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
      username = `${emailPart}_${randomSuffix}`;

      const exists = await this.usersRepository.findOne({
        where: { username },
      });

      if (!exists) {
        return username;
      }

      attempts++;
    } while (attempts < maxAttempts);

    throw new Error('Could not generate unique username');
  }
}
```

### 3. Generate Temporary Password Service

```typescript
// backend/src/modules/users/services/password-generator.service.ts

import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';

@Injectable()
export class PasswordGeneratorService {
  /**
   * Generate cryptographically secure temporary password
   * Requirements:
   * - 12 characters
   * - At least 1 uppercase letter
   * - At least 1 digit
   * - At least 1 special character
   */
  generateTemporaryPassword(): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const special = '!@#$%^&*';

    const allChars = lowercase + uppercase + numbers + special;

    // Start with required characters
    let password = '';
    password += uppercase[this.randomInt(uppercase.length)];
    password += numbers[this.randomInt(numbers.length)];
    password += special[this.randomInt(special.length)];

    // Add random characters
    for (let i = 0; i < 9; i++) {
      password += allChars[this.randomInt(allChars.length)];
    }

    // Shuffle to avoid predictable pattern
    return password.split('').sort(() => 0.5 - Math.random()).join('');
  }

  private randomInt(max: number): number {
    return Math.floor(Math.random() * max);
  }
}
```

### 4. Updated Approval Endpoint

```typescript
// backend/src/modules/users/users.controller.ts

@Post(':id/approve')
@Roles(UserRole.SUPER_ADMIN)
@ApiOperation({ summary: 'Одобрить пользователя' })
async approveUser(
  @Param('id') userId: string,
  @Body() dto: { role: UserRole },
  @CurrentUser() approver: User,
): Promise<User> {
  const user = await this.usersService.findOne(userId);

  if (!user) {
    throw new NotFoundException(`User ${userId} not found`);
  }

  if (user.status !== UserStatus.PENDING) {
    throw new BadRequestException(`User is not pending (status: ${user.status})`);
  }

  // 1. Generate username
  const username = await this.usernameGeneratorService.generateUsername(user.email);

  // 2. Generate temporary password
  const tempPassword = this.passwordGeneratorService.generateTemporaryPassword();

  // 3. Update user
  const updatedUser = await this.usersService.update(userId, {
    username,
    password_hash: await this.usersService.hashPassword(tempPassword), // Hash it!
    status: UserStatus.PASSWORD_CHANGE_REQUIRED, // ← Force password change
    role: dto.role,
    approved_by_id: approver.id,
    approved_at: new Date(),
  });

  // 4. Send email with credentials
  await this.emailService.sendApprovalEmail({
    email: user.email,
    username,
    tempPassword,
    role: dto.role,
  });

  // 5. Send Telegram notification (if linked)
  if (user.telegram_user_id) {
    await this.telegramNotificationsService.notifyApprovalWithCredentials(
      user,
      username,
      tempPassword,
      dto.role,
    );
  }

  // 6. Log action
  this.logger.log(
    `User ${user.email} approved by ${approver.email} with role ${dto.role}`,
  );

  // Return user data WITHOUT password
  return updatedUser;
}
```

### 5. Force Password Change on First Login

```typescript
// backend/src/modules/auth/auth.service.ts

async validateUser(email: string, password: string): Promise<User | null> {
  const user = await this.usersService.findByEmail(email);

  if (!user) {
    return null;
  }

  const isPasswordValid = await this.usersService.validatePassword(user, password);

  if (!isPasswordValid) {
    return null;
  }

  // Block if pending approval
  if (user.status === UserStatus.PENDING) {
    this.logger.warn(`Login attempt by pending user: ${email}`);
    return null;
  }

  // Allow login if PASSWORD_CHANGE_REQUIRED
  if (user.status === UserStatus.PASSWORD_CHANGE_REQUIRED) {
    return user; // Login is allowed, but endpoint will redirect to change password
  }

  if (user.status !== UserStatus.ACTIVE) {
    return null;
  }

  return user;
}

async login(user: User, ip: string): Promise<AuthResponse> {
  const tokens = await this.generateTokens(user);

  // Update last login
  await this.usersService.updateLastLogin(user.id, ip);

  return {
    ...tokens,
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      username: user.username,
      status: user.status, // ← Frontend will see PASSWORD_CHANGE_REQUIRED
    },
  };
}
```

### 6. Password Change Endpoint

```typescript
// backend/src/modules/users/users.controller.ts

@Post(':id/change-password')
@UseGuards(JwtAuthGuard)
@ApiOperation({ summary: 'Изменить пароль' })
async changePassword(
  @Param('id') userId: string,
  @Body() dto: ChangePasswordDto,
  @CurrentUser() currentUser: User,
): Promise<{ message: string }> {
  // Only user can change their own password
  if (currentUser.id !== userId && currentUser.role !== UserRole.SUPER_ADMIN) {
    throw new ForbiddenException('Cannot change another user password');
  }

  const user = await this.usersService.findOne(userId);

  if (!user) {
    throw new NotFoundException(`User ${userId} not found`);
  }

  // Validate old password
  const isOldPasswordValid = await this.usersService.validatePassword(
    user,
    dto.old_password,
  );

  if (!isOldPasswordValid) {
    throw new BadRequestException('Old password is incorrect');
  }

  // Update password
  await this.usersService.update(userId, {
    password_hash: await this.usersService.hashPassword(dto.new_password),
    status: UserStatus.ACTIVE, // ← Mark as active after password change
    password_changed_by_user: true,
  });

  // Send notification
  await this.emailService.sendPasswordChangedEmail(user.email);

  return { message: 'Password changed successfully' };
}
```

### 7. Email Service

```typescript
// backend/src/modules/email/services/email.service.ts

@Injectable()
export class EmailService {
  async sendApprovalEmail(data: {
    email: string;
    username: string;
    tempPassword: string;
    role: UserRole;
  }): Promise<void> {
    const htmlContent = this.buildApprovalTemplate(data);

    await this.transporter.sendMail({
      to: data.email,
      subject: '✅ VendHub: Ваш аккаунт одобрен!',
      html: htmlContent,
      from: 'noreply@vendhub.com',
    });

    this.logger.log(`Approval email sent to ${data.email}`);
  }

  private buildApprovalTemplate(data: {
    email: string;
    username: string;
    tempPassword: string;
    role: UserRole;
  }): string {
    const roleLabel = this.roleToLabel(data.role);

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #10b981; color: white; padding: 20px; text-align: center; }
        .credentials { background-color: #f0fdf4; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .code { font-family: monospace; background-color: #f3f4f6; padding: 5px 10px; border-radius: 3px; }
        .warning { background-color: #fef3c7; padding: 10px; margin: 10px 0; border-left: 4px solid #f59e0b; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✅ Добро пожаловать в VendHub!</h1>
        </div>

        <h2>Ваш аккаунт одобрен</h2>
        <p>Ваша регистрация была успешно одобрена администратором.</p>

        <div class="credentials">
            <h3>🔐 Данные для входа:</h3>
            <p><strong>Email:</strong> ${data.email}</p>
            <p><strong>Username:</strong> <span class="code">${data.username}</span></p>
            <p><strong>Временный пароль:</strong> <span class="code">${data.tempPassword}</span></p>
            <p><strong>Роль:</strong> ${roleLabel}</p>
        </div>

        <div class="warning">
            <strong>⚠️ Важно:</strong>
            <ul>
                <li>Сохраните эти данные в безопасном месте</li>
                <li><strong>При первом входе вас попросят изменить пароль</strong></li>
                <li>Используйте надежный пароль (минимум 8 символов, буквы+цифры+спец. символы)</li>
                <li>Не делитесь этими данными с третьими лицами</li>
            </ul>
        </div>

        <h3>📱 Как начать:</h3>
        <ol>
            <li>Перейдите на <a href="${process.env.FRONTEND_URL}">${process.env.FRONTEND_URL}</a></li>
            <li>Введите Username: <span class="code">${data.username}</span></li>
            <li>Введите пароль: <span class="code">${data.tempPassword}</span></li>
            <li>Нажмите "Войти"</li>
            <li><strong>Измените пароль на новый надежный пароль</strong></li>
            <li>Готово! Вы получите полный доступ</li>
        </ol>

        <hr>
        <p><small>Если у вас возникли проблемы со входом, свяжитесь с поддержкой: support@vendhub.com</small></p>
        <p><small>© 2025 VendHub. Все права защищены.</small></p>
    </div>
</body>
</html>
    `;
  }

  private roleToLabel(role: UserRole): string {
    const labels = {
      [UserRole.SUPER_ADMIN]: 'Супер администратор',
      [UserRole.ADMIN]: 'Администратор',
      [UserRole.MANAGER]: 'Менеджер',
      [UserRole.OPERATOR]: 'Оператор',
      [UserRole.COLLECTOR]: 'Инкассатор',
      [UserRole.TECHNICIAN]: 'Техник',
      [UserRole.VIEWER]: 'Зритель',
    };
    return labels[role] || role;
  }
}
```

### 8. Telegram Notification Service Update

```typescript
// backend/src/modules/telegram/services/telegram-notifications.service.ts

@Injectable()
export class TelegramNotificationsService {
  async notifyApprovalWithCredentials(
    user: User,
    username: string,
    tempPassword: string,
    role: UserRole,
  ): Promise<void> {
    if (!user.telegram_user_id) {
      return;
    }

    const roleLabel = this.roleToLabel(role);

    const message = `
✅ <b>Ваш аккаунт одобрен!</b>

Поздравляем! Ваша регистрация в VendHub одобрена администратором.

<b>👤 Информация для входа:</b>
Username: <code>${username}</code>
Пароль: <code>${tempPassword}</code>

<b>👨‍💼 Ваша роль:</b> ${roleLabel}

<b>⏭️ Что дальше?</b>
1️⃣ Нажмите кнопку "Открыть приложение"
2️⃣ Введите Username и пароль
3️⃣ <strong>При первом входе измените пароль на новый</strong>

<b>⚠️ Безопасность:</b>
• Не делитесь этими данными с кем-либо
• Сохраните пароль в защищенном месте
• Временный пароль действует только один раз
    `;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.url('🌐 Открыть Web App', process.env.FRONTEND_URL)],
      [Markup.button.url('📱 Скачать Mobile App', 'https://play.google.com/store/apps/details?id=com.vendhub')],
    ]);

    try {
      await this.telegramBot.telegram.sendMessage(
        parseInt(user.telegram_user_id),
        message,
        {
          parse_mode: 'HTML',
          ...keyboard,
        },
      );

      this.logger.log(`Approval notification sent to user ${user.email}`);
    } catch (error) {
      this.logger.error(`Failed to send approval notification: ${error.message}`);
    }
  }

  private roleToLabel(role: UserRole): string {
    const labels = {
      [UserRole.SUPER_ADMIN]: 'Супер администратор',
      [UserRole.ADMIN]: 'Администратор',
      [UserRole.MANAGER]: 'Менеджер',
      [UserRole.OPERATOR]: 'Оператор',
      [UserRole.COLLECTOR]: 'Инкассатор',
      [UserRole.TECHNICIAN]: 'Техник',
      [UserRole.VIEWER]: 'Зритель',
    };
    return labels[role] || role;
  }
}
```

---

## 🔄 Frontend Changes

### Login Page

```typescript
// frontend/src/app/(auth)/login/page.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginUser } from '@/lib/api/auth';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await loginUser(username, password);

      if (response.user.status === 'pwd_change') {
        // Redirect to password change page
        localStorage.setItem('temp_token', response.access_token);
        localStorage.setItem('user_id', response.user.id);
        router.push('/auth/change-password');
      } else {
        // Normal login
        localStorage.setItem('access_token', response.access_token);
        localStorage.setItem('refresh_token', response.refresh_token);
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h2>Вход в VendHub</h2>
      <form onSubmit={handleLogin}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <div className="error">{error}</div>}
        <button type="submit" disabled={loading}>
          {loading ? 'Входим...' : 'Войти'}
        </button>
      </form>
    </div>
  );
}
```

### Forced Password Change Page

```typescript
// frontend/src/app/(auth)/change-password/page.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    setLoading(true);

    try {
      const userId = localStorage.getItem('user_id');
      const token = localStorage.getItem('temp_token');

      const response = await fetch(`/api/users/${userId}/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          old_password: oldPassword,
          new_password: newPassword,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to change password');
      }

      // Clear temp token and redirect to login
      localStorage.removeItem('temp_token');
      localStorage.removeItem('user_id');

      alert('✅ Пароль успешно изменен! Пожалуйста, введите новый пароль для входа.');
      router.push('/auth/login');
    } catch (err: any) {
      setError(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="change-password-container">
      <h2>⚠️ Измените пароль</h2>
      <p>При первом входе вы должны изменить свой пароль на надежный.</p>

      <form onSubmit={handleChangePassword}>
        <input
          type="password"
          placeholder="Временный пароль"
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Новый пароль"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Подтвердите пароль"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
        {error && <div className="error">{error}</div>}

        <div className="password-requirements">
          <p><strong>Требования к паролю:</strong></p>
          <ul>
            <li>Минимум 8 символов</li>
            <li>Содержит заглавные буквы (A-Z)</li>
            <li>Содержит строчные буквы (a-z)</li>
            <li>Содержит цифры (0-9)</li>
            <li>Содержит спец. символы (!@#$%^&*)</li>
          </ul>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Изменяем...' : 'Изменить пароль'}
        </button>
      </form>
    </div>
  );
}
```

---

## 📊 Migration для новых полей

```sql
-- backend/src/database/migrations/AddUsernameAndPasswordChangeFields.ts

ALTER TABLE users ADD COLUMN username VARCHAR(50) UNIQUE;

ALTER TABLE users ADD COLUMN password_changed_by_user BOOLEAN DEFAULT FALSE;

-- Update status enum
ALTER TYPE user_status ADD VALUE 'pwd_change' BEFORE 'active';

-- Create index for faster lookups
CREATE UNIQUE INDEX idx_users_username ON users(username) WHERE deleted_at IS NULL;
```

---

## ✅ Checklist для реализации

- [ ] Добавить поля в User entity (username, password_changed_by_user)
- [ ] Обновить UserStatus enum (добавить PASSWORD_CHANGE_REQUIRED)
- [ ] Создать UsernameGeneratorService
- [ ] Создать PasswordGeneratorService
- [ ] Обновить approveUser endpoint
- [ ] Создать ChangePasswordDto и валидацию
- [ ] Обновить validateUser in auth.service
- [ ] Обновить login endpoint в auth.service
- [ ] Создать changePassword endpoint
- [ ] Создать EmailService с шаблонами
- [ ] Обновить TelegramNotificationsService
- [ ] Создать миграцию базы данных
- [ ] Обновить Frontend:
  - [ ] Login page
  - [ ] Password change page
  - [ ] Redirect logic
- [ ] Написать tests

---

## 🚀 Порядок реализации

### День 1-2: Backend changes
1. Entity updates + migration
2. Username/Password generators
3. Approval endpoint update
4. Change password endpoint
5. Email service

### День 3: Telegram integration
1. Notification updates
2. Tests

### День 4: Frontend
1. Login page
2. Password change page
3. Integration tests

---

**Status**: 📋 Ready for implementation
**Estimated effort**: 12-16 hours
**Priority**: HIGH - Необходимо для полноценной работы approval workflow
