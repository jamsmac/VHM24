import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource } from 'typeorm';
import { Task, TaskStatus, TaskType, TaskPriority } from './entities/task.entity';
import { TaskItem } from './entities/task-item.entity';
import { TaskComment } from './entities/task-comment.entity';
import { TaskComponent } from './entities/task-component.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { CompleteTaskDto } from './dto/complete-task.dto';
import { FilesService } from '../files/files.service';
import { MachinesService } from '../machines/machines.service';
import { InventoryService } from '../inventory/inventory.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TransactionsService } from '../transactions/transactions.service';
import { IncidentsService } from '../incidents/incidents.service';
import { AuditLogService } from '../security/services/audit-log.service';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/entities/user.entity';
import { WashingSchedulesService } from '../equipment/services/washing-schedules.service';
import { ComponentMovementsService } from '../equipment/services/component-movements.service';
import { ComponentsService } from '../equipment/services/components.service';
import { ComponentLocationType } from '../equipment/entities/equipment-component.entity';
import { MovementType } from '../equipment/entities/component-movement.entity';
import { ComponentRole } from './entities/task-component.entity';
import { TransactionType } from '../transactions/entities/transaction.entity';
import { IncidentType, IncidentPriority } from '../incidents/entities/incident.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuditEventType } from '../security/entities/audit-log.entity';
import {
  NotificationType,
  NotificationChannel,
} from '../notifications/entities/notification.entity';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(TaskItem)
    private readonly taskItemRepository: Repository<TaskItem>,
    @InjectRepository(TaskComment)
    private readonly taskCommentRepository: Repository<TaskComment>,
    @InjectRepository(TaskComponent)
    private readonly taskComponentRepository: Repository<TaskComponent>,
    private readonly filesService: FilesService,
    private readonly machinesService: MachinesService,
    private readonly inventoryService: InventoryService,
    private readonly notificationsService: NotificationsService,
    private readonly transactionsService: TransactionsService,
    private readonly incidentsService: IncidentsService,
    private readonly auditLogService: AuditLogService,
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => WashingSchedulesService))
    private readonly washingSchedulesService: WashingSchedulesService,
    @Inject(forwardRef(() => ComponentMovementsService))
    private readonly componentMovementsService: ComponentMovementsService,
    @Inject(forwardRef(() => ComponentsService))
    private readonly componentsService: ComponentsService,
    private readonly eventEmitter: EventEmitter2,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Создание новой задачи
   *
   * Использует транзакцию для атомарного создания задачи, позиций,
   * компонентов и резервирования инвентаря.
   */
  async create(createTaskDto: CreateTaskDto): Promise<Task> {
    const { items, components, ...taskData } = createTaskDto;

    // Проверка на конфликтующие задачи на том же аппарате (можно выполнить до транзакции)
    const activeStatuses = [TaskStatus.PENDING, TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS];
    const existingActiveTasks = await this.taskRepository.find({
      where: {
        machine_id: taskData.machine_id,
        status: In(activeStatuses),
      },
    });

    if (existingActiveTasks.length > 0) {
      throw new BadRequestException(
        `Невозможно создать задачу: на аппарате уже есть активная задача (ID: ${existingActiveTasks[0].id}, статус: ${existingActiveTasks[0].status}). ` +
          `Завершите или отмените существующую задачу перед созданием новой.`,
      );
    }

    // Выполняем все операции создания в транзакции
    const savedTaskId = await this.dataSource.transaction(async (transactionManager) => {
      // Создаем задачу
      const task = transactionManager.create(Task, {
        ...taskData,
        status: TaskStatus.PENDING,
      });

      const savedTask = await transactionManager.save(Task, task);

      // Если есть позиции (для задач пополнения), создаем их
      if (items && items.length > 0) {
        const taskItems = items.map((item) =>
          transactionManager.create(TaskItem, {
            task_id: savedTask.id,
            ...item,
          }),
        );
        await transactionManager.save(TaskItem, taskItems);

        // Резервируем инвентарь для задач типа REFILL
        if (taskData.type_code === TaskType.REFILL && taskData.assigned_to_user_id) {
          const reservationItems = items.map((item) => ({
            nomenclature_id: item.nomenclature_id,
            quantity: item.planned_quantity,
          }));

          // Резервация будет откачена автоматически при ошибке благодаря транзакции
          await this.inventoryService.createReservation(
            savedTask.id,
            taskData.assigned_to_user_id,
            reservationItems,
            24, // Резервация на 24 часа
          );

          this.logger.log(`Создана резервация инвентаря для задачи ${savedTask.id}`);
        }
      }

      // Если есть компоненты (для REPLACE_*, CLEANING, REPAIR задач), создаем связи
      if (components && components.length > 0) {
        const taskComponents = components.map((comp) =>
          transactionManager.create(TaskComponent, {
            task_id: savedTask.id,
            component_id: comp.component_id,
            role: comp.role,
            notes: comp.notes,
          }),
        );
        await transactionManager.save(TaskComponent, taskComponents);

        this.logger.log(
          `Созданы связи задачи ${savedTask.id} с ${taskComponents.length} компонентами`,
        );
      }

      return savedTask.id;
    });

    return this.findOne(savedTaskId);
  }

  /**
   * Получение всех задач с фильтрацией
   */
  async findAll(
    status?: TaskStatus,
    type?: TaskType,
    machineId?: string,
    assignedToUserId?: string,
    priority?: TaskPriority,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<Task[]> {
    const query = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.machine', 'machine')
      .leftJoinAndSelect('machine.location', 'location')
      .leftJoinAndSelect('task.assigned_to', 'assigned_to')
      .leftJoinAndSelect('task.created_by', 'created_by')
      .leftJoinAndSelect('task.items', 'items')
      .leftJoinAndSelect('items.nomenclature', 'nomenclature')
      .leftJoinAndSelect('task.components', 'task_components')
      .leftJoinAndSelect('task_components.component', 'component')
      .where('task.deleted_at IS NULL') // Exclude soft-deleted tasks
      .andWhere('(task.machine_id IS NULL OR machine.deleted_at IS NULL)'); // Exclude tasks for soft-deleted machines

    if (status) {
      query.andWhere('task.status = :status', { status });
    }

    if (type) {
      query.andWhere('task.type_code = :type', { type });
    }

    if (machineId) {
      query.andWhere('task.machine_id = :machineId', { machineId });
    }

    if (assignedToUserId) {
      query.andWhere('task.assigned_to_user_id = :assignedToUserId', {
        assignedToUserId,
      });
    }

    if (priority) {
      query.andWhere('task.priority = :priority', { priority });
    }

    if (dateFrom && dateTo) {
      query.andWhere('task.scheduled_date BETWEEN :dateFrom AND :dateTo', {
        dateFrom,
        dateTo,
      });
    }

    query.orderBy('task.priority', 'DESC').addOrderBy('task.scheduled_date', 'ASC');

    return query.getMany();
  }

  /**
   * Получение задачи по ID
   */
  async findOne(id: string): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: [
        'machine',
        'machine.location',
        'assigned_to',
        'created_by',
        'items',
        'items.nomenclature',
        'comments',
        'comments.user',
        'components',
        'components.component',
      ],
    });

    if (!task) {
      throw new NotFoundException(`Задача с ID ${id} не найдена`);
    }

    return task;
  }

  /**
   * Обновление задачи
   */
  async update(id: string, updateTaskDto: UpdateTaskDto): Promise<Task> {
    const task = await this.findOne(id);

    // Проверка валидности переходов статусов
    if (updateTaskDto.status && updateTaskDto.status !== task.status) {
      this.validateStatusTransition(task.status, updateTaskDto.status);
    }

    Object.assign(task, updateTaskDto);

    return this.taskRepository.save(task);
  }

  /**
   * Удаление задачи (soft delete)
   */
  async remove(id: string): Promise<void> {
    const task = await this.findOne(id);

    // Проверка: нельзя удалить завершенную задачу
    if (task.status === TaskStatus.COMPLETED) {
      throw new BadRequestException('Нельзя удалить завершенную задачу');
    }

    // Отменяем резервацию инвентаря перед удалением
    try {
      await this.inventoryService.cancelReservation(task.id);
      this.logger.log(`Резервация отменена при удалении задачи ${task.id}`);
    } catch (error) {
      this.logger.warn(
        `Не удалось отменить резервацию при удалении задачи ${task.id}: ${error.message}`,
      );
      // Не блокируем удаление задачи, если резервации не было
    }

    await this.taskRepository.softRemove(task);
  }

  /**
   * Назначение задачи оператору
   */
  async assignTask(id: string, userId: string): Promise<Task> {
    const task = await this.findOne(id);

    if (task.status === TaskStatus.COMPLETED) {
      throw new BadRequestException('Нельзя переназначить завершенную задачу');
    }

    task.assigned_to_user_id = userId;
    task.status = TaskStatus.ASSIGNED;

    const savedTask = await this.taskRepository.save(task);

    // Отправка уведомления о назначении задачи
    await this.notificationsService.create({
      type: NotificationType.TASK_ASSIGNED,
      channel: NotificationChannel.IN_APP,
      recipient_id: userId,
      title: 'Новая задача назначена',
      message: `Вам назначена задача ${task.type_code} для аппарата ${task.machine?.machine_number || task.machine_id}`,
      data: {
        task_id: savedTask.id,
        machine_id: savedTask.machine_id,
        type: savedTask.type_code,
        priority: savedTask.priority,
      },
      action_url: `/tasks/${savedTask.id}`,
    });

    return savedTask;
  }

  /**
   * Начало выполнения задачи
   */
  async startTask(id: string, userId: string): Promise<Task> {
    const task = await this.findOne(id);

    // Проверка: только назначенный оператор может начать задачу
    if (task.assigned_to_user_id !== userId) {
      throw new ForbiddenException('Только назначенный оператор может начать выполнение задачи');
    }

    if (task.status !== TaskStatus.ASSIGNED && task.status !== TaskStatus.PENDING) {
      throw new BadRequestException(`Невозможно начать задачу со статусом ${task.status}`);
    }

    task.status = TaskStatus.IN_PROGRESS;
    task.started_at = new Date();

    return this.taskRepository.save(task);
  }

  /**
   * КРИТИЧНЫЙ МЕТОД: Завершение задачи
   *
   * ОБЯЗАТЕЛЬНАЯ ПРОВЕРКА: Задача НЕ МОЖЕТ быть завершена без фото до и после.
   * Это фундаментальное требование архитектуры ручных операций (manual-operations.md).
   *
   * Процесс завершения:
   * 1. Проверка наличия фото до и после (ОБЯЗАТЕЛЬНО)
   * 2. Проверка чек-листа (все пункты должны быть отмечены)
   * 3. Обновление фактических данных (количества, суммы)
   * 4. Обновление статистики аппарата
   * 5. Обновление инвентаря (будет реализовано позже)
   * 6. Установка статуса COMPLETED
   */
  async completeTask(id: string, userId: string, completeTaskDto: CompleteTaskDto): Promise<Task> {
    const task = await this.findOne(id);

    // Проверка: только назначенный оператор может завершить задачу
    if (task.assigned_to_user_id !== userId) {
      throw new ForbiddenException('Только назначенный оператор может завершить задачу');
    }

    if (task.status !== TaskStatus.IN_PROGRESS) {
      throw new BadRequestException(
        `Невозможно завершить задачу со статусом ${task.status}. Задача должна быть в статусе IN_PROGRESS.`,
      );
    }

    // ============================================================================
    // ПРОВЕРКА НАЛИЧИЯ ФОТО ДО И ПОСЛЕ (с поддержкой офлайн-режима)
    // ============================================================================
    const skipPhotos = completeTaskDto.skip_photos || false;

    // Only ADMIN, SUPER_ADMIN, and MANAGER can skip photos
    if (skipPhotos) {
      const user = await this.usersService.findOne(userId);
      if (!user || ![UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER].includes(user.role)) {
        throw new ForbiddenException(
          'Только администраторы и менеджеры могут пропускать проверку фото',
        );
      }
    }

    if (!skipPhotos) {
      // Стандартный режим: требуем фото
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

      // Обновляем флаги наличия фото
      task.has_photo_before = true;
      task.has_photo_after = true;
      task.pending_photos = false;
      task.offline_completed = false;
    } else {
      // Офлайн-режим: пропускаем проверку фото
      task.pending_photos = true; // Фото ожидаются позже
      task.offline_completed = true; // Отмечаем, что выполнено офлайн
      this.logger.warn(`Задача ${task.id} завершена в офлайн-режиме без фото. Оператор: ${userId}`);
    }

    // ============================================================================
    // ПРОВЕРКА ЧЕК-ЛИСТА
    // ============================================================================
    if (task.checklist && task.checklist.length > 0) {
      const allCompleted = task.checklist.every((item) => item.completed);
      if (!allCompleted) {
        throw new BadRequestException(
          'Невозможно завершить задачу: не все пункты чек-листа выполнены',
        );
      }
    }

    // ============================================================================
    // ОБРАБОТКА СПЕЦИФИЧНЫХ ДЛЯ ТИПА ЗАДАЧИ ДАННЫХ
    // ============================================================================

    // Для задач ИНКАССАЦИИ: сохраняем фактическую сумму, создаем транзакцию, проверяем расхождения
    if (task.type_code === TaskType.COLLECTION) {
      if (completeTaskDto.actual_cash_amount === undefined) {
        throw new BadRequestException(
          'Для задачи инкассации необходимо указать фактическую сумму (actual_cash_amount)',
        );
      }

      const actualCashAmount = Number(completeTaskDto.actual_cash_amount);
      task.actual_cash_amount = actualCashAmount;

      // Используем уже загруженные данные аппарата из task.machine
      const machine = task.machine;
      if (!machine) {
        throw new BadRequestException('Machine data not found in task');
      }
      const expectedCashAmount = Number(machine.current_cash_amount);

      // Создаем финансовую транзакцию инкассации
      await this.transactionsService.recordCollection({
        amount: actualCashAmount,
        machine_id: task.machine_id,
        user_id: userId,
        collection_task_id: task.id,
        description: `Инкассация аппарата ${machine.machine_number}. Ожидалось: ${expectedCashAmount.toFixed(2)}, Собрано: ${actualCashAmount.toFixed(2)}`,
      });

      // Проверка расхождения между ожидаемой и фактической суммой
      const discrepancy = Math.abs(expectedCashAmount - actualCashAmount);
      const discrepancyPercent =
        expectedCashAmount > 0 ? (discrepancy / expectedCashAmount) * 100 : 0;

      // Если расхождение больше 10%, создаем инцидент
      if (discrepancyPercent > 10) {
        await this.incidentsService.create({
          incident_type: IncidentType.CASH_DISCREPANCY,
          priority: discrepancyPercent > 20 ? IncidentPriority.HIGH : IncidentPriority.MEDIUM,
          machine_id: task.machine_id,
          title: `Расхождение в инкассации: ${discrepancyPercent.toFixed(1)}%`,
          description:
            `При инкассации аппарата ${machine.machine_number} обнаружено расхождение ${discrepancyPercent.toFixed(1)}%.\n` +
            `Ожидалось: ${expectedCashAmount.toFixed(2)} сум\n` +
            `Фактически собрано: ${actualCashAmount.toFixed(2)} сум\n` +
            `Разница: ${discrepancy.toFixed(2)} сум\n` +
            `Задача инкассации: ${task.id}`,
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

      // Аудит лог для финансовой операции
      await this.auditLogService.log({
        event_type: AuditEventType.COLLECTION_RECORDED,
        user_id: userId,
        description: `Инкассация аппарата ${machine.machine_number}: собрано ${actualCashAmount.toFixed(2)} сум (ожидалось ${expectedCashAmount.toFixed(2)} сум)`,
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
        current_cash_amount: 0, // После инкассации денег в аппарате нет
        last_collection_date: new Date(),
      });
    }

    // Для задач ПОПОЛНЕНИЯ: обновляем фактические количества
    if (task.type_code === TaskType.REFILL) {
      const itemsToUpdate: TaskItem[] = [];

      if (completeTaskDto.items && completeTaskDto.items.length > 0) {
        // Обновляем actual_quantity для каждой позиции
        for (const itemDto of completeTaskDto.items) {
          const taskItem = task.items.find((ti) => ti.nomenclature_id === itemDto.nomenclature_id);
          if (taskItem) {
            taskItem.actual_quantity = itemDto.actual_quantity;
            itemsToUpdate.push(taskItem);
          }
        }
      } else {
        // Если фактические количества не указаны, используем запланированные
        for (const taskItem of task.items) {
          taskItem.actual_quantity = taskItem.planned_quantity;
          itemsToUpdate.push(taskItem);
        }
      }

      // Bulk save all task items in one query
      if (itemsToUpdate.length > 0) {
        await this.taskItemRepository.save(itemsToUpdate);
      }

      // Обновляем дату последнего пополнения
      await this.machinesService.updateStats(task.machine_id, {
        last_refill_date: new Date(),
      });

      // ============================================================================
      // ВЫПОЛНЕНИЕ РЕЗЕРВАЦИИ
      // ============================================================================
      // Выполняем резервацию перед переносом товаров
      try {
        await this.inventoryService.fulfillReservation(task.id);
        this.logger.log(`Резервация выполнена для задачи ${task.id}`);
      } catch (error) {
        this.logger.warn(`Не удалось выполнить резервацию для задачи ${task.id}: ${error.message}`);
        // Не блокируем завершение задачи, если резервации не было
      }

      // ============================================================================
      // ОБНОВЛЕНИЕ ИНВЕНТАРЯ (3-х уровневая система)
      // ============================================================================
      // Переносим товар: Оператор -> Аппарат
      // Используем транзакцию для обеспечения атомарности операции

      // Проверяем, что задача назначена оператору
      if (!task.assigned_to_user_id) {
        throw new BadRequestException('Задача должна быть назначена оператору для завершения');
      }

      await this.dataSource.transaction(async (_transactionalEntityManager) => {
        for (const taskItem of task.items) {
          const actualQty = taskItem.actual_quantity || taskItem.planned_quantity;

          if (!task.assigned_to_user_id) {
            throw new BadRequestException('Task must be assigned to an operator before completion');
          }

          await this.inventoryService.transferOperatorToMachine(
            {
              operator_id: task.assigned_to_user_id,
              machine_id: task.machine_id,
              nomenclature_id: taskItem.nomenclature_id,
              quantity: Number(actualQty),
              task_id: task.id,
              notes: `Пополнение по задаче ${task.id}: ${actualQty} ${taskItem.unit_of_measure_code}`,
              operation_date: completeTaskDto.operation_date, // Передаем дату фактического выполнения
            },
            userId,
          );
        }
      });

      // Аудит лог для операции пополнения
      await this.auditLogService.log({
        event_type: AuditEventType.TRANSACTION_UPDATED,
        user_id: userId,
        description: `Пополнение аппарата: ${task.items.length} позиций`,
        metadata: {
          task_id: task.id,
          machine_id: task.machine_id,
          items_count: task.items.length,
          items: task.items.map((item) => ({
            nomenclature_id: item.nomenclature_id,
            quantity: item.actual_quantity || item.planned_quantity,
          })),
        },
      });
    }

    // Для задач МОЙКИ: обновляем график мойки
    if (task.type_code === TaskType.CLEANING) {
      // Проверяем, привязана ли задача к графику мойки
      const washingScheduleId = task.metadata?.washing_schedule_id;

      if (washingScheduleId) {
        try {
          // Обновляем график мойки: устанавливаем last_wash_date и вычисляем next_wash_date
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
          // Не блокируем завершение задачи, если не удалось обновить график
        }
      }
    }

    // Для задач ЗАМЕНЫ КОМПОНЕНТОВ: создаем перемещения компонентов
    const replaceTypes = [
      TaskType.REPLACE_HOPPER,
      TaskType.REPLACE_GRINDER,
      TaskType.REPLACE_BREW_UNIT,
      TaskType.REPLACE_MIXER,
    ];

    if (replaceTypes.includes(task.type_code)) {
      if (!task.components || task.components.length === 0) {
        this.logger.warn(
          `Задача замены ${task.id} завершена без указания компонентов. Перемещения не созданы.`,
        );
      } else {
        // Обрабатываем OLD компоненты (снятие с аппарата)
        const oldComponents = task.components.filter((tc) => tc.role === ComponentRole.OLD);

        // Обрабатываем NEW компоненты (установка в аппарат)
        const newComponents = task.components.filter((tc) => tc.role === ComponentRole.NEW);

        // Создаем все перемещения параллельно для производительности
        const movementPromises = [
          ...oldComponents.map(async (taskComp) => {
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
                `Компонент ${taskComp.component_id} снят с аппарата ${task.machine_id} (задача ${task.id})`,
              );
              return { success: true, componentId: taskComp.component_id, type: 'OLD' };
            } catch (error) {
              this.logger.error(
                `Не удалось создать перемещение для OLD компонента ${taskComp.component_id}:`,
                error,
              );
              return { success: false, componentId: taskComp.component_id, type: 'OLD', error };
            }
          }),
          ...newComponents.map(async (taskComp) => {
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
                `Компонент ${taskComp.component_id} установлен в аппарат ${task.machine_id} (задача ${task.id})`,
              );
              return { success: true, componentId: taskComp.component_id, type: 'NEW' };
            } catch (error) {
              this.logger.error(
                `Не удалось создать перемещение для NEW компонента ${taskComp.component_id}:`,
                error,
              );
              return { success: false, componentId: taskComp.component_id, type: 'NEW', error };
            }
          }),
        ];

        // Ждем завершения всех перемещений параллельно
        await Promise.all(movementPromises);

        // Аудит лог для замены компонентов
        await this.auditLogService.log({
          event_type: AuditEventType.TRANSACTION_UPDATED,
          user_id: userId,
          description: `Замена компонентов в аппарате ${task.machine?.machine_number || task.machine_id}: снято ${oldComponents.length}, установлено ${newComponents.length}`,
          metadata: {
            task_id: task.id,
            machine_id: task.machine_id,
            task_type: task.type_code,
            old_components: oldComponents.map((tc) => tc.component_id),
            new_components: newComponents.map((tc) => tc.component_id),
          },
        });
      }
    }

    // Для задачи INSPECTION: логируем проверку
    if (task.type_code === TaskType.INSPECTION) {
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

    // ============================================================================
    // ФИНАЛИЗАЦИЯ ЗАДАЧИ
    // ============================================================================
    task.status = TaskStatus.COMPLETED;
    task.completed_at = new Date(); // Когда данные внесены в систему

    // Дата фактического выполнения операции (может отличаться от completed_at)
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
    if (skipPhotos) {
      await this.auditLogService.log({
        event_type: AuditEventType.TRANSACTION_UPDATED,
        user_id: userId,
        description: `Задача завершена в ОФЛАЙН-РЕЖИМЕ без фото. Фото ожидаются. Дата операции: ${task.operation_date?.toISOString()}`,
        metadata: {
          task_id: task.id,
          machine_id: task.machine_id,
          offline_completed: true,
          pending_photos: true,
          operation_date: task.operation_date,
          completed_at: task.completed_at,
        },
      });
    }

    // Отправка уведомления о завершении задачи (для менеджера/администратора)
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
   * После загрузки всех фото pending_photos сбрасывается
   */
  async uploadPendingPhotos(taskId: string, userId: string): Promise<Task> {
    const task = await this.findOne(taskId);

    if (!task.pending_photos) {
      throw new BadRequestException(
        'У этой задачи нет ожидающих фото. Возможно, фото уже загружены.',
      );
    }

    if (task.status !== TaskStatus.COMPLETED) {
      throw new BadRequestException('Можно загружать фото только для завершенных задач.');
    }

    // Проверяем, загружены ли фото
    const photoValidation = await this.filesService.validateTaskPhotos(task.id);

    if (photoValidation.hasPhotoBefore && photoValidation.hasPhotoAfter) {
      // Все фото загружены, обновляем флаги
      task.has_photo_before = true;
      task.has_photo_after = true;
      task.pending_photos = false; // Больше не ожидаем фото

      await this.taskRepository.save(task);

      // Аудит лог для загрузки фото
      await this.auditLogService.log({
        event_type: AuditEventType.TRANSACTION_UPDATED,
        user_id: userId,
        description: `Фото загружены для задачи, завершенной в офлайн-режиме. Дата операции: ${task.operation_date?.toISOString()}`,
        metadata: {
          task_id: task.id,
          machine_id: task.machine_id,
          operation_date: task.operation_date,
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

  /**
   * Отмена задачи
   */
  async cancelTask(id: string, reason: string, userId: string): Promise<Task> {
    const task = await this.findOne(id);

    if (task.status === TaskStatus.COMPLETED) {
      throw new BadRequestException('Нельзя отменить завершенную задачу');
    }

    // Отменяем резервацию инвентаря
    try {
      await this.inventoryService.cancelReservation(task.id);
      this.logger.log(`Резервация отменена для задачи ${task.id}`);
    } catch (error) {
      this.logger.warn(`Не удалось отменить резервацию для задачи ${task.id}: ${error.message}`);
      // Не блокируем отмену задачи, если резервации не было
    }

    task.status = TaskStatus.CANCELLED;

    // Сохраняем причину отмены как комментарий
    const comment = this.taskCommentRepository.create({
      task_id: task.id,
      user_id: userId,
      comment: `Задача отменена. Причина: ${reason}`,
      is_internal: false,
    });
    await this.taskCommentRepository.save(comment);

    return this.taskRepository.save(task);
  }

  /**
   * Отклонить завершенную задачу с компенсирующими транзакциями
   *
   * Выполняет откат всех изменений (инвентарь, финансы) для завершенной задачи.
   * Доступно только для администраторов.
   *
   * @param id - ID задачи
   * @param userId - ID пользователя (должен быть админом)
   * @param reason - Причина отклонения
   * @returns Отклоненная задача
   */
  async rejectTask(id: string, userId: string, reason: string): Promise<Task> {
    const task = await this.findOne(id);

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

    // ============================================================================
    // ВЫПОЛНЕНИЕ КОМПЕНСИРУЮЩИХ ТРАНЗАКЦИЙ
    // ============================================================================

    // Проверяем, что задача назначена оператору (для инвентарных операций)
    if (task.type_code === TaskType.REFILL && !task.assigned_to_user_id) {
      throw new BadRequestException('Задача должна быть назначена оператору для отката инвентаря');
    }

    await this.dataSource.transaction(async (transactionManager) => {
      // 1. Откат инвентаря для REFILL задач
      if (task.type_code === TaskType.REFILL && task.items && task.items.length > 0) {
        for (const taskItem of task.items) {
          const actualQty = taskItem.actual_quantity || taskItem.planned_quantity;

          if (!task.assigned_to_user_id) {
            throw new BadRequestException(
              'Cannot reject task: task is not assigned to an operator',
            );
          }

          // Создать обратное движение: Аппарат -> Оператор
          await this.inventoryService.transferMachineToOperator(
            {
              operator_id: task.assigned_to_user_id,
              machine_id: task.machine_id,
              nomenclature_id: taskItem.nomenclature_id,
              quantity: Number(actualQty),
              notes: `ОТКАТ задачи ${task.id}: возврат ${actualQty} единиц. Причина отклонения: ${reason}`,
            },
            userId,
          );

          this.logger.log(
            `Откат инвентаря для задачи ${task.id}: возврат ${actualQty} ${taskItem.unit_of_measure_code} ` +
              `номенклатуры ${taskItem.nomenclature_id} из аппарата ${task.machine_id} оператору ${task.assigned_to_user_id}`,
          );
        }
      }

      // 2. Откат финансов для COLLECTION задач
      if (task.type_code === TaskType.COLLECTION && task.actual_cash_amount) {
        const actualCashAmount = Number(task.actual_cash_amount);

        // Создать компенсирующую транзакцию (REFUND)
        await this.transactionsService.create(
          {
            transaction_type: TransactionType.REFUND,
            machine_id: task.machine_id,
            amount: actualCashAmount, // Положительная сумма для возврата
            description: `ОТКАТ инкассации задачи ${task.id}. Сумма ${actualCashAmount.toFixed(2)} сум возвращена в аппарат. Причина: ${reason}`,
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

        // Восстановить cash в аппарате (вернуть сумму обратно)
        const machine = await this.machinesService.findOne(task.machine_id);
        const restoredCashAmount = Number(machine.current_cash_amount) + actualCashAmount;

        await this.machinesService.updateStats(task.machine_id, {
          current_cash_amount: restoredCashAmount,
        });

        this.logger.log(
          `Откат финансов для задачи ${task.id}: возврат ${actualCashAmount.toFixed(2)} сум в аппарат ${task.machine_id}. ` +
            `Новый баланс аппарата: ${restoredCashAmount.toFixed(2)} сум`,
        );
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
        comment: `❌ Задача ОТКЛОНЕНА администратором. Причина: ${reason}. Выполнены компенсирующие транзакции для отката изменений.`,
        is_internal: false,
      });
      await transactionManager.save(TaskComment, comment);

      // 5. Аудит лог
      await this.auditLogService.log({
        event_type: AuditEventType.TRANSACTION_UPDATED,
        user_id: userId,
        description:
          `Задача отклонена администратором. Выполнены компенсирующие транзакции для отката изменений. ` +
          `Причина: ${reason}`,
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

      // 6. Уведомить оператора о отклонении задачи
      if (task.assigned_to_user_id) {
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
            rejected_by_user_id: userId,
          },
          action_url: `/tasks/${task.id}`,
        });
      }

      this.logger.warn(
        `Задача ${task.id} (тип: ${task.type_code}) отклонена администратором ${userId}. ` +
          `Причина: ${reason}. Компенсирующие транзакции выполнены.`,
      );
    });

    // Emit event for analytics (trigger rebuild)
    this.eventEmitter.emit('task.rejected', {
      task,
      date: task.operation_date || task.completed_at,
    });

    // Возвращаем обновленную задачу
    return this.findOne(task.id);
  }

  /**
   * Отложить задачу на другое время
   */
  async postponeTask(
    id: string,
    newScheduledDate: Date,
    reason: string,
    userId: string,
  ): Promise<Task> {
    const task = await this.findOne(id);

    if (task.status === TaskStatus.COMPLETED) {
      throw new BadRequestException('Нельзя отложить завершенную задачу');
    }

    task.status = TaskStatus.POSTPONED;
    task.scheduled_date = newScheduledDate;

    // Сохраняем причину переноса
    const comment = this.taskCommentRepository.create({
      task_id: task.id,
      user_id: userId,
      comment: `Задача отложена на ${newScheduledDate.toISOString()}. Причина: ${reason}`,
      is_internal: false,
    });
    await this.taskCommentRepository.save(comment);

    return this.taskRepository.save(task);
  }

  /**
   * Добавление комментария к задаче
   */
  async addComment(
    taskId: string,
    userId: string,
    comment: string,
    isInternal: boolean = false,
  ): Promise<TaskComment> {
    const task = await this.findOne(taskId);

    const taskComment = this.taskCommentRepository.create({
      task_id: task.id,
      user_id: userId,
      comment,
      is_internal: isInternal,
    });

    return this.taskCommentRepository.save(taskComment);
  }

  /**
   * Получение комментариев задачи
   */
  async getComments(taskId: string, includeInternal: boolean = false): Promise<TaskComment[]> {
    const query = this.taskCommentRepository
      .createQueryBuilder('comment')
      .leftJoinAndSelect('comment.user', 'user')
      .where('comment.task_id = :taskId', { taskId });

    if (!includeInternal) {
      query.andWhere('comment.is_internal = :isInternal', { isInternal: false });
    }

    query.orderBy('comment.created_at', 'ASC');

    return query.getMany();
  }

  /**
   * Получение статистики по задачам
   */
  async getStats(machineId?: string, userId?: string) {
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

    const statusMap = statuses.reduce((acc, item) => {
      acc[item.status] = parseInt(item.count);
      return acc;
    }, {});

    // Статистика по типам
    const types = await this.taskRepository
      .createQueryBuilder('task')
      .select('task.type_code', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('task.type_code')
      .getRawMany();

    const typeMap = types.reduce((acc, item) => {
      acc[item.type] = parseInt(item.count);
      return acc;
    }, {});

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
      // Skip if due_date is null (should not happen due to query filter, but type safety)
      if (!task.due_date) continue;

      const overdueHours = Math.floor((now.getTime() - task.due_date.getTime()) / (1000 * 60 * 60));

      // Проверяем, не создан ли уже инцидент для этой задачи
      const existingIncident = await this.incidentsService.findAll(
        undefined,
        undefined,
        task.machine_id,
        undefined,
        undefined,
      );

      const hasIncidentForTask = existingIncident.some(
        (incident) =>
          incident.metadata &&
          incident.metadata.task_id === task.id &&
          incident.incident_type === IncidentType.OTHER,
      );

      if (!hasIncidentForTask) {
        // Создаем инцидент для просроченной задачи
        await this.incidentsService.create({
          incident_type: IncidentType.OTHER,
          priority: overdueHours > 24 ? IncidentPriority.HIGH : IncidentPriority.MEDIUM,
          machine_id: task.machine_id,
          title: `Просроченная задача: ${task.type_code}`,
          description:
            `Задача ${task.type_code} для аппарата ${task.machine?.machine_number || task.machine_id} просрочена на ${overdueHours} часов.\n` +
            `Статус: ${task.status}\n` +
            `Назначена: ${task.assigned_to?.full_name || 'не назначена'}\n` +
            `Срок выполнения был: ${task.due_date.toISOString()}\n` +
            `Описание: ${task.description}`,
          // reported_by_user_id is optional and omitted for system-generated incidents
          metadata: {
            task_id: task.id,
            overdue_hours: overdueHours,
            task_status: task.status,
            task_type: task.type_code,
          },
        });

        incidentsCreated++;

        // Отправляем уведомление менеджеру
        if (task.created_by_user_id) {
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

        // Аудит лог
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
    }

    return {
      escalated_count: overdueTasks.length,
      incidents_created: incidentsCreated,
    };
  }

  /**
   * Валидация перехода статусов
   */
  private validateStatusTransition(currentStatus: TaskStatus, newStatus: TaskStatus): void {
    const validTransitions: Record<TaskStatus, TaskStatus[]> = {
      [TaskStatus.PENDING]: [TaskStatus.ASSIGNED, TaskStatus.CANCELLED],
      [TaskStatus.ASSIGNED]: [TaskStatus.IN_PROGRESS, TaskStatus.POSTPONED, TaskStatus.CANCELLED],
      [TaskStatus.IN_PROGRESS]: [TaskStatus.COMPLETED, TaskStatus.POSTPONED, TaskStatus.CANCELLED],
      [TaskStatus.POSTPONED]: [TaskStatus.ASSIGNED, TaskStatus.CANCELLED],
      [TaskStatus.COMPLETED]: [], // Из завершенной задачи никуда нельзя перейти
      [TaskStatus.CANCELLED]: [], // Из отмененной задачи никуда нельзя перейти
      [TaskStatus.REJECTED]: [], // Из отклоненной задачи никуда нельзя перейти
    };

    const allowedStatuses = validTransitions[currentStatus] || [];

    if (!allowedStatuses.includes(newStatus)) {
      throw new BadRequestException(
        `Невозможен переход из статуса ${currentStatus} в статус ${newStatus}`,
      );
    }
  }
}
