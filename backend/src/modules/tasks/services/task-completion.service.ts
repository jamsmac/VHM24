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
import { TaskItem } from '../entities/task-item.entity';
import { TaskComment } from '../entities/task-comment.entity';
import { TaskComponent, ComponentRole } from '../entities/task-component.entity';
import { CompleteTaskDto } from '../dto/complete-task.dto';
import { FilesService } from '../../files/files.service';
import { MachinesService } from '../../machines/machines.service';
import { InventoryService } from '../../inventory/inventory.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { TransactionsService } from '../../transactions/transactions.service';
import { IncidentsService } from '../../incidents/incidents.service';
import { AuditLogService } from '../../security/services/audit-log.service';
import { UsersService } from '../../users/users.service';
import { UserRole } from '../../users/entities/user.entity';
import { WashingSchedulesService } from '../../equipment/services/washing-schedules.service';
import { ComponentMovementsService } from '../../equipment/services/component-movements.service';
import { ComponentLocationType } from '../../equipment/entities/equipment-component.entity';
import { MovementType } from '../../equipment/entities/component-movement.entity';
import { IncidentType, IncidentPriority } from '../../incidents/entities/incident.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuditEventType } from '../../security/entities/audit-log.entity';
import {
  NotificationType,
  NotificationChannel,
} from '../../notifications/entities/notification.entity';

/**
 * TaskCompletionService
 *
 * Handles all task completion logic including:
 * - Photo validation
 * - Checklist validation
 * - Inventory updates (refill tasks)
 * - Financial transactions (collection tasks)
 * - Component movements (replacement tasks)
 * - Washing schedule updates (cleaning tasks)
 * - Offline mode support
 */
@Injectable()
export class TaskCompletionService {
  private readonly logger = new Logger(TaskCompletionService.name);

  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(TaskItem)
    private readonly taskItemRepository: Repository<TaskItem>,
    @InjectRepository(TaskComment)
    private readonly taskCommentRepository: Repository<TaskComment>,
    private readonly filesService: FilesService,
    @Inject(forwardRef(() => MachinesService))
    private readonly machinesService: MachinesService,
    @Inject(forwardRef(() => InventoryService))
    private readonly inventoryService: InventoryService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
    @Inject(forwardRef(() => TransactionsService))
    private readonly transactionsService: TransactionsService,
    @Inject(forwardRef(() => IncidentsService))
    private readonly incidentsService: IncidentsService,
    private readonly auditLogService: AuditLogService,
    private readonly usersService: UsersService,
    private readonly washingSchedulesService: WashingSchedulesService,
    private readonly componentMovementsService: ComponentMovementsService,
    private readonly eventEmitter: EventEmitter2,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * КРИТИЧНЫЙ МЕТОД: Завершение задачи
   *
   * ОБЯЗАТЕЛЬНАЯ ПРОВЕРКА: Задача НЕ МОЖЕТ быть завершена без фото до и после.
   * Это фундаментальное требование архитектуры ручных операций.
   */
  async completeTask(
    task: Task,
    userId: string,
    completeTaskDto: CompleteTaskDto,
  ): Promise<Task> {
    // Проверка: только назначенный оператор может завершить задачу
    if (task.assigned_to_user_id !== userId) {
      throw new ForbiddenException('Только назначенный оператор может завершить задачу');
    }

    if (task.status !== TaskStatus.IN_PROGRESS) {
      throw new BadRequestException(
        `Невозможно завершить задачу со статусом ${task.status}. Задача должна быть в статусе IN_PROGRESS.`,
      );
    }

    // Валидация фото
    await this.validatePhotos(task, userId, completeTaskDto);

    // Проверка чек-листа
    this.validateChecklist(task);

    // Обработка специфичных для типа задачи данных
    await this.processTaskTypeSpecificData(task, userId, completeTaskDto);

    // Финализация задачи
    return this.finalizeTask(task, userId, completeTaskDto);
  }

