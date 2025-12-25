import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TelegramTaskHandler } from './telegram-task.handler';
import { TelegramSessionService } from '../services/telegram-session.service';
import { TasksService } from '../../tasks/tasks.service';
import { UsersService } from '../../users/users.service';
import { TelegramKeyboardHandler } from './telegram-keyboard.handler';
import { TelegramMessageHandler } from './telegram-message.handler';
import { TelegramMessageLog, TelegramMessageType } from '../entities/telegram-message-log.entity';
import { TelegramUser, TelegramLanguage } from '../entities/telegram-user.entity';
import { TaskStatus, Task, TaskType } from '../../tasks/entities/task.entity';
import { Context } from 'telegraf';

interface BotContext extends Context {
  telegramUser?: TelegramUser;
}

describe('TelegramTaskHandler', () => {
  let handler: TelegramTaskHandler;
  let messageLogRepository: jest.Mocked<Repository<TelegramMessageLog>>;
  let sessionService: jest.Mocked<TelegramSessionService>;
  let tasksService: jest.Mocked<TasksService>;
  let usersService: jest.Mocked<UsersService>;
  let keyboardHandler: jest.Mocked<TelegramKeyboardHandler>;
  let messageHandler: jest.Mocked<TelegramMessageHandler>;

  const mockTelegramUser = {
    id: 'tg-user-1',
    telegram_id: '123456789',
    is_verified: true,
    language: TelegramLanguage.RU,
    username: 'testuser',
    first_name: 'Test',
    last_name: 'User',
    is_bot: false,
    created_at: new Date(),
    updated_at: new Date(),
  } as unknown as TelegramUser;

  const mockUser = {
    id: 'user-uuid-123',
    username: 'testuser',
    full_name: 'Test User',
    telegram_id: '123456789',
  };

  const mockTask = {
    id: 'task-uuid-123',
    status: TaskStatus.IN_PROGRESS,
    type_code: TaskType.REFILL,
    machine: {
      id: 'machine-1',
      machine_number: 'M-001',
      name: 'Test Machine',
      location: { id: 'loc-1', name: 'Office' },
    },
    checklist: [
      { item: 'Step 1', completed: false },
      { item: 'Step 2', completed: false },
      { item: 'Step 3', completed: false },
    ],
    metadata: {},
  } as unknown as Task;

  const createMockContext = (
    telegramUser?: TelegramUser,
    messageText?: string,
  ): Partial<BotContext> => ({
    telegramUser,
    from: { id: 123456789, first_name: 'Test', is_bot: false } as any,
    chat: { id: 123456789, type: 'private', first_name: 'Test' } as any,
    message: messageText ? { text: messageText } as any : undefined,
    reply: jest.fn().mockResolvedValue(true),
    replyWithChatAction: jest.fn().mockResolvedValue(true),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramTaskHandler,
        {
          provide: getRepositoryToken(TelegramMessageLog),
          useValue: {
            create: jest.fn().mockReturnValue({}),
            save: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: TelegramSessionService,
          useValue: {
            requestPhoto: jest.fn().mockResolvedValue(undefined),
            clearActiveTask: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: TasksService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            startTask: jest.fn(),
            completeTask: jest.fn(),
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
          provide: TelegramKeyboardHandler,
          useValue: {
            getTasksKeyboard: jest.fn().mockReturnValue({ reply_markup: {} }),
            getStepKeyboard: jest.fn().mockReturnValue({ reply_markup: {} }),
          },
        },
        {
          provide: TelegramMessageHandler,
          useValue: {
            formatTasksMessage: jest.fn().mockReturnValue('Tasks message'),
            formatTaskStartedMessage: jest.fn().mockReturnValue('Task started message'),
          },
        },
      ],
    }).compile();

    handler = module.get<TelegramTaskHandler>(TelegramTaskHandler);
    messageLogRepository = module.get(getRepositoryToken(TelegramMessageLog));
    sessionService = module.get(TelegramSessionService);
    tasksService = module.get(TasksService);
    usersService = module.get(UsersService);
    keyboardHandler = module.get(TelegramKeyboardHandler);
    messageHandler = module.get(TelegramMessageHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleTasksCommand', () => {
    it('should reject unverified users', async () => {
      const unverifiedUser = { ...mockTelegramUser, is_verified: false };
      const ctx = createMockContext(unverifiedUser) as BotContext;

      await handler.handleTasksCommand(ctx);

      expect(ctx.reply).toHaveBeenCalledWith('❌ Вы не верифицированы');
    });

    it('should reject users without telegramUser', async () => {
      const ctx = createMockContext(undefined) as BotContext;

      await handler.handleTasksCommand(ctx);

      expect(ctx.reply).toHaveBeenCalledWith('❌ Вы не верифицированы');
    });

    it('should show message when user not found in system', async () => {
      const ctx = createMockContext(mockTelegramUser) as BotContext;
      usersService.findByTelegramId.mockResolvedValue(null);

      await handler.handleTasksCommand(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(
        '❌ Пользователь не найден. Обратитесь к администратору.',
      );
    });

    it('should show message when no active tasks', async () => {
      const ctx = createMockContext(mockTelegramUser) as BotContext;
      usersService.findByTelegramId.mockResolvedValue(mockUser as any);
      tasksService.findAll.mockResolvedValue([]);

      await handler.handleTasksCommand(ctx);

      expect(ctx.reply).toHaveBeenCalledWith('✅ У вас нет активных задач');
    });

    it('should show message when all tasks are completed', async () => {
      const ctx = createMockContext(mockTelegramUser) as BotContext;
      usersService.findByTelegramId.mockResolvedValue(mockUser as any);
      tasksService.findAll.mockResolvedValue([
        { ...mockTask, status: TaskStatus.COMPLETED },
        { ...mockTask, status: TaskStatus.CANCELLED },
      ] as Task[]);

      await handler.handleTasksCommand(ctx);

      expect(ctx.reply).toHaveBeenCalledWith('✅ У вас нет активных задач');
    });

    it('should display active tasks', async () => {
      const ctx = createMockContext(mockTelegramUser) as BotContext;
      usersService.findByTelegramId.mockResolvedValue(mockUser as any);
      tasksService.findAll.mockResolvedValue([
        { ...mockTask, status: TaskStatus.PENDING },
        { ...mockTask, status: TaskStatus.ASSIGNED },
        { ...mockTask, status: TaskStatus.IN_PROGRESS },
      ] as Task[]);

      await handler.handleTasksCommand(ctx);

      expect(messageHandler.formatTasksMessage).toHaveBeenCalled();
      expect(keyboardHandler.getTasksKeyboard).toHaveBeenCalled();
      expect(ctx.reply).toHaveBeenCalledWith('Tasks message', expect.any(Object));
    });

    it('should handle errors gracefully', async () => {
      const ctx = createMockContext(mockTelegramUser) as BotContext;
      usersService.findByTelegramId.mockRejectedValue(new Error('DB error'));

      await handler.handleTasksCommand(ctx);

      expect(ctx.reply).toHaveBeenCalledWith('😕 Не удалось загрузить список задач');
    });

    it('should show English message for EN language', async () => {
      const enUser = { ...mockTelegramUser, language: TelegramLanguage.EN };
      const ctx = createMockContext(enUser) as BotContext;
      usersService.findByTelegramId.mockResolvedValue(mockUser as any);
      tasksService.findAll.mockResolvedValue([]);

      await handler.handleTasksCommand(ctx);

      expect(ctx.reply).toHaveBeenCalledWith('✅ You have no active tasks');
    });
  });

  describe('handleStartTaskCommand', () => {
    it('should reject unverified users', async () => {
      const unverifiedUser = { ...mockTelegramUser, is_verified: false };
      const ctx = createMockContext(unverifiedUser, '/start_task task-123') as BotContext;

      await handler.handleStartTaskCommand(ctx);

      expect(ctx.reply).toHaveBeenCalledWith('❌ Вы не верифицированы');
    });

    it('should require task ID', async () => {
      const ctx = createMockContext(mockTelegramUser, '/start_task') as BotContext;

      await handler.handleStartTaskCommand(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(
        '⚠️ Укажите ID задачи: /start_task <task_id>',
      );
    });

    it('should show error when user not found', async () => {
      const ctx = createMockContext(mockTelegramUser, '/start_task task-123') as BotContext;
      usersService.findByTelegramId.mockResolvedValue(null);

      await handler.handleStartTaskCommand(ctx);

      expect(ctx.reply).toHaveBeenCalledWith('❌ Пользователь не найден');
    });

    it('should start task successfully', async () => {
      const ctx = createMockContext(mockTelegramUser, '/start_task task-123') as BotContext;
      usersService.findByTelegramId.mockResolvedValue(mockUser as any);
      tasksService.startTask.mockResolvedValue(mockTask as Task);

      await handler.handleStartTaskCommand(ctx);

      expect(tasksService.startTask).toHaveBeenCalledWith('task-123', mockUser.id);
      expect(sessionService.requestPhoto).toHaveBeenCalledWith(mockUser.id, 'task-123', 'before');
      expect(messageHandler.formatTaskStartedMessage).toHaveBeenCalled();
      expect(ctx.reply).toHaveBeenCalledWith('Task started message', { parse_mode: 'HTML' });
    });

    it('should handle task start errors', async () => {
      const ctx = createMockContext(mockTelegramUser, '/start_task task-123') as BotContext;
      usersService.findByTelegramId.mockResolvedValue(mockUser as any);
      tasksService.startTask.mockRejectedValue(new Error('Task not found'));

      await handler.handleStartTaskCommand(ctx);

      expect(ctx.reply).toHaveBeenCalledWith('❌ Ошибка: Task not found');
    });

    it('should show English error for EN language', async () => {
      const enUser = { ...mockTelegramUser, language: TelegramLanguage.EN };
      const ctx = createMockContext(enUser, '/start_task') as BotContext;

      await handler.handleStartTaskCommand(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(
        '⚠️ Specify task ID: /start_task <task_id>',
      );
    });
  });

  describe('handleCompleteTaskCommand', () => {
    it('should reject unverified users', async () => {
      const unverifiedUser = { ...mockTelegramUser, is_verified: false };
      const ctx = createMockContext(unverifiedUser, '/complete_task task-123') as BotContext;

      await handler.handleCompleteTaskCommand(ctx);

      expect(ctx.reply).toHaveBeenCalledWith('❌ Вы не верифицированы');
    });

    it('should require task ID', async () => {
      const ctx = createMockContext(mockTelegramUser, '/complete_task') as BotContext;

      await handler.handleCompleteTaskCommand(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(
        '⚠️ Укажите ID задачи: /complete_task <task_id>',
      );
    });

    it('should show error when user not found', async () => {
      const ctx = createMockContext(mockTelegramUser, '/complete_task task-123') as BotContext;
      usersService.findByTelegramId.mockResolvedValue(null);

      await handler.handleCompleteTaskCommand(ctx);

      expect(ctx.reply).toHaveBeenCalledWith('❌ Пользователь не найден');
    });

    it('should complete task successfully', async () => {
      const ctx = createMockContext(mockTelegramUser, '/complete_task task-123') as BotContext;
      usersService.findByTelegramId.mockResolvedValue(mockUser as any);
      tasksService.completeTask.mockResolvedValue(mockTask);

      await handler.handleCompleteTaskCommand(ctx);

      expect(tasksService.completeTask).toHaveBeenCalledWith('task-123', mockUser.id, {});
      expect(sessionService.clearActiveTask).toHaveBeenCalledWith(mockUser.id);
      expect(ctx.reply).toHaveBeenCalledWith('✅ Задача успешно завершена!');
    });

    it('should handle completion errors', async () => {
      const ctx = createMockContext(mockTelegramUser, '/complete_task task-123') as BotContext;
      usersService.findByTelegramId.mockResolvedValue(mockUser as any);
      tasksService.completeTask.mockRejectedValue(new Error('Photos required'));

      await handler.handleCompleteTaskCommand(ctx);

      expect(ctx.reply).toHaveBeenCalledWith('❌ Ошибка: Photos required');
    });

    it('should show English success message for EN language', async () => {
      const enUser = { ...mockTelegramUser, language: TelegramLanguage.EN };
      const ctx = createMockContext(enUser, '/complete_task task-123') as BotContext;
      usersService.findByTelegramId.mockResolvedValue(mockUser as any);
      tasksService.completeTask.mockResolvedValue(mockTask);

      await handler.handleCompleteTaskCommand(ctx);

      expect(ctx.reply).toHaveBeenCalledWith('✅ Task completed successfully!');
    });
  });

  describe('handleTaskStartCallback', () => {
    it('should show error when user not found', async () => {
      const ctx = createMockContext(mockTelegramUser) as BotContext;
      usersService.findByTelegramId.mockResolvedValue(null);

      await handler.handleTaskStartCallback(ctx, 'task-123');

      expect(ctx.reply).toHaveBeenCalledWith('❌ Пользователь не найден');
    });

    it('should start task via callback successfully', async () => {
      const ctx = createMockContext(mockTelegramUser) as BotContext;
      usersService.findByTelegramId.mockResolvedValue(mockUser as any);
      tasksService.startTask.mockResolvedValue(mockTask as Task);

      await handler.handleTaskStartCallback(ctx, 'task-456');

      expect(tasksService.startTask).toHaveBeenCalledWith('task-456', mockUser.id);
      expect(sessionService.requestPhoto).toHaveBeenCalledWith(mockUser.id, 'task-456', 'before');
    });

    it('should handle callback start errors', async () => {
      const ctx = createMockContext(mockTelegramUser) as BotContext;
      usersService.findByTelegramId.mockResolvedValue(mockUser as any);
      tasksService.startTask.mockRejectedValue(new Error('Already in progress'));

      await handler.handleTaskStartCallback(ctx, 'task-123');

      expect(ctx.reply).toHaveBeenCalledWith('❌ Ошибка: Already in progress');
    });

    it('should handle undefined telegramUser by returning error', async () => {
      const ctx = createMockContext(undefined) as BotContext;
      usersService.findByTelegramId.mockResolvedValue(null);

      await handler.handleTaskStartCallback(ctx, 'task-123');

      // Handler throws error when trying to access telegram_id on undefined user
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('❌ Ошибка:'),
      );
    });
  });

  describe('handleStepCompletion', () => {
    it('should reject unverified users', async () => {
      const unverifiedUser = { ...mockTelegramUser, is_verified: false };
      const ctx = createMockContext(unverifiedUser) as BotContext;

      await handler.handleStepCompletion(ctx, 'task-123', 0, false);

      expect(tasksService.findOne).not.toHaveBeenCalled();
    });

    it('should show error when task state not found', async () => {
      const ctx = createMockContext(mockTelegramUser) as BotContext;
      tasksService.findOne.mockResolvedValue({ ...mockTask, metadata: {} } as Task);

      await handler.handleStepCompletion(ctx, 'task-123', 0, false);

      expect(ctx.reply).toHaveBeenCalledWith('❌ Состояние задачи не найдено');
    });

    it('should complete step and show next', async () => {
      const ctx = createMockContext(mockTelegramUser) as BotContext;
      const taskWithState = {
        ...mockTask,
        metadata: {
          telegram_execution_state: {
            current_step: 0,
            checklist_progress: {},
            photos_uploaded: { before: true, after: false },
            started_at: new Date().toISOString(),
            last_interaction_at: new Date().toISOString(),
          },
        },
      };
      tasksService.findOne.mockResolvedValue(taskWithState as unknown as Task);
      tasksService.update.mockResolvedValue(mockTask);

      await handler.handleStepCompletion(ctx, 'task-123', 0, false);

      expect(tasksService.update).toHaveBeenCalled();
    });

    it('should request after photo when all steps completed', async () => {
      const ctx = createMockContext(mockTelegramUser) as BotContext;
      const taskWithState = {
        ...mockTask,
        checklist: [{ item: 'Step 1', completed: false }],
        metadata: {
          telegram_execution_state: {
            current_step: 0,
            checklist_progress: {},
            photos_uploaded: { before: true, after: false },
            started_at: new Date().toISOString(),
            last_interaction_at: new Date().toISOString(),
          },
        },
      };
      tasksService.findOne.mockResolvedValue(taskWithState as unknown as Task);
      tasksService.update.mockResolvedValue(mockTask);
      usersService.findByTelegramId.mockResolvedValue(mockUser as any);

      await handler.handleStepCompletion(ctx, 'task-123', 0, false);

      expect(sessionService.requestPhoto).toHaveBeenCalledWith(mockUser.id, 'task-123', 'after');
      expect(ctx.reply).toHaveBeenCalledWith(
        '✅ Все шаги выполнены!\n\n📸 Теперь отправьте фото ПОСЛЕ выполнения работы',
      );
    });

    it('should mark step as skipped when skip is true', async () => {
      const ctx = createMockContext(mockTelegramUser) as BotContext;
      const taskWithState = {
        ...mockTask,
        metadata: {
          telegram_execution_state: {
            current_step: 0,
            checklist_progress: {},
            photos_uploaded: { before: true, after: false },
            started_at: new Date().toISOString(),
            last_interaction_at: new Date().toISOString(),
          },
        },
      };
      tasksService.findOne.mockResolvedValue(taskWithState as unknown as Task);
      tasksService.update.mockResolvedValue(mockTask);

      await handler.handleStepCompletion(ctx, 'task-123', 0, true);

      expect(tasksService.update).toHaveBeenCalledWith(
        'task-123',
        expect.objectContaining({
          metadata: expect.objectContaining({
            telegram_execution_state: expect.objectContaining({
              checklist_progress: expect.objectContaining({
                0: expect.objectContaining({
                  completed: false,
                  notes: 'Пропущено',
                }),
              }),
            }),
          }),
        }),
      );
    });

    it('should handle step completion errors', async () => {
      const ctx = createMockContext(mockTelegramUser) as BotContext;
      tasksService.findOne.mockRejectedValue(new Error('Task not found'));

      await handler.handleStepCompletion(ctx, 'task-123', 0, false);

      expect(ctx.reply).toHaveBeenCalledWith('❌ Ошибка: Task not found');
    });

    it('should show English message for EN language', async () => {
      const enUser = { ...mockTelegramUser, language: TelegramLanguage.EN };
      const ctx = createMockContext(enUser) as BotContext;
      const taskWithState = {
        ...mockTask,
        checklist: [{ item: 'Step 1', completed: false }],
        metadata: {
          telegram_execution_state: {
            current_step: 0,
            checklist_progress: {},
            photos_uploaded: { before: true, after: false },
            started_at: new Date().toISOString(),
            last_interaction_at: new Date().toISOString(),
          },
        },
      };
      tasksService.findOne.mockResolvedValue(taskWithState as unknown as Task);
      tasksService.update.mockResolvedValue(mockTask);
      usersService.findByTelegramId.mockResolvedValue(mockUser as any);

      await handler.handleStepCompletion(ctx, 'task-123', 0, false);

      expect(ctx.reply).toHaveBeenCalledWith(
        '✅ All steps completed!\n\n📸 Now send AFTER photo',
      );
    });
  });

  describe('showCurrentStep', () => {
    it('should show current step with keyboard', async () => {
      const ctx = createMockContext(mockTelegramUser) as BotContext;
      const state = {
        current_step: 1,
        checklist_progress: {},
        photos_uploaded: { before: true, after: false },
        started_at: new Date().toISOString(),
        last_interaction_at: new Date().toISOString(),
      };

      await handler.showCurrentStep(ctx, mockTask as Task, state, TelegramLanguage.RU);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Шаг 2 из 3'),
        expect.any(Object),
      );
      // Handler uses checklist items as objects, verifying the structure
      expect(keyboardHandler.getStepKeyboard).toHaveBeenCalledWith(
        mockTask.id,
        1,
        TelegramLanguage.RU,
        true,
      );
    });

    it('should show step in English', async () => {
      const ctx = createMockContext(mockTelegramUser) as BotContext;
      const state = {
        current_step: 0,
        checklist_progress: {},
        photos_uploaded: { before: true, after: false },
        started_at: new Date().toISOString(),
        last_interaction_at: new Date().toISOString(),
      };

      await handler.showCurrentStep(ctx, mockTask as Task, state, TelegramLanguage.EN);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Step 1 of 3'),
        expect.any(Object),
      );
    });

    it('should not show step when current_step exceeds checklist', async () => {
      const ctx = createMockContext(mockTelegramUser) as BotContext;
      const state = {
        current_step: 5,
        checklist_progress: {},
        photos_uploaded: { before: true, after: false },
        started_at: new Date().toISOString(),
        last_interaction_at: new Date().toISOString(),
      };

      await handler.showCurrentStep(ctx, mockTask as Task, state, TelegramLanguage.RU);

      expect(ctx.reply).not.toHaveBeenCalled();
    });

    it('should pass allowBack=true when not on first step', async () => {
      const ctx = createMockContext(mockTelegramUser) as BotContext;
      const state = {
        current_step: 1,
        checklist_progress: {},
        photos_uploaded: { before: true, after: false },
        started_at: new Date().toISOString(),
        last_interaction_at: new Date().toISOString(),
      };

      await handler.showCurrentStep(ctx, mockTask as Task, state, TelegramLanguage.RU);

      expect(keyboardHandler.getStepKeyboard).toHaveBeenCalledWith(
        mockTask.id,
        1,
        TelegramLanguage.RU,
        true,
      );
    });

    it('should pass allowBack=false on first step', async () => {
      const ctx = createMockContext(mockTelegramUser) as BotContext;
      const state = {
        current_step: 0,
        checklist_progress: {},
        photos_uploaded: { before: true, after: false },
        started_at: new Date().toISOString(),
        last_interaction_at: new Date().toISOString(),
      };

      await handler.showCurrentStep(ctx, mockTask as Task, state, TelegramLanguage.RU);

      expect(keyboardHandler.getStepKeyboard).toHaveBeenCalledWith(
        mockTask.id,
        0,
        TelegramLanguage.RU,
        false,
      );
    });
  });

  describe('logMessage', () => {
    it('should log messages to repository', async () => {
      const ctx = createMockContext(mockTelegramUser, '/tasks') as BotContext;
      usersService.findByTelegramId.mockResolvedValue(mockUser as any);
      tasksService.findAll.mockResolvedValue([]);

      await handler.handleTasksCommand(ctx);

      expect(messageLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          telegram_user_id: mockTelegramUser.id,
          message_type: TelegramMessageType.COMMAND,
          message_text: '/tasks',
        }),
      );
      expect(messageLogRepository.save).toHaveBeenCalled();
    });

    it('should handle logging errors gracefully', async () => {
      const ctx = createMockContext(mockTelegramUser, '/tasks') as BotContext;
      messageLogRepository.save.mockRejectedValue(new Error('DB error'));
      usersService.findByTelegramId.mockResolvedValue(mockUser as any);
      tasksService.findAll.mockResolvedValue([]);

      // Should not throw
      await expect(handler.handleTasksCommand(ctx)).resolves.not.toThrow();
    });
  });
});
