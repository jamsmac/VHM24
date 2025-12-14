import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TransactionsService } from './transactions.service';
import {
  Transaction,
  TransactionType,
  PaymentMethod,
  ExpenseCategory,
} from './entities/transaction.entity';
import { Machine } from '../machines/entities/machine.entity';
import { InventoryService } from '../inventory/inventory.service';
import { RecipesService } from '../recipes/recipes.service';
import { IncidentsService } from '../incidents/incidents.service';
import { AuditLogService } from '../security/services/audit-log.service';
import { AuditEventType, AuditSeverity } from '../security/entities/audit-log.entity';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let transactionRepository: jest.Mocked<Repository<Transaction>>;
  let machineRepository: jest.Mocked<Repository<Machine>>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let inventoryService: jest.Mocked<InventoryService>;
  let recipesService: jest.Mocked<RecipesService>;
  let incidentsService: jest.Mocked<IncidentsService>;
  let auditLogService: jest.Mocked<AuditLogService>;

  // Mock data fixtures
  const mockTransaction: Partial<Transaction> = {
    id: 'txn-uuid',
    transaction_number: 'TXN-20251126-0001',
    transaction_type: TransactionType.SALE,
    amount: 5000,
    currency: 'UZS',
    payment_method: PaymentMethod.CASH,
    transaction_date: new Date('2025-11-26'),
    machine_id: 'machine-uuid',
    user_id: null,
    recipe_id: null,
    quantity: 1,
    description: null,
  };

  const mockMachine: Partial<Machine> = {
    id: 'machine-uuid',
    machine_number: 'M-001',
    name: 'Test Machine',
    contract_id: null,
  };

  const mockRecipe = {
    id: 'recipe-uuid',
    name: 'Americano',
    ingredients: [
      { ingredient_id: 'ing-1', quantity: 10, ingredient: { name: 'Coffee Beans' } },
      { ingredient_id: 'ing-2', quantity: 200, ingredient: { name: 'Water' } },
    ],
  };

  // Create mock repository
  const createMockRepository = <_T>() => ({
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    findAndCount: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    softDelete: jest.fn(),
    softRemove: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
      getMany: jest.fn(),
      getManyAndCount: jest.fn(),
      getCount: jest.fn(),
      getRawMany: jest.fn(),
      getRawOne: jest.fn(),
      execute: jest.fn(),
    })),
  });

  beforeEach(async () => {
    const mockTransactionRepo = createMockRepository<Transaction>();
    const mockMachineRepo = createMockRepository<Machine>();

    const mockEventEmitter = {
      emit: jest.fn(),
    };

    const mockInventoryService = {
      deductFromMachine: jest.fn().mockResolvedValue(undefined),
      getMachineStock: jest.fn(),
    };

    const mockRecipesService = {
      findOne: jest.fn(),
      findActiveRecipe: jest.fn(),
    };

    const mockIncidentsService = {
      create: jest.fn().mockResolvedValue({}),
    };

    const mockAuditLogService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        {
          provide: getRepositoryToken(Transaction),
          useValue: mockTransactionRepo,
        },
        {
          provide: getRepositoryToken(Machine),
          useValue: mockMachineRepo,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
        {
          provide: InventoryService,
          useValue: mockInventoryService,
        },
        {
          provide: RecipesService,
          useValue: mockRecipesService,
        },
        {
          provide: IncidentsService,
          useValue: mockIncidentsService,
        },
        {
          provide: AuditLogService,
          useValue: mockAuditLogService,
        },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
    transactionRepository = module.get(getRepositoryToken(Transaction));
    machineRepository = module.get(getRepositoryToken(Machine));
    eventEmitter = module.get(EventEmitter2);
    inventoryService = module.get(InventoryService);
    recipesService = module.get(RecipesService);
    incidentsService = module.get(IncidentsService);
    auditLogService = module.get(AuditLogService);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================================================
  // CREATE TRANSACTION TESTS
  // ============================================================================

  describe('create', () => {
    const createDto = {
      transaction_type: TransactionType.SALE,
      amount: 5000,
      payment_method: PaymentMethod.CASH,
      machine_id: 'machine-uuid',
    };

    it('should create transaction with generated transaction number', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      };

      transactionRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);
      machineRepository.findOne.mockResolvedValue(mockMachine as Machine);
      transactionRepository.create.mockReturnValue({
        ...createDto,
        transaction_number: 'TXN-20251126-0001',
      } as Transaction);
      transactionRepository.save.mockResolvedValue(mockTransaction as Transaction);

      const result = await service.create(createDto);

      expect(result).toEqual(mockTransaction);
      expect(transactionRepository.create).toHaveBeenCalled();
      expect(transactionRepository.save).toHaveBeenCalled();
    });

    it('should auto-link contract when machine has one', async () => {
      const machineWithContract = { ...mockMachine, contract_id: 'contract-uuid' };
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      };

      transactionRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);
      machineRepository.findOne.mockResolvedValue(machineWithContract as Machine);
      transactionRepository.create.mockReturnValue({
        ...createDto,
        contract_id: 'contract-uuid',
      } as Transaction);
      transactionRepository.save.mockResolvedValue({
        ...mockTransaction,
        contract_id: 'contract-uuid',
      } as Transaction);

      const result = await service.create(createDto);

      expect(transactionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ contract_id: 'contract-uuid' }),
      );
      expect(result.contract_id).toBe('contract-uuid');
    });

    it('should emit transaction.created event', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      };

      transactionRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);
      transactionRepository.create.mockReturnValue(createDto as Transaction);
      transactionRepository.save.mockResolvedValue(mockTransaction as Transaction);

      await service.create(createDto);

      expect(eventEmitter.emit).toHaveBeenCalledWith('transaction.created', {
        transaction: mockTransaction,
        date: expect.any(Date),
      });
    });

    it('should create transaction without machine_id', async () => {
      const dtoWithoutMachine = {
        transaction_type: TransactionType.EXPENSE,
        amount: 10000,
        expense_category: ExpenseCategory.REPAIR,
      };

      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      };

      transactionRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);
      transactionRepository.create.mockReturnValue(dtoWithoutMachine as Transaction);
      transactionRepository.save.mockResolvedValue({
        ...mockTransaction,
        ...dtoWithoutMachine,
        machine_id: null,
      } as Transaction);

      const result = await service.create(dtoWithoutMachine);

      expect(machineRepository.findOne).not.toHaveBeenCalled();
      expect(result.transaction_type).toBe(TransactionType.EXPENSE);
    });

    it('should use provided transaction_date if specified', async () => {
      const customDate = '2025-11-20T10:00:00Z';
      const dtoWithDate = {
        ...createDto,
        transaction_date: customDate,
      };

      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      };

      transactionRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);
      machineRepository.findOne.mockResolvedValue(mockMachine as Machine);
      transactionRepository.create.mockReturnValue(dtoWithDate as any);
      transactionRepository.save.mockResolvedValue({
        ...mockTransaction,
        transaction_date: new Date(customDate),
      } as Transaction);

      const _result = await service.create(dtoWithDate);

      expect(transactionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          transaction_date: new Date(customDate),
        }),
      );
    });

    it('should generate unique transaction numbers based on daily count', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(5), // 5 transactions already today
      };

      transactionRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);
      machineRepository.findOne.mockResolvedValue(mockMachine as Machine);
      transactionRepository.create.mockImplementation((data) => data as Transaction);
      transactionRepository.save.mockResolvedValue(mockTransaction as Transaction);

      await service.create(createDto);

      // Transaction number should be based on count + 1 = 0006
      expect(transactionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          transaction_number: expect.stringMatching(/TXN-\d{8}-0006/),
        }),
      );
    });
  });

  // ============================================================================
  // FIND ALL TESTS
  // ============================================================================

  describe('findAll', () => {
    it('should return all transactions without filters', async () => {
      const mockTransactions = [mockTransaction, { ...mockTransaction, id: 'txn-2' }];

      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockTransactions),
      };

      transactionRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      const result = await service.findAll();

      expect(result).toEqual(mockTransactions);
      expect(queryBuilder.getMany).toHaveBeenCalled();
      expect(queryBuilder.orderBy).toHaveBeenCalledWith('transaction.transaction_date', 'DESC');
    });

    it('should filter by transaction type', async () => {
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      transactionRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      await service.findAll(TransactionType.SALE);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'transaction.transaction_type = :transactionType',
        { transactionType: TransactionType.SALE },
      );
    });

    it('should filter by machine ID', async () => {
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      transactionRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      await service.findAll(undefined, 'machine-uuid');

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('transaction.machine_id = :machineId', {
        machineId: 'machine-uuid',
      });
    });

    it('should filter by user ID', async () => {
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      transactionRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      await service.findAll(undefined, undefined, 'user-uuid');

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('transaction.user_id = :userId', {
        userId: 'user-uuid',
      });
    });

    it('should filter by date range', async () => {
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      transactionRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      await service.findAll(undefined, undefined, undefined, '2025-11-01', '2025-11-30');

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'transaction.transaction_date BETWEEN :dateFrom AND :dateTo',
        { dateFrom: '2025-11-01', dateTo: '2025-11-30' },
      );
    });

    it('should apply multiple filters together', async () => {
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      transactionRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      await service.findAll(
        TransactionType.SALE,
        'machine-uuid',
        'user-uuid',
        '2025-11-01',
        '2025-11-30',
      );

      expect(queryBuilder.andWhere).toHaveBeenCalledTimes(4);
    });

    it('should not apply date filter if only dateFrom is provided', async () => {
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      transactionRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      await service.findAll(undefined, undefined, undefined, '2025-11-01', undefined);

      expect(queryBuilder.andWhere).not.toHaveBeenCalledWith(
        'transaction.transaction_date BETWEEN :dateFrom AND :dateTo',
        expect.anything(),
      );
    });
  });

  // ============================================================================
  // FIND ONE TESTS
  // ============================================================================

  describe('findOne', () => {
    it('should return transaction by ID with relations', async () => {
      transactionRepository.findOne.mockResolvedValue(mockTransaction as Transaction);

      const result = await service.findOne('txn-uuid');

      expect(result).toEqual(mockTransaction);
      expect(transactionRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'txn-uuid' },
        relations: ['machine', 'user'],
      });
    });

    it('should throw NotFoundException when transaction not found', async () => {
      transactionRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('non-existent')).rejects.toThrow(
        /Транзакция с ID non-existent не найдена/,
      );
    });
  });

  // ============================================================================
  // REMOVE TESTS
  // ============================================================================

  describe('remove', () => {
    it('should soft delete transaction and log to audit', async () => {
      transactionRepository.findOne.mockResolvedValue(mockTransaction as Transaction);
      transactionRepository.softRemove.mockResolvedValue(mockTransaction as Transaction);

      await service.remove('txn-uuid', 'user-uuid');

      expect(auditLogService.log).toHaveBeenCalledWith({
        event_type: AuditEventType.TRANSACTION_DELETED,
        user_id: 'user-uuid',
        severity: AuditSeverity.WARNING,
        description: expect.stringContaining('deleted'),
        metadata: expect.objectContaining({
          transaction_id: 'txn-uuid',
          transaction_number: 'TXN-20251126-0001',
          transaction_type: TransactionType.SALE,
        }),
      });
      expect(transactionRepository.softRemove).toHaveBeenCalledWith(mockTransaction);
    });

    it('should throw NotFoundException when deleting non-existent transaction', async () => {
      transactionRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should work without userId (system deletion)', async () => {
      transactionRepository.findOne.mockResolvedValue(mockTransaction as Transaction);
      transactionRepository.softRemove.mockResolvedValue(mockTransaction as Transaction);

      await service.remove('txn-uuid');

      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: undefined,
        }),
      );
    });
  });

  // ============================================================================
  // RECORD SALE TESTS
  // ============================================================================

  describe('recordSale', () => {
    const saleDto = {
      amount: 5000,
      payment_method: PaymentMethod.CARD,
      machine_id: 'machine-uuid',
      recipe_id: 'recipe-uuid',
      quantity: 2,
    };

    beforeEach(() => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      };
      transactionRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);
      transactionRepository.create.mockImplementation((data) => data as Transaction);
      transactionRepository.save.mockResolvedValue({
        ...mockTransaction,
        id: 'new-txn-uuid',
      } as Transaction);
    });

    it('should create SALE transaction', async () => {
      recipesService.findOne.mockResolvedValue(mockRecipe as any);

      const result = await service.recordSale(saleDto);

      expect(result.transaction_type).toBe(TransactionType.SALE);
      expect(transactionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          transaction_type: TransactionType.SALE,
          amount: 5000,
          payment_method: PaymentMethod.CARD,
          recipe_id: 'recipe-uuid',
          quantity: 2,
        }),
      );
    });

    it('should deduct inventory from machine when recipe has ingredients', async () => {
      recipesService.findOne.mockResolvedValue(mockRecipe as any);

      await service.recordSale(saleDto);

      // Should deduct each ingredient
      expect(inventoryService.deductFromMachine).toHaveBeenCalledTimes(2);
      expect(inventoryService.deductFromMachine).toHaveBeenCalledWith(
        'machine-uuid',
        'ing-1',
        20, // 10 * 2 quantity
        expect.stringContaining('Americano x2'),
      );
      expect(inventoryService.deductFromMachine).toHaveBeenCalledWith(
        'machine-uuid',
        'ing-2',
        400, // 200 * 2 quantity
        expect.stringContaining('Americano x2'),
      );
    });

    it('should create incident when inventory deduction fails', async () => {
      recipesService.findOne.mockResolvedValue(mockRecipe as any);
      inventoryService.deductFromMachine.mockRejectedValue(new Error('Insufficient stock'));

      await service.recordSale(saleDto);

      expect(incidentsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('Несоответствие инвентаря'),
          machine_id: 'machine-uuid',
        }),
      );
    });

    it('should skip inventory deduction when recipe has no ingredients', async () => {
      recipesService.findOne.mockResolvedValue({
        ...mockRecipe,
        ingredients: [],
      } as any);

      await service.recordSale(saleDto);

      expect(inventoryService.deductFromMachine).not.toHaveBeenCalled();
    });

    it('should skip inventory deduction when no recipe_id provided', async () => {
      const saleDtoWithoutRecipe = {
        amount: 5000,
        payment_method: PaymentMethod.CASH,
        machine_id: 'machine-uuid',
      };

      await service.recordSale(saleDtoWithoutRecipe);

      expect(recipesService.findOne).not.toHaveBeenCalled();
      expect(inventoryService.deductFromMachine).not.toHaveBeenCalled();
    });

    it('should use default quantity of 1 when not specified', async () => {
      const saleDtoWithoutQuantity = {
        amount: 5000,
        payment_method: PaymentMethod.CASH,
        machine_id: 'machine-uuid',
        recipe_id: 'recipe-uuid',
      };
      recipesService.findOne.mockResolvedValue(mockRecipe as any);

      await service.recordSale(saleDtoWithoutQuantity);

      // Should deduct with quantity 1
      expect(inventoryService.deductFromMachine).toHaveBeenCalledWith(
        'machine-uuid',
        'ing-1',
        10, // 10 * 1 quantity
        expect.stringContaining('x1'),
      );
    });

    it('should not fail transaction even if recipe fetch fails', async () => {
      recipesService.findOne.mockRejectedValue(new Error('Recipe not found'));

      const result = await service.recordSale(saleDto);

      // Transaction should still be created
      expect(result).toBeDefined();
      expect(inventoryService.deductFromMachine).not.toHaveBeenCalled();
    });

    it('should handle recipe with null ingredients array', async () => {
      recipesService.findOne.mockResolvedValue({
        ...mockRecipe,
        ingredients: null,
      } as any);

      await service.recordSale(saleDto);

      expect(inventoryService.deductFromMachine).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // RECORD COLLECTION TESTS
  // ============================================================================

  describe('recordCollection', () => {
    const collectionDto = {
      amount: 50000,
      machine_id: 'machine-uuid',
      user_id: 'user-uuid',
      collection_task_id: 'task-uuid',
      description: 'Collection from machine M-001',
    };

    beforeEach(() => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      };
      transactionRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);
      transactionRepository.create.mockImplementation((data) => data as Transaction);
      transactionRepository.save.mockResolvedValue({
        ...mockTransaction,
        transaction_type: TransactionType.COLLECTION,
      } as Transaction);
    });

    it('should create COLLECTION transaction with CASH payment method', async () => {
      const result = await service.recordCollection(collectionDto);

      expect(result.transaction_type).toBe(TransactionType.COLLECTION);
      expect(transactionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          transaction_type: TransactionType.COLLECTION,
          payment_method: PaymentMethod.CASH,
          amount: 50000,
          collection_task_id: 'task-uuid',
        }),
      );
    });

    it('should use default description if not provided', async () => {
      const dtoWithoutDescription = {
        amount: 50000,
        machine_id: 'machine-uuid',
        user_id: 'user-uuid',
      };

      await service.recordCollection(dtoWithoutDescription);

      expect(transactionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Инкассация',
        }),
      );
    });

    it('should include collection_task_id when provided', async () => {
      await service.recordCollection(collectionDto);

      expect(transactionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          collection_task_id: 'task-uuid',
        }),
      );
    });
  });

  // ============================================================================
  // RECORD EXPENSE TESTS
  // ============================================================================

  describe('recordExpense', () => {
    const expenseDto = {
      amount: 10000,
      user_id: 'user-uuid',
      expense_category: ExpenseCategory.REPAIR,
      description: 'Machine repair',
      payment_method: PaymentMethod.CASH,
    };

    beforeEach(() => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      };
      transactionRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);
      transactionRepository.create.mockImplementation((data) => data as Transaction);
      transactionRepository.save.mockResolvedValue({
        ...mockTransaction,
        transaction_type: TransactionType.EXPENSE,
      } as Transaction);
    });

    it('should create EXPENSE transaction', async () => {
      const result = await service.recordExpense(expenseDto);

      expect(result.transaction_type).toBe(TransactionType.EXPENSE);
      expect(transactionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          transaction_type: TransactionType.EXPENSE,
          expense_category: ExpenseCategory.REPAIR,
          description: 'Machine repair',
        }),
      );
    });

    it('should use default CASH payment method when not specified', async () => {
      const dtoWithoutPaymentMethod = {
        amount: 10000,
        user_id: 'user-uuid',
        expense_category: ExpenseCategory.PURCHASE,
        description: 'Purchase supplies',
      };

      await service.recordExpense(dtoWithoutPaymentMethod);

      expect(transactionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_method: PaymentMethod.CASH,
        }),
      );
    });

    it('should handle all expense categories', async () => {
      const categories = [
        ExpenseCategory.RENT,
        ExpenseCategory.PURCHASE,
        ExpenseCategory.REPAIR,
        ExpenseCategory.SALARY,
        ExpenseCategory.UTILITIES,
        ExpenseCategory.DEPRECIATION,
        ExpenseCategory.WRITEOFF,
        ExpenseCategory.OTHER,
      ];

      for (const category of categories) {
        const dto = {
          amount: 10000,
          user_id: 'user-uuid',
          expense_category: category,
          description: `Expense - ${category}`,
        };

        await service.recordExpense(dto);

        expect(transactionRepository.create).toHaveBeenLastCalledWith(
          expect.objectContaining({
            expense_category: category,
          }),
        );
      }
    });

    it('should include metadata when provided', async () => {
      const dtoWithMetadata = {
        ...expenseDto,
        metadata: { invoice_number: 'INV-001', supplier: 'Test Supplier' },
      };

      await service.recordExpense(dtoWithMetadata);

      expect(transactionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: { invoice_number: 'INV-001', supplier: 'Test Supplier' },
        }),
      );
    });
  });

  // ============================================================================
  // GET STATS TESTS
  // ============================================================================

  describe('getStats', () => {
    const createStatsQueryBuilderMocks = () => {
      const countQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(150),
      };

      const byTypeQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { type: TransactionType.SALE, count: '100', total_amount: '500000' },
          { type: TransactionType.EXPENSE, count: '30', total_amount: '100000' },
          { type: TransactionType.COLLECTION, count: '20', total_amount: '450000' },
        ]),
      };

      const byPaymentMethodQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { method: PaymentMethod.CASH, count: '60', total_amount: '300000' },
          { method: PaymentMethod.CARD, count: '40', total_amount: '200000' },
        ]),
      };

      const byExpenseCategoryQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { category: ExpenseCategory.REPAIR, count: '20', total_amount: '60000' },
          { category: ExpenseCategory.PURCHASE, count: '10', total_amount: '40000' },
        ]),
      };

      const revenueQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '500000' }),
      };

      const expensesQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '100000' }),
      };

      const collectionsQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '450000' }),
      };

      return [
        countQueryBuilder,
        byTypeQueryBuilder,
        byPaymentMethodQueryBuilder,
        byExpenseCategoryQueryBuilder,
        revenueQueryBuilder,
        expensesQueryBuilder,
        collectionsQueryBuilder,
      ];
    };

    it('should return comprehensive transaction statistics', async () => {
      const queryBuilders = createStatsQueryBuilderMocks();
      transactionRepository.createQueryBuilder
        .mockReturnValueOnce(queryBuilders[0] as any)
        .mockReturnValueOnce(queryBuilders[1] as any)
        .mockReturnValueOnce(queryBuilders[2] as any)
        .mockReturnValueOnce(queryBuilders[3] as any)
        .mockReturnValueOnce(queryBuilders[4] as any)
        .mockReturnValueOnce(queryBuilders[5] as any)
        .mockReturnValueOnce(queryBuilders[6] as any);

      const result = await service.getStats();

      expect(result.total).toBe(150);
      expect(result.total_revenue).toBe(500000);
      expect(result.total_expenses).toBe(100000);
      expect(result.total_collections).toBe(450000);
      expect(result.net_profit).toBe(400000); // 500000 - 100000
      expect(result.by_type).toHaveLength(3);
      expect(result.by_payment_method).toHaveLength(2);
      expect(result.by_expense_category).toHaveLength(2);
    });

    it('should filter by date range when provided', async () => {
      const queryBuilders = createStatsQueryBuilderMocks();
      transactionRepository.createQueryBuilder
        .mockReturnValueOnce(queryBuilders[0] as any)
        .mockReturnValueOnce(queryBuilders[1] as any)
        .mockReturnValueOnce(queryBuilders[2] as any)
        .mockReturnValueOnce(queryBuilders[3] as any)
        .mockReturnValueOnce(queryBuilders[4] as any)
        .mockReturnValueOnce(queryBuilders[5] as any)
        .mockReturnValueOnce(queryBuilders[6] as any);

      const dateFrom = new Date('2025-11-01');
      const dateTo = new Date('2025-11-30');

      await service.getStats(dateFrom, dateTo);

      expect((queryBuilders[0] as any).where).toHaveBeenCalledWith(
        'transaction.transaction_date BETWEEN :dateFrom AND :dateTo',
        { dateFrom, dateTo },
      );
    });

    it('should handle null/zero values gracefully', async () => {
      const nullStatsBuilders = [
        { where: jest.fn().mockReturnThis(), getCount: jest.fn().mockResolvedValue(0) },
        {
          select: jest.fn().mockReturnThis(),
          addSelect: jest.fn().mockReturnThis(),
          groupBy: jest.fn().mockReturnThis(),
          getRawMany: jest.fn().mockResolvedValue([]),
        },
        {
          select: jest.fn().mockReturnThis(),
          addSelect: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          groupBy: jest.fn().mockReturnThis(),
          getRawMany: jest.fn().mockResolvedValue([]),
        },
        {
          select: jest.fn().mockReturnThis(),
          addSelect: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          groupBy: jest.fn().mockReturnThis(),
          getRawMany: jest.fn().mockResolvedValue([]),
        },
        {
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getRawOne: jest.fn().mockResolvedValue({ total: null }),
        },
        {
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getRawOne: jest.fn().mockResolvedValue({ total: null }),
        },
        {
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getRawOne: jest.fn().mockResolvedValue({ total: null }),
        },
      ];

      transactionRepository.createQueryBuilder
        .mockReturnValueOnce(nullStatsBuilders[0] as any)
        .mockReturnValueOnce(nullStatsBuilders[1] as any)
        .mockReturnValueOnce(nullStatsBuilders[2] as any)
        .mockReturnValueOnce(nullStatsBuilders[3] as any)
        .mockReturnValueOnce(nullStatsBuilders[4] as any)
        .mockReturnValueOnce(nullStatsBuilders[5] as any)
        .mockReturnValueOnce(nullStatsBuilders[6] as any);

      const result = await service.getStats();

      expect(result.total).toBe(0);
      expect(result.total_revenue).toBe(0);
      expect(result.total_expenses).toBe(0);
      expect(result.total_collections).toBe(0);
      expect(result.net_profit).toBe(0);
    });
  });

  // ============================================================================
  // GET MACHINE STATS TESTS
  // ============================================================================

  describe('getMachineStats', () => {
    it('should return statistics for specific machine', async () => {
      const machineQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
      };

      const salesQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ count: '50', total: '250000' }),
      };

      const collectionsQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '200000' }),
      };

      transactionRepository.createQueryBuilder
        .mockReturnValueOnce(machineQueryBuilder as any)
        .mockReturnValueOnce(salesQueryBuilder as any)
        .mockReturnValueOnce(collectionsQueryBuilder as any);

      const result = await service.getMachineStats('machine-uuid');

      expect(result.sales_count).toBe(50);
      expect(result.total_revenue).toBe(250000);
      expect(result.total_collections).toBe(200000);
    });

    it('should filter by date range when provided', async () => {
      const machineQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
      };

      const salesQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ count: '30', total: '150000' }),
      };

      const collectionsQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '120000' }),
      };

      transactionRepository.createQueryBuilder
        .mockReturnValueOnce(machineQueryBuilder as any)
        .mockReturnValueOnce(salesQueryBuilder as any)
        .mockReturnValueOnce(collectionsQueryBuilder as any);

      const dateFrom = new Date('2025-11-01');
      const dateTo = new Date('2025-11-30');

      const _result = await service.getMachineStats('machine-uuid', dateFrom, dateTo);

      expect(machineQueryBuilder.andWhere).toHaveBeenCalledWith(
        'transaction.transaction_date BETWEEN :dateFrom AND :dateTo',
        { dateFrom, dateTo },
      );
    });

    it('should handle machine with no transactions', async () => {
      const machineQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
      };

      const salesQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ count: null, total: null }),
      };

      const collectionsQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: null }),
      };

      transactionRepository.createQueryBuilder
        .mockReturnValueOnce(machineQueryBuilder as any)
        .mockReturnValueOnce(salesQueryBuilder as any)
        .mockReturnValueOnce(collectionsQueryBuilder as any);

      const result = await service.getMachineStats('machine-uuid');

      expect(result.sales_count).toBe(0);
      expect(result.total_revenue).toBe(0);
      expect(result.total_collections).toBe(0);
    });
  });

  // ============================================================================
  // GET DAILY REVENUE TESTS
  // ============================================================================

  describe('getDailyRevenue', () => {
    it('should return daily revenue for date range', async () => {
      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { date: '2025-11-24', total: '50000' },
          { date: '2025-11-25', total: '75000' },
          { date: '2025-11-26', total: '60000' },
        ]),
      };

      transactionRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      const result = await service.getDailyRevenue(new Date('2025-11-24'), new Date('2025-11-26'));

      expect(result).toHaveLength(3);
      expect(result[0].date).toBe('2025-11-24');
      expect(result[0].total).toBe(50000);
      expect(result[1].total).toBe(75000);
      expect(result[2].total).toBe(60000);
    });

    it('should filter only SALE transactions', async () => {
      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };

      transactionRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      await service.getDailyRevenue(new Date('2025-11-24'), new Date('2025-11-26'));

      expect(queryBuilder.where).toHaveBeenCalledWith('transaction.transaction_type = :type', {
        type: TransactionType.SALE,
      });
    });

    it('should handle days with no revenue', async () => {
      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { date: '2025-11-24', total: '50000' },
          // 2025-11-25 missing - no sales
          { date: '2025-11-26', total: '60000' },
        ]),
      };

      transactionRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      const result = await service.getDailyRevenue(new Date('2025-11-24'), new Date('2025-11-26'));

      expect(result).toHaveLength(2);
    });

    it('should parse null totals as 0', async () => {
      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([{ date: '2025-11-24', total: null }]),
      };

      transactionRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      const result = await service.getDailyRevenue(new Date('2025-11-24'), new Date('2025-11-24'));

      expect(result[0].total).toBe(0);
    });
  });

  // ============================================================================
  // GET TOP RECIPES TESTS
  // ============================================================================

  describe('getTopRecipes', () => {
    it('should return top selling recipes', async () => {
      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { recipe_id: 'recipe-1', sales_count: '100', total_revenue: '500000' },
          { recipe_id: 'recipe-2', sales_count: '80', total_revenue: '400000' },
          { recipe_id: 'recipe-3', sales_count: '60', total_revenue: '300000' },
        ]),
      };

      transactionRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      const result = await service.getTopRecipes(10);

      expect(result).toHaveLength(3);
      expect(result[0].recipe_id).toBe('recipe-1');
      expect(result[0].sales_count).toBe(100);
      expect(result[0].total_revenue).toBe(500000);
    });

    it('should use default limit of 10', async () => {
      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };

      transactionRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      await service.getTopRecipes();

      expect(queryBuilder.limit).toHaveBeenCalledWith(10);
    });

    it('should filter only transactions with recipe_id', async () => {
      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };

      transactionRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      await service.getTopRecipes();

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('transaction.recipe_id IS NOT NULL');
    });

    it('should order by sales count descending', async () => {
      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };

      transactionRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      await service.getTopRecipes();

      expect(queryBuilder.orderBy).toHaveBeenCalledWith('COUNT(*)', 'DESC');
    });

    it('should handle custom limit', async () => {
      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };

      transactionRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      await service.getTopRecipes(5);

      expect(queryBuilder.limit).toHaveBeenCalledWith(5);
    });
  });

  // ============================================================================
  // TRANSACTION TYPE ENUM TESTS
  // ============================================================================

  describe('TransactionType enum handling', () => {
    beforeEach(() => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      };
      transactionRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);
      transactionRepository.create.mockImplementation((data) => data as Transaction);
      transactionRepository.save.mockResolvedValue(mockTransaction as Transaction);
    });

    it('should handle SALE transaction type', async () => {
      await service.create({
        transaction_type: TransactionType.SALE,
        amount: 5000,
      });

      expect(transactionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ transaction_type: TransactionType.SALE }),
      );
    });

    it('should handle COLLECTION transaction type', async () => {
      await service.create({
        transaction_type: TransactionType.COLLECTION,
        amount: 50000,
      });

      expect(transactionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ transaction_type: TransactionType.COLLECTION }),
      );
    });

    it('should handle EXPENSE transaction type', async () => {
      await service.create({
        transaction_type: TransactionType.EXPENSE,
        amount: 10000,
      });

      expect(transactionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ transaction_type: TransactionType.EXPENSE }),
      );
    });

    it('should handle REFUND transaction type', async () => {
      await service.create({
        transaction_type: TransactionType.REFUND,
        amount: 5000,
      });

      expect(transactionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ transaction_type: TransactionType.REFUND }),
      );
    });
  });

  // ============================================================================
  // PAYMENT METHOD ENUM TESTS
  // ============================================================================

  describe('PaymentMethod enum handling', () => {
    beforeEach(() => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      };
      transactionRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);
      transactionRepository.create.mockImplementation((data) => data as Transaction);
      transactionRepository.save.mockResolvedValue(mockTransaction as Transaction);
    });

    it('should handle CASH payment method', async () => {
      await service.create({
        transaction_type: TransactionType.SALE,
        amount: 5000,
        payment_method: PaymentMethod.CASH,
      });

      expect(transactionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ payment_method: PaymentMethod.CASH }),
      );
    });

    it('should handle CARD payment method', async () => {
      await service.create({
        transaction_type: TransactionType.SALE,
        amount: 5000,
        payment_method: PaymentMethod.CARD,
      });

      expect(transactionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ payment_method: PaymentMethod.CARD }),
      );
    });

    it('should handle MOBILE payment method', async () => {
      await service.create({
        transaction_type: TransactionType.SALE,
        amount: 5000,
        payment_method: PaymentMethod.MOBILE,
      });

      expect(transactionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ payment_method: PaymentMethod.MOBILE }),
      );
    });

    it('should handle QR payment method', async () => {
      await service.create({
        transaction_type: TransactionType.SALE,
        amount: 5000,
        payment_method: PaymentMethod.QR,
      });

      expect(transactionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ payment_method: PaymentMethod.QR }),
      );
    });
  });

  // ============================================================================
  // EXPENSE CATEGORY ENUM TESTS
  // ============================================================================

  describe('ExpenseCategory enum handling', () => {
    beforeEach(() => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      };
      transactionRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);
      transactionRepository.create.mockImplementation((data) => data as Transaction);
      transactionRepository.save.mockResolvedValue({
        ...mockTransaction,
        transaction_type: TransactionType.EXPENSE,
      } as Transaction);
    });

    const expenseCategories = [
      { category: ExpenseCategory.RENT, description: 'Location rent' },
      { category: ExpenseCategory.PURCHASE, description: 'Goods purchase' },
      { category: ExpenseCategory.REPAIR, description: 'Machine repair' },
      { category: ExpenseCategory.SALARY, description: 'Staff salary' },
      { category: ExpenseCategory.UTILITIES, description: 'Utility bills' },
      { category: ExpenseCategory.DEPRECIATION, description: 'Equipment depreciation' },
      { category: ExpenseCategory.WRITEOFF, description: 'Product writeoff' },
      { category: ExpenseCategory.OTHER, description: 'Other expenses' },
    ];

    expenseCategories.forEach(({ category, description }) => {
      it(`should handle ${category} expense category`, async () => {
        await service.recordExpense({
          amount: 10000,
          user_id: 'user-uuid',
          expense_category: category,
          description,
        });

        expect(transactionRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({ expense_category: category }),
        );
      });
    });
  });
});
