import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ComponentsService } from './components.service';
import { SparePartsService } from './spare-parts.service';
import { WashingSchedulesService } from './washing-schedules.service';
import { EquipmentNotificationsService } from './equipment-notifications.service';
import { TasksService } from '../../tasks/tasks.service';
import { TaskType, TaskPriority } from '../../tasks/entities/task.entity';

/**
 * Equipment Scheduled Tasks Service
 * Handles periodic background jobs for equipment management:
 * - Component maintenance checks
 * - Component lifetime monitoring
 * - Spare parts low stock alerts
 * - Washing schedule monitoring
 */
@Injectable()
export class EquipmentScheduledTasksService {
  private readonly logger = new Logger(EquipmentScheduledTasksService.name);

  constructor(
    private readonly componentsService: ComponentsService,
    private readonly sparePartsService: SparePartsService,
    private readonly washingSchedulesService: WashingSchedulesService,
    private readonly equipmentNotificationsService: EquipmentNotificationsService,
    private readonly tasksService: TasksService,
  ) {}

  /**
   * Check for components needing maintenance - runs every 6 hours
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  async checkComponentsNeedingMaintenance() {
    if (process.env.ENABLE_SCHEDULED_TASKS !== 'true') return;

    this.logger.log('Checking for components needing maintenance...');

    try {
      const components = await this.componentsService.getComponentsNeedingMaintenance();

      this.logger.log(`Found ${components.length} components needing maintenance`);

      // Get maintenance team user IDs
      const recipientIds = await this.equipmentNotificationsService.getMaintenanceTeamUserIds();

      if (recipientIds.length === 0) {
        this.logger.warn('No maintenance team members found for notifications');
        return;
      }

      for (const component of components) {
        await this.equipmentNotificationsService.notifyComponentNeedsMaintenance(
          component,
          recipientIds,
        );
      }

      this.logger.log(`Sent maintenance notifications for ${components.length} components`);
    } catch (error) {
      this.logger.error('Error checking components needing maintenance:', error);
    }
  }

  /**
   * Check for components nearing end of lifetime - runs daily at 9 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async checkComponentsNearingLifetime() {
    if (process.env.ENABLE_SCHEDULED_TASKS !== 'true') return;

    this.logger.log('Checking for components nearing lifetime...');

    try {
      const components = await this.componentsService.getComponentsNearingLifetime();

      this.logger.log(`Found ${components.length} components nearing lifetime`);

      // Get maintenance team user IDs
      const recipientIds = await this.equipmentNotificationsService.getMaintenanceTeamUserIds();

      if (recipientIds.length === 0) {
        this.logger.warn('No maintenance team members found for notifications');
        return;
      }

      for (const component of components) {
        // Calculate percentage used
        const percentageUsed =
          component.expected_lifetime_hours && component.expected_lifetime_hours > 0
            ? (component.working_hours / component.expected_lifetime_hours) * 100
            : 0;

        await this.equipmentNotificationsService.notifyComponentNearingLifetime(
          component,
          recipientIds,
          percentageUsed,
        );
      }

      this.logger.log(`Sent lifetime warnings for ${components.length} components`);
    } catch (error) {
      this.logger.error('Error checking components nearing lifetime:', error);
    }
  }

  /**
   * Check for low stock spare parts - runs every 12 hours
   */
  @Cron(CronExpression.EVERY_12_HOURS)
  async checkLowStockSpareParts() {
    if (process.env.ENABLE_SCHEDULED_TASKS !== 'true') return;

    this.logger.log('Checking for low stock spare parts...');

    try {
      const spareParts = await this.sparePartsService.getLowStockParts();

      this.logger.log(`Found ${spareParts.length} spare parts with low stock`);

      // Get maintenance team user IDs
      const recipientIds = await this.equipmentNotificationsService.getMaintenanceTeamUserIds();

      if (recipientIds.length === 0) {
        this.logger.warn('No maintenance team members found for notifications');
        return;
      }

      for (const sparePart of spareParts) {
        await this.equipmentNotificationsService.notifySparePartLowStock(sparePart, recipientIds);
      }

      this.logger.log(`Sent low stock notifications for ${spareParts.length} spare parts`);
    } catch (error) {
      this.logger.error('Error checking low stock spare parts:', error);
    }
  }

