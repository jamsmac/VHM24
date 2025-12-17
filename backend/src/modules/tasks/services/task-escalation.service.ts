import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task, TaskStatus, TaskType } from '../entities/task.entity';
import { IncidentsService } from '../../incidents/incidents.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { AuditLogService } from '../../security/services/audit-log.service';
import { IncidentType, IncidentPriority } from '../../incidents/entities/incident.entity';
import { AuditEventType } from '../../security/entities/audit-log.entity';
import {
  NotificationType,
  NotificationChannel,
} from '../../notifications/entities/notification.entity';

/**
 * TaskEscalationService
 *
 * Handles task escalation, statistics, and monitoring:
 * - Overdue task detection
 * - Automatic escalation (incident creation)
 * - Task statistics
 */
@Injectable()
export class TaskEscalationService {
  private readonly logger = new Logger(TaskEscalationService.name);

  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    private readonly incidentsService: IncidentsService,
    private readonly notificationsService: NotificationsService,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * Получение статистики по задачам
   */
  async getStats(
    machineId?: string,
    userId?: string,
  ): Promise<{
    total: number;
    by_status: Record<string, number>;
    by_type: Record<string, number>;
    overdue: number;
  }> {
    const query = this.taskRepository.createQueryBuilder('task');

    if (machineId) {
      query.andWhere('task.machine_id = :machineId', { machineId });
    }

    if (userId) {
      query.andWhere('task.assigned_to_user_id = :userId', { userId });
    }

    const total = await query.getCount();

    // Статистика по статусам
    const statuses = await this.taskRepository
      .createQueryBuilder('task')
      .select('task.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('task.status')
      .getRawMany();

    const statusMap = statuses.reduce(
      (acc, item) => {
        acc[item.status] = parseInt(item.count);
        return acc;
      },
      {} as Record<string, number>,
    );

    // Статистика по типам
    const types = await this.taskRepository
      .createQueryBuilder('task')
      .select('task.type_code', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('task.type_code')
      .getRawMany();

    const typeMap = types.reduce(
      (acc, item) => {
        acc[item.type] = parseInt(item.count);
        return acc;
      },
      {} as Record<string, number>,
    );

    // Просроченные задачи
    const overdue = await this.taskRepository
      .createQueryBuilder('task')
      .where('task.due_date < :now', { now: new Date() })
      .andWhere('task.status != :completed', { completed: TaskStatus.COMPLETED })
      .andWhere('task.status != :cancelled', { cancelled: TaskStatus.CANCELLED })
      .getCount();

    return {
      total,
      by_status: statusMap,
      by_type: typeMap,
      overdue,
    };
  }

  /**
   * Получение просроченных задач
   */
  async getOverdueTasks(): Promise<Task[]> {
    return this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.machine', 'machine')
      .leftJoinAndSelect('task.assigned_to', 'assigned_to')
      .where('task.due_date < :now', { now: new Date() })
      .andWhere('task.status != :completed', { completed: TaskStatus.COMPLETED })
      .andWhere('task.status != :cancelled', { cancelled: TaskStatus.CANCELLED })
      .orderBy('task.due_date', 'ASC')
      .getMany();
  }

  /**
   * Эскалация просроченных задач
   * Создает инциденты для задач, которые просрочены более чем на 4 часа
   */
  async escalateOverdueTasks(): Promise<{ escalated_count: number; incidents_created: number }> {
    const now = new Date();
    const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);

    // Находим просроченные задачи (более 4 часов)
    const overdueTasks = await this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.machine', 'machine')
      .leftJoinAndSelect('task.assigned_to', 'assigned_to')
      .where('task.due_date < :fourHoursAgo', { fourHoursAgo })
      .andWhere('task.status IN (:...statuses)', {
        statuses: [TaskStatus.PENDING, TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS],
      })
      .getMany();

    let incidentsCreated = 0;

    for (const task of overdueTasks) {
      if (!task.due_date) continue;

      const overdueHours = Math.floor((now.getTime() - task.due_date.getTime()) / (1000 * 60 * 60));

      // Проверяем, не создан ли уже инцидент для этой задачи
      const hasExistingIncident = await this.checkExistingIncident(task.id, task.machine_id);

      if (!hasExistingIncident) {
        await this.createOverdueIncident(task, overdueHours);
        await this.notifyManagerAboutOverdue(task, overdueHours);
        await this.logEscalation(task, overdueHours);

        incidentsCreated++;
      }
    }

    return {
      escalated_count: overdueTasks.length,
      incidents_created: incidentsCreated,
    };
  }

  /**
   * Проверка существующего инцидента для задачи
   */
  private async checkExistingIncident(taskId: string, machineId: string): Promise<boolean> {
    const existingIncidents = await this.incidentsService.findAll(
      undefined,
      undefined,
      machineId,
      undefined,
      undefined,
    );

    return existingIncidents.some(
      (incident) =>
        incident.metadata &&
        incident.metadata.task_id === taskId &&
        incident.incident_type === IncidentType.OTHER,
    );
  }

  /**
   * Создание инцидента для просроченной задачи
   */
  private async createOverdueIncident(task: Task, overdueHours: number): Promise<void> {
    await this.incidentsService.create({
      incident_type: IncidentType.OTHER,
      priority: overdueHours > 24 ? IncidentPriority.HIGH : IncidentPriority.MEDIUM,
      machine_id: task.machine_id,
      title: `Просроченная задача: ${task.type_code}`,
      description:
        `Задача ${task.type_code} для аппарата ${task.machine?.machine_number || task.machine_id} просрочена на ${overdueHours} часов.\n` +
        `Статус: ${task.status}\n` +
        `Назначена: ${task.assigned_to?.full_name || 'не назначена'}\n` +
        `Срок выполнения был: ${task.due_date?.toISOString()}\n` +
        `Описание: ${task.description}`,
      metadata: {
        task_id: task.id,
        overdue_hours: overdueHours,
        task_status: task.status,
        task_type: task.type_code,
      },
    });
  }

  /**
   * Уведомление менеджера о просроченной задаче
   */
  private async notifyManagerAboutOverdue(task: Task, overdueHours: number): Promise<void> {
    if (!task.created_by_user_id) return;

    await this.notificationsService.create({
      type: NotificationType.INCIDENT_CREATED,
      channel: NotificationChannel.IN_APP,
      recipient_id: task.created_by_user_id,
      title: 'Создан инцидент: просроченная задача',
      message: `Задача ${task.type_code} для аппарата ${task.machine?.machine_number || task.machine_id} просрочена на ${overdueHours} часов`,
      data: {
        task_id: task.id,
        machine_id: task.machine_id,
        overdue_hours: overdueHours,
      },
      action_url: `/tasks/${task.id}`,
    });
  }

  /**
   * Аудит лог для эскалации
   */
  private async logEscalation(task: Task, overdueHours: number): Promise<void> {
    await this.auditLogService.log({
      event_type: AuditEventType.TRANSACTION_CREATED,
      description: `Автоматическая эскалация: задача просрочена на ${overdueHours} часов`,
      metadata: {
        task_id: task.id,
        machine_id: task.machine_id,
        overdue_hours: overdueHours,
      },
    });
  }

  /**
   * Получение задач по приоритету
   */
  async getTasksByPriority(userId?: string): Promise<{
    critical: Task[];
    high: Task[];
    medium: Task[];
    low: Task[];
  }> {
    const query = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.machine', 'machine')
      .where('task.status NOT IN (:...statuses)', {
        statuses: [TaskStatus.COMPLETED, TaskStatus.CANCELLED, TaskStatus.REJECTED],
      });

    if (userId) {
      query.andWhere('task.assigned_to_user_id = :userId', { userId });
    }

    const tasks = await query.getMany();

    return {
      critical: tasks.filter((t) => t.priority === 'critical'),
      high: tasks.filter((t) => t.priority === 'high'),
      medium: tasks.filter((t) => t.priority === 'medium'),
      low: tasks.filter((t) => t.priority === 'low'),
    };
  }

  /**
   * Получение задач, требующих внимания (просроченные или скоро просрочатся)
   */
  async getAttentionRequiredTasks(userId?: string): Promise<{
    overdue: Task[];
    due_soon: Task[];
    pending_photos: Task[];
  }> {
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const baseQuery = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.machine', 'machine')
      .leftJoinAndSelect('task.assigned_to', 'assigned_to');

    if (userId) {
      baseQuery.andWhere('task.assigned_to_user_id = :userId', { userId });
    }

    // Просроченные
    const overdueQuery = baseQuery
      .clone()
      .where('task.due_date < :now', { now })
      .andWhere('task.status IN (:...statuses)', {
        statuses: [TaskStatus.PENDING, TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS],
      });

    const overdue = await overdueQuery.getMany();

    // Срок истекает в ближайшие 24 часа
    const dueSoonQuery = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.machine', 'machine')
      .leftJoinAndSelect('task.assigned_to', 'assigned_to')
      .where('task.due_date BETWEEN :now AND :in24Hours', { now, in24Hours })
      .andWhere('task.status IN (:...statuses)', {
        statuses: [TaskStatus.PENDING, TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS],
      });

    if (userId) {
      dueSoonQuery.andWhere('task.assigned_to_user_id = :userId', { userId });
    }

    const due_soon = await dueSoonQuery.getMany();

    // Ожидают фото (офлайн завершенные)
    const pendingPhotosQuery = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.machine', 'machine')
      .leftJoinAndSelect('task.assigned_to', 'assigned_to')
      .where('task.pending_photos = :pending', { pending: true })
      .andWhere('task.status = :status', { status: TaskStatus.COMPLETED });

    if (userId) {
      pendingPhotosQuery.andWhere('task.assigned_to_user_id = :userId', { userId });
    }

    const pending_photos = await pendingPhotosQuery.getMany();

    return {
      overdue,
      due_soon,
      pending_photos,
    };
  }
}
