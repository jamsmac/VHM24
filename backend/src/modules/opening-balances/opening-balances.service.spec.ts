import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { OpeningBalancesService } from './opening-balances.service';
import { StockOpeningBalance } from './entities/opening-balance.entity';
import { WarehouseInventory } from '@/modules/inventory/entities/warehouse-inventory.entity';
import { CreateOpeningBalanceDto } from './dto/create-opening-balance.dto';
import { UpdateOpeningBalanceDto } from './dto/update-opening-balance.dto';

describe('OpeningBalancesService', () => {
  let service: OpeningBalancesService;
  let balanceRepository: jest.Mocked<Repository<StockOpeningBalance>>;
  let warehouseInventoryRepository: jest.Mocked<Repository<WarehouseInventory>>;

  // Mock data
  const mockBalance: StockOpeningBalance = {
    id: 'balance-123',
    nomenclature_id: 'nomenclature-123',
    warehouse_id: 'warehouse-123',
    balance_date: new Date('2024-01-01'),
    quantity: 100,
    unit: 'pcs',
    unit_cost: 5000,
    total_cost: 500000,
    batch_number: 'BATCH-001',
    expiry_date: new Date('2025-12-31'),
    location: 'Shelf A-1',
    is_applied: false,
    applied_at: null,
    applied_by_id: null,
    import_source: 'manual',
    import_session_id: null,
    notes: 'Test balance',
    nomenclature: {} as any,
    warehouse: {} as any,
    applied_by: undefined,
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
  } as StockOpeningBalance;

  const mockAppliedBalance: StockOpeningBalance = {
    ...mockBalance,
    id: 'applied-balance-123',
    is_applied: true,
    applied_at: new Date(),
    applied_by_id: 'user-123',
  };

  const mockWarehouseInventory: WarehouseInventory = {
    id: 'inventory-123',
    nomenclature_id: 'nomenclature-123',
    current_quantity: 50,
    reserved_quantity: 0,
    min_stock_level: 10,
    max_stock_level: 200,
    last_restocked_at: new Date(),
    location_in_warehouse: 'Shelf A-1',
    nomenclature: {} as any,
    available_quantity: 50,
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
  } as WarehouseInventory;

  // Mock QueryBuilder
  const createMockQueryBuilder = () => {
    const mockQueryBuilder: Partial<SelectQueryBuilder<StockOpeningBalance>> = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([mockBalance]),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({
        total_items: '10',
        total_value: '500000',
        applied_count: '5',
        pending_count: '5',
      }),
      getRawMany: jest.fn().mockResolvedValue([
        {
          warehouse_id: 'warehouse-123',
          warehouse_name: 'Main Warehouse',
          item_count: '10',
          total_value: '500000',
        },
      ]),
    };
    return mockQueryBuilder as SelectQueryBuilder<StockOpeningBalance>;
  };

  beforeEach(async () => {
    const mockBalanceRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(createMockQueryBuilder()),
    };

    const mockWarehouseInventoryRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpeningBalancesService,
        {
          provide: getRepositoryToken(StockOpeningBalance),
          useValue: mockBalanceRepository,
        },
        {
          provide: getRepositoryToken(WarehouseInventory),
          useValue: mockWarehouseInventoryRepository,
        },
      ],
    }).compile();

    service = module.get<OpeningBalancesService>(OpeningBalancesService);
    balanceRepository = module.get(getRepositoryToken(StockOpeningBalance));
    warehouseInventoryRepository = module.get(getRepositoryToken(WarehouseInventory));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // CREATE TESTS (REQ-STK-01)
  // ============================================================================

  describe('create', () => {
    const createDto: CreateOpeningBalanceDto = {
      nomenclature_id: 'nomenclature-123',
      warehouse_id: 'warehouse-123',
      balance_date: '2024-01-01',
      quantity: 100,
      unit: 'pcs',
      unit_cost: 5000,
      batch_number: 'BATCH-001',
      expiry_date: '2025-12-31',
      location: 'Shelf A-1',
      notes: 'Test balance',
    };

    it('should create a new opening balance with calculated total cost', async () => {
      // Arrange
      const expectedTotalCost = createDto.quantity * createDto.unit_cost; // 500000
      const createdBalance = {
        ...mockBalance,
        ...createDto,
        total_cost: expectedTotalCost,
        import_source: 'manual',
      };

      balanceRepository.findOne.mockResolvedValue(null);
      balanceRepository.create.mockReturnValue(createdBalance as any);
      balanceRepository.save.mockResolvedValue(createdBalance as any);

      // Act
      const result = await service.create(createDto);

      // Assert
      expect(result).toEqual(createdBalance);
      expect(result.total_cost).toBe(expectedTotalCost);
      expect(balanceRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...createDto,
          total_cost: expectedTotalCost,
          import_source: 'manual',
        }),
      );
      expect(balanceRepository.save).toHaveBeenCalled();
    });

    it('should create balance without warehouse_id', async () => {
      // Arrange
      const dtoWithoutWarehouse: CreateOpeningBalanceDto = {
        nomenclature_id: 'nomenclature-123',
        balance_date: '2024-01-01',
        quantity: 50,
        unit_cost: 1000,
      };

      balanceRepository.findOne.mockResolvedValue(null);
      balanceRepository.create.mockReturnValue({
        ...mockBalance,
        ...dtoWithoutWarehouse,
        warehouse_id: undefined,
        total_cost: 50000,
      } as any);
      balanceRepository.save.mockResolvedValue({
        ...mockBalance,
        ...dtoWithoutWarehouse,
        warehouse_id: null,
        total_cost: 50000,
      } as any);

      // Act
      const result = await service.create(dtoWithoutWarehouse);

      // Assert
      expect(result).toBeDefined();
      expect(balanceRepository.findOne).toHaveBeenCalledWith({
        where: {
          nomenclature_id: dtoWithoutWarehouse.nomenclature_id,
          balance_date: dtoWithoutWarehouse.balance_date,
        },
      });
    });

    it('should throw BadRequestException if balance already exists for nomenclature/warehouse/date', async () => {
      // Arrange
      balanceRepository.findOne.mockResolvedValue(mockBalance as any);

      // Act & Assert
      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(createDto)).rejects.toThrow(
        'Opening balance already exists for this nomenclature, warehouse and date',
      );
    });

    it('should check for existing balance with warehouse_id in where condition', async () => {
      // Arrange
      balanceRepository.findOne.mockResolvedValue(null);
      balanceRepository.create.mockReturnValue(mockBalance as any);
      balanceRepository.save.mockResolvedValue(mockBalance as any);

      // Act
      await service.create(createDto);

      // Assert
      expect(balanceRepository.findOne).toHaveBeenCalledWith({
        where: {
          nomenclature_id: createDto.nomenclature_id,
          balance_date: createDto.balance_date,
          warehouse_id: createDto.warehouse_id,
        },
      });
    });

    it('should calculate total_cost correctly for decimal quantities', async () => {
      // Arrange
      const decimalDto: CreateOpeningBalanceDto = {
        nomenclature_id: 'nomenclature-123',
        balance_date: '2024-01-01',
        quantity: 10.5,
        unit_cost: 2000,
      };
      const expectedTotal = 10.5 * 2000; // 21000

      balanceRepository.findOne.mockResolvedValue(null);
      balanceRepository.create.mockImplementation((data) => data as any);
      balanceRepository.save.mockImplementation((data) => Promise.resolve(data as any));

      // Act
      await service.create(decimalDto);

      // Assert
      expect(balanceRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          total_cost: expectedTotal,
        }),
      );
    });
  });

  // ============================================================================
  // FIND ALL TESTS
  // ============================================================================

  describe('findAll', () => {
    it('should return all opening balances with relations', async () => {
      // Arrange
      const mockQb = createMockQueryBuilder();
      balanceRepository.createQueryBuilder.mockReturnValue(mockQb);

      // Act
      const result = await service.findAll({});

      // Assert
      expect(result).toEqual([mockBalance]);
      expect(balanceRepository.createQueryBuilder).toHaveBeenCalledWith('balance');
      expect(mockQb.leftJoinAndSelect).toHaveBeenCalledWith('balance.nomenclature', 'nomenclature');
      expect(mockQb.leftJoinAndSelect).toHaveBeenCalledWith('balance.warehouse', 'warehouse');
      expect(mockQb.leftJoinAndSelect).toHaveBeenCalledWith('balance.applied_by', 'user');
      expect(mockQb.orderBy).toHaveBeenCalledWith('balance.balance_date', 'DESC');
      expect(mockQb.addOrderBy).toHaveBeenCalledWith('nomenclature.name', 'ASC');
    });

    it('should filter by warehouse_id when provided', async () => {
      // Arrange
      const mockQb = createMockQueryBuilder();
      balanceRepository.createQueryBuilder.mockReturnValue(mockQb);
      const filters = { warehouse_id: 'warehouse-123' };

      // Act
      await service.findAll(filters);

      // Assert
      expect(mockQb.andWhere).toHaveBeenCalledWith('balance.warehouse_id = :warehouse_id', {
        warehouse_id: filters.warehouse_id,
      });
    });

    it('should filter by balance_date when provided', async () => {
      // Arrange
      const mockQb = createMockQueryBuilder();
      balanceRepository.createQueryBuilder.mockReturnValue(mockQb);
      const filters = { balance_date: '2024-01-01' };

      // Act
      await service.findAll(filters);

      // Assert
      expect(mockQb.andWhere).toHaveBeenCalledWith('balance.balance_date = :balance_date', {
        balance_date: filters.balance_date,
      });
    });

    it('should filter by is_applied when provided', async () => {
      // Arrange
      const mockQb = createMockQueryBuilder();
      balanceRepository.createQueryBuilder.mockReturnValue(mockQb);
      const filters = { is_applied: false };

      // Act
      await service.findAll(filters);

      // Assert
      expect(mockQb.andWhere).toHaveBeenCalledWith('balance.is_applied = :is_applied', {
        is_applied: false,
      });
    });

    it('should filter by nomenclature_id when provided', async () => {
      // Arrange
      const mockQb = createMockQueryBuilder();
      balanceRepository.createQueryBuilder.mockReturnValue(mockQb);
      const filters = { nomenclature_id: 'nomenclature-123' };

      // Act
      await service.findAll(filters);

      // Assert
      expect(mockQb.andWhere).toHaveBeenCalledWith('balance.nomenclature_id = :nomenclature_id', {
        nomenclature_id: filters.nomenclature_id,
      });
    });

    it('should apply multiple filters when provided', async () => {
      // Arrange
      const mockQb = createMockQueryBuilder();
      balanceRepository.createQueryBuilder.mockReturnValue(mockQb);
      const filters = {
        warehouse_id: 'warehouse-123',
        balance_date: '2024-01-01',
        is_applied: true,
        nomenclature_id: 'nomenclature-123',
      };

      // Act
      await service.findAll(filters);

      // Assert
      expect(mockQb.andWhere).toHaveBeenCalledTimes(4);
    });

    it('should return empty array when no balances found', async () => {
      // Arrange
      const mockQb = createMockQueryBuilder();
      (mockQb.getMany as jest.Mock).mockResolvedValue([]);
      balanceRepository.createQueryBuilder.mockReturnValue(mockQb);

      // Act
      const result = await service.findAll({});

      // Assert
      expect(result).toEqual([]);
    });
  });

  // ============================================================================
  // FIND ONE TESTS
  // ============================================================================

  describe('findOne', () => {
    it('should return opening balance when found', async () => {
      // Arrange
      balanceRepository.findOne.mockResolvedValue(mockBalance as any);

      // Act
      const result = await service.findOne('balance-123');

      // Assert
      expect(result).toEqual(mockBalance);
      expect(balanceRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'balance-123' },
        relations: ['nomenclature', 'warehouse', 'applied_by'],
      });
    });

    it('should throw NotFoundException when balance not found', async () => {
      // Arrange
      balanceRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne('non-existent-id')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        'Opening balance with ID non-existent-id not found',
      );
    });
  });

  // ============================================================================
  // UPDATE TESTS
  // ============================================================================

  describe('update', () => {
    const updateDto: UpdateOpeningBalanceDto = {
      quantity: 200,
      unit_cost: 6000,
      notes: 'Updated balance',
    };

    it('should update opening balance and recalculate total cost', async () => {
      // Arrange
      const expectedTotalCost = 200 * 6000; // 1,200,000
      const updatedBalance = {
        ...mockBalance,
        quantity: 200,
        unit_cost: 6000,
        total_cost: expectedTotalCost,
        notes: 'Updated balance',
      };

      balanceRepository.findOne
        .mockResolvedValueOnce(mockBalance as any) // findOne in update
        .mockResolvedValueOnce(updatedBalance as any); // findOne after update
      balanceRepository.update.mockResolvedValue({ affected: 1 } as any);

      // Act
      const result = await service.update('balance-123', updateDto);

      // Assert
      expect(result.total_cost).toBe(expectedTotalCost);
      expect(balanceRepository.update).toHaveBeenCalledWith(
        'balance-123',
        expect.objectContaining({
          quantity: 200,
          unit_cost: 6000,
          total_cost: expectedTotalCost,
        }),
      );
    });

    it('should recalculate total cost when only quantity changes', async () => {
      // Arrange
      const quantityOnlyDto: UpdateOpeningBalanceDto = { quantity: 150 };
      const expectedTotalCost = 150 * mockBalance.unit_cost; // 150 * 5000 = 750,000

      balanceRepository.findOne.mockResolvedValueOnce(mockBalance as any).mockResolvedValueOnce({
        ...mockBalance,
        quantity: 150,
        total_cost: expectedTotalCost,
      } as any);
      balanceRepository.update.mockResolvedValue({ affected: 1 } as any);

      // Act
      await service.update('balance-123', quantityOnlyDto);

      // Assert
      expect(balanceRepository.update).toHaveBeenCalledWith(
        'balance-123',
        expect.objectContaining({
          total_cost: expectedTotalCost,
        }),
      );
    });

    it('should recalculate total cost when only unit_cost changes', async () => {
      // Arrange
      const unitCostOnlyDto: UpdateOpeningBalanceDto = { unit_cost: 7000 };
      const expectedTotalCost = mockBalance.quantity * 7000; // 100 * 7000 = 700,000

      balanceRepository.findOne.mockResolvedValueOnce(mockBalance as any).mockResolvedValueOnce({
        ...mockBalance,
        unit_cost: 7000,
        total_cost: expectedTotalCost,
      } as any);
      balanceRepository.update.mockResolvedValue({ affected: 1 } as any);

      // Act
      await service.update('balance-123', unitCostOnlyDto);

      // Assert
      expect(balanceRepository.update).toHaveBeenCalledWith(
        'balance-123',
        expect.objectContaining({
          total_cost: expectedTotalCost,
        }),
      );
    });

    it('should not recalculate total cost when neither quantity nor unit_cost changes', async () => {
      // Arrange
      const notesOnlyDto: UpdateOpeningBalanceDto = { notes: 'Just updating notes' };

      balanceRepository.findOne
        .mockResolvedValueOnce(mockBalance as any)
        .mockResolvedValueOnce({ ...mockBalance, notes: 'Just updating notes' } as any);
      balanceRepository.update.mockResolvedValue({ affected: 1 } as any);

      // Act
      await service.update('balance-123', notesOnlyDto);

      // Assert
      expect(balanceRepository.update).toHaveBeenCalledWith('balance-123', {
        notes: 'Just updating notes',
      });
    });

    it('should throw BadRequestException when updating already applied balance', async () => {
      // Arrange
      balanceRepository.findOne.mockResolvedValue(mockAppliedBalance as any);

      // Act & Assert
      await expect(service.update('applied-balance-123', updateDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update('applied-balance-123', updateDto)).rejects.toThrow(
        'Cannot update opening balance that has been applied',
      );
    });

    it('should throw NotFoundException when balance not found', async () => {
      // Arrange
      balanceRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.update('non-existent-id', updateDto)).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================================
  // REMOVE TESTS
  // ============================================================================

  describe('remove', () => {
    it('should soft delete opening balance', async () => {
      // Arrange
      balanceRepository.findOne.mockResolvedValue(mockBalance as any);
      balanceRepository.softDelete.mockResolvedValue({ affected: 1 } as any);

      // Act
      await service.remove('balance-123');

      // Assert
      expect(balanceRepository.softDelete).toHaveBeenCalledWith('balance-123');
    });

    it('should throw BadRequestException when deleting already applied balance', async () => {
      // Arrange
      balanceRepository.findOne.mockResolvedValue(mockAppliedBalance as any);

      // Act & Assert
      await expect(service.remove('applied-balance-123')).rejects.toThrow(BadRequestException);
      await expect(service.remove('applied-balance-123')).rejects.toThrow(
        'Cannot delete opening balance that has been applied',
      );
    });

    it('should throw NotFoundException when balance not found', async () => {
      // Arrange
      balanceRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.remove('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================================
  // APPLY BALANCES TESTS (REQ-STK-03)
  // ============================================================================

  describe('applyBalances', () => {
    const balanceDate = '2024-01-01';
    const warehouseId = 'warehouse-123';
    const userId = 'user-123';

    it('should apply balances and update warehouse inventory for existing items', async () => {
      // Arrange
      const unappliedBalances = [
        { ...mockBalance, is_applied: false },
        { ...mockBalance, id: 'balance-456', is_applied: false },
      ];

      balanceRepository.find.mockResolvedValue(unappliedBalances as any);
      warehouseInventoryRepository.findOne.mockResolvedValue(mockWarehouseInventory as any);
      warehouseInventoryRepository.update.mockResolvedValue({ affected: 1 } as any);
      balanceRepository.update.mockResolvedValue({ affected: 1 } as any);

      // Act
      const result = await service.applyBalances(balanceDate, warehouseId, userId);

      // Assert
      expect(result.applied).toBe(2);
      expect(result.skipped).toBe(0);
      expect(warehouseInventoryRepository.update).toHaveBeenCalledTimes(2);
      expect(balanceRepository.update).toHaveBeenCalledTimes(2);
    });

    it('should create new warehouse inventory when item does not exist', async () => {
      // Arrange
      const unappliedBalance = [{ ...mockBalance, is_applied: false }];

      balanceRepository.find.mockResolvedValue(unappliedBalance as any);
      warehouseInventoryRepository.findOne.mockResolvedValue(null);
      warehouseInventoryRepository.save.mockResolvedValue(mockWarehouseInventory as any);
      balanceRepository.update.mockResolvedValue({ affected: 1 } as any);

      // Act
      const result = await service.applyBalances(balanceDate, warehouseId, userId);

      // Assert
      expect(result.applied).toBe(1);
      expect(result.skipped).toBe(0);
      expect(warehouseInventoryRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          nomenclature_id: mockBalance.nomenclature_id,
          current_quantity: mockBalance.quantity,
          reserved_quantity: 0,
          min_stock_level: 0,
          max_stock_level: mockBalance.quantity * 2,
        }),
      );
    });

    it('should mark balance as applied with user info', async () => {
      // Arrange
      const unappliedBalance = [{ ...mockBalance, is_applied: false }];

      balanceRepository.find.mockResolvedValue(unappliedBalance as any);
      warehouseInventoryRepository.findOne.mockResolvedValue(null);
      warehouseInventoryRepository.save.mockResolvedValue(mockWarehouseInventory as any);
      balanceRepository.update.mockResolvedValue({ affected: 1 } as any);

      // Act
      await service.applyBalances(balanceDate, warehouseId, userId);

      // Assert
      expect(balanceRepository.update).toHaveBeenCalledWith(
        mockBalance.id,
        expect.objectContaining({
          is_applied: true,
          applied_at: expect.any(Date),
          applied_by_id: userId,
        }),
      );
    });

    it('should update existing inventory quantity by adding balance quantity', async () => {
      // Arrange
      const existingInventory = {
        ...mockWarehouseInventory,
        id: 'inventory-123',
        current_quantity: 50,
      };
      const unappliedBalance = [{ ...mockBalance, quantity: 100, is_applied: false }];

      balanceRepository.find.mockResolvedValue(unappliedBalance as any);
      warehouseInventoryRepository.findOne.mockResolvedValue(existingInventory as any);
      warehouseInventoryRepository.update.mockResolvedValue({ affected: 1 } as any);
      balanceRepository.update.mockResolvedValue({ affected: 1 } as any);

      // Act
      await service.applyBalances(balanceDate, warehouseId, userId);

      // Assert
      expect(warehouseInventoryRepository.update).toHaveBeenCalledWith(
        'inventory-123',
        expect.objectContaining({
          current_quantity: 150, // 50 + 100
          last_restocked_at: expect.any(Date),
        }),
      );
    });

    it('should skip balance and count as skipped when error occurs', async () => {
      // Arrange
      const unappliedBalances = [
        { ...mockBalance, id: 'balance-1', is_applied: false },
        { ...mockBalance, id: 'balance-2', is_applied: false },
      ];

      balanceRepository.find.mockResolvedValue(unappliedBalances as any);
      warehouseInventoryRepository.findOne
        .mockResolvedValueOnce(null) // First balance - success
        .mockRejectedValueOnce(new Error('Database error')); // Second balance - fail
      warehouseInventoryRepository.save.mockResolvedValue(mockWarehouseInventory as any);
      balanceRepository.update.mockResolvedValue({ affected: 1 } as any);

      // Act
      const result = await service.applyBalances(balanceDate, warehouseId, userId);

      // Assert
      expect(result.applied).toBe(1);
      expect(result.skipped).toBe(1);
    });

    it('should return zero counts when no unapplied balances exist', async () => {
      // Arrange
      balanceRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.applyBalances(balanceDate, warehouseId, userId);

      // Assert
      expect(result.applied).toBe(0);
      expect(result.skipped).toBe(0);
    });

    it('should filter balances by warehouse_id when provided', async () => {
      // Arrange
      balanceRepository.find.mockResolvedValue([]);

      // Act
      await service.applyBalances(balanceDate, warehouseId, userId);

      // Assert
      expect(balanceRepository.find).toHaveBeenCalledWith({
        where: {
          balance_date: balanceDate,
          is_applied: false,
          warehouse_id: warehouseId,
        },
      });
    });

    it('should not filter by warehouse_id when empty string provided', async () => {
      // Arrange
      balanceRepository.find.mockResolvedValue([]);

      // Act
      await service.applyBalances(balanceDate, '', userId);

      // Assert
      expect(balanceRepository.find).toHaveBeenCalledWith({
        where: {
          balance_date: balanceDate,
          is_applied: false,
        },
      });
    });
  });

  // ============================================================================
  // BULK CREATE TESTS (REQ-STK-OPEN-01)
  // ============================================================================

  describe('bulkCreate', () => {
    const bulkData: CreateOpeningBalanceDto[] = [
      {
        nomenclature_id: 'nomenclature-1',
        balance_date: '2024-01-01',
        quantity: 100,
        unit_cost: 5000,
      },
      {
        nomenclature_id: 'nomenclature-2',
        balance_date: '2024-01-01',
        quantity: 200,
        unit_cost: 3000,
      },
    ];

    it('should create multiple balances successfully', async () => {
      // Arrange
      balanceRepository.findOne.mockResolvedValue(null);
      balanceRepository.create.mockImplementation((data) => data as any);
      balanceRepository.save.mockImplementation((data) => Promise.resolve(data as any));

      // Act
      const result = await service.bulkCreate(bulkData);

      // Assert
      expect(result.created).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should track failed creates with error details', async () => {
      // Arrange
      balanceRepository.findOne
        .mockResolvedValueOnce(null) // First succeeds
        .mockResolvedValueOnce(mockBalance as any); // Second fails (already exists)
      balanceRepository.create.mockImplementation((data) => data as any);
      balanceRepository.save.mockImplementation((data) => Promise.resolve(data as any));

      // Act
      const result = await service.bulkCreate(bulkData);

      // Assert
      expect(result.created).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toHaveProperty('nomenclature_id', 'nomenclature-2');
      expect(result.errors[0]).toHaveProperty('error');
    });

    it('should return all zeros for empty input array', async () => {
      // Act
      const result = await service.bulkCreate([]);

      // Assert
      expect(result.created).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
    });
  });

  // ============================================================================
  // IMPORT BALANCES TESTS (REQ-IMP-01)
  // ============================================================================

  describe('importBalances', () => {
    const importData: CreateOpeningBalanceDto[] = [
      {
        nomenclature_id: 'nomenclature-1',
        balance_date: '2024-01-01',
        quantity: 100,
        unit_cost: 5000,
      },
    ];
    const importSessionId = 'import-session-123';

    it('should import balances with csv import_source', async () => {
      // Arrange
      balanceRepository.findOne.mockResolvedValue(null);
      balanceRepository.create.mockImplementation((data) => data as any);
      balanceRepository.save.mockImplementation((data) => Promise.resolve(data as any));

      // Act
      const result = await service.importBalances(importData, importSessionId);

      // Assert
      expect(result.imported).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should track failed imports with row data', async () => {
      // Arrange
      balanceRepository.findOne.mockResolvedValue(mockBalance as any);

      // Act
      const result = await service.importBalances(importData, importSessionId);

      // Assert
      expect(result.imported).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors[0]).toHaveProperty('row');
      expect(result.errors[0]).toHaveProperty('error');
    });
  });

  // ============================================================================
  // GET STATS TESTS
  // ============================================================================

  describe('getStats', () => {
    it('should return statistics summary', async () => {
      // Arrange
      const mockQb = createMockQueryBuilder();
      balanceRepository.createQueryBuilder.mockReturnValue(mockQb);

      // Act
      const result = await service.getStats();

      // Assert
      expect(result).toHaveProperty('total_items', 10);
      expect(result).toHaveProperty('total_value', 500000);
      expect(result).toHaveProperty('applied_count', 5);
      expect(result).toHaveProperty('pending_count', 5);
      expect(result).toHaveProperty('by_warehouse');
      expect(result.by_warehouse).toHaveLength(1);
    });

    it('should filter by warehouse_id when provided', async () => {
      // Arrange
      const mockQb = createMockQueryBuilder();
      balanceRepository.createQueryBuilder.mockReturnValue(mockQb);
      const warehouseId = 'warehouse-123';

      // Act
      await service.getStats(warehouseId);

      // Assert
      expect(mockQb.where).toHaveBeenCalledWith('balance.warehouse_id = :warehouse_id', {
        warehouse_id: warehouseId,
      });
    });

    it('should handle null/zero statistics gracefully', async () => {
      // Arrange
      const mockQb = createMockQueryBuilder();
      (mockQb.getRawOne as jest.Mock).mockResolvedValue({
        total_items: null,
        total_value: null,
        applied_count: null,
        pending_count: null,
      });
      balanceRepository.createQueryBuilder.mockReturnValue(mockQb);

      // Act
      const result = await service.getStats();

      // Assert
      expect(result.total_items).toBe(0);
      expect(result.total_value).toBe(0);
      expect(result.applied_count).toBe(0);
      expect(result.pending_count).toBe(0);
    });

    it('should return empty array for by_warehouse when no data', async () => {
      // Arrange
      const mockQb = createMockQueryBuilder();
      (mockQb.getRawMany as jest.Mock).mockResolvedValue([]);
      balanceRepository.createQueryBuilder.mockReturnValue(mockQb);

      // Act
      const result = await service.getStats();

      // Assert
      expect(result.by_warehouse).toEqual([]);
    });
  });
});
