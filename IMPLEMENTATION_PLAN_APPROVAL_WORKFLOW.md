# VendHub: Полный план реализации
**Approval Workflow + Code Review Fixes**

> **Super Admin**: @Jamshiddin (Telegram ID: 42283329)
> **Status**: 🚨 In Development
> **ETA**: 4 недели

---

## 📋 Этапы реализации

### ЭТАП 1: Критические исправления безопасности (WEEK 1)
### ЭТАП 2: Система одобрения регистраций (WEEK 2)
### ЭТАП 3: Telegram Integration (WEEK 3)
### ЭТАП 4: Тестирование & Deploy (WEEK 4)

---

# ЭТАП 1: КРИТИЧЕСКИЕ ИСПРАВЛЕНИЯ БЕЗОПАСНОСТИ

## 1.1 Добавить Authorization Guards везде

### Dictionaries Controller
```typescript
// backend/src/modules/dictionaries/dictionaries.controller.ts

@Controller('dictionaries')
@UseGuards(JwtAuthGuard, RolesGuard)  // ← ADD THIS
export class DictionariesController {
  @Post()
  @Roles('ADMIN', 'SUPER_ADMIN')  // ← ADD THIS
  create(@Body() createDictionaryDto: CreateDictionaryDto) { ... }

  @Get()
  @Roles('ADMIN', 'SUPER_ADMIN', 'MANAGER', 'OPERATOR')  // ← ADD READ ROLE
  findAll() { ... }

  @Patch(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  update(@Param('id') id: string, @Body() dto) { ... }

  @Delete(':id')
  @Roles('SUPER_ADMIN')  // ← Only super admin can delete
  remove(@Param('id') id: string) { ... }
}
```

### Telegram Settings Controller
```typescript
// backend/src/modules/telegram/controllers/telegram-settings.controller.ts

@Controller('telegram/settings')
@UseGuards(JwtAuthGuard, RolesGuard)  // ← ADD THIS
export class TelegramSettingsController {
  @Put()
  @Roles('SUPER_ADMIN')  // ← Only super admin can change bot token
  async updateSettings(@Body() dto: UpdateTelegramSettingsDto) { ... }
}
```

### Users Controller
```typescript
// backend/src/modules/users/users.controller.ts

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)  // ← ADD THIS
export class UsersController {
  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN')  // ← Only admin can create users
  create(@Body() createUserDto: CreateUserDto) { ... }

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN')  // ← Only admins can list
  findAll() { ... }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  findOne(@Param('id') id: string) { ... }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  update(@Param('id') id: string, @Body() dto) { ... }

  @Delete(':id')
  @Roles('SUPER_ADMIN')
  remove(@Param('id') id: string) { ... }
}
```

**Время**: 2 часа
**Проверка**:
```bash
# Без токена - должно быть 401
curl http://localhost:3000/users

# С токеном оператора - должно быть 403
curl -H "Authorization: Bearer $OPERATOR_TOKEN" \
  -X POST http://localhost:3000/users
```

---

## 1.2 Криптографически защищённые коды верификации

### telegram-users.service.ts
```typescript
import { randomBytes } from 'crypto';
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TelegramUser } from '../entities/telegram-user.entity';

@Injectable()
export class TelegramUsersService {
  constructor(
    @InjectRepository(TelegramUser)
    private readonly telegramUserRepository: Repository<TelegramUser>,
    private readonly redis: RedisService,  // Add Redis
  ) {}

  /**
   * Generate cryptographically secure 12-character hex code (6 bytes)
   */
  private generateVerificationCode(): string {
    return randomBytes(6).toString('hex').toUpperCase();
  }

  /**
   * Generate code for account linking with rate limiting
   */
  async generateVerificationCode(
    telegramId: string,
    userId: string,
  ): Promise<{ code: string; expiresIn: number }> {
    // Check rate limiting: max 3 code generations per hour
    const generationCount = await this.redis.get(`code_gen:${telegramId}`);
    if (generationCount && parseInt(generationCount) >= 3) {
      throw new BadRequestException(
        'Too many code generation attempts. Try again in 1 hour.',
      );
    }

    // Generate secure code
    const code = this.generateVerificationCode();

    // Save with 15-minute expiration
    await this.telegramUserRepository.update(
      { telegram_id: telegramId },
      {
        verification_code: code,
        code_generated_at: new Date(),
      },
    );

    // Increment rate limit counter
    const currentCount = await this.redis.get(`code_gen:${telegramId}`);
    await this.redis.incr(`code_gen:${telegramId}`);
    await this.redis.expire(`code_gen:${telegramId}`, 3600); // 1 hour

    return {
      code,
      expiresIn: 900, // 15 minutes in seconds
    };
  }

  /**
   * Verify code with rate limiting and expiration
   */
  async linkTelegramAccount(
    telegramId: string,
    verificationCode: string,
  ): Promise<TelegramUser> {
    // Rate limiting: max 5 verification attempts per 15 minutes
    const attempts = await this.redis.get(`verify_attempts:${telegramId}`);
    if (attempts && parseInt(attempts) >= 5) {
      throw new BadRequestException(
        'Too many verification attempts. Try again in 15 minutes.',
      );
    }

    // Find telegram user
    const telegramUser = await this.telegramUserRepository.findOne({
      where: { telegram_id: telegramId },
    });

    if (!telegramUser || telegramUser.verification_code !== verificationCode) {
      await this.redis.incr(`verify_attempts:${telegramId}`);
      await this.redis.expire(`verify_attempts:${telegramId}`, 900); // 15 min
      throw new BadRequestException('Invalid or expired code');
    }

    // Check code expiration (15 minutes)
    const codeAge = Date.now() - telegramUser.code_generated_at.getTime();
    if (codeAge > 15 * 60 * 1000) {
      throw new BadRequestException('Code expired. Generate a new one.');
    }

    // Mark as verified
    telegramUser.is_verified = true;
    telegramUser.verification_code = null;
    await this.telegramUserRepository.save(telegramUser);

    // Clear rate limiting
    await this.redis.del(`verify_attempts:${telegramId}`);

    return telegramUser;
  }
}
```

