import { Injectable, Logger } from '@nestjs/common';
import { IncidentsService } from '../../incidents/incidents.service';
import { TasksService } from '../../tasks/tasks.service';
import { NotificationsService } from '../../notifications/notifications.service';
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
      // TODO: Получить пользователей по ролям и отправить уведомления
      // Требуется дополнительный метод в UsersService
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

    if (difference.level_type === 'MACHINE') {
      machineId = difference.level_ref_id;
      taskType = TaskType.AUDIT; // Ревизия/проверка
    } else {
      // Для склада/оператора создаём задачу инспекции
      taskType = TaskType.INSPECTION;
      // TODO: Нужно решить, к какому аппарату привязывать задачу для WAREHOUSE/OPERATOR уровней
      // Временно оставляем undefined - потребует доработки схемы
    }

    const description = this.formatDifferenceDescription(difference);

    // Если нет machine_id, задачу создать не получится (требование схемы Task)
    if (!machineId) {
      this.logger.warn(
        `Cannot create task for non-machine level: ${difference.level_type}. Skipping task creation.`,
      );
      throw new Error('Task creation requires machine_id');
    }

    const task = await this.tasksService.create({
      type_code: taskType,
      machine_id: machineId,
      assigned_to_user_id: userId, // Assign to creator by default
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
}
