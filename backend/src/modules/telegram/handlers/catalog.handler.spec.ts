import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CatalogHandler } from './catalog.handler';
import { TelegramSessionService } from '../services/telegram-session.service';
import { CartStorageService } from '../services/cart-storage.service';
import { UsersService } from '../../users/users.service';
import { Material, MaterialCategory } from '../../requests/entities/material.entity';
import { UserRole } from '../../users/entities/user.entity';
import { defaultSessionData, CatalogState } from './fsm-states';
import { Context, Telegraf } from 'telegraf';

describe('CatalogHandler', () => {
  let handler: CatalogHandler;
  let materialRepository: jest.Mocked<Repository<Material>>;
  let sessionService: jest.Mocked<TelegramSessionService>;
  let cartStorage: jest.Mocked<CartStorageService>;
  let usersService: jest.Mocked<UsersService>;

  const mockUserId = '123456789';
  const mockSystemUserId = 'user-uuid-123';

  const createMockUser = (role: UserRole) => ({
    id: mockSystemUserId,
    telegram_id: mockUserId,
    username: 'testuser',
    full_name: 'Test User',
    role,
    email: 'test@example.com',
  });

  const mockMaterial: Partial<Material> = {
    id: 'mat-uuid-1',
    name: 'Coffee Beans',
    sku: 'CB-001',
    category: MaterialCategory.INGREDIENTS,
    unit: 'kg',
    is_active: true,
    sort_order: 1,
    supplier: { id: 'sup-1', name: 'Coffee Supplier' } as any,
  };

  const mockMaterials: Partial<Material>[] = [
    mockMaterial,
    {
      id: 'mat-uuid-2',
      name: 'Sugar',
      sku: 'SG-001',
      category: MaterialCategory.INGREDIENTS,
      unit: 'kg',
      is_active: true,
      sort_order: 2,
    },
    {
      id: 'mat-uuid-3',
      name: 'Paper Cups',
      sku: 'PC-001',
      category: MaterialCategory.PACKAGING,
      unit: 'pcs',
      is_active: true,
      sort_order: 1,
    },
  ];

  const createMockContext = (userId: string): Partial<Context> => ({
    from: { id: parseInt(userId), first_name: 'Test', is_bot: false },
    reply: jest.fn().mockResolvedValue(true),
    editMessageText: jest.fn().mockResolvedValue(true),
    editMessageReplyMarkup: jest.fn().mockResolvedValue(true),
    answerCbQuery: jest.fn().mockResolvedValue(true),
    message: { text: 'test' } as any,
  });

  const createMockActionContext = (userId: string, match: string[]): any => ({
    ...createMockContext(userId),
    match: match,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogHandler,
        {
          provide: getRepositoryToken(Material),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              getMany: jest.fn().mockResolvedValue([]),
            })),
          },
        },
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
            getItemCount: jest.fn(),
            addItem: jest.fn(),
            getCart: jest.fn(),
            clearCart: jest.fn(),
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

    handler = module.get<CatalogHandler>(CatalogHandler);
    materialRepository = module.get(getRepositoryToken(Material));
    sessionService = module.get(TelegramSessionService);
    cartStorage = module.get(CartStorageService);
    usersService = module.get(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Access Control', () => {
    describe('handleCreateOrder', () => {
      it('should deny access when user is not found', async () => {
        // Arrange
        const ctx = createMockContext(mockUserId) as Context;
        usersService.findByTelegramId.mockResolvedValue(null);

        // Act
        await (handler as any).handleCreateOrder(ctx);

        // Assert
        expect(usersService.findByTelegramId).toHaveBeenCalledWith(mockUserId);
        expect(ctx.reply).toHaveBeenCalledWith(
          expect.stringContaining('Пользователь не найден'),
          expect.any(Object),
        );
        expect(sessionService.setSessionData).not.toHaveBeenCalled();
      });

      it('should deny access for VIEWER role', async () => {
        // Arrange
        const ctx = createMockContext(mockUserId) as Context;
        usersService.findByTelegramId.mockResolvedValue(createMockUser(UserRole.VIEWER) as any);

        // Act
        await (handler as any).handleCreateOrder(ctx);

        // Assert
        expect(ctx.reply).toHaveBeenCalledWith(
          expect.stringContaining('Недостаточно прав'),
          expect.any(Object),
        );
        expect(sessionService.setSessionData).not.toHaveBeenCalled();
      });

      it('should deny access for COLLECTOR role', async () => {
        // Arrange
        const ctx = createMockContext(mockUserId) as Context;
        usersService.findByTelegramId.mockResolvedValue(createMockUser(UserRole.COLLECTOR) as any);

        // Act
        await (handler as any).handleCreateOrder(ctx);

        // Assert
        expect(ctx.reply).toHaveBeenCalledWith(
          expect.stringContaining('Недостаточно прав'),
          expect.any(Object),
        );
        expect(sessionService.setSessionData).not.toHaveBeenCalled();
      });

      it('should allow access for OPERATOR role', async () => {
        // Arrange
        const ctx = createMockContext(mockUserId) as Context;
        usersService.findByTelegramId.mockResolvedValue(createMockUser(UserRole.OPERATOR) as any);
        cartStorage.getItemCount.mockResolvedValue(0);

        // Act
        await (handler as any).handleCreateOrder(ctx);

        // Assert
        expect(sessionService.setSessionData).toHaveBeenCalledWith(mockUserId, defaultSessionData);
        expect(ctx.reply).toHaveBeenCalledWith(
          expect.stringContaining('Создание заявки'),
          expect.any(Object),
        );
      });

      it('should allow access for TECHNICIAN role', async () => {
        // Arrange
        const ctx = createMockContext(mockUserId) as Context;
        usersService.findByTelegramId.mockResolvedValue(
          createMockUser(UserRole.TECHNICIAN) as any,
        );
        cartStorage.getItemCount.mockResolvedValue(0);

        // Act
        await (handler as any).handleCreateOrder(ctx);

        // Assert
        expect(sessionService.setSessionData).toHaveBeenCalledWith(mockUserId, defaultSessionData);
        expect(ctx.reply).toHaveBeenCalledWith(
          expect.stringContaining('Создание заявки'),
          expect.any(Object),
        );
      });

      it('should allow access for MANAGER role', async () => {
        // Arrange
        const ctx = createMockContext(mockUserId) as Context;
        usersService.findByTelegramId.mockResolvedValue(createMockUser(UserRole.MANAGER) as any);
        cartStorage.getItemCount.mockResolvedValue(3);

        // Act
        await (handler as any).handleCreateOrder(ctx);

        // Assert
        expect(sessionService.setSessionData).toHaveBeenCalledWith(mockUserId, defaultSessionData);
        expect(cartStorage.getItemCount).toHaveBeenCalledWith(mockUserId);
      });

      it('should allow access for ADMIN role', async () => {
        // Arrange
        const ctx = createMockContext(mockUserId) as Context;
        usersService.findByTelegramId.mockResolvedValue(createMockUser(UserRole.ADMIN) as any);
        cartStorage.getItemCount.mockResolvedValue(0);

        // Act
        await (handler as any).handleCreateOrder(ctx);

        // Assert
        expect(sessionService.setSessionData).toHaveBeenCalled();
      });

      it('should allow access for OWNER role', async () => {
        // Arrange
        const ctx = createMockContext(mockUserId) as Context;
        usersService.findByTelegramId.mockResolvedValue(
          createMockUser(UserRole.OWNER) as any,
        );
        cartStorage.getItemCount.mockResolvedValue(0);

        // Act
        await (handler as any).handleCreateOrder(ctx);

        // Assert
        expect(sessionService.setSessionData).toHaveBeenCalled();
      });

      it('should return early if ctx.from is undefined', async () => {
        // Arrange
        const ctx = { from: undefined, reply: jest.fn() } as unknown as Context;

        // Act
        await (handler as any).handleCreateOrder(ctx);

        // Assert
        expect(usersService.findByTelegramId).not.toHaveBeenCalled();
        expect(ctx.reply).not.toHaveBeenCalled();
      });
    });

    describe('canCreateRequests', () => {
      it('should return true for allowed roles', () => {
        const allowedRoles = [
          UserRole.OWNER,
          UserRole.ADMIN,
          UserRole.MANAGER,
          UserRole.OPERATOR,
          UserRole.TECHNICIAN,
        ];

        allowedRoles.forEach((role) => {
          expect((handler as any).canCreateRequests(role)).toBe(true);
        });
      });

      it('should return false for disallowed roles', () => {
        const disallowedRoles = [UserRole.VIEWER, UserRole.COLLECTOR];

        disallowedRoles.forEach((role) => {
          expect((handler as any).canCreateRequests(role)).toBe(false);
        });
      });
    });
  });

  describe('Category Selection', () => {
    it('should display materials when valid category is selected', async () => {
      // Arrange
      const ctx = createMockActionContext(mockUserId, ['cat:ingredients', 'ingredients']);
      const ingredientMaterials = mockMaterials.filter(
        (m) => m.category === MaterialCategory.INGREDIENTS,
      );
      materialRepository.find.mockResolvedValue(ingredientMaterials as Material[]);
      sessionService.getSessionData.mockResolvedValue(defaultSessionData);

      // Act
      await (handler as any).handleCategory(ctx);

      // Assert
      expect(materialRepository.find).toHaveBeenCalledWith({
        where: { category: 'ingredients', is_active: true },
        order: { sort_order: 'ASC', name: 'ASC' },
      });
      expect(ctx.editMessageText).toHaveBeenCalled();
      expect(ctx.answerCbQuery).toHaveBeenCalled();
    });

    it('should show empty message when category has no materials', async () => {
      // Arrange
      const ctx = createMockActionContext(mockUserId, ['cat:cleaning', 'cleaning']);
      materialRepository.find.mockResolvedValue([]);

      // Act
      await (handler as any).handleCategory(ctx);

      // Assert
      expect(ctx.answerCbQuery).toHaveBeenCalledWith(
        '📭 В этой категории пока нет материалов',
        { show_alert: true },
      );
    });

    it('should handle back action', async () => {
      // Arrange
      const ctx = createMockActionContext(mockUserId, ['cat:back', 'back']);
      cartStorage.getItemCount.mockResolvedValue(2);

      // Act
      await (handler as any).handleCategory(ctx);

      // Assert
      expect(ctx.editMessageText).toHaveBeenCalledWith(
        expect.stringContaining('Выберите категорию'),
        expect.any(Object),
      );
    });

    it('should reject unknown category', async () => {
      // Arrange
      const ctx = createMockActionContext(mockUserId, ['cat:unknown', 'unknown']);

      // Act
      await (handler as any).handleCategory(ctx);

      // Assert
      expect(ctx.answerCbQuery).toHaveBeenCalledWith('❌ Неизвестная категория', {
        show_alert: true,
      });
    });
  });

  describe('Material Selection', () => {
    it('should show quantity keyboard when material is selected', async () => {
      // Arrange
      const ctx = createMockActionContext(mockUserId, ['mat:mat-uuid-1', 'mat-uuid-1']);
      materialRepository.findOne.mockResolvedValue(mockMaterial as Material);
      sessionService.getSessionData.mockResolvedValue(defaultSessionData);

      // Act
      await (handler as any).handleMaterial(ctx);

      // Assert
      expect(materialRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'mat-uuid-1' },
        relations: ['supplier'],
      });
      expect(sessionService.setSessionData).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          selectedMaterialId: 'mat-uuid-1',
          currentQuantity: 1,
        }),
      );
      expect(ctx.editMessageText).toHaveBeenCalledWith(
        expect.stringContaining('Coffee Beans'),
        expect.any(Object),
      );
    });

    it('should handle material not found', async () => {
      // Arrange
      const ctx = createMockActionContext(mockUserId, ['mat:nonexistent', 'nonexistent']);
      materialRepository.findOne.mockResolvedValue(null);

      // Act
      await (handler as any).handleMaterial(ctx);

      // Assert
      expect(ctx.answerCbQuery).toHaveBeenCalledWith('❌ Материал не найден', {
        show_alert: true,
      });
    });
  });

  describe('Quantity Management', () => {
    it('should increase quantity', async () => {
      // Arrange
      const ctx = createMockActionContext(mockUserId, ['qty_inc:mat-1', 'mat-1']);
      sessionService.getSessionData.mockResolvedValue({ currentQuantity: 5 });

      // Act
      await (handler as any).handleQuantityIncrease(ctx);

      // Assert
      expect(sessionService.setSessionData).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({ currentQuantity: 6 }),
      );
    });

    it('should not exceed max quantity of 999', async () => {
      // Arrange
      const ctx = createMockActionContext(mockUserId, ['qty_inc:mat-1', 'mat-1']);
      sessionService.getSessionData.mockResolvedValue({ currentQuantity: 999 });

      // Act
      await (handler as any).handleQuantityIncrease(ctx);

      // Assert
      expect(sessionService.setSessionData).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({ currentQuantity: 999 }),
      );
    });

    it('should decrease quantity', async () => {
      // Arrange
      const ctx = createMockActionContext(mockUserId, ['qty_dec:mat-1', 'mat-1']);
      sessionService.getSessionData.mockResolvedValue({ currentQuantity: 5 });

      // Act
      await (handler as any).handleQuantityDecrease(ctx);

      // Assert
      expect(sessionService.setSessionData).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({ currentQuantity: 4 }),
      );
    });

    it('should not go below 1', async () => {
      // Arrange
      const ctx = createMockActionContext(mockUserId, ['qty_dec:mat-1', 'mat-1']);
      sessionService.getSessionData.mockResolvedValue({ currentQuantity: 1 });

      // Act
      await (handler as any).handleQuantityDecrease(ctx);

      // Assert
      expect(sessionService.setSessionData).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({ currentQuantity: 1 }),
      );
    });

    it('should set specific quantity', async () => {
      // Arrange
      const ctx = createMockActionContext(mockUserId, ['qty_set:mat-1:10', 'mat-1', '10']);
      sessionService.getSessionData.mockResolvedValue({});

      // Act
      await (handler as any).handleQuantitySet(ctx);

      // Assert
      expect(sessionService.setSessionData).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({ currentQuantity: 10 }),
      );
    });
  });

  describe('Add to Cart', () => {
    it('should add item to cart successfully', async () => {
      // Arrange
      const ctx = createMockActionContext(mockUserId, ['qty_add:mat-uuid-1', 'mat-uuid-1']);
      sessionService.getSessionData.mockResolvedValue({ currentQuantity: 3 });
      materialRepository.findOne.mockResolvedValue(mockMaterial as Material);
      cartStorage.getItemCount.mockResolvedValue(1);

      // Act
      await (handler as any).handleAddToCart(ctx);

      // Assert
      expect(cartStorage.addItem).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          materialId: 'mat-uuid-1',
          name: 'Coffee Beans',
          quantity: 3,
          unit: 'kg',
        }),
      );
      expect(sessionService.setSessionData).toHaveBeenCalledWith(mockUserId, defaultSessionData);
      expect(ctx.answerCbQuery).toHaveBeenCalledWith(
        expect.stringContaining('Добавлено'),
        expect.any(Object),
      );
    });

    it('should handle material not found when adding to cart', async () => {
      // Arrange
      const ctx = createMockActionContext(mockUserId, ['qty_add:nonexistent', 'nonexistent']);
      sessionService.getSessionData.mockResolvedValue({ currentQuantity: 1 });
      materialRepository.findOne.mockResolvedValue(null);

      // Act
      await (handler as any).handleAddToCart(ctx);

      // Assert
      expect(cartStorage.addItem).not.toHaveBeenCalled();
      expect(ctx.answerCbQuery).toHaveBeenCalledWith('❌ Материал не найден', {
        show_alert: true,
      });
    });
  });

  describe('Search', () => {
    it('should start search mode', async () => {
      // Arrange
      const ctx = createMockContext(mockUserId) as Context;
      sessionService.getSessionData.mockResolvedValue({});

      // Act
      await (handler as any).handleSearchStart(ctx);

      // Assert
      expect(sessionService.setSessionData).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({ state: CatalogState.SEARCHING }),
      );
      expect(ctx.editMessageText).toHaveBeenCalledWith(
        expect.stringContaining('Поиск материалов'),
        expect.any(Object),
      );
    });
  });

  describe('Text Input Handling', () => {
    it('should handle quantity input in ENTERING_QUANTITY state', async () => {
      // Arrange
      const ctx = {
        ...createMockContext(mockUserId),
        message: { text: '15' },
      } as unknown as Context;
      const next = jest.fn();

      sessionService.getSessionData.mockResolvedValue({
        state: CatalogState.ENTERING_QUANTITY,
        selectedMaterialId: 'mat-uuid-1',
      });
      materialRepository.findOne.mockResolvedValue(mockMaterial as Material);
      cartStorage.getItemCount.mockResolvedValue(1);

      // Act
      await (handler as any).handleTextInput(ctx, next);

      // Assert
      expect(cartStorage.addItem).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          materialId: 'mat-uuid-1',
          quantity: 15,
        }),
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject invalid quantity input', async () => {
      // Arrange
      const ctx = {
        ...createMockContext(mockUserId),
        message: { text: 'invalid' },
      } as unknown as Context;
      const next = jest.fn();

      sessionService.getSessionData.mockResolvedValue({
        state: CatalogState.ENTERING_QUANTITY,
        selectedMaterialId: 'mat-uuid-1',
      });

      // Act
      await (handler as any).handleTextInput(ctx, next);

      // Assert
      expect(ctx.reply).toHaveBeenCalledWith('❌ Введите число от 1 до 999');
      expect(cartStorage.addItem).not.toHaveBeenCalled();
    });

    it('should reject quantity out of range', async () => {
      // Arrange
      const ctx = {
        ...createMockContext(mockUserId),
        message: { text: '1000' },
      } as unknown as Context;
      const next = jest.fn();

      sessionService.getSessionData.mockResolvedValue({
        state: CatalogState.ENTERING_QUANTITY,
        selectedMaterialId: 'mat-uuid-1',
      });

      // Act
      await (handler as any).handleTextInput(ctx, next);

      // Assert
      expect(ctx.reply).toHaveBeenCalledWith('❌ Введите число от 1 до 999');
    });

    it('should handle search query in SEARCHING state', async () => {
      // Arrange
      const ctx = {
        ...createMockContext(mockUserId),
        message: { text: 'coffee' },
      } as unknown as Context;
      const next = jest.fn();

      sessionService.getSessionData.mockResolvedValue({
        state: CatalogState.SEARCHING,
      });

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockMaterial]),
      };
      materialRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      // Act
      await (handler as any).handleTextInput(ctx, next);

      // Assert
      expect(materialRepository.createQueryBuilder).toHaveBeenCalledWith('m');
      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Результаты поиска'),
        expect.any(Object),
      );
    });

    it('should reject search query shorter than 2 characters', async () => {
      // Arrange
      const ctx = {
        ...createMockContext(mockUserId),
        message: { text: 'a' },
      } as unknown as Context;
      const next = jest.fn();

      sessionService.getSessionData.mockResolvedValue({
        state: CatalogState.SEARCHING,
      });

      // Act
      await (handler as any).handleTextInput(ctx, next);

      // Assert
      expect(ctx.reply).toHaveBeenCalledWith('❌ Введите минимум 2 символа для поиска');
      expect(materialRepository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('should pass to next middleware when not in FSM state', async () => {
      // Arrange
      const ctx = {
        ...createMockContext(mockUserId),
        message: { text: 'some text' },
      } as unknown as Context;
      const next = jest.fn();

      sessionService.getSessionData.mockResolvedValue({});

      // Act
      await (handler as any).handleTextInput(ctx, next);

      // Assert
      expect(next).toHaveBeenCalled();
    });

    it('should pass to next middleware when no session', async () => {
      // Arrange
      const ctx = {
        ...createMockContext(mockUserId),
        message: { text: 'some text' },
      } as unknown as Context;
      const next = jest.fn();

      sessionService.getSessionData.mockResolvedValue(null);

      // Act
      await (handler as any).handleTextInput(ctx, next);

      // Assert
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Handler Registration', () => {
    it('should register all handlers on bot', () => {
      // Arrange
      const mockBot = {
        hears: jest.fn(),
        action: jest.fn(),
        on: jest.fn(),
      } as unknown as Telegraf<Context>;

      // Act
      handler.registerHandlers(mockBot);

      // Assert
      expect(mockBot.hears).toHaveBeenCalledWith('📦 Создать заявку', expect.any(Function));
      expect(mockBot.action).toHaveBeenCalledTimes(10);
      expect(mockBot.on).toHaveBeenCalledWith('text', expect.any(Function));
    });
  });
});
