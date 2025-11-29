import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TelegramSettingsService } from './telegram-settings.service';
import { TelegramSettings, TelegramBotMode } from '../entities/telegram-settings.entity';
import { UpdateTelegramSettingsDto } from '../dto/update-telegram-settings.dto';

describe('TelegramSettingsService', () => {
  let service: TelegramSettingsService;
  let repository: jest.Mocked<Repository<TelegramSettings>>;

  const mockSettings: Partial<TelegramSettings> = {
    id: 'settings-uuid',
    setting_key: 'default',
    bot_token: 'test-bot-token',
    bot_username: 'test_bot',
    mode: TelegramBotMode.POLLING,
    webhook_url: null,
    is_active: true,
    send_notifications: true,
    default_notification_preferences: {
      machine_offline: true,
      machine_online: true,
      low_stock: true,
      sales_milestone: true,
      maintenance_due: true,
      equipment_needs_maintenance: true,
      equipment_low_stock: true,
      equipment_washing_due: true,
      payment_failed: true,
      task_assigned: true,
      task_completed: true,
      custom: true,
    },
  };

  beforeEach(async () => {
    const mockRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramSettingsService,
        { provide: getRepositoryToken(TelegramSettings), useValue: mockRepository },
      ],
    }).compile();

    service = module.get<TelegramSettingsService>(TelegramSettingsService);
    repository = module.get(getRepositoryToken(TelegramSettings));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSettings', () => {
    it('should return existing settings', async () => {
      repository.findOne.mockResolvedValue(mockSettings as TelegramSettings);

      const result = await service.getSettings();

      expect(result).toEqual(mockSettings);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { setting_key: 'default' },
      });
    });

    it('should create default settings if none exist', async () => {
      const defaultSettings = {
        setting_key: 'default',
        bot_token: '',
        is_active: false,
        send_notifications: true,
        default_notification_preferences: {
          machine_offline: true,
          machine_online: true,
          low_stock: true,
          sales_milestone: true,
          maintenance_due: true,
          equipment_needs_maintenance: true,
          equipment_low_stock: true,
          equipment_washing_due: true,
          payment_failed: true,
          task_assigned: true,
          task_completed: true,
          custom: true,
        },
      };

      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(defaultSettings as TelegramSettings);
      repository.save.mockResolvedValue(defaultSettings as TelegramSettings);

      const result = await service.getSettings();

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          setting_key: 'default',
          bot_token: '',
          is_active: false,
          send_notifications: true,
        }),
      );
      expect(repository.save).toHaveBeenCalledWith(defaultSettings);
      expect(result).toEqual(defaultSettings);
    });

    it('should include all default notification preferences', async () => {
      repository.findOne.mockResolvedValue(null);
      repository.create.mockImplementation((dto) => dto as TelegramSettings);
      repository.save.mockImplementation((entity) => Promise.resolve(entity as TelegramSettings));

      const result = await service.getSettings();

      const prefs = result.default_notification_preferences;
      expect(prefs.machine_offline).toBe(true);
      expect(prefs.machine_online).toBe(true);
      expect(prefs.low_stock).toBe(true);
      expect(prefs.sales_milestone).toBe(true);
      expect(prefs.maintenance_due).toBe(true);
      expect(prefs.equipment_needs_maintenance).toBe(true);
      expect(prefs.equipment_low_stock).toBe(true);
      expect(prefs.equipment_washing_due).toBe(true);
      expect(prefs.payment_failed).toBe(true);
      expect(prefs.task_assigned).toBe(true);
      expect(prefs.task_completed).toBe(true);
      expect(prefs.custom).toBe(true);
    });
  });

  describe('updateSettings', () => {
    beforeEach(() => {
      // Return a fresh copy to avoid mutations affecting other tests
      repository.findOne.mockResolvedValue({ ...mockSettings } as TelegramSettings);
      repository.save.mockImplementation((entity) => Promise.resolve(entity as TelegramSettings));
    });

    it('should update bot_token', async () => {
      const dto: UpdateTelegramSettingsDto = { bot_token: 'new-bot-token' };

      const result = await service.updateSettings(dto);

      expect(result.bot_token).toBe('new-bot-token');
    });

    it('should update bot_username', async () => {
      const dto: UpdateTelegramSettingsDto = { bot_username: 'new_bot_username' };

      const result = await service.updateSettings(dto);

      expect(result.bot_username).toBe('new_bot_username');
    });

    it('should update mode', async () => {
      const dto: UpdateTelegramSettingsDto = { mode: TelegramBotMode.WEBHOOK };

      const result = await service.updateSettings(dto);

      expect(result.mode).toBe(TelegramBotMode.WEBHOOK);
    });

    it('should update webhook_url', async () => {
      const dto: UpdateTelegramSettingsDto = { webhook_url: 'https://example.com/webhook' };

      const result = await service.updateSettings(dto);

      expect(result.webhook_url).toBe('https://example.com/webhook');
    });

    it('should update is_active', async () => {
      const dto: UpdateTelegramSettingsDto = { is_active: false };

      const result = await service.updateSettings(dto);

      expect(result.is_active).toBe(false);
    });

    it('should update send_notifications', async () => {
      const dto: UpdateTelegramSettingsDto = { send_notifications: false };

      const result = await service.updateSettings(dto);

      expect(result.send_notifications).toBe(false);
    });

    it('should merge notification preferences', async () => {
      const existingPrefs = { ...mockSettings.default_notification_preferences };
      repository.findOne.mockResolvedValue({
        ...mockSettings,
        default_notification_preferences: existingPrefs,
      } as TelegramSettings);

      const dto: UpdateTelegramSettingsDto = {
        default_notification_preferences: {
          machine_offline: false,
          low_stock: false,
        },
      };

      const result = await service.updateSettings(dto);

      expect(result.default_notification_preferences.machine_offline).toBe(false);
      expect(result.default_notification_preferences.low_stock).toBe(false);
      // Other preferences should remain unchanged
      expect(result.default_notification_preferences.machine_online).toBe(true);
    });

    it('should not update fields when not provided in DTO', async () => {
      const dto: UpdateTelegramSettingsDto = { bot_token: 'new-token' };

      const result = await service.updateSettings(dto);

      expect(result.bot_username).toBe(mockSettings.bot_username);
      expect(result.is_active).toBe(mockSettings.is_active);
    });

    it('should save and return updated settings', async () => {
      const dto: UpdateTelegramSettingsDto = { bot_token: 'new-token' };

      await service.updateSettings(dto);

      expect(repository.save).toHaveBeenCalled();
    });
  });

  describe('getBotInfo', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return bot info with configured bot', async () => {
      repository.findOne.mockResolvedValue(mockSettings as TelegramSettings);

      const result = await service.getBotInfo();

      expect(result).toEqual({
        is_configured: true,
        is_active: true,
        bot_username: 'test_bot',
        send_notifications: true,
      });
    });

    it('should return is_configured false when bot_token is empty', async () => {
      const settingsNoToken = { ...mockSettings, bot_token: '' };
      repository.findOne.mockResolvedValue(settingsNoToken as TelegramSettings);

      const result = await service.getBotInfo();

      expect(result.is_configured).toBe(false);
    });

    it('should return is_configured false when bot_token is empty string', async () => {
      const settingsEmptyToken = { ...mockSettings, bot_token: '' };
      repository.findOne.mockResolvedValue(settingsEmptyToken as TelegramSettings);

      const result = await service.getBotInfo();

      expect(result.is_configured).toBe(false);
    });

    it('should return correct is_active status', async () => {
      const inactiveSettings = { ...mockSettings, is_active: false };
      repository.findOne.mockResolvedValue(inactiveSettings as TelegramSettings);

      const result = await service.getBotInfo();

      expect(result.is_active).toBe(false);
    });

    it('should return bot_username as null when not set', async () => {
      const settingsNoUsername = { ...mockSettings, bot_username: null };
      repository.findOne.mockResolvedValue(settingsNoUsername as TelegramSettings);

      const result = await service.getBotInfo();

      expect(result.bot_username).toBeNull();
    });
  });
});