  /**
   * Check for overdue washing schedules - runs every 3 hours
   */
  @Cron(CronExpression.EVERY_3_HOURS)
  async checkOverdueWashingSchedules() {
    if (process.env.ENABLE_SCHEDULED_TASKS !== 'true') return;

    this.logger.log('Checking for overdue washing schedules...');

    try {
      const schedules = await this.washingSchedulesService.getOverdueSchedules();

      this.logger.log(`Found ${schedules.length} overdue washing schedules`);

      // Get maintenance team user IDs
      const recipientIds = await this.equipmentNotificationsService.getMaintenanceTeamUserIds();

      if (recipientIds.length === 0) {
        this.logger.warn('No maintenance team members found for notifications');
        return;
      }

      for (const schedule of schedules) {
        await this.equipmentNotificationsService.notifyWashingOverdue(schedule, recipientIds);
      }

      this.logger.log(`Sent overdue notifications for ${schedules.length} washing schedules`);
    } catch (error) {
      this.logger.error('Error checking overdue washing schedules:', error);
    }
  }

  /**
   * Check for upcoming washing schedules (3 days ahead) - runs daily at 8 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async checkUpcomingWashingSchedules() {
    if (process.env.ENABLE_SCHEDULED_TASKS !== 'true') return;

    this.logger.log('Checking for upcoming washing schedules...');

    try {
      const daysAhead = 3;
      const schedules = await this.washingSchedulesService.getUpcomingSchedules(daysAhead);

      this.logger.log(`Found ${schedules.length} washing schedules in next ${daysAhead} days`);

      // Get maintenance team user IDs
      const recipientIds = await this.equipmentNotificationsService.getMaintenanceTeamUserIds();

      if (recipientIds.length === 0) {
        this.logger.warn('No maintenance team members found for notifications');
        return;
      }

      for (const schedule of schedules) {
        const daysUntil = Math.ceil(
          (schedule.next_wash_date.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
        );

        await this.equipmentNotificationsService.notifyWashingUpcoming(
          schedule,
          recipientIds,
          daysUntil,
        );
      }

      this.logger.log(`Sent upcoming notifications for ${schedules.length} washing schedules`);
    } catch (error) {
      this.logger.error('Error checking upcoming washing schedules:', error);
    }
  }

  /**
   * Automatically create washing tasks - runs daily at 6 AM
   *
   * Creates CLEANING tasks for overdue washing schedules that have auto_create_tasks enabled.
   * Links tasks to washing schedules and sets up checklist from instructions.
   */
  @Cron('0 6 * * *') // Every day at 6:00 AM
  async createWashingTasks() {
    if (process.env.ENABLE_SCHEDULED_TASKS !== 'true') return;

    this.logger.log('Checking for washing schedules needing auto-created tasks...');

    try {
      // Get all overdue schedules
      const overdueSchedules = await this.washingSchedulesService.getOverdueSchedules();

      // Filter only those with auto_create_tasks enabled
      const schedulesNeedingTasks = overdueSchedules.filter(
        (schedule) => schedule.auto_create_tasks,
      );

      this.logger.log(
        `Found ${schedulesNeedingTasks.length} washing schedules needing auto-created tasks`,
      );

      let tasksCreated = 0;

      for (const schedule of schedulesNeedingTasks) {
        try {
          // Check if task already exists for this schedule
          const existingTask = await this.tasksService.findAll(
            undefined,
            undefined,
            schedule.machine_id,
          );

          // Skip if task already created
          if (existingTask && existingTask.length > 0) {
            const hasActiveTask = existingTask.some(
              (task) =>
                task.status === 'pending' ||
                task.status === 'assigned' ||
                task.status === 'in_progress',
            );

            if (hasActiveTask) {
              this.logger.debug(
                `Skipping washing schedule ${schedule.id} - active task already exists`,
              );
              continue;
            }
          }

          // Build checklist from washing instructions
          const checklist = this.buildWashingChecklist(schedule);

          // Build description with component types
          const componentNames = schedule.component_types
            .map((type) => this.getComponentTypeNameRu(type))
            .join(', ');

          const description = `Автоматически созданная задача на мойку компонентов: ${componentNames}\n\n${schedule.instructions || ''}`;

          // Determine due date (today or use scheduled date)
          const dueDate = new Date(schedule.next_wash_date);
          if (dueDate < new Date()) {
            dueDate.setHours(23, 59, 59); // End of today
          }

          // Create task
          // Note: created_by_user_id should be system user or admin
          // For now, we'll use a placeholder that should be configured
          const systemUserId = process.env.SYSTEM_USER_ID || 'system';

          const task = await this.tasksService.create({
            type_code: TaskType.CLEANING,
            machine_id: schedule.machine_id,
            created_by_user_id: systemUserId,
            assigned_to_user_id: schedule.last_washed_by_user_id ?? systemUserId,
            priority: TaskPriority.NORMAL,
            scheduled_date: new Date().toISOString(),
            due_date: dueDate.toISOString(),
            description,
            checklist,
            metadata: {
              washing_schedule_id: schedule.id,
              auto_created: true,
              created_by_cron: true,
              component_types: schedule.component_types,
              required_materials: schedule.required_materials,
              estimated_duration_minutes: schedule.estimated_duration_minutes,
            },
          });

          tasksCreated++;

          this.logger.log(
            `Created washing task ${task.id} for machine ${schedule.machine_id} (schedule: ${schedule.name})`,
          );
        } catch (error) {
          this.logger.error(`Error creating washing task for schedule ${schedule.id}:`, error);
          // Continue with other schedules
        }
      }

      this.logger.log(`Successfully created ${tasksCreated} washing tasks`);
    } catch (error) {
      this.logger.error('Error in createWashingTasks:', error);
    }
  }