**Время**: 3 часа

---

## 1.3 Транзакционные обновления Task State

### telegram-bot.service.ts
```typescript
import { DataSource } from 'typeorm';

@Injectable()
export class TelegramBotService {
  constructor(
    private readonly dataSource: DataSource,  // ← ADD THIS
    private readonly tasksService: TasksService,
    // ... other dependencies
  ) {}

  /**
   * Update execution state with transaction and lock
   */
  private async updateExecutionState(
    taskId: string,
    state: TaskExecutionState,
  ): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Read with exclusive lock
      const task = await queryRunner.manager.findOne(Task, {
        where: { id: taskId },
        lock: { mode: 'pessimistic_write' },  // ← CRITICAL: Prevent concurrent updates
      });

      if (!task) {
        throw new NotFoundException(`Task ${taskId} not found`);
      }

      // Update within transaction
      const metadata = task.metadata || {};
      metadata.telegram_execution_state = {
        ...state,
        last_interaction_at: new Date().toISOString(),
      };

      task.metadata = metadata;
      await queryRunner.manager.save(task);

      // Commit atomically
      await queryRunner.commitTransaction();
      this.logger.log(`Updated task state for ${taskId}`);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Transaction failed for ${taskId}: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
```

**Время**: 4 часа

---

## 1.4 Валидация photo uploads

### telegram-bot.service.ts
```typescript
private async validateAndUploadPhoto(
  fileLink: any,
  taskId: string,
  userId: string,
  category: string,
): Promise<void> {
  const MAX_FILE_SIZE = 5_000_000; // 5MB
  const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(fileLink.href, {
      signal: controller.signal,
      timeout: 30000,
    });

    if (!response.ok) {
      throw new BadRequestException(`Download failed: HTTP ${response.status}`);
    }

    // 1. Validate MIME type
    const contentType = response.headers.get('content-type');
    if (!contentType || !ALLOWED_MIMES.includes(contentType)) {
      throw new BadRequestException(`Invalid file type: ${contentType}`);
    }

    // 2. Check size before reading
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File too large: ${contentLength} bytes (max: ${MAX_FILE_SIZE})`,
      );
    }

    // 3. Read and validate buffer
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File too large: ${buffer.length} bytes (max: ${MAX_FILE_SIZE})`,
      );
    }

    // 4. Verify task ownership
    const task = await this.tasksService.findOne(taskId);
    if (!task) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }

    if (task.assigned_to_user_id !== userId) {
      throw new ForbiddenException('Not assigned to this task');
    }

    if (task.status !== TaskStatus.IN_PROGRESS) {
      throw new BadRequestException(
        `Task must be in progress (current: ${task.status})`,
      );
    }

    // 5. Upload file
    await this.filesService.uploadFile({
      file: {
        buffer,
        originalname: `photo_${taskId}_${Date.now()}.jpg`,
        mimetype: contentType,
        size: buffer.length,
      } as any,
      category,
      user_id: userId,
      task_id: taskId,
    });
  } catch (error) {
    this.logger.error(`Photo upload failed: ${error.message}`);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
```

