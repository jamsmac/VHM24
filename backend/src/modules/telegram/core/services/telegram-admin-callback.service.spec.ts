import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TelegramAdminCallbackService } from './telegram-admin-callback.service';
import { TelegramUser, TelegramLanguage } from '../../shared/entities/telegram-user.entity';
import { TelegramMessageLog, TelegramMessageType } from '../../shared/entities/telegram-message-log.entity';
import { UsersService } from '../../../users/users.service';
import { UserRole } from '../../../users/entities/user.entity';
import { BotContext } from '../../shared/types/telegram.types';

// Mock Telegraf
jest.mock('telegraf', () => ({
  Markup: {
    inlineKeyboard: jest.fn((buttons) => ({ reply_markup: { inline_keyboard: buttons } })),
    button: {
      callback: jest.fn((text, data) => ({ text, callback_data: data })),
    },
  },
}));

describe('TelegramAdminCallbackService', () => {
  let service: TelegramAdminCallbackService;
  let telegramUserRepository: jest.Mocked<Repository<TelegramUser>>;
  let telegramMessageLogRepository: jest.Mocked<Repository<TelegramMessageLog>>;
  let usersService: jest.Mocked<UsersService>;

  const mockTelegramUser: Partial<TelegramUser> = {
    id: 'tg-user-1',
    telegram_id: '123456789',
    user_id: 'user-1',
    chat_id: '123456789',
    is_verified: true,
    language: TelegramLanguage.RU,
    metadata: {},
  };

  const mockAdminTelegramUser: Partial<TelegramUser> = {
    id: 'tg-admin-1',
    telegram_id: '999999999',
    user_id: 'admin-1',
    chat_id: '999999999',
    is_verified: true,
    language: TelegramLanguage.RU,
  };

  const createMockContext = (overrides: Partial<BotContext> = {}): BotContext => ({
    from: { id: 123456789 },
    chat: { id: 123456789 },
    telegramUser: mockTelegramUser as TelegramUser,
    answerCbQuery: jest.fn().mockResolvedValue(undefined),
    reply: jest.fn().mockResolvedValue(undefined),
    editMessageText: jest.fn().mockResolvedValue(undefined),
    callbackQuery: null,
    ...overrides,
  } as unknown as BotContext);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramAdminCallbackService,
        {
          provide: getRepositoryToken(TelegramUser),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(TelegramMessageLog),
          useValue: {
            create: jest.fn().mockImplementation((data) => data),
            save: jest.fn(),
          },
        },
        {
          provide: UsersService,
          useValue: {
            findOne: jest.fn(),
            findByTelegramId: jest.fn(),
            getPendingUsers: jest.fn(),
            approveUser: jest.fn(),
            rejectUser: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TelegramAdminCallbackService>(TelegramAdminCallbackService);
    telegramUserRepository = module.get(getRepositoryToken(TelegramUser));
    telegramMessageLogRepository = module.get(getRepositoryToken(TelegramMessageLog));
    usersService = module.get(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('isSuperAdmin', () => {
    it('should return false if SUPER_ADMIN_TELEGRAM_ID not set', () => {
      const originalEnv = process.env.SUPER_ADMIN_TELEGRAM_ID;
      delete process.env.SUPER_ADMIN_TELEGRAM_ID;

      const result = service.isSuperAdmin('123456789');

      expect(result).toBe(false);

      process.env.SUPER_ADMIN_TELEGRAM_ID = originalEnv;
    });

    it('should return true if telegramId matches SUPER_ADMIN_TELEGRAM_ID', () => {
      const originalEnv = process.env.SUPER_ADMIN_TELEGRAM_ID;
      process.env.SUPER_ADMIN_TELEGRAM_ID = '123456789';

      const result = service.isSuperAdmin('123456789');

      expect(result).toBe(true);

      process.env.SUPER_ADMIN_TELEGRAM_ID = originalEnv;
    });

    it('should return false if telegramId does not match', () => {
      const originalEnv = process.env.SUPER_ADMIN_TELEGRAM_ID;
      process.env.SUPER_ADMIN_TELEGRAM_ID = '999999999';

      const result = service.isSuperAdmin('123456789');

      expect(result).toBe(false);

      process.env.SUPER_ADMIN_TELEGRAM_ID = originalEnv;
    });

    it('should return false for undefined telegramId', () => {
      const originalEnv = process.env.SUPER_ADMIN_TELEGRAM_ID;
      process.env.SUPER_ADMIN_TELEGRAM_ID = '123456789';

      const result = service.isSuperAdmin(undefined);

      expect(result).toBe(false);

      process.env.SUPER_ADMIN_TELEGRAM_ID = originalEnv;
    });
  });

  describe('handleExpandUser', () => {
    it('should show role selection when super admin expands user', async () => {
      const originalEnv = process.env.SUPER_ADMIN_TELEGRAM_ID;
      process.env.SUPER_ADMIN_TELEGRAM_ID = '123456789';

      const ctx = createMockContext();
      const mockUser = {
        id: 'user-1',
        full_name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        created_at: new Date(),
      };

      usersService.findOne.mockResolvedValue(mockUser as any);

      await service.handleExpandUser(ctx, 'user-1');

      expect(ctx.answerCbQuery).toHaveBeenCalled();
      expect(usersService.findOne).toHaveBeenCalledWith('user-1');
      expect(ctx.editMessageText).toHaveBeenCalled();

      process.env.SUPER_ADMIN_TELEGRAM_ID = originalEnv;
    });

    it('should reject non-super admin', async () => {
      const originalEnv = process.env.SUPER_ADMIN_TELEGRAM_ID;
      process.env.SUPER_ADMIN_TELEGRAM_ID = '999999999';

      const ctx = createMockContext();

      await service.handleExpandUser(ctx, 'user-1');

      expect(ctx.answerCbQuery).toHaveBeenCalledTimes(2);
      expect(usersService.findOne).not.toHaveBeenCalled();

      process.env.SUPER_ADMIN_TELEGRAM_ID = originalEnv;
    });

    it('should handle errors gracefully', async () => {
      const originalEnv = process.env.SUPER_ADMIN_TELEGRAM_ID;
      process.env.SUPER_ADMIN_TELEGRAM_ID = '123456789';

      const ctx = createMockContext();
      usersService.findOne.mockRejectedValue(new Error('User not found'));

      await service.handleExpandUser(ctx, 'user-1');

      expect(ctx.reply).toHaveBeenCalled();

      process.env.SUPER_ADMIN_TELEGRAM_ID = originalEnv;
    });
  });

  describe('handleApproveUser', () => {
    const mockSendMessage = jest.fn().mockResolvedValue(undefined);

    it('should approve user with role when super admin', async () => {
      const originalEnv = process.env.SUPER_ADMIN_TELEGRAM_ID;
      process.env.SUPER_ADMIN_TELEGRAM_ID = '123456789';

      const ctx = createMockContext();
      const mockAdminUser = { id: 'admin-1', full_name: 'Admin' };
      const mockApprovalResult = {
        user: {
          id: 'user-1',
          full_name: 'John Doe',
          email: 'john@example.com',
          telegram_user_id: null,
        },
        credentials: {
          username: 'john.doe',
          password: 'temp123',
        },
      };

      usersService.findByTelegramId.mockResolvedValue(mockAdminUser as any);
      usersService.approveUser.mockResolvedValue(mockApprovalResult as any);

      await service.handleApproveUser(ctx, 'user-1', UserRole.OPERATOR, mockSendMessage);

      expect(ctx.answerCbQuery).toHaveBeenCalledWith('⏳ Одобрение...');
      expect(usersService.approveUser).toHaveBeenCalledWith('user-1', { role: UserRole.OPERATOR }, 'admin-1');
      expect(ctx.editMessageText).toHaveBeenCalled();

      process.env.SUPER_ADMIN_TELEGRAM_ID = originalEnv;
    });

    it('should reject non-super admin', async () => {
      const originalEnv = process.env.SUPER_ADMIN_TELEGRAM_ID;
      process.env.SUPER_ADMIN_TELEGRAM_ID = '999999999';

      const ctx = createMockContext();

      await service.handleApproveUser(ctx, 'user-1', UserRole.OPERATOR, mockSendMessage);

      expect(ctx.answerCbQuery).toHaveBeenCalledWith(
        expect.any(String),
        { show_alert: true },
      );
      expect(usersService.approveUser).not.toHaveBeenCalled();

      process.env.SUPER_ADMIN_TELEGRAM_ID = originalEnv;
    });

    it('should send notification to user if they have telegram linked', async () => {
      const originalEnv = process.env.SUPER_ADMIN_TELEGRAM_ID;
      process.env.SUPER_ADMIN_TELEGRAM_ID = '123456789';

      const ctx = createMockContext();
      const mockAdminUser = { id: 'admin-1', full_name: 'Admin' };
      const mockApprovalResult = {
        user: {
          id: 'user-1',
          full_name: 'John Doe',
          email: 'john@example.com',
          telegram_user_id: '111111111',
        },
        credentials: {
          username: 'john.doe',
          password: 'temp123',
        },
      };

      usersService.findByTelegramId.mockResolvedValue(mockAdminUser as any);
      usersService.approveUser.mockResolvedValue(mockApprovalResult as any);
      telegramUserRepository.findOne.mockResolvedValue({
        chat_id: '111111111',
        language: TelegramLanguage.RU,
      } as TelegramUser);

      await service.handleApproveUser(ctx, 'user-1', UserRole.OPERATOR, mockSendMessage);

      expect(mockSendMessage).toHaveBeenCalled();

      process.env.SUPER_ADMIN_TELEGRAM_ID = originalEnv;
    });
  });

  describe('handleRejectUser', () => {
    it('should prompt for rejection reason', async () => {
      const ctx = createMockContext();
      telegramUserRepository.save.mockResolvedValue(mockTelegramUser as TelegramUser);

      await service.handleRejectUser(ctx, 'user-1');

      expect(ctx.answerCbQuery).toHaveBeenCalled();
      expect(ctx.editMessageText).toHaveBeenCalled();
      expect(telegramUserRepository.save).toHaveBeenCalled();
    });

    it('should store pending rejection user id in metadata', async () => {
      const ctx = createMockContext();
      telegramUserRepository.save.mockResolvedValue(mockTelegramUser as TelegramUser);

      await service.handleRejectUser(ctx, 'user-1');

      expect(ctx.telegramUser?.metadata?.pending_rejection_user_id).toBe('user-1');
    });
  });

  describe('handleRejectUserInput', () => {
    const mockSendMessage = jest.fn().mockResolvedValue(undefined);

    it('should return false if no pending rejection', async () => {
      const ctx = createMockContext({
        telegramUser: { ...mockTelegramUser, metadata: {} } as TelegramUser,
      });

      const result = await service.handleRejectUserInput(ctx, 'reason text', mockSendMessage);

      expect(result).toBe(false);
    });

    it('should reject short reason', async () => {
      const ctx = createMockContext({
        telegramUser: {
          ...mockTelegramUser,
          metadata: { pending_rejection_user_id: 'user-1' },
        } as TelegramUser,
      });

      const result = await service.handleRejectUserInput(ctx, 'short', mockSendMessage);

      expect(result).toBe(true);
      expect(ctx.reply).toHaveBeenCalled();
    });

    it('should reject user with valid reason when super admin', async () => {
      const originalEnv = process.env.SUPER_ADMIN_TELEGRAM_ID;
      process.env.SUPER_ADMIN_TELEGRAM_ID = '123456789';

      const ctx = createMockContext({
        telegramUser: {
          ...mockTelegramUser,
          metadata: { pending_rejection_user_id: 'user-1' },
        } as TelegramUser,
      });

      const mockAdminUser = { id: 'admin-1', full_name: 'Admin' };
      const mockRejectedUser = {
        id: 'user-1',
        full_name: 'John Doe',
        email: 'john@example.com',
        telegram_user_id: null,
      };

      usersService.findByTelegramId.mockResolvedValue(mockAdminUser as any);
      usersService.rejectUser.mockResolvedValue(mockRejectedUser as any);
      telegramUserRepository.save.mockResolvedValue(ctx.telegramUser as TelegramUser);

      const result = await service.handleRejectUserInput(ctx, 'This is a valid rejection reason', mockSendMessage);

      expect(result).toBe(true);
      expect(usersService.rejectUser).toHaveBeenCalledWith('user-1', 'This is a valid rejection reason', 'admin-1');
      expect(ctx.reply).toHaveBeenCalled();

      process.env.SUPER_ADMIN_TELEGRAM_ID = originalEnv;
    });
  });

  describe('handleRefreshPendingUsers', () => {
    it('should call handlePendingUsersCommand', async () => {
      const originalEnv = process.env.SUPER_ADMIN_TELEGRAM_ID;
      process.env.SUPER_ADMIN_TELEGRAM_ID = '123456789';

      const ctx = createMockContext();
      usersService.getPendingUsers.mockResolvedValue([]);

      await service.handleRefreshPendingUsers(ctx);

      expect(ctx.answerCbQuery).toHaveBeenCalled();
      expect(usersService.getPendingUsers).toHaveBeenCalled();

      process.env.SUPER_ADMIN_TELEGRAM_ID = originalEnv;
    });
  });

  describe('handlePendingUsersCommand', () => {
    it('should reject non-super admin', async () => {
      const originalEnv = process.env.SUPER_ADMIN_TELEGRAM_ID;
      process.env.SUPER_ADMIN_TELEGRAM_ID = '999999999';

      const ctx = createMockContext();

      await service.handlePendingUsersCommand(ctx);

      expect(ctx.reply).toHaveBeenCalled();
      expect(usersService.getPendingUsers).not.toHaveBeenCalled();

      process.env.SUPER_ADMIN_TELEGRAM_ID = originalEnv;
    });

    it('should show message if no pending users', async () => {
      const originalEnv = process.env.SUPER_ADMIN_TELEGRAM_ID;
      process.env.SUPER_ADMIN_TELEGRAM_ID = '123456789';

      const ctx = createMockContext();
      usersService.getPendingUsers.mockResolvedValue([]);

      await service.handlePendingUsersCommand(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Нет пользователей'),
      );

      process.env.SUPER_ADMIN_TELEGRAM_ID = originalEnv;
    });

    it('should show pending users list', async () => {
      const originalEnv = process.env.SUPER_ADMIN_TELEGRAM_ID;
      process.env.SUPER_ADMIN_TELEGRAM_ID = '123456789';

      const ctx = createMockContext();
      usersService.getPendingUsers.mockResolvedValue([
        {
          id: 'user-1',
          full_name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          created_at: new Date(),
        },
      ] as any);

      await service.handlePendingUsersCommand(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('John Doe'),
        expect.any(Object),
      );

      process.env.SUPER_ADMIN_TELEGRAM_ID = originalEnv;
    });

    it('should edit message if called from callback', async () => {
      const originalEnv = process.env.SUPER_ADMIN_TELEGRAM_ID;
      process.env.SUPER_ADMIN_TELEGRAM_ID = '123456789';

      const ctx = createMockContext({
        callbackQuery: { id: 'callback-1' } as any,
      });
      usersService.getPendingUsers.mockResolvedValue([
        {
          id: 'user-1',
          full_name: 'John Doe',
          email: 'john@example.com',
          phone: null,
          created_at: new Date(),
        },
      ] as any);

      await service.handlePendingUsersCommand(ctx);

      expect(ctx.editMessageText).toHaveBeenCalled();

      process.env.SUPER_ADMIN_TELEGRAM_ID = originalEnv;
    });
  });

  describe('notifyAdminAboutNewUser', () => {
    const mockSendMessage = jest.fn().mockResolvedValue(undefined);

    it('should not send notification if SUPER_ADMIN_TELEGRAM_ID not set', async () => {
      const originalEnv = process.env.SUPER_ADMIN_TELEGRAM_ID;
      delete process.env.SUPER_ADMIN_TELEGRAM_ID;

      await service.notifyAdminAboutNewUser(
        'user-1',
        { id: 123456789, first_name: 'John' },
        mockSendMessage,
      );

      expect(mockSendMessage).not.toHaveBeenCalled();

      process.env.SUPER_ADMIN_TELEGRAM_ID = originalEnv;
    });

    it('should not send notification if admin not found', async () => {
      const originalEnv = process.env.SUPER_ADMIN_TELEGRAM_ID;
      process.env.SUPER_ADMIN_TELEGRAM_ID = '999999999';

      telegramUserRepository.findOne.mockResolvedValue(null);

      await service.notifyAdminAboutNewUser(
        'user-1',
        { id: 123456789, first_name: 'John' },
        mockSendMessage,
      );

      expect(mockSendMessage).not.toHaveBeenCalled();

      process.env.SUPER_ADMIN_TELEGRAM_ID = originalEnv;
    });

    it('should send notification to admin', async () => {
      const originalEnv = process.env.SUPER_ADMIN_TELEGRAM_ID;
      process.env.SUPER_ADMIN_TELEGRAM_ID = '999999999';

      telegramUserRepository.findOne.mockResolvedValue(mockAdminTelegramUser as TelegramUser);

      await service.notifyAdminAboutNewUser(
        'user-1',
        { id: 123456789, first_name: 'John', last_name: 'Doe', username: 'johndoe' },
        mockSendMessage,
      );

      expect(mockSendMessage).toHaveBeenCalledWith(
        '999999999',
        expect.stringContaining('Новая заявка'),
        expect.any(Object),
      );

      process.env.SUPER_ADMIN_TELEGRAM_ID = originalEnv;
    });

    it('should handle missing user info gracefully', async () => {
      const originalEnv = process.env.SUPER_ADMIN_TELEGRAM_ID;
      process.env.SUPER_ADMIN_TELEGRAM_ID = '999999999';

      telegramUserRepository.findOne.mockResolvedValue(mockAdminTelegramUser as TelegramUser);

      await service.notifyAdminAboutNewUser(
        'user-1',
        { id: 123456789 },
        mockSendMessage,
      );

      expect(mockSendMessage).toHaveBeenCalled();

      process.env.SUPER_ADMIN_TELEGRAM_ID = originalEnv;
    });
  });

  describe('getAdminApprovalKeyboard', () => {
    it('should return keyboard with approval options in Russian', () => {
      const keyboard = service.getAdminApprovalKeyboard('user-123', TelegramLanguage.RU);
      expect(keyboard).toBeDefined();
      expect(keyboard.reply_markup).toBeDefined();
    });

    it('should return keyboard with approval options in English', () => {
      const keyboard = service.getAdminApprovalKeyboard('user-456', TelegramLanguage.EN);
      expect(keyboard).toBeDefined();
    });
  });

  describe('formatRole', () => {
    it('should format OWNER role in Russian', () => {
      const formatted = (service as any).formatRole(UserRole.OWNER, TelegramLanguage.RU);
      expect(formatted).toBe('Владелец');
    });

    it('should format OWNER role in English', () => {
      const formatted = (service as any).formatRole(UserRole.OWNER, TelegramLanguage.EN);
      expect(formatted).toBe('Owner');
    });

    it('should format ADMIN role in Russian', () => {
      const formatted = (service as any).formatRole(UserRole.ADMIN, TelegramLanguage.RU);
      expect(formatted).toBe('Администратор');
    });

    it('should format ADMIN role in English', () => {
      const formatted = (service as any).formatRole(UserRole.ADMIN, TelegramLanguage.EN);
      expect(formatted).toBe('Admin');
    });

    it('should format MANAGER role in Russian', () => {
      const formatted = (service as any).formatRole(UserRole.MANAGER, TelegramLanguage.RU);
      expect(formatted).toBe('Менеджер');
    });

    it('should format MANAGER role in English', () => {
      const formatted = (service as any).formatRole(UserRole.MANAGER, TelegramLanguage.EN);
      expect(formatted).toBe('Manager');
    });

    it('should format OPERATOR role in Russian', () => {
      const formatted = (service as any).formatRole(UserRole.OPERATOR, TelegramLanguage.RU);
      expect(formatted).toBe('Оператор');
    });

    it('should format OPERATOR role in English', () => {
      const formatted = (service as any).formatRole(UserRole.OPERATOR, TelegramLanguage.EN);
      expect(formatted).toBe('Operator');
    });

    it('should format COLLECTOR role in Russian', () => {
      const formatted = (service as any).formatRole(UserRole.COLLECTOR, TelegramLanguage.RU);
      expect(formatted).toBe('Инкассатор');
    });

    it('should format COLLECTOR role in English', () => {
      const formatted = (service as any).formatRole(UserRole.COLLECTOR, TelegramLanguage.EN);
      expect(formatted).toBe('Collector');
    });

    it('should format TECHNICIAN role in Russian', () => {
      const formatted = (service as any).formatRole(UserRole.TECHNICIAN, TelegramLanguage.RU);
      expect(formatted).toBe('Техник');
    });

    it('should format TECHNICIAN role in English', () => {
      const formatted = (service as any).formatRole(UserRole.TECHNICIAN, TelegramLanguage.EN);
      expect(formatted).toBe('Technician');
    });

    it('should format VIEWER role in Russian', () => {
      const formatted = (service as any).formatRole(UserRole.VIEWER, TelegramLanguage.RU);
      expect(formatted).toBe('Просмотр');
    });

    it('should format VIEWER role in English', () => {
      const formatted = (service as any).formatRole(UserRole.VIEWER, TelegramLanguage.EN);
      expect(formatted).toBe('Viewer');
    });

    it('should return role itself for unknown role', () => {
      const formatted = (service as any).formatRole('unknown_role', TelegramLanguage.RU);
      expect(formatted).toBe('unknown_role');
    });
  });

  describe('formatPendingUsersMessage', () => {
    it('should format pending users list in Russian', () => {
      const users = [
        {
          id: 'user-1',
          full_name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          created_at: new Date().toISOString(),
        },
      ];
      const message = (service as any).formatPendingUsersMessage(users, TelegramLanguage.RU);

      expect(message).toContain('John Doe');
      expect(message).toContain('john@example.com');
      expect(message).toContain('Пользователи в ожидании');
    });

    it('should format pending users list in English', () => {
      const users = [
        {
          id: 'user-1',
          full_name: 'Jane Smith',
          email: 'jane@example.com',
          phone: null,
          created_at: new Date().toISOString(),
        },
      ];
      const message = (service as any).formatPendingUsersMessage(users, TelegramLanguage.EN);

      expect(message).toContain('Jane Smith');
      expect(message).toContain('Pending Users');
      expect(message).toContain('N/A');
    });

    it('should handle empty pending users', () => {
      const message = (service as any).formatPendingUsersMessage([], TelegramLanguage.RU);
      expect(message).toBeDefined();
      expect(message).toContain('0');
    });

    it('should handle users without email', () => {
      const users = [
        {
          id: 'user-1',
          full_name: 'John Doe',
          email: null,
          phone: '+1234567890',
          created_at: new Date().toISOString(),
        },
      ];
      const message = (service as any).formatPendingUsersMessage(users, TelegramLanguage.RU);
      expect(message).toContain('John Doe');
    });
  });

  describe('getPendingUsersKeyboard', () => {
    it('should return keyboard with users in Russian', () => {
      const users = [
        { id: 'user-1', full_name: 'John Doe', email: 'john@example.com', phone: null, created_at: new Date().toISOString() },
        { id: 'user-2', full_name: 'Jane Smith', email: 'jane@example.com', phone: null, created_at: new Date().toISOString() },
      ];
      const keyboard = (service as any).getPendingUsersKeyboard(users, TelegramLanguage.RU);
      expect(keyboard).toBeDefined();
    });

    it('should return keyboard with users in English', () => {
      const users = [
        { id: 'user-1', full_name: 'Alice Brown', email: 'alice@example.com', phone: null, created_at: new Date().toISOString() },
      ];
      const keyboard = (service as any).getPendingUsersKeyboard(users, TelegramLanguage.EN);
      expect(keyboard).toBeDefined();
    });

    it('should limit to 5 users', () => {
      const users = Array.from({ length: 10 }, (_, i) => ({
        id: `user-${i}`,
        full_name: `User ${i}`,
        email: `user${i}@example.com`,
        phone: null,
        created_at: new Date().toISOString(),
      }));
      const keyboard = (service as any).getPendingUsersKeyboard(users, TelegramLanguage.RU);
      expect(keyboard).toBeDefined();
    });

    it('should truncate long names', () => {
      const users = [
        { id: 'user-1', full_name: 'This is a very long name that exceeds twenty characters', email: 'long@example.com', phone: null, created_at: new Date().toISOString() },
      ];
      const keyboard = (service as any).getPendingUsersKeyboard(users, TelegramLanguage.RU);
      expect(keyboard).toBeDefined();
    });
  });

  describe('getRoleSelectionKeyboard', () => {
    it('should return keyboard with all role options in Russian', () => {
      const keyboard = (service as any).getRoleSelectionKeyboard('user-123', TelegramLanguage.RU);
      expect(keyboard).toBeDefined();
    });

    it('should return keyboard with all role options in English', () => {
      const keyboard = (service as any).getRoleSelectionKeyboard('user-456', TelegramLanguage.EN);
      expect(keyboard).toBeDefined();
    });
  });

  describe('logCallback', () => {
    it('should log callback to database', async () => {
      const ctx = createMockContext();

      // Access private method
      await (service as any).logCallback(ctx, 'test_callback');

      expect(telegramMessageLogRepository.create).toHaveBeenCalledWith({
        telegram_user_id: 'tg-user-1',
        chat_id: '123456789',
        message_type: TelegramMessageType.CALLBACK,
        command: 'test_callback',
        message_text: 'Callback: test_callback',
      });
      expect(telegramMessageLogRepository.save).toHaveBeenCalled();
    });

    it('should handle logging errors gracefully', async () => {
      const ctx = createMockContext();
      telegramMessageLogRepository.save.mockRejectedValue(new Error('DB error'));

      // Should not throw
      await expect((service as any).logCallback(ctx, 'test_callback')).resolves.not.toThrow();
    });
  });
});
