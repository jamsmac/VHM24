import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { OpeningBalancesController } from './opening-balances.controller';
import { OpeningBalancesService } from './opening-balances.service';
import { StockOpeningBalance } from './entities/opening-balance.entity';
import { CreateOpeningBalanceDto } from './dto/create-opening-balance.dto';
import { UpdateOpeningBalanceDto } from './dto/update-opening-balance.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';

describe('OpeningBalancesController', () => {
  let controller: OpeningBalancesController;
  let mockService: jest.Mocked<OpeningBalancesService>;

  const mockBalance: Partial<StockOpeningBalance> = {
    id: 'balance-123',
    nomenclature_id: 'nomenclature-123',
    warehouse_id: 'warehouse-123',
    balance_date: new Date('2024-01-01'),
    quantity: 100,
    unit: 'pcs',
    unit_cost: 5000,
    total_cost: 500000,
    batch_number: 'BATCH-001',
    is_applied: false,
    applied_at: null,
    applied_by_id: null,
    import_source: 'manual',
    notes: 'Test balance',
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockAppliedBalance: Partial<StockOpeningBalance> = {
    ...mockBalance,
    id: 'applied-balance-123',
    is_applied: true,
    applied_at: new Date(),
    applied_by_id: 'user-123',
  };

  const mockStats = {
    total_items: 10,
    total_value: 500000,
    applied_count: 5,
    pending_count: 5,
    by_warehouse: [
      {
        warehouse_id: 'warehouse-123',
        warehouse_name: 'Main Warehouse',
        item_count: '10',
        total_value: '500000',
      },
    ],
  };

  beforeEach(async () => {
    mockService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      applyBalances: jest.fn(),
      bulkCreate: jest.fn(),
      importBalances: jest.fn(),
      getStats: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OpeningBalancesController],
      providers: [
        {
          provide: OpeningBalancesService,
          useValue: mockService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<OpeningBalancesController>(OpeningBalancesController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto: CreateOpeningBalanceDto = {
      nomenclature_id: 'nomenclature-123',
      warehouse_id: 'warehouse-123',
      balance_date: '2024-01-01',
      quantity: 100,
      unit_cost: 5000,
      batch_number: 'BATCH-001',
      notes: 'Test balance',
    };

    it('should create a new opening balance', async () => {
      // Arrange
      mockService.create.mockResolvedValue(mockBalance as StockOpeningBalance);

      // Act
      const result = await controller.create(createDto);

      // Assert
      expect(result).toEqual(mockBalance);
      expect(mockService.create).toHaveBeenCalledWith(createDto);
    });

    it('should throw BadRequestException when balance already exists', async () => {
      // Arrange
      mockService.create.mockRejectedValue(
        new BadRequestException(
          'Opening balance already exists for this nomenclature, warehouse and date',
        ),
      );

      // Act & Assert
      await expect(controller.create(createDto)).rejects.toThrow(BadRequestException);
    });

    it('should create balance with minimal required fields', async () => {
      // Arrange
      const minimalDto: CreateOpeningBalanceDto = {
        nomenclature_id: 'nomenclature-123',
        balance_date: '2024-01-01',
        quantity: 50,
        unit_cost: 1000,
      };
      mockService.create.mockResolvedValue({
        ...mockBalance,
        ...minimalDto,
        total_cost: 50000,
      } as any);

      // Act
      const result = await controller.create(minimalDto);

      // Assert
      expect(result).toBeDefined();
      expect(mockService.create).toHaveBeenCalledWith(minimalDto);
    });
  });

  describe('bulkCreate', () => {
    const bulkDto = {
      balances: [
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
      ] as CreateOpeningBalanceDto[],
    };

    it('should create multiple balances successfully', async () => {
      // Arrange
      const bulkResult = { created: 2, failed: 0, errors: [] };
      mockService.bulkCreate.mockResolvedValue(bulkResult);

      // Act
      const result = await controller.bulkCreate(bulkDto);

      // Assert
      expect(result).toEqual(bulkResult);
      expect(mockService.bulkCreate).toHaveBeenCalledWith(bulkDto.balances);
    });

    it('should return partial success when some balances fail', async () => {
      // Arrange
      const bulkResult = {
        created: 1,
        failed: 1,
        errors: [{ nomenclature_id: 'nomenclature-2', error: 'Already exists' }],
      };
      mockService.bulkCreate.mockResolvedValue(bulkResult);

      // Act
      const result = await controller.bulkCreate(bulkDto);

      // Assert
      expect(result.created).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('findAll', () => {
    it('should return all opening balances without filters', async () => {
      // Arrange
      mockService.findAll.mockResolvedValue([mockBalance] as StockOpeningBalance[]);

      // Act
      const result = await controller.findAll();

      // Assert
      expect(result).toEqual([mockBalance]);
      expect(mockService.findAll).toHaveBeenCalledWith({
        warehouse_id: undefined,
        balance_date: undefined,
        is_applied: undefined,
        nomenclature_id: undefined,
      });
    });

    it('should filter by warehouse_id', async () => {
      // Arrange
      mockService.findAll.mockResolvedValue([mockBalance] as StockOpeningBalance[]);

      // Act
      await controller.findAll('warehouse-123');

      // Assert
      expect(mockService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          warehouse_id: 'warehouse-123',
        }),
      );
    });

    it('should filter by balance_date', async () => {
      // Arrange
      mockService.findAll.mockResolvedValue([mockBalance] as StockOpeningBalance[]);

      // Act
      await controller.findAll(undefined, '2024-01-01');

      // Assert
      expect(mockService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          balance_date: '2024-01-01',
        }),
      );
    });

    it('should filter by is_applied=true', async () => {
      // Arrange
      mockService.findAll.mockResolvedValue([mockAppliedBalance] as StockOpeningBalance[]);

      // Act
      await controller.findAll(undefined, undefined, 'true');

      // Assert
      expect(mockService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          is_applied: true,
        }),
      );
    });

    it('should filter by is_applied=false', async () => {
      // Arrange
      mockService.findAll.mockResolvedValue([mockBalance] as StockOpeningBalance[]);

      // Act
      await controller.findAll(undefined, undefined, 'false');

      // Assert
      expect(mockService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          is_applied: false,
        }),
      );
    });

    it('should filter by nomenclature_id', async () => {
      // Arrange
      mockService.findAll.mockResolvedValue([mockBalance] as StockOpeningBalance[]);

      // Act
      await controller.findAll(undefined, undefined, undefined, 'nomenclature-123');

      // Assert
      expect(mockService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          nomenclature_id: 'nomenclature-123',
        }),
      );
    });

    it('should apply multiple filters', async () => {
      // Arrange
      mockService.findAll.mockResolvedValue([mockBalance] as StockOpeningBalance[]);

      // Act
      await controller.findAll('warehouse-123', '2024-01-01', 'false', 'nomenclature-123');

      // Assert
      expect(mockService.findAll).toHaveBeenCalledWith({
        warehouse_id: 'warehouse-123',
        balance_date: '2024-01-01',
        is_applied: false,
        nomenclature_id: 'nomenclature-123',
      });
    });

    it('should return empty array when no balances match', async () => {
      // Arrange
      mockService.findAll.mockResolvedValue([]);

      // Act
      const result = await controller.findAll();

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('getStats', () => {
    it('should return statistics without warehouse filter', async () => {
      // Arrange
      mockService.getStats.mockResolvedValue(mockStats);

      // Act
      const result = await controller.getStats();

      // Assert
      expect(result).toEqual(mockStats);
      expect(mockService.getStats).toHaveBeenCalledWith(undefined);
    });

    it('should return statistics with warehouse filter', async () => {
      // Arrange
      mockService.getStats.mockResolvedValue(mockStats);

      // Act
      const result = await controller.getStats('warehouse-123');

      // Assert
      expect(result).toEqual(mockStats);
      expect(mockService.getStats).toHaveBeenCalledWith('warehouse-123');
    });

    it('should return zero statistics when no data', async () => {
      // Arrange
      const emptyStats = {
        total_items: 0,
        total_value: 0,
        applied_count: 0,
        pending_count: 0,
        by_warehouse: [],
      };
      mockService.getStats.mockResolvedValue(emptyStats);

      // Act
      const result = await controller.getStats();

      // Assert
      expect(result).toEqual(emptyStats);
    });
  });

  describe('applyBalances', () => {
    const applyBody = {
      balance_date: '2024-01-01',
      warehouse_id: 'warehouse-123',
    };
    const mockRequest = { user: { sub: 'user-123' } };

    it('should apply balances successfully', async () => {
      // Arrange
      const applyResult = { applied: 5, skipped: 0 };
      mockService.applyBalances.mockResolvedValue(applyResult);

      // Act
      const result = await controller.applyBalances(applyBody, mockRequest);

      // Assert
      expect(result).toEqual(applyResult);
      expect(mockService.applyBalances).toHaveBeenCalledWith(
        applyBody.balance_date,
        applyBody.warehouse_id,
        'user-123',
      );
    });

    it('should return partial results when some balances are skipped', async () => {
      // Arrange
      const applyResult = { applied: 3, skipped: 2 };
      mockService.applyBalances.mockResolvedValue(applyResult);

      // Act
      const result = await controller.applyBalances(applyBody, mockRequest);

      // Assert
      expect(result.applied).toBe(3);
      expect(result.skipped).toBe(2);
    });

    it('should return zero counts when no balances to apply', async () => {
      // Arrange
      const applyResult = { applied: 0, skipped: 0 };
      mockService.applyBalances.mockResolvedValue(applyResult);

      // Act
      const result = await controller.applyBalances(applyBody, mockRequest);

      // Assert
      expect(result.applied).toBe(0);
      expect(result.skipped).toBe(0);
    });
  });

  describe('importBalances', () => {
    const importBody = {
      data: [
        {
          nomenclature_id: 'nomenclature-1',
          balance_date: '2024-01-01',
          quantity: 100,
          unit_cost: 5000,
        },
      ] as CreateOpeningBalanceDto[],
      session_id: 'import-session-123',
    };

    it('should import balances successfully', async () => {
      // Arrange
      const importResult = { imported: 1, failed: 0, errors: [] };
      mockService.importBalances.mockResolvedValue(importResult);

      // Act
      const result = await controller.importBalances(importBody);

      // Assert
      expect(result).toEqual(importResult);
      expect(mockService.importBalances).toHaveBeenCalledWith(
        importBody.data,
        importBody.session_id,
      );
    });

    it('should return partial results with errors', async () => {
      // Arrange
      const importResult = {
        imported: 0,
        failed: 1,
        errors: [{ row: importBody.data[0], error: 'Already exists' }],
      };
      mockService.importBalances.mockResolvedValue(importResult);

      // Act
      const result = await controller.importBalances(importBody);

      // Assert
      expect(result.imported).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should return opening balance by ID', async () => {
      // Arrange
      mockService.findOne.mockResolvedValue(mockBalance as StockOpeningBalance);

      // Act
      const result = await controller.findOne('balance-123');

      // Assert
      expect(result).toEqual(mockBalance);
      expect(mockService.findOne).toHaveBeenCalledWith('balance-123');
    });

    it('should throw NotFoundException when balance not found', async () => {
      // Arrange
      mockService.findOne.mockRejectedValue(
        new NotFoundException('Opening balance with ID non-existent not found'),
      );

      // Act & Assert
      await expect(controller.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto: UpdateOpeningBalanceDto = {
      quantity: 200,
      unit_cost: 6000,
      notes: 'Updated balance',
    };

    it('should update opening balance successfully', async () => {
      // Arrange
      const updatedBalance = {
        ...mockBalance,
        ...updateDto,
        total_cost: 200 * 6000,
      };
      mockService.update.mockResolvedValue(updatedBalance as StockOpeningBalance);

      // Act
      const result = await controller.update('balance-123', updateDto);

      // Assert
      expect(result).toEqual(updatedBalance);
      expect(mockService.update).toHaveBeenCalledWith('balance-123', updateDto);
    });

    it('should throw NotFoundException when balance not found', async () => {
      // Arrange
      mockService.update.mockRejectedValue(
        new NotFoundException('Opening balance with ID non-existent not found'),
      );

      // Act & Assert
      await expect(controller.update('non-existent', updateDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when updating applied balance', async () => {
      // Arrange
      mockService.update.mockRejectedValue(
        new BadRequestException('Cannot update opening balance that has been applied'),
      );

      // Act & Assert
      await expect(controller.update('applied-balance-123', updateDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should update with partial data', async () => {
      // Arrange
      const partialUpdate: UpdateOpeningBalanceDto = { notes: 'Just updating notes' };
      const updatedBalance = { ...mockBalance, notes: 'Just updating notes' };
      mockService.update.mockResolvedValue(updatedBalance as StockOpeningBalance);

      // Act
      const result = await controller.update('balance-123', partialUpdate);

      // Assert
      expect(result.notes).toBe('Just updating notes');
    });
  });

  describe('remove', () => {
    it('should delete opening balance successfully', async () => {
      // Arrange
      mockService.remove.mockResolvedValue(undefined);

      // Act
      await controller.remove('balance-123');

      // Assert
      expect(mockService.remove).toHaveBeenCalledWith('balance-123');
    });

    it('should throw NotFoundException when balance not found', async () => {
      // Arrange
      mockService.remove.mockRejectedValue(
        new NotFoundException('Opening balance with ID non-existent not found'),
      );

      // Act & Assert
      await expect(controller.remove('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when deleting applied balance', async () => {
      // Arrange
      mockService.remove.mockRejectedValue(
        new BadRequestException('Cannot delete opening balance that has been applied'),
      );

      // Act & Assert
      await expect(controller.remove('applied-balance-123')).rejects.toThrow(BadRequestException);
    });
  });

  describe('Edge cases', () => {
    it('should handle decimal quantities correctly', async () => {
      // Arrange
      const decimalDto: CreateOpeningBalanceDto = {
        nomenclature_id: 'nomenclature-123',
        balance_date: '2024-01-01',
        quantity: 10.5,
        unit_cost: 2000,
      };
      mockService.create.mockResolvedValue({
        ...mockBalance,
        quantity: 10.5,
        unit_cost: 2000,
        total_cost: 21000,
      } as StockOpeningBalance);

      // Act
      const result = await controller.create(decimalDto);

      // Assert
      expect(result.quantity).toBe(10.5);
      expect(result.total_cost).toBe(21000);
    });

    it('should propagate service errors correctly', async () => {
      // Arrange
      const dbError = new Error('Database connection failed');
      mockService.findAll.mockRejectedValue(dbError);

      // Act & Assert
      await expect(controller.findAll()).rejects.toThrow('Database connection failed');
    });

    it('should handle empty import data', async () => {
      // Arrange
      const emptyImport = { data: [], session_id: 'session-123' };
      mockService.importBalances.mockResolvedValue({ imported: 0, failed: 0, errors: [] });

      // Act
      const result = await controller.importBalances(emptyImport);

      // Assert
      expect(result.imported).toBe(0);
      expect(result.failed).toBe(0);
    });
  });
});
