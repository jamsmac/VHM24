import { Injectable, Logger } from '@nestjs/common';
import { NotificationsService } from '../../notifications/notifications.service';
import { UsersService } from '../../users/users.service';
import { UserRole, UserStatus } from '../../users/entities/user.entity';
import {
  NotificationType,
  NotificationChannel,
} from '../../notifications/entities/notification.entity';
import { EquipmentComponent } from '../entities/equipment-component.entity';
import { SparePart } from '../entities/spare-part.entity';
import { WashingSchedule } from '../entities/washing-schedule.entity';

/**
 * Equipment Notifications Service
 * Handles sending notifications for equipment-related events
 */
@Injectable()
export class EquipmentNotificationsService {
  private readonly logger = new Logger(EquipmentNotificationsService.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Notify about component needing maintenance
   */
  async notifyComponentNeedsMaintenance(
    component: EquipmentComponent,
    recipientUserIds: string[],
  ): Promise<void> {
    if (!recipientUserIds || recipientUserIds.length === 0) {
      this.logger.warn('No recipients for component maintenance notification');
      return;
    }

    const machineNumber = component.machine?.machine_number || component.machine_id;
    const componentName = component.name || component.component_type;

    for (const recipientId of recipientUserIds) {
      try {
        await this.notificationsService.create({
          type: NotificationType.COMPONENT_NEEDS_MAINTENANCE,
          channel: NotificationChannel.IN_APP,
          recipient_id: recipientId,
          title: '🔧 Требуется обслуживание компонента',
          message: `Компонент "${componentName}" (${component.component_type}) аппарата ${machineNumber} требует обслуживания`,
          data: {
            component_id: component.id,
            component_type: component.component_type,
            component_name: componentName,
            machine_id: component.machine_id,
            machine_number: machineNumber,
            last_maintenance_date: component.last_maintenance_date,
            next_maintenance_date: component.next_maintenance_date,
          },
          action_url: `/equipment/components/${component.id}`,
        });

        this.logger.log(
          `Maintenance notification sent for component ${component.id} to user ${recipientId}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to send maintenance notification for component ${component.id}:`,
          error,
        );
      }
    }
  }

  /**
   * Notify about component nearing end of lifetime
   */
  async notifyComponentNearingLifetime(
    component: EquipmentComponent,
    recipientUserIds: string[],
    percentageUsed: number,
  ): Promise<void> {
    if (!recipientUserIds || recipientUserIds.length === 0) {
      this.logger.warn('No recipients for component lifetime notification');
      return;
    }

    const machineNumber = component.machine?.machine_number || component.machine_id;
    const componentName = component.name || component.component_type;

    for (const recipientId of recipientUserIds) {
      try {
        await this.notificationsService.create({
          type: NotificationType.COMPONENT_NEARING_LIFETIME,
          channel: NotificationChannel.IN_APP,
          recipient_id: recipientId,
          title: '⚠️ Компонент близок к выработке ресурса',
          message: `Компонент "${componentName}" аппарата ${machineNumber} выработал ${percentageUsed.toFixed(0)}% ресурса. Рекомендуется замена.`,
          data: {
            component_id: component.id,
            component_type: component.component_type,
            component_name: componentName,
            machine_id: component.machine_id,
            machine_number: machineNumber,
            working_hours: component.working_hours,
            expected_lifetime_hours: component.expected_lifetime_hours,
            percentage_used: percentageUsed,
          },
          action_url: `/equipment/components/${component.id}`,
        });

        this.logger.log(
          `Lifetime notification sent for component ${component.id} to user ${recipientId}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to send lifetime notification for component ${component.id}:`,
          error,
        );
      }
    }
  }

  /**
   * Notify about low stock spare parts
   */
  async notifySparePartLowStock(sparePart: SparePart, recipientUserIds: string[]): Promise<void> {
    if (!recipientUserIds || recipientUserIds.length === 0) {
      this.logger.warn('No recipients for spare part low stock notification');
      return;
    }

    for (const recipientId of recipientUserIds) {
      try {
        await this.notificationsService.create({
          type: NotificationType.SPARE_PART_LOW_STOCK,
          channel: NotificationChannel.IN_APP,
          recipient_id: recipientId,
          title: '📦 Низкий остаток запчасти',
          message: `Запасная часть "${sparePart.name}" (${sparePart.part_number}) - остаток ${sparePart.quantity_in_stock} шт. (мин: ${sparePart.min_stock_level})`,
          data: {
            spare_part_id: sparePart.id,
            part_number: sparePart.part_number,
            name: sparePart.name,
            component_type: sparePart.component_type,
            quantity_in_stock: sparePart.quantity_in_stock,
            min_stock_level: sparePart.min_stock_level,
            supplier_name: sparePart.supplier_name,
            lead_time_days: sparePart.lead_time_days,
          },
          action_url: `/equipment/spare-parts/${sparePart.id}`,
        });

        this.logger.log(
          `Low stock notification sent for spare part ${sparePart.id} to user ${recipientId}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to send low stock notification for spare part ${sparePart.id}:`,
          error,
        );
      }
    }
  }

  /**
   * Notify about overdue washing schedule
   */
  async notifyWashingOverdue(schedule: WashingSchedule, recipientUserIds: string[]): Promise<void> {
    if (!recipientUserIds || recipientUserIds.length === 0) {
      this.logger.warn('No recipients for washing overdue notification');
      return;
    }

    const machineNumber = schedule.machine?.machine_number || schedule.machine_id;
    const daysOverdue = Math.floor(
      (Date.now() - schedule.next_wash_date.getTime()) / (1000 * 60 * 60 * 24),
    );

    for (const recipientId of recipientUserIds) {
      try {
        await this.notificationsService.create({
          type: NotificationType.WASHING_OVERDUE,
          channel: NotificationChannel.IN_APP,
          recipient_id: recipientId,
          title: '🧼 Просрочена мойка оборудования',
          message: `Мойка аппарата ${machineNumber} просрочена на ${daysOverdue} дн. Последняя мойка: ${schedule.last_wash_date?.toLocaleDateString() || 'никогда'}`,
          data: {
            schedule_id: schedule.id,
            machine_id: schedule.machine_id,
            machine_number: machineNumber,
            component_types: schedule.component_types,
            frequency: schedule.frequency,
            next_wash_date: schedule.next_wash_date,
            last_wash_date: schedule.last_wash_date,
            days_overdue: daysOverdue,
          },
          action_url: `/equipment/washing-schedules/${schedule.id}`,
        });

        this.logger.log(
          `Washing overdue notification sent for schedule ${schedule.id} to user ${recipientId}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to send washing overdue notification for schedule ${schedule.id}:`,
          error,
        );
      }
    }
  }

  /**
   * Notify about upcoming washing schedule
   */
  async notifyWashingUpcoming(
    schedule: WashingSchedule,
    recipientUserIds: string[],
    daysUntil: number,
  ): Promise<void> {
    if (!recipientUserIds || recipientUserIds.length === 0) {
      this.logger.warn('No recipients for washing upcoming notification');
      return;
    }

    const machineNumber = schedule.machine?.machine_number || schedule.machine_id;

    for (const recipientId of recipientUserIds) {
      try {
        await this.notificationsService.create({
          type: NotificationType.WASHING_UPCOMING,
          channel: NotificationChannel.IN_APP,
          recipient_id: recipientId,
          title: '🧼 Предстоит мойка оборудования',
          message: `Мойка аппарата ${machineNumber} запланирована через ${daysUntil} дн. (${schedule.next_wash_date.toLocaleDateString()})`,
          data: {
            schedule_id: schedule.id,
            machine_id: schedule.machine_id,
            machine_number: machineNumber,
            component_types: schedule.component_types,
            frequency: schedule.frequency,
            next_wash_date: schedule.next_wash_date,
            days_until: daysUntil,
          },
          action_url: `/equipment/washing-schedules/${schedule.id}`,
        });

        this.logger.log(
          `Washing upcoming notification sent for schedule ${schedule.id} to user ${recipientId}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to send washing upcoming notification for schedule ${schedule.id}:`,
          error,
        );
      }
    }
  }

  /**
   * Get maintenance team user IDs
   *
   * Returns all users with TECHNICIAN role who are active
   *
   * @returns Array of user IDs for maintenance team members
   */
  async getMaintenanceTeamUserIds(): Promise<string[]> {
    try {
      // Get all active technicians
      const allUsers = await this.usersService.findAll();
      const technicians = allUsers.filter(
        (user) => user.role === UserRole.TECHNICIAN && user.status === UserStatus.ACTIVE,
      );

      this.logger.log(`Found ${technicians.length} active technicians`);

      return technicians.map((user) => user.id);
    } catch (error) {
      this.logger.error('Failed to get maintenance team user IDs:', error.message);
      return [];
    }
  }
}
