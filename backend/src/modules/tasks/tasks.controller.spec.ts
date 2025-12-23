import { Test, TestingModule } from '@nestjs/testing';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { FilesService } from '../files/files.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Task, TaskStatus, TaskType, TaskPriority } from './entities/task.entity';
import { TaskComment } from './entities/task-comment.entity';

interface MockTasksService {
  create: jest.Mock;
  findAll: jest.Mock;
  findOne: jest.Mock;
  findOneWithDetails: jest.Mock;
  update: jest.Mock;
  remove: jest.Mock;
  assignTask: jest.Mock;
  startTask: jest.Mock;
  completeTask: jest.Mock;
  cancelTask: jest.Mock;
  rejectTask: jest.Mock;
  postponeTask: jest.Mock;
  addComment: jest.Mock;
  getComments: jest.Mock;
  getStats: jest.Mock;
  getOverdueTasks: jest.Mock;
  uploadPendingPhotos: jest.Mock;
  getPendingPhotosTasks: jest.Mock;
}

interface MockFilesService {
  findByEntity: jest.Mock;
}

describe('TasksController', () => {
  let controller: TasksController;
  let mockTasksService: MockTasksService;
  let mockFilesService: MockFilesService;

  const mockTask: Partial<Task> = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    type_code: TaskType.REFILL,
    status: TaskStatus.PENDING,
    priority: TaskPriority.NORMAL,
    machine_id: '123e4567-e89b-12d3-a456-426614174002',
    assigned_to_user_id: '123e4567-e89b-12d3-a456-426614174003',
    description: 'Test task',
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockComment: Partial<TaskComment> = {
    id: '123e4567-e89b-12d3-a456-426614174004',
    task_id: mockTask.id,
    user_id: '123e4567-e89b-12d3-a456-426614174003',
    comment: 'Test comment',
    is_internal: false,
    created_at: new Date(),
  };

  const mockUser = { id: 'user-123', role: 'ADMIN' };
  const mockRequest = { user: mockUser } as any;

  beforeEach(async () => {
    mockTasksService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      findOneWithDetails: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      assignTask: jest.fn(),
      startTask: jest.fn(),
      completeTask: jest.fn(),
      cancelTask: jest.fn(),
      rejectTask: jest.fn(),
      postponeTask: jest.fn(),
      addComment: jest.fn(),
      getComments: jest.fn(),
      getStats: jest.fn(),
      getOverdueTasks: jest.fn(),
      uploadPendingPhotos: jest.fn(),
      getPendingPhotosTasks: jest.fn(),
    };

    mockFilesService = {
      findByEntity: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [
        {
          provide: TasksService,
          useValue: mockTasksService,
        },
        {
          provide: FilesService,
          useValue: mockFilesService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TasksController>(TasksController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new task', async () => {
      const createDto = {
        type_code: TaskType.REFILL,
        machine_id: '123e4567-e89b-12d3-a456-426614174002',
        description: 'New task',
      };
      mockTasksService.create.mockResolvedValue(mockTask);

      const result = await controller.create(createDto as any);

      expect(result).toEqual(mockTask);
      expect(mockTasksService.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('findAll', () => {
    it('should return all tasks', async () => {
      const mockTasks = [mockTask];
      mockTasksService.findAll.mockResolvedValue(mockTasks);

      const result = await controller.findAll();

      expect(result).toEqual(mockTasks);
      expect(mockTasksService.findAll).toHaveBeenCalledWith(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
      );
    });

    it('should filter by status', async () => {
      mockTasksService.findAll.mockResolvedValue([]);

      await controller.findAll(TaskStatus.PENDING);

      expect(mockTasksService.findAll).toHaveBeenCalledWith(
        TaskStatus.PENDING,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
      );
    });

    it('should filter by type', async () => {
      mockTasksService.findAll.mockResolvedValue([]);

      await controller.findAll(undefined, TaskType.REFILL);

      expect(mockTasksService.findAll).toHaveBeenCalledWith(
        undefined,
        TaskType.REFILL,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
      );
    });

    it('should filter by machineId', async () => {
      mockTasksService.findAll.mockResolvedValue([]);

      await controller.findAll(undefined, undefined, 'machine-123');

      expect(mockTasksService.findAll).toHaveBeenCalledWith(
        undefined,
        undefined,
        'machine-123',
        undefined,
        undefined,
        undefined,
        undefined,
      );
    });

    it('should filter by assignedToUserId', async () => {
      mockTasksService.findAll.mockResolvedValue([]);

      await controller.findAll(undefined, undefined, undefined, 'user-123');

      expect(mockTasksService.findAll).toHaveBeenCalledWith(
        undefined,
        undefined,
        undefined,
        'user-123',
        undefined,
        undefined,
        undefined,
      );
    });

    it('should filter by priority', async () => {
      mockTasksService.findAll.mockResolvedValue([]);

      await controller.findAll(undefined, undefined, undefined, undefined, TaskPriority.HIGH);

      expect(mockTasksService.findAll).toHaveBeenCalledWith(
        undefined,
        undefined,
        undefined,
        undefined,
        TaskPriority.HIGH,
        undefined,
        undefined,
      );
    });

    it('should filter by date range', async () => {
      mockTasksService.findAll.mockResolvedValue([]);

      await controller.findAll(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        '2025-01-01',
        '2025-12-31',
      );

      expect(mockTasksService.findAll).toHaveBeenCalledWith(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        '2025-01-01',
        '2025-12-31',
      );
    });
  });

  describe('getStats', () => {
    it('should return task statistics', async () => {
      const mockStats = { total: 10, pending: 5, completed: 5 };
      mockTasksService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats();

      expect(result).toEqual(mockStats);
      expect(mockTasksService.getStats).toHaveBeenCalledWith(undefined, undefined);
    });

    it('should filter stats by machineId', async () => {
      mockTasksService.getStats.mockResolvedValue({});

      await controller.getStats('machine-123');

      expect(mockTasksService.getStats).toHaveBeenCalledWith('machine-123', undefined);
    });

    it('should filter stats by userId', async () => {
      mockTasksService.getStats.mockResolvedValue({});

      await controller.getStats(undefined, 'user-123');

      expect(mockTasksService.getStats).toHaveBeenCalledWith(undefined, 'user-123');
    });
  });

  describe('getOverdueTasks', () => {
    it('should return overdue tasks', async () => {
      const mockTasks = [mockTask];
      mockTasksService.getOverdueTasks.mockResolvedValue(mockTasks);

      const result = await controller.getOverdueTasks();

      expect(result).toEqual(mockTasks);
      expect(mockTasksService.getOverdueTasks).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should find task by id', async () => {
      mockTasksService.findOneWithDetails.mockResolvedValue(mockTask);

      const result = await controller.findOne('123e4567-e89b-12d3-a456-426614174001');

      expect(result).toEqual(mockTask);
      expect(mockTasksService.findOneWithDetails).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174001');
    });
  });

  describe('update', () => {
    it('should update task', async () => {
      const updateDto = { description: 'Updated task' };
      const updatedTask = { ...mockTask, description: 'Updated task' };
      mockTasksService.update.mockResolvedValue(updatedTask);

      const result = await controller.update('123e4567-e89b-12d3-a456-426614174001', updateDto);

      expect(result).toEqual(updatedTask);
      expect(mockTasksService.update).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174001',
        updateDto,
      );
    });
  });

  describe('assignTask', () => {
    it('should assign task to user', async () => {
      const assignedTask = { ...mockTask, assigned_to_user_id: 'new-user-123' };
      mockTasksService.assignTask.mockResolvedValue(assignedTask);

      const result = await controller.assignTask('123e4567-e89b-12d3-a456-426614174001', 'new-user-123');

      expect(result).toEqual(assignedTask);
      expect(mockTasksService.assignTask).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174001',
        'new-user-123',
      );
    });
  });

  describe('startTask', () => {
    it('should start task execution', async () => {
      const startedTask = { ...mockTask, status: TaskStatus.IN_PROGRESS };
      mockTasksService.startTask.mockResolvedValue(startedTask);

      const result = await controller.startTask('123e4567-e89b-12d3-a456-426614174001', mockRequest);

      expect(result).toEqual(startedTask);
      expect(mockTasksService.startTask).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174001',
        'user-123',
      );
    });
  });

  describe('completeTask', () => {
    it('should complete task', async () => {
      const completeDto = { notes: 'Task completed' };
      const completedTask = { ...mockTask, status: TaskStatus.COMPLETED };
      mockTasksService.completeTask.mockResolvedValue(completedTask);

      const result = await controller.completeTask(
        '123e4567-e89b-12d3-a456-426614174001',
        completeDto as any,
        mockRequest,
      );

      expect(result).toEqual(completedTask);
      expect(mockTasksService.completeTask).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174001',
        'user-123',
        completeDto,
      );
    });
  });

  describe('getTaskPhotos', () => {
    it('should return task photos', async () => {
      const mockPhotos = [{ id: 'photo-1', filename: 'before.jpg' }];
      mockFilesService.findByEntity.mockResolvedValue(mockPhotos);

      const result = await controller.getTaskPhotos('123e4567-e89b-12d3-a456-426614174001');

      expect(result).toEqual(mockPhotos);
      expect(mockFilesService.findByEntity).toHaveBeenCalledWith(
        'task',
        '123e4567-e89b-12d3-a456-426614174001',
      );
    });
  });

  describe('uploadPendingPhotos', () => {
    it('should upload pending photos', async () => {
      const updatedTask = { ...mockTask, pending_photos: false };
      mockTasksService.uploadPendingPhotos.mockResolvedValue(updatedTask);

      const result = await controller.uploadPendingPhotos(
        '123e4567-e89b-12d3-a456-426614174001',
        mockRequest,
      );

      expect(result).toEqual(updatedTask);
      expect(mockTasksService.uploadPendingPhotos).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174001',
        'user-123',
      );
    });
  });

  describe('getPendingPhotosTasks', () => {
    it('should return all pending photos tasks for admin', async () => {
      const mockTasks = [mockTask];
      mockTasksService.getPendingPhotosTasks.mockResolvedValue(mockTasks);

      const result = await controller.getPendingPhotosTasks(mockRequest);

      expect(result).toEqual(mockTasks);
      expect(mockTasksService.getPendingPhotosTasks).toHaveBeenCalledWith(undefined);
    });

    it('should return only own pending photos tasks for operator', async () => {
      const operatorRequest = { user: { id: 'operator-123', role: 'operator' } } as any;
      mockTasksService.getPendingPhotosTasks.mockResolvedValue([]);

      await controller.getPendingPhotosTasks(operatorRequest);

      expect(mockTasksService.getPendingPhotosTasks).toHaveBeenCalledWith('operator-123');
    });
  });

  describe('cancelTask', () => {
    it('should cancel task', async () => {
      const cancelledTask = { ...mockTask, status: TaskStatus.CANCELLED };
      mockTasksService.cancelTask.mockResolvedValue(cancelledTask);

      const result = await controller.cancelTask(
        '123e4567-e89b-12d3-a456-426614174001',
        'Cancelled by user',
        mockRequest,
      );

      expect(result).toEqual(cancelledTask);
      expect(mockTasksService.cancelTask).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174001',
        'Cancelled by user',
        'user-123',
      );
    });
  });

  describe('rejectTask', () => {
    it('should reject completed task', async () => {
      const rejectedTask = { ...mockTask, status: TaskStatus.REJECTED };
      mockTasksService.rejectTask.mockResolvedValue(rejectedTask);

      const result = await controller.rejectTask(
        '123e4567-e89b-12d3-a456-426614174001',
        'Invalid data',
        mockRequest,
      );

      expect(result).toEqual(rejectedTask);
      expect(mockTasksService.rejectTask).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174001',
        'user-123',
        'Invalid data',
      );
    });
  });

  describe('postponeTask', () => {
    it('should postpone task', async () => {
      const postponedTask = { ...mockTask, scheduled_date: new Date('2025-12-25') };
      mockTasksService.postponeTask.mockResolvedValue(postponedTask);

      const result = await controller.postponeTask(
        '123e4567-e89b-12d3-a456-426614174001',
        '2025-12-25',
        'Need more time',
        mockRequest,
      );

      expect(result).toEqual(postponedTask);
      expect(mockTasksService.postponeTask).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174001',
        expect.any(Date),
        'Need more time',
        'user-123',
      );
    });
  });

  describe('addComment', () => {
    it('should add comment to task', async () => {
      mockTasksService.addComment.mockResolvedValue(mockComment);

      const result = await controller.addComment(
        '123e4567-e89b-12d3-a456-426614174001',
        'New comment',
        false,
        mockRequest,
      );

      expect(result).toEqual(mockComment);
      expect(mockTasksService.addComment).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174001',
        'user-123',
        'New comment',
        false,
      );
    });

    it('should add internal comment', async () => {
      mockTasksService.addComment.mockResolvedValue({ ...mockComment, is_internal: true });

      await controller.addComment(
        '123e4567-e89b-12d3-a456-426614174001',
        'Internal note',
        true,
        mockRequest,
      );

      expect(mockTasksService.addComment).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174001',
        'user-123',
        'Internal note',
        true,
      );
    });
  });

  describe('getComments', () => {
    it('should return task comments', async () => {
      const mockComments = [mockComment];
      mockTasksService.getComments.mockResolvedValue(mockComments);

      const result = await controller.getComments('123e4567-e89b-12d3-a456-426614174001');

      expect(result).toEqual(mockComments);
      expect(mockTasksService.getComments).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174001',
        undefined,
      );
    });

    it('should include internal comments when requested', async () => {
      mockTasksService.getComments.mockResolvedValue([]);

      await controller.getComments('123e4567-e89b-12d3-a456-426614174001', true);

      expect(mockTasksService.getComments).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174001',
        true,
      );
    });
  });

  describe('remove', () => {
    it('should soft delete task', async () => {
      mockTasksService.remove.mockResolvedValue(undefined);

      await controller.remove('123e4567-e89b-12d3-a456-426614174001');

      expect(mockTasksService.remove).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174001');
    });
  });
});
