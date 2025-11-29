# Implementation Quick Reference Guide

## User Registration & Approval Flow for VendHub

Based on analysis of jamsmac/sales-app and jamshiddins/VHM24 repositories.

---

## 1. Database Schema Changes Needed

```typescript
// Extend existing User entity with approval workflow
@Entity('users')
export class User extends BaseEntity {
  // ... existing fields ...

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.PENDING,  // Changed from ACTIVE
  })
  status: UserStatus;  // ACTIVE, INACTIVE, PENDING, BLOCKED

  @Column({ type: 'uuid', nullable: true })
  approved_by_id?: string;  // Admin who approved user

  @Column({ type: 'timestamp', nullable: true })
  approved_at?: Date;  // When user was approved

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'approved_by_id' })
  approvedBy?: User;

  // Relationships for logging
  @OneToMany(() => ActionLog, (log) => log.user)
  actionLogs: ActionLog[];
}

enum UserStatus {
  PENDING = 'pending',      // Awaiting admin approval
  ACTIVE = 'active',        // Approved and active
  INACTIVE = 'inactive',    // Temporarily disabled
  BLOCKED = 'blocked',      // Suspended access
}
```

---

## 2. Create Action Logging Entity

```typescript
@Entity('action_logs')
@Index(['userId'])
@Index(['entityType', 'entityId'])
export class ActionLog extends BaseEntity {
  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'varchar', length: 50 })
  action: string;  // e.g., "USER_APPROVED", "USER_REJECTED", "ROLE_CHANGED"

  @Column({ type: 'varchar', length: 50 })
  entity_type: string;  // e.g., "USER", "TASK"

  @Column({ type: 'uuid' })
  entity_id: string;

  @Column({ type: 'jsonb', nullable: true })
  changes: Record<string, any>;  // What changed

  @Column({ type: 'varchar', nullable: true })
  ip_address?: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
```

---

## 3. Extend User Service with Approval Methods

```typescript
// users.service.ts

async approvePendingUser(
  userId: string,
  adminId: string,
  role: UserRole,
): Promise<User> {
  // Validation
  const user = await this.userRepository.findOne({ where: { id: userId } });
  if (!user) {
    throw new NotFoundException('User not found');
  }
  if (user.status !== UserStatus.PENDING) {
    throw new BadRequestException('User is not pending approval');
  }

  // Update user
  const updatedUser = await this.userRepository.update(userId, {
    status: UserStatus.ACTIVE,
    role,
    approved_by_id: adminId,
    approved_at: new Date(),
  });

  // Log action
  await this.actionLogService.create({
    user_id: adminId,
    action: 'USER_APPROVED',
    entity_type: 'USER',
    entity_id: userId,
    changes: { role, status: UserStatus.ACTIVE },
  });

  // Notify user via Telegram
  await this.telegramService.notifyUserApproval(userId, role);

  return updatedUser;
}

async rejectPendingUser(
  userId: string,
  adminId: string,
  reason: string,
): Promise<void> {
  const user = await this.userRepository.findOne({ where: { id: userId } });
  if (!user) {
    throw new NotFoundException('User not found');
  }

  // Delete user or mark as rejected
  await this.userRepository.softDelete(userId);

  // Log action
  await this.actionLogService.create({
    user_id: adminId,
    action: 'USER_REJECTED',
    entity_type: 'USER',
    entity_id: userId,
    changes: { reason },
  });

  // Notify user
  await this.telegramService.notifyUserRejection(userId, reason);
}

async getPendingApprovals(): Promise<User[]> {
  return await this.userRepository.find({
    where: { status: UserStatus.PENDING },
    order: { created_at: 'ASC' },
  });
}

async changeUserRole(
  userId: string,
  newRole: UserRole,
  adminId: string,
): Promise<User> {
  const user = await this.userRepository.findOne({ where: { id: userId } });
  
  // Log role change
  await this.actionLogService.create({
    user_id: adminId,
    action: 'ROLE_CHANGED',
    entity_type: 'USER',
    entity_id: userId,
    changes: { 
      old_role: user.role,
      new_role: newRole 
    },
  });

  return await this.userRepository.update(userId, { role: newRole });
}
```

---

## 4. Create Admin/Approval Controller Endpoints