  /**
   * Валидация фото до и после
   */
  private async validatePhotos(
    task: Task,
    userId: string,
    completeTaskDto: CompleteTaskDto,
  ): Promise<void> {
    const skipPhotos = completeTaskDto.skip_photos || false;

    if (skipPhotos) {
      const user = await this.usersService.findOne(userId);
      if (!user || ![UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER].includes(user.role)) {
        throw new ForbiddenException(
          'Только администраторы и менеджеры могут пропускать проверку фото',
        );
      }

      task.pending_photos = true;
      task.offline_completed = true;
      this.logger.warn(`Задача ${task.id} завершена в офлайн-режиме без фото. Оператор: ${userId}`);
    } else {
      const photoValidation = await this.filesService.validateTaskPhotos(task.id);

      if (!photoValidation.hasPhotoBefore) {
        throw new BadRequestException(
          'Невозможно завершить задачу: отсутствует фото ДО выполнения. ' +
            'Загрузите фото с категорией task_photo_before или используйте skip_photos=true для офлайн-режима.',
        );
      }

      if (!photoValidation.hasPhotoAfter) {
        throw new BadRequestException(
          'Невозможно завершить задачу: отсутствует фото ПОСЛЕ выполнения. ' +
            'Загрузите фото с категорией task_photo_after или используйте skip_photos=true для офлайн-режима.',
        );
      }

      task.has_photo_before = true;
      task.has_photo_after = true;
      task.pending_photos = false;
      task.offline_completed = false;
    }
  }

  /**
   * Проверка чек-листа
   */
  private validateChecklist(task: Task): void {
    if (task.checklist && task.checklist.length > 0) {
      const allCompleted = task.checklist.every((item) => item.completed);
      if (!allCompleted) {
        throw new BadRequestException(
          'Невозможно завершить задачу: не все пункты чек-листа выполнены',
        );
      }
    }
  }

  /**
   * Обработка данных специфичных для типа задачи
   */
  private async processTaskTypeSpecificData(
    task: Task,
    userId: string,
    completeTaskDto: CompleteTaskDto,
  ): Promise<void> {
    switch (task.type_code) {
      case TaskType.COLLECTION:
        await this.processCollectionTask(task, userId, completeTaskDto);
        break;
      case TaskType.REFILL:
        await this.processRefillTask(task, userId, completeTaskDto);
        break;
      case TaskType.CLEANING:
        await this.processCleaningTask(task, userId, completeTaskDto);
        break;
      case TaskType.REPLACE_HOPPER:
      case TaskType.REPLACE_GRINDER:
      case TaskType.REPLACE_BREW_UNIT:
      case TaskType.REPLACE_MIXER:
        await this.processComponentReplacementTask(task, userId);
        break;
      case TaskType.INSPECTION:
        await this.processInspectionTask(task, userId, completeTaskDto);
        break;
    }
  }

  /**
   * Обработка задачи инкассации
   */
  private async processCollectionTask(
    task: Task,
    userId: string,
    completeTaskDto: CompleteTaskDto,
  ): Promise<void> {
    if (completeTaskDto.actual_cash_amount === undefined) {
      throw new BadRequestException(
        'Для задачи инкассации необходимо указать фактическую сумму (actual_cash_amount)',
      );
    }

    const actualCashAmount = Number(completeTaskDto.actual_cash_amount);
    task.actual_cash_amount = actualCashAmount;

    const machine = task.machine;
    if (!machine) {
      throw new BadRequestException('Machine data not found in task');
    }
    const expectedCashAmount = Number(machine.current_cash_amount);

    // Создаем финансовую транзакцию
    await this.transactionsService.recordCollection({
      amount: actualCashAmount,
      machine_id: task.machine_id,
      user_id: userId,
      collection_task_id: task.id,
      description: `Инкассация аппарата ${machine.machine_number}. Ожидалось: ${expectedCashAmount.toFixed(2)}, Собрано: ${actualCashAmount.toFixed(2)}`,
    });

    // Проверка расхождения
    const discrepancy = Math.abs(expectedCashAmount - actualCashAmount);
    const discrepancyPercent =
      expectedCashAmount > 0 ? (discrepancy / expectedCashAmount) * 100 : 0;

    if (discrepancyPercent > 10) {
      await this.createCashDiscrepancyIncident(
        task,
        userId,
        expectedCashAmount,
        actualCashAmount,
        discrepancy,
        discrepancyPercent,
      );
    }

    // Аудит лог
    await this.auditLogService.log({
      event_type: AuditEventType.COLLECTION_RECORDED,
      user_id: userId,
      description: `Инкассация аппарата ${machine.machine_number}: собрано ${actualCashAmount.toFixed(2)} сум`,
      metadata: {
        task_id: task.id,
        machine_id: task.machine_id,
        expected_amount: expectedCashAmount,
        actual_amount: actualCashAmount,
        discrepancy_percent: discrepancyPercent,
      },
    });

    // Обновляем статистику аппарата
    await this.machinesService.updateStats(task.machine_id, {
      current_cash_amount: 0,
      last_collection_date: new Date(),
    });
  }