**Время**: 3 часа

---

## ИТОГО ЭТАП 1: ~12 часов

✅ Authorization guards везде
✅ Криптографически защищённые коды
✅ Транзакционные обновления
✅ Валидация photo uploads

---

# ЭТАП 2: СИСТЕМА ОДОБРЕНИЯ РЕГИСТРАЦИЙ

## 2.1 Расширить User Entity

### user.entity.ts
```typescript
export enum UserStatus {
  PENDING = 'pending',        // ← NEW: Awaiting approval
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  REJECTED = 'rejected',      // ← NEW: Rejected during signup
}

@Entity('users')
@Index(['email'], { unique: true })
@Index(['phone'], { unique: true, where: 'phone IS NOT NULL' })
@Index(['telegram_user_id'], { unique: true, where: 'telegram_user_id IS NOT NULL' })
@Index(['status'])                    // ← NEW: For pending users queries
@Index(['created_at', 'status'])      // ← NEW: For sorted pending list
export class User extends BaseEntity {
  // ... existing fields ...

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.PENDING,  // ← CHANGED: Default to pending
  })
  status: UserStatus;

  // ← NEW FIELDS FOR APPROVAL
  @Column({ type: 'uuid', nullable: true })
  approved_by_id: string | null;  // Super admin who approved

  @Column({ type: 'timestamp with time zone', nullable: true })
  approved_at: Date | null;  // When approved

  @Column({ type: 'text', nullable: true })
  rejection_reason: string | null;  // Why rejected (if rejected)

  @Column({ type: 'timestamp with time zone', nullable: true })
  rejected_at: Date | null;  // When rejected

  @Column({ type: 'uuid', nullable: true })
  rejected_by_id: string | null;  // Who rejected

  // Relationship
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'approved_by_id' })
  approved_by: User | null;
}
```

**Миграция**:
```bash
npm run migration:generate -- -n AddApprovalFieldsToUsers
```

**Содержание миграции**:
```typescript
import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

export class AddApprovalFieldsToUsers1699000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new columns
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'approved_by_id',
        type: 'uuid',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'approved_at',
        type: 'timestamp with time zone',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'rejection_reason',
        type: 'text',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'rejected_at',
        type: 'timestamp with time zone',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'rejected_by_id',
        type: 'uuid',
        isNullable: true,
      }),
    );

    // Update default status from active to pending
    await queryRunner.query(
      `ALTER TABLE users ALTER COLUMN status SET DEFAULT 'pending'`,
    );

    // Add indexes
    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'idx_users_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'idx_users_created_status',
        columnNames: ['created_at', 'status'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('users', 'idx_users_created_status');
    await queryRunner.dropIndex('users', 'idx_users_status');
    await queryRunner.dropColumn('users', 'rejected_by_id');
    await queryRunner.dropColumn('users', 'rejected_at');
    await queryRunner.dropColumn('users', 'rejection_reason');
    await queryRunner.dropColumn('users', 'approved_at');
    await queryRunner.dropColumn('users', 'approved_by_id');
  }
}
```

**Время**: 2 часа

---

## 2.2 Изменить Registration Flow

### auth.service.ts
```typescript
/**
 * Регистрация создаёт пользователя в статусе PENDING
 * Пользователь будет активирован после одобрения super admin
 */
async register(registerDto: RegisterDto): Promise<{ message: string; user_id: string }> {
  // Check if user already exists
  const existing = await this.usersService.findByEmail(registerDto.email);
  if (existing) {
    throw new ConflictException('Email already registered');
  }

  // Create user with PENDING status
  const user = await this.usersService.create({
    ...registerDto,
    role: UserRole.OPERATOR,
    status: UserStatus.PENDING,  // ← IMPORTANT: Not active yet
  });

  // Notify super admin in Telegram
  await this.telegramNotificationsService.notifyNewUserRegistration(user);

  return {
    message: 'Registration successful. Please wait for admin approval.',
    user_id: user.id,
  };
}

/**
 * Логин проверяет не только статус ACTIVE, но и проверяет PENDING
 */
async validateUser(email: string, password: string): Promise<User | null> {
  const user = await this.usersService.findByEmail(email);

  if (!user) {
    return null;
  }

  const isPasswordValid = await this.usersService.validatePassword(user, password);

  if (!isPasswordValid) {
    return null;
  }

  // Block login if not active or pending
  if (user.status === UserStatus.PENDING) {
    // Don't throw error - just return null, with logging
    this.logger.warn(`Login attempt by pending user: ${email}`);
    return null;
  }

  if (user.status !== UserStatus.ACTIVE) {
    return null;
  }

  return user;
}
```