  /**
   * Build checklist from washing schedule instructions
   */
  private buildWashingChecklist(schedule: any): Array<{ item: string; completed: boolean }> {
    const checklist: Array<{ item: string; completed: boolean }> = [];

    // Add component-specific items
    for (const componentType of schedule.component_types) {
      const componentName = this.getComponentTypeNameRu(componentType);
      checklist.push({
        item: `Разобрать ${componentName}`,
        completed: false,
      });
      checklist.push({
        item: `Вымыть ${componentName}`,
        completed: false,
      });
      checklist.push({
        item: `Высушить ${componentName}`,
        completed: false,
      });
      checklist.push({
        item: `Собрать ${componentName}`,
        completed: false,
      });
    }

    // Add material checklist if specified
    if (schedule.required_materials && schedule.required_materials.length > 0) {
      checklist.push({
        item: `Проверить наличие моющих средств: ${schedule.required_materials.join(', ')}`,
        completed: false,
      });
    }

    // Add final verification
    checklist.push({
      item: 'Проверить работоспособность после мойки',
      completed: false,
    });

    checklist.push({
      item: 'Сделать фото ДО и ПОСЛЕ мойки',
      completed: false,
    });

    return checklist;
  }

  /**
   * Get Russian name for component type
   */
  private getComponentTypeNameRu(componentType: string): string {
    const names: Record<string, string> = {
      hopper: 'бункер',
      grinder: 'гриндер',
      brewer: 'варочную группу',
      mixer: 'миксер',
      cooling_unit: 'холодильник',
      payment_terminal: 'платежный терминал',
      dispenser: 'дозатор',
      pump: 'помпу',
      water_filter: 'фильтр воды',
      coin_acceptor: 'монетоприемник',
      bill_acceptor: 'купюроприемник',
      display: 'дисплей',
      other: 'компонент',
    };

    return names[componentType] || componentType;
  }

  /**
   * Health check - runs every day at midnight
   * Logs statistics about equipment status
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async logEquipmentHealthStats() {
    if (process.env.ENABLE_SCHEDULED_TASKS !== 'true') return;

    this.logger.log('Logging equipment health statistics...');

    try {
      const componentStats = await this.componentsService.getComponentStats();
      const sparePartStats = await this.sparePartsService.getStats();
      const washingStats = await this.washingSchedulesService.getStats();

      this.logger.log('Equipment Health Summary:');
      this.logger.log(`  Components: ${JSON.stringify(componentStats, null, 2)}`);
      this.logger.log(`  Spare Parts: ${JSON.stringify(sparePartStats, null, 2)}`);
      this.logger.log(`  Washing Schedules: ${JSON.stringify(washingStats, null, 2)}`);
    } catch (error) {
      this.logger.error('Error logging equipment health stats:', error);
    }
  }
}
