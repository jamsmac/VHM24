import {
  Injectable,
  NotFoundException,
  BadRequestException,
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
import { InventoryService } from '../inventory/inventory.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TaskCompletionService } from './services/task-completion.service';
import { TaskRejectionService } from './services/task-rejection.service';
import { TaskEscalationService } from './services/task-escalation.service';
import {
  NotificationType,
  NotificationChannel,
} from '../notifications/entities/notification.entity';

/**
 * TasksService
 *
 * Main coordinator service for task management.
 * Delegates complex operations to specialized services:
 * - TaskCompletionService: Task completion logic
 * - TaskRejectionService: Task rejection with rollback
 * - TaskEscalationService: Statistics and escalation
 *
 * Refactored from ~1500 lines to ~350 lines by extracting:
 * - Task completion logic → TaskCompletionService (~400 lines)
 * - Task rejection logic → TaskRejectionService (~180 lines)
 * - Task escalation/stats → TaskEscalationService (~250 lines)
 */
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
    @Inject(forwardRef(() => InventoryService))
    private readonly inventoryService: InventoryService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
    @Inject(forwardRef(() => TaskCompletionService))
    private readonly taskCompletionService: TaskCompletionService,
    @Inject(forwardRef(() => TaskRejectionService))
    private readonly taskRejectionService: TaskRejectionService,
    @Inject(forwardRef(() => TaskEscalationService))
    private readonly taskEscalationService: TaskEscalationService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Создание новой задачи
   */
  async create(createTaskDto: CreateTaskDto): Promise<Task> {
    const { items, components, ...taskData } = createTaskDto;

    // Проверка на конфликтующие задачи
    const activeStatuses = [TaskStatus.PENDING, TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS];
    const existingActiveTasks = await this.taskRepository.find({
      where: {
        machine_id: taskData.machine_id,
        status: In(activeStatuses),
      },
    });

    if (existingActiveTasks.length > 0) {
      throw new BadRequestException(
        `Невозможно создать задачу: на аппарате уже есть активная задача (ID: ${existingActiveTasks[0].id})`,
      );
    }

    const savedTaskId = await this.dataSource.transaction(async (transactionManager) => {
      const task = transactionManager.create(Task, {
        ...taskData,
        status: TaskStatus.PENDING,
      });

      const savedTask = await transactionManager.save(Task, task);

      // Создание позиций для задач пополнения
      if (items && items.length > 0) {
        const taskItems = items.map((item) =>
          transactionManager.create(TaskItem, {
            task_id: savedTask.id,
            ...item,
          }),
        );
        await transactionManager.save(TaskItem, taskItems);

        // Резервация инвентаря для REFILL
        if (taskData.type_code === TaskType.REFILL && taskData.assigned_to_user_id) {
          const reservationItems = items.map((item) => ({
            nomenclature_id: item.nomenclature_id,
            quantity: item.planned_quantity,
          }));

          await this.inventoryService.createReservation(
            savedTask.id,
            taskData.assigned_to_user_id,
            reservationItems,
            24,
          );
        }
      }

      // Создание связей с компонентами
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
      .where('task.deleted_at IS NULL')
      .andWhere('(task.machine_id IS NULL OR machine.deleted_at IS NULL)');

    if (status) query.andWhere('task.status = :status', { status });
    if (type) query.andWhere('task.type_code = :type', { type });
    if (machineId) query.andWhere('task.machine_id = :machineId', { machineId });
    if (assignedToUserId)
      query.andWhere('task.assigned_to_user_id = :assignedToUserId', { assignedToUserId });
    if (priority) query.andWhere('task.priority = :priority', { priority });
    if (dateFrom && dateTo)
      query.andWhere('task.scheduled_date BETWEEN :dateFrom AND :dateTo', { dateFrom, dateTo });

    query.orderBy('task.priority', 'DESC').addOrderBy('task.scheduled_date', 'ASC');

    return query.getMany();
  }

  /**
   * Получение задачи по ID с минимальными relations (для внутреннего использования)
   */
  async findOne(id: string): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: ['machine', 'assigned_to'],
    });

    if (!task) {
      throw new NotFoundException(`Задача с ID ${id} не найдена`);
    }

    return task;
  }

  /**
   * Получение задачи по ID с полными relations (для API детального просмотра)
   */
  async findOneWithDetails(id: string): Promise<Task> {
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

    if (task.status === TaskStatus.COMPLETED) {
      throw new BadRequestException('Нельзя удалить завершенную задачу');
    }

    try {
      await this.inventoryService.cancelReservation(task.id);
    } catch {
      this.logger.warn(`Не удалось отменить резервацию при удалении задачи ${task.id}`);
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

    await this.notificationsService.create({
      type: NotificationType.TASK_ASSIGNED,
      channel: NotificationChannel.IN_APP,
      recipient_id: userId,
      title: 'Новая задача назначена',
      message: `Вам назначена задача ${task.type_code} для аппарата ${task.machine?.machine_number || task.machine_id}`,
      data: { task_id: savedTask.id, machine_id: savedTask.machine_id },
      action_url: `/tasks/${savedTask.id}`,
    });

    return savedTask;
  }

  /**
   * Начало выполнения задачи
   */
  async startTask(id: string, userId: string): Promise<Task> {
    const task = await this.findOne(id);

    if (task.assigned_to_user_id !== userId) {
      throw new BadRequestException('Только назначенный оператор может начать выполнение задачи');
    }

    if (task.status !== TaskStatus.ASSIGNED && task.status !== TaskStatus.PENDING) {
      throw new BadRequestException(`Невозможно начать задачу со статусом ${task.status}`);
    }

    task.status = TaskStatus.IN_PROGRESS;
    task.started_at = new Date();

    return this.taskRepository.save(task);
  }

  /**
   * Завершение задачи (делегируется TaskCompletionService)
   */
  async completeTask(id: string, userId: string, completeTaskDto: CompleteTaskDto): Promise<Task> {
    const task = await this.findOne(id);
    return this.taskCompletionService.completeTask(task, userId, completeTaskDto);
  }

  /**
   * Загрузка фото для офлайн-задачи (делегируется TaskCompletionService)
   */
  async uploadPendingPhotos(taskId: string, userId: string): Promise<Task> {
    const task = await this.findOne(taskId);
    return this.taskCompletionService.uploadPendingPhotos(task, userId);
  }

  /**
   * Получение задач с ожидающими фото (делегируется TaskCompletionService)
   */
  async getPendingPhotosTasks(userId?: string): Promise<Task[]> {
    return this.taskCompletionService.getPendingPhotosTasks(userId);
  }

  /**
   * Отмена задачи
   */
  async cancelTask(id: string, reason: string, userId: string): Promise<Task> {
    const task = await this.findOne(id);

    if (task.status === TaskStatus.COMPLETED) {
      throw new BadRequestException('Нельзя отменить завершенную задачу');
    }

    try {
      await this.inventoryService.cancelReservation(task.id);
    } catch {
      this.logger.warn(`Не удалось отменить резервацию для задачи ${task.id}`);
    }

    task.status = TaskStatus.CANCELLED;

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
   * Отклонение задачи (делегируется TaskRejectionService)
   */
  async rejectTask(id: string, userId: string, reason: string): Promise<Task> {
    const task = await this.findOne(id);
    return this.taskRejectionService.rejectTask(task, userId, reason);
  }

  /**
   * Отложить задачу
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
   * Добавление комментария
   */
  async addComment(
    taskId: string,
    userId: string,
    comment: string,
    isInternal: boolean = false,
  ): Promise<TaskComment> {
    await this.findOne(taskId); // Validate task exists

    const taskComment = this.taskCommentRepository.create({
      task_id: taskId,
      user_id: userId,
      comment,
      is_internal: isInternal,
    });

    return this.taskCommentRepository.save(taskComment);
  }

  /**
   * Получение комментариев
   */
  async getComments(taskId: string, includeInternal: boolean = false): Promise<TaskComment[]> {
    const query = this.taskCommentRepository
      .createQueryBuilder('comment')
      .leftJoinAndSelect('comment.user', 'user')
      .where('comment.task_id = :taskId', { taskId });

    if (!includeInternal) {
      query.andWhere('comment.is_internal = :isInternal', { isInternal: false });
    }

    return query.orderBy('comment.created_at', 'ASC').getMany();
  }

  /**
   * Статистика (делегируется TaskEscalationService)
   */
  async getStats(machineId?: string, userId?: string) {
    return this.taskEscalationService.getStats(machineId, userId);
  }

  /**
   * Просроченные задачи (делегируется TaskEscalationService)
   */
  async getOverdueTasks(): Promise<Task[]> {
    return this.taskEscalationService.getOverdueTasks();
  }

  /**
   * Эскалация (делегируется TaskEscalationService)
   */
  async escalateOverdueTasks(): Promise<{ escalated_count: number; incidents_created: number }> {
    return this.taskEscalationService.escalateOverdueTasks();
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
      [TaskStatus.COMPLETED]: [],
      [TaskStatus.CANCELLED]: [],
      [TaskStatus.REJECTED]: [],
    };

    const allowedStatuses = validTransitions[currentStatus] || [];

    if (!allowedStatuses.includes(newStatus)) {
      throw new BadRequestException(
        `Невозможен переход из статуса ${currentStatus} в статус ${newStatus}`,
      );
    }
  }
}