### auth.controller.ts
```typescript
@Post('register')
@ApiOperation({ summary: 'Регистрация нового пользователя (требует одобрения)' })
@ApiResponse({
  status: 201,
  description: 'Успешная регистрация. Ожидание одобрения администратора.',
})
async register(
  @Body() registerDto: RegisterDto,
): Promise<{ message: string; user_id: string }> {
  return this.authService.register(registerDto);
}
```

**Время**: 1 час

---

## 2.3 Создать Approval Endpoints

### users.controller.ts
```typescript
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly telegramNotificationsService: TelegramNotificationsService,
  ) {}

  /**
   * Получить список пользователей в ожидании одобрения
   */
  @Get('pending-approvals')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Список пользователей в ожидании одобрения' })
  async getPendingApprovals(): Promise<User[]> {
    return this.usersService.findByStatus(UserStatus.PENDING);
  }

  /**
   * Одобрить пользователя и назначить роль
   */
  @Post(':id/approve')
  @Roles('SUPER_ADMIN')  // Only super admin can approve
  @ApiOperation({ summary: 'Одобрить пользователя' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        role: {
          type: 'string',
          enum: Object.values(UserRole),
          description: 'Роль для пользователя',
        },
      },
      required: ['role'],
    },
  })
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
      throw new BadRequestException(
        `User is not pending approval (status: ${user.status})`,
      );
    }

    // Update user
    const updatedUser = await this.usersService.update(userId, {
      status: UserStatus.ACTIVE,
      role: dto.role,
      approved_by_id: approver.id,
      approved_at: new Date(),
    });

    // Notify user in Telegram
    await this.telegramNotificationsService.notifyUserApproved(
      updatedUser,
      dto.role,
    );

    this.logger.log(
      `User ${updatedUser.email} approved by ${approver.email} with role ${dto.role}`,
    );

    return updatedUser;
  }

  /**
   * Отклонить пользователя
   */
  @Post(':id/reject')
  @Roles('SUPER_ADMIN')  // Only super admin can reject
  @ApiOperation({ summary: 'Отклонить пользователя' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description: 'Причина отклонения',
        },
      },
      required: ['reason'],
    },
  })
  async rejectUser(
    @Param('id') userId: string,
    @Body() dto: { reason: string },
    @CurrentUser() rejector: User,
  ): Promise<User> {
    const user = await this.usersService.findOne(userId);

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    if (user.status !== UserStatus.PENDING) {
      throw new BadRequestException(
        `User is not pending approval (status: ${user.status})`,
      );
    }

    // Update user
    const updatedUser = await this.usersService.update(userId, {
      status: UserStatus.REJECTED,
      rejection_reason: dto.reason,
      rejected_by_id: rejector.id,
      rejected_at: new Date(),
    });

    // Notify user in Telegram
    await this.telegramNotificationsService.notifyUserRejected(
      updatedUser,
      dto.reason,
    );

    this.logger.log(
      `User ${updatedUser.email} rejected by ${rejector.email}: ${dto.reason}`,
    );

    return updatedUser;
  }

  /**
   * Получить пользователя (с информацией об одобрении)
   */
  @Get(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async findOne(@Param('id') id: string): Promise<User> {
    const user = await this.usersService.findOne(id);

    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    return user;
  }

  // ... existing methods ...
}
```

### users.service.ts
```typescript
/**
 * Find users by status
 */
async findByStatus(status: UserStatus): Promise<User[]> {
  return this.usersRepository.find({
    where: { status },
    order: { created_at: 'DESC' },
    relations: ['approved_by'],
  });
}

/**
 * Get pending approvals count
 */
async getPendingCount(): Promise<number> {
  return this.usersRepository.count({
    where: { status: UserStatus.PENDING },
  });
}
```

**Время**: 3 часа

---

## ИТОГО ЭТАП 2: ~6 часов

✅ Расширить User Entity с полями одобрения
✅ Изменить registration flow (PENDING status)
✅ Создать approval endpoints
✅ Уведомления в Telegram

---

# ЭТАП 3: TELEGRAM INTEGRATION

## 3.1 Telegram Commands для Super Admin

