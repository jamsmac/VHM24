import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Task, TaskStatus, TaskType } from '../entities/task.entity';
import { TaskComment } from '../entities/task-comment.entity';
import { MachinesService } from '../../machines/machines.service';
import { InventoryService } from '../../inventory/inventory.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { TransactionsService } from '../../transactions/transactions.service';
import { AuditLogService } from '../../security/services/audit-log.service';
import { UsersService } from '../../users/users.service';
import { UserRole } from '../../users/entities/user.entity';
import { TransactionType } from '../../transactions/entities/transaction.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuditEventType } from '../../security/entities/audit-log.entity';
import {
  NotificationType,
  NotificationChannel,
} from '../../notifications/entities/notification.entity';

/**
 * TaskRejectionService
 *
 * Handles task rejection with compensating transactions:
 * - Inventory rollback for refill tasks
 * - Financial reversal for collection tasks
 * - Audit logging
 * - Notifications
 */
@Injectable()
export class TaskRejectionService {
  private readonly logger = new Logger(TaskRejectionService.name);

  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(TaskComment)
    private readonly taskCommentRepository: Repository<TaskComment>,
    @Inject(forwardRef(() => MachinesService))
    private readonly machinesService: MachinesService,
    @Inject(forwardRef(() => InventoryService))
    private readonly inventoryService: InventoryService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
    @Inject(forwardRef(() => TransactionsService))
    private readonly transactionsService: TransactionsService,
    private readonly auditLogService: AuditLogService,
    private readonly usersService: UsersService,
    private readonly eventEmitter: EventEmitter2,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Отклонить завершенную задачу с компенсирующими транзакциями
   *
   * Выполняет откат всех изменений (инвентарь, финансы) для завершенной задачи.
   * Доступно только для администраторов.
   */
  async rejectTask(task: Task, userId: string, reason: string): Promise<Task> {
    // Проверка 1: Только завершенные задачи можно отклонить
    if (task.status !== TaskStatus.COMPLETED) {
      throw new BadRequestException(
        'Можно отклонить только завершенные задачи. ' + `Текущий статус задачи: ${task.status}`,
      );
    }

    // Проверка 2: Только администраторы могут отклонять задачи
    const user = await this.usersService.findOne(userId);
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Только администраторы могут отклонять задачи');
    }

    // Проверка 3: Задача уже была отклонена
    if (task.rejected_at) {
      throw new BadRequestException(
        `Задача уже была отклонена ${task.rejected_at.toISOString()} пользователем ${task.rejected_by_user_id}`,
      );
    }

    // Проверка для инвентарных операций
    if (task.type_code === TaskType.REFILL && !task.assigned_to_user_id) {
      throw new BadRequestException('Задача должна быть назначена оператору для отката инвентаря');
    }

    await this.dataSource.transaction(async (transactionManager) => {
      // 1. Откат инвентаря для REFILL задач
      if (task.type_code === TaskType.REFILL) {
        await this.rollbackRefillInventory(task, userId, reason);
      }

      // 2. Откат финансов для COLLECTION задач
      if (task.type_code === TaskType.COLLECTION) {
        await this.rollbackCollectionFinances(task, userId, reason);
      }

      // 3. Обновить задачу
      task.status = TaskStatus.REJECTED;
      task.rejected_by_user_id = userId;
      task.rejected_at = new Date();
      task.rejection_reason = reason;

      await transactionManager.save(Task, task);

      // 4. Создать комментарий
      const comment = this.taskCommentRepository.create({
        task_id: task.id,
        user_id: userId,
        comment: `❌ Задача ОТКЛОНЕНА администратором. Причина: ${reason}. Выполнены компенсирующие транзакции.`,
        is_internal: false,
      });
      await transactionManager.save(TaskComment, comment);

      // 5. Аудит лог
      await this.auditLogService.log({
        event_type: AuditEventType.TRANSACTION_UPDATED,
        user_id: userId,
        description: `Задача отклонена администратором. Выполнены компенсирующие транзакции. Причина: ${reason}`,
        metadata: {
          task_id: task.id,
          task_type: task.type_code,
          machine_id: task.machine_id,
          operator_id: task.assigned_to_user_id,
          rejection_reason: reason,
          rejected_by_user_id: userId,
          rejected_at: task.rejected_at.toISOString(),
          items_rolled_back: task.items?.length || 0,
          cash_amount_rolled_back: task.actual_cash_amount || 0,
        },
      });

      // 6. Уведомить оператора
      await this.notifyOperatorAboutRejection(task, reason);

      this.logger.warn(
        `Задача ${task.id} (тип: ${task.type_code}) отклонена администратором ${userId}. Причина: ${reason}`,
      );
    });

