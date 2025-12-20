import { Injectable, Logger } from '@nestjs/common';
import { IncidentsService } from '../../incidents/incidents.service';
import { TasksService } from '../../tasks/tasks.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { UsersService } from '../../users/users.service';
import { UserRole } from '../../users/entities/user.entity';
import { TelegramNotificationsService } from '../../telegram/services/telegram-notifications.service';
import { MachineAccessService } from '../../machine-access/machine-access.service';
import {
  InventoryDifferenceThreshold,
  SeverityLevel,
} from '../entities/inventory-difference-threshold.entity';
import { DifferenceReportItem } from './inventory-difference.service';
import { IncidentType, IncidentPriority } from '../../incidents/entities/incident.entity';
import { TaskType, TaskPriority } from '../../tasks/entities/task.entity';
import {
  NotificationType,
  NotificationChannel,
} from '../../notifications/entities/notification.entity';

/**
 * InventoryThresholdActionsService
 *
 * Автоматические действия при превышении порогов расхождений:
 * - Создание инцидентов
 * - Создание задач на разбор
 * - Отправка уведомлений
 */
@Injectable()
export class InventoryThresholdActionsService {
  private readonly logger = new Logger(InventoryThresholdActionsService.name);

  constructor(
    private readonly incidentsService: IncidentsService,
    private readonly tasksService: TasksService,
    private readonly notificationsService: NotificationsService,
    private readonly usersService: UsersService,
    private readonly telegramNotificationsService: TelegramNotificationsService,
    private readonly machineAccessService: MachineAccessService,
  ) {}

  /**
   * Выполнить действия при превышении порога
   */
  async executeThresholdActions(
    difference: DifferenceReportItem,
    threshold: InventoryDifferenceThreshold,
    userId: string,
  ): Promise<{
    incidentId?: string;
    taskId?: string;
    notificationsSent: number;
  }> {
    this.logger.log(
      `Executing threshold actions for difference: ${difference.actual_count_id}, threshold: ${threshold.id}`,
    );

    const results: {
      incidentId?: string;
      taskId?: string;
      notificationsSent: number;
    } = {
      notificationsSent: 0,
    };

    // 1. Создать инцидент, если настроено
    if (threshold.create_incident) {
      try {
        const incidentId = await this.createIncidentFromDifference(difference, threshold, userId);
        results.incidentId = incidentId;
        this.logger.log(`Created incident: ${incidentId}`);
      } catch (error) {
        this.logger.error(`Failed to create incident: ${error.message}`, error.stack);
      }
    }

    // 2. Создать задачу, если настроено
    if (threshold.create_task) {
      try {
        const taskId = await this.createTaskFromDifference(difference, threshold, userId);
        results.taskId = taskId;
        this.logger.log(`Created task: ${taskId}`);
      } catch (error) {
        this.logger.error(`Failed to create task: ${error.message}`, error.stack);
      }
    }

    // 3. Отправить уведомления, если настроено
    if (threshold.notify_users && threshold.notify_users.length > 0) {
      try {
        const count = await this.sendNotificationsForDifference(
          difference,
          threshold,
          threshold.notify_users,
        );
        results.notificationsSent += count;
        this.logger.log(`Sent ${count} notifications to specific users`);
      } catch (error) {
        this.logger.error(`Failed to send notifications: ${error.message}`, error.stack);
      }
    }

    // 4. Уведомления по ролям (если настроено)
    if (threshold.notify_roles && threshold.notify_roles.length > 0) {
      this.logger.log(
        `Role-based notifications configured for: ${threshold.notify_roles.join(', ')}`,
      );
      try {
        const roleBasedCount = await this.sendRoleBasedNotifications(
          difference,
          threshold,
        );
        results.notificationsSent += roleBasedCount;
        this.logger.log(`Sent ${roleBasedCount} role-based notifications`);
      } catch (error) {
        this.logger.error(`Failed to send role-based notifications: ${error.message}`, error.stack);
      }
    }

    // 5. Telegram уведомления для критических расхождений
    if (threshold.severity_level === SeverityLevel.CRITICAL) {
      try {
        await this.sendTelegramAlert(difference, threshold);
        this.logger.log('Sent Telegram alert for critical difference');
      } catch (error) {
        this.logger.error(`Failed to send Telegram alert: ${error.message}`, error.stack);
      }
    }

    return results;
  }