### telegram-bot.service.ts
```typescript
export class TelegramBotService implements OnModuleInit, OnModuleDestroy {
  // Super admin Telegram ID
  private readonly SUPER_ADMIN_TELEGRAM_ID = '42283329';

  async setupCommands(): Promise<void> {
    // Existing commands...

    // ← NEW: Approval commands (only for super admin)
    this.bot!.command('pending_users', async (ctx) => {
      await this.handlePendingUsers(ctx);
    });

    this.bot!.command('approve_user', async (ctx) => {
      await this.handleApproveUser(ctx);
    });

    this.bot!.command('reject_user', async (ctx) => {
      await this.handleRejectUser(ctx);
    });
  }

  /**
   * Show pending user registrations
   * /pending_users - List all pending
   * /pending_users 5 - Show 5 most recent
   */
  private async handlePendingUsers(ctx: BotContext): Promise<void> {
    // Check if user is super admin
    if (ctx.from.id.toString() !== this.SUPER_ADMIN_TELEGRAM_ID) {
      await ctx.reply('❌ Only super admin can access this command');
      return;
    }

    const limit = parseInt(ctx.args?.[0] || '10', 10);

    try {
      const pending = await this.usersService.findByStatus(UserStatus.PENDING);
      const recentPending = pending.slice(0, limit);

      if (recentPending.length === 0) {
        await ctx.reply('✅ No pending approvals');
        return;
      }

      // Build message with inline buttons
      let message = `<b>👥 Pending User Registrations (${pending.length} total):</b>\n\n`;

      for (let i = 0; i < recentPending.length; i++) {
        const user = recentPending[i];
        const index = i + 1;

        message += `${index}. <b>${user.full_name}</b>\n`;
        message += `   📧 ${user.email}\n`;
        message += `   📱 ${user.phone || 'N/A'}\n`;
        message += `   📅 ${user.created_at.toLocaleDateString()}\n`;
        message += `   🆔 <code>${user.id}</code>\n\n`;
      }

      // Inline buttons for first pending user
      if (recentPending.length > 0) {
        const user = recentPending[0];
        const keyboard = Markup.inlineKeyboard([
          [
            Markup.button.callback(
              '✅ Approve',
              `approve_user_${user.id}`,
            ),
            Markup.button.callback(
              '❌ Reject',
              `reject_user_${user.id}`,
            ),
          ],
        ]);

        await ctx.reply(message, {
          parse_mode: 'HTML',
          ...keyboard,
        });
      } else {
        await ctx.reply(message, { parse_mode: 'HTML' });
      }
    } catch (error) {
      this.logger.error(`Error in pending users: ${error.message}`);
      await ctx.reply('❌ Error fetching pending users');
    }
  }

  /**
   * Approve user callback
   * approve_user_<user_id>
   */
  private async handleApproveUserCallback(
    ctx: BotContext,
    userId: string,
  ): Promise<void> {
    if (ctx.from.id.toString() !== this.SUPER_ADMIN_TELEGRAM_ID) {
      await ctx.answerCbQuery('❌ Only super admin can approve users', {
        show_alert: true,
      });
      return;
    }

    try {
      const user = await this.usersService.findOne(userId);

      if (!user) {
        await ctx.answerCbQuery('❌ User not found');
        return;
      }

      if (user.status !== UserStatus.PENDING) {
        await ctx.answerCbQuery(`❌ User is not pending (${user.status})`);
        return;
      }

      // Show role selection buttons
      const keyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback('👨‍💼 Operator', `role_operator_${userId}`),
          Markup.button.callback('📊 Manager', `role_manager_${userId}`),
        ],
        [
          Markup.button.callback('👨‍🔧 Technician', `role_technician_${userId}`),
          Markup.button.callback('💰 Collector', `role_collector_${userId}`),
        ],
        [
          Markup.button.callback(
            '🚫 Cancel',
            `cancel_approval_${userId}`,
          ),
        ],
      ]);

      await ctx.reply(
        `<b>Select role for ${user.full_name} (${user.email})</b>`,
        {
          parse_mode: 'HTML',
          ...keyboard,
        },
      );

      await ctx.answerCbQuery();
    } catch (error) {
      this.logger.error(`Error approving user: ${error.message}`);
      await ctx.answerCbQuery('❌ Error processing approval');
    }
  }

  /**
   * Role selection callback
   * role_<role>_<user_id>
   */
  private async handleRoleSelection(
    ctx: BotContext,
    role: UserRole,
    userId: string,
  ): Promise<void> {
    if (ctx.from.id.toString() !== this.SUPER_ADMIN_TELEGRAM_ID) {
      await ctx.answerCbQuery('❌ Only super admin', { show_alert: true });
      return;
    }

    try {
      const superAdmin = await this.usersService.findByTelegramId(
        this.SUPER_ADMIN_TELEGRAM_ID,
      );

      if (!superAdmin) {
        await ctx.answerCbQuery(
          '❌ Super admin user not found in system',
        );
        return;
      }

      // Approve via API
      const approvedUser = await this.usersService.update(userId, {
        status: UserStatus.ACTIVE,
        role: role,
        approved_by_id: superAdmin.id,
        approved_at: new Date(),
      });

      // Update message
      await ctx.editMessageText(
        `✅ <b>User Approved</b>\n\n` +
        `👤 ${approvedUser.full_name}\n` +
        `📧 ${approvedUser.email}\n` +
        `👨‍💼 Role: <b>${role}</b>\n` +
        `✅ Approved by: @${ctx.from.username || 'SuperAdmin'}\n` +
        `📅 ${new Date().toLocaleString()}`,
        {
          parse_mode: 'HTML',
        },
      );

      // Notify user via Telegram if linked
      if (approvedUser.telegram_user_id) {
        await ctx.telegram.sendMessage(
          parseInt(approvedUser.telegram_user_id),
          `✅ <b>Your account has been approved!</b>\n\n` +
          `👨‍💼 Role: <b>${role}</b>\n` +
          `You can now login to the system.`,
          { parse_mode: 'HTML' },
        );
      }

      await ctx.answerCbQuery(`✅ User approved with role ${role}`);
      this.logger.log(
        `User ${approvedUser.email} approved with role ${role}`,
      );
    } catch (error) {
      this.logger.error(`Error selecting role: ${error.message}`);
      await ctx.answerCbQuery('❌ Error processing role selection');
    }
  }

  /**
   * Reject user callback
   * reject_user_<user_id>
   */
  private async handleRejectUserCallback(
    ctx: BotContext,
    userId: string,
  ): Promise<void> {
    if (ctx.from.id.toString() !== this.SUPER_ADMIN_TELEGRAM_ID) {
      await ctx.answerCbQuery('❌ Only super admin', { show_alert: true });
      return;
    }

    try {
      // Save user ID in session for next input
      await ctx.scene.enter('reject_reason', { user_id: userId });
    } catch (error) {
      this.logger.error(`Error initiating reject: ${error.message}`);
      await ctx.answerCbQuery('❌ Error');
    }
  }

  /**
   * Scene for entering rejection reason
   */
  private setupRejectReasonScene(): void {
    const scene = new Scenes.BaseScene('reject_reason');

    scene.on('message', async (ctx) => {
      if (ctx.from.id.toString() !== this.SUPER_ADMIN_TELEGRAM_ID) {
        await ctx.reply('❌ Unauthorized');
        return;
      }

      const reason = ctx.message.text;
      const userId = ctx.scene.state.user_id;

      try {
        const superAdmin = await this.usersService.findByTelegramId(
          this.SUPER_ADMIN_TELEGRAM_ID,
        );

        const rejectedUser = await this.usersService.update(userId, {
          status: UserStatus.REJECTED,
          rejection_reason: reason,
          rejected_by_id: superAdmin.id,
          rejected_at: new Date(),
        });

        await ctx.reply(
          `✅ <b>User Rejected</b>\n\n` +
          `👤 ${rejectedUser.full_name}\n` +
          `📧 ${rejectedUser.email}\n` +
          `📝 Reason: ${reason}`,
          { parse_mode: 'HTML' },
        );

        // Notify user
        if (rejectedUser.telegram_user_id) {
          await ctx.telegram.sendMessage(
            parseInt(rejectedUser.telegram_user_id),
            `❌ <b>Your registration was rejected</b>\n\n` +
            `Reason: ${reason}\n\n` +
            `Please contact support for more information.`,
            { parse_mode: 'HTML' },
          );
        }

        await ctx.scene.leave();
      } catch (error) {
        await ctx.reply(`❌ Error: ${error.message}`);
      }
    });

    this.sceneManager.register(scene);
  }

  /**
   * Register all callbacks
   */
  async setupCallbacks(): Promise<void> {
    // Approve user
    this.bot!.action(/approve_user_(.+)/, async (ctx) => {
      await this.handleApproveUserCallback(ctx, ctx.match[1]);
    });

    // Role selection
    this.bot!.action(/role_(\w+)_(.+)/, async (ctx) => {
      await this.handleRoleSelection(ctx, ctx.match[1] as UserRole, ctx.match[2]);
    });

    // Reject user
    this.bot!.action(/reject_user_(.+)/, async (ctx) => {
      await this.handleRejectUserCallback(ctx, ctx.match[1]);
    });

    // Cancel approval
    this.bot!.action(/cancel_approval_(.+)/, async (ctx) => {
      await ctx.editMessageText('❌ Approval cancelled');
      await ctx.answerCbQuery();
    });
  }
}
```

