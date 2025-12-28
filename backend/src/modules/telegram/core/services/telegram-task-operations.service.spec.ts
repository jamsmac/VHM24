import { Test, TestingModule } from '@nestjs/testing';
import { TelegramTaskOperationsService, TaskExecutionState } from './telegram-task-operations.service';
import { TelegramSessionService, ConversationState } from '../../infrastructure/services/telegram-session.service';
import { TelegramVoiceService } from '../../media/services/telegram-voice.service';
import { TelegramTaskCallbackService } from './telegram-task-callback.service';
import { TasksService } from '../../../tasks/tasks.service';
import { FilesService } from '../../../files/files.service';
import { UsersService } from '../../../users/users.service';
import { TelegramLanguage } from '../../shared/entities/telegram-user.entity';
import { TelegramMessageType } from '../../shared/entities/telegram-message-log.entity';
import { TaskStatus, TaskType } from '../../../tasks/entities/task.entity';

describe('TelegramTaskOperationsService', () => {
  let service: TelegramTaskOperationsService;
  let sessionService: jest.Mocked<TelegramSessionService>;
  let voiceService: jest.Mocked<TelegramVoiceService>;
  let taskCallbackService: jest.Mocked<TelegramTaskCallbackService>;
  let tasksService: jest.Mocked<TasksService>;
  let filesService: jest.Mocked<FilesService>;
  let usersService: jest.Mocked<UsersService>;

  // Mock helpers
  const mockHelpers = {
    t: jest.fn((lang, key) => key),
    logMessage: jest.fn(),
    handleTasksCommand: jest.fn(),
    handleMachinesCommand: jest.fn(),
    handleStatsCommand: jest.fn(),
  };

  // Mock context factory
  const createMockContext = (overrides: any = {}) => {
    const ctx: any = {
      from: { id: 123456789 },
      chat: { id: 987654321 },
      message: { text: '' },
      telegramUser: {
        telegram_id: '123456789',
        is_verified: true,
        language: TelegramLanguage.RU,
      },
      session: {
        userId: 'user-123',
        chatId: '987654321',
        telegramId: '123456789',
        state: ConversationState.IDLE,
        context: {},
      },
      reply: jest.fn().mockResolvedValue({ message_id: 1 }),
      replyWithChatAction: jest.fn().mockResolvedValue(undefined),
      telegram: {
        getFileLink: jest.fn().mockResolvedValue({ href: 'https://api.telegram.org/file/test.jpg' }),
        deleteMessage: jest.fn().mockResolvedValue(undefined),
      },
      ...overrides,
    };
    return ctx;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramTaskOperationsService,
        {
          provide: TelegramSessionService,
          useValue: {
            getSession: jest.fn(),
            saveSession: jest.fn(),
            clearActiveTask: jest.fn(),
            requestPhoto: jest.fn(),
          },
        },
        {
          provide: TelegramVoiceService,
          useValue: {
            isAvailable: jest.fn().mockReturnValue(true),
            transcribeVoice: jest.fn().mockResolvedValue('test transcription'),
            parseCommand: jest.fn().mockReturnValue({ intent: 'unknown', confidence: 0, originalText: '' }),
            getVoiceCommandResponse: jest.fn().mockReturnValue('Command response'),
          },
        },
        {
          provide: TelegramTaskCallbackService,
          useValue: {
            updateExecutionState: jest.fn(),
            showCurrentStep: jest.fn(),
            getExecutionState: jest.fn(),
          },
        },
        {
          provide: TasksService,
          useValue: {
            findOne: jest.fn(),
            startTask: jest.fn(),
            completeTask: jest.fn(),
          },
        },
        {
          provide: FilesService,
          useValue: {
            uploadFile: jest.fn(),
          },
        },
        {
          provide: UsersService,
          useValue: {
            findByTelegramId: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TelegramTaskOperationsService>(TelegramTaskOperationsService);
    sessionService = module.get(TelegramSessionService);
    voiceService = module.get(TelegramVoiceService);
    taskCallbackService = module.get(TelegramTaskCallbackService);
    tasksService = module.get(TasksService);
    filesService = module.get(FilesService);
    usersService = module.get(UsersService);

    // Set helpers
    service.setHelpers(mockHelpers);
    jest.clearAllMocks();
  });

  describe('initializeExecutionState', () => {
    it('should create initial execution state with empty checklist', () => {
      const task = {
        id: 'task-123',
        checklist: [],
        has_photo_before: false,
        has_photo_after: false,
      } as any;

      const state = service.initializeExecutionState(task);

      expect(state.current_step).toBe(0);
      expect(state.checklist_progress).toEqual({});
      expect(state.photos_uploaded.before).toBe(false);
      expect(state.photos_uploaded.after).toBe(false);
      expect(state.started_at).toBeDefined();
      expect(state.last_interaction_at).toBeDefined();
    });

    it('should create initial execution state with checklist items', () => {
      const task = {
        id: 'task-123',
        checklist: ['Step 1', 'Step 2', 'Step 3'],
        has_photo_before: true,
        has_photo_after: false,
      } as any;

      const state = service.initializeExecutionState(task);

      expect(state.current_step).toBe(0);
      expect(Object.keys(state.checklist_progress).length).toBe(3);
      expect(state.checklist_progress[0]).toEqual({ completed: false });
      expect(state.checklist_progress[1]).toEqual({ completed: false });
      expect(state.checklist_progress[2]).toEqual({ completed: false });
      expect(state.photos_uploaded.before).toBe(true);
      expect(state.photos_uploaded.after).toBe(false);
    });

    it('should handle undefined checklist', () => {
      const task = {
        id: 'task-123',
      } as any;

      const state = service.initializeExecutionState(task);

      expect(state.current_step).toBe(0);
      expect(state.checklist_progress).toEqual({});
    });
  });

  describe('handleStartTaskCommand', () => {
    it('should reject unverified users', async () => {
      const ctx = createMockContext({
        telegramUser: { is_verified: false, language: TelegramLanguage.RU },
      });

      await service.handleStartTaskCommand(ctx);

      expect(ctx.reply).toHaveBeenCalledWith('not_verified');
    });

    it('should require task ID in command', async () => {
      const ctx = createMockContext({
        message: { text: '/start_task' },
      });

      await service.handleStartTaskCommand(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Использование'),
      );
    });

    it('should start task successfully', async () => {
      const ctx = createMockContext({
        message: { text: '/start_task abc123' },
      });

      usersService.findByTelegramId.mockResolvedValue({
        id: 'user-123',
        telegram_id: '123456789',
      } as any);

      tasksService.startTask.mockResolvedValue({
        id: 'abc123',
        type_code: TaskType.REFILL,
        machine: { machine_number: 'M-001', location: { name: 'Office' } },
        checklist: [],
      } as any);

      await service.handleStartTaskCommand(ctx);

      expect(tasksService.startTask).toHaveBeenCalledWith('abc123', 'user-123');
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Задача начата'),
        expect.any(Object),
      );
    });

    it('should show checklist step if task has checklist', async () => {
      const ctx = createMockContext({
        message: { text: '/start_task abc123' },
      });

      usersService.findByTelegramId.mockResolvedValue({
        id: 'user-123',
      } as any);

      const mockTask = {
        id: 'abc123',
        type_code: TaskType.REFILL,
        machine: { machine_number: 'M-001', location: { name: 'Office' } },
        checklist: ['Step 1', 'Step 2'],
      };
      tasksService.startTask.mockResolvedValue(mockTask as any);

      await service.handleStartTaskCommand(ctx);

      expect(taskCallbackService.showCurrentStep).toHaveBeenCalled();
    });

    it('should handle user not found', async () => {
      const ctx = createMockContext({
        message: { text: '/start_task abc123' },
      });

      usersService.findByTelegramId.mockResolvedValue(null);

      await service.handleStartTaskCommand(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Пользователь не найден'),
      );
    });

    it('should handle task start error', async () => {
      const ctx = createMockContext({
        message: { text: '/start_task abc123' },
      });

      usersService.findByTelegramId.mockResolvedValue({ id: 'user-123' } as any);
      tasksService.startTask.mockRejectedValue(new Error('Task already completed'));

      await service.handleStartTaskCommand(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Не удалось начать задачу'),
        expect.any(Object),
      );
    });

    it('should handle task start error in English', async () => {
      const ctx = createMockContext({
        message: { text: '/start_task abc123' },
        telegramUser: {
          is_verified: true,
          language: TelegramLanguage.EN,
          telegram_id: '123456789',
        },
      });

      usersService.findByTelegramId.mockResolvedValue({ id: 'user-123' } as any);
      tasksService.startTask.mockRejectedValue(new Error('Task already completed'));

      await service.handleStartTaskCommand(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Could not start task'),
        expect.any(Object),
      );
    });

    it('should start task with checklist in English', async () => {
      const ctx = createMockContext({
        message: { text: '/start_task abc123' },
        telegramUser: {
          is_verified: true,
          language: TelegramLanguage.EN,
          telegram_id: '123456789',
        },
      });

      usersService.findByTelegramId.mockResolvedValue({ id: 'user-123' } as any);
      tasksService.startTask.mockResolvedValue({
        id: 'abc123',
        type_code: TaskType.REFILL,
        machine: { machine_number: 'M-001', location: { name: 'Office' } },
        checklist: ['Step 1', 'Step 2'],
      } as any);

      await service.handleStartTaskCommand(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Task started'),
        expect.any(Object),
      );
    });

    it('should show usage in English when no task ID', async () => {
      const ctx = createMockContext({
        message: { text: '/start_task' },
        telegramUser: {
          is_verified: true,
          language: TelegramLanguage.EN,
          telegram_id: '123456789',
        },
      });

      await service.handleStartTaskCommand(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Usage'),
      );
    });

    it('should handle user not found in English', async () => {
      const ctx = createMockContext({
        message: { text: '/start_task abc123' },
        telegramUser: {
          is_verified: true,
          language: TelegramLanguage.EN,
          telegram_id: '123456789',
        },
      });

      usersService.findByTelegramId.mockResolvedValue(null);

      await service.handleStartTaskCommand(ctx);

      expect(ctx.reply).toHaveBeenCalledWith('❌ User not found');
    });

    it('should default to Russian for unverified user without language', async () => {
      const ctx = createMockContext({
        telegramUser: { is_verified: false, language: undefined },
      });

      await service.handleStartTaskCommand(ctx);

      expect(ctx.reply).toHaveBeenCalledWith('not_verified');
    });

    it('should start task without checklist and prompt for photo', async () => {
      const ctx = createMockContext({
        message: { text: '/start_task abc123' },
      });

      usersService.findByTelegramId.mockResolvedValue({ id: 'user-123' } as any);
      tasksService.startTask.mockResolvedValue({
        id: 'abc123',
        type_code: TaskType.REFILL,
        machine: { machine_number: 'M-001', location: { name: 'Office' } },
        checklist: [],
      } as any);

      await service.handleStartTaskCommand(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Загрузите фото ДО'),
        expect.any(Object),
      );
    });

    it('should start task without checklist in English', async () => {
      const ctx = createMockContext({
        message: { text: '/start_task abc123' },
        telegramUser: {
          is_verified: true,
          language: TelegramLanguage.EN,
          telegram_id: '123456789',
        },
      });

      usersService.findByTelegramId.mockResolvedValue({ id: 'user-123' } as any);
      tasksService.startTask.mockResolvedValue({
        id: 'abc123',
        type_code: TaskType.REFILL,
        machine: { machine_number: 'M-001', location: { name: 'Office' } },
        checklist: [],
      } as any);

      await service.handleStartTaskCommand(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Upload BEFORE photo'),
        expect.any(Object),
      );
    });
  });

  describe('handleCompleteTaskCommand', () => {
    it('should reject unverified users', async () => {
      const ctx = createMockContext({
        telegramUser: { is_verified: false, language: TelegramLanguage.RU },
      });

      await service.handleCompleteTaskCommand(ctx);

      expect(ctx.reply).toHaveBeenCalledWith('not_verified');
    });

    it('should require task ID in command', async () => {
      const ctx = createMockContext({
        message: { text: '/complete_task' },
      });

      await service.handleCompleteTaskCommand(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Использование'),
      );
    });

    it('should complete task successfully', async () => {
      const ctx = createMockContext({
        message: { text: '/complete_task abc123' },
      });

      usersService.findByTelegramId.mockResolvedValue({
        id: 'user-123',
      } as any);

      tasksService.completeTask.mockResolvedValue({
        id: 'abc123',
        type_code: TaskType.REFILL,
        machine: { machine_number: 'M-001' },
      } as any);

      await service.handleCompleteTaskCommand(ctx);

      expect(tasksService.completeTask).toHaveBeenCalledWith('abc123', 'user-123', { skip_photos: false });
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Отличная работа'),
        expect.any(Object),
      );
    });

    it('should handle completion error', async () => {
      const ctx = createMockContext({
        message: { text: '/complete_task abc123' },
      });

      usersService.findByTelegramId.mockResolvedValue({ id: 'user-123' } as any);
      tasksService.completeTask.mockRejectedValue(new Error('Photos missing'));

      await service.handleCompleteTaskCommand(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Не удалось завершить'),
        expect.any(Object),
      );
    });

    it('should handle English language', async () => {
      const ctx = createMockContext({
        message: { text: '/complete_task abc123' },
        telegramUser: {
          is_verified: true,
          language: TelegramLanguage.EN,
          telegram_id: '123456789',
        },
      });

      usersService.findByTelegramId.mockResolvedValue({ id: 'user-123' } as any);
      tasksService.completeTask.mockResolvedValue({
        id: 'abc123',
        type_code: TaskType.REFILL,
        machine: { machine_number: 'M-001' },
      } as any);

      await service.handleCompleteTaskCommand(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Great job'),
        expect.any(Object),
      );
    });

    it('should handle user not found in English', async () => {
      const ctx = createMockContext({
        message: { text: '/complete_task abc123' },
        telegramUser: {
          is_verified: true,
          language: TelegramLanguage.EN,
          telegram_id: '123456789',
        },
      });

      usersService.findByTelegramId.mockResolvedValue(null);

      await service.handleCompleteTaskCommand(ctx);

      expect(ctx.reply).toHaveBeenCalledWith('❌ User not found');
    });

    it('should handle completion error in English', async () => {
      const ctx = createMockContext({
        message: { text: '/complete_task abc123' },
        telegramUser: {
          is_verified: true,
          language: TelegramLanguage.EN,
          telegram_id: '123456789',
        },
      });

      usersService.findByTelegramId.mockResolvedValue({ id: 'user-123' } as any);
      tasksService.completeTask.mockRejectedValue(new Error('Photos missing'));

      await service.handleCompleteTaskCommand(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Could not complete task'),
        expect.any(Object),
      );
    });

    it('should handle user not found', async () => {
      const ctx = createMockContext({
        message: { text: '/complete_task abc123' },
      });

      usersService.findByTelegramId.mockResolvedValue(null);

      await service.handleCompleteTaskCommand(ctx);

      expect(ctx.reply).toHaveBeenCalledWith('❌ Пользователь не найден');
    });

    it('should default to Russian for unverified user without language', async () => {
      const ctx = createMockContext({
        telegramUser: { is_verified: false, language: undefined },
      });

      await service.handleCompleteTaskCommand(ctx);

      expect(ctx.reply).toHaveBeenCalledWith('not_verified');
    });

    it('should show usage in English when no task ID', async () => {
      const ctx = createMockContext({
        message: { text: '/complete_task' },
        telegramUser: {
          is_verified: true,
          language: TelegramLanguage.EN,
          telegram_id: '123456789',
        },
      });

      await service.handleCompleteTaskCommand(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Usage'),
      );
    });
  });

  describe('validatePhotoUpload', () => {
    it('should reject invalid MIME type', async () => {
      await expect(
        service.validatePhotoUpload(Buffer.from('test'), 'image/gif', 1000, 'user-123', 'task-123'),
      ).rejects.toThrow('Invalid file type');
    });

    it('should reject file too large', async () => {
      await expect(
        service.validatePhotoUpload(Buffer.from('test'), 'image/jpeg', 10_000_000, 'user-123', 'task-123'),
      ).rejects.toThrow('File too large');
    });

    it('should reject if task not found', async () => {
      tasksService.findOne.mockResolvedValue(undefined as any);

      await expect(
        service.validatePhotoUpload(Buffer.from('test'), 'image/jpeg', 1000, 'user-123', 'task-123'),
      ).rejects.toThrow('Task task-123 not found');
    });

    it('should reject if user not assigned to task', async () => {
      tasksService.findOne.mockResolvedValue({
        id: 'task-123',
        assigned_to_user_id: 'other-user',
        status: TaskStatus.IN_PROGRESS,
      } as any);

      await expect(
        service.validatePhotoUpload(Buffer.from('test'), 'image/jpeg', 1000, 'user-123', 'task-123'),
      ).rejects.toThrow('You are not assigned to this task');
    });

    it('should reject if task status is invalid', async () => {
      tasksService.findOne.mockResolvedValue({
        id: 'task-123',
        assigned_to_user_id: 'user-123',
        status: TaskStatus.COMPLETED,
      } as any);

      await expect(
        service.validatePhotoUpload(Buffer.from('test'), 'image/jpeg', 1000, 'user-123', 'task-123'),
      ).rejects.toThrow('Cannot upload photos to task with status');
    });

    it('should pass valid photo', async () => {
      tasksService.findOne.mockResolvedValue({
        id: 'task-123',
        assigned_to_user_id: 'user-123',
        status: TaskStatus.IN_PROGRESS,
      } as any);

      await expect(
        service.validatePhotoUpload(Buffer.from('test'), 'image/jpeg', 1000, 'user-123', 'task-123'),
      ).resolves.toBeUndefined();
    });

    it('should accept PNG files', async () => {
      tasksService.findOne.mockResolvedValue({
        id: 'task-123',
        assigned_to_user_id: 'user-123',
        status: TaskStatus.IN_PROGRESS,
      } as any);

      await expect(
        service.validatePhotoUpload(Buffer.from('test'), 'image/png', 1000, 'user-123', 'task-123'),
      ).resolves.toBeUndefined();
    });

    it('should accept WebP files', async () => {
      tasksService.findOne.mockResolvedValue({
        id: 'task-123',
        assigned_to_user_id: 'user-123',
        status: TaskStatus.PENDING,
      } as any);

      await expect(
        service.validatePhotoUpload(Buffer.from('test'), 'image/webp', 1000, 'user-123', 'task-123'),
      ).resolves.toBeUndefined();
    });
  });

  describe('handlePhotoUpload', () => {
    it('should ignore photos from unverified users', async () => {
      const ctx = createMockContext({
        telegramUser: { is_verified: false },
      });

      await service.handlePhotoUpload(ctx);

      expect(ctx.reply).not.toHaveBeenCalled();
    });

    it('should reject if no session', async () => {
      const ctx = createMockContext({
        session: null,
      });

      usersService.findByTelegramId.mockResolvedValue({ id: 'user-123' } as any);

      await service.handlePhotoUpload(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Сессия не найдена'),
      );
    });

    it('should reject if not awaiting photo', async () => {
      const ctx = createMockContext({
        session: {
          state: ConversationState.IDLE,
          context: {},
        },
      });

      usersService.findByTelegramId.mockResolvedValue({ id: 'user-123' } as any);

      await service.handlePhotoUpload(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('фото не ожидается'),
      );
    });

    it('should reject if no task in session', async () => {
      const ctx = createMockContext({
        session: {
          state: ConversationState.AWAITING_PHOTO_BEFORE,
          context: {},
        },
      });

      usersService.findByTelegramId.mockResolvedValue({ id: 'user-123' } as any);

      await service.handlePhotoUpload(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Задача не найдена'),
      );
    });

    it('should handle BEFORE photo upload successfully', async () => {
      // Mock fetch for downloading photo
      global.fetch = jest.fn().mockResolvedValue({
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
      });

      const ctx = createMockContext({
        session: {
          state: ConversationState.AWAITING_PHOTO_BEFORE,
          context: { activeTaskId: 'task-123' },
        },
        message: {
          photo: [
            { file_id: 'small', width: 100 },
            { file_id: 'large', width: 500 },
          ],
        },
      });

      usersService.findByTelegramId.mockResolvedValue({ id: 'user-123' } as any);
      tasksService.findOne.mockResolvedValue({
        id: 'task-123',
        metadata: {},
      } as any);
      taskCallbackService.getExecutionState.mockReturnValue({
        photos_uploaded: { before: false, after: false },
      } as any);

      await service.handlePhotoUpload(ctx);

      expect(filesService.uploadFile).toHaveBeenCalledWith(
        expect.objectContaining({ mimetype: 'image/jpeg' }),
        'task',
        'task-123',
        'task_photo_before',
        'user-123',
      );
      expect(sessionService.requestPhoto).toHaveBeenCalledWith('user-123', 'task-123', 'after');
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Фото ДО загружено'),
        expect.any(Object),
      );
    });

    it('should handle AFTER photo upload successfully', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
      });

      const ctx = createMockContext({
        session: {
          state: ConversationState.AWAITING_PHOTO_AFTER,
          context: { activeTaskId: 'task-123' },
        },
        message: {
          photo: [{ file_id: 'large', width: 500 }],
        },
      });

      usersService.findByTelegramId.mockResolvedValue({ id: 'user-123' } as any);
      tasksService.findOne.mockResolvedValue({
        id: 'task-123',
        metadata: {},
      } as any);
      taskCallbackService.getExecutionState.mockReturnValue({
        photos_uploaded: { before: true, after: false },
      } as any);

      await service.handlePhotoUpload(ctx);

      expect(filesService.uploadFile).toHaveBeenCalledWith(
        expect.any(Object),
        'task',
        'task-123',
        'task_photo_after',
        'user-123',
      );
      expect(sessionService.clearActiveTask).toHaveBeenCalledWith('user-123');
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Оба фото загружены'),
        expect.any(Object),
      );
    });

    it('should handle no photo in message', async () => {
      const ctx = createMockContext({
        session: {
          state: ConversationState.AWAITING_PHOTO_BEFORE,
          context: { activeTaskId: 'task-123' },
        },
        message: {},
      });

      usersService.findByTelegramId.mockResolvedValue({ id: 'user-123' } as any);

      await service.handlePhotoUpload(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Фото не найдено'),
      );
    });

    it('should return early if user not found', async () => {
      const ctx = createMockContext({
        session: {
          state: ConversationState.AWAITING_PHOTO_BEFORE,
          context: { activeTaskId: 'task-123' },
        },
      });

      usersService.findByTelegramId.mockResolvedValue(null);

      await service.handlePhotoUpload(ctx);

      // Should return early without reply
      expect(ctx.reply).not.toHaveBeenCalled();
    });

    it('should handle photo upload error in English', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Download failed'));

      const ctx = createMockContext({
        session: {
          state: ConversationState.AWAITING_PHOTO_BEFORE,
          context: { activeTaskId: 'task-123' },
        },
        message: {
          photo: [{ file_id: 'large', width: 500 }],
        },
        telegramUser: {
          is_verified: true,
          language: TelegramLanguage.EN,
          telegram_id: '123456789',
        },
      });

      usersService.findByTelegramId.mockResolvedValue({ id: 'user-123' } as any);

      await service.handlePhotoUpload(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Error uploading photo'),
      );
    });

    it('should handle session not found in English', async () => {
      const ctx = createMockContext({
        session: null,
        telegramUser: {
          is_verified: true,
          language: TelegramLanguage.EN,
          telegram_id: '123456789',
        },
      });

      usersService.findByTelegramId.mockResolvedValue({ id: 'user-123' } as any);

      await service.handlePhotoUpload(ctx);

      expect(ctx.reply).toHaveBeenCalledWith('❌ Session not found. Start task again.');
    });

    it('should handle not awaiting photo in English', async () => {
      const ctx = createMockContext({
        session: {
          state: ConversationState.IDLE,
          context: {},
        },
        telegramUser: {
          is_verified: true,
          language: TelegramLanguage.EN,
          telegram_id: '123456789',
        },
      });

      usersService.findByTelegramId.mockResolvedValue({ id: 'user-123' } as any);

      await service.handlePhotoUpload(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Not expecting a photo'),
      );
    });

    it('should handle task not found in session in English', async () => {
      const ctx = createMockContext({
        session: {
          state: ConversationState.AWAITING_PHOTO_BEFORE,
          context: {},
        },
        telegramUser: {
          is_verified: true,
          language: TelegramLanguage.EN,
          telegram_id: '123456789',
        },
      });

      usersService.findByTelegramId.mockResolvedValue({ id: 'user-123' } as any);

      await service.handlePhotoUpload(ctx);

      expect(ctx.reply).toHaveBeenCalledWith('❌ Task not found in session. Start again.');
    });

    it('should handle no photo found in English', async () => {
      const ctx = createMockContext({
        session: {
          state: ConversationState.AWAITING_PHOTO_BEFORE,
          context: { activeTaskId: 'task-123' },
        },
        message: {},
        telegramUser: {
          is_verified: true,
          language: TelegramLanguage.EN,
          telegram_id: '123456789',
        },
      });

      usersService.findByTelegramId.mockResolvedValue({ id: 'user-123' } as any);

      await service.handlePhotoUpload(ctx);

      expect(ctx.reply).toHaveBeenCalledWith('❌ Photo not found');
    });

    it('should handle BEFORE photo upload in English', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
      });

      const ctx = createMockContext({
        session: {
          state: ConversationState.AWAITING_PHOTO_BEFORE,
          context: { activeTaskId: 'task-123' },
        },
        message: {
          photo: [{ file_id: 'large', width: 500 }],
        },
        telegramUser: {
          is_verified: true,
          language: TelegramLanguage.EN,
          telegram_id: '123456789',
        },
      });

      usersService.findByTelegramId.mockResolvedValue({ id: 'user-123' } as any);
      tasksService.findOne.mockResolvedValue({ id: 'task-123', metadata: {} } as any);
      taskCallbackService.getExecutionState.mockReturnValue({
        photos_uploaded: { before: false, after: false },
      } as any);

      await service.handlePhotoUpload(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('BEFORE photo uploaded successfully'),
        expect.any(Object),
      );
    });

    it('should handle AFTER photo upload in English', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
      });

      const ctx = createMockContext({
        session: {
          state: ConversationState.AWAITING_PHOTO_AFTER,
          context: { activeTaskId: 'task-123' },
        },
        message: {
          photo: [{ file_id: 'large', width: 500 }],
        },
        telegramUser: {
          is_verified: true,
          language: TelegramLanguage.EN,
          telegram_id: '123456789',
        },
      });

      usersService.findByTelegramId.mockResolvedValue({ id: 'user-123' } as any);
      tasksService.findOne.mockResolvedValue({ id: 'task-123', metadata: {} } as any);
      taskCallbackService.getExecutionState.mockReturnValue({
        photos_uploaded: { before: true, after: false },
      } as any);

      await service.handlePhotoUpload(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Both photos uploaded'),
        expect.any(Object),
      );
    });
  });

  describe('handleVoiceMessage', () => {
    it('should ignore voice from unverified users', async () => {
      const ctx = createMockContext({
        telegramUser: { is_verified: false },
      });

      await service.handleVoiceMessage(ctx);

      expect(ctx.reply).not.toHaveBeenCalled();
    });

    it('should handle voice service unavailable', async () => {
      voiceService.isAvailable.mockReturnValue(false);

      const ctx = createMockContext();

      await service.handleVoiceMessage(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Голосовые команды'),
      );
    });

    it('should handle missing voice message', async () => {
      const ctx = createMockContext({
        message: {},
      });

      await service.handleVoiceMessage(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Голосовое сообщение не найдено'),
      );
    });

    it('should transcribe and execute tasks command', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
      });

      const ctx = createMockContext({
        message: {
          voice: { file_id: 'voice-123' },
        },
      });

      voiceService.transcribeVoice.mockResolvedValue('show my tasks');
      voiceService.parseCommand.mockReturnValue({ intent: 'tasks', confidence: 0.9, originalText: 'show my tasks' });

      await service.handleVoiceMessage(ctx);

      expect(mockHelpers.handleTasksCommand).toHaveBeenCalledWith(ctx);
    });

    it('should transcribe and execute machines command', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
      });

      const ctx = createMockContext({
        message: {
          voice: { file_id: 'voice-123' },
        },
      });

      voiceService.transcribeVoice.mockResolvedValue('show machines');
      voiceService.parseCommand.mockReturnValue({ intent: 'machines', confidence: 0.9, originalText: 'show machines' });

      await service.handleVoiceMessage(ctx);

      expect(mockHelpers.handleMachinesCommand).toHaveBeenCalledWith(ctx);
    });

    it('should transcribe and execute stats command', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
      });

      const ctx = createMockContext({
        message: {
          voice: { file_id: 'voice-123' },
        },
      });

      voiceService.transcribeVoice.mockResolvedValue('show statistics');
      voiceService.parseCommand.mockReturnValue({ intent: 'stats', confidence: 0.9, originalText: 'show statistics' });

      await service.handleVoiceMessage(ctx);

      expect(mockHelpers.handleStatsCommand).toHaveBeenCalledWith(ctx);
    });

    it('should handle help command', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
      });

      const ctx = createMockContext({
        message: {
          voice: { file_id: 'voice-123' },
        },
      });

      voiceService.transcribeVoice.mockResolvedValue('help me');
      voiceService.parseCommand.mockReturnValue({ intent: 'help', confidence: 0.9, originalText: 'help me' });

      await service.handleVoiceMessage(ctx);

      expect(ctx.reply).toHaveBeenCalledWith('help', expect.any(Object));
    });

    it('should handle start_task command with task number', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
      });

      const ctx = createMockContext({
        message: {
          voice: { file_id: 'voice-123' },
        },
      });

      voiceService.transcribeVoice.mockResolvedValue('start task 1');
      voiceService.parseCommand.mockReturnValue({
        intent: 'start_task',
        confidence: 0.9,
        originalText: 'start task 1',
        parameters: { taskNumber: '1' },
      });

      await service.handleVoiceMessage(ctx);

      expect(mockHelpers.handleTasksCommand).toHaveBeenCalledWith(ctx);
    });

    it('should handle start_task command without task number', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
      });

      const ctx = createMockContext({
        message: {
          voice: { file_id: 'voice-123' },
        },
      });

      voiceService.transcribeVoice.mockResolvedValue('start task');
      voiceService.parseCommand.mockReturnValue({
        intent: 'start_task',
        confidence: 0.9,
        originalText: 'start task',
        parameters: {},
      });

      await service.handleVoiceMessage(ctx);

      expect(mockHelpers.handleTasksCommand).toHaveBeenCalledWith(ctx);
    });

    it('should handle complete_task command', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
      });

      const ctx = createMockContext({
        message: {
          voice: { file_id: 'voice-123' },
        },
      });

      voiceService.transcribeVoice.mockResolvedValue('complete task');
      voiceService.parseCommand.mockReturnValue({ intent: 'complete_task', confidence: 0.9, originalText: 'complete task' });

      await service.handleVoiceMessage(ctx);

      expect(mockHelpers.handleTasksCommand).toHaveBeenCalledWith(ctx);
    });

    it('should handle voice transcription error', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
      });

      const ctx = createMockContext({
        message: {
          voice: { file_id: 'voice-123' },
        },
      });

      voiceService.transcribeVoice.mockRejectedValue(new Error('Transcription failed'));

      await service.handleVoiceMessage(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Не удалось распознать'),
        expect.any(Object),
      );
    });

    it('should handle voice transcription error in English', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
      });

      const ctx = createMockContext({
        message: {
          voice: { file_id: 'voice-123' },
        },
        telegramUser: {
          is_verified: true,
          language: TelegramLanguage.EN,
          telegram_id: '123456789',
        },
      });

      voiceService.transcribeVoice.mockRejectedValue(new Error('Transcription failed'));

      await service.handleVoiceMessage(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Failed to process voice message'),
        expect.any(Object),
      );
    });

    it('should handle voice service unavailable in English', async () => {
      voiceService.isAvailable.mockReturnValue(false);

      const ctx = createMockContext({
        telegramUser: {
          is_verified: true,
          language: TelegramLanguage.EN,
          telegram_id: '123456789',
        },
      });

      await service.handleVoiceMessage(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Voice commands temporarily unavailable'),
      );
    });

    it('should handle missing voice message in English', async () => {
      const ctx = createMockContext({
        message: {},
        telegramUser: {
          is_verified: true,
          language: TelegramLanguage.EN,
          telegram_id: '123456789',
        },
      });

      await service.handleVoiceMessage(ctx);

      expect(ctx.reply).toHaveBeenCalledWith('❌ Voice message not found');
    });

    it('should handle English voice commands', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
      });

      const ctx = createMockContext({
        message: {
          voice: { file_id: 'voice-123' },
        },
        telegramUser: {
          is_verified: true,
          language: TelegramLanguage.EN,
          telegram_id: '123456789',
        },
      });

      voiceService.transcribeVoice.mockResolvedValue('show my tasks');
      voiceService.parseCommand.mockReturnValue({ intent: 'tasks', confidence: 0.9, originalText: 'show my tasks' });

      await service.handleVoiceMessage(ctx);

      expect(voiceService.transcribeVoice).toHaveBeenCalledWith(
        expect.any(Buffer),
        'en',
      );
    });

    it('should handle unknown voice command', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
      });

      const ctx = createMockContext({
        message: {
          voice: { file_id: 'voice-123' },
        },
      });

      voiceService.transcribeVoice.mockResolvedValue('random words');
      voiceService.parseCommand.mockReturnValue({ intent: 'unknown', confidence: 0.1, originalText: 'random words' });

      await service.handleVoiceMessage(ctx);

      // Should still work, just not execute any command
      expect(ctx.reply).toHaveBeenCalled();
    });
  });

  describe('setHelpers', () => {
    it('should set helpers correctly', () => {
      const newService = new TelegramTaskOperationsService(
        sessionService,
        voiceService,
        taskCallbackService,
        tasksService,
        filesService,
        usersService,
      );

      expect(() => newService.setHelpers(mockHelpers)).not.toThrow();
    });

    it('should return key when helpers not set for t()', async () => {
      const newService = new TelegramTaskOperationsService(
        sessionService,
        voiceService,
        taskCallbackService,
        tasksService,
        filesService,
        usersService,
      );
      // Don't call setHelpers

      const ctx = createMockContext({
        telegramUser: { is_verified: false, language: TelegramLanguage.RU },
      });

      await newService.handleStartTaskCommand(ctx);

      expect(ctx.reply).toHaveBeenCalledWith('not_verified');
    });
  });

  describe('edge cases', () => {
    it('should handle task with null machine', async () => {
      const ctx = createMockContext({
        message: { text: '/start_task abc123' },
      });

      usersService.findByTelegramId.mockResolvedValue({ id: 'user-123' } as any);
      tasksService.startTask.mockResolvedValue({
        id: 'abc123',
        type_code: TaskType.REFILL,
        machine: null,
        checklist: [],
      } as any);

      await service.handleStartTaskCommand(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('N/A'),
        expect.any(Object),
      );
    });

    it('should handle task with null location', async () => {
      const ctx = createMockContext({
        message: { text: '/start_task abc123' },
      });

      usersService.findByTelegramId.mockResolvedValue({ id: 'user-123' } as any);
      tasksService.startTask.mockResolvedValue({
        id: 'abc123',
        type_code: TaskType.REFILL,
        machine: { machine_number: 'M-001', location: null },
        checklist: [],
      } as any);

      await service.handleStartTaskCommand(ctx);

      expect(ctx.reply).toHaveBeenCalled();
    });

    it('should update execution state after BEFORE photo upload', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
      });

      const ctx = createMockContext({
        session: {
          state: ConversationState.AWAITING_PHOTO_BEFORE,
          context: { activeTaskId: 'task-123' },
        },
        message: {
          photo: [{ file_id: 'large', width: 500 }],
        },
      });

      usersService.findByTelegramId.mockResolvedValue({ id: 'user-123' } as any);

      const mockState = {
        photos_uploaded: { before: false, after: false },
      };
      tasksService.findOne.mockResolvedValue({ id: 'task-123', metadata: {} } as any);
      taskCallbackService.getExecutionState.mockReturnValue(mockState as any);

      await service.handlePhotoUpload(ctx);

      expect(taskCallbackService.updateExecutionState).toHaveBeenCalledWith(
        'task-123',
        expect.objectContaining({
          photos_uploaded: expect.objectContaining({ before: true }),
        }),
      );
    });

    it('should update execution state after AFTER photo upload', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
      });

      const ctx = createMockContext({
        session: {
          state: ConversationState.AWAITING_PHOTO_AFTER,
          context: { activeTaskId: 'task-123' },
        },
        message: {
          photo: [{ file_id: 'large', width: 500 }],
        },
      });

      usersService.findByTelegramId.mockResolvedValue({ id: 'user-123' } as any);

      const mockState = {
        photos_uploaded: { before: true, after: false },
      };
      tasksService.findOne.mockResolvedValue({ id: 'task-123', metadata: {} } as any);
      taskCallbackService.getExecutionState.mockReturnValue(mockState as any);

      await service.handlePhotoUpload(ctx);

      expect(taskCallbackService.updateExecutionState).toHaveBeenCalledWith(
        'task-123',
        expect.objectContaining({
          photos_uploaded: expect.objectContaining({ after: true }),
        }),
      );
    });

    it('should handle execution state update failure gracefully', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
      });

      const ctx = createMockContext({
        session: {
          state: ConversationState.AWAITING_PHOTO_BEFORE,
          context: { activeTaskId: 'task-123' },
        },
        message: {
          photo: [{ file_id: 'large', width: 500 }],
        },
      });

      usersService.findByTelegramId.mockResolvedValue({ id: 'user-123' } as any);
      tasksService.findOne.mockRejectedValue(new Error('DB error'));

      await service.handlePhotoUpload(ctx);

      // Should still succeed despite state update failure
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Фото ДО загружено'),
        expect.any(Object),
      );
    });

    it('should handle null execution state', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
      });

      const ctx = createMockContext({
        session: {
          state: ConversationState.AWAITING_PHOTO_BEFORE,
          context: { activeTaskId: 'task-123' },
        },
        message: {
          photo: [{ file_id: 'large', width: 500 }],
        },
      });

      usersService.findByTelegramId.mockResolvedValue({ id: 'user-123' } as any);
      tasksService.findOne.mockResolvedValue({ id: 'task-123', metadata: {} } as any);
      taskCallbackService.getExecutionState.mockReturnValue(null);

      await service.handlePhotoUpload(ctx);

      // Should not throw, should not call updateExecutionState
      expect(taskCallbackService.updateExecutionState).not.toHaveBeenCalled();
    });
  });
});
