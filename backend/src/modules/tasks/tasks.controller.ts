import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  Req,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { FilesService } from '../files/files.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { CompleteTaskDto } from './dto/complete-task.dto';
import { Task, TaskStatus, TaskType, TaskPriority } from './entities/task.entity';
import { TaskComment } from './entities/task-comment.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

/** Request with authenticated user from JWT */
interface AuthenticatedRequest extends ExpressRequest {
  user: {
    id: string;
    role?: string;
  };
}

@ApiTags('Tasks')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tasks')
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly filesService: FilesService,
  ) {}

  @Post()
  @Roles('Admin', 'MANAGER', 'Owner')
  @ApiOperation({ summary: 'Создать новую задачу' })
  @ApiResponse({
    status: 201,
    description: 'Задача успешно создана',
    type: Task,
  })
  @ApiResponse({ status: 400, description: 'Неверные данные' })
  create(@Body() createTaskDto: CreateTaskDto): Promise<Task> {
    return this.tasksService.create(createTaskDto);
  }

  @Get()
  @ApiOperation({ summary: 'Получить список всех задач с фильтрацией' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: TaskStatus,
    description: 'Фильтр по статусу',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: TaskType,
    description: 'Фильтр по типу задачи',
  })
  @ApiQuery({
    name: 'machineId',
    required: false,
    type: String,
    description: 'Фильтр по аппарату',
  })
  @ApiQuery({
    name: 'assignedToUserId',
    required: false,
    type: String,
    description: 'Фильтр по назначенному оператору',
  })
  @ApiQuery({
    name: 'priority',
    required: false,
    enum: TaskPriority,
    description: 'Фильтр по приоритету',
  })
  @ApiQuery({
    name: 'dateFrom',
    required: false,
    type: String,
    description: 'Начальная дата (ISO 8601)',
  })
  @ApiQuery({
    name: 'dateTo',
    required: false,
    type: String,
    description: 'Конечная дата (ISO 8601)',
  })
  @ApiResponse({
    status: 200,
    description: 'Список задач',
    type: [Task],
  })
  findAll(
    @Query('status') status?: TaskStatus,
    @Query('type') type?: TaskType,
    @Query('machineId') machineId?: string,
    @Query('assignedToUserId') assignedToUserId?: string,
    @Query('priority') priority?: TaskPriority,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ): Promise<Task[]> {
    return this.tasksService.findAll(
      status,
      type,
      machineId,
      assignedToUserId,
      priority,
      dateFrom,
      dateTo,
    );
  }

  @Get('stats')
  @ApiOperation({ summary: 'Получить статистику по задачам' })
  @ApiQuery({
    name: 'machineId',
    required: false,
    type: String,
    description: 'Фильтр по аппарату',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    type: String,
    description: 'Фильтр по оператору',
  })
  @ApiResponse({
    status: 200,
    description: 'Статистика задач',
  })
  getStats(@Query('machineId') machineId?: string, @Query('userId') userId?: string) {
    return this.tasksService.getStats(machineId, userId);
  }

  @Get('overdue')
  @ApiOperation({ summary: 'Получить просроченные задачи' })
  @ApiResponse({
    status: 200,
    description: 'Список просроченных задач',
    type: [Task],
  })
  getOverdueTasks(): Promise<Task[]> {
    return this.tasksService.getOverdueTasks();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить задачу по ID с полной информацией' })
  @ApiParam({ name: 'id', description: 'UUID задачи' })
  @ApiResponse({
    status: 200,
    description: 'Данные задачи с полными relations',
    type: Task,
  })
  @ApiResponse({ status: 404, description: 'Задача не найдена' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Task> {
    return this.tasksService.findOneWithDetails(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить задачу' })
  @ApiParam({ name: 'id', description: 'UUID задачи' })
  @ApiResponse({
    status: 200,
    description: 'Задача успешно обновлена',
    type: Task,
  })
  @ApiResponse({ status: 404, description: 'Задача не найдена' })
  @ApiResponse({ status: 400, description: 'Невалидный переход статусов' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTaskDto: UpdateTaskDto,
  ): Promise<Task> {
    return this.tasksService.update(id, updateTaskDto);
  }

  @Post(':id/assign')
  @Roles('Admin', 'MANAGER', 'Owner')
  @ApiOperation({ summary: 'Назначить задачу оператору' })
  @ApiParam({ name: 'id', description: 'UUID задачи' })
  @ApiResponse({
    status: 200,
    description: 'Задача успешно назначена',
    type: Task,
  })
  @ApiResponse({ status: 404, description: 'Задача не найдена' })
  assignTask(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('userId') userId: string,
  ): Promise<Task> {
    return this.tasksService.assignTask(id, userId);
  }

  @Post(':id/start')
  @ApiOperation({
    summary: 'Начать выполнение задачи',
    description: 'Только назначенный оператор может начать выполнение',
  })
  @ApiParam({ name: 'id', description: 'UUID задачи' })
  @ApiResponse({
    status: 200,
    description: 'Выполнение задачи начато',
    type: Task,
  })
  @ApiResponse({ status: 403, description: 'Доступ запрещен' })
  @ApiResponse({ status: 400, description: 'Невозможно начать задачу' })
  startTask(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthenticatedRequest): Promise<Task> {
    const userId = req.user.id; // Из JWT токена
    return this.tasksService.startTask(id, userId);
  }

  @Post(':id/complete')
  @ApiOperation({
    summary: 'ЗАВЕРШИТЬ ЗАДАЧУ (поддержка офлайн-режима)',
    description:
      'Завершение задачи с проверкой фото (можно пропустить в офлайн-режиме). ' +
      'Стандартный режим: требуются фото ДО и ПОСЛЕ. ' +
      'Офлайн-режим: установите skip_photos=true, фото можно загрузить позже. ' +
      'Поддержка исторических дат: укажите operation_date для ввода данных задним числом.',
  })
  @ApiParam({ name: 'id', description: 'UUID задачи' })
  @ApiResponse({
    status: 200,
    description: 'Задача успешно завершена',
    type: Task,
  })
  @ApiResponse({
    status: 400,
    description:
      'Ошибка: отсутствуют фото (в стандартном режиме), не завершен чек-лист, или невалидные данные',
  })
  @ApiResponse({ status: 403, description: 'Доступ запрещен' })
  completeTask(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() completeTaskDto: CompleteTaskDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<Task> {
    const userId = req.user.id; // Из JWT токена
    return this.tasksService.completeTask(id, userId, completeTaskDto);
  }

  @Get(':id/photos')
  @ApiOperation({
    summary: 'Получить фото задачи',
    description:
      'Возвращает все фото, связанные с задачей (фото до и после выполнения). ' +
      'Использует FilesService для получения файлов с категориями task_photo_before и task_photo_after.',
  })
  @ApiParam({ name: 'id', description: 'UUID задачи' })
  @ApiResponse({
    status: 200,
    description: 'Список фото задачи',
  })
  async getTaskPhotos(@Param('id', ParseUUIDPipe) id: string) {
    return await this.filesService.findByEntity('task', id);
  }

  @Post(':id/upload-photos')
  @ApiOperation({
    summary: 'Загрузить фото для офлайн-задачи',
    description:
      'Для задач, завершенных в офлайн-режиме (skip_photos=true), позволяет загрузить фото позже. ' +
      'Сначала загрузите фото через /files с категориями task_photo_before и task_photo_after, ' +
      'затем вызовите этот endpoint для обновления статуса задачи.',
  })
  @ApiParam({ name: 'id', description: 'UUID задачи' })
  @ApiResponse({
    status: 200,
    description: 'Фото успешно загружены, задача больше не ожидает фото',
    type: Task,
  })
  @ApiResponse({
    status: 400,
    description: 'Фото еще не загружены или задача не требует фото',
  })
  uploadPendingPhotos(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthenticatedRequest): Promise<Task> {
    const userId = req.user.id;
    return this.tasksService.uploadPendingPhotos(id, userId);
  }

  @Get('pending-photos')
  @ApiOperation({
    summary: 'Получить список задач с ожидающими фото',
    description:
      'Возвращает задачи, завершенные в офлайн-режиме, для которых еще не загружены фото. ' +
      'Без параметров возвращает все такие задачи. С параметром user_id - только для конкретного пользователя.',
  })
  @ApiResponse({
    status: 200,
    description: 'Список задач с ожидающими фото',
    type: [Task],
  })
  getPendingPhotosTasks(@Req() req: AuthenticatedRequest): Promise<Task[]> {
    // Операторы видят только свои задачи, админы - все
    const userId = req.user.role === 'operator' ? req.user.id : undefined;
    return this.tasksService.getPendingPhotosTasks(userId);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Отменить задачу' })
  @ApiParam({ name: 'id', description: 'UUID задачи' })
  @ApiResponse({
    status: 200,
    description: 'Задача отменена',
    type: Task,
  })
  @ApiResponse({ status: 400, description: 'Нельзя отменить завершенную задачу' })
  cancelTask(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<Task> {
    const userId = req.user.id;
    return this.tasksService.cancelTask(id, reason, userId);
  }

  @Post(':id/reject')
  @Roles('Admin', 'Owner')
  @ApiOperation({
    summary: 'Отклонить завершенную задачу (только админы)',
    description:
      'Отклонение завершенной задачи с автоматическим откатом всех изменений (инвентарь, финансы). ' +
      'Создаются компенсирующие транзакции для восстановления состояния системы до выполнения задачи. ' +
      'Доступно только для администраторов.',
  })
  @ApiParam({ name: 'id', description: 'UUID задачи' })
  @ApiResponse({
    status: 200,
    description: 'Задача отклонена, изменения откачены',
    type: Task,
  })
  @ApiResponse({
    status: 400,
    description: 'Можно отклонить только завершенные задачи',
  })
  @ApiResponse({
    status: 403,
    description: 'Доступ запрещен (только администраторы)',
  })
  rejectTask(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<Task> {
    const userId = req.user.id;
    return this.tasksService.rejectTask(id, userId, reason);
  }

  @Post(':id/postpone')
  @ApiOperation({ summary: 'Отложить задачу на другое время' })
  @ApiParam({ name: 'id', description: 'UUID задачи' })
  @ApiResponse({
    status: 200,
    description: 'Задача отложена',
    type: Task,
  })
  postponeTask(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('newScheduledDate') newScheduledDate: string,
    @Body('reason') reason: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<Task> {
    const userId = req.user.id;
    return this.tasksService.postponeTask(id, new Date(newScheduledDate), reason, userId);
  }

  @Post(':id/comments')
  @ApiOperation({ summary: 'Добавить комментарий к задаче' })
  @ApiParam({ name: 'id', description: 'UUID задачи' })
  @ApiResponse({
    status: 201,
    description: 'Комментарий добавлен',
    type: TaskComment,
  })
  addComment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('comment') comment: string,
    @Body('isInternal') isInternal: boolean,
    @Req() req: AuthenticatedRequest,
  ): Promise<TaskComment> {
    const userId = req.user.id;
    return this.tasksService.addComment(id, userId, comment, isInternal);
  }

  @Get(':id/comments')
  @ApiOperation({ summary: 'Получить комментарии задачи' })
  @ApiParam({ name: 'id', description: 'UUID задачи' })
  @ApiQuery({
    name: 'includeInternal',
    required: false,
    type: Boolean,
    description: 'Включить внутренние комментарии (только для админов)',
  })
  @ApiResponse({
    status: 200,
    description: 'Список комментариев',
    type: [TaskComment],
  })
  getComments(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('includeInternal') includeInternal?: boolean,
  ): Promise<TaskComment[]> {
    return this.tasksService.getComments(id, includeInternal);
  }

  @Delete(':id')
  @Roles('Admin', 'Owner')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить задачу (soft delete)' })
  @ApiParam({ name: 'id', description: 'UUID задачи' })
  @ApiResponse({ status: 204, description: 'Задача успешно удалена' })
  @ApiResponse({ status: 404, description: 'Задача не найдена' })
  @ApiResponse({
    status: 400,
    description: 'Нельзя удалить завершенную задачу',
  })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.tasksService.remove(id);
  }
}