  /**
   * Создание инцидента о расхождении наличности
   */
  private async createCashDiscrepancyIncident(
    task: Task,
    userId: string,
    expectedCashAmount: number,
    actualCashAmount: number,
    discrepancy: number,
    discrepancyPercent: number,
  ): Promise<void> {
    const machine = task.machine;
    await this.incidentsService.create({
      incident_type: IncidentType.CASH_DISCREPANCY,
      priority: discrepancyPercent > 20 ? IncidentPriority.HIGH : IncidentPriority.MEDIUM,
      machine_id: task.machine_id,
      title: `Расхождение в инкассации: ${discrepancyPercent.toFixed(1)}%`,
      description:
        `При инкассации аппарата ${machine?.machine_number} обнаружено расхождение ${discrepancyPercent.toFixed(1)}%.\n` +
        `Ожидалось: ${expectedCashAmount.toFixed(2)} сум\n` +
        `Фактически собрано: ${actualCashAmount.toFixed(2)} сум\n` +
        `Разница: ${discrepancy.toFixed(2)} сум`,
      reported_by_user_id: userId,
      metadata: {
        task_id: task.id,
        expected_amount: expectedCashAmount,
        actual_amount: actualCashAmount,
        discrepancy: discrepancy,
        discrepancy_percent: discrepancyPercent,
      },
    });
  }

  /**
   * Обработка задачи пополнения
   */
  private async processRefillTask(
    task: Task,
    userId: string,
    completeTaskDto: CompleteTaskDto,
  ): Promise<void> {
    const itemsToUpdate: TaskItem[] = [];

    if (completeTaskDto.items && completeTaskDto.items.length > 0) {
      for (const itemDto of completeTaskDto.items) {
        const taskItem = task.items.find((ti) => ti.nomenclature_id === itemDto.nomenclature_id);
        if (taskItem) {
          taskItem.actual_quantity = itemDto.actual_quantity;
          itemsToUpdate.push(taskItem);
        }
      }
    } else {
      for (const taskItem of task.items) {
        taskItem.actual_quantity = taskItem.planned_quantity;
        itemsToUpdate.push(taskItem);
      }
    }

    if (itemsToUpdate.length > 0) {
      await this.taskItemRepository.save(itemsToUpdate);
    }

    await this.machinesService.updateStats(task.machine_id, {
      last_refill_date: new Date(),
    });

    // Выполнение резервации
    try {
      await this.inventoryService.fulfillReservation(task.id);
      this.logger.log(`Резервация выполнена для задачи ${task.id}`);
    } catch (error) {
      this.logger.warn(`Не удалось выполнить резервацию для задачи ${task.id}: ${error.message}`);
    }

    // Обновление инвентаря (Оператор -> Аппарат)
    if (!task.assigned_to_user_id) {
      throw new BadRequestException('Задача должна быть назначена оператору для завершения');
    }

    await this.dataSource.transaction(async () => {
      for (const taskItem of task.items) {
        const actualQty = taskItem.actual_quantity || taskItem.planned_quantity;

        await this.inventoryService.transferOperatorToMachine(
          {
            operator_id: task.assigned_to_user_id!,
            machine_id: task.machine_id,
            nomenclature_id: taskItem.nomenclature_id,
            quantity: Number(actualQty),
            task_id: task.id,
            notes: `Пополнение по задаче ${task.id}: ${actualQty} ${taskItem.unit_of_measure_code}`,
            operation_date: completeTaskDto.operation_date,
          },
          userId,
        );
      }
    });

    // Аудит лог
    await this.auditLogService.log({
      event_type: AuditEventType.TRANSACTION_UPDATED,
      user_id: userId,
      description: `Пополнение аппарата: ${task.items.length} позиций`,
      metadata: {
        task_id: task.id,
        machine_id: task.machine_id,
        items_count: task.items.length,
      },
    });
  }

