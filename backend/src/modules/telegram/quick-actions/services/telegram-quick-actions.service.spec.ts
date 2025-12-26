import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TelegramQuickActionsService, UserState } from './telegram-quick-actions.service';
import { TelegramI18nService } from '../../i18n/services/telegram-i18n.service';
import { TelegramBotAnalytics } from '../../shared/entities/telegram-bot-analytics.entity';
import { UserRole } from '@modules/users/entities/user.entity';

describe('TelegramQuickActionsService', () => {
  let service: TelegramQuickActionsService;
  let i18nService: jest.Mocked<TelegramI18nService>;

  beforeEach(async () => {
    const mockI18nService = {
      t: jest.fn((_lang, key) => key),
      getFixedT: jest.fn().mockReturnValue((key: string) => key),
      getLanguageName: jest.fn((_lang) => _lang),
      getLanguageFlag: jest.fn((_lang) => ''),
      getSupportedLanguages: jest.fn().mockReturnValue(['ru', 'en', 'uz']),
      isLanguageSupported: jest.fn().mockReturnValue(true),
      getDateFormat: jest.fn().mockReturnValue('dd.MM.yyyy'),
      getTimeFormat: jest.fn().mockReturnValue('HH:mm'),
      formatDate: jest.fn(),
      getTaskTypeName: jest.fn((type) => type),
      getMachineStatusName: jest.fn((status) => status),
    };

    const mockAnalyticsRepository = {
      create: jest.fn().mockReturnValue({}),
      save: jest.fn().mockResolvedValue({}),
      find: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramQuickActionsService,
        { provide: TelegramI18nService, useValue: mockI18nService },
        { provide: getRepositoryToken(TelegramBotAnalytics), useValue: mockAnalyticsRepository },
      ],
    }).compile();

    service = module.get<TelegramQuickActionsService>(TelegramQuickActionsService);
    i18nService = module.get(TelegramI18nService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getQuickActionKeyboard', () => {
    it('should return active task keyboard when user has active task', () => {
      const userState: UserState = {
        hasActiveTask: true,
        currentTaskType: 'refill',
        awaitingPhotoBefore: true,
        hasPendingRefills: false,
        hasPendingCollections: false,
        role: UserRole.OPERATOR,
      };

      const result = service.getQuickActionKeyboard(userState, 'ru');

      expect(result).toBeDefined();
      expect(result.reply_markup).toBeDefined();
      expect(result.reply_markup.inline_keyboard).toBeDefined();
    });

    it('should return manager keyboard for MANAGER role', () => {
      const userState: UserState = {
        hasActiveTask: false,
        hasPendingRefills: false,
        hasPendingCollections: false,
        role: UserRole.MANAGER,
      };

      const result = service.getQuickActionKeyboard(userState, 'ru');

      expect(result).toBeDefined();
      expect(result.reply_markup.inline_keyboard).toBeDefined();
      // Manager keyboard should have team status and other manager-specific buttons
    });

    it('should return manager keyboard for ADMIN role', () => {
      const userState: UserState = {
        hasActiveTask: false,
        hasPendingRefills: false,
        hasPendingCollections: false,
        role: UserRole.ADMIN,
      };

      const result = service.getQuickActionKeyboard(userState, 'ru');

      expect(result).toBeDefined();
      expect(result.reply_markup.inline_keyboard).toBeDefined();
    });

    it('should return operator idle keyboard when no active task', () => {
      const userState: UserState = {
        hasActiveTask: false,
        hasPendingRefills: true,
        hasPendingCollections: true,
        role: UserRole.OPERATOR,
      };

      const result = service.getQuickActionKeyboard(userState, 'ru');

      expect(result).toBeDefined();
      expect(result.reply_markup.inline_keyboard).toBeDefined();
    });

    it('should show refill button when pending refills exist', () => {
      const userState: UserState = {
        hasActiveTask: false,
        hasPendingRefills: true,
        hasPendingCollections: false,
        role: UserRole.OPERATOR,
      };

      const result = service.getQuickActionKeyboard(userState, 'ru');

      expect(result).toBeDefined();
      // Check that the keyboard includes refill-related buttons
      const flatButtons = result.reply_markup.inline_keyboard.flat();
      const hasRefillButton = flatButtons.some(
        (btn: any) => btn.callback_data === 'quick_start_refill',
      );
      expect(hasRefillButton).toBe(true);
    });

    it('should show collection button when pending collections exist', () => {
      const userState: UserState = {
        hasActiveTask: false,
        hasPendingRefills: false,
        hasPendingCollections: true,
        role: UserRole.OPERATOR,
      };

      const result = service.getQuickActionKeyboard(userState, 'ru');

      expect(result).toBeDefined();
      const flatButtons = result.reply_markup.inline_keyboard.flat();
      const hasCollectionButton = flatButtons.some(
        (btn: any) => btn.callback_data === 'quick_start_collection',
      );
      expect(hasCollectionButton).toBe(true);
    });

    it('should show upload photo before button when awaiting photo before', () => {
      const userState: UserState = {
        hasActiveTask: true,
        awaitingPhotoBefore: true,
        awaitingPhotoAfter: false,
        hasPendingRefills: false,
        hasPendingCollections: false,
        role: UserRole.OPERATOR,
      };

      const result = service.getQuickActionKeyboard(userState, 'ru');

      expect(result).toBeDefined();
      const flatButtons = result.reply_markup.inline_keyboard.flat();
      const hasPhotoBefore = flatButtons.some(
        (btn: any) => btn.callback_data === 'quick_photo_before',
      );
      expect(hasPhotoBefore).toBe(true);
    });

    it('should show upload photo after button when awaiting photo after', () => {
      const userState: UserState = {
        hasActiveTask: true,
        awaitingPhotoBefore: false,
        awaitingPhotoAfter: true,
        hasPendingRefills: false,
        hasPendingCollections: false,
        role: UserRole.OPERATOR,
      };

      const result = service.getQuickActionKeyboard(userState, 'ru');

      expect(result).toBeDefined();
      const flatButtons = result.reply_markup.inline_keyboard.flat();
      const hasPhotoAfter = flatButtons.some(
        (btn: any) => btn.callback_data === 'quick_photo_after',
      );
      expect(hasPhotoAfter).toBe(true);
    });

    it('should show complete button when all photos uploaded', () => {
      const userState: UserState = {
        hasActiveTask: true,
        awaitingPhotoBefore: false,
        awaitingPhotoAfter: false,
        hasPendingRefills: false,
        hasPendingCollections: false,
        role: UserRole.OPERATOR,
      };

      const result = service.getQuickActionKeyboard(userState, 'ru');

      expect(result).toBeDefined();
      const flatButtons = result.reply_markup.inline_keyboard.flat();
      const hasCompleteButton = flatButtons.some(
        (btn: any) => btn.callback_data === 'quick_complete',
      );
      expect(hasCompleteButton).toBe(true);
    });

    it('should use english language when specified', () => {
      const userState: UserState = {
        hasActiveTask: false,
        hasPendingRefills: false,
        hasPendingCollections: false,
        role: UserRole.OPERATOR,
      };

      service.getQuickActionKeyboard(userState, 'en');

      expect(i18nService.getFixedT).toHaveBeenCalledWith('en');
    });
  });

  describe('getPersistentMenuKeyboard', () => {
    it('should return persistent menu keyboard', () => {
      const result = service.getPersistentMenuKeyboard('ru');

      expect(result).toBeDefined();
      expect(result.reply_markup).toBeDefined();
      expect(result.reply_markup.keyboard).toBeDefined();
      expect(result.reply_markup.resize_keyboard).toBe(true);
      expect(result.reply_markup.is_persistent).toBe(true);
    });

    it('should use default language when not specified', () => {
      const result = service.getPersistentMenuKeyboard();

      expect(result).toBeDefined();
      expect(i18nService.getFixedT).toHaveBeenCalledWith('ru');
    });

    it('should use specified language', () => {
      service.getPersistentMenuKeyboard('en');

      expect(i18nService.getFixedT).toHaveBeenCalledWith('en');
    });
  });

  describe('parseQuickAction', () => {
    it('should parse simple quick action', () => {
      const result = service.parseQuickAction('quick_start_refill');

      expect(result).toEqual({
        type: 'start_refill',
        params: undefined,
      });
    });

    it('should parse quick action with parameters', () => {
      const result = service.parseQuickAction('quick_start_task:taskId=uuid123:priority=high');

      expect(result).toEqual({
        type: 'start_task',
        params: {
          taskId: 'uuid123',
          priority: 'high',
        },
      });
    });

    it('should return unknown for non-quick actions', () => {
      const result = service.parseQuickAction('some_other_action');

      expect(result).toEqual({
        type: 'unknown',
      });
    });

    it('should handle action with single parameter', () => {
      const result = service.parseQuickAction('quick_view:id=123');

      expect(result).toEqual({
        type: 'view',
        params: {
          id: '123',
        },
      });
    });

    it('should handle action with no parameters', () => {
      const result = service.parseQuickAction('quick_stats');

      expect(result).toEqual({
        type: 'stats',
        params: undefined,
      });
    });
  });

  describe('createQuickAction', () => {
    it('should create simple quick action', () => {
      const result = service.createQuickAction('start_refill');

      expect(result).toBe('quick_start_refill');
    });

    it('should create quick action with parameters', () => {
      const result = service.createQuickAction('start_task', {
        taskId: 'uuid123',
        priority: 'high',
      });

      expect(result).toBe('quick_start_task:taskId=uuid123:priority=high');
    });

    it('should create quick action with single parameter', () => {
      const result = service.createQuickAction('view', { id: '123' });

      expect(result).toBe('quick_view:id=123');
    });

    it('should handle empty params object', () => {
      const result = service.createQuickAction('stats', {});

      expect(result).toBe('quick_stats:');
    });
  });

  describe('trackQuickActionUsage', () => {
    it('should track quick action usage', async () => {
      // This method currently just logs, so we just verify it doesn't throw
      await expect(
        service.trackQuickActionUsage('user-123', 'start_refill'),
      ).resolves.not.toThrow();
    });
  });

  describe('getQuickActionLabels', () => {
    it('should return all quick action labels', () => {
      const result = service.getQuickActionLabels('ru');

      expect(result).toBeDefined();
      expect(result.startRefill).toBeDefined();
      expect(result.startCollection).toBeDefined();
      expect(result.completeTask).toBeDefined();
      expect(result.todayProgress).toBeDefined();
      expect(result.myRoute).toBeDefined();
      expect(result.taskList).toBeDefined();
      expect(result.reportIncident).toBeDefined();
      expect(result.requestRepair).toBeDefined();
      expect(result.teamStatus).toBeDefined();
      expect(result.activeOperators).toBeDefined();
    });

    it('should use default language when not specified', () => {
      service.getQuickActionLabels();

      expect(i18nService.getFixedT).toHaveBeenCalledWith('ru');
    });

    it('should use specified language', () => {
      service.getQuickActionLabels('en');

      expect(i18nService.getFixedT).toHaveBeenCalledWith('en');
    });
  });
});
