# Telegram Module Integration Examples

This document provides practical examples for integrating the Telegram module with other VendHub modules.

## Table of Contents

1. [Machine Status Notifications](#machine-status-notifications)
2. [Inventory Alerts](#inventory-alerts)
3. [Task Management](#task-management)
4. [Equipment Maintenance](#equipment-maintenance)
5. [Sales Reports](#sales-reports)
6. [Custom Integrations](#custom-integrations)

## Machine Status Notifications

### Example 1: Machine Goes Offline

```typescript
// backend/src/modules/machines/machines.service.ts

import { Injectable } from '@nestjs/common';
import { TelegramNotificationsService } from '../telegram/services/telegram-notifications.service';

@Injectable()
export class MachinesService {
  constructor(
    private telegramNotificationsService: TelegramNotificationsService,
  ) {}

  async updateMachineStatus(machineId: string, status: string): Promise<void> {
    const machine = await this.findOne(machineId);
    const previousStatus = machine.status;

    // Update status
    machine.status = status;
    await this.machineRepository.save(machine);

    // Send Telegram notification if machine went offline
    if (previousStatus === 'online' && status === 'offline') {
      await this.telegramNotificationsService.notifyMachineOffline(
        machine.owner_id,
        machine.id,
        machine.name
      );
    }

    // Send notification if machine came back online
    if (previousStatus === 'offline' && status === 'online') {
      await this.telegramNotificationsService.sendNotification({
        userId: machine.owner_id,
        type: 'machine_online',
        title: 'Машина онлайн',
        message: `Машина "${machine.name}" снова онлайн!`,
        data: {
          'ID машины': machine.id,
          'Местоположение': machine.location,
          'Время восстановления': new Date().toLocaleString('ru-RU'),
        },
        actions: [
          {
            text: '🔍 Посмотреть детали',
            url: `${process.env.FRONTEND_URL}/machines/${machine.id}`,
          },
        ],
      });
    }
  }
}
```

### Example 2: Low Stock Alert

```typescript
// backend/src/modules/machines/machines.service.ts

async checkStockLevels(machineId: string): Promise<void> {
  const machine = await this.findOne(machineId);
  const stockLevel = await this.calculateStockLevel(machine);

  if (stockLevel < 20) { // Below 20%
    await this.telegramNotificationsService.notifyLowStock(
      machine.owner_id,
      machine.id,
      machine.name,
      stockLevel
    );
  }
}
```

## Inventory Alerts

### Example 3: Spare Parts Low Stock

```typescript
// backend/src/modules/equipment/services/spare-parts.service.ts

import { Injectable } from '@nestjs/common';
import { TelegramNotificationsService } from '../../telegram/services/telegram-notifications.service';

@Injectable()
export class SparePartsService {
  constructor(
    private telegramNotificationsService: TelegramNotificationsService,
  ) {}

  async adjustStock(id: string, dto: AdjustStockDto): Promise<SparePart> {
    const sparePart = await this.findOne(id);
    const newQuantity = sparePart.quantity_in_stock + dto.quantity;

    sparePart.quantity_in_stock = newQuantity;
    await this.sparePartRepository.save(sparePart);

    // Check if stock is below minimum level
    if (newQuantity < sparePart.min_stock_level) {
      // Get all users who should be notified (admins, warehouse managers, etc.)
      const usersToNotify = await this.getUsersForStockAlerts();

      for (const user of usersToNotify) {
        await this.telegramNotificationsService.sendNotification({
          userId: user.id,
          type: 'equipment_low_stock',
          title: 'Низкий запас запчастей',
          message: `Запчасть "${sparePart.name}" требует пополнения`,
          data: {
            'Артикул': sparePart.part_number,
            'Текущий запас': `${newQuantity} ${sparePart.unit}`,
            'Минимум': `${sparePart.min_stock_level} ${sparePart.unit}`,
            'Поставщик': sparePart.supplier_name || 'Не указан',
          },
          actions: [
            {
              text: '📦 Пополнить запас',
              url: `${process.env.FRONTEND_URL}/equipment/spare-parts`,
            },
            {
              text: '📞 Связаться с поставщиком',
              callback_data: `contact_supplier_${sparePart.id}`,
            },
          ],
        });
      }
    }

    return sparePart;
  }
}
```

## Task Management

### Example 4: Task Assignment

```typescript
// backend/src/modules/tasks/tasks.service.ts

import { Injectable } from '@nestjs/common';
import { TelegramNotificationsService } from '../telegram/services/telegram-notifications.service';

@Injectable()
export class TasksService {
  constructor(
    private telegramNotificationsService: TelegramNotificationsService,
  ) {}

  async assignTask(taskId: string, assigneeId: string): Promise<Task> {
    const task = await this.findOne(taskId);
    task.assignee_id = assigneeId;
    task.status = TaskStatus.IN_PROGRESS;
    await this.taskRepository.save(task);

    // Notify assignee
    await this.telegramNotificationsService.notifyTaskAssigned(
      assigneeId,
      task.id,
      task.title
    );

    return task;
  }

  async completeTask(taskId: string, completedById: string): Promise<Task> {
    const task = await this.findOne(taskId);
    task.status = TaskStatus.COMPLETED;
    task.completed_at = new Date();
    task.completed_by_id = completedById;
    await this.taskRepository.save(task);

    // Notify task creator
    if (task.created_by_id !== completedById) {
      await this.telegramNotificationsService.sendNotification({
        userId: task.created_by_id,
        type: 'task_completed',
        title: 'Задача выполнена',
        message: `Задача "${task.title}" была выполнена`,
        data: {
          'Задача': task.title,
          'Выполнил': await this.getUserName(completedById),
          'Время': new Date().toLocaleString('ru-RU'),
        },
        actions: [
          {
            text: '✓ Посмотреть результат',
            url: `${process.env.FRONTEND_URL}/tasks/${task.id}`,
          },
        ],
      });
    }

    return task;
  }
}
```

## Equipment Maintenance

### Example 5: Maintenance Due Reminder

```typescript
// backend/src/modules/equipment/services/equipment-scheduled-tasks.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TelegramNotificationsService } from '../../telegram/services/telegram-notifications.service';

@Injectable()
export class EquipmentScheduledTasksService {
  private readonly logger = new Logger(EquipmentScheduledTasksService.name);

  constructor(
    private telegramNotificationsService: TelegramNotificationsService,
    private componentsService: ComponentsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async checkMaintenanceDue(): Promise<void> {
    this.logger.log('Checking for components needing maintenance...');

    const componentsDue = await this.componentsService.getComponentsNeedingMaintenance();

    for (const component of componentsDue) {
      // Get machine owner
      const machine = await this.machinesService.findOne(component.machine_id);

      await this.telegramNotificationsService.sendNotification({
        userId: machine.owner_id,
        type: 'equipment_needs_maintenance',
        title: 'Требуется обслуживание оборудования',
        message: `Компонент "${component.name}" требует технического обслуживания`,
        data: {
          'Компонент': component.name,
          'Тип': component.component_type,
          'Машина': machine.name,
          'Последнее ТО': component.last_maintenance_date
            ? new Date(component.last_maintenance_date).toLocaleDateString('ru-RU')
            : 'Никогда',
          'Следующее ТО': new Date(component.next_maintenance_date).toLocaleDateString('ru-RU'),
        },
        actions: [
          {
            text: '🔧 Запланировать ТО',
            url: `${process.env.FRONTEND_URL}/equipment/components/${component.id}`,
          },
          {
            text: '📋 История обслуживания',
            url: `${process.env.FRONTEND_URL}/equipment/maintenance?component=${component.id}`,
          },
        ],
      });
    }

    this.logger.log(`Sent ${componentsDue.length} maintenance reminders`);
  }

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async checkWashingSchedules(): Promise<void> {
    this.logger.log('Checking washing schedules...');

    const schedulesDue = await this.washingSchedulesService.getSchedulesDueToday();

    for (const schedule of schedulesDue) {
      const machine = await this.machinesService.findOne(schedule.machine_id);

      await this.telegramNotificationsService.sendNotification({
        userId: machine.owner_id,
        type: 'equipment_washing_due',
        title: 'Требуется мойка оборудования',
        message: `Сегодня запланирована мойка: ${schedule.name}`,
        data: {
          'График': schedule.name,
          'Машина': machine.name,
          'Компоненты': schedule.target_component_types.join(', '),
          'Последняя мойка': schedule.last_wash_date
            ? new Date(schedule.last_wash_date).toLocaleDateString('ru-RU')
            : 'Никогда',
        },
        actions: [
          {
            text: '✓ Отметить как выполнено',
            callback_data: `complete_washing_${schedule.id}`,
          },
          {
            text: '📅 Перенести',
            url: `${process.env.FRONTEND_URL}/equipment/washing`,
          },
        ],
      });
    }

    this.logger.log(`Sent ${schedulesDue.length} washing reminders`);
  }
}
```

## Sales Reports

### Example 6: Daily Sales Summary

```typescript
// backend/src/modules/reports/reports.service.ts

import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TelegramNotificationsService } from '../telegram/services/telegram-notifications.service';

@Injectable()
export class ReportsService {
  constructor(
    private telegramNotificationsService: TelegramNotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_10PM)
  async sendDailySalesReport(): Promise<void> {
    const users = await this.getUsersWantingDailySummary();

    for (const user of users) {
      const sales = await this.calculateDailySales(user.id);

      await this.telegramNotificationsService.sendNotification({
        userId: user.id,
        type: 'custom',
        title: '📊 Ежедневный отчет о продажах',
        message: 'Вот ваша статистика за сегодня:',
        data: {
          '💰 Выручка': `₽${sales.revenue.toLocaleString()}`,
          '☕ Продано напитков': sales.total_drinks.toLocaleString(),
          '📈 Лучшая машина': sales.top_machine.name,
          '🎯 Выполнение плана': `${sales.plan_completion}%`,
        },
        actions: [
          {
            text: '📊 Подробный отчет',
            url: `${process.env.FRONTEND_URL}/reports/daily/${sales.date}`,
          },
          {
            text: '📈 Сравнить с вчера',
            url: `${process.env.FRONTEND_URL}/reports/compare`,
          },
        ],
      });
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_NOON)
  async checkSalesMilestones(): Promise<void> {
    const users = await this.getAllActiveUsers();

    for (const user of users) {
      const todaySales = await this.getTodaySales(user.id);

      // Check if milestone reached (e.g., 1000 drinks sold)
      if (todaySales.total_drinks === 1000) {
        await this.telegramNotificationsService.sendNotification({
          userId: user.id,
          type: 'sales_milestone',
          title: '🎉 Достижение!',
          message: 'Поздравляем! Сегодня продано 1000 напитков!',
          data: {
            'Продано напитков': '1,000',
            'Выручка': `₽${todaySales.revenue.toLocaleString()}`,
            'Время': new Date().toLocaleTimeString('ru-RU'),
          },
          actions: [
            {
              text: '🎊 Посмотреть статистику',
              url: `${process.env.FRONTEND_URL}/dashboard`,
            },
          ],
        });
      }
    }
  }
}
```

## Custom Integrations

### Example 7: Payment Processing

```typescript
// backend/src/modules/transactions/transactions.service.ts

import { Injectable } from '@nestjs/common';
import { TelegramNotificationsService } from '../telegram/services/telegram-notifications.service';

@Injectable()
export class TransactionsService {
  constructor(
    private telegramNotificationsService: TelegramNotificationsService,
  ) {}

  async processPayment(transaction: Transaction): Promise<void> {
    try {
      // Payment processing logic...
      const result = await this.paymentGateway.process(transaction);

      if (!result.success) {
        // Notify user of payment failure
        await this.telegramNotificationsService.sendNotification({
          userId: transaction.user_id,
          type: 'payment_failed',
          title: 'Ошибка оплаты',
          message: `Не удалось обработать платеж на сумму ₽${transaction.amount}`,
          data: {
            'Сумма': `₽${transaction.amount}`,
            'Причина': result.error_message,
            'Время': new Date().toLocaleString('ru-RU'),
          },
          actions: [
            {
              text: '🔄 Попробовать снова',
              url: `${process.env.FRONTEND_URL}/transactions/${transaction.id}/retry`,
            },
            {
              text: '💳 Изменить способ оплаты',
              url: `${process.env.FRONTEND_URL}/settings/payment-methods`,
            },
          ],
        });
      }
    } catch (error) {
      this.logger.error('Payment processing failed', error);
    }
  }
}
```

### Example 8: Broadcast Announcement

```typescript
// backend/src/modules/notifications/notifications.service.ts

import { Injectable } from '@nestjs/common';
import { TelegramNotificationsService } from '../telegram/services/telegram-notifications.service';

@Injectable()
export class NotificationsService {
  constructor(
    private telegramNotificationsService: TelegramNotificationsService,
  ) {}

  async sendSystemAnnouncement(
    title: string,
    message: string,
    priority: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<void> {
    const icon = priority === 'high' ? '🚨' : priority === 'medium' ? '📢' : 'ℹ️';

    await this.telegramNotificationsService.sendNotification({
      broadcast: true, // Send to all users
      type: 'custom',
      title: `${icon} ${title}`,
      message,
      actions: priority === 'high' ? [
        {
          text: '📖 Подробнее',
          url: `${process.env.FRONTEND_URL}/announcements`,
        },
      ] : undefined,
    });
  }

  // Example usage:
  async scheduleMaintenanceAnnouncement(): Promise<void> {
    await this.sendSystemAnnouncement(
      'Плановое обслуживание',
      'VendHub будет недоступен с 2:00 до 4:00 ночи для планового обслуживания.',
      'medium'
    );
  }

  async criticalSecurityUpdate(): Promise<void> {
    await this.sendSystemAnnouncement(
      'Важное обновление безопасности',
      'Обнаружена критическая уязвимость. Пожалуйста, обновите систему как можно скорее.',
      'high'
    );
  }
}
```

### Example 9: User Onboarding

```typescript
// backend/src/modules/users/users.service.ts

import { Injectable } from '@nestjs/common';
import { TelegramNotificationsService } from '../telegram/services/telegram-notifications.service';

@Injectable()
export class UsersService {
  constructor(
    private telegramNotificationsService: TelegramNotificationsService,
  ) {}

  async createUser(createUserDto: CreateUserDto): Promise<User> {
    const user = await this.userRepository.save(
      this.userRepository.create(createUserDto)
    );

    // Send welcome notification after a short delay to ensure account is fully set up
    setTimeout(async () => {
      await this.sendWelcomeNotification(user.id);
    }, 5000);

    return user;
  }

  private async sendWelcomeNotification(userId: string): Promise<void> {
    await this.telegramNotificationsService.sendNotification({
      userId,
      type: 'custom',
      title: '👋 Добро пожаловать в VendHub!',
      message:
        'Спасибо за регистрацию! Вот несколько полезных ссылок для начала работы:',
      actions: [
        {
          text: '🚀 Быстрый старт',
          url: `${process.env.FRONTEND_URL}/onboarding`,
        },
        {
          text: '📖 Документация',
          url: `${process.env.FRONTEND_URL}/docs`,
        },
        {
          text: '💬 Поддержка',
          url: `${process.env.FRONTEND_URL}/support`,
        },
      ],
    });
  }
}
```

### Example 10: Smart Contextual Notifications

```typescript
// backend/src/modules/machines/machines.service.ts

import { Injectable } from '@nestjs/common';
import { TelegramNotificationsService } from '../telegram/services/telegram-notifications.service';

@Injectable()
export class MachinesService {
  constructor(
    private telegramNotificationsService: TelegramNotificationsService,
  ) {}

  async analyzeAndNotify(machineId: string): Promise<void> {
    const machine = await this.findOne(machineId);
    const metrics = await this.getMetrics(machine);

    // Smart notification based on multiple factors
    if (this.shouldNotifyOwner(metrics)) {
      const severity = this.calculateSeverity(metrics);
      const recommendations = this.generateRecommendations(metrics);

      await this.telegramNotificationsService.sendNotification({
        userId: machine.owner_id,
        type: 'custom',
        title: this.getNotificationTitle(severity),
        message: this.formatNotificationMessage(machine, metrics),
        data: {
          'Машина': machine.name,
          'Статус': metrics.status,
          'Продажи сегодня': metrics.today_sales.toString(),
          'Запас': `${metrics.stock_level}%`,
          'Температура': `${metrics.temperature}°C`,
          'Ошибки': metrics.errors_count.toString(),
        },
        actions: this.getContextualActions(machine, metrics, severity),
      });
    }
  }

  private shouldNotifyOwner(metrics: any): boolean {
    return (
      metrics.stock_level < 20 ||
      metrics.errors_count > 0 ||
      metrics.temperature > 80 ||
      metrics.status === 'warning'
    );
  }

  private calculateSeverity(metrics: any): 'info' | 'warning' | 'critical' {
    if (metrics.errors_count > 0 || metrics.temperature > 90) {
      return 'critical';
    }
    if (metrics.stock_level < 10 || metrics.temperature > 80) {
      return 'warning';
    }
    return 'info';
  }

  private getNotificationTitle(severity: string): string {
    const titles = {
      critical: '🚨 Критическая проблема',
      warning: '⚠️ Требуется внимание',
      info: 'ℹ️ Информация',
    };
    return titles[severity];
  }

  private getContextualActions(machine: any, metrics: any, severity: string): any[] {
    const actions = [];

    if (metrics.stock_level < 20) {
      actions.push({
        text: '📦 Пополнить запас',
        url: `${process.env.FRONTEND_URL}/machines/${machine.id}/refill`,
      });
    }

    if (metrics.errors_count > 0) {
      actions.push({
        text: '🔧 Посмотреть ошибки',
        url: `${process.env.FRONTEND_URL}/machines/${machine.id}/errors`,
      });
    }

    if (severity === 'critical') {
      actions.push({
        text: '🆘 Вызвать техника',
        url: `${process.env.FRONTEND_URL}/support/emergency`,
      });
    }

    actions.push({
      text: '📊 Подробная статистика',
      url: `${process.env.FRONTEND_URL}/machines/${machine.id}`,
    });

    return actions;
  }
}
```

## Testing Integrations

### Manual Testing

```typescript
// Create a test endpoint for development
@Controller('dev/telegram')
export class TelegramTestController {
  constructor(
    private telegramNotificationsService: TelegramNotificationsService,
  ) {}

  @Post('test-notification')
  async testNotification(@Body() body: { userId: string; type: string }) {
    await this.telegramNotificationsService.sendNotification({
      userId: body.userId,
      type: body.type,
      title: 'Test Notification',
      message: 'This is a test notification',
      data: {
        'Test': 'Data',
        'Timestamp': new Date().toISOString(),
      },
      actions: [
        {
          text: '✅ OK',
          callback_data: 'test_ok',
        },
      ],
    });

    return { message: 'Test notification sent' };
  }
}
```

### Test via curl

```bash
# Test notification
curl -X POST http://localhost:3000/dev/telegram/test-notification \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-uuid-here",
    "type": "custom"
  }'
```

## Best Practices

1. **Always check notification preferences** - Don't spam users
2. **Use appropriate notification types** - Match type to content
3. **Provide action buttons** - Make notifications actionable
4. **Keep messages concise** - Mobile-friendly text
5. **Include context** - Add relevant data fields
6. **Handle errors gracefully** - Log failed notifications
7. **Use broadcast sparingly** - Only for important announcements
8. **Test before deploying** - Use test notifications feature
9. **Monitor delivery** - Check message logs regularly
10. **Respect user's language** - Bot auto-detects and adapts

## Summary

The Telegram module provides a flexible notification system that can be integrated with any part of VendHub. The key is to:

- Choose the right notification type
- Provide context through data fields
- Add actionable buttons when possible
- Respect user preferences
- Handle errors gracefully

For more details, see the main [TELEGRAM_MODULE_README.md](./TELEGRAM_MODULE_README.md).
