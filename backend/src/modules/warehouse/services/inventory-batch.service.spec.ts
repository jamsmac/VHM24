import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { InventoryBatchService } from './inventory-batch.service';
import { InventoryBatch } from '../entities/inventory-batch.entity';

describe('InventoryBatchService', () => {
  let service: InventoryBatchService;
  let batchRepository: jest.Mocked<Repository<InventoryBatch>>;
  let dataSource: jest.Mocked<DataSource>;

  // Mock fixtures
  const mockBatch: Partial<InventoryBatch> = {
    id: 'batch-uuid',
    batch_number: 'BATCH-001',
    warehouse_id: 'warehouse-uuid',
    product_id: 'product-uuid',
    initial_quantity: 100,
    current_quantity: 80,
    reserved_quantity: 10,
    available_quantity: 70,
    unit: 'pcs',
    unit_cost: 50,
    production_date: new Date('2025-01-01'),
    expiry_date: new Date('2026-01-01'),
    received_date: new Date('2025-01-15'),
    supplier: 'Test Supplier',
    is_active: true,
    is_quarantined: false,
    quarantine_reason: null,
    metadata: {},
  };

  const createMockRepository = () => ({
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  });

  const createMockTransactionManager = () => ({
    find: jest.fn(),
    save: jest.fn(),
  });

  beforeEach(async () => {
    const mockBatchRepo = createMockRepository();
    const mockDataSource = {
      transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryBatchService,
        {
          provide: getRepositoryToken(InventoryBatch),
          useValue: mockBatchRepo,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<InventoryBatchService>(InventoryBatchService);
    batchRepository = module.get(getRepositoryToken(InventoryBatch));
    dataSource = module.get(DataSource);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================================================
  // FIND ALL TESTS
  // ============================================================================

  describe('findAll', () => {
    it('should return all active batches', async () => {
      const batches = [mockBatch, { ...mockBatch, id: 'batch-2', batch_number: 'BATCH-002' }];
      batchRepository.find.mockResolvedValue(batches as InventoryBatch[]);

      const result = await service.findAll();

      expect(batchRepository.find).toHaveBeenCalledWith({
        where: { is_active: true },
        order: { expiry_date: 'ASC', received_date: 'ASC' },
      });
      expect(result).toEqual(batches);
    });

    it('should filter by warehouse_id when provided', async () => {
      batchRepository.find.mockResolvedValue([mockBatch as InventoryBatch]);

      await service.findAll('warehouse-uuid');

      expect(batchRepository.find).toHaveBeenCalledWith({
        where: { is_active: true, warehouse_id: 'warehouse-uuid' },
        order: { expiry_date: 'ASC', received_date: 'ASC' },
      });
    });

    it('should filter by product_id when provided', async () => {
      batchRepository.find.mockResolvedValue([mockBatch as InventoryBatch]);

      await service.findAll(undefined, 'product-uuid');

      expect(batchRepository.find).toHaveBeenCalledWith({
        where: { is_active: true, product_id: 'product-uuid' },
        order: { expiry_date: 'ASC', received_date: 'ASC' },
      });
    });

    it('should filter by both warehouse_id and product_id', async () => {
      batchRepository.find.mockResolvedValue([mockBatch as InventoryBatch]);

      await service.findAll('warehouse-uuid', 'product-uuid');

      expect(batchRepository.find).toHaveBeenCalledWith({
        where: {
          is_active: true,
          warehouse_id: 'warehouse-uuid',
          product_id: 'product-uuid',
        },
        order: { expiry_date: 'ASC', received_date: 'ASC' },
      });
    });

    it('should order by expiry_date ASC (FEFO principle)', async () => {
      batchRepository.find.mockResolvedValue([]);

      await service.findAll();

      expect(batchRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { expiry_date: 'ASC', received_date: 'ASC' },
        }),
      );
    });
  });

  // ============================================================================
  // GET BATCHES BY PRODUCT TESTS
  // ============================================================================

  describe('getBatchesByProduct', () => {
    it('should return active, non-quarantined batches for product', async () => {
      const batches = [mockBatch];
      batchRepository.find.mockResolvedValue(batches as InventoryBatch[]);

      const result = await service.getBatchesByProduct('warehouse-uuid', 'product-uuid');

      expect(batchRepository.find).toHaveBeenCalledWith({
        where: {
          warehouse_id: 'warehouse-uuid',
          product_id: 'product-uuid',
          is_active: true,
          is_quarantined: false,
        },
        order: { expiry_date: 'ASC' },
      });
      expect(result).toEqual(batches);
    });
  });

  // ============================================================================
  // GET EXPIRING BATCHES TESTS
  // ============================================================================

  describe('getExpiringBatches', () => {
    it('should return batches expiring within threshold days', async () => {
      const expiringBatch = {
        ...mockBatch,
        expiry_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
        current_quantity: 50,
      };
      batchRepository.find.mockResolvedValue([expiringBatch as InventoryBatch]);

      const result = await service.getExpiringBatches('warehouse-uuid', 30);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('batch-uuid');
    });

    it('should use default threshold of 30 days', async () => {
      batchRepository.find.mockResolvedValue([]);

      await service.getExpiringBatches('warehouse-uuid');

      // The method should be called with default 30 days
      expect(batchRepository.find).toHaveBeenCalled();
    });

    it('should exclude batches with zero quantity', async () => {
      const emptyBatch = {
        ...mockBatch,
        expiry_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        current_quantity: 0,
      };
      batchRepository.find.mockResolvedValue([emptyBatch as InventoryBatch]);

      const result = await service.getExpiringBatches('warehouse-uuid', 30);

      expect(result).toHaveLength(0);
    });

    it('should exclude batches without expiry_date', async () => {
      const noExpiryBatch = {
        ...mockBatch,
        expiry_date: null,
        current_quantity: 50,
      };
      batchRepository.find.mockResolvedValue([noExpiryBatch as InventoryBatch]);

      const result = await service.getExpiringBatches('warehouse-uuid', 30);

      expect(result).toHaveLength(0);
    });

    it('should exclude batches expiring after threshold', async () => {
      const laterExpiryBatch = {
        ...mockBatch,
        expiry_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
        current_quantity: 50,
      };
      batchRepository.find.mockResolvedValue([laterExpiryBatch as InventoryBatch]);

      const result = await service.getExpiringBatches('warehouse-uuid', 30);

      expect(result).toHaveLength(0);
    });

    it('should filter by active and non-quarantined status', async () => {
      batchRepository.find.mockResolvedValue([]);

      await service.getExpiringBatches('warehouse-uuid');

      expect(batchRepository.find).toHaveBeenCalledWith({
        where: {
          warehouse_id: 'warehouse-uuid',
          is_active: true,
          is_quarantined: false,
        },
        order: { expiry_date: 'ASC' },
      });
    });
  });

  // ============================================================================
  // GET EXPIRED BATCHES TESTS
  // ============================================================================

  describe('getExpiredBatches', () => {
    it('should return batches with expiry_date before today', async () => {
      const expiredBatch = {
        ...mockBatch,
        expiry_date: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        current_quantity: 50,
      };
      batchRepository.find.mockResolvedValue([expiredBatch as InventoryBatch]);

      const result = await service.getExpiredBatches('warehouse-uuid');

      expect(result).toHaveLength(1);
    });

    it('should exclude batches with zero quantity', async () => {
      const emptyExpiredBatch = {
        ...mockBatch,
        expiry_date: new Date(Date.now() - 24 * 60 * 60 * 1000),
        current_quantity: 0,
      };
      batchRepository.find.mockResolvedValue([emptyExpiredBatch as InventoryBatch]);

      const result = await service.getExpiredBatches('warehouse-uuid');

      expect(result).toHaveLength(0);
    });

    it('should exclude batches without expiry_date', async () => {
      const noExpiryBatch = {
        ...mockBatch,
        expiry_date: null,
        current_quantity: 50,
      };
      batchRepository.find.mockResolvedValue([noExpiryBatch as InventoryBatch]);

      const result = await service.getExpiredBatches('warehouse-uuid');

      expect(result).toHaveLength(0);
    });

    it('should exclude batches with future expiry_date', async () => {
      const futureBatch = {
        ...mockBatch,
        expiry_date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        current_quantity: 50,
      };
      batchRepository.find.mockResolvedValue([futureBatch as InventoryBatch]);

      const result = await service.getExpiredBatches('warehouse-uuid');

      expect(result).toHaveLength(0);
    });
  });

  // ============================================================================
  // QUARANTINE BATCH TESTS
  // ============================================================================

  describe('quarantineBatch', () => {
    it('should set batch as quarantined with reason', async () => {
      batchRepository.findOne.mockResolvedValue(mockBatch as InventoryBatch);
      batchRepository.save.mockImplementation((batch) => Promise.resolve(batch as InventoryBatch));

      const result = await service.quarantineBatch('batch-uuid', 'Quality issue detected');

      expect(result.is_quarantined).toBe(true);
      expect(result.quarantine_reason).toBe('Quality issue detected');
      expect(batchRepository.save).toHaveBeenCalled();
    });

    it('should throw error when batch not found', async () => {
      batchRepository.findOne.mockResolvedValue(null);

      await expect(service.quarantineBatch('non-existent', 'Reason')).rejects.toThrow(
        'Batch with ID non-existent not found',
      );
    });
  });

  // ============================================================================
  // RELEASE FROM QUARANTINE TESTS
  // ============================================================================

  describe('releaseFromQuarantine', () => {
    it('should release batch from quarantine', async () => {
      const quarantinedBatch = {
        ...mockBatch,
        is_quarantined: true,
        quarantine_reason: 'Quality issue',
      };
      batchRepository.findOne.mockResolvedValue(quarantinedBatch as InventoryBatch);
      batchRepository.save.mockImplementation((batch) => Promise.resolve(batch as InventoryBatch));

      const result = await service.releaseFromQuarantine('batch-uuid');

      expect(result.is_quarantined).toBe(false);
      expect(result.quarantine_reason).toBeNull();
    });

    it('should throw error when batch not found', async () => {
      batchRepository.findOne.mockResolvedValue(null);

      await expect(service.releaseFromQuarantine('non-existent')).rejects.toThrow(
        'Batch with ID non-existent not found',
      );
    });
  });

  // ============================================================================
  // FIFO WRITE-OFF TESTS
  // ============================================================================

  describe('fifoWriteOff', () => {
    it('should write off from oldest batches first (FIFO)', async () => {
      const oldestBatch = {
        ...mockBatch,
        id: 'oldest',
        received_date: new Date('2024-01-01'),
        current_quantity: 30,
        reserved_quantity: 0,
      };
      const newerBatch = {
        ...mockBatch,
        id: 'newer',
        received_date: new Date('2025-01-01'),
        current_quantity: 50,
        reserved_quantity: 0,
      };

      const mockManager = {
        find: jest.fn().mockResolvedValue([oldestBatch, newerBatch]),
        save: jest.fn().mockImplementation((Entity, batch) => Promise.resolve(batch)),
      };

      dataSource.transaction.mockImplementation(async (callback: any) => {
        return callback(mockManager);
      });

      const result = await service.fifoWriteOff('warehouse-uuid', 'product-uuid', 50, 'Test');

      expect(result).toHaveLength(2);
      expect(result[0].batch.id).toBe('oldest');
      expect(result[0].quantity_written_off).toBe(30); // Full oldest batch
      expect(result[1].batch.id).toBe('newer');
      expect(result[1].quantity_written_off).toBe(20); // Partial newer batch
    });

    it('should throw BadRequestException when insufficient stock for write-off', async () => {
      const mockManager = {
        find: jest
          .fn()
          .mockResolvedValue([{ ...mockBatch, current_quantity: 20, reserved_quantity: 0 }]),
        save: jest.fn(),
      };

      dataSource.transaction.mockImplementation(async (callback: any) => {
        return callback(mockManager);
      });

      await expect(
        service.fifoWriteOff('warehouse-uuid', 'product-uuid', 100, 'Test'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.fifoWriteOff('warehouse-uuid', 'product-uuid', 100, 'Test'),
      ).rejects.toThrow(/Insufficient stock for FIFO write-off/);
    });

    it('should deactivate batch when fully consumed', async () => {
      const mockManager = {
        find: jest
          .fn()
          .mockResolvedValue([{ ...mockBatch, current_quantity: 50, reserved_quantity: 0 }]),
        save: jest.fn().mockImplementation((Entity, batch) => Promise.resolve(batch)),
      };

      dataSource.transaction.mockImplementation(async (callback: any) => {
        return callback(mockManager);
      });

      const result = await service.fifoWriteOff('warehouse-uuid', 'product-uuid', 50);

      expect(result[0].batch.is_active).toBe(false);
    });

    it('should skip batches with zero quantity', async () => {
      const emptyBatch = { ...mockBatch, id: 'empty', current_quantity: 0 };
      const fullBatch = { ...mockBatch, id: 'full', current_quantity: 50, reserved_quantity: 0 };

      const mockManager = {
        find: jest.fn().mockResolvedValue([emptyBatch, fullBatch]),
        save: jest.fn().mockImplementation((Entity, batch) => Promise.resolve(batch)),
      };

      dataSource.transaction.mockImplementation(async (callback: any) => {
        return callback(mockManager);
      });

      const result = await service.fifoWriteOff('warehouse-uuid', 'product-uuid', 30);

      expect(result).toHaveLength(1);
      expect(result[0].batch.id).toBe('full');
    });

    it('should use pessimistic write lock for transaction', async () => {
      const mockManager = {
        find: jest
          .fn()
          .mockResolvedValue([{ ...mockBatch, current_quantity: 50, reserved_quantity: 0 }]),
        save: jest.fn().mockImplementation((Entity, batch) => Promise.resolve(batch)),
      };

      dataSource.transaction.mockImplementation(async (callback: any) => {
        return callback(mockManager);
      });

      await service.fifoWriteOff('warehouse-uuid', 'product-uuid', 30);

      expect(mockManager.find).toHaveBeenCalledWith(
        InventoryBatch,
        expect.objectContaining({
          lock: { mode: 'pessimistic_write' },
        }),
      );
    });
  });

  // ============================================================================
  // WRITE OFF EXPIRED STOCK TESTS
  // ============================================================================

  describe('writeOffExpiredStock', () => {
    it('should write off all expired batches in warehouse', async () => {
      const expiredBatches = [
        {
          ...mockBatch,
          id: 'exp-1',
          expiry_date: new Date(Date.now() - 1000),
          current_quantity: 50,
          unit_cost: 10,
        },
        {
          ...mockBatch,
          id: 'exp-2',
          expiry_date: new Date(Date.now() - 2000),
          current_quantity: 30,
          unit_cost: 20,
        },
      ];
      batchRepository.find.mockResolvedValue(expiredBatches as InventoryBatch[]);
      batchRepository.save.mockImplementation((batch) => Promise.resolve(batch as InventoryBatch));

      const result = await service.writeOffExpiredStock('warehouse-uuid');

      expect(result.batches_processed).toBe(2);
      expect(result.total_quantity_written_off).toBe(80); // 50 + 30
      expect(result.total_value_written_off).toBe(1100); // (50 * 10) + (30 * 20)
    });

    it('should set batch quantity to 0 and deactivate', async () => {
      const expiredBatch = {
        ...mockBatch,
        expiry_date: new Date(Date.now() - 1000),
        current_quantity: 50,
      };
      batchRepository.find.mockResolvedValue([expiredBatch as InventoryBatch]);
      batchRepository.save.mockImplementation((batch) => Promise.resolve(batch as InventoryBatch));

      await service.writeOffExpiredStock('warehouse-uuid');

      expect(batchRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          current_quantity: 0,
          available_quantity: 0,
          is_active: false,
        }),
      );
    });

    it('should add write-off metadata to batch', async () => {
      const expiredBatch = {
        ...mockBatch,
        expiry_date: new Date(Date.now() - 1000),
        current_quantity: 50,
        unit_cost: 10,
        metadata: { existing: 'data' },
      };
      batchRepository.find.mockResolvedValue([expiredBatch as InventoryBatch]);
      batchRepository.save.mockImplementation((batch) => Promise.resolve(batch as InventoryBatch));

      await service.writeOffExpiredStock('warehouse-uuid');

      expect(batchRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            existing: 'data',
            written_off_at: expect.any(String),
            written_off_reason: 'Expired stock',
            written_off_quantity: 50,
            written_off_value: 500,
          }),
        }),
      );
    });

    it('should return zeros when no expired batches', async () => {
      batchRepository.find.mockResolvedValue([]);

      const result = await service.writeOffExpiredStock('warehouse-uuid');

      expect(result.batches_processed).toBe(0);
      expect(result.total_quantity_written_off).toBe(0);
      expect(result.total_value_written_off).toBe(0);
    });

    it('should handle batches without unit_cost', async () => {
      const expiredBatch = {
        ...mockBatch,
        expiry_date: new Date(Date.now() - 1000),
        current_quantity: 50,
        unit_cost: null,
      };
      batchRepository.find.mockResolvedValue([expiredBatch as InventoryBatch]);
      batchRepository.save.mockImplementation((batch) => Promise.resolve(batch as InventoryBatch));

      const result = await service.writeOffExpiredStock('warehouse-uuid');

      expect(result.total_value_written_off).toBe(0); // 50 * 0
    });
  });

  // ============================================================================
  // GET STOCK SUMMARY TESTS
  // ============================================================================

  describe('getStockSummary', () => {
    it('should return comprehensive stock summary', async () => {
      const batches = [
        { ...mockBatch, current_quantity: 100, unit_cost: 50, is_quarantined: false },
        { ...mockBatch, id: 'b2', current_quantity: 50, unit_cost: 30, is_quarantined: true },
      ];

      // Mock for findAll
      batchRepository.find
        .mockResolvedValueOnce(batches as InventoryBatch[]) // getStockSummary - all batches
        .mockResolvedValueOnce([batches[0]] as InventoryBatch[]) // getExpiringBatches
        .mockResolvedValueOnce([]) as jest.Mock; // getExpiredBatches

      const result = await service.getStockSummary('warehouse-uuid');

      expect(result.total_batches).toBe(2);
      expect(result.total_stock_value).toBe(6500); // (100 * 50) + (50 * 30)
      expect(result.quarantined).toBe(1);
    });

    it('should calculate expiring soon count', async () => {
      const expiringBatch = {
        ...mockBatch,
        expiry_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        current_quantity: 50,
      };

      batchRepository.find
        .mockResolvedValueOnce([expiringBatch] as InventoryBatch[]) // all batches
        .mockResolvedValueOnce([expiringBatch] as InventoryBatch[]) // expiring
        .mockResolvedValueOnce([]) as jest.Mock; // expired

      const result = await service.getStockSummary('warehouse-uuid');

      expect(result.expiring_soon).toBe(1);
    });

    it('should calculate expired count', async () => {
      const expiredBatch = {
        ...mockBatch,
        expiry_date: new Date(Date.now() - 24 * 60 * 60 * 1000),
        current_quantity: 50,
      };

      batchRepository.find
        .mockResolvedValueOnce([expiredBatch as InventoryBatch]) // all batches
        .mockResolvedValueOnce([]) // expiring
        .mockResolvedValueOnce([expiredBatch as InventoryBatch]); // expired

      const result = await service.getStockSummary('warehouse-uuid');

      expect(result.expired).toBe(1);
    });

    it('should return zero values for empty warehouse', async () => {
      batchRepository.find.mockResolvedValue([]);

      const result = await service.getStockSummary('warehouse-uuid');

      expect(result.total_batches).toBe(0);
      expect(result.total_stock_value).toBe(0);
      expect(result.expiring_soon).toBe(0);
      expect(result.expired).toBe(0);
      expect(result.quarantined).toBe(0);
    });

    it('should handle batches without unit_cost in value calculation', async () => {
      const batchWithoutCost = {
        ...mockBatch,
        current_quantity: 100,
        unit_cost: null,
      };
      batchRepository.find
        .mockResolvedValueOnce([batchWithoutCost] as InventoryBatch[])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]) as jest.Mock;

      const result = await service.getStockSummary('warehouse-uuid');

      expect(result.total_stock_value).toBe(0);
    });
  });
});
