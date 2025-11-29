import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, Not, IsNull } from 'typeorm';
import { Task, TaskStatus } from '../modules/tasks/entities/task.entity';
import { MachineInventory } from '../modules/inventory/entities/machine-inventory.entity';
import { WarehouseInventory } from '../modules/inventory/entities/warehouse-inventory.entity';
import { NotificationsService } from '../modules/notifications/notifications.service';
import {
  NotificationType,
  NotificationChannel,
  NotificationStatus,
} from '../modules/notifications/entities/notification.entity';
import { Notification } from '../modules/notifications/entities/notification.entity';
import { MachinesService } from '../modules/machines/machines.service';
import { IncidentsService } from '../modules/incidents/incidents.service';
import {
  IncidentType,
  IncidentStatus,
  IncidentPriority,
} from '../modules/incidents/entities/incident.entity';
import { InventoryService } from '../modules/inventory/inventory.service';
import { InventoryCalculationService } from '../modules/inventory/services/inventory-calculation.service';
import { ComplaintsService } from '../modules/complaints/complaints.service';
import { ComplaintStatus } from '../modules/complaints/entities/complaint.entity';
import { InventoryBatchService } from '../modules/warehouse/services/inventory-batch.service';
import { WarehouseService } from '../modules/warehouse/services/warehouse.service';
import { TransactionsService } from '../modules/transactions/transactions.service';
import {
  TransactionType,
  ExpenseCategory,
} from '../modules/transactions/entities/transaction.entity';
import { Machine } from '../modules/machines/entities/machine.entity';
import { CommissionSchedulerService } from '../modules/counterparty/services/commission-scheduler.service';
import { OperatorRatingsService } from '../modules/operator-ratings/operator-ratings.service';
import { Nomenclature } from '../modules/nomenclature/entities/nomenclature.entity';
import { InventoryLevelType } from '../modules/inventory/entities/inventory-actual-count.entity';
import { startOfDay, endOfDay, subDays } from 'date-fns';

/**
 * Scheduled Tasks Service
 * Handles periodic background jobs:
 * - Overdue task notifications
 * - Low stock alerts
 * - Failed notification retries
 * - Machine connectivity monitoring
 * - Offline incident creation
 * - Operator rating calculations
 * - Inventory balance pre-calculation
 */