**Время**: 6 часов

---

## 3.2 Telegram Notifications

### telegram-notifications.service.ts
```typescript
/**
 * Notify super admin of new user registration
 */
async notifyNewUserRegistration(user: User): Promise<void> {
  try {
    const message =
      `<b>📝 New User Registration</b>\n\n` +
      `👤 ${user.full_name}\n` +
      `📧 ${user.email}\n` +
      `📱 ${user.phone || 'N/A'}\n` +
      `📅 ${user.created_at.toLocaleString()}\n\n` +
      `<i>Use /pending_users command to review and approve</i>`;

    await this.telegramBot.telegram.sendMessage(
      parseInt(process.env.SUPER_ADMIN_TELEGRAM_ID || '42283329'),
      message,
      { parse_mode: 'HTML' },
    );
  } catch (error) {
    this.logger.error(`Failed to notify super admin: ${error.message}`);
  }
}

/**
 * Notify user that they were approved
 */
async notifyUserApproved(user: User, role: UserRole): Promise<void> {
  if (!user.telegram_user_id) {
    return;
  }

  try {
    const message =
      `<b>✅ Account Approved!</b>\n\n` +
      `Your account has been successfully approved.\n\n` +
      `👨‍💼 Role: <b>${role}</b>\n` +
      `You can now login to the system.\n\n` +
      `📱 Open app or visit: ${process.env.FRONTEND_URL}`;

    await this.telegramBot.telegram.sendMessage(
      parseInt(user.telegram_user_id),
      message,
      { parse_mode: 'HTML' },
    );
  } catch (error) {
    this.logger.error(`Failed to notify user approval: ${error.message}`);
  }
}

/**
 * Notify user that they were rejected
 */
async notifyUserRejected(user: User, reason: string): Promise<void> {
  if (!user.telegram_user_id) {
    return;
  }

  try {
    const message =
      `<b>❌ Registration Rejected</b>\n\n` +
      `Your registration was not approved.\n\n` +
      `📝 Reason: ${reason}\n\n` +
      `Please contact support for more information.`;

    await this.telegramBot.telegram.sendMessage(
      parseInt(user.telegram_user_id),
      message,
      { parse_mode: 'HTML' },
    );
  } catch (error) {
    this.logger.error(`Failed to notify user rejection: ${error.message}`);
  }
}
```

