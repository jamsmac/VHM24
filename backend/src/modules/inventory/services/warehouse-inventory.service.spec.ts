import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource, SelectQueryBuilder } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WarehouseInventoryService } from './warehouse-inventory.service';
import { WarehouseInventory } from '../entities/warehouse-inventory.entity';
import { InventoryMovement, MovementType } from '../entities/inventory-movement.entity';
import { InventoryMovementService } from './inventory-movement.service';

describe('WarehouseInventoryService', () => {
  let service: WarehouseInventoryService;
  let warehouseInventoryRepository: jest.Mocked<Repository<WarehouseInventory>>;
  let movementService: jest.Mocked<InventoryMovementService>;

  const mockUserId = 'user-123';
  const mockNomenclatureId = 'nom-456';

  const createMockInventory = (overrides: Partial<WarehouseInventory> = {}): WarehouseInventory =>
    ({
      id: 'inv-789',
      nomenclature_id: mockNomenclatureId,
      current_quantity: 100,
      reserved_quantity: 0,
      min_stock_level: 10,
      last_restocked_at: new Date(),
      ...overrides,
    }) as WarehouseInventory;

  const createMockQueryBuilder = () => {
    const qb = {
      leftJoin: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<SelectQueryBuilder<WarehouseInventory>>;
    return qb;
  };

  beforeEach(async () => {
    const mockTransactionManager = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn().mockImplementation((entity, data) => ({ ...data })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WarehouseInventoryService,
        {
          provide: getRepositoryToken(WarehouseInventory),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn().mockImplementation((data) => ({ ...data })),
            save: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(createMockQueryBuilder()),
          },
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn((callback) => callback(mockTransactionManager)),
          },
        },
        {
          provide: InventoryMovementService,
          useValue: {
            createMovement: jest.fn().mockResolvedValue({}),
          },
        },
      ],
    }).compile();

    service = module.get<WarehouseInventoryService>(WarehouseInventoryService);
    warehouseInventoryRepository = module.get(getRepositoryToken(WarehouseInventory));
    movementService = module.get(InventoryMovementService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getWarehouseInventory', () => {
    it('should return all warehouse inventory ordered by nomenclature name', async () => {
      const mockInventories = [createMockInventory(), createMockInventory({ id: 'inv-2' })];

      warehouseInventoryRepository.find.mockResolvedValue(mockInventories);

      const result = await service.getWarehouseInventory();

      expect(result).toEqual(mockInventories);
      expect(warehouseInventoryRepository.find).toHaveBeenCalledWith({
        order: { nomenclature: { name: 'ASC' } },
      });
    });
  });

  describe('getWarehouseInventoryByNomenclature', () => {
    it('should return existing inventory', async () => {
      const mockInventory = createMockInventory();
      warehouseInventoryRepository.findOne.mockResolvedValue(mockInventory);

      const result = await service.getWarehouseInventoryByNomenclature(mockNomenclatureId);

      expect(result).toEqual(mockInventory);
      expect(warehouseInventoryRepository.findOne).toHaveBeenCalledWith({
        where: { nomenclature_id: mockNomenclatureId },
      });
    });

    it('should create new inventory with zero quantity if not exists', async () => {
      const newInventory = createMockInventory({ current_quantity: 0 });
      warehouseInventoryRepository.findOne.mockResolvedValue(null);
      warehouseInventoryRepository.create.mockReturnValue(newInventory);
      warehouseInventoryRepository.save.mockResolvedValue(newInventory);

      const result = await service.getWarehouseInventoryByNomenclature(mockNomenclatureId);

      expect(warehouseInventoryRepository.create).toHaveBeenCalledWith({
        nomenclature_id: mockNomenclatureId,
        current_quantity: 0,
        min_stock_level: 0,
      });
      expect(warehouseInventoryRepository.save).toHaveBeenCalled();
      expect(result).toEqual(newInventory);
    });
  });

  describe('addToWarehouse', () => {
    it('should add stock to warehouse inventory', async () => {
      const mockInventory = createMockInventory({ current_quantity: 100 });
      warehouseInventoryRepository.findOne.mockResolvedValue(mockInventory);
      warehouseInventoryRepository.save.mockResolvedValue({
        ...mockInventory,
        current_quantity: 150,
      });

      const result = await service.addToWarehouse(
        {
          nomenclature_id: mockNomenclatureId,
          quantity: 50,
          notes: 'Test shipment',
        },
        mockUserId,
      );

      expect(result.current_quantity).toBe(150);
      expect(movementService.createMovement).toHaveBeenCalledWith(
        expect.objectContaining({
          movement_type: MovementType.WAREHOUSE_IN,
          nomenclature_id: mockNomenclatureId,
          quantity: 50,
          performed_by_user_id: mockUserId,
        }),
      );
    });

    it('should set last_restocked_at timestamp', async () => {
      const mockInventory = createMockInventory();
      warehouseInventoryRepository.findOne.mockResolvedValue(mockInventory);

      await service.addToWarehouse(
        {
          nomenclature_id: mockNomenclatureId,
          quantity: 10,
        },
        mockUserId,
      );

      expect(warehouseInventoryRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          last_restocked_at: expect.any(Date),
        }),
      );
    });
  });

  describe('removeFromWarehouse', () => {
    it('should remove stock from warehouse inventory', async () => {
      const mockInventory = createMockInventory({ current_quantity: 100 });
      warehouseInventoryRepository.findOne.mockResolvedValue(mockInventory);
      warehouseInventoryRepository.save.mockResolvedValue({
        ...mockInventory,
        current_quantity: 80,
      });

      const result = await service.removeFromWarehouse(
        {
          nomenclature_id: mockNomenclatureId,
          quantity: 20,
          notes: 'Write-off',
        },
        mockUserId,
      );

      expect(result.current_quantity).toBe(80);
      expect(movementService.createMovement).toHaveBeenCalledWith(
        expect.objectContaining({
          movement_type: MovementType.WAREHOUSE_OUT,
          quantity: 20,
        }),
      );
    });

    it('should throw BadRequestException if insufficient stock', async () => {
      const mockInventory = createMockInventory({ current_quantity: 10 });
      warehouseInventoryRepository.findOne.mockResolvedValue(mockInventory);

      await expect(
        service.removeFromWarehouse(
          {
            nomenclature_id: mockNomenclatureId,
            quantity: 20,
          },
          mockUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateWarehouseInventory', () => {
    it('should update warehouse inventory settings', async () => {
      const mockInventory = createMockInventory();
      warehouseInventoryRepository.findOne.mockResolvedValue(mockInventory);
      warehouseInventoryRepository.save.mockResolvedValue({
        ...mockInventory,
        min_stock_level: 25,
      });

      const result = await service.updateWarehouseInventory(mockNomenclatureId, {
        min_stock_level: 25,
      });

      expect(result.min_stock_level).toBe(25);
    });
  });

  describe('getWarehouseLowStock', () => {
    it('should return items with current quantity below min stock level', async () => {
      const lowStockItems = [
        createMockInventory({ current_quantity: 5, min_stock_level: 10 }),
        createMockInventory({ id: 'inv-2', current_quantity: 2, min_stock_level: 20 }),
      ];

      const mockQb = createMockQueryBuilder();
      mockQb.getMany.mockResolvedValue(lowStockItems);
      warehouseInventoryRepository.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.getWarehouseLowStock();

      expect(result).toEqual(lowStockItems);
      expect(mockQb.where).toHaveBeenCalledWith(
        'inventory.current_quantity <= inventory.min_stock_level',
      );
      expect(mockQb.andWhere).toHaveBeenCalledWith('inventory.min_stock_level > 0');
    });
  });

  describe('reserveWarehouseStock', () => {
    it('should reserve stock for a task', async () => {
      const mockInventory = createMockInventory({
        current_quantity: 100,
        reserved_quantity: 10,
      });

      const mockManager = {
        findOne: jest.fn().mockResolvedValue(mockInventory),
        save: jest.fn().mockResolvedValue({}),
        create: jest.fn().mockImplementation((entity, data) => ({ ...data })),
      };

      const dataSource = {
        transaction: jest.fn((callback) => callback(mockManager)),
      };

      const testModule = await Test.createTestingModule({
        providers: [
          WarehouseInventoryService,
          {
            provide: getRepositoryToken(WarehouseInventory),
            useValue: warehouseInventoryRepository,
          },
          {
            provide: DataSource,
            useValue: dataSource,
          },
          {
            provide: InventoryMovementService,
            useValue: movementService,
          },
        ],
      }).compile();

      const testService = testModule.get<WarehouseInventoryService>(WarehouseInventoryService);

      await testService.reserveWarehouseStock(mockNomenclatureId, 20, 'task-123', mockUserId);

      expect(mockManager.save).toHaveBeenCalledWith(
        WarehouseInventory,
        expect.objectContaining({
          reserved_quantity: 30, // 10 + 20
        }),
      );
      expect(mockManager.save).toHaveBeenCalledWith(
        InventoryMovement,
        expect.objectContaining({
          movement_type: MovementType.WAREHOUSE_RESERVATION,
          quantity: 20,
        }),
      );
    });

    it('should throw NotFoundException if product not found', async () => {
      const mockManager = {
        findOne: jest.fn().mockResolvedValue(null),
        save: jest.fn(),
        create: jest.fn(),
      };

      const dataSource = {
        transaction: jest.fn((callback) => callback(mockManager)),
      };

      const testModule = await Test.createTestingModule({
        providers: [
          WarehouseInventoryService,
          {
            provide: getRepositoryToken(WarehouseInventory),
            useValue: warehouseInventoryRepository,
          },
          {
            provide: DataSource,
            useValue: dataSource,
          },
          {
            provide: InventoryMovementService,
            useValue: movementService,
          },
        ],
      }).compile();

      const testService = testModule.get<WarehouseInventoryService>(WarehouseInventoryService);

      await expect(
        testService.reserveWarehouseStock(mockNomenclatureId, 20, 'task-123', mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if insufficient available stock', async () => {
      const mockInventory = createMockInventory({
        current_quantity: 50,
        reserved_quantity: 40, // Only 10 available
      });

      const mockManager = {
        findOne: jest.fn().mockResolvedValue(mockInventory),
        save: jest.fn(),
        create: jest.fn(),
      };

      const dataSource = {
        transaction: jest.fn((callback) => callback(mockManager)),
      };

      const testModule = await Test.createTestingModule({
        providers: [
          WarehouseInventoryService,
          {
            provide: getRepositoryToken(WarehouseInventory),
            useValue: warehouseInventoryRepository,
          },
          {
            provide: DataSource,
            useValue: dataSource,
          },
          {
            provide: InventoryMovementService,
            useValue: movementService,
          },
        ],
      }).compile();

      const testService = testModule.get<WarehouseInventoryService>(WarehouseInventoryService);

      await expect(
        testService.reserveWarehouseStock(mockNomenclatureId, 20, 'task-123', mockUserId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('releaseWarehouseReservation', () => {
    it('should release reserved stock', async () => {
      const mockInventory = createMockInventory({
        current_quantity: 100,
        reserved_quantity: 30,
      });

      const mockManager = {
        findOne: jest.fn().mockResolvedValue(mockInventory),
        save: jest.fn().mockResolvedValue({}),
        create: jest.fn().mockImplementation((entity, data) => ({ ...data })),
      };

      const dataSource = {
        transaction: jest.fn((callback) => callback(mockManager)),
      };

      const testModule = await Test.createTestingModule({
        providers: [
          WarehouseInventoryService,
          {
            provide: getRepositoryToken(WarehouseInventory),
            useValue: warehouseInventoryRepository,
          },
          {
            provide: DataSource,
            useValue: dataSource,
          },
          {
            provide: InventoryMovementService,
            useValue: movementService,
          },
        ],
      }).compile();

      const testService = testModule.get<WarehouseInventoryService>(WarehouseInventoryService);

      await testService.releaseWarehouseReservation(mockNomenclatureId, 20, 'task-123');

      expect(mockManager.save).toHaveBeenCalledWith(
        WarehouseInventory,
        expect.objectContaining({
          reserved_quantity: 10, // 30 - 20
        }),
      );
      expect(mockManager.save).toHaveBeenCalledWith(
        InventoryMovement,
        expect.objectContaining({
          movement_type: MovementType.WAREHOUSE_RESERVATION_RELEASE,
          quantity: 20,
        }),
      );
    });

    it('should not allow negative reserved quantity', async () => {
      const mockInventory = createMockInventory({
        current_quantity: 100,
        reserved_quantity: 10,
      });

      const mockManager = {
        findOne: jest.fn().mockResolvedValue(mockInventory),
        save: jest.fn().mockResolvedValue({}),
        create: jest.fn().mockImplementation((entity, data) => ({ ...data })),
      };

      const dataSource = {
        transaction: jest.fn((callback) => callback(mockManager)),
      };

      const testModule = await Test.createTestingModule({
        providers: [
          WarehouseInventoryService,
          {
            provide: getRepositoryToken(WarehouseInventory),
            useValue: warehouseInventoryRepository,
          },
          {
            provide: DataSource,
            useValue: dataSource,
          },
          {
            provide: InventoryMovementService,
            useValue: movementService,
          },
        ],
      }).compile();

      const testService = testModule.get<WarehouseInventoryService>(WarehouseInventoryService);

      await testService.releaseWarehouseReservation(mockNomenclatureId, 50, 'task-123');

      expect(mockManager.save).toHaveBeenCalledWith(
        WarehouseInventory,
        expect.objectContaining({
          reserved_quantity: 0, // Math.max(0, 10 - 50)
        }),
      );
    });
  });
});