  /**
   * Обработка задачи мойки
   */
  private async processCleaningTask(
    task: Task,
    userId: string,
    completeTaskDto: CompleteTaskDto,
  ): Promise<void> {
    const washingScheduleId = task.metadata?.washing_schedule_id;

    if (washingScheduleId) {
      try {
        await this.washingSchedulesService.completeWashing(washingScheduleId, {
          performed_by_user_id: userId,
          task_id: task.id,
          notes: completeTaskDto.completion_notes ?? undefined,
        });

        this.logger.log(
          `Washing schedule ${washingScheduleId} updated after task ${task.id} completion`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to update washing schedule ${washingScheduleId} for task ${task.id}:`,
          error,
        );
      }
    }
  }

  /**
   * Обработка задачи замены компонентов
   */
  private async processComponentReplacementTask(task: Task, userId: string): Promise<void> {
    if (!task.components || task.components.length === 0) {
      this.logger.warn(
        `Задача замены ${task.id} завершена без указания компонентов. Перемещения не созданы.`,
      );
      return;
    }

    const oldComponents = task.components.filter((tc) => tc.role === ComponentRole.OLD);
    const newComponents = task.components.filter((tc) => tc.role === ComponentRole.NEW);

    const movementPromises = [
      ...oldComponents.map((taskComp) =>
        this.createComponentRemovalMovement(task, taskComp, userId),
      ),
      ...newComponents.map((taskComp) =>
        this.createComponentInstallMovement(task, taskComp, userId),
      ),
    ];

    await Promise.all(movementPromises);

    // Аудит лог
    await this.auditLogService.log({
      event_type: AuditEventType.TRANSACTION_UPDATED,
      user_id: userId,
      description: `Замена компонентов: снято ${oldComponents.length}, установлено ${newComponents.length}`,
      metadata: {
        task_id: task.id,
        machine_id: task.machine_id,
        task_type: task.type_code,
        old_components: oldComponents.map((tc) => tc.component_id),
        new_components: newComponents.map((tc) => tc.component_id),
      },
    });
  }

  /**
   * Создание перемещения при снятии компонента
   */
  private async createComponentRemovalMovement(
    task: Task,
    taskComp: TaskComponent,
    userId: string,
  ): Promise<void> {
    try {
      await this.componentMovementsService.createMovement({
        componentId: taskComp.component_id,
        toLocationType: ComponentLocationType.WAREHOUSE,
        movementType: MovementType.REMOVE,
        relatedMachineId: task.machine_id,
        taskId: task.id,
        performedByUserId: userId,
        comment: `Снято при замене (задача ${task.id}): ${taskComp.notes || ''}`,
      });

      this.logger.log(
        `Компонент ${taskComp.component_id} снят с аппарата ${task.machine_id}`,
      );
    } catch (error) {
      this.logger.error(
        `Не удалось создать перемещение для OLD компонента ${taskComp.component_id}:`,
        error,
      );
    }
  }

  /**
   * Создание перемещения при установке компонента
   */
  private async createComponentInstallMovement(
    task: Task,
    taskComp: TaskComponent,
    userId: string,
  ): Promise<void> {
    try {
      await this.componentMovementsService.createMovement({
        componentId: taskComp.component_id,
        toLocationType: ComponentLocationType.MACHINE,
        toLocationRef: task.machine_id,
        movementType: MovementType.INSTALL,
        relatedMachineId: task.machine_id,
        taskId: task.id,
        performedByUserId: userId,
        comment: `Установлено при замене (задача ${task.id}): ${taskComp.notes || ''}`,
      });

      this.logger.log(
        `Компонент ${taskComp.component_id} установлен в аппарат ${task.machine_id}`,
      );
    } catch (error) {
      this.logger.error(
        `Не удалось создать перемещение для NEW компонента ${taskComp.component_id}:`,
        error,
      );
    }
  }

  /**
   * Обработка задачи проверки
   */
  private async processInspectionTask(
    task: Task,
    userId: string,
    completeTaskDto: CompleteTaskDto,
  ): Promise<void> {
    await this.auditLogService.log({
      event_type: AuditEventType.ACCOUNT_UPDATED,
      user_id: userId,
      description: `Проведена проверка аппарата. Задача: ${task.id}`,
      metadata: {
        task_id: task.id,
        machine_id: task.machine_id,
        inspection_notes: completeTaskDto.completion_notes,
        checklist_completed: task.checklist?.every((item) => item.completed) || false,
      },
    });
  }

  /**
   * Финализация задачи
   */
  private async finalizeTask(
    task: Task,
    userId: string,
    completeTaskDto: CompleteTaskDto,
  ): Promise<Task> {
    task.status = TaskStatus.COMPLETED;
    task.completed_at = new Date();
    task.operation_date = completeTaskDto.operation_date
      ? new Date(completeTaskDto.operation_date)
      : new Date();

    // Сохраняем комментарий при завершении
    if (completeTaskDto.completion_notes) {
      const comment = this.taskCommentRepository.create({
        task_id: task.id,
        user_id: userId,
        comment: completeTaskDto.completion_notes,
        is_internal: false,
      });
      await this.taskCommentRepository.save(comment);
    }

    const completedTask = await this.taskRepository.save(task);

    // Аудит лог для офлайн-завершения
    if (completeTaskDto.skip_photos) {
      await this.auditLogService.log({
        event_type: AuditEventType.TRANSACTION_UPDATED,
        user_id: userId,
        description: `Задача завершена в ОФЛАЙН-РЕЖИМЕ без фото`,
        metadata: {
          task_id: task.id,
          machine_id: task.machine_id,
          offline_completed: true,
          pending_photos: true,
        },
      });
    }

    // Отправка уведомления
    if (task.created_by_user_id && task.created_by_user_id !== userId) {
      await this.notificationsService.create({
        type: NotificationType.TASK_COMPLETED,
        channel: NotificationChannel.IN_APP,
        recipient_id: task.created_by_user_id,
        title: 'Задача завершена',
        message: `Задача ${task.type_code} для аппарата ${task.machine?.machine_number || task.machine_id} завершена`,
        data: {
          task_id: completedTask.id,
          machine_id: completedTask.machine_id,
          completed_by: userId,
        },
        action_url: `/tasks/${completedTask.id}`,
      });
    }

    // Emit event for analytics
    this.eventEmitter.emit('task.completed', {
      task: completedTask,
      date: completedTask.operation_date || completedTask.completed_at,
    });

    return completedTask;
  }

  /**
   * Загрузить фото для задачи, завершенной в офлайн-режиме
   */
  async uploadPendingPhotos(task: Task, userId: string): Promise<Task> {
    if (!task.pending_photos) {
      throw new BadRequestException(
        'У этой задачи нет ожидающих фото. Возможно, фото уже загружены.',
      );
    }

    if (task.status !== TaskStatus.COMPLETED) {
      throw new BadRequestException('Можно загружать фото только для завершенных задач.');
    }

    const photoValidation = await this.filesService.validateTaskPhotos(task.id);

    if (photoValidation.hasPhotoBefore && photoValidation.hasPhotoAfter) {
      task.has_photo_before = true;
      task.has_photo_after = true;
      task.pending_photos = false;

      await this.taskRepository.save(task);

      await this.auditLogService.log({
        event_type: AuditEventType.TRANSACTION_UPDATED,
        user_id: userId,
        description: `Фото загружены для задачи, завершенной в офлайн-режиме`,
        metadata: {
          task_id: task.id,
          machine_id: task.machine_id,
          uploaded_at: new Date(),
        },
      });

      this.logger.log(`Фото загружены для офлайн-задачи ${task.id} пользователем ${userId}`);

      return task;
    } else {
      throw new BadRequestException(
        `Фото еще не загружены. Статус: фото ДО - ${photoValidation.hasPhotoBefore ? 'есть' : 'нет'}, фото ПОСЛЕ - ${photoValidation.hasPhotoAfter ? 'есть' : 'нет'}`,
      );
    }
  }

  /**
   * Получить список задач с ожидающими фото
   */
  async getPendingPhotosTasks(userId?: string): Promise<Task[]> {
    const query = this.taskRepository
      .createQueryBuilder('task')
      .where('task.pending_photos = :pending', { pending: true })
      .andWhere('task.status = :status', { status: TaskStatus.COMPLETED })
      .leftJoinAndSelect('task.machine', 'machine')
      .leftJoinAndSelect('task.assigned_to', 'assigned_to')
      .orderBy('task.operation_date', 'DESC');

    if (userId) {
      query.andWhere('task.assigned_to_user_id = :userId', { userId });
    }

    return query.getMany();
  }
}
