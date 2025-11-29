import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WarehouseInventoryReportService } from './warehouse-inventory-report.service';
import { Warehouse } from '@modules/warehouse/entities/warehouse.entity';
import { WarehouseInventory } from '@modules/inventory/entities/warehouse-inventory.entity';
import { InventoryMovement } from '@modules/inventory/entities/inventory-movement.entity';
import { InventoryBatch } from '@modules/warehouse/entities/inventory-batch.entity';

describe('WarehouseInventoryReportService', () => {
  let service: WarehouseInventoryReportService;
  let mockWarehouseRepository: any;
  let mockWarehouseInventoryRepository: any;
  let mockMovementRepository: any;
  let mockBatchRepository: any;
  let movementQueryBuilder: any;

  const warehouseId = 'warehouse-123';
  const startDate = new Date('2025-01-01');
  const endDate = new Date('2025-01-31');

  beforeEach(async () => {
    movementQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue(null),
      getRawMany: jest.fn().mockResolvedValue([]),
    };

    mockWarehouseRepository = {
      findOne: jest.fn().mockResolvedValue(null),
    };

    mockWarehouseInventoryRepository = {
      find: jest.fn().mockResolvedValue([]),
    };

    mockMovementRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(movementQueryBuilder),
    };

    mockBatchRepository = {
      find: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WarehouseInventoryReportService,
        {
          provide: getRepositoryToken(Warehouse),
          useValue: mockWarehouseRepository,
        },
        {
          provide: getRepositoryToken(WarehouseInventory),
          useValue: mockWarehouseInventoryRepository,
        },
        {
          provide: getRepositoryToken(InventoryMovement),
          useValue: mockMovementRepository,
        },
        {
          provide: getRepositoryToken(InventoryBatch),
          useValue: mockBatchRepository,
        },
      ],
    }).compile();

    service = module.get<WarehouseInventoryReportService>(WarehouseInventoryReportService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateReport', () => {
    it('should throw error when warehouse not found', async () => {
      mockWarehouseRepository.findOne.mockResolvedValue(null);

      await expect(service.generateReport(warehouseId, startDate, endDate)).rejects.toThrow(
        `Warehouse with ID ${warehouseId} not found`,
      );
    });

    it('should generate a complete report', async () => {
      const mockWarehouse = {
        id: warehouseId,
        name: 'Main Warehouse',
        address: '123 Main St',
        location: null,
      };

      mockWarehouseRepository.findOne.mockResolvedValue(mockWarehouse);
      mockWarehouseInventoryRepository.find.mockResolvedValue([]);
      movementQueryBuilder.getRawOne.mockResolvedValue({
        total: '0',
        inbound: '0',
        outbound: '0',
        adjustments: '0',
      });
      mockBatchRepository.find.mockResolvedValue([]);

      const result = await service.generateReport(warehouseId, startDate, endDate);

      expect(result).toBeDefined();
      expect(result.warehouse.id).toBe(warehouseId);
      expect(result.warehouse.name).toBe('Main Warehouse');
      expect(result.warehouse.location).toBe('123 Main St');
      expect(result.period.start_date).toEqual(startDate);
      expect(result.period.end_date).toEqual(endDate);
      expect(result.current_stock).toBeDefined();
      expect(result.movements).toBeDefined();
      expect(result.expiry_tracking).toBeDefined();
      expect(result.generated_at).toBeInstanceOf(Date);
    });

    it('should use location address when warehouse address is not set', async () => {
      const mockWarehouse = {
        id: warehouseId,
        name: 'Main Warehouse',
        address: null,
        location: { address: '456 Secondary St' },
      };

      mockWarehouseRepository.findOne.mockResolvedValue(mockWarehouse);
      movementQueryBuilder.getRawOne.mockResolvedValue({});

      const result = await service.generateReport(warehouseId, startDate, endDate);

      expect(result.warehouse.location).toBe('456 Secondary St');
    });

    it('should return empty string when no address available', async () => {
      const mockWarehouse = {
        id: warehouseId,
        name: 'Main Warehouse',
        address: null,
        location: null,
      };

      mockWarehouseRepository.findOne.mockResolvedValue(mockWarehouse);
      movementQueryBuilder.getRawOne.mockResolvedValue({});

      const result = await service.generateReport(warehouseId, startDate, endDate);

      expect(result.warehouse.location).toBe('');
    });

    it('should calculate current stock correctly', async () => {
      const mockWarehouse = {
        id: warehouseId,
        name: 'Main Warehouse',
        address: '123 Main St',
      };

      const mockInventory = [
        {
          current_quantity: 100,
          reserved_quantity: 20,
          min_stock_level: 10,
          nomenclature: { name: 'Product A', purchase_price: 5 },
        },
        {
          current_quantity: 5,
          reserved_quantity: 0,
          min_stock_level: 10,
          nomenclature: { name: 'Product B', purchase_price: 10 },
        },
        {
          current_quantity: 0,
          reserved_quantity: 0,
          min_stock_level: 5,
          nomenclature: { name: 'Product C', purchase_price: 15 },
        },
      ];

      mockWarehouseRepository.findOne.mockResolvedValue(mockWarehouse);
      mockWarehouseInventoryRepository.find.mockResolvedValue(mockInventory);
      movementQueryBuilder.getRawOne.mockResolvedValue({});

      const result = await service.generateReport(warehouseId, startDate, endDate);

      expect(result.current_stock.total_items).toBe(3);
      expect(result.current_stock.total_value).toBe(550); // 100*5 + 5*10 + 0*15
      expect(result.current_stock.low_stock_items).toBe(1); // Product B
      expect(result.current_stock.out_of_stock_items).toBe(1); // Product C

      // Items should be sorted by total_value descending
      expect(result.current_stock.items[0].product_name).toBe('Product A');
      expect(result.current_stock.items[0].total_value).toBe(500);
      expect(result.current_stock.items[0].status).toBe('ok');
      expect(result.current_stock.items[0].available_quantity).toBe(80);

      expect(result.current_stock.items[1].product_name).toBe('Product B');
      expect(result.current_stock.items[1].status).toBe('low');

      expect(result.current_stock.items[2].product_name).toBe('Product C');
      expect(result.current_stock.items[2].status).toBe('out');
    });

    it('should handle null values in inventory items', async () => {
      const mockWarehouse = {
        id: warehouseId,
        name: 'Main Warehouse',
        address: '123 Main St',
      };

      const mockInventory = [
        {
          current_quantity: null,
          reserved_quantity: null,
          min_stock_level: null,
          nomenclature: null,
        },
      ];

      mockWarehouseRepository.findOne.mockResolvedValue(mockWarehouse);
      mockWarehouseInventoryRepository.find.mockResolvedValue(mockInventory);
      movementQueryBuilder.getRawOne.mockResolvedValue({});

      const result = await service.generateReport(warehouseId, startDate, endDate);

      expect(result.current_stock.items[0].product_name).toBe('Unknown');
      expect(result.current_stock.items[0].current_quantity).toBe(0);
      expect(result.current_stock.items[0].reserved_quantity).toBe(0);
      expect(result.current_stock.items[0].min_stock_level).toBe(0);
      expect(result.current_stock.items[0].unit_price).toBe(0);
      expect(result.current_stock.items[0].status).toBe('out');
    });

    it('should calculate movements correctly', async () => {
      const mockWarehouse = {
        id: warehouseId,
        name: 'Main Warehouse',
        address: '123 Main St',
      };

      mockWarehouseRepository.findOne.mockResolvedValue(mockWarehouse);

      movementQueryBuilder.getRawOne.mockResolvedValue({
        total: '50',
        inbound: '20',
        outbound: '25',
        adjustments: '5',
      });

      movementQueryBuilder.getRawMany.mockResolvedValue([
        { type: 'in', count: '20', total_quantity: '500' },
        { type: 'out', count: '25', total_quantity: '600' },
        { type: 'adjustment', count: '5', total_quantity: '50' },
      ]);

      const result = await service.generateReport(warehouseId, startDate, endDate);

      expect(result.movements.total_movements).toBe(50);
      expect(result.movements.inbound).toBe(20);
      expect(result.movements.outbound).toBe(25);
      expect(result.movements.adjustments).toBe(5);
      expect(result.movements.by_type).toHaveLength(3);
      expect(result.movements.by_type[0].type).toBe('in');
      expect(result.movements.by_type[0].count).toBe(20);
      expect(result.movements.by_type[0].total_quantity).toBe(500);
    });

    it('should handle null movement values', async () => {
      const mockWarehouse = {
        id: warehouseId,
        name: 'Main Warehouse',
        address: '123 Main St',
      };

      mockWarehouseRepository.findOne.mockResolvedValue(mockWarehouse);
      movementQueryBuilder.getRawOne.mockResolvedValue(null);
      movementQueryBuilder.getRawMany.mockResolvedValue([
        { type: 'in', count: '5', total_quantity: null },
      ]);

      const result = await service.generateReport(warehouseId, startDate, endDate);

      expect(result.movements.total_movements).toBe(0);
      expect(result.movements.inbound).toBe(0);
      expect(result.movements.by_type[0].total_quantity).toBe(0);
    });

    it('should calculate expiry tracking correctly', async () => {
      const mockWarehouse = {
        id: warehouseId,
        name: 'Main Warehouse',
        address: '123 Main St',
      };

      const now = new Date();
      const expiredDate = new Date(now);
      expiredDate.setDate(expiredDate.getDate() - 5);

      const urgentDate = new Date(now);
      urgentDate.setDate(urgentDate.getDate() + 3);

      const warningDate = new Date(now);
      warningDate.setDate(warningDate.getDate() + 15);

      const okDate = new Date(now);
      okDate.setDate(okDate.getDate() + 60);

      const mockBatches = [
        {
          batch_number: 'BATCH-001',
          product_id: 'prod-1',
          expiry_date: expiredDate,
          current_quantity: 10,
          is_active: true,
        },
        {
          batch_number: 'BATCH-002',
          product_id: 'prod-2',
          expiry_date: urgentDate,
          current_quantity: 20,
          is_active: true,
        },
        {
          batch_number: 'BATCH-003',
          product_id: 'prod-3',
          expiry_date: warningDate,
          current_quantity: 30,
          is_active: true,
        },
        {
          batch_number: 'BATCH-004',
          product_id: 'prod-4',
          expiry_date: okDate,
          current_quantity: 40,
          is_active: true,
        },
        {
          batch_number: 'BATCH-005',
          product_id: 'prod-5',
          expiry_date: null, // No expiry date
          current_quantity: 50,
          is_active: true,
        },
      ];

      mockWarehouseRepository.findOne.mockResolvedValue(mockWarehouse);
      mockBatchRepository.find.mockResolvedValue(mockBatches);
      movementQueryBuilder.getRawOne.mockResolvedValue({});

      const result = await service.generateReport(warehouseId, startDate, endDate);

      expect(result.expiry_tracking.total_batches).toBe(5);
      expect(result.expiry_tracking.expired).toBe(1);
      expect(result.expiry_tracking.expiring_soon).toBe(2); // urgent + warning

      // Should be sorted by days_until_expiry
      expect(result.expiry_tracking.batches).toHaveLength(4); // Excludes null expiry date
      expect(result.expiry_tracking.batches[0].batch_number).toBe('BATCH-001');
      expect(result.expiry_tracking.batches[0].status).toBe('expired');
      expect(result.expiry_tracking.batches[0].days_until_expiry).toBeLessThan(0);

      expect(result.expiry_tracking.batches[1].batch_number).toBe('BATCH-002');
      expect(result.expiry_tracking.batches[1].status).toBe('urgent');

      expect(result.expiry_tracking.batches[2].batch_number).toBe('BATCH-003');
      expect(result.expiry_tracking.batches[2].status).toBe('warning');

      expect(result.expiry_tracking.batches[3].batch_number).toBe('BATCH-004');
      expect(result.expiry_tracking.batches[3].status).toBe('ok');
    });

    it('should handle null current_quantity in batches', async () => {
      const mockWarehouse = {
        id: warehouseId,
        name: 'Main Warehouse',
        address: '123 Main St',
      };

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 60);

      const mockBatches = [
        {
          batch_number: 'BATCH-001',
          product_id: 'prod-1',
          expiry_date: futureDate,
          current_quantity: null,
          is_active: true,
        },
      ];

      mockWarehouseRepository.findOne.mockResolvedValue(mockWarehouse);
      mockBatchRepository.find.mockResolvedValue(mockBatches);
      movementQueryBuilder.getRawOne.mockResolvedValue({});

      const result = await service.generateReport(warehouseId, startDate, endDate);

      expect(result.expiry_tracking.batches[0].quantity).toBe(0);
    });

    it('should return empty batches when no batches exist', async () => {
      const mockWarehouse = {
        id: warehouseId,
        name: 'Main Warehouse',
        address: '123 Main St',
      };

      mockWarehouseRepository.findOne.mockResolvedValue(mockWarehouse);
      mockBatchRepository.find.mockResolvedValue([]);
      movementQueryBuilder.getRawOne.mockResolvedValue({});

      const result = await service.generateReport(warehouseId, startDate, endDate);

      expect(result.expiry_tracking.total_batches).toBe(0);
      expect(result.expiry_tracking.expiring_soon).toBe(0);
      expect(result.expiry_tracking.expired).toBe(0);
      expect(result.expiry_tracking.batches).toHaveLength(0);
    });
  });
});
