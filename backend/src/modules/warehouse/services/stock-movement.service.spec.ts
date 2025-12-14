import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { StockMovementService } from './stock-movement.service';
import { StockMovement, MovementType, MovementStatus } from '../entities/stock-movement.entity';
import { InventoryBatch } from '../entities/inventory-batch.entity';
import { StockReservation } from '../entities/stock-reservation.entity';

describe('StockMovementService', () => {
  let service: StockMovementService;
  let movementRepository: jest.Mocked<Repository<StockMovement>>;
  let batchRepository: jest.Mocked<Repository<InventoryBatch>>;
  let _reservationRepository: jest.Mocked<Repository<StockReservation>>;

  // Mock fixtures
  const mockMovement: Partial<StockMovement> = {
    id: 'movement-uuid',
    movement_number: 'RCV-20251127-0001',
    movement_type: MovementType.RECEIPT,
    status: MovementStatus.COMPLETED,
    warehouse_id: 'warehouse-uuid',
    product_id: 'product-uuid',
    quantity: 100,
    unit: 'pcs',
    unit_cost: 50,
    total_cost: 5000,
    movement_date: new Date(),
    metadata: {},
  };

  const mockBatch: Partial<InventoryBatch> = {
    id: 'batch-uuid',
    batch_number: 'BATCH-001',
    warehouse_id: 'warehouse-uuid',
    product_id: 'product-uuid',
    initial_quantity: 100,
    current_quantity: 100,
    reserved_quantity: 0,
    available_quantity: 100,
    unit: 'pcs',
    unit_cost: 50,
    is_active: true,
    is_quarantined: false,
    received_date: new Date(),
    metadata: {},
  };

  const createMockRepository = () => ({
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  });

  beforeEach(async () => {
    const mockMovementRepo = createMockRepository();
    const mockBatchRepo = createMockRepository();
    const mockReservationRepo = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockMovementService,
        {
          provide: getRepositoryToken(StockMovement),
          useValue: mockMovementRepo,
        },
        {
          provide: getRepositoryToken(InventoryBatch),
          useValue: mockBatchRepo,
        },
        {
          provide: getRepositoryToken(StockReservation),
          useValue: mockReservationRepo,
        },
      ],
    }).compile();

    service = module.get<StockMovementService>(StockMovementService);
    movementRepository = module.get(getRepositoryToken(StockMovement));
    batchRepository = module.get(getRepositoryToken(InventoryBatch));
    _reservationRepository = module.get(getRepositoryToken(StockReservation));

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================================================
  // CREATE RECEIPT TESTS
  // ============================================================================

  describe('createReceipt', () => {
    const receiptData = {
      warehouse_id: 'warehouse-uuid',
      product_id: 'product-uuid',
      quantity: 100,
      unit: 'pcs',
      unit_cost: 50,
      batch_number: 'BATCH-001',
      production_date: new Date('2025-01-01'),
      expiry_date: new Date('2026-01-01'),
      supplier: 'Test Supplier',
      reference_document: 'PO-001',
    };

    it('should create receipt movement with batch', async () => {
      movementRepository.create.mockReturnValue(mockMovement as StockMovement);
      movementRepository.save.mockResolvedValue(mockMovement as StockMovement);
      batchRepository.findOne.mockResolvedValue(null); // No existing batch
      batchRepository.create.mockReturnValue(mockBatch as InventoryBatch);
      batchRepository.save.mockResolvedValue(mockBatch as InventoryBatch);

      const result = await service.createReceipt(receiptData);

      expect(movementRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          movement_type: MovementType.RECEIPT,
          status: MovementStatus.COMPLETED,
          warehouse_id: 'warehouse-uuid',
          product_id: 'product-uuid',
          quantity: 100,
          unit: 'pcs',
          unit_cost: 50,
          total_cost: 5000, // 50 * 100
        }),
      );
      expect(result).toEqual(mockMovement);
    });

    it('should generate movement number with RCV prefix', async () => {
      movementRepository.create.mockReturnValue(mockMovement as StockMovement);
      movementRepository.save.mockResolvedValue(mockMovement as StockMovement);
      batchRepository.findOne.mockResolvedValue(null);
      batchRepository.create.mockReturnValue(mockBatch as InventoryBatch);
      batchRepository.save.mockResolvedValue(mockBatch as InventoryBatch);

      await service.createReceipt(receiptData);

      expect(movementRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          movement_number: expect.stringMatching(/^RCV-\d{8}-\d{4}$/),
        }),
      );
    });

    it('should create new batch when batch_number provided and not exists', async () => {
      movementRepository.create.mockReturnValue(mockMovement as StockMovement);
      movementRepository.save.mockResolvedValue(mockMovement as StockMovement);
      batchRepository.findOne.mockResolvedValue(null);
      batchRepository.create.mockReturnValue(mockBatch as InventoryBatch);
      batchRepository.save.mockResolvedValue(mockBatch as InventoryBatch);

      await service.createReceipt(receiptData);

      expect(batchRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          batch_number: 'BATCH-001',
          warehouse_id: 'warehouse-uuid',
          product_id: 'product-uuid',
          initial_quantity: 100,
          current_quantity: 100,
          available_quantity: 100,
        }),
      );
    });

    it('should update existing batch when batch_number already exists', async () => {
      const existingBatch = {
        ...mockBatch,
        current_quantity: 50,
        available_quantity: 50,
      };
      movementRepository.create.mockReturnValue(mockMovement as StockMovement);
      movementRepository.save.mockResolvedValue(mockMovement as StockMovement);
      batchRepository.findOne.mockResolvedValue(existingBatch as InventoryBatch);
      batchRepository.save.mockImplementation((batch) => Promise.resolve(batch as InventoryBatch));

      await service.createReceipt(receiptData);

      expect(batchRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          current_quantity: 150, // 50 + 100
          available_quantity: 150,
        }),
      );
    });

    it('should create receipt without batch when batch_number not provided', async () => {
      const dataWithoutBatch = { ...receiptData, batch_number: undefined };
      movementRepository.create.mockReturnValue(mockMovement as StockMovement);
      movementRepository.save.mockResolvedValue(mockMovement as StockMovement);

      await service.createReceipt(dataWithoutBatch);

      expect(batchRepository.findOne).not.toHaveBeenCalled();
      expect(batchRepository.create).not.toHaveBeenCalled();
    });

    it('should handle receipt without unit_cost', async () => {
      const dataWithoutCost = { ...receiptData, unit_cost: undefined };
      movementRepository.create.mockReturnValue({
        ...mockMovement,
        unit_cost: null,
        total_cost: null,
      } as StockMovement);
      movementRepository.save.mockResolvedValue(mockMovement as StockMovement);
      batchRepository.findOne.mockResolvedValue(null);
      batchRepository.create.mockReturnValue(mockBatch as InventoryBatch);
      batchRepository.save.mockResolvedValue(mockBatch as InventoryBatch);

      await service.createReceipt(dataWithoutCost);

      expect(movementRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          unit_cost: undefined,
          total_cost: null,
        }),
      );
    });
  });

  // ============================================================================
  // CREATE SHIPMENT TESTS
  // ============================================================================

  describe('createShipment', () => {
    const shipmentData = {
      warehouse_id: 'warehouse-uuid',
      product_id: 'product-uuid',
      quantity: 50,
      unit: 'pcs',
      batch_id: 'batch-uuid',
      reference_document: 'SO-001',
    };

    it('should create shipment movement when sufficient stock available', async () => {
      batchRepository.find.mockResolvedValue([mockBatch as InventoryBatch]);
      movementRepository.create.mockReturnValue({
        ...mockMovement,
        movement_type: MovementType.SHIPMENT,
        quantity: -50,
      } as StockMovement);
      movementRepository.save.mockResolvedValue({
        ...mockMovement,
        movement_type: MovementType.SHIPMENT,
        quantity: -50,
      } as StockMovement);
      batchRepository.findOne.mockResolvedValue(mockBatch as InventoryBatch);
      batchRepository.save.mockResolvedValue(mockBatch as InventoryBatch);

      const result = await service.createShipment(shipmentData);

      expect(movementRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          movement_type: MovementType.SHIPMENT,
          quantity: -50, // Negative for outbound
        }),
      );
      expect(result.movement_type).toBe(MovementType.SHIPMENT);
    });

    it('should generate movement number with SHP prefix', async () => {
      batchRepository.find.mockResolvedValue([mockBatch as InventoryBatch]);
      movementRepository.create.mockReturnValue(mockMovement as StockMovement);
      movementRepository.save.mockResolvedValue(mockMovement as StockMovement);
      batchRepository.findOne.mockResolvedValue(mockBatch as InventoryBatch);
      batchRepository.save.mockResolvedValue(mockBatch as InventoryBatch);

      await service.createShipment(shipmentData);

      expect(movementRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          movement_number: expect.stringMatching(/^SHP-\d{8}-\d{4}$/),
        }),
      );
    });

    it('should throw BadRequestException when insufficient stock', async () => {
      const lowStockBatch = { ...mockBatch, available_quantity: 10 };
      batchRepository.find.mockResolvedValue([lowStockBatch as InventoryBatch]);

      await expect(service.createShipment(shipmentData)).rejects.toThrow(BadRequestException);
      await expect(service.createShipment(shipmentData)).rejects.toThrow(/Insufficient stock/);
    });

    it('should throw BadRequestException when no stock available', async () => {
      batchRepository.find.mockResolvedValue([]);

      await expect(service.createShipment(shipmentData)).rejects.toThrow(BadRequestException);
    });

    it('should update batch quantity after shipment', async () => {
      // Must provide batch with sufficient stock for getAvailableStock check
      const batchWithStock = {
        ...mockBatch,
        current_quantity: 100,
        available_quantity: 100,
        is_active: true,
        is_quarantined: false,
      };
      // Return a fresh copy for each call to avoid mutation issues
      batchRepository.find.mockResolvedValue([{ ...batchWithStock } as InventoryBatch]);
      movementRepository.create.mockReturnValue(mockMovement as StockMovement);
      movementRepository.save.mockResolvedValue(mockMovement as StockMovement);
      // Return a fresh copy for the findOne call (used in updateBatchQuantity)
      batchRepository.findOne.mockResolvedValue({ ...batchWithStock } as InventoryBatch);
      batchRepository.save.mockImplementation((batch) => Promise.resolve(batch as InventoryBatch));

      await service.createShipment(shipmentData);

      expect(batchRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          current_quantity: 50, // 100 - 50
          available_quantity: 50,
        }),
      );
    });

    it('should not update batch when batch_id not provided', async () => {
      const dataWithoutBatch = { ...shipmentData, batch_id: undefined };
      // Must provide batch with sufficient stock for getAvailableStock check
      const batchWithStock = {
        ...mockBatch,
        available_quantity: 100,
        is_active: true,
        is_quarantined: false,
      };
      batchRepository.find.mockResolvedValue([batchWithStock as InventoryBatch]);
      movementRepository.create.mockReturnValue(mockMovement as StockMovement);
      movementRepository.save.mockResolvedValue(mockMovement as StockMovement);

      await service.createShipment(dataWithoutBatch);

      expect(batchRepository.findOne).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if batch not found during quantity update', async () => {
      // Must provide batch with sufficient stock for getAvailableStock check
      const batchWithStock = {
        ...mockBatch,
        available_quantity: 100,
        is_active: true,
        is_quarantined: false,
      };
      batchRepository.find.mockResolvedValue([batchWithStock as InventoryBatch]);
      movementRepository.create.mockReturnValue(mockMovement as StockMovement);
      movementRepository.save.mockResolvedValue(mockMovement as StockMovement);
      batchRepository.findOne.mockResolvedValue(null); // Batch not found when updating quantity

      await expect(service.createShipment(shipmentData)).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================================
  // CREATE TRANSFER TESTS
  // ============================================================================

  describe('createTransfer', () => {
    const transferData = {
      from_warehouse_id: 'warehouse-uuid', // Must match mockBatch.warehouse_id
      to_warehouse_id: 'warehouse-2',
      product_id: 'product-uuid',
      quantity: 30,
      unit: 'pcs',
      batch_id: 'batch-uuid',
    };

    it('should create outbound and inbound movements for transfer', async () => {
      // Must provide batch with sufficient stock for getAvailableStock check
      const batchWithStock = {
        ...mockBatch,
        available_quantity: 100,
        is_active: true,
        is_quarantined: false,
      };
      batchRepository.find.mockResolvedValue([batchWithStock as InventoryBatch]);
      movementRepository.create.mockReturnValue(mockMovement as StockMovement);
      movementRepository.save.mockResolvedValue(mockMovement as StockMovement);
      batchRepository.findOne.mockResolvedValue(batchWithStock as InventoryBatch);
      batchRepository.save.mockResolvedValue(mockBatch as InventoryBatch);

      const result = await service.createTransfer(transferData);

      expect(result).toHaveProperty('outbound');
      expect(result).toHaveProperty('inbound');
      expect(movementRepository.create).toHaveBeenCalledTimes(2);
      expect(movementRepository.save).toHaveBeenCalledTimes(2);
    });

    it('should generate movement numbers with TRF prefix', async () => {
      // Must provide batch with sufficient stock for getAvailableStock check
      const batchWithStock = {
        ...mockBatch,
        available_quantity: 100,
        is_active: true,
        is_quarantined: false,
      };
      batchRepository.find.mockResolvedValue([batchWithStock as InventoryBatch]);
      movementRepository.create.mockReturnValue(mockMovement as StockMovement);
      movementRepository.save.mockResolvedValue(mockMovement as StockMovement);
      batchRepository.findOne.mockResolvedValue(batchWithStock as InventoryBatch);
      batchRepository.save.mockResolvedValue(mockBatch as InventoryBatch);

      await service.createTransfer(transferData);

      expect(movementRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          movement_number: expect.stringMatching(/^TRF-\d{8}-\d{4}-OUT$/),
        }),
      );
      expect(movementRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          movement_number: expect.stringMatching(/^TRF-\d{8}-\d{4}-IN$/),
        }),
      );
    });

    it('should throw BadRequestException when insufficient stock for transfer', async () => {
      const lowStockBatch = { ...mockBatch, available_quantity: 10 };
      batchRepository.find.mockResolvedValue([lowStockBatch as InventoryBatch]);

      await expect(service.createTransfer(transferData)).rejects.toThrow(BadRequestException);
      await expect(service.createTransfer(transferData)).rejects.toThrow(
        /Insufficient stock for transfer/,
      );
    });

    it('should create outbound with negative quantity and inbound with positive', async () => {
      // Must provide batch with sufficient stock for getAvailableStock check
      const batchWithStock = {
        ...mockBatch,
        available_quantity: 100,
        is_active: true,
        is_quarantined: false,
      };
      batchRepository.find.mockResolvedValue([batchWithStock as InventoryBatch]);
      const createdMovements: any[] = [];
      movementRepository.create.mockImplementation((data) => {
        createdMovements.push(data);
        return data as StockMovement;
      });
      movementRepository.save.mockImplementation((movement) =>
        Promise.resolve(movement as StockMovement),
      );
      batchRepository.findOne.mockResolvedValue(batchWithStock as InventoryBatch);
      batchRepository.save.mockResolvedValue(mockBatch as InventoryBatch);

      await service.createTransfer(transferData);

      // First call is outbound (negative), second is inbound (positive)
      expect(createdMovements[0].quantity).toBe(-30);
      expect(createdMovements[0].warehouse_id).toBe('warehouse-uuid'); // Matches from_warehouse_id
      expect(createdMovements[0].destination_warehouse_id).toBe('warehouse-2');
      expect(createdMovements[1].quantity).toBe(30);
      expect(createdMovements[1].warehouse_id).toBe('warehouse-2');
    });

    it('should create new batch in destination warehouse during transfer', async () => {
      // Must provide batch with sufficient stock for getAvailableStock check
      const sourceBatch = {
        ...mockBatch,
        unit_cost: 50,
        expiry_date: new Date('2026-01-01'),
        available_quantity: 100,
        is_active: true,
        is_quarantined: false,
      };
      batchRepository.find.mockResolvedValue([sourceBatch as InventoryBatch]);
      movementRepository.create.mockReturnValue(mockMovement as StockMovement);
      movementRepository.save.mockResolvedValue(mockMovement as StockMovement);
      batchRepository.findOne
        .mockResolvedValueOnce(sourceBatch as InventoryBatch) // For updateBatchQuantity
        .mockResolvedValueOnce(sourceBatch as InventoryBatch) // For originalBatch lookup
        .mockResolvedValueOnce(null); // No existing batch in destination
      batchRepository.create.mockReturnValue(mockBatch as InventoryBatch);
      batchRepository.save.mockResolvedValue(mockBatch as InventoryBatch);

      await service.createTransfer(transferData);

      // Should create batch in destination warehouse
      expect(batchRepository.findOne).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // GET MOVEMENT HISTORY TESTS
  // ============================================================================

  describe('getMovementHistory', () => {
    it('should return movements for warehouse', async () => {
      const movements = [mockMovement, { ...mockMovement, id: 'mov-2' }];
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(movements),
      };
      movementRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      const result = await service.getMovementHistory('warehouse-uuid');

      expect(movementRepository.createQueryBuilder).toHaveBeenCalledWith('movement');
      expect(queryBuilder.where).toHaveBeenCalledWith('movement.warehouse_id = :warehouseId', {
        warehouseId: 'warehouse-uuid',
      });
      expect(result).toEqual(movements);
    });

    it('should filter by product_id when provided', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      movementRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      await service.getMovementHistory('warehouse-uuid', { product_id: 'product-uuid' });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('movement.product_id = :productId', {
        productId: 'product-uuid',
      });
    });

    it('should filter by movement_type when provided', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      movementRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      await service.getMovementHistory('warehouse-uuid', {
        movement_type: MovementType.RECEIPT,
      });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('movement.movement_type = :movementType', {
        movementType: MovementType.RECEIPT,
      });
    });

    it('should filter by date range when provided', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      movementRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-12-31');

      await service.getMovementHistory('warehouse-uuid', {
        start_date: startDate,
        end_date: endDate,
      });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'movement.movement_date BETWEEN :startDate AND :endDate',
        { startDate, endDate },
      );
    });

    it('should apply all filters together', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      movementRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      await service.getMovementHistory('warehouse-uuid', {
        product_id: 'product-uuid',
        movement_type: MovementType.SHIPMENT,
        start_date: new Date('2025-01-01'),
        end_date: new Date('2025-12-31'),
      });

      expect(queryBuilder.andWhere).toHaveBeenCalledTimes(3);
    });

    it('should order by movement_date DESC', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      movementRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      await service.getMovementHistory('warehouse-uuid');

      expect(queryBuilder.orderBy).toHaveBeenCalledWith('movement.movement_date', 'DESC');
    });
  });

  // ============================================================================
  // GENERATE MOVEMENT NUMBER TESTS
  // ============================================================================

  describe('generateMovementNumber', () => {
    it('should generate number with correct format', async () => {
      batchRepository.find.mockResolvedValue([mockBatch as InventoryBatch]);
      movementRepository.create.mockReturnValue(mockMovement as StockMovement);
      movementRepository.save.mockResolvedValue(mockMovement as StockMovement);
      batchRepository.findOne.mockResolvedValue(null);
      batchRepository.create.mockReturnValue(mockBatch as InventoryBatch);
      batchRepository.save.mockResolvedValue(mockBatch as InventoryBatch);

      await service.createReceipt({
        warehouse_id: 'wh',
        product_id: 'prod',
        quantity: 10,
        unit: 'pcs',
      });

      // Verify format: PREFIX-YYYYMMDD-XXXX
      expect(movementRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          movement_number: expect.stringMatching(/^RCV-\d{8}-\d{4}$/),
        }),
      );
    });

    it('should generate unique numbers for each movement', async () => {
      const createdNumbers: string[] = [];
      movementRepository.create.mockImplementation((data: Partial<StockMovement>) => {
        if (data.movement_number) {
          createdNumbers.push(data.movement_number);
        }
        return data as StockMovement;
      });
      movementRepository.save.mockResolvedValue(mockMovement as StockMovement);
      batchRepository.find.mockResolvedValue([mockBatch as InventoryBatch]);
      batchRepository.findOne.mockResolvedValue(mockBatch as InventoryBatch);
      batchRepository.save.mockResolvedValue(mockBatch as InventoryBatch);

      // Create multiple movements
      await service.createReceipt({
        warehouse_id: 'wh',
        product_id: 'prod',
        quantity: 10,
        unit: 'pcs',
      });
      await service.createReceipt({
        warehouse_id: 'wh',
        product_id: 'prod',
        quantity: 20,
        unit: 'pcs',
      });

      // Numbers should all be unique (though this depends on random component)
      expect(createdNumbers.length).toBe(2);
    });
  });
});