**Время**: 2 часа

---

## ИТОГО ЭТАП 3: ~8 часов

✅ Telegram commands for super admin
✅ Role selection buttons
✅ Rejection with reason
✅ User notifications

---

# ЭТАП 4: ТЕСТИРОВАНИЕ & DEPLOY

## 4.1 Unit Tests

```typescript
// users.service.spec.ts
describe('UserService - Approval Workflow', () => {
  let service: UsersService;

  beforeEach(async () => {
    // Setup...
  });

  describe('findByStatus', () => {
    it('should return pending users ordered by creation date', async () => {
      const pending = await service.findByStatus(UserStatus.PENDING);
      expect(pending).toHaveLength(3);
      expect(pending[0].created_at).toBeGreaterThan(pending[1].created_at);
    });
  });

  describe('approval', () => {
    it('should approve user and set approved_by_id', async () => {
      const user = await service.update(userId, {
        status: UserStatus.ACTIVE,
        role: UserRole.OPERATOR,
        approved_by_id: adminId,
        approved_at: new Date(),
      });

      expect(user.status).toBe(UserStatus.ACTIVE);
      expect(user.approved_by_id).toBe(adminId);
      expect(user.approved_at).toBeDefined();
    });

    it('should reject user with reason', async () => {
      const user = await service.update(userId, {
        status: UserStatus.REJECTED,
        rejection_reason: 'Invalid phone number',
        rejected_by_id: adminId,
        rejected_at: new Date(),
      });

      expect(user.status).toBe(UserStatus.REJECTED);
      expect(user.rejection_reason).toBe('Invalid phone number');
    });
  });

  describe('login with pending status', () => {
    it('should not allow login if user status is PENDING', async () => {
      const result = await authService.validateUser(
        'pending@test.com',
        'password',
      );
      expect(result).toBeNull();
    });

    it('should allow login if user status is ACTIVE', async () => {
      const result = await authService.validateUser(
        'active@test.com',
        'password',
      );
      expect(result).toBeDefined();
    });
  });
});
```

**Время**: 4 часа

---

## 4.2 Integration Tests

