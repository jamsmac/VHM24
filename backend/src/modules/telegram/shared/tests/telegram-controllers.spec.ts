import { Test, TestingModule } from '@nestjs/testing';
import { TelegramNotificationsController } from '../../notifications/controllers/telegram-notifications.controller';
import { TelegramSettingsController } from '../../users/controllers/telegram-settings.controller';
import { TelegramUsersController } from '../../users/controllers/telegram-users.controller';
import { TelegramNotificationsService } from '../../notifications/services/telegram-notifications.service';
import { TelegramSettingsService } from '../../users/services/telegram-settings.service';
import { TelegramUsersService } from '../../users/services/telegram-users.service';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { TelegramUser } from '../entities/telegram-user.entity';

describe('Telegram Controllers', () => {
  describe('TelegramNotificationsController', () => {
    let controller: TelegramNotificationsController;
    let telegramNotificationsService: jest.Mocked<TelegramNotificationsService>;

    beforeEach(async () => {
      const mockTelegramNotificationsService = {
        sendNotification: jest.fn(),
      };

      const module: TestingModule = await Test.createTestingModule({
        controllers: [TelegramNotificationsController],
        providers: [
          {
            provide: TelegramNotificationsService,
            useValue: mockTelegramNotificationsService,
          },
        ],
      })
        .overrideGuard(JwtAuthGuard)
        .useValue({ canActivate: () => true })
        .compile();

      controller = module.get<TelegramNotificationsController>(TelegramNotificationsController);
      telegramNotificationsService = module.get(TelegramNotificationsService);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    describe('sendNotification', () => {
      it('should send notification', async () => {
        const dto = { user_id: 'user-123', message: 'Test message' };
        telegramNotificationsService.sendNotification.mockResolvedValue(undefined);

        const result = await controller.sendNotification(dto as any);

        expect(result).toEqual({ message: 'Notification sent successfully' });
        expect(telegramNotificationsService.sendNotification).toHaveBeenCalledWith({
          userId: 'user-123',
          type: 'custom',
          title: 'Test Notification',
          message: 'Test message',
        });
      });

      it('should propagate service errors', async () => {
        const dto = { user_id: 'user-123', message: 'Test message' };
        telegramNotificationsService.sendNotification.mockRejectedValue(
          new Error('User not linked to Telegram'),
        );

        await expect(controller.sendNotification(dto as any)).rejects.toThrow(
          'User not linked to Telegram',
        );
      });

      it('should handle empty message', async () => {
        const dto = { user_id: 'user-123', message: '' };
        telegramNotificationsService.sendNotification.mockResolvedValue(undefined);

        const result = await controller.sendNotification(dto as any);

        expect(result).toEqual({ message: 'Notification sent successfully' });
        expect(telegramNotificationsService.sendNotification).toHaveBeenCalledWith({
          userId: 'user-123',
          type: 'custom',
          title: 'Test Notification',
          message: '',
        });
      });
    });

    describe('sendTestNotification', () => {
      it('should send test notification', async () => {
        const dto = { user_id: 'user-123' };
        telegramNotificationsService.sendNotification.mockResolvedValue(undefined);

        const result = await controller.sendTestNotification(dto);

        expect(result).toEqual({ message: 'Test notification sent successfully' });
        expect(telegramNotificationsService.sendNotification).toHaveBeenCalledWith({
          userId: 'user-123',
          type: 'custom',
          title: '🧪 Test Notification',
          message: expect.stringContaining('This is a test notification'),
          actions: expect.arrayContaining([
            expect.objectContaining({
              text: '✅ Confirm',
              callback_data: 'test_confirm',
            }),
          ]),
        });
      });

      it('should propagate service errors for test notification', async () => {
        const dto = { user_id: 'nonexistent-user' };
        telegramNotificationsService.sendNotification.mockRejectedValue(
          new Error('User not found'),
        );

        await expect(controller.sendTestNotification(dto)).rejects.toThrow('User not found');
      });
    });
  });

  describe('TelegramSettingsController', () => {
    let controller: TelegramSettingsController;
    let telegramSettingsService: jest.Mocked<TelegramSettingsService>;

    beforeEach(async () => {
      const mockTelegramSettingsService = {
        getSettings: jest.fn(),
        getBotInfo: jest.fn(),
        updateSettings: jest.fn(),
      };

      const module: TestingModule = await Test.createTestingModule({
        controllers: [TelegramSettingsController],
        providers: [
          {
            provide: TelegramSettingsService,
            useValue: mockTelegramSettingsService,
          },
        ],
      })
        .overrideGuard(JwtAuthGuard)
        .useValue({ canActivate: () => true })
        .overrideGuard(RolesGuard)
        .useValue({ canActivate: () => true })
        .compile();

      controller = module.get<TelegramSettingsController>(TelegramSettingsController);
      telegramSettingsService = module.get(TelegramSettingsService);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    describe('getSettings', () => {
      it('should return settings with masked bot token', async () => {
        const mockSettings = {
          id: 'settings-123',
          bot_token: '1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnop',
          bot_username: '@testbot',
        };
        telegramSettingsService.getSettings.mockResolvedValue(mockSettings as any);

        const result = await controller.getSettings();

        expect(result.bot_token).toBe('1234567890...');
        expect(result.bot_username).toBe('@testbot');
        expect(telegramSettingsService.getSettings).toHaveBeenCalled();
      });

      it('should handle null bot token', async () => {
        const mockSettings = {
          id: 'settings-123',
          bot_token: null,
          bot_username: null,
        };
        telegramSettingsService.getSettings.mockResolvedValue(mockSettings as any);

        const result = await controller.getSettings();

        expect(result.bot_token).toBeNull();
      });
    });

    describe('getBotInfo', () => {
      it('should return bot info', async () => {
        const mockInfo = {
          username: 'testbot',
          first_name: 'Test Bot',
          can_join_groups: true,
        };
        telegramSettingsService.getBotInfo.mockResolvedValue(mockInfo as any);

        const result = await controller.getBotInfo();

        expect(result).toEqual(mockInfo);
        expect(telegramSettingsService.getBotInfo).toHaveBeenCalled();
      });
    });

    describe('updateSettings', () => {
      it('should update settings and mask token', async () => {
        const dto = { bot_token: '1234567890:NEWTOKENxxx' };
        const mockSettings = {
          id: 'settings-123',
          bot_token: '1234567890:NEWTOKENxxx',
          bot_username: '@testbot',
        };
        telegramSettingsService.updateSettings.mockResolvedValue(mockSettings as any);

        const result = await controller.updateSettings(dto as any);

        expect(result.bot_token).toBe('1234567890...');
        expect(telegramSettingsService.updateSettings).toHaveBeenCalledWith(dto);
      });

      it('should handle null token in update response', async () => {
        const dto = { webhook_url: 'https://example.com/webhook' };
        const mockSettings = {
          id: 'settings-123',
          bot_token: null,
          webhook_url: 'https://example.com/webhook',
        };
        telegramSettingsService.updateSettings.mockResolvedValue(mockSettings as any);

        const result = await controller.updateSettings(dto as any);

        expect(result.bot_token).toBeNull();
      });

      it('should propagate update errors', async () => {
        const dto = { bot_token: 'invalid-token' };
        telegramSettingsService.updateSettings.mockRejectedValue(
          new Error('Invalid bot token format'),
        );

        await expect(controller.updateSettings(dto as any)).rejects.toThrow(
          'Invalid bot token format',
        );
      });
    });

    describe('getSettings - edge cases', () => {
      it('should handle short bot token', async () => {
        const mockSettings = {
          id: 'settings-123',
          bot_token: '12345',
          bot_username: '@testbot',
        };
        telegramSettingsService.getSettings.mockResolvedValue(mockSettings as any);

        const result = await controller.getSettings();

        expect(result.bot_token).toBe('12345...');
      });

      it('should propagate service errors', async () => {
        telegramSettingsService.getSettings.mockRejectedValue(new Error('Database error'));

        await expect(controller.getSettings()).rejects.toThrow('Database error');
      });
    });
  });

  describe('TelegramUsersController', () => {
    let controller: TelegramUsersController;
    let telegramUsersService: jest.Mocked<TelegramUsersService>;

    const mockTelegramUser: Partial<TelegramUser> = {
      id: 'tg-user-123',
      telegram_id: '123456789',
      user_id: 'user-123',
      username: 'testuser',
      first_name: 'Test',
      is_verified: true,
      created_at: new Date(),
    };

    const mockRequest = {
      user: { userId: 'user-123' },
    } as any;

    beforeEach(async () => {
      const mockTelegramUsersService = {
        findAll: jest.fn(),
        findOne: jest.fn(),
        findByUserId: jest.fn(),
        getStatistics: jest.fn(),
        generateVerificationCode: jest.fn(),
        unlinkAccount: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      };

      const module: TestingModule = await Test.createTestingModule({
        controllers: [TelegramUsersController],
        providers: [
          {
            provide: TelegramUsersService,
            useValue: mockTelegramUsersService,
          },
        ],
      })
        .overrideGuard(JwtAuthGuard)
        .useValue({ canActivate: () => true })
        .overrideGuard(RolesGuard)
        .useValue({ canActivate: () => true })
        .compile();

      controller = module.get<TelegramUsersController>(TelegramUsersController);
      telegramUsersService = module.get(TelegramUsersService);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    describe('findAll', () => {
      it('should return all telegram users', async () => {
        const mockUsers = [mockTelegramUser];
        telegramUsersService.findAll.mockResolvedValue(mockUsers as TelegramUser[]);

        const result = await controller.findAll();

        expect(result).toEqual(mockUsers);
        expect(telegramUsersService.findAll).toHaveBeenCalled();
      });
    });

    describe('getStatistics', () => {
      it('should return statistics', async () => {
        const mockStats = { total: 100, verified: 80, active: 75 };
        telegramUsersService.getStatistics.mockResolvedValue(mockStats as any);

        const result = await controller.getStatistics();

        expect(result).toEqual(mockStats);
        expect(telegramUsersService.getStatistics).toHaveBeenCalled();
      });
    });

    describe('getMyTelegramAccount', () => {
      it('should return telegram account when linked', async () => {
        telegramUsersService.findByUserId.mockResolvedValue(mockTelegramUser as TelegramUser);

        const result = await controller.getMyTelegramAccount(mockRequest);

        expect(result).toEqual({
          linked: true,
          verified: true,
          telegram_user: mockTelegramUser,
        });
        expect(telegramUsersService.findByUserId).toHaveBeenCalledWith('user-123');
      });

      it('should return linked: false when not linked', async () => {
        telegramUsersService.findByUserId.mockResolvedValue(null);

        const result = await controller.getMyTelegramAccount(mockRequest);

        expect(result).toEqual({ linked: false });
      });
    });

    describe('generateVerificationCode', () => {
      it('should generate verification code', async () => {
        telegramUsersService.generateVerificationCode.mockResolvedValue('123456');

        const result = await controller.generateVerificationCode(mockRequest);

        expect(result).toEqual({
          verification_code: '123456',
          instructions: expect.stringContaining('valid for 24 hours'),
        });
        expect(telegramUsersService.generateVerificationCode).toHaveBeenCalledWith('user-123');
      });
    });

    describe('unlinkMyAccount', () => {
      it('should unlink account', async () => {
        telegramUsersService.unlinkAccount.mockResolvedValue(undefined);

        const result = await controller.unlinkMyAccount(mockRequest);

        expect(result).toEqual({ message: 'Telegram account unlinked successfully' });
        expect(telegramUsersService.unlinkAccount).toHaveBeenCalledWith('user-123');
      });
    });

    describe('findOne', () => {
      it('should return telegram user by id', async () => {
        telegramUsersService.findOne.mockResolvedValue(mockTelegramUser as TelegramUser);

        const result = await controller.findOne('tg-user-123');

        expect(result).toEqual(mockTelegramUser);
        expect(telegramUsersService.findOne).toHaveBeenCalledWith('tg-user-123');
      });
    });

    describe('update', () => {
      it('should update telegram user', async () => {
        const dto = { first_name: 'Updated' };
        const updatedUser = { ...mockTelegramUser, first_name: 'Updated' };
        telegramUsersService.update.mockResolvedValue(updatedUser as TelegramUser);

        const result = await controller.update('tg-user-123', dto as any);

        expect(result).toEqual(updatedUser);
        expect(telegramUsersService.update).toHaveBeenCalledWith('tg-user-123', dto);
      });
    });

    describe('delete', () => {
      it('should delete telegram user', async () => {
        telegramUsersService.delete.mockResolvedValue(undefined);

        const result = await controller.delete('tg-user-123');

        expect(result).toEqual({ message: 'Telegram user deleted successfully' });
        expect(telegramUsersService.delete).toHaveBeenCalledWith('tg-user-123');
      });

      it('should propagate delete errors', async () => {
        telegramUsersService.delete.mockRejectedValue(new Error('User not found'));

        await expect(controller.delete('nonexistent-id')).rejects.toThrow('User not found');
      });
    });

    describe('error handling', () => {
      it('should propagate findAll errors', async () => {
        telegramUsersService.findAll.mockRejectedValue(new Error('Database connection failed'));

        await expect(controller.findAll()).rejects.toThrow('Database connection failed');
      });

      it('should propagate findOne errors', async () => {
        telegramUsersService.findOne.mockRejectedValue(new Error('User not found'));

        await expect(controller.findOne('nonexistent-id')).rejects.toThrow('User not found');
      });

      it('should propagate update errors', async () => {
        const dto = { first_name: 'Updated' };
        telegramUsersService.update.mockRejectedValue(new Error('Update failed'));

        await expect(controller.update('tg-user-123', dto as any)).rejects.toThrow('Update failed');
      });

      it('should propagate generateVerificationCode errors', async () => {
        telegramUsersService.generateVerificationCode.mockRejectedValue(
          new Error('Already has active code'),
        );

        await expect(controller.generateVerificationCode(mockRequest)).rejects.toThrow(
          'Already has active code',
        );
      });

      it('should propagate unlinkAccount errors', async () => {
        telegramUsersService.unlinkAccount.mockRejectedValue(new Error('No account to unlink'));

        await expect(controller.unlinkMyAccount(mockRequest)).rejects.toThrow(
          'No account to unlink',
        );
      });

      it('should propagate getStatistics errors', async () => {
        telegramUsersService.getStatistics.mockRejectedValue(new Error('Stats unavailable'));

        await expect(controller.getStatistics()).rejects.toThrow('Stats unavailable');
      });
    });

    describe('getMyTelegramAccount - edge cases', () => {
      it('should return unverified account status', async () => {
        const unverifiedUser = { ...mockTelegramUser, is_verified: false };
        telegramUsersService.findByUserId.mockResolvedValue(unverifiedUser as TelegramUser);

        const result = await controller.getMyTelegramAccount(mockRequest);

        expect(result).toEqual({
          linked: true,
          verified: false,
          telegram_user: unverifiedUser,
        });
      });
    });
  });
});
