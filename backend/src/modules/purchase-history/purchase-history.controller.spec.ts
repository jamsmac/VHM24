import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PurchaseHistoryController } from './purchase-history.controller';
import { PurchaseHistoryService } from './purchase-history.service';
import { PurchaseHistory } from './entities/purchase-history.entity';
import { CreatePurchaseDto, PurchaseStatus } from './dto/create-purchase.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';

type MockAuthRequest = Parameters<typeof PurchaseHistoryController.prototype.create>[1];

describe('PurchaseHistoryController', () => {
  let controller: PurchaseHistoryController;
  let mockService: jest.Mocked<PurchaseHistoryService>;

  const mockPurchase: Partial<PurchaseHistory> = {
    id: 'purchase-uuid-1',
    purchase_date: new Date('2025-01-15'),
    invoice_number: 'INV-2025-001',
    supplier_id: 'supplier-uuid',
    nomenclature_id: 'nomenclature-uuid',
    warehouse_id: 'warehouse-uuid',
    quantity: 100,
    unit: 'pcs',
    unit_price: 10000,
    vat_rate: 15,
    vat_amount: 150000,
    total_amount: 1150000,
    currency: 'UZS',
    exchange_rate: 1,
    status: PurchaseStatus.RECEIVED,
    created_by_id: 'user-uuid',
    import_source: 'manual',
    created_at: new Date('2025-01-15'),
    updated_at: new Date('2025-01-15'),
  };

  const mockRequest = { user: { sub: 'user-uuid' } } as MockAuthRequest;

  const mockStats = {
    total_purchases: 100,
    total_amount: 10000000,
    total_vat: 1500000,
    by_status: [
      { status: PurchaseStatus.RECEIVED, count: '80', total: '8000000' },
      { status: PurchaseStatus.PENDING, count: '20', total: '2000000' },
    ],
    by_supplier: [
      {
        supplier_id: 'sup-1',
        supplier_name: 'Supplier A',
        purchase_count: '50',
        total_amount: '5000000',
      },
    ],
    by_month: [{ month: '2025-01', count: '40', total: '4000000' }],
  };

  beforeEach(async () => {
    mockService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      getStats: jest.fn(),
      getPriceHistory: jest.fn(),
      getAveragePrice: jest.fn(),
      getWeightedAverageCost: jest.fn(),
      getMovingAverageCost: jest.fn(),
      importPurchases: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PurchaseHistoryController],
      providers: [
        {
          provide: PurchaseHistoryService,
          useValue: mockService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PurchaseHistoryController>(PurchaseHistoryController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto: CreatePurchaseDto = {
      purchase_date: '2025-01-15',
      supplier_id: 'supplier-uuid',
      nomenclature_id: 'nomenclature-uuid',
      warehouse_id: 'warehouse-uuid',
      quantity: 100,
      unit_price: 10000,
    };

    it('should create a new purchase', async () => {
      // Arrange
      mockService.create.mockResolvedValue(mockPurchase as PurchaseHistory);

      // Act
      const result = await controller.create(createDto, mockRequest);

      // Assert
      expect(result).toEqual(mockPurchase);
      expect(mockService.create).toHaveBeenCalledWith(createDto, 'user-uuid');
    });

    it('should pass user ID from request', async () => {
      // Arrange
      mockService.create.mockResolvedValue(mockPurchase as PurchaseHistory);

      // Act
      await controller.create(createDto, mockRequest);

      // Assert
      expect(mockService.create).toHaveBeenCalledWith(createDto, 'user-uuid');
    });

    it('should create purchase with all optional fields', async () => {
      // Arrange
      const fullDto: CreatePurchaseDto = {
        ...createDto,
        invoice_number: 'INV-2025-001',
        batch_number: 'BATCH-001',
        vat_rate: 15,
        currency: 'UZS',
        status: PurchaseStatus.RECEIVED,
        notes: 'Test notes',
      };
      mockService.create.mockResolvedValue(mockPurchase as PurchaseHistory);

      // Act
      const result = await controller.create(fullDto, mockRequest);

      // Assert
      expect(result).toEqual(mockPurchase);
      expect(mockService.create).toHaveBeenCalledWith(fullDto, 'user-uuid');
    });
  });

  describe('findAll', () => {
    it('should return all purchases without filters', async () => {
      // Arrange
      mockService.findAll.mockResolvedValue([mockPurchase] as PurchaseHistory[]);

      // Act
      const result = await controller.findAll();

      // Assert
      expect(result).toEqual([mockPurchase]);
      expect(mockService.findAll).toHaveBeenCalledWith({
        supplier_id: undefined,
        nomenclature_id: undefined,
        warehouse_id: undefined,
        status: undefined,
        date_from: undefined,
        date_to: undefined,
        invoice_number: undefined,
      });
    });

    it('should filter by supplier_id', async () => {
      // Arrange
      mockService.findAll.mockResolvedValue([mockPurchase] as PurchaseHistory[]);

      // Act
      await controller.findAll('supplier-uuid');

      // Assert
      expect(mockService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          supplier_id: 'supplier-uuid',
        }),
      );
    });

    it('should filter by nomenclature_id', async () => {
      // Arrange
      mockService.findAll.mockResolvedValue([mockPurchase] as PurchaseHistory[]);

      // Act
      await controller.findAll(undefined, 'nomenclature-uuid');

      // Assert
      expect(mockService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          nomenclature_id: 'nomenclature-uuid',
        }),
      );
    });

    it('should filter by warehouse_id', async () => {
      // Arrange
      mockService.findAll.mockResolvedValue([mockPurchase] as PurchaseHistory[]);

      // Act
      await controller.findAll(undefined, undefined, 'warehouse-uuid');

      // Assert
      expect(mockService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          warehouse_id: 'warehouse-uuid',
        }),
      );
    });

    it('should filter by status', async () => {
      // Arrange
      mockService.findAll.mockResolvedValue([mockPurchase] as PurchaseHistory[]);

      // Act
      await controller.findAll(undefined, undefined, undefined, PurchaseStatus.RECEIVED);

      // Assert
      expect(mockService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          status: PurchaseStatus.RECEIVED,
        }),
      );
    });

    it('should filter by date range', async () => {
      // Arrange
      mockService.findAll.mockResolvedValue([mockPurchase] as PurchaseHistory[]);

      // Act
      await controller.findAll(
        undefined,
        undefined,
        undefined,
        undefined,
        '2025-01-01',
        '2025-01-31',
      );

      // Assert
      expect(mockService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          date_from: '2025-01-01',
          date_to: '2025-01-31',
        }),
      );
    });

    it('should filter by invoice_number', async () => {
      // Arrange
      mockService.findAll.mockResolvedValue([mockPurchase] as PurchaseHistory[]);

      // Act
      await controller.findAll(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        'INV-2025',
      );

      // Assert
      expect(mockService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          invoice_number: 'INV-2025',
        }),
      );
    });

    it('should apply all filters together', async () => {
      // Arrange
      mockService.findAll.mockResolvedValue([mockPurchase] as PurchaseHistory[]);

      // Act
      await controller.findAll(
        'supplier-uuid',
        'nomenclature-uuid',
        'warehouse-uuid',
        PurchaseStatus.RECEIVED,
        '2025-01-01',
        '2025-01-31',
        'INV-2025',
      );

      // Assert
      expect(mockService.findAll).toHaveBeenCalledWith({
        supplier_id: 'supplier-uuid',
        nomenclature_id: 'nomenclature-uuid',
        warehouse_id: 'warehouse-uuid',
        status: PurchaseStatus.RECEIVED,
        date_from: '2025-01-01',
        date_to: '2025-01-31',
        invoice_number: 'INV-2025',
      });
    });

    it('should return empty array when no purchases match', async () => {
      // Arrange
      mockService.findAll.mockResolvedValue([]);

      // Act
      const result = await controller.findAll();

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('getStats', () => {
    it('should return purchase statistics without filters', async () => {
      // Arrange
      mockService.getStats.mockResolvedValue(mockStats);

      // Act
      const result = await controller.getStats();

      // Assert
      expect(result).toEqual(mockStats);
      expect(mockService.getStats).toHaveBeenCalledWith({
        supplier_id: undefined,
        warehouse_id: undefined,
        date_from: undefined,
        date_to: undefined,
      });
    });

    it('should filter statistics by supplier_id', async () => {
      // Arrange
      mockService.getStats.mockResolvedValue(mockStats);

      // Act
      await controller.getStats('supplier-uuid');

      // Assert
      expect(mockService.getStats).toHaveBeenCalledWith(
        expect.objectContaining({
          supplier_id: 'supplier-uuid',
        }),
      );
    });

    it('should filter statistics by warehouse_id', async () => {
      // Arrange
      mockService.getStats.mockResolvedValue(mockStats);

      // Act
      await controller.getStats(undefined, 'warehouse-uuid');

      // Assert
      expect(mockService.getStats).toHaveBeenCalledWith(
        expect.objectContaining({
          warehouse_id: 'warehouse-uuid',
        }),
      );
    });

    it('should filter statistics by date range', async () => {
      // Arrange
      mockService.getStats.mockResolvedValue(mockStats);

      // Act
      await controller.getStats(undefined, undefined, '2025-01-01', '2025-01-31');

      // Assert
      expect(mockService.getStats).toHaveBeenCalledWith(
        expect.objectContaining({
          date_from: '2025-01-01',
          date_to: '2025-01-31',
        }),
      );
    });
  });

  describe('getPriceHistory', () => {
    const mockPriceHistory = [
      {
        date: '2025-01-15',
        price: 12000,
        quantity: 100,
        supplier_id: 'sup-1',
        supplier_name: 'Supplier A',
      },
      {
        date: '2025-01-10',
        price: 11500,
        quantity: 150,
        supplier_id: 'sup-2',
        supplier_name: 'Supplier B',
      },
    ];

    it('should return price history for nomenclature', async () => {
      // Arrange
      mockService.getPriceHistory.mockResolvedValue(mockPriceHistory);

      // Act
      const result = await controller.getPriceHistory('nomenclature-uuid');

      // Assert
      expect(result).toEqual(mockPriceHistory);
      expect(mockService.getPriceHistory).toHaveBeenCalledWith('nomenclature-uuid', undefined);
    });

    it('should filter price history by supplier_id', async () => {
      // Arrange
      mockService.getPriceHistory.mockResolvedValue(mockPriceHistory);

      // Act
      await controller.getPriceHistory('nomenclature-uuid', 'supplier-uuid');

      // Assert
      expect(mockService.getPriceHistory).toHaveBeenCalledWith(
        'nomenclature-uuid',
        'supplier-uuid',
      );
    });
  });

  describe('getAveragePrice', () => {
    const mockAveragePrice = {
      average_price: 11000,
      min_price: 10000,
      max_price: 12000,
      purchase_count: 10,
    };

    it('should return average price with default period', async () => {
      // Arrange
      mockService.getAveragePrice.mockResolvedValue(mockAveragePrice);

      // Act
      const result = await controller.getAveragePrice('nomenclature-uuid');

      // Assert
      expect(result).toEqual(mockAveragePrice);
      expect(mockService.getAveragePrice).toHaveBeenCalledWith('nomenclature-uuid', 90);
    });

    it('should return average price with custom period', async () => {
      // Arrange
      mockService.getAveragePrice.mockResolvedValue(mockAveragePrice);

      // Act
      await controller.getAveragePrice('nomenclature-uuid', '30');

      // Assert
      expect(mockService.getAveragePrice).toHaveBeenCalledWith('nomenclature-uuid', 30);
    });

    it('should parse period_days string to integer', async () => {
      // Arrange
      mockService.getAveragePrice.mockResolvedValue(mockAveragePrice);

      // Act
      await controller.getAveragePrice('nomenclature-uuid', '60');

      // Assert
      expect(mockService.getAveragePrice).toHaveBeenCalledWith('nomenclature-uuid', 60);
    });
  });

  describe('getWeightedAverageCost', () => {
    const mockWAC = {
      weighted_average_cost: 11000,
      total_quantity: 200,
      total_cost: 2200000,
      purchase_count: 5,
      oldest_purchase_date: new Date('2024-06-01'),
      latest_purchase_date: new Date('2025-01-15'),
    };

    it('should return weighted average cost without filters', async () => {
      // Arrange
      mockService.getWeightedAverageCost.mockResolvedValue(mockWAC);

      // Act
      const result = await controller.getWeightedAverageCost('nomenclature-uuid');

      // Assert
      expect(result).toEqual(mockWAC);
      expect(mockService.getWeightedAverageCost).toHaveBeenCalledWith(
        'nomenclature-uuid',
        undefined,
        undefined,
      );
    });

    it('should filter by up_to_date', async () => {
      // Arrange
      mockService.getWeightedAverageCost.mockResolvedValue(mockWAC);

      // Act
      await controller.getWeightedAverageCost('nomenclature-uuid', '2025-01-01');

      // Assert
      expect(mockService.getWeightedAverageCost).toHaveBeenCalledWith(
        'nomenclature-uuid',
        expect.any(Date),
        undefined,
      );
    });

    it('should filter by warehouse_id', async () => {
      // Arrange
      mockService.getWeightedAverageCost.mockResolvedValue(mockWAC);

      // Act
      await controller.getWeightedAverageCost('nomenclature-uuid', undefined, 'warehouse-uuid');

      // Assert
      expect(mockService.getWeightedAverageCost).toHaveBeenCalledWith(
        'nomenclature-uuid',
        undefined,
        'warehouse-uuid',
      );
    });

    it('should apply both up_to_date and warehouse_id filters', async () => {
      // Arrange
      mockService.getWeightedAverageCost.mockResolvedValue(mockWAC);

      // Act
      await controller.getWeightedAverageCost('nomenclature-uuid', '2025-01-01', 'warehouse-uuid');

      // Assert
      expect(mockService.getWeightedAverageCost).toHaveBeenCalledWith(
        'nomenclature-uuid',
        expect.any(Date),
        'warehouse-uuid',
      );
    });
  });

  describe('getMovingAverageCost', () => {
    const mockMAC = {
      moving_average_cost: 11000,
      total_quantity: 100,
      total_cost: 1100000,
      purchase_count: 5,
      period_start_date: new Date(),
      period_end_date: new Date(),
    };

    it('should return moving average cost with default period', async () => {
      // Arrange
      mockService.getMovingAverageCost.mockResolvedValue(mockMAC);

      // Act
      const result = await controller.getMovingAverageCost('nomenclature-uuid');

      // Assert
      expect(result).toEqual(mockMAC);
      expect(mockService.getMovingAverageCost).toHaveBeenCalledWith('nomenclature-uuid', 90);
    });

    it('should return moving average cost with custom period', async () => {
      // Arrange
      mockService.getMovingAverageCost.mockResolvedValue(mockMAC);

      // Act
      await controller.getMovingAverageCost('nomenclature-uuid', '30');

      // Assert
      expect(mockService.getMovingAverageCost).toHaveBeenCalledWith('nomenclature-uuid', 30);
    });
  });

  describe('importPurchases', () => {
    const importBody = {
      data: [
        {
          purchase_date: '2025-01-15',
          supplier_id: 'supplier-uuid',
          nomenclature_id: 'nomenclature-uuid',
          quantity: 100,
          unit_price: 10000,
        },
      ] as CreatePurchaseDto[],
      session_id: 'session-uuid',
    };

    it('should import purchases successfully', async () => {
      // Arrange
      const importResult = { imported: 1, failed: 0, errors: [] };
      mockService.importPurchases.mockResolvedValue(importResult);

      // Act
      const result = await controller.importPurchases(importBody, mockRequest);

      // Assert
      expect(result).toEqual(importResult);
      expect(mockService.importPurchases).toHaveBeenCalledWith(
        importBody.data,
        importBody.session_id,
        'user-uuid',
      );
    });

    it('should return partial results with errors', async () => {
      // Arrange
      const importResult = {
        imported: 0,
        failed: 1,
        errors: [{ row: importBody.data[0], error: 'Validation failed' }],
      };
      mockService.importPurchases.mockResolvedValue(importResult);

      // Act
      const result = await controller.importPurchases(importBody, mockRequest);

      // Assert
      expect(result.imported).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should return purchase by ID', async () => {
      // Arrange
      mockService.findOne.mockResolvedValue(mockPurchase as PurchaseHistory);

      // Act
      const result = await controller.findOne('purchase-uuid-1');

      // Assert
      expect(result).toEqual(mockPurchase);
      expect(mockService.findOne).toHaveBeenCalledWith('purchase-uuid-1');
    });

    it('should throw NotFoundException when purchase not found', async () => {
      // Arrange
      mockService.findOne.mockRejectedValue(
        new NotFoundException('Purchase with ID non-existent not found'),
      );

      // Act & Assert
      await expect(controller.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto: UpdatePurchaseDto = {
      quantity: 150,
      unit_price: 12000,
      notes: 'Updated notes',
    };

    it('should update purchase successfully', async () => {
      // Arrange
      const updatedPurchase = {
        ...mockPurchase,
        ...updateDto,
        vat_amount: 270000,
        total_amount: 2070000,
      };
      mockService.update.mockResolvedValue(updatedPurchase as PurchaseHistory);

      // Act
      const result = await controller.update('purchase-uuid-1', updateDto);

      // Assert
      expect(result).toEqual(updatedPurchase);
      expect(mockService.update).toHaveBeenCalledWith('purchase-uuid-1', updateDto);
    });

    it('should throw NotFoundException when purchase not found', async () => {
      // Arrange
      mockService.update.mockRejectedValue(
        new NotFoundException('Purchase with ID non-existent not found'),
      );

      // Act & Assert
      await expect(controller.update('non-existent', updateDto)).rejects.toThrow(NotFoundException);
    });

    it('should update with partial data', async () => {
      // Arrange
      const partialUpdate: UpdatePurchaseDto = { notes: 'Just updating notes' };
      const updatedPurchase = { ...mockPurchase, notes: 'Just updating notes' };
      mockService.update.mockResolvedValue(updatedPurchase as PurchaseHistory);

      // Act
      const result = await controller.update('purchase-uuid-1', partialUpdate);

      // Assert
      expect(result.notes).toBe('Just updating notes');
    });
  });

  describe('remove', () => {
    it('should delete purchase successfully', async () => {
      // Arrange
      mockService.remove.mockResolvedValue(undefined);

      // Act
      await controller.remove('purchase-uuid-1');

      // Assert
      expect(mockService.remove).toHaveBeenCalledWith('purchase-uuid-1');
    });

    it('should throw NotFoundException when purchase not found', async () => {
      // Arrange
      mockService.remove.mockRejectedValue(
        new NotFoundException('Purchase with ID non-existent not found'),
      );

      // Act & Assert
      await expect(controller.remove('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('Edge cases', () => {
    it('should handle decimal quantities correctly', async () => {
      // Arrange
      const decimalDto: CreatePurchaseDto = {
        purchase_date: '2025-01-15',
        supplier_id: 'supplier-uuid',
        nomenclature_id: 'nomenclature-uuid',
        quantity: 10.5,
        unit_price: 2000,
      };
      mockService.create.mockResolvedValue({
        ...mockPurchase,
        quantity: 10.5,
        unit_price: 2000,
        vat_amount: 3150,
        total_amount: 24150,
      } as PurchaseHistory);

      // Act
      const result = await controller.create(decimalDto, mockRequest);

      // Assert
      expect(result.quantity).toBe(10.5);
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
      mockService.importPurchases.mockResolvedValue({ imported: 0, failed: 0, errors: [] });

      // Act
      const result = await controller.importPurchases(emptyImport, mockRequest);

      // Assert
      expect(result.imported).toBe(0);
      expect(result.failed).toBe(0);
    });

    it('should handle various purchase statuses', async () => {
      // Arrange
      const pendingPurchase = { ...mockPurchase, status: PurchaseStatus.PENDING };
      mockService.findAll.mockResolvedValue([pendingPurchase] as PurchaseHistory[]);

      // Act
      await controller.findAll(undefined, undefined, undefined, PurchaseStatus.PENDING);

      // Assert
      expect(mockService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          status: PurchaseStatus.PENDING,
        }),
      );
    });
  });
});