```typescript
// users.controller.ts

@ApiTags('users')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Get pending approvals (ADMIN/MANAGER only)
  @Get('pending-approvals')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get users pending approval' })
  getPendingApprovals() {
    return this.usersService.getPendingApprovals();
  }

  // Approve user (ADMIN only)
  @Post(':id/approve')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Approve pending user' })
  @ApiBody({
    schema: {
      properties: {
        role: { enum: ['OPERATOR', 'WAREHOUSE', 'TECHNICIAN', 'MANAGER'] },
      },
    },
  })
  approveUser(
    @Param('id') userId: string,
    @Body() dto: { role: UserRole },
    @CurrentUser() admin: User,
  ) {
    return this.usersService.approvePendingUser(userId, admin.id, dto.role);
  }

  // Reject user (ADMIN only)
  @Post(':id/reject')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Reject pending user' })
  rejectUser(
    @Param('id') userId: string,
    @Body() dto: { reason: string },
    @CurrentUser() admin: User,
  ) {
    return this.usersService.rejectPendingUser(userId, admin.id, dto.reason);
  }

  // Change user role (ADMIN only)
  @Patch(':id/role')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Change user role' })
  changeRole(
    @Param('id') userId: string,
    @Body() dto: { role: UserRole },
    @CurrentUser() admin: User,
  ) {
    return this.usersService.changeUserRole(userId, dto.role, admin.id);
  }

  // Get action logs (ADMIN/MANAGER only)
  @Get('logs/:userId')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get user action logs' })
  getUserLogs(@Param('userId') userId: string) {
    return this.actionLogService.findByUser(userId);
  }
}
```

---

## 5. Telegram Bot Admin Handlers

```typescript
// telegram-bot/src/handlers/admin/approval.handler.ts

export async function registerApprovalHandlers(bot, service) {
  // View pending approvals
  bot.command('approve_users', requireRole(['ADMIN', 'MANAGER']), 
    async (ctx) => {
      try {
        const pendingUsers = await service.getPendingApprovals();
        
        if (pendingUsers.length === 0) {
          return ctx.reply('No pending user approvals');
        }

        let message = '📋 *Pending User Approvals*\n\n';
        
        for (const user of pendingUsers) {
          message += `👤 ${user.firstName} ${user.lastName}\n`;
          message += `📱 Telegram ID: ${user.telegramId}\n`;
          message += `📅 Registered: ${user.createdAt}\n`;
          message += `\n`;
        }

        // Create inline keyboard for approvals
        const keyboard = {
          inline_keyboard: pendingUsers.map(user => [
            {
              text: `✅ Approve ${user.firstName}`,
              callback_data: `approve_${user.id}`,
            },
            {
              text: `❌ Reject ${user.firstName}`,
              callback_data: `reject_${user.id}`,
            },
          ]),
        };

        await ctx.reply(message, {
          parse_mode: 'Markdown',
          reply_markup: keyboard,
        });
      } catch (error) {
        await ctx.reply('Error fetching pending approvals');
      }
    }
  );

  // Handle approval action
  bot.action(/^approve_(.+)$/, requireRole(['ADMIN', 'MANAGER']), 
    async (ctx) => {
      const userId = ctx.match[1];
      
      // Show role selection keyboard
      const keyboard = {
        inline_keyboard: [
          [
            { text: 'Operator', callback_data: `approve_role_${userId}_OPERATOR` },
            { text: 'Warehouse', callback_data: `approve_role_${userId}_WAREHOUSE` },
          ],
          [
            { text: 'Technician', callback_data: `approve_role_${userId}_TECHNICIAN` },
            { text: 'Manager', callback_data: `approve_role_${userId}_MANAGER` },
          ],
        ],
      };

      await ctx.reply('Select role for user:', { reply_markup: keyboard });
      await ctx.answerCbQuery();
    }
  );

  // Handle role selection
  bot.action(/^approve_role_(.+)_(.+)$/, 
    requireRole(['ADMIN', 'MANAGER']), 
    async (ctx) => {
      const [, userId, role] = ctx.match;
      
      try {
        await service.approvePendingUser(userId, ctx.from.id, role);
        await ctx.answerCbQuery(`✅ User approved as ${role}`);
        await ctx.editMessageText('User has been approved!');
      } catch (error) {
        await ctx.answerCbQuery('❌ Error approving user');
      }
    }
  );

  // Handle rejection
  bot.action(/^reject_(.+)$/, requireRole(['ADMIN', 'MANAGER']), 
    async (ctx) => {
      const userId = ctx.match[1];
      const reason = 'Rejected by admin'; // Could ask for reason
      
      try {
        await service.rejectPendingUser(userId, ctx.from.id, reason);
        await ctx.answerCbQuery('❌ User rejected');
        await ctx.editMessageText('User has been rejected');
      } catch (error) {
        await ctx.answerCbQuery('Error rejecting user');
      }
    }
  );

  // View action logs
  bot.command('view_logs', requireRole(['ADMIN', 'MANAGER']), 
    async (ctx) => {
      try {
        const logs = await service.getRecentLogs(50);
        
        let message = '📊 *Recent Actions*\n\n';
        
        for (const log of logs) {
          message += `${log.action} - ${log.user.firstName}\n`;
          message += `${log.createdAt.toLocaleString()}\n\n`;
        }

        await ctx.reply(message, { parse_mode: 'Markdown' });
      } catch (error) {
        await ctx.reply('Error fetching logs');
      }
    }
  );
}
```

---

## 6. Admin Dashboard Component (React)

