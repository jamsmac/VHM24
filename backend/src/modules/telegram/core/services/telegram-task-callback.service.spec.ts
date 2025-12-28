import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TelegramTaskCallbackService } from './telegram-task-callback.service';
import { TelegramMessageLog, TelegramMessageType } from '../../shared/entities/telegram-message-log.entity';
import { TelegramLanguage } from '../../shared/entities/telegram-user.entity';
import { TasksService } from '../../../tasks/tasks.service';
import { UsersService } from '../../../users/users.service';
import { TelegramSessionService } from '../../infrastructure/services/telegram-session.service';
import { BotContext, TelegramTaskInfo, TaskExecutionState } from '../../shared/types/telegram.types';
import { TaskType, TaskStatus } from '../../../tasks/entities/task.entity';

// Mock Telegraf Markup
jest.mock('telegraf', () => ({
  Markup: {
    inlineKeyboard: jest.fn((buttons) => ({ reply_markup: { inline_keyboard: buttons } })),
    button: {
      callback: jest.fn((text, data) => ({ text, callback_data: data })),
    },
  },
}));

describe('TelegramTaskCallbackService', () => {
  let service: TelegramTaskCallbackService;
  let telegramMessageLogRepository: jest.Mocked<Repository<TelegramMessageLog>>;
  let tasksService: jest.Mocked<TasksService>;
  let usersService: jest.Mocked<UsersService>;
  let sessionService: jest.Mocked<TelegramSessionService>;

  const mockTelegramUser = {
    id: 'tg-user-1',
    telegram_id: '123456789',
    user_id: 'user-1',
    is_verified: true,
    language: TelegramLanguage.RU,
  };

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    full_name: 'Test User',
  };

  const mockTask = {
    id: 'task-1',
    type_code: TaskType.REFILL,
    status: TaskStatus.IN_PROGRESS,
    scheduled_date: new Date().toISOString(),
    machine: {
      id: 'machine-1',
      machine_number: 'M-001',
      location: { id: 'loc-1', name: 'Test Location' },
    },
    checklist: [
      { item: 'Step 1', completed: false },
      { item: 'Step 2', completed: false },
      { item: 'Step 3', completed: false },
    ],
    metadata: null,
  } as unknown as TelegramTaskInfo;

  const mockExecutionState: TaskExecutionState = {
    current_step: 0,
    checklist_progress: {
      0: { completed: false },
      1: { completed: false },
      2: { completed: false },
    },
    photos_uploaded: { before: false, after: false },
    started_at: new Date().toISOString(),
    last_interaction_at: new Date().toISOString(),
  };

  const createMockContext = (overrides: Partial<BotContext> = {}): BotContext => ({
    telegramUser: mockTelegramUser as any,
    chat: { id: 123456789 },
    answerCbQuery: jest.fn().mockResolvedValue(undefined),
    reply: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as BotContext);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramTaskCallbackService,
        {
          provide: getRepositoryToken(TelegramMessageLog),
          useValue: {
            create: jest.fn().mockReturnValue({}),
            save: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: TasksService,
          useValue: {
            findOne: jest.fn(),
            startTask: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: UsersService,
          useValue: {
            findByTelegramId: jest.fn(),
          },
        },
        {
          provide: TelegramSessionService,
          useValue: {
            requestPhoto: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TelegramTaskCallbackService>(TelegramTaskCallbackService);
    telegramMessageLogRepository = module.get(getRepositoryToken(TelegramMessageLog));
    tasksService = module.get(TasksService);
    usersService = module.get(UsersService);
    sessionService = module.get(TelegramSessionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================================================
  // handleTaskStart
  // ============================================================================

  describe('handleTaskStart', () => {
    it('should start task and request before photo in Russian', async () => {
      const ctx = createMockContext();
      usersService.findByTelegramId.mockResolvedValue(mockUser as any);
      tasksService.startTask.mockResolvedValue(mockTask as any);

      await service.handleTaskStart(ctx, 'task-1');

      expect(ctx.answerCbQuery).toHaveBeenCalled();
      expect(usersService.findByTelegramId).toHaveBeenCalledWith('123456789');
      expect(tasksService.startTask).toHaveBeenCalledWith('task-1', 'user-1');
      expect(sessionService.requestPhoto).toHaveBeenCalledWith('user-1', 'task-1', 'before');
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Задача'),
        expect.objectContaining({ parse_mode: 'HTML' }),
      );
    });

    it('should start task and request before photo in English', async () => {
      const ctx = createMockContext({
        telegramUser: { ...mockTelegramUser, language: TelegramLanguage.EN } as any,
      });
      usersService.findByTelegramId.mockResolvedValue(mockUser as any);
      tasksService.startTask.mockResolvedValue(mockTask as any);

      await service.handleTaskStart(ctx, 'task-1');

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Task'),
        expect.objectContaining({ parse_mode: 'HTML' }),
      );
    });

    it('should show N/A for missing machine data in English', async () => {
      const ctx = createMockContext({
        telegramUser: { ...mockTelegramUser, language: TelegramLanguage.EN } as any,
      });
      usersService.findByTelegramId.mockResolvedValue(mockUser as any);
      const taskWithoutMachine = {
        ...mockTask,
        machine: null,
      };
      tasksService.startTask.mockResolvedValue(taskWithoutMachine as any);

      await service.handleTaskStart(ctx, 'task-1');

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('N/A'),
        expect.objectContaining({ parse_mode: 'HTML' }),
      );
    });

    it('should show N/A for missing location in English', async () => {
      const ctx = createMockContext({
        telegramUser: { ...mockTelegramUser, language: TelegramLanguage.EN } as any,
      });
      usersService.findByTelegramId.mockResolvedValue(mockUser as any);
      const taskWithoutLocation = {
        ...mockTask,
        machine: { ...mockTask.machine, location: null },
      };
      tasksService.startTask.mockResolvedValue(taskWithoutLocation as any);

      await service.handleTaskStart(ctx, 'task-1');

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('N/A'),
        expect.objectContaining({ parse_mode: 'HTML' }),
      );
    });

    it('should show N/A for missing machine data in Russian', async () => {
      const ctx = createMockContext();
      usersService.findByTelegramId.mockResolvedValue(mockUser as any);
      const taskWithoutMachine = {
        ...mockTask,
        machine: null,
      };
      tasksService.startTask.mockResolvedValue(taskWithoutMachine as any);

      await service.handleTaskStart(ctx, 'task-1');

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('N/A'),
        expect.objectContaining({ parse_mode: 'HTML' }),
      );
    });

    it('should show N/A for missing location in Russian', async () => {
      const ctx = createMockContext();
      usersService.findByTelegramId.mockResolvedValue(mockUser as any);
      const taskWithoutLocation = {
        ...mockTask,
        machine: { ...mockTask.machine, location: null },
      };
      tasksService.startTask.mockResolvedValue(taskWithoutLocation as any);

      await service.handleTaskStart(ctx, 'task-1');

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('N/A'),
        expect.objectContaining({ parse_mode: 'HTML' }),
      );
    });

    it('should show error if user not found', async () => {
      const ctx = createMockContext();
      usersService.findByTelegramId.mockResolvedValue(null);

      await service.handleTaskStart(ctx, 'task-1');

      expect(ctx.reply).toHaveBeenCalledWith('❌ Пользователь не найден');
      expect(tasksService.startTask).not.toHaveBeenCalled();
    });

    it('should show error in English if user not found', async () => {
      const ctx = createMockContext({
        telegramUser: { ...mockTelegramUser, language: TelegramLanguage.EN } as any,
      });
      usersService.findByTelegramId.mockResolvedValue(null);

      await service.handleTaskStart(ctx, 'task-1');

      expect(ctx.reply).toHaveBeenCalledWith('❌ User not found');
    });

    it('should handle error when starting task', async () => {
      const ctx = createMockContext();
      usersService.findByTelegramId.mockResolvedValue(mockUser as any);
      tasksService.startTask.mockRejectedValue(new Error('Task already started'));

      await service.handleTaskStart(ctx, 'task-1');

      expect(ctx.reply).toHaveBeenCalledWith('❌ Ошибка: Task already started');
    });

    it('should handle error in English', async () => {
      const ctx = createMockContext({
        telegramUser: { ...mockTelegramUser, language: TelegramLanguage.EN } as any,
      });
      usersService.findByTelegramId.mockResolvedValue(mockUser as any);
      tasksService.startTask.mockRejectedValue(new Error('Task already started'));

      await service.handleTaskStart(ctx, 'task-1');

      expect(ctx.reply).toHaveBeenCalledWith('❌ Error: Task already started');
    });

    it('should log callback to database', async () => {
      const ctx = createMockContext();
      usersService.findByTelegramId.mockResolvedValue(mockUser as any);
      tasksService.startTask.mockResolvedValue(mockTask as any);

      await service.handleTaskStart(ctx, 'task-1');

      expect(telegramMessageLogRepository.create).toHaveBeenCalledWith({
        telegram_user_id: 'tg-user-1',
        chat_id: '123456789',
        message_type: TelegramMessageType.CALLBACK,
        command: 'task_start_task-1',
        message_text: 'Callback: task_start_task-1',
      });
      expect(telegramMessageLogRepository.save).toHaveBeenCalled();
    });

    it('should use default language if not set', async () => {
      const ctx = createMockContext({
        telegramUser: { ...mockTelegramUser, language: undefined } as any,
      });
      usersService.findByTelegramId.mockResolvedValue(mockUser as any);
      tasksService.startTask.mockResolvedValue(mockTask as any);

      await service.handleTaskStart(ctx, 'task-1');

      // Should default to Russian
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Задача'),
        expect.any(Object),
      );
    });
  });

  // ============================================================================
  // handleStepDone
  // ============================================================================

  describe('handleStepDone', () => {
    it('should mark step as completed', async () => {
      const ctx = createMockContext();
      const taskWithState = {
        ...mockTask,
        metadata: { telegram_execution_state: mockExecutionState },
      };
      tasksService.findOne.mockResolvedValue(taskWithState as any);
      tasksService.update.mockResolvedValue(taskWithState as any);

      await service.handleStepDone(ctx, 'task-1', 0);

      expect(ctx.answerCbQuery).toHaveBeenCalledWith('✅');
      expect(tasksService.update).toHaveBeenCalled();
    });

    it('should log callback', async () => {
      const ctx = createMockContext();
      const taskWithState = {
        ...mockTask,
        metadata: { telegram_execution_state: mockExecutionState },
      };
      tasksService.findOne.mockResolvedValue(taskWithState as any);
      tasksService.update.mockResolvedValue(taskWithState as any);

      await service.handleStepDone(ctx, 'task-1', 1);

      expect(telegramMessageLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'step_done_task-1_1',
        }),
      );
    });

    it('should not proceed if user not verified', async () => {
      const ctx = createMockContext({
        telegramUser: { ...mockTelegramUser, is_verified: false } as any,
      });

      await service.handleStepDone(ctx, 'task-1', 0);

      expect(tasksService.findOne).not.toHaveBeenCalled();
    });

    it('should show error if state not found', async () => {
      const ctx = createMockContext();
      tasksService.findOne.mockResolvedValue({ ...mockTask, metadata: null } as any);

      await service.handleStepDone(ctx, 'task-1', 0);

      expect(ctx.reply).toHaveBeenCalledWith('❌ Состояние выполнения не найдено');
    });

    it('should show error in English if state not found', async () => {
      const ctx = createMockContext({
        telegramUser: { ...mockTelegramUser, language: TelegramLanguage.EN } as any,
      });
      tasksService.findOne.mockResolvedValue({ ...mockTask, metadata: null } as any);

      await service.handleStepDone(ctx, 'task-1', 0);

      expect(ctx.reply).toHaveBeenCalledWith('❌ Execution state not found');
    });

    it('should show error for invalid step index', async () => {
      const ctx = createMockContext();
      const taskWithState = {
        ...mockTask,
        metadata: { telegram_execution_state: mockExecutionState },
      };
      tasksService.findOne.mockResolvedValue(taskWithState as any);

      await service.handleStepDone(ctx, 'task-1', 10);

      expect(ctx.reply).toHaveBeenCalledWith('❌ Некорректный номер шага');
    });

    it('should show error in English for invalid step index', async () => {
      const ctx = createMockContext({
        telegramUser: { ...mockTelegramUser, language: TelegramLanguage.EN } as any,
      });
      const taskWithState = {
        ...mockTask,
        metadata: { telegram_execution_state: mockExecutionState },
      };
      tasksService.findOne.mockResolvedValue(taskWithState as any);

      await service.handleStepDone(ctx, 'task-1', -1);

      expect(ctx.reply).toHaveBeenCalledWith('❌ Invalid step number');
    });
  });

  // ============================================================================
  // handleStepSkip
  // ============================================================================

  describe('handleStepSkip', () => {
    it('should skip step', async () => {
      const ctx = createMockContext();
      const taskWithState = {
        ...mockTask,
        metadata: { telegram_execution_state: mockExecutionState },
      };
      tasksService.findOne.mockResolvedValue(taskWithState as any);
      tasksService.update.mockResolvedValue(taskWithState as any);

      await service.handleStepSkip(ctx, 'task-1', 0);

      expect(ctx.answerCbQuery).toHaveBeenCalledWith('⏭️');
      expect(tasksService.update).toHaveBeenCalled();
    });

    it('should log skip callback', async () => {
      const ctx = createMockContext();
      const taskWithState = {
        ...mockTask,
        metadata: { telegram_execution_state: mockExecutionState },
      };
      tasksService.findOne.mockResolvedValue(taskWithState as any);
      tasksService.update.mockResolvedValue(taskWithState as any);

      await service.handleStepSkip(ctx, 'task-1', 2);

      expect(telegramMessageLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'step_skip_task-1_2',
        }),
      );
    });

    it('should mark step as not completed when skipped', async () => {
      const ctx = createMockContext();
      const taskWithState = {
        ...mockTask,
        metadata: { telegram_execution_state: { ...mockExecutionState } },
      };
      tasksService.findOne.mockResolvedValue(taskWithState as any);
      tasksService.update.mockResolvedValue(taskWithState as any);

      await service.handleStepSkip(ctx, 'task-1', 0);

      // The checklist should be updated with completed: false
      expect(tasksService.update).toHaveBeenCalledWith(
        'task-1',
        expect.objectContaining({
          checklist: expect.arrayContaining([
            expect.objectContaining({ completed: false }),
          ]),
        }),
      );
    });

    it('should handle step skip when checklist is null', async () => {
      const ctx = createMockContext();
      const taskWithNullChecklist = {
        ...mockTask,
        checklist: null,
        metadata: { telegram_execution_state: { ...mockExecutionState } },
      };
      tasksService.findOne.mockResolvedValue(taskWithNullChecklist as any);
      tasksService.update.mockResolvedValue(taskWithNullChecklist as any);

      // Should not throw, step is out of bounds for null checklist
      await service.handleStepSkip(ctx, 'task-1', 0);

      expect(ctx.reply).toHaveBeenCalledWith('❌ Некорректный номер шага');
    });

    it('should handle step completion when checklist item does not exist', async () => {
      const ctx = createMockContext();
      const taskWithEmptyChecklist = {
        ...mockTask,
        checklist: undefined,
        metadata: { telegram_execution_state: { ...mockExecutionState } },
      };
      tasksService.findOne.mockResolvedValue(taskWithEmptyChecklist as any);
      tasksService.update.mockResolvedValue(taskWithEmptyChecklist as any);

      // Step index 0 should be out of bounds for undefined checklist
      await service.handleStepDone(ctx, 'task-1', 0);

      expect(ctx.reply).toHaveBeenCalledWith('❌ Некорректный номер шага');
    });

    it('should handle step done when checklist item at index is falsy', async () => {
      const ctx = createMockContext();
      // Checklist with a hole (sparse array scenario simulated)
      const taskWithSparseChecklist = {
        ...mockTask,
        checklist: [{ item: 'Step 1', completed: false }],
        metadata: {
          telegram_execution_state: {
            ...mockExecutionState,
            current_step: 0,
          },
        },
      };
      // First call returns task with checklist, then second call (after update)
      // returns task where the checklist item was set to undefined
      tasksService.findOne
        .mockResolvedValueOnce(taskWithSparseChecklist as any)
        .mockResolvedValueOnce({
          ...taskWithSparseChecklist,
          checklist: [undefined as any], // Simulate sparse array
        } as any);
      tasksService.update.mockResolvedValue(taskWithSparseChecklist as any);

      await service.handleStepDone(ctx, 'task-1', 0);

      // Should complete successfully even if second findOne returns sparse checklist
      expect(tasksService.update).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // handleStepBack
  // ============================================================================

  describe('handleStepBack', () => {
    it('should go to previous step', async () => {
      const ctx = createMockContext();
      const stateAtStep1 = { ...mockExecutionState, current_step: 1 };
      const taskWithState = {
        ...mockTask,
        metadata: { telegram_execution_state: stateAtStep1 },
      };
      tasksService.findOne.mockResolvedValue(taskWithState as any);
      tasksService.update.mockResolvedValue(taskWithState as any);

      await service.handleStepBack(ctx, 'task-1');

      expect(ctx.answerCbQuery).toHaveBeenCalledWith('◀️');
      expect(tasksService.update).toHaveBeenCalled();
    });

    it('should show message if already at first step in Russian', async () => {
      const ctx = createMockContext();
      const taskWithState = {
        ...mockTask,
        metadata: { telegram_execution_state: { ...mockExecutionState, current_step: 0 } },
      };
      tasksService.findOne.mockResolvedValue(taskWithState as any);

      await service.handleStepBack(ctx, 'task-1');

      expect(ctx.answerCbQuery).toHaveBeenCalledWith('Уже на первом шаге');
    });

    it('should show message if already at first step in English', async () => {
      const ctx = createMockContext({
        telegramUser: { ...mockTelegramUser, language: TelegramLanguage.EN } as any,
      });
      const taskWithState = {
        ...mockTask,
        metadata: { telegram_execution_state: { ...mockExecutionState, current_step: 0 } },
      };
      tasksService.findOne.mockResolvedValue(taskWithState as any);

      await service.handleStepBack(ctx, 'task-1');

      expect(ctx.answerCbQuery).toHaveBeenCalledWith('Already at first step');
    });

    it('should not proceed if user not verified', async () => {
      const ctx = createMockContext({
        telegramUser: { ...mockTelegramUser, is_verified: false } as any,
      });

      await service.handleStepBack(ctx, 'task-1');

      expect(tasksService.findOne).not.toHaveBeenCalled();
    });

    it('should show error if state not found', async () => {
      const ctx = createMockContext();
      tasksService.findOne.mockResolvedValue({ ...mockTask, metadata: null } as any);

      await service.handleStepBack(ctx, 'task-1');

      expect(ctx.answerCbQuery).toHaveBeenCalledWith('❌ State not found');
    });

    it('should handle error', async () => {
      const ctx = createMockContext();
      tasksService.findOne.mockRejectedValue(new Error('DB error'));

      await service.handleStepBack(ctx, 'task-1');

      expect(ctx.answerCbQuery).toHaveBeenCalledWith('❌ Error');
    });

    it('should log callback', async () => {
      const ctx = createMockContext();
      const taskWithState = {
        ...mockTask,
        metadata: { telegram_execution_state: mockExecutionState },
      };
      tasksService.findOne.mockResolvedValue(taskWithState as any);

      await service.handleStepBack(ctx, 'task-1');

      expect(telegramMessageLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'step_back_task-1',
        }),
      );
    });
  });

  // ============================================================================
  // getExecutionState
  // ============================================================================

  describe('getExecutionState', () => {
    it('should return null if no metadata', () => {
      const task = { id: 'task-1', metadata: null } as TelegramTaskInfo;
      const state = service.getExecutionState(task);

      expect(state).toBeNull();
    });

    it('should return null if no execution state in metadata', () => {
      const task = { id: 'task-1', metadata: {} } as TelegramTaskInfo;
      const state = service.getExecutionState(task);

      expect(state).toBeNull();
    });

    it('should return execution state from metadata', () => {
      const executionState: TaskExecutionState = {
        current_step: 2,
        checklist_progress: { 0: { completed: true }, 1: { completed: true } },
        photos_uploaded: { before: true, after: false },
        started_at: '2024-01-01',
        last_interaction_at: '2024-01-01',
      };
      const task = {
        id: 'task-1',
        type_code: TaskType.REFILL,
        status: TaskStatus.IN_PROGRESS,
        scheduled_date: new Date().toISOString(),
        metadata: { telegram_execution_state: executionState },
      } as unknown as TelegramTaskInfo;

      const state = service.getExecutionState(task);

      expect(state).toEqual(executionState);
    });

    it('should return null if metadata is undefined', () => {
      const task = { id: 'task-1' } as TelegramTaskInfo;
      const state = service.getExecutionState(task);

      expect(state).toBeNull();
    });
  });

  // ============================================================================
  // updateExecutionState
  // ============================================================================

  describe('updateExecutionState', () => {
    it('should update task metadata with new state', async () => {
      const mockTaskData = { id: 'task-1', metadata: {} };
      tasksService.findOne.mockResolvedValue(mockTaskData as any);
      tasksService.update.mockResolvedValue(mockTaskData as any);

      const newState: TaskExecutionState = {
        current_step: 1,
        checklist_progress: { 0: { completed: true } },
        photos_uploaded: { before: true, after: false },
        started_at: '2024-01-01',
        last_interaction_at: '2024-01-01',
      };

      await service.updateExecutionState('task-1', newState);

      expect(tasksService.findOne).toHaveBeenCalledWith('task-1');
      expect(tasksService.update).toHaveBeenCalledWith(
        'task-1',
        expect.objectContaining({
          metadata: expect.objectContaining({
            telegram_execution_state: expect.objectContaining({
              current_step: 1,
            }),
          }),
        }),
      );
    });

    it('should throw error if task not found', async () => {
      tasksService.findOne.mockResolvedValue(null as any);

      await expect(
        service.updateExecutionState('nonexistent', mockExecutionState),
      ).rejects.toThrow('Task nonexistent not found');
    });

    it('should preserve existing metadata fields', async () => {
      const mockTaskData = {
        id: 'task-1',
        metadata: { other_field: 'value', existing: true },
      };
      tasksService.findOne.mockResolvedValue(mockTaskData as any);
      tasksService.update.mockResolvedValue(mockTaskData as any);

      await service.updateExecutionState('task-1', mockExecutionState);

      expect(tasksService.update).toHaveBeenCalledWith(
        'task-1',
        expect.objectContaining({
          metadata: expect.objectContaining({
            other_field: 'value',
            existing: true,
            telegram_execution_state: expect.any(Object),
          }),
        }),
      );
    });

    it('should update last_interaction_at timestamp', async () => {
      const mockTaskData = { id: 'task-1', metadata: {} };
      tasksService.findOne.mockResolvedValue(mockTaskData as any);
      tasksService.update.mockResolvedValue(mockTaskData as any);

      const beforeUpdate = new Date().toISOString();
      await service.updateExecutionState('task-1', mockExecutionState);

      const updateCall = tasksService.update.mock.calls[0][1] as { metadata?: { telegram_execution_state?: { last_interaction_at?: string } } };
      const lastInteraction = updateCall.metadata?.telegram_execution_state?.last_interaction_at;

      expect(lastInteraction).toBeDefined();
      expect(new Date(lastInteraction!).getTime()).toBeGreaterThanOrEqual(
        new Date(beforeUpdate).getTime(),
      );
    });

    it('should handle null metadata', async () => {
      const mockTaskData = { id: 'task-1', metadata: null };
      tasksService.findOne.mockResolvedValue(mockTaskData as any);
      tasksService.update.mockResolvedValue(mockTaskData as any);

      await service.updateExecutionState('task-1', mockExecutionState);

      expect(tasksService.update).toHaveBeenCalledWith(
        'task-1',
        expect.objectContaining({
          metadata: expect.objectContaining({
            telegram_execution_state: expect.any(Object),
          }),
        }),
      );
    });
  });

  // ============================================================================
  // showCurrentStep
  // ============================================================================

  describe('showCurrentStep', () => {
    it('should show message for task without checklist in Russian', async () => {
      const ctx = createMockContext();
      const task = {
        id: 'task-1',
        type_code: TaskType.REFILL,
        status: TaskStatus.IN_PROGRESS,
        scheduled_date: new Date().toISOString(),
        checklist: [],
      } as unknown as TelegramTaskInfo;

      await service.showCurrentStep(ctx, task, mockExecutionState, TelegramLanguage.RU);

      expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('Задача без чек-листа'));
    });

    it('should show message for task without checklist in English', async () => {
      const ctx = createMockContext();
      const task = {
        id: 'task-1',
        type_code: TaskType.REFILL,
        status: TaskStatus.IN_PROGRESS,
        scheduled_date: new Date().toISOString(),
        checklist: null,
      } as unknown as TelegramTaskInfo;

      await service.showCurrentStep(ctx, task, mockExecutionState, TelegramLanguage.EN);

      expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('Task without checklist'));
    });

    it('should show completion message when all steps done in Russian', async () => {
      const ctx = createMockContext();
      const task = {
        id: 'task-1',
        checklist: [{ item: 'Step 1' }, { item: 'Step 2' }],
      } as TelegramTaskInfo;
      const state: TaskExecutionState = {
        current_step: 2,
        checklist_progress: { 0: { completed: true }, 1: { completed: true } },
        photos_uploaded: { before: true, after: true },
        started_at: new Date().toISOString(),
        last_interaction_at: new Date().toISOString(),
      };

      await service.showCurrentStep(ctx, task, state, TelegramLanguage.RU);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Все шаги выполнены'),
        expect.any(Object),
      );
    });

    it('should show completion message when all steps done in English', async () => {
      const ctx = createMockContext();
      const task = {
        id: 'task-1',
        checklist: [{ item: 'Step 1' }],
      } as TelegramTaskInfo;
      const state: TaskExecutionState = {
        current_step: 1,
        checklist_progress: { 0: { completed: true } },
        photos_uploaded: { before: true, after: true },
        started_at: new Date().toISOString(),
        last_interaction_at: new Date().toISOString(),
      };

      await service.showCurrentStep(ctx, task, state, TelegramLanguage.EN);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('All steps completed'),
        expect.any(Object),
      );
    });

    it('should show prompt for missing photos when steps complete', async () => {
      const ctx = createMockContext();
      const task = {
        id: 'task-1',
        checklist: [{ item: 'Step 1' }],
      } as TelegramTaskInfo;
      const state: TaskExecutionState = {
        current_step: 1,
        checklist_progress: { 0: { completed: true } },
        photos_uploaded: { before: false, after: false },
        started_at: new Date().toISOString(),
        last_interaction_at: new Date().toISOString(),
      };

      await service.showCurrentStep(ctx, task, state, TelegramLanguage.RU);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Загрузите'),
        expect.any(Object),
      );
    });

    it('should prompt for after photo in English when before is uploaded', async () => {
      const ctx = createMockContext();
      const task = {
        id: 'task-1',
        checklist: [{ item: 'Step 1' }],
      } as TelegramTaskInfo;
      const state: TaskExecutionState = {
        current_step: 1,
        checklist_progress: { 0: { completed: true } },
        photos_uploaded: { before: true, after: false },
        started_at: new Date().toISOString(),
        last_interaction_at: new Date().toISOString(),
      };

      await service.showCurrentStep(ctx, task, state, TelegramLanguage.EN);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('AFTER photo'),
        expect.any(Object),
      );
    });

    it('should prompt for before photo in English when after is uploaded', async () => {
      const ctx = createMockContext();
      const task = {
        id: 'task-1',
        checklist: [{ item: 'Step 1' }],
      } as TelegramTaskInfo;
      const state: TaskExecutionState = {
        current_step: 1,
        checklist_progress: { 0: { completed: true } },
        photos_uploaded: { before: false, after: true },
        started_at: new Date().toISOString(),
        last_interaction_at: new Date().toISOString(),
      };

      await service.showCurrentStep(ctx, task, state, TelegramLanguage.EN);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('BEFORE photo'),
        expect.any(Object),
      );
    });

    it('should prompt for after photo in Russian when before is uploaded', async () => {
      const ctx = createMockContext();
      const task = {
        id: 'task-1',
        checklist: [{ item: 'Step 1' }],
      } as TelegramTaskInfo;
      const state: TaskExecutionState = {
        current_step: 1,
        checklist_progress: { 0: { completed: true } },
        photos_uploaded: { before: true, after: false },
        started_at: new Date().toISOString(),
        last_interaction_at: new Date().toISOString(),
      };

      await service.showCurrentStep(ctx, task, state, TelegramLanguage.RU);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('фото ПОСЛЕ'),
        expect.any(Object),
      );
    });

    it('should show current step with progress bar in Russian', async () => {
      const ctx = createMockContext();
      const task = {
        id: 'task-1',
        checklist: [{ item: 'First step' }, { item: 'Second step' }, { item: 'Third step' }],
      } as TelegramTaskInfo;
      const state: TaskExecutionState = {
        current_step: 1,
        checklist_progress: {
          0: { completed: true },
          1: { completed: false },
          2: { completed: false },
        },
        photos_uploaded: { before: false, after: false },
        started_at: new Date().toISOString(),
        last_interaction_at: new Date().toISOString(),
      };

      await service.showCurrentStep(ctx, task, state, TelegramLanguage.RU);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Шаг 2/3'),
        expect.any(Object),
      );
    });

    it('should show current step in English', async () => {
      const ctx = createMockContext();
      const task = {
        id: 'task-1',
        checklist: [{ item: 'Step 1' }, { item: 'Step 2' }],
      } as TelegramTaskInfo;
      const state: TaskExecutionState = {
        current_step: 0,
        checklist_progress: { 0: { completed: false }, 1: { completed: false } },
        photos_uploaded: { before: false, after: false },
        started_at: new Date().toISOString(),
        last_interaction_at: new Date().toISOString(),
      };

      await service.showCurrentStep(ctx, task, state, TelegramLanguage.EN);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Step 1/2'),
        expect.any(Object),
      );
    });

    it('should include back button when not on first step', async () => {
      const ctx = createMockContext();
      const task = {
        id: 'task-1',
        checklist: [{ item: 'Step 1' }, { item: 'Step 2' }],
      } as TelegramTaskInfo;
      const state: TaskExecutionState = {
        current_step: 1,
        checklist_progress: { 0: { completed: true }, 1: { completed: false } },
        photos_uploaded: { before: false, after: false },
        started_at: new Date().toISOString(),
        last_interaction_at: new Date().toISOString(),
      };

      await service.showCurrentStep(ctx, task, state, TelegramLanguage.RU);

      const { Markup } = require('telegraf');
      expect(Markup.button.callback).toHaveBeenCalledWith('◀️ Назад', 'step_back_task-1');
    });

    it('should include back button in English when not on first step', async () => {
      const ctx = createMockContext();
      const task = {
        id: 'task-1',
        checklist: [{ item: 'Step 1' }, { item: 'Step 2' }],
      } as TelegramTaskInfo;
      const state: TaskExecutionState = {
        current_step: 1,
        checklist_progress: { 0: { completed: true }, 1: { completed: false } },
        photos_uploaded: { before: false, after: false },
        started_at: new Date().toISOString(),
        last_interaction_at: new Date().toISOString(),
      };

      await service.showCurrentStep(ctx, task, state, TelegramLanguage.EN);

      const { Markup } = require('telegraf');
      expect(Markup.button.callback).toHaveBeenCalledWith('◀️ Back', 'step_back_task-1');
    });

    it('should not include back button on first step', async () => {
      const ctx = createMockContext();
      const task = {
        id: 'task-1',
        checklist: [{ item: 'Step 1' }, { item: 'Step 2' }],
      } as TelegramTaskInfo;
      const state: TaskExecutionState = {
        current_step: 0,
        checklist_progress: { 0: { completed: false }, 1: { completed: false } },
        photos_uploaded: { before: false, after: false },
        started_at: new Date().toISOString(),
        last_interaction_at: new Date().toISOString(),
      };

      // Clear mock calls
      const { Markup } = require('telegraf');
      Markup.button.callback.mockClear();

      await service.showCurrentStep(ctx, task, state, TelegramLanguage.RU);

      // Should have Done and Skip buttons, but not Back
      const backButtonCalls = Markup.button.callback.mock.calls.filter(
        (call: any) => call[1].includes('step_back'),
      );
      expect(backButtonCalls.length).toBe(0);
    });
  });

  // ============================================================================
  // Callback logging edge cases
  // ============================================================================

  describe('callback logging', () => {
    it('should handle null telegramUser in logging', async () => {
      const ctx = createMockContext({ telegramUser: undefined });
      usersService.findByTelegramId.mockResolvedValue(null);

      await service.handleTaskStart(ctx, 'task-1');

      expect(telegramMessageLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          telegram_user_id: null,
        }),
      );
    });

    it('should handle null chat in logging', async () => {
      const ctx = createMockContext({ chat: undefined });
      usersService.findByTelegramId.mockResolvedValue(mockUser as any);
      tasksService.startTask.mockResolvedValue(mockTask as any);

      await service.handleTaskStart(ctx, 'task-1');

      expect(telegramMessageLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          chat_id: null,
        }),
      );
    });

    it('should continue if logging fails', async () => {
      const ctx = createMockContext();
      telegramMessageLogRepository.save.mockRejectedValue(new Error('DB error'));
      usersService.findByTelegramId.mockResolvedValue(mockUser as any);
      tasksService.startTask.mockResolvedValue(mockTask as any);

      // Should not throw
      await expect(service.handleTaskStart(ctx, 'task-1')).resolves.not.toThrow();
      expect(ctx.reply).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Error handling edge cases
  // ============================================================================

  describe('error handling', () => {
    it('should handle step completion error', async () => {
      const ctx = createMockContext();
      const taskWithState = {
        ...mockTask,
        metadata: { telegram_execution_state: mockExecutionState },
      };
      tasksService.findOne.mockResolvedValue(taskWithState as any);
      tasksService.update.mockRejectedValue(new Error('Update failed'));

      await service.handleStepDone(ctx, 'task-1', 0);

      expect(ctx.reply).toHaveBeenCalledWith('❌ Ошибка: Update failed');
    });

    it('should handle step completion error in English', async () => {
      const ctx = createMockContext({
        telegramUser: { ...mockTelegramUser, language: TelegramLanguage.EN } as any,
      });
      const taskWithState = {
        ...mockTask,
        metadata: { telegram_execution_state: mockExecutionState },
      };
      tasksService.findOne.mockResolvedValue(taskWithState as any);
      tasksService.update.mockRejectedValue(new Error('Update failed'));

      await service.handleStepDone(ctx, 'task-1', 0);

      expect(ctx.reply).toHaveBeenCalledWith('❌ Error: Update failed');
    });
  });
});