@Injectable()
export class ScheduledTasksService {
  private readonly logger = new Logger(ScheduledTasksService.name);

  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(MachineInventory)
    private readonly machineInventoryRepository: Repository<MachineInventory>,
    @InjectRepository(WarehouseInventory)
    private readonly warehouseInventoryRepository: Repository<WarehouseInventory>,
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(Machine)
    private readonly machineRepository: Repository<Machine>,
    @InjectRepository(Nomenclature)
    private readonly nomenclatureRepository: Repository<Nomenclature>,
    private readonly notificationsService: NotificationsService,
    private readonly machinesService: MachinesService,
    private readonly incidentsService: IncidentsService,
    private readonly inventoryService: InventoryService,
    private readonly inventoryCalculationService: InventoryCalculationService,
    private readonly complaintsService: ComplaintsService,
    private readonly inventoryBatchService: InventoryBatchService,
    private readonly warehouseService: WarehouseService,
    private readonly transactionsService: TransactionsService,
    private readonly commissionSchedulerService: CommissionSchedulerService,
    private readonly operatorRatingsService: OperatorRatingsService,
  ) {}

  /**
   * Check for overdue tasks every hour
   * - Sends notifications to assigned users
   * - Creates incidents for tasks overdue > 48 hours
   */
  @Cron(CronExpression.EVERY_HOUR)
  async checkOverdueTasks() {
    if (process.env.ENABLE_SCHEDULED_TASKS !== 'true') return;

    this.logger.log('Checking for overdue tasks...');

    const overdueTasks = await this.taskRepository.find({
      where: {
        due_date: LessThan(new Date()),
        status: TaskStatus.IN_PROGRESS,
      },
      relations: ['assigned_to', 'machine'],
    });

    this.logger.log(`Found ${overdueTasks.length} overdue tasks`);

    let incidentsCreated = 0;

    for (const task of overdueTasks) {
      if (!task.due_date) continue;

      const overdueHours = Math.floor((Date.now() - task.due_date.getTime()) / (1000 * 60 * 60));

      // Send notification to assigned user
      if (task.assigned_to_user_id) {
        try {
          await this.notificationsService.create({
            type: NotificationType.TASK_OVERDUE,
            channel: NotificationChannel.IN_APP,
            recipient_id: task.assigned_to_user_id,
            title: '⚠️ Задача просрочена',
            message: `Задача ${task.type_code} для аппарата ${task.machine?.machine_number || task.machine_id} просрочена на ${overdueHours} часов`,
            data: {
              task_id: task.id,
              due_date: task.due_date,
              overdue_hours: overdueHours,
            },
            action_url: `/tasks/${task.id}`,
          });
        } catch (error) {
          this.logger.error(
            `Failed to send overdue notification for task ${task.id}:`,
            error.message,
          );
        }
      }

      // Create incident if overdue > 48 hours
      if (overdueHours >= 48) {
        try {
          // Check if incident already exists for this task
          const existingIncidents = await this.incidentsService.findAll(
            undefined,
            undefined,
            task.machine_id,
          );

          const hasIncidentForTask = existingIncidents.some(
            (incident) => incident.metadata?.task_id === task.id,
          );

          if (!hasIncidentForTask) {
            await this.incidentsService.create({
              incident_type: IncidentType.OTHER,
              priority: overdueHours > 72 ? IncidentPriority.HIGH : IncidentPriority.MEDIUM,
              machine_id: task.machine_id,
              title: `Просроченная задача: ${task.type_code}`,
              description:
                `Задача ${task.type_code} для аппарата ${task.machine?.machine_number || task.machine_id} просрочена на ${overdueHours} часов.\n` +
                `Назначена: ${task.assigned_to?.full_name || 'Не назначена'}\n` +
                `Срок выполнения: ${task.due_date?.toLocaleString('ru-RU')}\n` +
                `Требуется немедленное вмешательство.`,
              reported_by_user_id: undefined,
              metadata: {
                task_id: task.id,
                overdue_hours: overdueHours,
                auto_created: true,
                created_by_cron: true,
              },
            });

            incidentsCreated++;
            this.logger.log(
              `Created incident for overdue task ${task.id} (${overdueHours}h overdue)`,
            );
          }
        } catch (error) {
          this.logger.error(
            `Failed to create incident for overdue task ${task.id}:`,
            error.message,
          );
        }
      }
    }

    if (incidentsCreated > 0) {
      this.logger.log(`Created ${incidentsCreated} incidents for overdue tasks`);
    }
  }

  /**
   * Check for low stock in machines every 6 hours
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  async checkLowStockMachines() {
    if (process.env.ENABLE_SCHEDULED_TASKS !== 'true') return;

    this.logger.log('Checking for low stock in machines...');

    const lowStockItems = await this.machineInventoryRepository
      .createQueryBuilder('inventory')
      .leftJoinAndSelect('inventory.machine', 'machine')
      .leftJoinAndSelect('inventory.nomenclature', 'nomenclature')
      .where('inventory.current_quantity <= inventory.min_stock_level')
      .andWhere('inventory.min_stock_level > 0')
      .getMany();

    this.logger.log(`Found ${lowStockItems.length} low stock items`);

    // Group by machine
    const machineGroups = new Map<string, typeof lowStockItems>();
    for (const item of lowStockItems) {
      const items = machineGroups.get(item.machine_id) || [];
      items.push(item);
      machineGroups.set(item.machine_id, items);
    }

    // Send notification per machine (avoid spam)
    for (const [machineId, items] of machineGroups) {
      const machine = items[0].machine;
      const itemsList = items
        .map((i) => `- ${i.nomenclature?.name}: ${i.current_quantity}/${i.min_stock_level}`)
        .join('\n');

      try {
        // TODO: Notify assigned operator or manager
        // For now, we'll log it
        this.logger.warn(`Low stock in machine ${machine.machine_number}:\n${itemsList}`);

        // Create notification (would need to determine recipient)
        // await this.notificationsService.create({
        //   type: NotificationType.LOW_STOCK_MACHINE,
        //   channel: NotificationChannel.IN_APP,
        //   recipient_id: machine.assigned_operator_id || 'admin_id',
        //   title: '📦 Низкий запас товара',
        //   message: `Аппарат ${machine.machine_number}: необходимо пополнение`,
        //   data: { machine_id: machineId, items_count: items.length },
        // });
      } catch (error) {
        this.logger.error(
          `Failed to send low stock notification for machine ${machineId}:`,
          error.message,
        );
      }
    }
  }

  /**
   * Check for low stock in warehouse every 6 hours
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  async checkLowStockWarehouse() {
    if (process.env.ENABLE_SCHEDULED_TASKS !== 'true') return;

    this.logger.log('Checking for low stock in warehouse...');

    const lowStockItems = await this.warehouseInventoryRepository
      .createQueryBuilder('inventory')
      .leftJoinAndSelect('inventory.nomenclature', 'nomenclature')
      .where('inventory.current_quantity <= inventory.min_stock_level')
      .andWhere('inventory.min_stock_level > 0')
      .getMany();

    this.logger.log(`Found ${lowStockItems.length} low stock warehouse items`);

    if (lowStockItems.length > 0) {
      const itemsList = lowStockItems
        .map((i) => `- ${i.nomenclature?.name}: ${i.current_quantity}/${i.min_stock_level}`)
        .join('\n');

      this.logger.warn(`Low stock in warehouse:\n${itemsList}`);

      // TODO: Notify purchasing manager
      // await this.notificationsService.create({
      //   type: NotificationType.LOW_STOCK_WAREHOUSE,
      //   channel: NotificationChannel.IN_APP,
      //   recipient_id: 'purchasing_manager_id',
      //   title: '📦 Низкий запас на складе',
      //   message: `Требуется закупка ${lowStockItems.length} позиций`,
      //   data: { items_count: lowStockItems.length },
      // });
    }
  }

  /**
   * Retry failed notifications every 5 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async retryFailedNotifications() {
    if (process.env.ENABLE_SCHEDULED_TASKS !== 'true') return;

    this.logger.log('Retrying failed notifications...');

    try {
      await this.notificationsService.retryFailedNotifications();
      this.logger.log('Failed notifications retry completed');
    } catch (error) {
      this.logger.error('Failed to retry notifications:', error.message);
    }
  }

  /**
   * Clean up old read notifications (monthly)
   */
  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async cleanupOldNotifications() {
    if (process.env.ENABLE_SCHEDULED_TASKS !== 'true') return;

    this.logger.log('Cleaning up old notifications...');

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await this.notificationRepository
      .createQueryBuilder()
      .softDelete()
      .where('status = :status', { status: NotificationStatus.READ })
      .andWhere('read_at < :date', { date: thirtyDaysAgo })
      .execute();

    this.logger.log(`Cleaned up ${result.affected || 0} old notifications`);
  }

  /**
   * Monitor machine connectivity every 5 minutes
   * Updates online/offline status based on last_ping_at
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async monitorMachineConnectivity() {
    if (process.env.ENABLE_SCHEDULED_TASKS !== 'true') return;

    this.logger.log('Monitoring machine connectivity...');

    try {
      const stats = await this.machinesService.updateConnectivityStatus();

      this.logger.log(
        `Connectivity check complete: ${stats.total} total, ${stats.online} online, ${stats.offline} offline (${stats.updated} newly offline)`,
      );

      // If machines went offline, log details
      if (stats.updated > 0) {
        this.logger.warn(`${stats.updated} machines marked offline`);
      }
    } catch (error) {
      this.logger.error('Failed to update connectivity status:', error.message);
    }
  }

  /**
   * Create incidents for machines that have been offline for more than 30 minutes
   * Runs every 30 minutes
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async createOfflineIncidents() {
    if (process.env.ENABLE_SCHEDULED_TASKS !== 'true') return;

    this.logger.log('Checking for prolonged offline machines...');

    try {
      const offlineMachines = await this.machinesService.getOfflineMachines(30);

      this.logger.log(`Found ${offlineMachines.length} machines offline for >30 minutes`);

      for (const machine of offlineMachines) {
        // Check if an incident already exists for this machine
        const existingIncident = await this.incidentsService.findAll(
          undefined,
          undefined,
          machine.id,
        );

        const hasOpenOfflineIncident = existingIncident.some(
          (inc) =>
            inc.incident_type === IncidentType.TECHNICAL_FAILURE &&
            (inc.status === IncidentStatus.OPEN || inc.status === IncidentStatus.IN_PROGRESS),
        );

        if (!hasOpenOfflineIncident) {
          // Create new offline incident
          await this.incidentsService.create({
            machine_id: machine.id,
            incident_type: IncidentType.TECHNICAL_FAILURE,
            priority: IncidentPriority.HIGH,
            title: `Аппарат недоступен`,
            description: `Аппарат ${machine.machine_number} недоступен более 30 минут. Последний пинг: ${machine.last_ping_at?.toLocaleString('ru-RU') || 'никогда'}`,
          });

          this.logger.warn(`Created offline incident for machine ${machine.machine_number}`);
        }
      }
    } catch (error) {
      this.logger.error('Failed to create offline incidents:', error.message);
    }
  }

  /**
   * Expire old inventory reservations every hour
   *
   * Automatically cancels reservations that have exceeded their expiration time.
   * This prevents inventory from being locked indefinitely.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async expireOldReservations() {
    if (process.env.ENABLE_SCHEDULED_TASKS !== 'true') return;

    try {
      this.logger.log('Checking for expired inventory reservations...');

      const expiredCount = await this.inventoryService.expireOldReservations();

      if (expiredCount > 0) {
        this.logger.log(`Expired ${expiredCount} old inventory reservation(s)`);
      } else {
        this.logger.debug('No expired reservations found');
      }
    } catch (error) {
      this.logger.error('Failed to expire old reservations:', error.message);
    }
  }

  /**
   * Check SLA violations for complaints - runs every hour
   * SLA: 2 hours for acknowledgment of customer complaints
   * Sends escalation notifications to managers if SLA is breached
   */
  @Cron(CronExpression.EVERY_HOUR)
  async checkComplaintSLA() {
    if (process.env.ENABLE_SCHEDULED_TASKS !== 'true') return;

    this.logger.log('Checking complaint SLA violations...');

    try {
      // Get all NEW complaints (not yet acknowledged)
      const newComplaints = await this.complaintsService.findAll(ComplaintStatus.NEW);

      this.logger.log(`Found ${newComplaints.length} new complaints to check`);

      const SLA_HOURS = 2;
      const slaDeadline = new Date();
      slaDeadline.setHours(slaDeadline.getHours() - SLA_HOURS);

      let violationsFound = 0;

      for (const complaint of newComplaints) {
        // Check if submitted_at is older than SLA_HOURS
        if (complaint.submitted_at < slaDeadline) {
          const hoursOverdue = Math.floor(
            (Date.now() - complaint.submitted_at.getTime()) / (1000 * 60 * 60),
          );

          violationsFound++;

          // Send escalation notification to managers/admins
          try {
            // Get all admin/manager user IDs
            // For now, we'll send to the system - in production this should go to specific managers
            await this.notificationsService.create({
              type: NotificationType.OTHER,
              channel: NotificationChannel.IN_APP,
              recipient_id: process.env.ADMIN_USER_ID || 'system', // TODO: Get actual admin users
              title: '🚨 SLA нарушен: Жалоба без реакции',
              message:
                `Жалоба от клиента не обработана ${hoursOverdue} часов!\n` +
                `Машина: ${complaint.machine?.machine_number || complaint.machine_id}\n` +
                `Тип: ${complaint.complaint_type}\n` +
                `SLA: ${SLA_HOURS} часа\n` +
                `Требуется немедленная обработка!`,
              data: {
                complaint_id: complaint.id,
                hours_overdue: hoursOverdue,
                sla_hours: SLA_HOURS,
                machine_id: complaint.machine_id,
              },
              action_url: `/complaints/${complaint.id}`,
            });

            this.logger.warn(
              `SLA violation for complaint ${complaint.id}: ${hoursOverdue}h without acknowledgment`,
            );
          } catch (error) {
            this.logger.error(
              `Failed to send SLA violation notification for complaint ${complaint.id}:`,
              error.message,
            );
          }
        }
      }

      if (violationsFound > 0) {
        this.logger.log(`Found ${violationsFound} complaint SLA violations`);
      } else {
        this.logger.debug('No complaint SLA violations found');
      }
    } catch (error) {
      this.logger.error('Error checking complaint SLA:', error.message);
    }
  }

  /**
   * Check for expiring stock in warehouses - runs daily at 9:00 AM
   * Alerts when batches are expiring within 30 days
   * Sends notifications to warehouse managers
   */
  @Cron('0 9 * * *') // Every day at 9:00 AM
  async checkExpiringStock() {
    if (process.env.ENABLE_SCHEDULED_TASKS !== 'true') return;

    this.logger.log('Checking for expiring inventory batches...');

    try {
      // Get all active warehouses
      const warehouses = await this.warehouseService.findAll();

      this.logger.log(`Checking ${warehouses.length} warehouse(s) for expiring stock`);

      const EXPIRY_WARNING_DAYS = 30;
      let totalExpiringBatches = 0;

      for (const warehouse of warehouses) {
        try {
          // Get batches expiring within 30 days
          const expiringBatches = await this.inventoryBatchService.getExpiringBatches(
            warehouse.id,
            EXPIRY_WARNING_DAYS,
          );

          if (expiringBatches.length > 0) {
            totalExpiringBatches += expiringBatches.length;

            // Group batches by days until expiry
            const urgent = expiringBatches.filter((b) => {
              if (!b.expiry_date) return false;
              const daysLeft = Math.floor(
                (b.expiry_date.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
              );
              return daysLeft <= 7;
            });

            const warning = expiringBatches.filter((b) => {
              if (!b.expiry_date) return false;
              const daysLeft = Math.floor(
                (b.expiry_date.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
              );
              return daysLeft > 7 && daysLeft <= 30;
            });

            this.logger.warn(
              `Warehouse ${warehouse.name}: ${expiringBatches.length} batches expiring soon ` +
                `(${urgent.length} urgent, ${warning.length} warning)`,
            );

            // Send notification to warehouse manager
            // TODO: Get actual warehouse manager user ID
            const message =
              `Складе "${warehouse.name}" имеются товары с истекающим сроком годности:\n\n` +
              `🔴 Срочно (≤7 дней): ${urgent.length} партий\n` +
              `🟡 Предупреждение (≤30 дней): ${warning.length} партий\n\n` +
              `Требуется проверка и возможное списание.`;

            await this.notificationsService.create({
              type: NotificationType.OTHER,
              channel: NotificationChannel.IN_APP,
              recipient_id: process.env.WAREHOUSE_MANAGER_ID || 'admin', // TODO: Get actual manager
              title: `⏰ Истекает срок годности - ${warehouse.name}`,
              message,
              data: {
                warehouse_id: warehouse.id,
                warehouse_name: warehouse.name,
                urgent_count: urgent.length,
                warning_count: warning.length,
                total_expiring: expiringBatches.length,
              },
              action_url: `/warehouses/${warehouse.id}/batches?filter=expiring`,
            });
          }
        } catch (error) {
          this.logger.error(
            `Failed to check expiring stock for warehouse ${warehouse.id}:`,
            error.message,
          );
        }
      }

      if (totalExpiringBatches > 0) {
        this.logger.log(
          `Found ${totalExpiringBatches} total batches expiring within ${EXPIRY_WARNING_DAYS} days`,
        );
      } else {
        this.logger.debug('No expiring batches found');
      }
    } catch (error) {
      this.logger.error('Error checking expiring stock:', error.message);
    }
  }

  /**
   * Automatically write off expired stock - runs daily at 3:00 AM
   * Marks expired batches as inactive and sets quantity to 0
   * Creates audit trail in batch metadata
   */
  @Cron('0 3 * * *') // Every day at 3:00 AM
  async writeOffExpiredStock() {
    if (process.env.ENABLE_SCHEDULED_TASKS !== 'true') return;

    this.logger.log('Writing off expired inventory batches...');

    try {
      // Get all active warehouses
      const warehouses = await this.warehouseService.findAll();

      this.logger.log(`Checking ${warehouses.length} warehouse(s) for expired stock`);

      let totalWrittenOff = 0;

      for (const warehouse of warehouses) {
        try {
          const writeOffResult = await this.inventoryBatchService.writeOffExpiredStock(
            warehouse.id,
          );

          if (writeOffResult.batches_processed > 0) {
            totalWrittenOff += writeOffResult.batches_processed;

            this.logger.warn(
              `Warehouse ${warehouse.name}: Wrote off ${writeOffResult.batches_processed} expired batch(es) ` +
                `(${writeOffResult.total_quantity_written_off} units, value: ${writeOffResult.total_value_written_off.toFixed(2)})`,
            );

            // Send notification about automatic write-off
            await this.notificationsService.create({
              type: NotificationType.OTHER,
              channel: NotificationChannel.IN_APP,
              recipient_id: process.env.WAREHOUSE_MANAGER_ID || 'admin', // TODO: Get actual manager
              title: `📦 Автоматическое списание - ${warehouse.name}`,
              message:
                `Автоматически списано ${writeOffResult.batches_processed} партий с истекшим сроком годности.\n\n` +
                `Склад: ${warehouse.name}\n` +
                `Количество: ${writeOffResult.total_quantity_written_off} единиц\n` +
                `Стоимость: ${writeOffResult.total_value_written_off.toFixed(2)}\n` +
                `Дата: ${new Date().toLocaleDateString('ru-RU')}\n\n` +
                `Проверьте отчет по списанию.`,
              data: {
                warehouse_id: warehouse.id,
                warehouse_name: warehouse.name,
                batches_processed: writeOffResult.batches_processed,
                quantity_written_off: writeOffResult.total_quantity_written_off,
                value_written_off: writeOffResult.total_value_written_off,
                auto_writeoff: true,
              },
              action_url: `/warehouses/${warehouse.id}/writeoffs`,
            });
          }
        } catch (error) {
          this.logger.error(
            `Failed to write off expired stock for warehouse ${warehouse.id}:`,
            error.message,
          );
        }
      }

      if (totalWrittenOff > 0) {
        this.logger.log(`Total ${totalWrittenOff} expired batches written off`);
      } else {
        this.logger.debug('No expired batches to write off');
      }
    } catch (error) {
      this.logger.error('Error writing off expired stock:', error.message);
    }
  }

  /**
   * Calculate and record monthly depreciation for all machines - runs on 1st day of month at 2:00 AM
   * Formula: monthly_depreciation = purchase_price / (depreciation_years * 12)
   * Creates EXPENSE transaction for each machine with depreciation
   */
  @Cron('0 2 1 * *') // Every 1st day of month at 2:00 AM
  async calculateMonthlyDepreciation() {
    if (process.env.ENABLE_SCHEDULED_TASKS !== 'true') return;

    this.logger.log('Calculating monthly depreciation for machines...');

    try {
      // Get all machines with depreciation info
      const machines = await this.machineRepository.find({
        where: {
          purchase_price: Not(IsNull()),
          depreciation_years: Not(IsNull()),
        },
        relations: ['location'],
      });

      this.logger.log(`Found ${machines.length} machine(s) with depreciation settings`);

      const currentDate = new Date();
      const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

      let totalDepreciated = 0;
      let machinesDepreciated = 0;

      for (const machine of machines) {
        try {
          // Skip if already depreciated this month
          if (machine.last_depreciation_date) {
            const lastDepreciationMonth = `${machine.last_depreciation_date.getFullYear()}-${String(machine.last_depreciation_date.getMonth() + 1).padStart(2, '0')}`;
            if (lastDepreciationMonth === currentMonth) {
              this.logger.debug(
                `Machine ${machine.machine_number} already depreciated this month, skipping`,
              );
              continue;
            }
          }

          // Check if fully depreciated
          const purchasePrice = Number(machine.purchase_price);
          const accumulatedDepreciation = Number(machine.accumulated_depreciation || 0);

          if (accumulatedDepreciation >= purchasePrice) {
            this.logger.debug(`Machine ${machine.machine_number} is fully depreciated, skipping`);
            continue;
          }

          // Calculate monthly depreciation
          const depreciationYears = Number(machine.depreciation_years);
          const monthlyDepreciation = purchasePrice / (depreciationYears * 12);

          // Don't exceed purchase price
          const remainingValue = purchasePrice - accumulatedDepreciation;
          const depreciationAmount = Math.min(monthlyDepreciation, remainingValue);

          // Create depreciation transaction
          await this.transactionsService.create({
            transaction_type: TransactionType.EXPENSE,
            expense_category: ExpenseCategory.DEPRECIATION,
            amount: depreciationAmount,
            machine_id: machine.id,
            transaction_date: currentDate.toISOString(),
            description:
              `Амортизация за ${currentDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })} - ${machine.machine_number}\n` +
              `Первоначальная стоимость: ${purchasePrice.toFixed(2)}\n` +
              `Срок амортизации: ${depreciationYears} лет\n` +
              `Месячная амортизация: ${monthlyDepreciation.toFixed(2)}\n` +
              `Накопленная амортизация: ${(accumulatedDepreciation + depreciationAmount).toFixed(2)}`,
            metadata: {
              auto_generated: true,
              depreciation_type: 'monthly',
              purchase_price: purchasePrice,
              depreciation_years: depreciationYears,
              monthly_amount: monthlyDepreciation,
              accumulated_before: accumulatedDepreciation,
              accumulated_after: accumulatedDepreciation + depreciationAmount,
              remaining_value: remainingValue - depreciationAmount,
            },
          });

          // Update machine depreciation tracking
          machine.accumulated_depreciation = accumulatedDepreciation + depreciationAmount;
          machine.last_depreciation_date = currentDate;
          await this.machineRepository.save(machine);

          totalDepreciated += depreciationAmount;
          machinesDepreciated++;

          this.logger.log(
            `Depreciated machine ${machine.machine_number}: ${depreciationAmount.toFixed(2)} ` +
              `(total accumulated: ${machine.accumulated_depreciation.toFixed(2)} / ${purchasePrice.toFixed(2)})`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to calculate depreciation for machine ${machine.id}:`,
            error.message,
          );
        }
      }

      if (machinesDepreciated > 0) {
        this.logger.log(
          `Monthly depreciation completed: ${machinesDepreciated} machine(s), ` +
            `total amount: ${totalDepreciated.toFixed(2)}`,
        );

        // Send summary notification to financial manager
        await this.notificationsService.create({
          type: NotificationType.OTHER,
          channel: NotificationChannel.IN_APP,
          recipient_id: process.env.FINANCE_MANAGER_ID || 'admin', // TODO: Get actual finance manager
          title: `📊 Амортизация за ${currentDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}`,
          message:
            `Автоматически начислена амортизация оборудования:\n\n` +
            `Аппаратов: ${machinesDepreciated}\n` +
            `Общая сумма: ${totalDepreciated.toFixed(2)} UZS\n` +
            `Дата: ${currentDate.toLocaleDateString('ru-RU')}\n\n` +
            `Проверьте финансовые отчеты.`,
          data: {
            month: currentMonth,
            machines_count: machinesDepreciated,
            total_amount: totalDepreciated,
            auto_generated: true,
          },
          action_url: `/transactions?type=expense&category=depreciation&month=${currentMonth}`,
        });
      } else {
        this.logger.debug('No machines required depreciation this month');
      }
    } catch (error) {
      this.logger.error('Error calculating monthly depreciation:', error.message);
    }
  }

  /**
   * Calculate monthly commissions for location owners - runs on 2nd day of month at 4:00 AM
   * Processes previous month's revenue and creates commission calculations
   * for all active contracts with monthly/quarterly payment periods
   */
  @Cron('0 4 2 * *') // Every 2nd day of month at 4:00 AM (after sales data is finalized)
  async calculateMonthlyCommissions() {
    if (process.env.ENABLE_SCHEDULED_TASKS !== 'true') return;

    this.logger.log('Starting monthly commission calculation...');

    try {
      const calculatedCount = await this.commissionSchedulerService.calculateMonthlyCommissions();

      if (calculatedCount > 0) {
        this.logger.log(
          `Monthly commission calculation completed: ${calculatedCount} contract(s) processed`,
        );

        // Send notification to financial manager
        await this.notificationsService.create({
          type: NotificationType.OTHER,
          channel: NotificationChannel.IN_APP,
          recipient_id: process.env.FINANCE_MANAGER_ID || 'admin', // TODO: Get actual finance manager
          title: '📊 Комиссии за предыдущий месяц рассчитаны',
          message:
            `Автоматически рассчитаны комиссии владельцам локаций:\n\n` +
            `Договоров обработано: ${calculatedCount}\n` +
            `Период: предыдущий месяц\n\n` +
            `Проверьте детали расчета и сроки оплаты.`,
          data: {
            calculated_count: calculatedCount,
            auto_generated: true,
          },
          action_url: `/commissions?status=pending`,
        });
      } else {
        this.logger.debug('No contracts required commission calculation');
      }
    } catch (error) {
      this.logger.error('Error calculating monthly commissions:', error.message);
    }
  }

  /**
   * Check and update overdue commission payments - runs daily at 10:00 AM
   * Marks pending commission payments as overdue if past their due date
   * Sends notifications to managers about overdue payments
   */
  @Cron('0 10 * * *') // Every day at 10:00 AM
  async checkOverdueCommissions() {
    if (process.env.ENABLE_SCHEDULED_TASKS !== 'true') return;

    this.logger.log('Checking for overdue commission payments...');

    try {
      const overdueCount = await this.commissionSchedulerService.checkAndUpdateOverduePayments();

      if (overdueCount > 0) {
        this.logger.warn(`Marked ${overdueCount} commission payment(s) as overdue`);

        // Get overdue payment details
        const overduePayments = await this.commissionSchedulerService.getOverduePayments();

        // Build summary message
        const summaryLines = overduePayments.slice(0, 5).map((payment) => {
          const daysOverdue = Math.abs(payment.getDaysUntilDue() || 0);
          return `- ${payment.contract?.contract_number || 'N/A'}: ${Number(payment.commission_amount).toFixed(2)} UZS (${daysOverdue} дней просрочки)`;
        });

        const moreCount = overduePayments.length > 5 ? overduePayments.length - 5 : 0;
        const summary = summaryLines.join('\n') + (moreCount > 0 ? `\n... и еще ${moreCount}` : '');

        // Send notification to financial manager
        await this.notificationsService.create({
          type: NotificationType.OTHER,
          channel: NotificationChannel.IN_APP,
          recipient_id: process.env.FINANCE_MANAGER_ID || 'admin', // TODO: Get actual finance manager
          title: `🚨 Просроченные комиссионные платежи: ${overdueCount}`,
          message:
            `Обнаружены просроченные платежи по комиссиям:\n\n` +
            `${summary}\n\n` +
            `Требуется немедленная оплата.`,
          data: {
            overdue_count: overdueCount,
            auto_generated: true,
          },
          action_url: `/commissions?status=overdue`,
        });
      } else {
        this.logger.debug('No overdue commission payments found');
      }
    } catch (error) {
      this.logger.error('Error checking overdue commissions:', error.message);
    }
  }

  /**
   * Calculate daily operator ratings - runs every night at 1:00 AM
   * Calculates performance metrics for all operators for the previous day
   * Based on 5 weighted metrics:
   * - Timeliness (30%)
   * - Photo quality (25%)
   * - Data accuracy (20%)
   * - Customer feedback (15%)
   * - Discipline (10%)
   */
  @Cron('0 1 * * *') // Every day at 1:00 AM
  async calculateOperatorRatings() {
    if (process.env.ENABLE_SCHEDULED_TASKS !== 'true') return;

    this.logger.log('Starting daily operator rating calculation...');

    try {
      // Calculate for previous day
      const yesterday = subDays(new Date(), 1);
      const periodStart = startOfDay(yesterday);
      const periodEnd = endOfDay(yesterday);

      this.logger.log(
        `Calculating ratings for period: ${periodStart.toISOString()} to ${periodEnd.toISOString()}`,
      );

      const ratings = await this.operatorRatingsService.calculateRatingsForPeriod(
        periodStart,
        periodEnd,
      );

      this.logger.log(`Operator rating calculation completed: ${ratings.length} operator(s) rated`);

      // Send notifications to operators about their new ratings
      for (const rating of ratings) {
        try {
          // Determine emoji based on grade
          let emoji = '📊';
          if (rating.rating_grade === 'excellent') emoji = '🌟';
          else if (rating.rating_grade === 'good') emoji = '👍';
          else if (rating.rating_grade === 'average') emoji = '📊';
          else if (rating.rating_grade === 'poor') emoji = '⚠️';
          else if (rating.rating_grade === 'very_poor') emoji = '🚨';

          // Translate grade to Russian
          let gradeRu = 'Не оценен';
          if (rating.rating_grade === 'excellent') gradeRu = 'Отлично';
          else if (rating.rating_grade === 'good') gradeRu = 'Хорошо';
          else if (rating.rating_grade === 'average') gradeRu = 'Удовлетворительно';
          else if (rating.rating_grade === 'poor') gradeRu = 'Плохо';
          else if (rating.rating_grade === 'very_poor') gradeRu = 'Очень плохо';

          await this.notificationsService.create({
            type: NotificationType.OTHER,
            channel: NotificationChannel.IN_APP,
            recipient_id: rating.operator_id,
            title: `${emoji} Ваш рейтинг за ${periodStart.toLocaleDateString('ru-RU')}`,
            message:
              `Ваш рейтинг производительности обновлен:\n\n` +
              `Общий балл: ${rating.overall_score.toFixed(1)}/100\n` +
              `Оценка: ${gradeRu}\n` +
              `Место в рейтинге: ${rating.rank}\n\n` +
              `Своевременность: ${rating.timeliness_score.toFixed(1)}/100\n` +
              `Фото: ${rating.photo_quality_score.toFixed(1)}/100\n` +
              `Точность данных: ${rating.data_accuracy_score.toFixed(1)}/100\n` +
              `Обратная связь: ${rating.customer_feedback_score.toFixed(1)}/100\n` +
              `Дисциплина: ${rating.discipline_score.toFixed(1)}/100`,
            data: {
              rating_id: rating.id,
              overall_score: rating.overall_score,
              grade: rating.rating_grade,
              rank: rating.rank,
              period_start: periodStart,
              period_end: periodEnd,
            },
            action_url: `/my-ratings`,
          });

          // Mark notification as sent
          rating.notification_sent_at = new Date();
          await this.operatorRatingsService['ratingRepository'].save(rating);
        } catch (error) {
          this.logger.error(
            `Failed to send rating notification to operator ${rating.operator_id}:`,
            error.message,
          );
        }
      }

      // Send summary to admin
      if (ratings.length > 0) {
        const avgScore = ratings.reduce((sum, r) => sum + r.overall_score, 0) / ratings.length;

        const excellentCount = ratings.filter((r) => r.rating_grade === 'excellent').length;
        const goodCount = ratings.filter((r) => r.rating_grade === 'good').length;
        const averageCount = ratings.filter((r) => r.rating_grade === 'average').length;
        const poorCount = ratings.filter((r) => r.rating_grade === 'poor').length;
        const veryPoorCount = ratings.filter((r) => r.rating_grade === 'very_poor').length;

        await this.notificationsService.create({
          type: NotificationType.OTHER,
          channel: NotificationChannel.IN_APP,
          recipient_id: process.env.ADMIN_USER_ID || 'admin',
          title: `📊 Рейтинги операторов обновлены`,
          message:
            `Рассчитаны рейтинги за ${periodStart.toLocaleDateString('ru-RU')}:\n\n` +
            `Всего операторов: ${ratings.length}\n` +
            `Средний балл: ${avgScore.toFixed(1)}/100\n\n` +
            `Распределение:\n` +
            `🌟 Отлично: ${excellentCount}\n` +
            `👍 Хорошо: ${goodCount}\n` +
            `📊 Удовлетворительно: ${averageCount}\n` +
            `⚠️ Плохо: ${poorCount}\n` +
            `🚨 Очень плохо: ${veryPoorCount}`,
          data: {
            period_start: periodStart,
            period_end: periodEnd,
            total_operators: ratings.length,
            avg_score: avgScore,
          },
          action_url: `/operator-ratings`,
        });
      }
    } catch (error) {
      this.logger.error('Error calculating operator ratings:', error.message);
    }
  }

  /**
   * Pre-calculate inventory balances for all nomenclature at all levels
   * Runs daily at 2:30 AM to prepare cached calculations for reports
   * Significantly improves performance of inventory difference reports
   */
  @Cron('30 2 * * *') // Every day at 2:30 AM
  async preCalculateInventoryBalances() {
    if (process.env.ENABLE_SCHEDULED_TASKS !== 'true') return;

    this.logger.log('Starting inventory balance pre-calculation...');

    try {
      const startTime = Date.now();

      // Get all active nomenclature
      const nomenclatureList = await this.nomenclatureRepository.find({
        where: { is_active: true },
      });

      this.logger.log(`Pre-calculating balances for ${nomenclatureList.length} nomenclature items`);

      let calculatedCount = 0;
      let errorCount = 0;

      // Get all warehouses
      const warehouses = await this.warehouseService.findAll();

      // Get all machines
      const machines = await this.machineRepository.find({
        where: { deleted_at: IsNull() },
      });

      // Pre-calculate for WAREHOUSE level
      for (const warehouse of warehouses) {
        for (const nomenclature of nomenclatureList) {
          try {
            await this.inventoryCalculationService.calculateBalance(
              nomenclature.id,
              InventoryLevelType.WAREHOUSE,
              warehouse.id,
              new Date(),
            );
            calculatedCount++;
          } catch (error) {
            errorCount++;
            this.logger.debug(
              `Failed to calculate balance for ${nomenclature.name} at warehouse ${warehouse.id}: ${error.message}`,
            );
          }
        }
      }

      // Pre-calculate for MACHINE level
      for (const machine of machines) {
        for (const nomenclature of nomenclatureList) {
          try {
            await this.inventoryCalculationService.calculateBalance(
              nomenclature.id,
              InventoryLevelType.MACHINE,
              machine.id,
              new Date(),
            );
            calculatedCount++;
          } catch (error) {
            errorCount++;
            this.logger.debug(
              `Failed to calculate balance for ${nomenclature.name} at machine ${machine.id}: ${error.message}`,
            );
          }
        }
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      this.logger.log(
        `Inventory balance pre-calculation completed: ${calculatedCount} calculated, ${errorCount} errors, ${duration}s`,
      );

      // Send summary notification to admin
      if (calculatedCount > 0) {
        await this.notificationsService.create({
          type: NotificationType.OTHER,
          channel: NotificationChannel.IN_APP,
          recipient_id: process.env.ADMIN_USER_ID || 'admin',
          title: '📊 Предрасчёт остатков выполнен',
          message:
            `Автоматически пересчитаны остатки товаров:\n\n` +
            `Товаров: ${nomenclatureList.length}\n` +
            `Складов: ${warehouses.length}\n` +
            `Аппаратов: ${machines.length}\n` +
            `Всего расчётов: ${calculatedCount}\n` +
            `Ошибок: ${errorCount}\n` +
            `Время: ${duration}s\n\n` +
            `Отчёты по расхождениям готовы к использованию.`,
          data: {
            nomenclature_count: nomenclatureList.length,
            warehouse_count: warehouses.length,
            machine_count: machines.length,
            calculated_count: calculatedCount,
            error_count: errorCount,
            duration_seconds: parseFloat(duration),
            auto_generated: true,
          },
          action_url: `/reports/inventory-differences`,
        });
      }
    } catch (error) {
      this.logger.error('Error pre-calculating inventory balances:', error.message);
    }
  }
}
