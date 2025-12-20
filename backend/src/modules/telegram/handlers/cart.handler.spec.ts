import { Test, TestingModule } from '@nestjs/testing';
import { CartHandler } from './cart.handler';
import { TelegramSessionService } from '../services/telegram-session.service';
import { TelegramNotificationsService } from '../services/telegram-notifications.service';
import { CartStorageService, CartItem } from '../services/cart-storage.service';
import { UsersService } from '../../users/users.service';
import { RequestsService } from '../../requests/requests.service';
import { RequestPriority, RequestStatus } from '../../requests/entities/request.entity';
import { defaultSessionData } from './fsm-states';
import { Context } from 'telegraf';

describe('CartHandler', () => {
  let handler: CartHandler;
  let sessionService: jest.Mocked<TelegramSessionService>;
  let cartStorage: jest.Mocked<CartStorageService>;
  let usersService: jest.Mocked<UsersService>;
  let requestsService: jest.Mocked<RequestsService>;
  let notificationsService: jest.Mocked<TelegramNotificationsService>;

  const mockUserId = '123456789';
  const mockSystemUserId = 'user-uuid-123';
  const mockUser = {
    id: mockSystemUserId,
    username: 'testuser',
    full_name: 'Test User',
  };

  const mockCartItems: CartItem[] = [
    { id: 'item-1', materialId: 'mat-1', name: 'Coffee Beans', quantity: 5, unit: 'kg' },
    { id: 'item-2', materialId: 'mat-2', name: 'Sugar', quantity: 10, unit: 'kg' },
  ];

  const mockRequest = {
    id: 'request-uuid-123',
    request_number: 'REQ-2025-000001',
    status: RequestStatus.NEW,
    priority: RequestPriority.NORMAL,
    items: [],
    comment: null,
    created_at: new Date(),
  };

  const createMockContext = (userId: string): Partial<Context> => ({
    from: { id: parseInt(userId), first_name: 'Test', is_bot: false },
    editMessageText: jest.fn().mockResolvedValue(true),
    reply: jest.fn().mockResolvedValue(true),
    answerCbQuery: jest.fn().mockResolvedValue(true),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartHandler,
        {
          provide: TelegramSessionService,
          useValue: {
            getSessionData: jest.fn(),
            setSessionData: jest.fn(),
          },
        },
        {
          provide: CartStorageService,
          useValue: {
            getCart: jest.fn(),
            clearCart: jest.fn(),
            addItem: jest.fn(),
            removeItem: jest.fn(),
            updateItemQuantity: jest.fn(),
            getItem: jest.fn(),
          },
        },
        {
          provide: UsersService,
          useValue: {
            findByTelegramId: jest.fn(),
          },
        },
        {
          provide: RequestsService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
          },
        },
        {
          provide: TelegramNotificationsService,
          useValue: {
            sendNotification: jest.fn(),
          },
        },
      ],
    }).compile();

    handler = module.get<CartHandler>(CartHandler);
    sessionService = module.get(TelegramSessionService);
    cartStorage = module.get(CartStorageService);
    usersService = module.get(UsersService);
    requestsService = module.get(RequestsService);
    notificationsService = module.get(TelegramNotificationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleConfirmCheckout', () => {
    it('should create request and notify admins on successful checkout', async () => {
      // Arrange
      const ctx = createMockContext(mockUserId) as Context;
      cartStorage.getCart.mockResolvedValue(mockCartItems);
      usersService.findByTelegramId.mockResolvedValue(mockUser as any);
      sessionService.getSessionData.mockResolvedValue({ priority: 'high', comment: 'Urgent delivery' });
      requestsService.create.mockResolvedValue(mockRequest as any);

      // Act
      await (handler as any).handleConfirmCheckout(ctx);

      // Assert
      expect(usersService.findByTelegramId).toHaveBeenCalledWith(mockUserId);
      expect(requestsService.create).toHaveBeenCalledWith(mockSystemUserId, {
        priority: RequestPriority.HIGH,
        comment: 'Urgent delivery',
        items: [
          { material_id: 'mat-1', quantity: 5 },
          { material_id: 'mat-2', quantity: 10 },
        ],
      });
      expect(cartStorage.clearCart).toHaveBeenCalledWith(mockUserId);
      expect(sessionService.setSessionData).toHaveBeenCalledWith(mockUserId, defaultSessionData);
      expect(notificationsService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          broadcast: true,
          type: 'new_request',
          title: expect.stringContaining('Новая заявка'),
        }),
      );
      expect(ctx.editMessageText).toHaveBeenCalledWith(
        expect.stringContaining('REQ-2025-000001'),
        expect.any(Object),
      );
      expect(ctx.answerCbQuery).toHaveBeenCalledWith('✅ Заявка создана!');
    });

    it('should reject checkout if cart is empty', async () => {
      // Arrange
      const ctx = createMockContext(mockUserId) as Context;
      cartStorage.getCart.mockResolvedValue([]);

      // Act
      await (handler as any).handleConfirmCheckout(ctx);

      // Assert
      expect(ctx.answerCbQuery).toHaveBeenCalledWith('❌ Корзина пуста', { show_alert: true });
      expect(requestsService.create).not.toHaveBeenCalled();
    });

    it('should reject checkout if user not found', async () => {
      // Arrange
      const ctx = createMockContext(mockUserId) as Context;
      cartStorage.getCart.mockResolvedValue(mockCartItems);
      usersService.findByTelegramId.mockResolvedValue(null);

      // Act
      await (handler as any).handleConfirmCheckout(ctx);

      // Assert
      expect(ctx.answerCbQuery).toHaveBeenCalledWith('❌ Пользователь не найден', { show_alert: true });
      expect(requestsService.create).not.toHaveBeenCalled();
    });

    it('should handle request creation failure gracefully', async () => {
      // Arrange
      const ctx = createMockContext(mockUserId) as Context;
      cartStorage.getCart.mockResolvedValue(mockCartItems);
      usersService.findByTelegramId.mockResolvedValue(mockUser as any);
      sessionService.getSessionData.mockResolvedValue({ priority: 'normal' });
      requestsService.create.mockRejectedValue(new Error('DB error'));

      // Act
      await (handler as any).handleConfirmCheckout(ctx);

      // Assert
      expect(ctx.answerCbQuery).toHaveBeenCalledWith('❌ Ошибка создания заявки', { show_alert: true });
    });

    it('should use default priority if not set in session', async () => {
      // Arrange
      const ctx = createMockContext(mockUserId) as Context;
      cartStorage.getCart.mockResolvedValue(mockCartItems);
      usersService.findByTelegramId.mockResolvedValue(mockUser as any);
      sessionService.getSessionData.mockResolvedValue(null);
      requestsService.create.mockResolvedValue(mockRequest as any);

      // Act
      await (handler as any).handleConfirmCheckout(ctx);

      // Assert
      expect(requestsService.create).toHaveBeenCalledWith(
        mockSystemUserId,
        expect.objectContaining({
          priority: RequestPriority.NORMAL,
        }),
      );
    });

    it('should handle urgent priority correctly', async () => {
      // Arrange
      const ctx = createMockContext(mockUserId) as Context;
      cartStorage.getCart.mockResolvedValue(mockCartItems);
      usersService.findByTelegramId.mockResolvedValue(mockUser as any);
      sessionService.getSessionData.mockResolvedValue({ priority: 'urgent' });
      requestsService.create.mockResolvedValue(mockRequest as any);

      // Act
      await (handler as any).handleConfirmCheckout(ctx);

      // Assert
      expect(requestsService.create).toHaveBeenCalledWith(
        mockSystemUserId,
        expect.objectContaining({
          priority: RequestPriority.URGENT,
        }),
      );
    });
  });

  describe('handleMyRequests', () => {
    it('should display user requests successfully', async () => {
      // Arrange
      const ctx = createMockContext(mockUserId) as Context;
      usersService.findByTelegramId.mockResolvedValue(mockUser as any);
      requestsService.findAll.mockResolvedValue({
        items: [
          {
            request_number: 'REQ-2025-000001',
            status: 'new',
            created_at: new Date('2025-01-15'),
            items: mockCartItems,
          },
          {
            request_number: 'REQ-2025-000002',
            status: 'approved',
            created_at: new Date('2025-01-10'),
            items: [mockCartItems[0]],
          },
        ],
        total: 2,
      } as any);

      // Act
      await (handler as any).handleMyRequests(ctx);

      // Assert
      expect(usersService.findByTelegramId).toHaveBeenCalledWith(mockUserId);
      expect(requestsService.findAll).toHaveBeenCalledWith({
        created_by_user_id: mockSystemUserId,
        limit: 15,
      });
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('REQ-2025-000001'),
        expect.any(Object),
      );
    });

    it('should show empty message when no requests', async () => {
      // Arrange
      const ctx = createMockContext(mockUserId) as Context;
      usersService.findByTelegramId.mockResolvedValue(mockUser as any);
      requestsService.findAll.mockResolvedValue({ items: [], total: 0 });

      // Act
      await (handler as any).handleMyRequests(ctx);

      // Assert
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('У вас пока нет заявок'),
        expect.any(Object),
      );
    });

    it('should reject if user not found', async () => {
      // Arrange
      const ctx = createMockContext(mockUserId) as Context;
      usersService.findByTelegramId.mockResolvedValue(null);

      // Act
      await (handler as any).handleMyRequests(ctx);

      // Assert
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Пользователь не найден'),
        expect.any(Object),
      );
      expect(requestsService.findAll).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const ctx = createMockContext(mockUserId) as Context;
      usersService.findByTelegramId.mockResolvedValue(mockUser as any);
      requestsService.findAll.mockRejectedValue(new Error('DB error'));

      // Act
      await (handler as any).handleMyRequests(ctx);

      // Assert
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Ошибка при загрузке заявок'),
        expect.any(Object),
      );
    });

    it('should display status labels correctly', async () => {
      // Arrange
      const ctx = createMockContext(mockUserId) as Context;
      usersService.findByTelegramId.mockResolvedValue(mockUser as any);
      requestsService.findAll.mockResolvedValue({
        items: [
          { request_number: 'REQ-001', status: 'completed', created_at: new Date(), items: [] },
        ],
        total: 1,
      } as any);

      // Act
      await (handler as any).handleMyRequests(ctx);

      // Assert
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('✔️ Завершена'),
        expect.any(Object),
      );
    });
  });

  describe('notifyAdminsAboutRequest', () => {
    it('should send notification with correct format', async () => {
      // Arrange
      const request = {
        id: 'req-123',
        request_number: 'REQ-2025-000001',
        priority: RequestPriority.HIGH,
        comment: 'Test comment',
      };

      // Act
      await (handler as any).notifyAdminsAboutRequest(request, 'Test User', mockCartItems);

      // Assert
      expect(notificationsService.sendNotification).toHaveBeenCalledWith({
        broadcast: true,
        type: 'new_request',
        title: '📋 Новая заявка на материалы',
        message: expect.stringContaining('REQ-2025-000001'),
        data: {
          requestId: 'req-123',
          requestNumber: 'REQ-2025-000001',
        },
      });
    });

    it('should include items list in notification', async () => {
      // Arrange
      const request = {
        id: 'req-123',
        request_number: 'REQ-2025-000001',
        priority: RequestPriority.NORMAL,
      };

      // Act
      await (handler as any).notifyAdminsAboutRequest(request, 'Test User', mockCartItems);

      // Assert
      const callArgs = notificationsService.sendNotification.mock.calls[0][0];
      expect(callArgs.message).toContain('Coffee Beans');
      expect(callArgs.message).toContain('Sugar');
    });

    it('should not throw if notification fails', async () => {
      // Arrange
      notificationsService.sendNotification.mockRejectedValue(new Error('Network error'));
      const request = {
        id: 'req-123',
        request_number: 'REQ-2025-000001',
        priority: RequestPriority.NORMAL,
      };

      // Act & Assert - should not throw
      await expect(
        (handler as any).notifyAdminsAboutRequest(request, 'Test User', mockCartItems),
      ).resolves.not.toThrow();
    });
  });

  describe('addToCart', () => {
    it('should add item to cart', async () => {
      // Arrange
      const item: CartItem = {
        id: 'item-3',
        materialId: 'mat-3',
        name: 'Milk',
        quantity: 2,
        unit: 'liter',
      };

      // Act
      await handler.addToCart(mockUserId, item);

      // Assert
      expect(cartStorage.addItem).toHaveBeenCalledWith(mockUserId, item);
    });
  });
});