  /**
   * Создать инцидент из расхождения
   */
  private async createIncidentFromDifference(
    difference: DifferenceReportItem,
    threshold: InventoryDifferenceThreshold,
    userId: string,
  ): Promise<string> {
    // Определить приоритет инцидента на основе серьёзности
    let priority: IncidentPriority;
    switch (threshold.severity_level) {
      case SeverityLevel.CRITICAL:
        priority = IncidentPriority.CRITICAL;
        break;
      case SeverityLevel.WARNING:
        priority = IncidentPriority.HIGH;
        break;
      default:
        priority = IncidentPriority.MEDIUM;
    }

    // Сформировать описание
    const description = this.formatDifferenceDescription(difference);

    // Определить machine_id, если уровень MACHINE
    let machineId: string | undefined;
    if (difference.level_type === 'MACHINE') {
      machineId = difference.level_ref_id;
    }

    // Только создаём инцидент для инвентаря на уровне машины
    if (!machineId) {
      this.logger.warn(
        `Skipping incident creation for non-machine inventory difference: ${difference.nomenclature_name}`,
      );
      return 'none';
    }

    const incident = await this.incidentsService.create({
      incident_type: IncidentType.OTHER,
      title: `Расхождение остатков: ${difference.nomenclature_name}`,
      description,
      machine_id: machineId,
      priority,
      reported_by_user_id: userId,
      metadata: {
        difference_report_item: {
          actual_count_id: difference.actual_count_id,
          nomenclature_id: difference.nomenclature_id,
          level_type: difference.level_type,
          level_ref_id: difference.level_ref_id,
          calculated_quantity: difference.calculated_quantity,
          actual_quantity: difference.actual_quantity,
          difference_abs: difference.difference_abs,
          difference_rel: difference.difference_rel,
        },
        threshold: {
          id: threshold.id,
          name: threshold.name,
          threshold_abs: threshold.threshold_abs,
          threshold_rel: threshold.threshold_rel,
        },
      },
    });

    return incident.id;
  }