```tsx
// frontend/src/components/admin/UserApprovals.tsx

import { useState, useEffect } from 'react';

export function UserApprovals() {
  const [pending, setPending] = useState([]);
  const [selectedRole, setSelectedRole] = useState('OPERATOR');

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const fetchPendingUsers = async () => {
    const response = await fetch('/api/users/pending-approvals');
    const data = await response.json();
    setPending(data);
  };

  const handleApprove = async (userId) => {
    await fetch(`/api/users/${userId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: selectedRole }),
    });
    fetchPendingUsers();
  };

  const handleReject = async (userId) => {
    await fetch(`/api/users/${userId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Rejected by admin' }),
    });
    fetchPendingUsers();
  };

  return (
    <div className="approval-panel">
      <h2>Pending User Approvals</h2>
      
      {pending.length === 0 ? (
        <p>No pending approvals</p>
      ) : (
        <div className="users-grid">
          {pending.map(user => (
            <div key={user.id} className="user-card">
              <h3>{user.firstName} {user.lastName}</h3>
              <p>Telegram ID: {user.telegramId}</p>
              <p>Registered: {new Date(user.createdAt).toLocaleDateString()}</p>
              
              <select 
                value={selectedRole} 
                onChange={(e) => setSelectedRole(e.target.value)}
              >
                <option value="OPERATOR">Operator</option>
                <option value="WAREHOUSE">Warehouse</option>
                <option value="TECHNICIAN">Technician</option>
                <option value="MANAGER">Manager</option>
              </select>
              
              <div className="actions">
                <button 
                  className="btn-approve"
                  onClick={() => handleApprove(user.id)}
                >
                  ✅ Approve
                </button>
                <button 
                  className="btn-reject"
                  onClick={() => handleReject(user.id)}
                >
                  ❌ Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## 7. Migration File

```bash
# Generate migration
npm run migration:generate -- -n AddUserApprovalWorkflow

# Migration file (auto-generated, verify this content)
# migration: AddUserApprovalWorkflow.ts

export class AddUserApprovalWorkflow1637000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new columns to users table
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'status',
        type: 'enum',
        enum: ['pending', 'active', 'inactive', 'blocked'],
        default: "'pending'",
      }),
    );

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
        type: 'timestamp',
        isNullable: true,
      }),
    );

    // Create action_logs table
    await queryRunner.createTable(
      new Table({
        name: 'action_logs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'user_id',
            type: 'uuid',
          },
          {
            name: 'action',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'entity_type',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'entity_id',
            type: 'uuid',
          },
          {
            name: 'changes',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'ip_address',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert changes
  }
}
```

---

## 8. Implementation Checklist

- [ ] Update User entity with status and approval fields
- [ ] Create ActionLog entity
- [ ] Generate and run migration
- [ ] Create UserApprovalService methods
- [ ] Add approval endpoints to UsersController
- [ ] Create admin Telegram handlers
- [ ] Build admin dashboard approval panel
- [ ] Add action logging throughout user lifecycle
- [ ] Test complete approval flow
- [ ] Document API endpoints
- [ ] Set up notifications for approvals/rejections

---

## 9. User Registration Flow Diagram

```
┌─────────────────────┐
│ User sends /start   │
│ to Telegram bot     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ System creates User with:               │
│ - telegramId (auto-filled)              │
│ - firstName, lastName (from Telegram)   │
│ - role = OPERATOR (default)             │
│ - status = PENDING (awaiting approval)  │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ Admin receives notification:             │
│ "New user awaiting approval"            │
│ (via Telegram /approve_users command)   │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ Admin reviews user profile              │
│ - Checks if legitimate                  │
│ - Selects appropriate role              │
└──────────┬──────────────────────────────┘
           │
           ├─── ✅ Approve ──────────────────┐
           │                                 │
           ▼                                 ▼
    ┌──────────────┐          ┌──────────────────────┐
    │ User status  │          │ User receives:       │
    │  = ACTIVE    │          │ - Notification       │
    │              │          │ - Role assignment    │
    │ User can now │          │ - Access to features │
    │ use system   │          └──────────────────────┘
    └──────────────┘
           
           ├─── ❌ Reject ───────────────────┐
           │                                 │
           ▼                                 ▼
    ┌──────────────┐          ┌──────────────────────┐
    │ User deleted │          │ User receives:       │
    │              │          │ - Rejection reason   │
    │ User cannot  │          │ - Cannot use system  │
    │ access       │          └──────────────────────┘
    └──────────────┘
```

---

## 10. Key Differences from Current VendHub

Currently VendHub may have:
- Automatic user status = ACTIVE (no approval)
- Limited audit logging
- No admin approval UI in dashboard
- Limited Telegram admin commands

Add:
- User status = PENDING on registration
- Comprehensive ActionLog tracking
- Admin approval panel in dashboard
- Telegram approval commands (/approve_users, etc.)
- Email/Telegram notifications for approvals

---

**Last Updated**: 2025-11-16
**Based On**: jamsmac/sales-app and jamshiddins/VHM24 patterns
**Target Implementation**: VendHub Manager user registration & approval system
