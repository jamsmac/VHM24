import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TelegramQuickActionsService, UserState } from './telegram-quick-actions.service';
import { TelegramI18nService } from '../../i18n/services/telegram-i18n.service';
import {
  TelegramBotAnalytics,
  TelegramAnalyticsEventType,
} from '../../shared/entities/telegram-bot-analytics.entity';
import { UserRole } from '@modules/users/entities/user.entity';

describe('TelegramQuickActionsService', () => {
  let service: TelegramQuickActionsService;
  let i18nService: jest.Mocked<TelegramI18nService>;
  let analyticsRepository: jest.Mocked<Repository<TelegramBotAnalytics>>;

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
    analyticsRepository = module.get(getRepositoryToken(TelegramBotAnalytics));
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
      await expect(
        service.trackQuickActionUsage('user-123', 'start_refill'),
      ).resolves.not.toThrow();

      expect(analyticsRepository.create).toHaveBeenCalledWith({
        user_id: 'user-123',
        telegram_user_id: null,
        event_type: TelegramAnalyticsEventType.QUICK_ACTION,
        action_name: 'start_refill',
        action_category: 'task',
        success: true,
        metadata: {},
      });
      expect(analyticsRepository.save).toHaveBeenCalled();
    });

    it('should track with telegram user id', async () => {
      await service.trackQuickActionUsage('user-123', 'stats', 'tg-user-456');

      expect(analyticsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
          telegram_user_id: 'tg-user-456',
          action_name: 'stats',
          action_category: 'info',
        }),
      );
    });

    it('should track with metadata', async () => {
      const metadata = { machineId: 'machine-123', taskType: 'refill' };
      await service.trackQuickActionUsage('user-123', 'incident', 'tg-user-456', metadata);

      expect(analyticsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action_name: 'incident',
          action_category: 'emergency',
          metadata,
        }),
      );
    });

    it('should handle unknown action category', async () => {
      await service.trackQuickActionUsage('user-123', 'unknown_action');

      expect(analyticsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action_name: 'unknown_action',
          action_category: 'other',
        }),
      );
    });

    it('should handle save error gracefully', async () => {
      analyticsRepository.save.mockRejectedValueOnce(new Error('Database error'));

      // Should not throw - analytics should not break the main flow
      await expect(
        service.trackQuickActionUsage('user-123', 'start_refill'),
      ).resolves.not.toThrow();
    });

    it('should track photo actions correctly', async () => {
      await service.trackQuickActionUsage('user-123', 'photo_before');

      expect(analyticsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action_category: 'photo',
        }),
      );
    });

    it('should track manager actions correctly', async () => {
      await service.trackQuickActionUsage('user-123', 'team_status');

      expect(analyticsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action_category: 'manager',
        }),
      );
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

  describe('getAnalyticsSummary', () => {
    it('should return empty summary when no analytics', async () => {
      analyticsRepository.find.mockResolvedValueOnce([]);

      const result = await service.getAnalyticsSummary();

      expect(result).toEqual({
        totalActions: 0,
        byAction: {},
        byCategory: {},
        topActions: [],
      });
    });

    it('should aggregate analytics by action', async () => {
      analyticsRepository.find.mockResolvedValueOnce([
        { action_name: 'start_refill', action_category: 'task' },
        { action_name: 'start_refill', action_category: 'task' },
        { action_name: 'stats', action_category: 'info' },
      ] as TelegramBotAnalytics[]);

      const result = await service.getAnalyticsSummary();

      expect(result.totalActions).toBe(3);
      expect(result.byAction).toEqual({
        start_refill: 2,
        stats: 1,
      });
    });

    it('should aggregate analytics by category', async () => {
      analyticsRepository.find.mockResolvedValueOnce([
        { action_name: 'start_refill', action_category: 'task' },
        { action_name: 'complete', action_category: 'task' },
        { action_name: 'stats', action_category: 'info' },
        { action_name: 'incident', action_category: 'emergency' },
      ] as TelegramBotAnalytics[]);

      const result = await service.getAnalyticsSummary();

      expect(result.byCategory).toEqual({
        task: 2,
        info: 1,
        emergency: 1,
      });
    });

    it('should return top actions sorted by count', async () => {
      analyticsRepository.find.mockResolvedValueOnce([
        { action_name: 'start_refill', action_category: 'task' },
        { action_name: 'start_refill', action_category: 'task' },
        { action_name: 'start_refill', action_category: 'task' },
        { action_name: 'stats', action_category: 'info' },
        { action_name: 'stats', action_category: 'info' },
        { action_name: 'incident', action_category: 'emergency' },
      ] as TelegramBotAnalytics[]);

      const result = await service.getAnalyticsSummary();

      expect(result.topActions).toEqual([
        { action: 'start_refill', count: 3 },
        { action: 'stats', count: 2 },
        { action: 'incident', count: 1 },
      ]);
    });

    it('should use custom days parameter', async () => {
      analyticsRepository.find.mockResolvedValueOnce([]);

      await service.getAnalyticsSummary(30);

      expect(analyticsRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            event_type: TelegramAnalyticsEventType.QUICK_ACTION,
          }),
        }),
      );
    });

    it('should handle records without action_category', async () => {
      analyticsRepository.find.mockResolvedValueOnce([
        { action_name: 'custom_action', action_category: null },
        { action_name: 'another_action', action_category: undefined },
        { action_name: 'start_refill', action_category: 'task' },
      ] as TelegramBotAnalytics[]);

      const result = await service.getAnalyticsSummary();

      expect(result.totalActions).toBe(3);
      expect(result.byAction).toEqual({
        custom_action: 1,
        another_action: 1,
        start_refill: 1,
      });
      // Only category that exists should be counted
      expect(result.byCategory).toEqual({
        task: 1,
      });
    });

    it('should limit top actions to 10', async () => {
      const manyActions = Array.from({ length: 15 }, (_, i) => ({
        action_name: `action_${i}`,
        action_category: 'task',
      })) as TelegramBotAnalytics[];

      analyticsRepository.find.mockResolvedValueOnce(manyActions);

      const result = await service.getAnalyticsSummary();

      expect(result.topActions.length).toBe(10);
    });
  });

  describe('trackEvent', () => {
    it('should track event with all parameters', async () => {
      const metadata = { key: 'value' };

      await service.trackEvent(
        TelegramAnalyticsEventType.COMMAND,
        'start_command',
        'user-123',
        'tg-user-456',
        metadata,
      );

      expect(analyticsRepository.create).toHaveBeenCalledWith({
        user_id: 'user-123',
        telegram_user_id: 'tg-user-456',
        event_type: TelegramAnalyticsEventType.COMMAND,
        action_name: 'start_command',
        action_category: 'other',
        success: true,
        metadata,
      });
      expect(analyticsRepository.save).toHaveBeenCalled();
    });

    it('should track event without userId', async () => {
      await service.trackEvent(
        TelegramAnalyticsEventType.CALLBACK,
        'menu_select',
        undefined,
        'tg-user-456',
      );

      expect(analyticsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: null,
          telegram_user_id: 'tg-user-456',
        }),
      );
    });

    it('should track event without telegramUserId', async () => {
      await service.trackEvent(
        TelegramAnalyticsEventType.VOICE_COMMAND,
        'text_message',
        'user-123',
        undefined,
      );

      expect(analyticsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
          telegram_user_id: null,
        }),
      );
    });

    it('should track event without metadata', async () => {
      await service.trackEvent(
        TelegramAnalyticsEventType.QUICK_ACTION,
        'stats',
        'user-123',
        'tg-user-456',
      );

      expect(analyticsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action_category: 'info',
          metadata: {},
        }),
      );
    });

    it('should handle save error gracefully', async () => {
      analyticsRepository.save.mockRejectedValueOnce(new Error('Database error'));

      // Should not throw
      await expect(
        service.trackEvent(
          TelegramAnalyticsEventType.QR_SCAN,
          'error_event',
          'user-123',
        ),
      ).resolves.not.toThrow();
    });

    it('should track with known action category', async () => {
      await service.trackEvent(
        TelegramAnalyticsEventType.QUICK_ACTION,
        'start_refill',
        'user-123',
      );

      expect(analyticsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action_name: 'start_refill',
          action_category: 'task',
        }),
      );
    });
  });
});