    // Emit event for analytics
    this.eventEmitter.emit('task.rejected', {
      task,
      date: task.operation_date || task.completed_at,
    });

    return task;
  }

  /**
   * Откат инвентаря для задач пополнения
   */
  private async rollbackRefillInventory(
    task: Task,
    userId: string,
    reason: string,
  ): Promise<void> {
    if (!task.items || task.items.length === 0) {
      return;
    }

    for (const taskItem of task.items) {
      const actualQty = taskItem.actual_quantity || taskItem.planned_quantity;

      if (!task.assigned_to_user_id) {
        throw new BadRequestException('Cannot reject task: task is not assigned to an operator');
      }

      // Создать обратное движение: Аппарат -> Оператор
      await this.inventoryService.transferMachineToOperator(
        {
          operator_id: task.assigned_to_user_id,
          machine_id: task.machine_id,
          nomenclature_id: taskItem.nomenclature_id,
          quantity: Number(actualQty),
          notes: `ОТКАТ задачи ${task.id}: возврат ${actualQty} единиц. Причина: ${reason}`,
        },
        userId,
      );

      this.logger.log(
        `Откат инвентаря для задачи ${task.id}: возврат ${actualQty} ${taskItem.unit_of_measure_code}`,
      );
    }
  }

  /**
   * Откат финансов для задач инкассации
   */
  private async rollbackCollectionFinances(
    task: Task,
    userId: string,
    reason: string,
  ): Promise<void> {
    if (!task.actual_cash_amount) {
      return;
    }

    const actualCashAmount = Number(task.actual_cash_amount);

    // Создать компенсирующую транзакцию (REFUND)
    await this.transactionsService.create(
      {
        transaction_type: TransactionType.REFUND,
        machine_id: task.machine_id,
        amount: actualCashAmount,
        description: `ОТКАТ инкассации задачи ${task.id}. Сумма ${actualCashAmount.toFixed(2)} сум возвращена. Причина: ${reason}`,
        metadata: {
          original_task_id: task.id,
          rejection_reason: reason,
          original_collection_amount: actualCashAmount,
          rejected_by_user_id: userId,
          rejected_at: new Date().toISOString(),
        },
      },
      userId,
    );

    // Восстановить cash в аппарате
    const machine = await this.machinesService.findOne(task.machine_id);
    const restoredCashAmount = Number(machine.current_cash_amount) + actualCashAmount;

    await this.machinesService.updateStats(task.machine_id, {
      current_cash_amount: restoredCashAmount,
    });

    this.logger.log(
      `Откат финансов для задачи ${task.id}: возврат ${actualCashAmount.toFixed(2)} сум`,
    );
  }

  /**
   * Уведомление оператора об отклонении задачи
   */
  private async notifyOperatorAboutRejection(task: Task, reason: string): Promise<void> {
    if (!task.assigned_to_user_id) {
      return;
    }

    await this.notificationsService.create({
      type: NotificationType.SYSTEM_ALERT,
      channel: NotificationChannel.IN_APP,
      recipient_id: task.assigned_to_user_id,
      title: '❌ Задача отклонена',
      message:
        `Ваша задача ${task.type_code} для аппарата ${task.machine?.machine_number || task.machine_id} ` +
        `была отклонена администратором. Причина: ${reason}`,
      data: {
        task_id: task.id,
        task_type: task.type_code,
        machine_id: task.machine_id,
        rejection_reason: reason,
      },
      action_url: `/tasks/${task.id}`,
    });
  }
}
