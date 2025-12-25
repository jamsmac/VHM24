import { Test, TestingModule } from '@nestjs/testing';
import { CartHandler } from './cart.handler';
import { TelegramSessionService } from '../services/telegram-session.service';
import { TelegramNotificationsService } from '../services/telegram-notifications.service';
import { CartStorageService, CartItem } from '../services/cart-storage.service';
import { UsersService } from '../../users/users.service';
import { RequestsService } from '../../requests/requests.service';
import { RequestPriority, RequestStatus } from '../../requests/entities/request.entity';
import { defaultSessionData, CartState } from './fsm-states';
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

  describe('handleViewCart', () => {
    it('should show empty cart message when cart is empty', async () => {
      const ctx = createMockContext(mockUserId) as Context;
      cartStorage.getCart.mockResolvedValue([]);

      await (handler as any).handleViewCart(ctx);

      expect(sessionService.setSessionData).toHaveBeenCalledWith(mockUserId, defaultSessionData);
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Корзина пуста'),
        expect.any(Object),
      );
    });

    it('should show cart items when cart is not empty', async () => {
      const ctx = createMockContext(mockUserId) as Context;
      cartStorage.getCart.mockResolvedValue(mockCartItems);

      await (handler as any).handleViewCart(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Ваша корзина'),
        expect.any(Object),
      );
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Coffee Beans'),
        expect.any(Object),
      );
    });

    it('should return early if userId is not provided', async () => {
      const ctx = { from: undefined } as unknown as Context;

      await (handler as any).handleViewCart(ctx);

      expect(cartStorage.getCart).not.toHaveBeenCalled();
    });
  });

  describe('handleViewCartCallback', () => {
    it('should show cart via callback and answer query', async () => {
      const ctx = createMockContext(mockUserId) as Context;
      cartStorage.getCart.mockResolvedValue(mockCartItems);

      await (handler as any).handleViewCartCallback(ctx);

      expect(ctx.editMessageText).toHaveBeenCalled();
      expect(ctx.answerCbQuery).toHaveBeenCalled();
    });

    it('should show empty cart via callback', async () => {
      const ctx = createMockContext(mockUserId) as Context;
      cartStorage.getCart.mockResolvedValue([]);

      await (handler as any).handleViewCartCallback(ctx);

      expect(ctx.editMessageText).toHaveBeenCalledWith(
        expect.stringContaining('Корзина пуста'),
        expect.any(Object),
      );
    });
  });

  describe('handleCartIncrease', () => {
    it('should increase item quantity', async () => {
      const ctx = {
        ...createMockContext(mockUserId),
        match: ['cart_inc:item-1', 'item-1'],
      } as unknown as Context;
      const updatedItem = { ...mockCartItems[0], quantity: 6 };
      cartStorage.updateItemQuantity.mockResolvedValue(updatedItem);
      cartStorage.getCart.mockResolvedValue([updatedItem, mockCartItems[1]]);

      await (handler as any).handleCartIncrease(ctx);

      expect(cartStorage.updateItemQuantity).toHaveBeenCalledWith(mockUserId, 'item-1', 1);
      expect(ctx.answerCbQuery).toHaveBeenCalledWith('➕ Coffee Beans: 6');
    });

    it('should handle null item response', async () => {
      const ctx = {
        ...createMockContext(mockUserId),
        match: ['cart_inc:item-x', 'item-x'],
      } as unknown as Context;
      cartStorage.updateItemQuantity.mockResolvedValue(null);
      cartStorage.getCart.mockResolvedValue(mockCartItems);

      await (handler as any).handleCartIncrease(ctx);

      expect(ctx.answerCbQuery).not.toHaveBeenCalled();
    });

    it('should return early if userId is not provided', async () => {
      const ctx = { from: undefined, match: ['cart_inc:item-1', 'item-1'] } as unknown as Context;

      await (handler as any).handleCartIncrease(ctx);

      expect(cartStorage.updateItemQuantity).not.toHaveBeenCalled();
    });
  });

  describe('handleCartDecrease', () => {
    it('should decrease item quantity', async () => {
      const ctx = {
        ...createMockContext(mockUserId),
        match: ['cart_dec:item-1', 'item-1'],
      } as unknown as Context;
      const updatedItem = { ...mockCartItems[0], quantity: 4 };
      cartStorage.getItem.mockResolvedValue(mockCartItems[0]);
      cartStorage.updateItemQuantity.mockResolvedValue(updatedItem);
      cartStorage.getCart.mockResolvedValue([updatedItem, mockCartItems[1]]);

      await (handler as any).handleCartDecrease(ctx);

      expect(cartStorage.updateItemQuantity).toHaveBeenCalledWith(mockUserId, 'item-1', -1);
      expect(ctx.answerCbQuery).toHaveBeenCalledWith('➖ Coffee Beans: 4');
    });

    it('should show removed message when item quantity reaches zero', async () => {
      const ctx = {
        ...createMockContext(mockUserId),
        match: ['cart_dec:item-1', 'item-1'],
      } as unknown as Context;
      cartStorage.getItem.mockResolvedValue(mockCartItems[0]);
      cartStorage.updateItemQuantity.mockResolvedValue(null); // Item removed
      cartStorage.getCart.mockResolvedValue([mockCartItems[1]]);

      await (handler as any).handleCartDecrease(ctx);

      expect(ctx.answerCbQuery).toHaveBeenCalledWith('🗑 Coffee Beans удалён');
    });

    it('should return early if userId is not provided', async () => {
      const ctx = { from: undefined, match: ['cart_dec:item-1', 'item-1'] } as unknown as Context;

      await (handler as any).handleCartDecrease(ctx);

      expect(cartStorage.updateItemQuantity).not.toHaveBeenCalled();
    });
  });

  describe('handleCartDelete', () => {
    it('should delete item from cart', async () => {
      const ctx = {
        ...createMockContext(mockUserId),
        match: ['cart_del:item-1', 'item-1'],
      } as unknown as Context;
      cartStorage.removeItem.mockResolvedValue(mockCartItems[0]);
      cartStorage.getCart.mockResolvedValue([mockCartItems[1]]);

      await (handler as any).handleCartDelete(ctx);

      expect(cartStorage.removeItem).toHaveBeenCalledWith(mockUserId, 'item-1');
      expect(ctx.answerCbQuery).toHaveBeenCalledWith('🗑 Удалено: Coffee Beans');
    });

    it('should handle non-existent item deletion', async () => {
      const ctx = {
        ...createMockContext(mockUserId),
        match: ['cart_del:item-x', 'item-x'],
      } as unknown as Context;
      cartStorage.removeItem.mockResolvedValue(null);
      cartStorage.getCart.mockResolvedValue(mockCartItems);

      await (handler as any).handleCartDelete(ctx);

      expect(ctx.answerCbQuery).not.toHaveBeenCalled();
    });

    it('should return early if userId is not provided', async () => {
      const ctx = { from: undefined, match: ['cart_del:item-1', 'item-1'] } as unknown as Context;

      await (handler as any).handleCartDelete(ctx);

      expect(cartStorage.removeItem).not.toHaveBeenCalled();
    });
  });

  describe('handleCartClear', () => {
    it('should clear the cart', async () => {
      const ctx = createMockContext(mockUserId) as Context;

      await (handler as any).handleCartClear(ctx);

      expect(cartStorage.clearCart).toHaveBeenCalledWith(mockUserId);
      expect(ctx.editMessageText).toHaveBeenCalledWith(
        '🗑 <b>Корзина очищена</b>',
        expect.any(Object),
      );
      expect(ctx.answerCbQuery).toHaveBeenCalledWith('🗑 Корзина очищена');
    });

    it('should return early if userId is not provided', async () => {
      const ctx = { from: undefined } as unknown as Context;

      await (handler as any).handleCartClear(ctx);

      expect(cartStorage.clearCart).not.toHaveBeenCalled();
    });
  });

  describe('handleStartCheckout', () => {
    it('should start checkout process', async () => {
      const ctx = createMockContext(mockUserId) as Context;
      cartStorage.getCart.mockResolvedValue(mockCartItems);

      await (handler as any).handleStartCheckout(ctx);

      expect(sessionService.setSessionData).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          checkoutItems: 2,
          priority: 'normal',
        }),
      );
      expect(ctx.editMessageText).toHaveBeenCalledWith(
        expect.stringContaining('Оформление заявки'),
        expect.any(Object),
      );
    });

    it('should reject checkout for empty cart', async () => {
      const ctx = createMockContext(mockUserId) as Context;
      cartStorage.getCart.mockResolvedValue([]);

      await (handler as any).handleStartCheckout(ctx);

      expect(ctx.answerCbQuery).toHaveBeenCalledWith('❌ Корзина пуста', { show_alert: true });
    });

    it('should return early if userId is not provided', async () => {
      const ctx = { from: undefined } as unknown as Context;

      await (handler as any).handleStartCheckout(ctx);

      expect(cartStorage.getCart).not.toHaveBeenCalled();
    });
  });

  describe('handleSetPriority', () => {
    it('should set priority to normal', async () => {
      const ctx = {
        ...createMockContext(mockUserId),
        match: ['priority:normal', 'normal'],
      } as unknown as Context;
      sessionService.getSessionData.mockResolvedValue({ priority: 'normal' });

      await (handler as any).handleSetPriority(ctx);

      expect(sessionService.setSessionData).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({ priority: 'normal' }),
      );
      expect(ctx.answerCbQuery).toHaveBeenCalledWith('Приоритет: 🔵 Обычная');
    });

    it('should set priority to high', async () => {
      const ctx = {
        ...createMockContext(mockUserId),
        match: ['priority:high', 'high'],
      } as unknown as Context;
      sessionService.getSessionData.mockResolvedValue({});

      await (handler as any).handleSetPriority(ctx);

      expect(ctx.answerCbQuery).toHaveBeenCalledWith('Приоритет: 🟡 Высокая');
    });

    it('should set priority to urgent', async () => {
      const ctx = {
        ...createMockContext(mockUserId),
        match: ['priority:urgent', 'urgent'],
      } as unknown as Context;
      sessionService.getSessionData.mockResolvedValue({});

      await (handler as any).handleSetPriority(ctx);

      expect(ctx.answerCbQuery).toHaveBeenCalledWith('Приоритет: 🔴 Срочная');
    });

    it('should return early if userId is not provided', async () => {
      const ctx = { from: undefined, match: ['priority:normal', 'normal'] } as unknown as Context;

      await (handler as any).handleSetPriority(ctx);

      expect(sessionService.getSessionData).not.toHaveBeenCalled();
    });
  });

  describe('handleAddCommentStart', () => {
    it('should start comment input state', async () => {
      const ctx = createMockContext(mockUserId) as Context;
      sessionService.getSessionData.mockResolvedValue({ priority: 'normal' });

      await (handler as any).handleAddCommentStart(ctx);

      expect(sessionService.setSessionData).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({ state: CartState.ENTERING_COMMENT }),
      );
      expect(ctx.editMessageText).toHaveBeenCalledWith(
        expect.stringContaining('Добавьте комментарий'),
        expect.any(Object),
      );
    });

    it('should return early if userId is not provided', async () => {
      const ctx = { from: undefined } as unknown as Context;

      await (handler as any).handleAddCommentStart(ctx);

      expect(sessionService.getSessionData).not.toHaveBeenCalled();
    });
  });

  describe('handleCancelCheckout', () => {
    it('should cancel checkout and return to cart', async () => {
      const ctx = createMockContext(mockUserId) as Context;
      cartStorage.getCart.mockResolvedValue(mockCartItems);

      await (handler as any).handleCancelCheckout(ctx);

      expect(sessionService.setSessionData).toHaveBeenCalledWith(mockUserId, defaultSessionData);
      expect(ctx.editMessageText).toHaveBeenCalledWith(
        expect.stringContaining('Оформление отменено'),
        expect.any(Object),
      );
      expect(ctx.answerCbQuery).toHaveBeenCalledWith('Отменено');
    });

    it('should return early if userId is not provided', async () => {
      const ctx = { from: undefined } as unknown as Context;

      await (handler as any).handleCancelCheckout(ctx);

      expect(cartStorage.getCart).not.toHaveBeenCalled();
    });
  });

  describe('handleTextInput', () => {
    it('should handle comment input and show checkout summary', async () => {
      const ctx = {
        ...createMockContext(mockUserId),
        message: { text: 'My comment' },
      } as unknown as Context;
      sessionService.getSessionData.mockResolvedValue({
        state: CartState.ENTERING_COMMENT,
        priority: 'high',
      });
      cartStorage.getCart.mockResolvedValue(mockCartItems);

      const next = jest.fn();
      await (handler as any).handleTextInput(ctx, next);

      expect(sessionService.setSessionData).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          state: CartState.IDLE,
          comment: 'My comment',
        }),
      );
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Оформление заявки'),
        expect.any(Object),
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should skip comment when /skip is entered', async () => {
      const ctx = {
        ...createMockContext(mockUserId),
        message: { text: '/skip' },
      } as unknown as Context;
      sessionService.getSessionData.mockResolvedValue({
        state: CartState.ENTERING_COMMENT,
        priority: 'normal',
      });
      cartStorage.getCart.mockResolvedValue(mockCartItems);

      const next = jest.fn();
      await (handler as any).handleTextInput(ctx, next);

      expect(sessionService.setSessionData).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          comment: undefined,
        }),
      );
    });

    it('should truncate long comments to 500 characters', async () => {
      const longComment = 'x'.repeat(600);
      const ctx = {
        ...createMockContext(mockUserId),
        message: { text: longComment },
      } as unknown as Context;
      sessionService.getSessionData.mockResolvedValue({
        state: CartState.ENTERING_COMMENT,
        priority: 'normal',
      });
      cartStorage.getCart.mockResolvedValue(mockCartItems);

      const next = jest.fn();
      await (handler as any).handleTextInput(ctx, next);

      expect(sessionService.setSessionData).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          comment: 'x'.repeat(500),
        }),
      );
    });

    it('should pass to next middleware when not in comment state', async () => {
      const ctx = {
        ...createMockContext(mockUserId),
        message: { text: 'Some text' },
      } as unknown as Context;
      sessionService.getSessionData.mockResolvedValue({ state: CartState.IDLE });

      const next = jest.fn();
      await (handler as any).handleTextInput(ctx, next);

      expect(next).toHaveBeenCalled();
    });

    it('should pass to next when no session data', async () => {
      const ctx = {
        ...createMockContext(mockUserId),
        message: { text: 'Some text' },
      } as unknown as Context;
      sessionService.getSessionData.mockResolvedValue(null);

      const next = jest.fn();
      await (handler as any).handleTextInput(ctx, next);

      expect(next).toHaveBeenCalled();
    });

    it('should pass to next when message has no text', async () => {
      const ctx = {
        ...createMockContext(mockUserId),
        message: { photo: [] },
      } as unknown as Context;

      const next = jest.fn();
      await (handler as any).handleTextInput(ctx, next);

      expect(next).toHaveBeenCalled();
    });

    it('should return early if userId is not provided', async () => {
      const ctx = { from: undefined, message: { text: 'test' } } as unknown as Context;

      const next = jest.fn();
      await (handler as any).handleTextInput(ctx, next);

      expect(next).toHaveBeenCalled();
    });

    it('should display comment in summary when present', async () => {
      const ctx = {
        ...createMockContext(mockUserId),
        message: { text: 'Short comment' },
      } as unknown as Context;
      sessionService.getSessionData.mockResolvedValue({
        state: CartState.ENTERING_COMMENT,
        priority: 'normal',
      });
      cartStorage.getCart.mockResolvedValue(mockCartItems);

      const next = jest.fn();
      await (handler as any).handleTextInput(ctx, next);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Комментарий'),
        expect.any(Object),
      );
    });

    it('should truncate long comments in display', async () => {
      const ctx = {
        ...createMockContext(mockUserId),
        message: { text: 'A'.repeat(100) },
      } as unknown as Context;
      sessionService.getSessionData.mockResolvedValue({
        state: CartState.ENTERING_COMMENT,
        priority: 'normal',
      });
      cartStorage.getCart.mockResolvedValue(mockCartItems);

      const next = jest.fn();
      await (handler as any).handleTextInput(ctx, next);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('...'),
        expect.any(Object),
      );
    });
  });

  describe('updateCartView', () => {
    it('should update cart view with items', async () => {
      const ctx = createMockContext(mockUserId) as Context;

      await (handler as any).updateCartView(ctx, mockCartItems);

      expect(ctx.editMessageText).toHaveBeenCalledWith(
        expect.stringContaining('Ваша корзина'),
        expect.any(Object),
      );
    });

    it('should show empty message when cart becomes empty', async () => {
      const ctx = createMockContext(mockUserId) as Context;

      await (handler as any).updateCartView(ctx, []);

      expect(ctx.editMessageText).toHaveBeenCalledWith(
        '🛒 <b>Корзина пуста</b>',
        expect.any(Object),
      );
    });

    it('should handle editMessageText errors gracefully', async () => {
      const ctx = createMockContext(mockUserId) as Context;
      (ctx.editMessageText as jest.Mock).mockRejectedValue(new Error('Nothing changed'));

      // Should not throw
      await expect((handler as any).updateCartView(ctx, mockCartItems)).resolves.not.toThrow();
    });
  });

  describe('showCart (callback vs text)', () => {
    it('should use editMessageText for callback', async () => {
      const ctx = createMockContext(mockUserId) as Context;
      cartStorage.getCart.mockResolvedValue(mockCartItems);

      await (handler as any).showCart(ctx, true);

      expect(ctx.editMessageText).toHaveBeenCalled();
      expect(ctx.reply).not.toHaveBeenCalled();
    });

    it('should use reply for text message', async () => {
      const ctx = createMockContext(mockUserId) as Context;
      cartStorage.getCart.mockResolvedValue(mockCartItems);

      await (handler as any).showCart(ctx, false);

      expect(ctx.reply).toHaveBeenCalled();
      expect(ctx.editMessageText).not.toHaveBeenCalled();
    });
  });
});
