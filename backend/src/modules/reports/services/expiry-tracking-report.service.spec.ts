import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ExpiryTrackingReportService,
  ExpiryTrackingReport,
} from './expiry-tracking-report.service';
import { WarehouseInventory } from '@modules/inventory/entities/warehouse-inventory.entity';
import { MachineInventory } from '@modules/inventory/entities/machine-inventory.entity';

describe('ExpiryTrackingReportService', () => {
  let service: ExpiryTrackingReportService;
  let warehouseInventoryRepository: jest.Mocked<Repository<WarehouseInventory>>;
  let machineInventoryRepository: jest.Mocked<Repository<MachineInventory>>;

  // Test fixtures
  const mockNomenclature = {
    id: 'product-uuid',
    name: 'Test Product',
    sku: 'TEST-001',
  };

  const mockNomenclature2 = {
    id: 'product-uuid-2',
    name: 'Test Product 2',
    sku: 'TEST-002',
  };

  const mockLocation = {
    id: 'location-uuid',
    name: 'Test Location',
  };

  const mockMachine = {
    id: 'machine-uuid',
    machine_number: 'M-001',
    name: 'Test Machine',
    location: mockLocation,
  };

  const mockMachineWithoutLocation = {
    id: 'machine-uuid-2',
    machine_number: 'M-002',
    name: 'Test Machine 2',
    location: null,
  };

  const mockMachineInventory = {
    id: 'inventory-uuid',
    current_quantity: 10,
    nomenclature: mockNomenclature,
    machine: mockMachine,
  };

  const mockMachineInventoryNoMachine = {
    id: 'inventory-uuid-2',
    current_quantity: 5,
    nomenclature: mockNomenclature,
    machine: null,
  };

  const mockMachineInventoryNoProduct = {
    id: 'inventory-uuid-3',
    current_quantity: 8,
    nomenclature: null,
    machine: mockMachine,
  };

  const mockMachineInventoryNoLocation = {
    id: 'inventory-uuid-4',
    current_quantity: 15,
    nomenclature: mockNomenclature2,
    machine: mockMachineWithoutLocation,
  };

  const mockMachineInventoryZeroQuantity = {
    id: 'inventory-uuid-5',
    current_quantity: 0,
    nomenclature: mockNomenclature,
    machine: mockMachine,
  };

  const mockMachineInventoryNullQuantity = {
    id: 'inventory-uuid-6',
    current_quantity: null,
    nomenclature: mockNomenclature,
    machine: mockMachine,
  };

  // Mock warehouse batches for testing recommendations
  const createMockWarehouseBatch = (
    status: 'expired' | 'urgent' | 'warning' | 'ok',
    totalValue: number,
    quantity: number,
  ) => ({
    warehouse_id: 'warehouse-uuid',
    warehouse_name: 'Test Warehouse',
    product_id: 'product-uuid',
    product_name: 'Test Product',
    batch_number: 'BATCH-001',
    quantity,
    unit_price: totalValue / quantity,
    total_value: totalValue,
    expiry_date: new Date(),
    days_until_expiry:
      status === 'expired' ? -5 : status === 'urgent' ? 3 : status === 'warning' ? 15 : 60,
    status,
  });

  const createMockQueryBuilder = () => ({
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  });

  beforeEach(async () => {
    const mockWarehouseInventoryRepository = {
      createQueryBuilder: jest.fn(),
    };

    const mockMachineInventoryRepository = {
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpiryTrackingReportService,
        {
          provide: getRepositoryToken(WarehouseInventory),
          useValue: mockWarehouseInventoryRepository,
        },
        { provide: getRepositoryToken(MachineInventory), useValue: mockMachineInventoryRepository },
      ],
    }).compile();

    service = module.get<ExpiryTrackingReportService>(ExpiryTrackingReportService);
    warehouseInventoryRepository = module.get(getRepositoryToken(WarehouseInventory));
    machineInventoryRepository = module.get(getRepositoryToken(MachineInventory));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateReport', () => {
    describe('period configuration', () => {
      it('should generate report with default 90 days ahead', async () => {
        const qb = createMockQueryBuilder();
        qb.getMany.mockResolvedValue([mockMachineInventory]);
        machineInventoryRepository.createQueryBuilder.mockReturnValue(qb as any);

        const result = await service.generateReport();

        expect(result.period.days_ahead).toBe(90);
        expect(result.period.report_date).toBeInstanceOf(Date);
        expect(result.generated_at).toBeInstanceOf(Date);
      });

      it('should accept custom days ahead parameter of 30', async () => {
        const qb = createMockQueryBuilder();
        qb.getMany.mockResolvedValue([]);
        machineInventoryRepository.createQueryBuilder.mockReturnValue(qb as any);

        const result = await service.generateReport(30);

        expect(result.period.days_ahead).toBe(30);
      });

      it('should accept custom days ahead parameter of 7', async () => {
        const qb = createMockQueryBuilder();
        qb.getMany.mockResolvedValue([]);
        machineInventoryRepository.createQueryBuilder.mockReturnValue(qb as any);

        const result = await service.generateReport(7);

        expect(result.period.days_ahead).toBe(7);
      });

      it('should accept custom days ahead parameter of 365', async () => {
        const qb = createMockQueryBuilder();
        qb.getMany.mockResolvedValue([]);
        machineInventoryRepository.createQueryBuilder.mockReturnValue(qb as any);

        const result = await service.generateReport(365);

        expect(result.period.days_ahead).toBe(365);
      });
    });

    describe('summary statistics', () => {
      it('should include all summary fields', async () => {
        const qb = createMockQueryBuilder();
        qb.getMany.mockResolvedValue([mockMachineInventory]);
        machineInventoryRepository.createQueryBuilder.mockReturnValue(qb as any);

        const result = await service.generateReport();

        expect(result.summary).toHaveProperty('total_batches_tracked');
        expect(result.summary).toHaveProperty('expired_batches');
        expect(result.summary).toHaveProperty('expiring_urgent');
        expect(result.summary).toHaveProperty('expiring_warning');
        expect(result.summary).toHaveProperty('total_value_at_risk');
        expect(result.summary).toHaveProperty('total_quantity_at_risk');
      });

      it('should calculate summary totals correctly for empty inventory', async () => {
        const qb = createMockQueryBuilder();
        qb.getMany.mockResolvedValue([]);
        machineInventoryRepository.createQueryBuilder.mockReturnValue(qb as any);

        const result = await service.generateReport();

        expect(result.summary.total_batches_tracked).toBe(0);
        expect(result.summary.expired_batches).toBe(0);
        expect(result.summary.expiring_urgent).toBe(0);
        expect(result.summary.expiring_warning).toBe(0);
        expect(result.summary.total_value_at_risk).toBe(0);
        expect(result.summary.total_quantity_at_risk).toBe(0);
      });

      it('should calculate summary with single inventory item', async () => {
        const qb = createMockQueryBuilder();
        qb.getMany.mockResolvedValue([mockMachineInventory]);
        machineInventoryRepository.createQueryBuilder.mockReturnValue(qb as any);

        const result = await service.generateReport();

        // Since warehouse batches are empty and machine batches don't track expiry
        expect(result.summary.total_batches_tracked).toBe(0);
        expect(result.summary.expired_batches).toBe(0);
        expect(result.summary.expiring_urgent).toBe(0);
        expect(result.summary.expiring_warning).toBe(0);
        expect(result.summary.total_value_at_risk).toBe(0);
        expect(result.summary.total_quantity_at_risk).toBe(0);
      });
    });

    describe('warehouse batches', () => {
      it('should return empty warehouse batches (currently stubbed)', async () => {
        const qb = createMockQueryBuilder();
        qb.getMany.mockResolvedValue([]);
        machineInventoryRepository.createQueryBuilder.mockReturnValue(qb as any);

        const result = await service.generateReport();

        expect(result.warehouse_batches).toEqual([]);
      });
    });

    describe('machine batches', () => {
      it('should return machine batches with complete inventory data', async () => {
        const qb = createMockQueryBuilder();
        qb.getMany.mockResolvedValue([mockMachineInventory]);
        machineInventoryRepository.createQueryBuilder.mockReturnValue(qb as any);

        const result = await service.generateReport();

        expect(result.machine_batches).toHaveLength(1);
        expect(result.machine_batches[0].machine_id).toBe('machine-uuid');
        expect(result.machine_batches[0].machine_number).toBe('M-001');
        expect(result.machine_batches[0].machine_name).toBe('Test Machine');
        expect(result.machine_batches[0].location_name).toBe('Test Location');
        expect(result.machine_batches[0].product_id).toBe('product-uuid');
        expect(result.machine_batches[0].product_name).toBe('Test Product');
        expect(result.machine_batches[0].quantity).toBe(10);
      });

      it('should handle inventory without machine (null machine)', async () => {
        const qb = createMockQueryBuilder();
        qb.getMany.mockResolvedValue([mockMachineInventoryNoMachine]);
        machineInventoryRepository.createQueryBuilder.mockReturnValue(qb as any);

        const result = await service.generateReport();

        expect(result.machine_batches[0].machine_id).toBe('');
        expect(result.machine_batches[0].machine_number).toBe('Unknown');
        expect(result.machine_batches[0].machine_name).toBe('Unknown');
        expect(result.machine_batches[0].location_name).toBe('Unknown');
      });

      it('should handle inventory without nomenclature (null product)', async () => {
        const qb = createMockQueryBuilder();
        qb.getMany.mockResolvedValue([mockMachineInventoryNoProduct]);
        machineInventoryRepository.createQueryBuilder.mockReturnValue(qb as any);

        const result = await service.generateReport();

        expect(result.machine_batches[0].product_id).toBe('');
        expect(result.machine_batches[0].product_name).toBe('Unknown');
      });

      it('should handle inventory without location (null location)', async () => {
        const qb = createMockQueryBuilder();
        qb.getMany.mockResolvedValue([mockMachineInventoryNoLocation]);
        machineInventoryRepository.createQueryBuilder.mockReturnValue(qb as any);

        const result = await service.generateReport();

        expect(result.machine_batches[0].location_name).toBe('Unknown');
      });

      it('should set status to ok for machine batches without expiry tracking', async () => {
        const qb = createMockQueryBuilder();
        qb.getMany.mockResolvedValue([mockMachineInventory]);
        machineInventoryRepository.createQueryBuilder.mockReturnValue(qb as any);

        const result = await service.generateReport();

        expect(result.machine_batches[0].status).toBe('ok');
        expect(result.machine_batches[0].estimated_expiry_date).toBeNull();
        expect(result.machine_batches[0].days_until_expiry).toBeNull();
      });

      it('should handle multiple inventory items', async () => {
        const qb = createMockQueryBuilder();
        qb.getMany.mockResolvedValue([
          mockMachineInventory,
          mockMachineInventoryNoLocation,
          mockMachineInventoryNoMachine,
        ]);
        machineInventoryRepository.createQueryBuilder.mockReturnValue(qb as any);

        const result = await service.generateReport();

        expect(result.machine_batches).toHaveLength(3);
      });

      it('should handle empty inventory list', async () => {
        const qb = createMockQueryBuilder();
        qb.getMany.mockResolvedValue([]);
        machineInventoryRepository.createQueryBuilder.mockReturnValue(qb as any);

        const result = await service.generateReport();

        expect(result.machine_batches).toHaveLength(0);
      });

      it('should convert quantity to number correctly', async () => {
        const inventoryWithDecimalQuantity = {
          ...mockMachineInventory,
          current_quantity: 15.5,
        };
        const qb = createMockQueryBuilder();
        qb.getMany.mockResolvedValue([inventoryWithDecimalQuantity]);
        machineInventoryRepository.createQueryBuilder.mockReturnValue(qb as any);

        const result = await service.generateReport();

        expect(result.machine_batches[0].quantity).toBe(15.5);
        expect(typeof result.machine_batches[0].quantity).toBe('number');
      });

      it('should handle null quantity', async () => {
        const qb = createMockQueryBuilder();
        qb.getMany.mockResolvedValue([mockMachineInventoryNullQuantity]);
        machineInventoryRepository.createQueryBuilder.mockReturnValue(qb as any);

        const result = await service.generateReport();

        expect(result.machine_batches[0].quantity).toBe(0);
      });
    });

    describe('query building', () => {
      it('should query only inventory with positive quantity', async () => {
        const qb = createMockQueryBuilder();
        qb.getMany.mockResolvedValue([]);
        machineInventoryRepository.createQueryBuilder.mockReturnValue(qb as any);

        await service.generateReport();

        expect(qb.where).toHaveBeenCalledWith('mi.current_quantity > 0');
      });

      it('should include correct relations in query', async () => {
        const qb = createMockQueryBuilder();
        qb.getMany.mockResolvedValue([]);
        machineInventoryRepository.createQueryBuilder.mockReturnValue(qb as any);

        await service.generateReport();

        expect(machineInventoryRepository.createQueryBuilder).toHaveBeenCalledWith('mi');
        expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('mi.nomenclature', 'nomenclature');
        expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('mi.machine', 'machine');
        expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('machine.location', 'location');
      });
    });
  });

  describe('generateRecommendations', () => {
    // Access private method for testing
    const callGenerateRecommendations = (
      service: ExpiryTrackingReportService,
      expired: ExpiryTrackingReport['warehouse_batches'],
      urgent: ExpiryTrackingReport['warehouse_batches'],
      warning: ExpiryTrackingReport['warehouse_batches'],
    ) => {
      return (service as any).generateRecommendations(expired, urgent, warning);
    };

    it('should generate low priority recommendation when no issues found', async () => {
      const qb = createMockQueryBuilder();
      qb.getMany.mockResolvedValue([]);
      machineInventoryRepository.createQueryBuilder.mockReturnValue(qb as any);

      const result = await service.generateReport();

      expect(result.recommendations).toHaveLength(1);
      expect(result.recommendations[0].priority).toBe('low');
      expect(result.recommendations[0].affected_batches).toBe(0);
      expect(result.recommendations[0].estimated_loss).toBe(0);
      expect(result.recommendations[0].message).toContain('Критических проблем');
    });

    it('should generate high priority recommendation for expired batches', async () => {
      const expiredBatch = createMockWarehouseBatch('expired', 10000, 5);
      const recommendations = callGenerateRecommendations(service, [expiredBatch], [], []);

      expect(recommendations).toHaveLength(1);
      expect(recommendations[0].priority).toBe('high');
      expect(recommendations[0].affected_batches).toBe(1);
      expect(recommendations[0].estimated_loss).toBe(10000);
      expect(recommendations[0].message).toContain('утилизировать');
      expect(recommendations[0].message).toContain('просроченных');
    });

    it('should generate high priority recommendation for urgent batches', async () => {
      const urgentBatch = createMockWarehouseBatch('urgent', 8000, 4);
      const recommendations = callGenerateRecommendations(service, [], [urgentBatch], []);

      expect(recommendations).toHaveLength(1);
      expect(recommendations[0].priority).toBe('high');
      expect(recommendations[0].affected_batches).toBe(1);
      expect(recommendations[0].estimated_loss).toBe(8000);
      expect(recommendations[0].message).toContain('Срочно реализовать');
      expect(recommendations[0].message).toContain('7 дней');
    });

    it('should generate medium priority recommendation for warning batches', async () => {
      const warningBatch = createMockWarehouseBatch('warning', 5000, 10);
      const recommendations = callGenerateRecommendations(service, [], [], [warningBatch]);

      expect(recommendations).toHaveLength(1);
      expect(recommendations[0].priority).toBe('medium');
      expect(recommendations[0].affected_batches).toBe(1);
      expect(recommendations[0].estimated_loss).toBe(5000);
      expect(recommendations[0].message).toContain('Спланировать');
      expect(recommendations[0].message).toContain('30 дней');
    });

    it('should generate multiple recommendations when multiple issue types exist', async () => {
      const expiredBatch = createMockWarehouseBatch('expired', 10000, 5);
      const urgentBatch = createMockWarehouseBatch('urgent', 8000, 4);
      const warningBatch = createMockWarehouseBatch('warning', 5000, 10);
      const recommendations = callGenerateRecommendations(
        service,
        [expiredBatch],
        [urgentBatch],
        [warningBatch],
      );

      expect(recommendations).toHaveLength(3);
      expect(recommendations[0].priority).toBe('high'); // Expired
      expect(recommendations[1].priority).toBe('high'); // Urgent
      expect(recommendations[2].priority).toBe('medium'); // Warning
    });

    it('should sum estimated loss for multiple batches of same status', async () => {
      const expiredBatch1 = createMockWarehouseBatch('expired', 10000, 5);
      const expiredBatch2 = createMockWarehouseBatch('expired', 15000, 3);
      const recommendations = callGenerateRecommendations(
        service,
        [expiredBatch1, expiredBatch2],
        [],
        [],
      );

      expect(recommendations).toHaveLength(1);
      expect(recommendations[0].affected_batches).toBe(2);
      expect(recommendations[0].estimated_loss).toBe(25000);
    });

    it('should handle empty arrays without generating low priority when other issues exist', async () => {
      const urgentBatch = createMockWarehouseBatch('urgent', 8000, 4);
      const recommendations = callGenerateRecommendations(service, [], [urgentBatch], []);

      // Should only have urgent recommendation, no low priority
      expect(recommendations).toHaveLength(1);
      expect(recommendations[0].priority).toBe('high');
    });

    it('should generate low priority only when all arrays are empty', async () => {
      const recommendations = callGenerateRecommendations(service, [], [], []);

      expect(recommendations).toHaveLength(1);
      expect(recommendations[0].priority).toBe('low');
    });

    it('should correctly count multiple expired batches', async () => {
      const batches = [
        createMockWarehouseBatch('expired', 1000, 1),
        createMockWarehouseBatch('expired', 2000, 2),
        createMockWarehouseBatch('expired', 3000, 3),
      ];
      const recommendations = callGenerateRecommendations(service, batches, [], []);

      expect(recommendations[0].affected_batches).toBe(3);
      expect(recommendations[0].estimated_loss).toBe(6000);
    });

    it('should correctly count multiple urgent batches', async () => {
      const batches = [
        createMockWarehouseBatch('urgent', 1500, 1),
        createMockWarehouseBatch('urgent', 2500, 2),
      ];
      const recommendations = callGenerateRecommendations(service, [], batches, []);

      expect(recommendations[0].affected_batches).toBe(2);
      expect(recommendations[0].estimated_loss).toBe(4000);
    });

    it('should correctly count multiple warning batches', async () => {
      const batches = [
        createMockWarehouseBatch('warning', 500, 5),
        createMockWarehouseBatch('warning', 750, 3),
        createMockWarehouseBatch('warning', 1250, 7),
      ];
      const recommendations = callGenerateRecommendations(service, [], [], batches);

      expect(recommendations[0].affected_batches).toBe(3);
      expect(recommendations[0].estimated_loss).toBe(2500);
    });
  });

  describe('integration scenarios', () => {
    it('should generate complete report structure', async () => {
      const qb = createMockQueryBuilder();
      qb.getMany.mockResolvedValue([mockMachineInventory]);
      machineInventoryRepository.createQueryBuilder.mockReturnValue(qb as any);

      const result = await service.generateReport();

      // Check all top-level properties exist
      expect(result).toHaveProperty('period');
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('warehouse_batches');
      expect(result).toHaveProperty('machine_batches');
      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('generated_at');
    });

    it('should handle large inventory datasets', async () => {
      const largeInventory = Array(100)
        .fill(null)
        .map((_, i) => ({
          ...mockMachineInventory,
          id: `inventory-${i}`,
          current_quantity: i + 1,
        }));
      const qb = createMockQueryBuilder();
      qb.getMany.mockResolvedValue(largeInventory);
      machineInventoryRepository.createQueryBuilder.mockReturnValue(qb as any);

      const result = await service.generateReport();

      expect(result.machine_batches).toHaveLength(100);
    });

    it('should report date be close to current time', async () => {
      const qb = createMockQueryBuilder();
      qb.getMany.mockResolvedValue([]);
      machineInventoryRepository.createQueryBuilder.mockReturnValue(qb as any);

      const before = new Date();
      const result = await service.generateReport();
      const after = new Date();

      expect(result.period.report_date.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.period.report_date.getTime()).toBeLessThanOrEqual(after.getTime());
      expect(result.generated_at.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.generated_at.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should handle inventory with all optional fields null', async () => {
      const minimalInventory = {
        id: 'minimal-inventory',
        current_quantity: 1,
        nomenclature: null,
        machine: null,
      };
      const qb = createMockQueryBuilder();
      qb.getMany.mockResolvedValue([minimalInventory]);
      machineInventoryRepository.createQueryBuilder.mockReturnValue(qb as any);

      const result = await service.generateReport();

      expect(result.machine_batches).toHaveLength(1);
      expect(result.machine_batches[0].machine_id).toBe('');
      expect(result.machine_batches[0].machine_number).toBe('Unknown');
      expect(result.machine_batches[0].machine_name).toBe('Unknown');
      expect(result.machine_batches[0].location_name).toBe('Unknown');
      expect(result.machine_batches[0].product_id).toBe('');
      expect(result.machine_batches[0].product_name).toBe('Unknown');
    });
  });
});