  /**
   * Создать задачу из расхождения
   */
  private async createTaskFromDifference(
    difference: DifferenceReportItem,
    threshold: InventoryDifferenceThreshold,
    userId: string,
  ): Promise<string> {
    // Определить приоритет задачи
    let priority: TaskPriority;
    switch (threshold.severity_level) {
      case SeverityLevel.CRITICAL:
        priority = TaskPriority.URGENT;
        break;
      case SeverityLevel.WARNING:
        priority = TaskPriority.HIGH;
        break;
      default:
        priority = TaskPriority.NORMAL;
    }

    // Определить machine_id и тип задачи
    let machineId: string | undefined;
    let taskType: TaskType;
    let assignedUserId = userId;

    if (difference.level_type === 'MACHINE') {
      // For machine-level differences, use the machine directly
      machineId = difference.level_ref_id;
      taskType = TaskType.AUDIT; // Ревизия/проверка
    } else if (difference.level_type === 'OPERATOR') {
      // For operator-level differences, find a machine assigned to the operator
      taskType = TaskType.INSPECTION;
      const operatorId = difference.level_ref_id;
      assignedUserId = operatorId; // Assign task to the operator

      try {
        const machineAccess = await this.machineAccessService.findByUser(operatorId);
        if (machineAccess.length > 0) {
          // Use the first machine assigned to the operator
          machineId = machineAccess[0].machine_id;
          this.logger.log(
            `Found ${machineAccess.length} machines for operator ${operatorId}, using machine ${machineId}`,
          );
        } else {
          this.logger.warn(
            `No machines assigned to operator ${operatorId}. Cannot create task.`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Failed to find machines for operator ${operatorId}: ${error.message}`,
        );
      }
    } else {
      // For warehouse-level differences, skip task creation
      // Warehouse differences require a different workflow (e.g., warehouse audit)
      taskType = TaskType.INSPECTION;
      this.logger.log(
        `Warehouse-level difference detected. Task creation skipped - use warehouse audit workflow.`,
      );
    }

    const description = this.formatDifferenceDescription(difference);

    // Если нет machine_id, задачу создать не получится (требование схемы Task)
    if (!machineId) {
      this.logger.warn(
        `Cannot create task for ${difference.level_type} level: no machine found. Skipping task creation.`,
      );
      throw new Error(`Task creation requires machine_id. Level: ${difference.level_type}`);
    }

    const task = await this.tasksService.create({
      type_code: taskType,
      machine_id: machineId,
      assigned_to_user_id: assignedUserId,
      created_by_user_id: userId,
      priority,
      description: `Расхождение остатков: ${difference.nomenclature_name}\n\n${description}`,
      metadata: {
        difference_report_item: {
          actual_count_id: difference.actual_count_id,
          nomenclature_id: difference.nomenclature_id,
          level_type: difference.level_type,
          level_ref_id: difference.level_ref_id,
          calculated_quantity: difference.calculated_quantity,
          actual_quantity: difference.actual_quantity,
          difference_abs: difference.difference_abs,
          difference_rel: difference.difference_rel,
        },
        threshold: {
          id: threshold.id,
          name: threshold.name,
        },
      },
    });

    return task.id;
  }

  /**
   * Отправить уведомления о расхождении
   */
  private async sendNotificationsForDifference(
    difference: DifferenceReportItem,
    threshold: InventoryDifferenceThreshold,
    userIds: string[],
  ): Promise<number> {
    const title = `Критическое расхождение: ${difference.nomenclature_name}`;
    const message = this.formatDifferenceDescription(difference);

    let count = 0;

    for (const userId of userIds) {
      try {
        // Отправляем in-app уведомление
        await this.notificationsService.create({
          type: NotificationType.SYSTEM_ALERT,
          channel: NotificationChannel.IN_APP,
          recipient_id: userId,
          title,
          message,
          data: {
            difference_report_item: {
              actual_count_id: difference.actual_count_id,
              nomenclature_id: difference.nomenclature_id,
              nomenclature_name: difference.nomenclature_name,
              level_type: difference.level_type,
              level_ref_id: difference.level_ref_id,
              calculated_quantity: difference.calculated_quantity,
              actual_quantity: difference.actual_quantity,
              difference_abs: difference.difference_abs,
              difference_rel: difference.difference_rel,
              severity: difference.severity,
            },
            threshold: {
              id: threshold.id,
              name: threshold.name,
            },
            action_url: `/reports/inventory-differences?actual_count_id=${difference.actual_count_id}`,
          },
        });

        count++;

        // Также отправляем Email уведомление для критических расхождений
        if (threshold.severity_level === SeverityLevel.CRITICAL) {
          await this.notificationsService.create({
            type: NotificationType.SYSTEM_ALERT,
            channel: NotificationChannel.EMAIL,
            recipient_id: userId,
            title,
            message,
            data: {
              difference_report_item: difference,
              threshold: { id: threshold.id, name: threshold.name },
            },
          });
          count++;
        }
      } catch (error) {
        this.logger.error(`Failed to send notification to user ${userId}: ${error.message}`);
      }
    }

    return count;
  }

  /**
   * Форматировать описание расхождения
   */
  private formatDifferenceDescription(difference: DifferenceReportItem): string {
    return `
Обнаружено расхождение остатков:

Товар: ${difference.nomenclature_name}
Уровень учёта: ${difference.level_type}
Дата замера: ${new Date(difference.counted_at).toLocaleString('ru-RU')}

Расчётный остаток: ${difference.calculated_quantity}
Фактический остаток: ${difference.actual_quantity}
Разница: ${difference.difference_abs} (${difference.difference_rel.toFixed(2)}%)

Серьёзность: ${difference.severity}
Порог превышен: ${difference.threshold_exceeded ? 'Да' : 'Нет'}

Проверил: ${difference.counted_by.full_name}
`.trim();
  }

  /**
   * Отправить уведомления пользователям по ролям
   */
  private async sendRoleBasedNotifications(
    difference: DifferenceReportItem,
    threshold: InventoryDifferenceThreshold,
  ): Promise<number> {
    // Проверяем наличие ролей
    if (!threshold.notify_roles || threshold.notify_roles.length === 0) {
      return 0;
    }

    // Преобразуем строковые роли в UserRole enum
    const roles = threshold.notify_roles
      .map((role) => this.mapStringToUserRole(role))
      .filter((role): role is UserRole => role !== null);

    if (roles.length === 0) {
      this.logger.warn('No valid roles found in notify_roles configuration');
      return 0;
    }

    // Получаем активных пользователей с указанными ролями
    const users = await this.usersService.findByRoles(roles, true);

    if (users.length === 0) {
      this.logger.log(`No active users found for roles: ${roles.join(', ')}`);
      return 0;
    }

    // Извлекаем ID пользователей, исключая тех, кто уже получает уведомления напрямую
    const existingUserIds = new Set(threshold.notify_users || []);
    const userIds = users
      .map((user) => user.id)
      .filter((id) => !existingUserIds.has(id));

    if (userIds.length === 0) {
      this.logger.log('All role-based users already receive direct notifications');
      return 0;
    }

    // Отправляем уведомления
    return this.sendNotificationsForDifference(difference, threshold, userIds);
  }

  /**
   * Преобразовать строковую роль в UserRole enum
   */
  private mapStringToUserRole(roleString: string): UserRole | null {
    const roleMapping: Record<string, UserRole> = {
      SuperAdmin: UserRole.SUPER_ADMIN,
      SUPER_ADMIN: UserRole.SUPER_ADMIN,
      Admin: UserRole.ADMIN,
      ADMIN: UserRole.ADMIN,
      Manager: UserRole.MANAGER,
      MANAGER: UserRole.MANAGER,
      Operator: UserRole.OPERATOR,
      OPERATOR: UserRole.OPERATOR,
      Collector: UserRole.COLLECTOR,
      COLLECTOR: UserRole.COLLECTOR,
      Technician: UserRole.TECHNICIAN,
      TECHNICIAN: UserRole.TECHNICIAN,
      Viewer: UserRole.VIEWER,
      VIEWER: UserRole.VIEWER,
    };

    return roleMapping[roleString] || null;
  }

  /**
   * Отправить Telegram уведомление о критическом расхождении
   */
  private async sendTelegramAlert(
    difference: DifferenceReportItem,
    threshold: InventoryDifferenceThreshold,
  ): Promise<void> {
    const title = `🚨 КРИТИЧЕСКОЕ РАСХОЖДЕНИЕ: ${difference.nomenclature_name}`;
    const message = this.formatTelegramAlertMessage(difference);

    // Определяем пользователей для уведомления
    const userIds: string[] = [];

    // Добавляем напрямую указанных пользователей
    if (threshold.notify_users && threshold.notify_users.length > 0) {
      userIds.push(...threshold.notify_users);
    }

    // Добавляем пользователей по ролям
    if (threshold.notify_roles && threshold.notify_roles.length > 0) {
      const roles = threshold.notify_roles
        .map((role) => this.mapStringToUserRole(role))
        .filter((role): role is UserRole => role !== null);

      if (roles.length > 0) {
        const roleUsers = await this.usersService.findByRoles(roles, true);
        userIds.push(...roleUsers.map((u) => u.id));
      }
    }

    // Если нет конкретных пользователей, отправляем всем админам и менеджерам
    if (userIds.length === 0) {
      const adminsAndManagers = await this.usersService.findByRoles(
        [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER],
        true,
      );
      userIds.push(...adminsAndManagers.map((u) => u.id));
    }

    // Убираем дубликаты
    const uniqueUserIds = [...new Set(userIds)];

    if (uniqueUserIds.length === 0) {
      this.logger.warn('No users found for Telegram alert');
      return;
    }

    await this.telegramNotificationsService.sendNotification({
      userIds: uniqueUserIds,
      type: 'inventory_critical_difference',
      title,
      message,
      data: {
        difference_report_item: {
          actual_count_id: difference.actual_count_id,
          nomenclature_id: difference.nomenclature_id,
          nomenclature_name: difference.nomenclature_name,
          level_type: difference.level_type,
          calculated_quantity: difference.calculated_quantity,
          actual_quantity: difference.actual_quantity,
          difference_abs: difference.difference_abs,
          difference_rel: difference.difference_rel,
        },
        threshold_id: threshold.id,
        threshold_name: threshold.name,
      },
      actions: [
        {
          text: '📋 Открыть отчёт',
          url: `/reports/inventory-differences?actual_count_id=${difference.actual_count_id}`,
        },
      ],
    });
  }

  /**
   * Форматировать сообщение для Telegram алерта
   */
  private formatTelegramAlertMessage(difference: DifferenceReportItem): string {
    return `<b>Обнаружено критическое расхождение остатков!</b>

<b>Товар:</b> ${difference.nomenclature_name}
<b>Уровень:</b> ${difference.level_type}

<b>Расчётный остаток:</b> ${difference.calculated_quantity}
<b>Фактический остаток:</b> ${difference.actual_quantity}
<b>Разница:</b> ${difference.difference_abs} (${difference.difference_rel.toFixed(2)}%)

<b>Проверил:</b> ${difference.counted_by.full_name}
<b>Дата:</b> ${new Date(difference.counted_at).toLocaleString('ru-RU')}`;
  }
}