```typescript
// approval.e2e.spec.ts
describe('User Approval Workflow (E2E)', () => {
  it('1. User registers -> status is PENDING', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send(validRegistrationDto);

    expect(response.status).toBe(201);
    expect(response.body.message).toContain('approval');

    const user = await usersService.findOne(response.body.user_id);
    expect(user.status).toBe(UserStatus.PENDING);
  });

  it('2. User cannot login while PENDING', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: pendingUser.email, password });

    expect(response.status).toBe(401);
  });

  it('3. Super admin approves user via API', async () => {
    const response = await request(app.getHttpServer())
      .post(`/users/${pendingUserId}/approve`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ role: UserRole.OPERATOR });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe(UserStatus.ACTIVE);
    expect(response.body.role).toBe(UserRole.OPERATOR);
  });

  it('4. User can login after approval', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: approvedUser.email, password });

    expect(response.status).toBe(200);
    expect(response.body.access_token).toBeDefined();
  });

  it('5. Super admin can reject user', async () => {
    const response = await request(app.getHttpServer())
      .post(`/users/${pendingUserId}/reject`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ reason: 'Invalid information' });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe(UserStatus.REJECTED);
  });
});
```

**Время**: 3 часа

---

## 4.3 Deployment Checklist

```
WEEK 1 CODE REVIEW FIXES
☐ All endpoints have @UseGuards(JwtAuthGuard, RolesGuard)
☐ All POST/PATCH/DELETE have @Roles() decorators
☐ Verification codes use randomBytes (not Math.random)
☐ Photo uploads validate MIME type + size + ownership
☐ Task updates use transactions with pessimistic_write lock
☐ Step indices validated (no overflow)
☐ System dictionaries protected from modification
☐ Network calls have 30s timeout
☐ All tests passing

WEEK 2-3 APPROVAL WORKFLOW
☐ User entity has approval fields (approved_by_id, approved_at, etc.)
☐ Migration created and tested
☐ Registration creates PENDING users
☐ Login blocked for PENDING users
☐ Approval endpoints working
☐ Telegram commands working for super admin
☐ Notifications sending correctly

GENERAL
☐ No hardcoded secrets in code
☐ Environment variables documented
☐ Database backup created
☐ Staging deployment successful
☐ Load testing completed (100+ concurrent users)
☐ Rollback plan documented
```

**Время**: 2 часа setup + 2 часа testing

---

# ИТОГОВЫЙ ГРАФИК

```
WEEK 1: CODE REVIEW FIXES (~12 часов)
  Mon: Auth guards + verification codes
  Tue: Transactional updates + photo validation
  Wed: Review + fixes
  Thu: Deploy to staging

WEEK 2: APPROVAL SYSTEM (~6 часов)
  Mon: User entity changes + migration
  Tue: Registration flow + approval endpoints
  Wed: Testing
  Thu: Deploy to staging

WEEK 3: TELEGRAM INTEGRATION (~8 часов)
  Mon: Super admin commands
  Tue: Role selection + rejection
  Wed: Notifications
  Thu: Testing + deploy

WEEK 4: FINAL & PRODUCTION (~7 часов)
  Mon: Load testing + performance tuning
  Tue: Security audit
  Wed: Final testing
  Thu: Production deployment + monitoring

TOTAL: ~33 часов = 1 неделя (2-3 разработчика)
```

---

## 🎯 Ключевые моменты

### Super Admin (Jamshiddin)
- Telegram ID: `42283329`
- Единственный кто может одобрять/отклонять пользователей
- Получает уведомления о новых регистрациях
- Использует команды: `/pending_users`, `/approve_user`, `/reject_user`

### User Registration Flow

```
1. User registers → Email + Phone + Password
   ↓
2. System creates user with PENDING status
   ↓
3. Super admin notified in Telegram
   ↓
4. Super admin views pending users: /pending_users
   ↓
5. Super admin selects user and clicks "Approve"
   ↓
6. System shows role options: Operator, Manager, Technician, Collector
   ↓
7. Super admin selects role
   ↓
8. User is ACTIVATED with selected role
   ↓
9. User gets notification: "Account Approved! Role: Operator"
   ↓
10. User can now login
```

### Rejection Flow

```
1. Super admin clicks "Reject" on pending user
   ↓
2. System asks for rejection reason
   ↓
3. Super admin types reason
   ↓
4. User is marked REJECTED with reason + timestamp
   ↓
5. User notified: "Registration rejected. Reason: ..."
```

---

## 📝 Next Steps

1. Review this plan with team
2. Assign developers to each WEEK
3. Create GitHub issues for tracking
4. Start with WEEK 1 critical fixes
5. Run tests after each week
6. Deploy to staging weekly
7. Final production deployment after WEEK 4

---

**Status**: 🚀 Ready to implement
**Questions?** Ask before starting
**Support**: Use `CRITICAL_ISSUES_QUICK_FIX_GUIDE.md` for code patterns
