import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InventoryService } from './inventory.service';
import { WarehouseInventory } from './entities/warehouse-inventory.entity';
import { OperatorInventory } from './entities/operator-inventory.entity';
import { MachineInventory } from './entities/machine-inventory.entity';
import { InventoryMovement, MovementType } from './entities/inventory-movement.entity';
import {
  InventoryReservation,
  ReservationStatus,
  InventoryLevel,
} from './entities/inventory-reservation.entity';
import { createMockRepository } from '@/test/helpers';

describe('InventoryService', () => {
  let service: InventoryService;
  let warehouseRepo: any;
  let operatorRepo: any;
  let machineRepo: any;
  let movementRepo: any;
  let reservationRepo: any;
  let dataSource: any;
  let mockManager: any;

  beforeEach(async () => {
    // Create mock repositories
    warehouseRepo = createMockRepository<WarehouseInventory>();
    operatorRepo = createMockRepository<OperatorInventory>();
    machineRepo = createMockRepository<MachineInventory>();
    movementRepo = createMockRepository<InventoryMovement>();
    reservationRepo = createMockRepository<InventoryReservation>();

    // Create mock transaction manager that can be reconfigured per test
    mockManager = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((entity, data) => data),
      save: jest.fn((entity, data) => Promise.resolve(data)),
    };

    // Mock DataSource with transaction support
    dataSource = {
      transaction: jest.fn((callback) => callback(mockManager)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        {
          provide: getRepositoryToken(WarehouseInventory),
          useValue: warehouseRepo,
        },
        {
          provide: getRepositoryToken(OperatorInventory),
          useValue: operatorRepo,
        },
        {
          provide: getRepositoryToken(MachineInventory),
          useValue: machineRepo,
        },
        {
          provide: getRepositoryToken(InventoryMovement),
          useValue: movementRepo,
        },
        {
          provide: getRepositoryToken(InventoryReservation),
          useValue: reservationRepo,
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Reset mock manager for next test
    mockManager.findOne.mockReset();
    mockManager.find.mockReset();
    mockManager.create.mockReset();
    mockManager.save.mockReset();
  });

  // ============================================================================
  // WAREHOUSE INVENTORY TESTS
  // ============================================================================

  describe('getWarehouseInventory', () => {
    it('should return all warehouse inventory items', async () => {
      const mockInventory = [
        { id: '1', nomenclature_id: 'nom-1', current_quantity: 100 },
        { id: '2', nomenclature_id: 'nom-2', current_quantity: 200 },
      ];
      warehouseRepo.find.mockResolvedValue(mockInventory);

      const result = await service.getWarehouseInventory();

      expect(result).toEqual(mockInventory);
      expect(warehouseRepo.find).toHaveBeenCalledWith({
        order: { nomenclature: { name: 'ASC' } },
      });
    });
  });

  describe('getWarehouseInventoryByNomenclature', () => {
    it('should return existing warehouse inventory for nomenclature', async () => {
      const mockInventory = {
        id: '1',
        nomenclature_id: 'nom-1',
        current_quantity: 100,
      };
      warehouseRepo.findOne.mockResolvedValue(mockInventory);

      const result = await service.getWarehouseInventoryByNomenclature('nom-1');

      expect(result).toEqual(mockInventory);
      expect(warehouseRepo.findOne).toHaveBeenCalledWith({
        where: { nomenclature_id: 'nom-1' },
      });
    });

    it('should create new inventory record if not exists', async () => {
      warehouseRepo.findOne.mockResolvedValue(null);
      const newInventory = {
        nomenclature_id: 'nom-1',
        current_quantity: 0,
        min_stock_level: 0,
      };
      warehouseRepo.create.mockReturnValue(newInventory);
      warehouseRepo.save.mockResolvedValue({ id: 'new-1', ...newInventory });

      const result = await service.getWarehouseInventoryByNomenclature('nom-1');

      expect(result.id).toBe('new-1');
      expect(warehouseRepo.create).toHaveBeenCalled();
      expect(warehouseRepo.save).toHaveBeenCalled();
    });
  });

  describe('addToWarehouse', () => {
    it('should add quantity to warehouse inventory', async () => {
      const existingInventory = {
        id: '1',
        nomenclature_id: 'nom-1',
        current_quantity: 100,
      };
      warehouseRepo.findOne.mockResolvedValue(existingInventory);
      warehouseRepo.save.mockResolvedValue({
        ...existingInventory,
        current_quantity: 150,
      });
      movementRepo.create.mockReturnValue({});
      movementRepo.save.mockResolvedValue({});

      const dto = {
        nomenclature_id: 'nom-1',
        quantity: 50,
        notes: 'Test addition',
      };

      const result = await service.addToWarehouse(dto, 'user-1');

      expect(result.current_quantity).toBe(150);
      expect(warehouseRepo.save).toHaveBeenCalled();
      expect(movementRepo.save).toHaveBeenCalled();
    });
  });

  describe('removeFromWarehouse', () => {
    it('should remove quantity from warehouse inventory', async () => {
      const existingInventory = {
        id: '1',
        nomenclature_id: 'nom-1',
        current_quantity: 100,
      };
      warehouseRepo.findOne.mockResolvedValue(existingInventory);
      warehouseRepo.save.mockResolvedValue({
        ...existingInventory,
        current_quantity: 70,
      });
      movementRepo.create.mockReturnValue({});
      movementRepo.save.mockResolvedValue({});

      const dto = {
        nomenclature_id: 'nom-1',
        quantity: 30,
        notes: 'Test removal',
      };

      const result = await service.removeFromWarehouse(dto, 'user-1');

      expect(result.current_quantity).toBe(70);
    });

    it('should throw error if insufficient quantity in warehouse', async () => {
      const existingInventory = {
        id: '1',
        nomenclature_id: 'nom-1',
        current_quantity: 10,
      };
      warehouseRepo.findOne.mockResolvedValue(existingInventory);

      const dto = {
        nomenclature_id: 'nom-1',
        quantity: 50,
      };

      await expect(service.removeFromWarehouse(dto, 'user-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getWarehouseLowStock', () => {
    it('should return items with low stock levels', async () => {
      const lowStockItems = [
        { id: '1', current_quantity: 5, min_stock_level: 10 },
        { id: '2', current_quantity: 2, min_stock_level: 20 },
      ];

      const queryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(lowStockItems),
      };

      warehouseRepo.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.getWarehouseLowStock();

      expect(result).toEqual(lowStockItems);
      expect(queryBuilder.where).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // OPERATOR INVENTORY TESTS
  // ============================================================================

  describe('getOperatorInventory', () => {
    it('should return operator inventory items', async () => {
      const mockInventory = [
        { id: '1', operator_id: 'op-1', nomenclature_id: 'nom-1', current_quantity: 50 },
      ];
      operatorRepo.find.mockResolvedValue(mockInventory);

      const result = await service.getOperatorInventory('op-1');

      expect(result).toEqual(mockInventory);
      expect(operatorRepo.find).toHaveBeenCalledWith({
        where: { operator_id: 'op-1' },
        order: { nomenclature: { name: 'ASC' } },
      });
    });
  });

  describe('transferWarehouseToOperator', () => {
    it('should transfer inventory from warehouse to operator', async () => {
      const warehouseInventory = {
        id: 'wh-1',
        nomenclature_id: 'nom-1',
        current_quantity: 100,
      };
      const operatorInventory = {
        id: 'op-1',
        operator_id: 'operator-1',
        nomenclature_id: 'nom-1',
        current_quantity: 20,
      };

      // Mock transaction manager's findOne to return warehouse then operator inventory
      mockManager.findOne
        .mockResolvedValueOnce(warehouseInventory) // First call: warehouse
        .mockResolvedValueOnce(operatorInventory); // Second call: operator

      mockManager.save
        .mockResolvedValueOnce({ ...warehouseInventory, current_quantity: 70 })
        .mockResolvedValueOnce({ ...operatorInventory, current_quantity: 50 });

      movementRepo.create.mockReturnValue({});
      movementRepo.save.mockResolvedValue({});

      const dto = {
        operator_id: 'operator-1',
        nomenclature_id: 'nom-1',
        quantity: 30,
      };

      const result = await service.transferWarehouseToOperator(dto, 'user-1');

      expect(result.warehouse.current_quantity).toBe(70);
      expect(result.operator.current_quantity).toBe(50);
    });

    it('should throw error if insufficient warehouse stock for transfer', async () => {
      const warehouseInventory = {
        id: 'wh-1',
        nomenclature_id: 'nom-1',
        current_quantity: 10,
      };

      // Mock only warehouse inventory (insufficient stock scenario)
      mockManager.findOne.mockResolvedValueOnce(warehouseInventory);

      const dto = {
        operator_id: 'operator-1',
        nomenclature_id: 'nom-1',
        quantity: 50,
      };

      await expect(service.transferWarehouseToOperator(dto, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('transferOperatorToWarehouse', () => {
    it('should return inventory from operator to warehouse', async () => {
      const operatorInventory = {
        id: 'op-1',
        operator_id: 'operator-1',
        nomenclature_id: 'nom-1',
        current_quantity: 50,
      };
      const warehouseInventory = {
        id: 'wh-1',
        nomenclature_id: 'nom-1',
        current_quantity: 100,
      };

      // Mock transaction manager's findOne to return operator then warehouse inventory
      mockManager.findOne
        .mockResolvedValueOnce(operatorInventory) // First call: operator
        .mockResolvedValueOnce(warehouseInventory); // Second call: warehouse

      mockManager.save
        .mockResolvedValueOnce({ ...operatorInventory, current_quantity: 30 })
        .mockResolvedValueOnce({ ...warehouseInventory, current_quantity: 120 });

      movementRepo.create.mockReturnValue({});
      movementRepo.save.mockResolvedValue({});

      const dto = {
        operator_id: 'operator-1',
        nomenclature_id: 'nom-1',
        quantity: 20,
      };

      const result = await service.transferOperatorToWarehouse(dto, 'user-1');

      expect(result.operator.current_quantity).toBe(30);
      expect(result.warehouse.current_quantity).toBe(120);
    });
  });

  // ============================================================================
  // MACHINE INVENTORY TESTS
  // ============================================================================

  describe('getMachineInventory', () => {
    it('should return machine inventory items', async () => {
      const mockInventory = [
        { id: '1', machine_id: 'machine-1', nomenclature_id: 'nom-1', current_quantity: 25 },
      ];

      const queryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockInventory),
      };

      machineRepo.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.getMachineInventory('machine-1');

      expect(result).toEqual(mockInventory);
      expect(queryBuilder.where).toHaveBeenCalledWith('inventory.machine_id = :machineId', {
        machineId: 'machine-1',
      });
    });
  });

  describe('transferOperatorToMachine', () => {
    it('should transfer inventory from operator to machine', async () => {
      const operatorInventory = {
        id: 'op-1',
        operator_id: 'operator-1',
        nomenclature_id: 'nom-1',
        current_quantity: 50,
      };
      const machineInventory = {
        id: 'mach-1',
        machine_id: 'machine-1',
        nomenclature_id: 'nom-1',
        current_quantity: 10,
      };

      // Mock transaction manager's findOne to return operator then machine inventory
      mockManager.findOne
        .mockResolvedValueOnce(operatorInventory) // First call: operator
        .mockResolvedValueOnce(machineInventory); // Second call: machine

      mockManager.save
        .mockResolvedValueOnce({ ...operatorInventory, current_quantity: 30 })
        .mockResolvedValueOnce({ ...machineInventory, current_quantity: 30 });

      movementRepo.create.mockReturnValue({});
      movementRepo.save.mockResolvedValue({});

      const dto = {
        operator_id: 'operator-1',
        machine_id: 'machine-1',
        nomenclature_id: 'nom-1',
        quantity: 20,
        task_id: 'task-1',
      };

      const result = await service.transferOperatorToMachine(dto, 'user-1');

      expect(result.operator.current_quantity).toBe(30);
      expect(result.machine.current_quantity).toBe(30);
    });

    it('should throw error if operator has insufficient stock', async () => {
      const operatorInventory = {
        id: 'op-1',
        operator_id: 'operator-1',
        nomenclature_id: 'nom-1',
        current_quantity: 5,
      };

      // Mock only operator inventory (insufficient stock scenario)
      mockManager.findOne.mockResolvedValueOnce(operatorInventory);

      const dto = {
        operator_id: 'operator-1',
        machine_id: 'machine-1',
        nomenclature_id: 'nom-1',
        quantity: 20,
      };

      await expect(service.transferOperatorToMachine(dto, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('recordSale', () => {
    it('should record sale and deduct from machine inventory', async () => {
      const machineInventory = {
        id: 'mach-1',
        machine_id: 'machine-1',
        nomenclature_id: 'nom-1',
        current_quantity: 30,
      };

      machineRepo.findOne.mockResolvedValue(machineInventory);
      machineRepo.save.mockResolvedValue({
        ...machineInventory,
        current_quantity: 25,
      });
      movementRepo.create.mockReturnValue({});
      movementRepo.save.mockResolvedValue({});

      const dto = {
        machine_id: 'machine-1',
        nomenclature_id: 'nom-1',
        quantity: 5,
        transaction_id: 'trans-1',
      };

      const result = await service.recordSale(dto, 'user-1');

      expect(result.current_quantity).toBe(25);
      expect(movementRepo.save).toHaveBeenCalled();
    });

    it('should handle sale even with insufficient stock', async () => {
      const machineInventory = {
        id: 'mach-1',
        machine_id: 'machine-1',
        nomenclature_id: 'nom-1',
        current_quantity: 2,
      };

      machineRepo.findOne.mockResolvedValue(machineInventory);
      machineRepo.save.mockResolvedValue(machineInventory);
      movementRepo.create.mockReturnValue({});
      movementRepo.save.mockResolvedValue({});

      const dto = {
        machine_id: 'machine-1',
        nomenclature_id: 'nom-1',
        quantity: 5,
      };

      // Should not throw error, but not deduct either
      await expect(service.recordSale(dto, 'user-1')).resolves.toBeDefined();
    });
  });

  describe('getMachinesLowStock', () => {
    it('should return machines with low stock', async () => {
      const lowStockMachines = [
        {
          id: '1',
          machine_id: 'machine-1',
          current_quantity: 3,
          min_stock_level: 10,
        },
      ];

      const queryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(lowStockMachines),
      };

      machineRepo.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.getMachinesLowStock();

      expect(result).toEqual(lowStockMachines);
    });
  });

  describe('adjustMachineInventory', () => {
    it('should adjust machine inventory to actual quantity', async () => {
      const machineInventory = {
        id: 'mach-1',
        machine_id: 'machine-1',
        nomenclature_id: 'nom-1',
        current_quantity: 25,
      };

      machineRepo.findOne.mockResolvedValue(machineInventory);
      machineRepo.save.mockResolvedValue({
        ...machineInventory,
        current_quantity: 30,
      });
      movementRepo.create.mockReturnValue({});
      movementRepo.save.mockResolvedValue({});

      const dto = {
        actual_quantity: 30,
        notes: 'Physical inventory count',
      };

      const result = await service.adjustMachineInventory('machine-1', 'nom-1', dto, 'user-1');

      expect(result.current_quantity).toBe(30);
      expect(movementRepo.save).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // RESERVATION TESTS
  // ============================================================================

  describe('reserveWarehouseStock', () => {
    it('should reserve warehouse stock for task', async () => {
      const inventory = {
        id: 'wh-1',
        nomenclature_id: 'nom-1',
        current_quantity: 100,
        reserved_quantity: 10,
      };

      // Mock transaction manager
      mockManager.findOne.mockResolvedValue(inventory);
      mockManager.save.mockResolvedValue({
        ...inventory,
        reserved_quantity: 30,
      });

      await service.reserveWarehouseStock('nom-1', 20, 'task:task-1', 'user-1');

      expect(mockManager.save).toHaveBeenCalled();
      expect(mockManager.create).toHaveBeenCalled();
    });

    it('should throw error if insufficient available stock for reservation', async () => {
      const inventory = {
        id: 'wh-1',
        nomenclature_id: 'nom-1',
        current_quantity: 100,
        reserved_quantity: 95,
      };

      // Mock transaction manager
      mockManager.findOne.mockResolvedValue(inventory);

      await expect(
        service.reserveWarehouseStock('nom-1', 20, 'task:task-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('releaseWarehouseReservation', () => {
    it('should release warehouse reservation', async () => {
      const inventory = {
        id: 'wh-1',
        nomenclature_id: 'nom-1',
        current_quantity: 100,
        reserved_quantity: 30,
      };

      // Mock transaction manager
      mockManager.findOne.mockResolvedValue(inventory);
      mockManager.save.mockResolvedValue({
        ...inventory,
        reserved_quantity: 10,
      });

      await service.releaseWarehouseReservation('nom-1', 20, 'task:task-1');

      expect(mockManager.save).toHaveBeenCalled();
    });

    it('should not allow negative reserved quantity', async () => {
      const inventory = {
        id: 'wh-1',
        nomenclature_id: 'nom-1',
        current_quantity: 100,
        reserved_quantity: 5,
      };

      // Mock transaction manager
      mockManager.findOne.mockResolvedValue(inventory);
      mockManager.save.mockResolvedValue({
        ...inventory,
        reserved_quantity: 0,
      });

      await service.releaseWarehouseReservation('nom-1', 20, 'task:task-1');

      const savedInventory = mockManager.save.mock.calls[0][1];
      expect(savedInventory.reserved_quantity).toBeGreaterThanOrEqual(0);
    });
  });

  describe('deductFromMachine', () => {
    it('should deduct quantity from machine inventory', async () => {
      const machineInventory = {
        id: 'mach-1',
        machine_id: 'machine-1',
        nomenclature_id: 'nom-1',
        current_quantity: 50,
      };

      machineRepo.findOne.mockResolvedValue(machineInventory);
      machineRepo.save.mockResolvedValue({
        ...machineInventory,
        current_quantity: 35,
      });
      movementRepo.create.mockReturnValue({});
      movementRepo.save.mockResolvedValue({});

      await service.deductFromMachine('machine-1', 'nom-1', 15, 'Sales import');

      expect(machineRepo.save).toHaveBeenCalled();
      expect(movementRepo.save).toHaveBeenCalled();
    });

    it('should throw error if insufficient machine stock for deduction', async () => {
      const machineInventory = {
        id: 'mach-1',
        machine_id: 'machine-1',
        nomenclature_id: 'nom-1',
        current_quantity: 5,
      };

      machineRepo.findOne.mockResolvedValue(machineInventory);

      await expect(
        service.deductFromMachine('machine-1', 'nom-1', 15, 'Sales import'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================================================
  // MOVEMENT TESTS
  // ============================================================================

  describe('getMovements', () => {
    it('should return all movements without filters', async () => {
      const movements = [
        { id: '1', movement_type: MovementType.WAREHOUSE_IN, quantity: 100 },
        { id: '2', movement_type: MovementType.WAREHOUSE_TO_OPERATOR, quantity: 50 },
      ];

      const queryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(movements),
      };

      movementRepo.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.getMovements();

      expect(result).toEqual(movements);
    });

    it('should filter movements by type', async () => {
      const queryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      movementRepo.createQueryBuilder.mockReturnValue(queryBuilder);

      await service.getMovements(MovementType.WAREHOUSE_IN);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('movement.movement_type = :movementType', {
        movementType: MovementType.WAREHOUSE_IN,
      });
    });
  });

  describe('getMovementStats', () => {
    it('should return movement statistics', async () => {
      const _mockStats = {
        total: 100,
        by_type: [
          { type: MovementType.WAREHOUSE_IN, count: 30, total_quantity: 1000 },
          { type: MovementType.MACHINE_SALE, count: 70, total_quantity: 500 },
        ],
      };

      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(100),
      };

      const statsQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { type: MovementType.WAREHOUSE_IN, count: '30', total_quantity: '1000' },
          { type: MovementType.MACHINE_SALE, count: '70', total_quantity: '500' },
        ]),
      };

      movementRepo.createQueryBuilder
        .mockReturnValueOnce(queryBuilder)
        .mockReturnValueOnce(statsQueryBuilder);

      const result = await service.getMovementStats();

      expect(result.total).toBe(100);
      expect(result.by_type).toHaveLength(2);
      expect(result.by_type[0].count).toBe(30);
    });

    it('should filter by date range when provided', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(50),
      };

      const statsQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };

      movementRepo.createQueryBuilder
        .mockReturnValueOnce(queryBuilder)
        .mockReturnValueOnce(statsQueryBuilder);

      const dateFrom = new Date('2025-01-01');
      const dateTo = new Date('2025-01-31');

      await service.getMovementStats(dateFrom, dateTo);

      expect(queryBuilder.where).toHaveBeenCalledWith(
        'movement.created_at BETWEEN :dateFrom AND :dateTo',
        { dateFrom, dateTo },
      );
    });
  });

  // ============================================================================
  // ADDITIONAL BRANCH COVERAGE TESTS
  // ============================================================================

  describe('addToWarehouse - branch coverage', () => {
    it('should use default notes when not provided', async () => {
      const existingInventory = {
        id: '1',
        nomenclature_id: 'nom-1',
        current_quantity: 100,
      };
      warehouseRepo.findOne.mockResolvedValue(existingInventory);
      warehouseRepo.save.mockResolvedValue({
        ...existingInventory,
        current_quantity: 150,
      });
      movementRepo.create.mockReturnValue({});
      movementRepo.save.mockResolvedValue({});

      const dto = {
        nomenclature_id: 'nom-1',
        quantity: 50,
        // No notes provided
      };

      await service.addToWarehouse(dto, 'user-1');

      expect(movementRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          notes: expect.stringContaining('Приход на склад'),
        }),
      );
    });

    it('should include metadata when provided', async () => {
      const existingInventory = {
        id: '1',
        nomenclature_id: 'nom-1',
        current_quantity: 100,
      };
      warehouseRepo.findOne.mockResolvedValue(existingInventory);
      warehouseRepo.save.mockResolvedValue({
        ...existingInventory,
        current_quantity: 150,
      });
      movementRepo.create.mockReturnValue({});
      movementRepo.save.mockResolvedValue({});

      const dto = {
        nomenclature_id: 'nom-1',
        quantity: 50,
        metadata: { supplier: 'Test Supplier' },
      };

      await service.addToWarehouse(dto as any, 'user-1');

      expect(movementRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: { supplier: 'Test Supplier' },
        }),
      );
    });
  });

  describe('removeFromWarehouse - branch coverage', () => {
    it('should use default notes when not provided', async () => {
      const existingInventory = {
        id: '1',
        nomenclature_id: 'nom-1',
        current_quantity: 100,
      };
      warehouseRepo.findOne.mockResolvedValue(existingInventory);
      warehouseRepo.save.mockResolvedValue({
        ...existingInventory,
        current_quantity: 70,
      });
      movementRepo.create.mockReturnValue({});
      movementRepo.save.mockResolvedValue({});

      const dto = {
        nomenclature_id: 'nom-1',
        quantity: 30,
        // No notes provided
      };

      await service.removeFromWarehouse(dto, 'user-1');

      expect(movementRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          notes: expect.stringContaining('Списание со склада'),
        }),
      );
    });
  });

  describe('updateWarehouseInventory', () => {
    it('should update warehouse inventory settings', async () => {
      const existingInventory = {
        id: '1',
        nomenclature_id: 'nom-1',
        current_quantity: 100,
        min_stock_level: 10,
      };
      warehouseRepo.findOne.mockResolvedValue(existingInventory);
      warehouseRepo.save.mockResolvedValue({
        ...existingInventory,
        min_stock_level: 20,
      });

      const dto = { min_stock_level: 20 };

      const result = await service.updateWarehouseInventory('nom-1', dto);

      expect(result.min_stock_level).toBe(20);
    });
  });

  describe('getOperatorInventoryByNomenclature', () => {
    it('should return existing operator inventory', async () => {
      const existingInventory = {
        id: '1',
        operator_id: 'op-1',
        nomenclature_id: 'nom-1',
        current_quantity: 50,
      };
      operatorRepo.findOne.mockResolvedValue(existingInventory);

      const result = await service.getOperatorInventoryByNomenclature('op-1', 'nom-1');

      expect(result).toEqual(existingInventory);
    });

    it('should create new inventory record if not exists', async () => {
      operatorRepo.findOne.mockResolvedValue(null);
      const newInventory = {
        operator_id: 'op-1',
        nomenclature_id: 'nom-1',
        current_quantity: 0,
      };
      operatorRepo.create.mockReturnValue(newInventory);
      operatorRepo.save.mockResolvedValue({ id: 'new-1', ...newInventory });

      const result = await service.getOperatorInventoryByNomenclature('op-1', 'nom-1');

      expect(result.id).toBe('new-1');
      expect(operatorRepo.create).toHaveBeenCalled();
      expect(operatorRepo.save).toHaveBeenCalled();
    });
  });

  describe('transferWarehouseToOperator - branch coverage', () => {
    it('should throw NotFoundException if warehouse inventory not found', async () => {
      mockManager.findOne.mockResolvedValueOnce(null);

      const dto = {
        operator_id: 'operator-1',
        nomenclature_id: 'nom-1',
        quantity: 30,
      };

      await expect(service.transferWarehouseToOperator(dto, 'user-1')).rejects.toThrow(
        'не найден на складе',
      );
    });

    it('should create new operator inventory if not exists', async () => {
      const warehouseInventory = {
        id: 'wh-1',
        nomenclature_id: 'nom-1',
        current_quantity: 100,
      };

      mockManager.findOne
        .mockResolvedValueOnce(warehouseInventory) // warehouse exists
        .mockResolvedValueOnce(null); // operator inventory not exists

      mockManager.create.mockReturnValue({
        operator_id: 'operator-1',
        nomenclature_id: 'nom-1',
        current_quantity: 0,
        reserved_quantity: 0,
      });

      mockManager.save
        .mockResolvedValueOnce({ ...warehouseInventory, current_quantity: 70 })
        .mockResolvedValueOnce({
          id: 'new-op',
          operator_id: 'operator-1',
          nomenclature_id: 'nom-1',
          current_quantity: 30,
          reserved_quantity: 0,
        })
        .mockResolvedValueOnce({}); // movement

      const dto = {
        operator_id: 'operator-1',
        nomenclature_id: 'nom-1',
        quantity: 30,
        notes: 'Custom transfer note',
      };

      const result = await service.transferWarehouseToOperator(dto, 'user-1');

      expect(result.operator.current_quantity).toBe(30);
      expect(mockManager.create).toHaveBeenCalled();
    });
  });

  describe('transferOperatorToWarehouse - branch coverage', () => {
    it('should throw NotFoundException if operator inventory not found', async () => {
      mockManager.findOne.mockResolvedValueOnce(null);

      const dto = {
        operator_id: 'operator-1',
        nomenclature_id: 'nom-1',
        quantity: 20,
      };

      await expect(service.transferOperatorToWarehouse(dto, 'user-1')).rejects.toThrow(
        'не найден у оператора',
      );
    });

    it('should throw BadRequestException if insufficient operator stock', async () => {
      const operatorInventory = {
        id: 'op-1',
        operator_id: 'operator-1',
        nomenclature_id: 'nom-1',
        current_quantity: 10,
      };

      mockManager.findOne.mockResolvedValueOnce(operatorInventory);

      const dto = {
        operator_id: 'operator-1',
        nomenclature_id: 'nom-1',
        quantity: 50,
      };

      await expect(service.transferOperatorToWarehouse(dto, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if warehouse inventory not found during return', async () => {
      const operatorInventory = {
        id: 'op-1',
        operator_id: 'operator-1',
        nomenclature_id: 'nom-1',
        current_quantity: 50,
      };

      mockManager.findOne
        .mockResolvedValueOnce(operatorInventory) // operator exists
        .mockResolvedValueOnce(null); // warehouse not exists

      mockManager.save.mockResolvedValueOnce({ ...operatorInventory, current_quantity: 30 });

      const dto = {
        operator_id: 'operator-1',
        nomenclature_id: 'nom-1',
        quantity: 20,
      };

      await expect(service.transferOperatorToWarehouse(dto, 'user-1')).rejects.toThrow(
        'не найден на складе',
      );
    });
  });

  describe('getMachineInventoryByNomenclature', () => {
    it('should return existing machine inventory', async () => {
      const existingInventory = {
        id: '1',
        machine_id: 'machine-1',
        nomenclature_id: 'nom-1',
        current_quantity: 25,
      };
      machineRepo.findOne.mockResolvedValue(existingInventory);

      const result = await service.getMachineInventoryByNomenclature('machine-1', 'nom-1');

      expect(result).toEqual(existingInventory);
    });

    it('should create new inventory record if not exists', async () => {
      machineRepo.findOne.mockResolvedValue(null);
      const newInventory = {
        machine_id: 'machine-1',
        nomenclature_id: 'nom-1',
        current_quantity: 0,
        min_stock_level: 0,
      };
      machineRepo.create.mockReturnValue(newInventory);
      machineRepo.save.mockResolvedValue({ id: 'new-1', ...newInventory });

      const result = await service.getMachineInventoryByNomenclature('machine-1', 'nom-1');

      expect(result.id).toBe('new-1');
      expect(machineRepo.create).toHaveBeenCalled();
      expect(machineRepo.save).toHaveBeenCalled();
    });
  });

  describe('transferOperatorToMachine - branch coverage', () => {
    it('should throw NotFoundException if operator inventory not found', async () => {
      mockManager.findOne.mockResolvedValueOnce(null);

      const dto = {
        operator_id: 'operator-1',
        machine_id: 'machine-1',
        nomenclature_id: 'nom-1',
        quantity: 20,
      };

      await expect(service.transferOperatorToMachine(dto, 'user-1')).rejects.toThrow(
        'не найден у оператора',
      );
    });

    it('should create new machine inventory if not exists', async () => {
      const operatorInventory = {
        id: 'op-1',
        operator_id: 'operator-1',
        nomenclature_id: 'nom-1',
        current_quantity: 50,
      };

      mockManager.findOne
        .mockResolvedValueOnce(operatorInventory) // operator exists
        .mockResolvedValueOnce(null); // machine inventory not exists

      mockManager.create.mockReturnValue({
        machine_id: 'machine-1',
        nomenclature_id: 'nom-1',
        current_quantity: 0,
        min_stock_level: 0,
      });

      mockManager.save
        .mockResolvedValueOnce({ ...operatorInventory, current_quantity: 30 })
        .mockResolvedValueOnce({
          id: 'new-mach',
          machine_id: 'machine-1',
          nomenclature_id: 'nom-1',
          current_quantity: 20,
        })
        .mockResolvedValueOnce({}); // movement

      const dto = {
        operator_id: 'operator-1',
        machine_id: 'machine-1',
        nomenclature_id: 'nom-1',
        quantity: 20,
      };

      const result = await service.transferOperatorToMachine(dto, 'user-1');

      expect(result.machine.current_quantity).toBe(20);
      expect(mockManager.create).toHaveBeenCalled();
    });

    it('should handle task_id when provided', async () => {
      const operatorInventory = {
        id: 'op-1',
        operator_id: 'operator-1',
        nomenclature_id: 'nom-1',
        current_quantity: 50,
      };
      const machineInventory = {
        id: 'mach-1',
        machine_id: 'machine-1',
        nomenclature_id: 'nom-1',
        current_quantity: 10,
      };

      mockManager.findOne
        .mockResolvedValueOnce(operatorInventory)
        .mockResolvedValueOnce(machineInventory);

      mockManager.save.mockResolvedValue({});

      const dto = {
        operator_id: 'operator-1',
        machine_id: 'machine-1',
        nomenclature_id: 'nom-1',
        quantity: 20,
        task_id: 'task-123',
        operation_date: '2025-01-15',
      };

      await service.transferOperatorToMachine(dto, 'user-1');

      // Verify task_id was saved to operator inventory
      const savedOperator = mockManager.save.mock.calls[0][1];
      expect(savedOperator.last_task_id).toBe('task-123');
    });

    it('should handle operation_date when provided', async () => {
      const operatorInventory = {
        id: 'op-1',
        operator_id: 'operator-1',
        nomenclature_id: 'nom-1',
        current_quantity: 50,
      };
      const machineInventory = {
        id: 'mach-1',
        machine_id: 'machine-1',
        nomenclature_id: 'nom-1',
        current_quantity: 10,
      };

      mockManager.findOne
        .mockResolvedValueOnce(operatorInventory)
        .mockResolvedValueOnce(machineInventory);

      mockManager.save.mockResolvedValue({});
      mockManager.create.mockReturnValue({
        operation_date: new Date('2025-01-15'),
      });

      const dto = {
        operator_id: 'operator-1',
        machine_id: 'machine-1',
        nomenclature_id: 'nom-1',
        quantity: 20,
        operation_date: '2025-01-15',
      };

      await service.transferOperatorToMachine(dto, 'user-1');

      expect(mockManager.create).toHaveBeenCalled();
    });
  });

  describe('transferMachineToOperator - branch coverage', () => {
    it('should throw NotFoundException if machine inventory not found', async () => {
      mockManager.findOne.mockResolvedValueOnce(null);

      const dto = {
        operator_id: 'operator-1',
        machine_id: 'machine-1',
        nomenclature_id: 'nom-1',
        quantity: 10,
      };

      await expect(service.transferMachineToOperator(dto, 'user-1')).rejects.toThrow(
        'не найден в аппарате',
      );
    });

    it('should throw BadRequestException if insufficient machine stock', async () => {
      const machineInventory = {
        id: 'mach-1',
        machine_id: 'machine-1',
        nomenclature_id: 'nom-1',
        current_quantity: 5,
      };

      mockManager.findOne.mockResolvedValueOnce(machineInventory);

      const dto = {
        operator_id: 'operator-1',
        machine_id: 'machine-1',
        nomenclature_id: 'nom-1',
        quantity: 20,
      };

      await expect(service.transferMachineToOperator(dto, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create new operator inventory if not exists during withdrawal', async () => {
      const machineInventory = {
        id: 'mach-1',
        machine_id: 'machine-1',
        nomenclature_id: 'nom-1',
        current_quantity: 30,
      };

      mockManager.findOne
        .mockResolvedValueOnce(machineInventory) // machine exists
        .mockResolvedValueOnce(null); // operator inventory not exists

      mockManager.create.mockReturnValue({
        operator_id: 'operator-1',
        nomenclature_id: 'nom-1',
        current_quantity: 0,
        reserved_quantity: 0,
      });

      mockManager.save
        .mockResolvedValueOnce({ ...machineInventory, current_quantity: 20 })
        .mockResolvedValueOnce({
          id: 'new-op',
          operator_id: 'operator-1',
          nomenclature_id: 'nom-1',
          current_quantity: 10,
        })
        .mockResolvedValueOnce({}); // movement

      const dto = {
        operator_id: 'operator-1',
        machine_id: 'machine-1',
        nomenclature_id: 'nom-1',
        quantity: 10,
        notes: 'Custom withdrawal note',
      };

      const result = await service.transferMachineToOperator(dto, 'user-1');

      expect(result.operator.current_quantity).toBe(10);
      expect(mockManager.create).toHaveBeenCalled();
    });

    it('should handle transfer with existing operator inventory', async () => {
      const machineInventory = {
        id: 'mach-1',
        machine_id: 'machine-1',
        nomenclature_id: 'nom-1',
        current_quantity: 30,
      };
      const operatorInventory = {
        id: 'op-1',
        operator_id: 'operator-1',
        nomenclature_id: 'nom-1',
        current_quantity: 5,
        reserved_quantity: 0,
      };

      mockManager.findOne
        .mockResolvedValueOnce(machineInventory)
        .mockResolvedValueOnce(operatorInventory);

      mockManager.save
        .mockResolvedValueOnce({ ...machineInventory, current_quantity: 20 })
        .mockResolvedValueOnce({ ...operatorInventory, current_quantity: 15 })
        .mockResolvedValueOnce({});

      const dto = {
        operator_id: 'operator-1',
        machine_id: 'machine-1',
        nomenclature_id: 'nom-1',
        quantity: 10,
      };

      const result = await service.transferMachineToOperator(dto, 'user-1');

      expect(result.machine.current_quantity).toBe(20);
      expect(result.operator.current_quantity).toBe(15);
    });
  });

  describe('recordSale - branch coverage', () => {
    it('should record sale with operation_date', async () => {
      const machineInventory = {
        id: 'mach-1',
        machine_id: 'machine-1',
        nomenclature_id: 'nom-1',
        current_quantity: 30,
      };

      machineRepo.findOne.mockResolvedValue(machineInventory);
      machineRepo.save.mockResolvedValue({
        ...machineInventory,
        current_quantity: 25,
      });
      movementRepo.create.mockReturnValue({});
      movementRepo.save.mockResolvedValue({});

      const dto = {
        machine_id: 'machine-1',
        nomenclature_id: 'nom-1',
        quantity: 5,
        operation_date: '2025-01-15',
      };

      await service.recordSale(dto, 'user-1');

      expect(movementRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          operation_date: expect.any(Date),
        }),
      );
    });

    it('should not deduct when insufficient stock', async () => {
      const machineInventory = {
        id: 'mach-1',
        machine_id: 'machine-1',
        nomenclature_id: 'nom-1',
        current_quantity: 2,
      };

      machineRepo.findOne.mockResolvedValue(machineInventory);
      machineRepo.save.mockResolvedValue(machineInventory);
      movementRepo.create.mockReturnValue({});
      movementRepo.save.mockResolvedValue({});

      const dto = {
        machine_id: 'machine-1',
        nomenclature_id: 'nom-1',
        quantity: 10,
      };

      const result = await service.recordSale(dto, 'user-1');

      // Should not deduct - returns original quantity
      expect(result.current_quantity).toBe(2);
      // But movement should still be recorded
      expect(movementRepo.save).toHaveBeenCalled();
    });
  });

  describe('updateMachineInventory', () => {
    it('should update machine inventory settings', async () => {
      const existingInventory = {
        id: '1',
        machine_id: 'machine-1',
        nomenclature_id: 'nom-1',
        current_quantity: 25,
        min_stock_level: 5,
      };
      machineRepo.findOne.mockResolvedValue(existingInventory);
      machineRepo.save.mockResolvedValue({
        ...existingInventory,
        min_stock_level: 10,
      });

      const dto = { min_stock_level: 10 };

      const result = await service.updateMachineInventory('machine-1', 'nom-1', dto);

      expect(result.min_stock_level).toBe(10);
    });
  });

  describe('adjustMachineInventory - branch coverage', () => {
    it('should handle negative adjustment', async () => {
      const machineInventory = {
        id: 'mach-1',
        machine_id: 'machine-1',
        nomenclature_id: 'nom-1',
        current_quantity: 25,
      };

      machineRepo.findOne.mockResolvedValue(machineInventory);
      machineRepo.save.mockResolvedValue({
        ...machineInventory,
        current_quantity: 20,
      });
      movementRepo.create.mockReturnValue({});
      movementRepo.save.mockResolvedValue({});

      const dto = {
        actual_quantity: 20,
      };

      const result = await service.adjustMachineInventory('machine-1', 'nom-1', dto, 'user-1');

      expect(result.current_quantity).toBe(20);
      expect(movementRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          quantity: 5, // absolute difference
        }),
      );
    });
  });

  describe('reserveWarehouseStock - branch coverage', () => {
    it('should throw NotFoundException if warehouse inventory not found', async () => {
      mockManager.findOne.mockResolvedValueOnce(null);

      await expect(
        service.reserveWarehouseStock('nom-1', 20, 'task:task-1', 'user-1'),
      ).rejects.toThrow('не найден на складе');
    });
  });

  describe('releaseWarehouseReservation - branch coverage', () => {
    it('should throw NotFoundException if warehouse inventory not found', async () => {
      mockManager.findOne.mockResolvedValueOnce(null);

      await expect(service.releaseWarehouseReservation('nom-1', 20, 'task:task-1')).rejects.toThrow(
        'не найден на складе',
      );
    });
  });

  describe('getMovements - all filter branches', () => {
    const setupQueryBuilder = () => ({
      leftJoin: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    });

    it('should filter by nomenclatureId', async () => {
      const queryBuilder = setupQueryBuilder();
      movementRepo.createQueryBuilder.mockReturnValue(queryBuilder);

      await service.getMovements(undefined, 'nom-1');

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'movement.nomenclature_id = :nomenclatureId',
        { nomenclatureId: 'nom-1' },
      );
    });

    it('should filter by machineId', async () => {
      const queryBuilder = setupQueryBuilder();
      movementRepo.createQueryBuilder.mockReturnValue(queryBuilder);

      await service.getMovements(undefined, undefined, 'machine-1');

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('movement.machine_id = :machineId', {
        machineId: 'machine-1',
      });
    });

    it('should filter by operatorId', async () => {
      const queryBuilder = setupQueryBuilder();
      movementRepo.createQueryBuilder.mockReturnValue(queryBuilder);

      await service.getMovements(undefined, undefined, undefined, 'op-1');

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('movement.operator_id = :operatorId', {
        operatorId: 'op-1',
      });
    });

    it('should filter by date range', async () => {
      const queryBuilder = setupQueryBuilder();
      movementRepo.createQueryBuilder.mockReturnValue(queryBuilder);

      const dateFrom = new Date('2025-01-01');
      const dateTo = new Date('2025-01-31');

      await service.getMovements(undefined, undefined, undefined, undefined, dateFrom, dateTo);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'movement.created_at BETWEEN :dateFrom AND :dateTo',
        { dateFrom, dateTo },
      );
    });
  });

  // ============================================================================
  // RESERVATION WORKFLOW TESTS
  // ============================================================================

  describe('createReservation', () => {
    it('should create reservations for multiple items', async () => {
      const operatorInventory = {
        id: 'op-1',
        operator_id: 'operator-1',
        nomenclature_id: 'nom-1',
        current_quantity: 100,
        reserved_quantity: 10,
      };

      mockManager.findOne.mockResolvedValue(operatorInventory);
      mockManager.create.mockReturnValue({
        task_id: 'task-1',
        nomenclature_id: 'nom-1',
        quantity_reserved: 20,
        status: ReservationStatus.PENDING,
      });
      mockManager.save.mockResolvedValue({
        id: 'res-1',
        task_id: 'task-1',
        nomenclature_id: 'nom-1',
        quantity_reserved: 20,
        status: ReservationStatus.PENDING,
      });

      const items = [{ nomenclature_id: 'nom-1', quantity: 20 }];

      const result = await service.createReservation('task-1', 'operator-1', items);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(ReservationStatus.PENDING);
    });

    it('should throw if operator has no inventory for item', async () => {
      mockManager.findOne.mockResolvedValue(null);

      const items = [{ nomenclature_id: 'nom-1', quantity: 20 }];

      await expect(service.createReservation('task-1', 'operator-1', items)).rejects.toThrow(
        'нет товара',
      );
    });

    it('should throw if insufficient available quantity', async () => {
      const operatorInventory = {
        id: 'op-1',
        operator_id: 'operator-1',
        nomenclature_id: 'nom-1',
        current_quantity: 30,
        reserved_quantity: 25,
      };

      mockManager.findOne.mockResolvedValue(operatorInventory);

      const items = [{ nomenclature_id: 'nom-1', quantity: 20 }];

      await expect(service.createReservation('task-1', 'operator-1', items)).rejects.toThrow(
        'Недостаточно товара',
      );
    });
  });

  describe('fulfillReservation', () => {
    it('should fulfill reservations and release reserved quantity', async () => {
      const reservation = {
        id: 'res-1',
        task_id: 'task-1',
        nomenclature_id: 'nom-1',
        quantity_reserved: 20,
        quantity_fulfilled: 0,
        status: ReservationStatus.PENDING,
        reference_id: 'operator-1',
      };
      const operatorInventory = {
        id: 'op-1',
        operator_id: 'operator-1',
        nomenclature_id: 'nom-1',
        reserved_quantity: 20,
      };

      mockManager.find.mockResolvedValue([reservation]);
      mockManager.findOne.mockResolvedValue(operatorInventory);
      mockManager.save.mockResolvedValue({});

      const result = await service.fulfillReservation('task-1');

      expect(result).toHaveLength(1);
      expect(mockManager.save).toHaveBeenCalled();
    });

    it('should return empty array if no pending reservations', async () => {
      mockManager.find.mockResolvedValue([]);

      const result = await service.fulfillReservation('task-1');

      expect(result).toEqual([]);
    });

    it('should handle case when operator inventory not found during fulfillment', async () => {
      const reservation = {
        id: 'res-1',
        task_id: 'task-1',
        nomenclature_id: 'nom-1',
        quantity_reserved: 20,
        quantity_fulfilled: 0,
        status: ReservationStatus.PENDING,
        reference_id: 'operator-1',
      };

      mockManager.find.mockResolvedValue([reservation]);
      mockManager.findOne.mockResolvedValue(null);
      mockManager.save.mockResolvedValue({});

      const result = await service.fulfillReservation('task-1');

      expect(result).toHaveLength(1);
    });
  });

  describe('cancelReservation', () => {
    it('should cancel reservations and release operator inventory', async () => {
      const reservation = {
        id: 'res-1',
        task_id: 'task-1',
        nomenclature_id: 'nom-1',
        quantity_reserved: 20,
        status: ReservationStatus.PENDING,
        inventory_level: InventoryLevel.OPERATOR,
        reference_id: 'operator-1',
      };
      const operatorInventory = {
        id: 'op-1',
        operator_id: 'operator-1',
        nomenclature_id: 'nom-1',
        reserved_quantity: 20,
      };

      mockManager.find.mockResolvedValue([reservation]);
      mockManager.findOne.mockResolvedValue(operatorInventory);
      mockManager.save.mockResolvedValue({});

      const result = await service.cancelReservation('task-1');

      expect(result).toHaveLength(1);
      expect(mockManager.save).toHaveBeenCalled();
    });

    it('should cancel reservations and release warehouse inventory', async () => {
      const reservation = {
        id: 'res-1',
        task_id: 'task-1',
        nomenclature_id: 'nom-1',
        quantity_reserved: 20,
        status: ReservationStatus.PENDING,
        inventory_level: InventoryLevel.WAREHOUSE,
        reference_id: null,
      };
      const warehouseInventory = {
        id: 'wh-1',
        nomenclature_id: 'nom-1',
        reserved_quantity: 20,
      };

      mockManager.find.mockResolvedValue([reservation]);
      mockManager.findOne.mockResolvedValue(warehouseInventory);
      mockManager.save.mockResolvedValue({});

      const result = await service.cancelReservation('task-1');

      expect(result).toHaveLength(1);
    });

    it('should return empty array if no pending reservations', async () => {
      mockManager.find.mockResolvedValue([]);

      const result = await service.cancelReservation('task-1');

      expect(result).toEqual([]);
    });

    it('should handle case when operator inventory not found during cancellation', async () => {
      const reservation = {
        id: 'res-1',
        task_id: 'task-1',
        nomenclature_id: 'nom-1',
        quantity_reserved: 20,
        status: ReservationStatus.PENDING,
        inventory_level: InventoryLevel.OPERATOR,
        reference_id: 'operator-1',
      };

      mockManager.find.mockResolvedValue([reservation]);
      mockManager.findOne.mockResolvedValue(null);
      mockManager.save.mockResolvedValue({});

      const result = await service.cancelReservation('task-1');

      expect(result).toHaveLength(1);
    });

    it('should handle case when warehouse inventory not found during cancellation', async () => {
      const reservation = {
        id: 'res-1',
        task_id: 'task-1',
        nomenclature_id: 'nom-1',
        quantity_reserved: 20,
        status: ReservationStatus.PENDING,
        inventory_level: InventoryLevel.WAREHOUSE,
        reference_id: null,
      };

      mockManager.find.mockResolvedValue([reservation]);
      mockManager.findOne.mockResolvedValue(null);
      mockManager.save.mockResolvedValue({});

      const result = await service.cancelReservation('task-1');

      expect(result).toHaveLength(1);
    });
  });

  describe('expireOldReservations', () => {
    it('should expire old reservations and release operator inventory', async () => {
      const reservation = {
        id: 'res-1',
        task_id: 'task-1',
        nomenclature_id: 'nom-1',
        quantity_reserved: 20,
        status: ReservationStatus.PENDING,
        inventory_level: InventoryLevel.OPERATOR,
        reference_id: 'operator-1',
        expires_at: new Date('2024-01-01'),
      };
      const operatorInventory = {
        id: 'op-1',
        operator_id: 'operator-1',
        nomenclature_id: 'nom-1',
        reserved_quantity: 20,
      };

      mockManager.find.mockResolvedValue([reservation]);
      mockManager.findOne.mockResolvedValue(operatorInventory);
      mockManager.save.mockResolvedValue({});

      const result = await service.expireOldReservations();

      expect(result).toBe(1);
    });

    it('should return 0 if no expired reservations', async () => {
      mockManager.find.mockResolvedValue([]);

      const result = await service.expireOldReservations();

      expect(result).toBe(0);
    });

    it('should expire reservations and release warehouse inventory', async () => {
      const reservation = {
        id: 'res-1',
        task_id: 'task-1',
        nomenclature_id: 'nom-1',
        quantity_reserved: 20,
        status: ReservationStatus.PENDING,
        inventory_level: InventoryLevel.WAREHOUSE,
        reference_id: null,
        expires_at: new Date('2024-01-01'),
      };
      const warehouseInventory = {
        id: 'wh-1',
        nomenclature_id: 'nom-1',
        reserved_quantity: 20,
      };

      mockManager.find.mockResolvedValue([reservation]);
      mockManager.findOne.mockResolvedValue(warehouseInventory);
      mockManager.save.mockResolvedValue({});

      const result = await service.expireOldReservations();

      expect(result).toBe(1);
    });

    it('should handle case when inventory not found during expiration', async () => {
      const reservation = {
        id: 'res-1',
        task_id: 'task-1',
        nomenclature_id: 'nom-1',
        quantity_reserved: 20,
        status: ReservationStatus.PENDING,
        inventory_level: InventoryLevel.OPERATOR,
        reference_id: 'operator-1',
        expires_at: new Date('2024-01-01'),
      };

      mockManager.find.mockResolvedValue([reservation]);
      mockManager.findOne.mockResolvedValue(null);
      mockManager.save.mockResolvedValue({});

      const result = await service.expireOldReservations();

      expect(result).toBe(1);
    });
  });

  describe('getReservationsByTask', () => {
    it('should return reservations for a task', async () => {
      const reservations = [
        { id: 'res-1', task_id: 'task-1', nomenclature_id: 'nom-1', quantity_reserved: 20 },
      ];
      reservationRepo.find.mockResolvedValue(reservations);

      const result = await service.getReservationsByTask('task-1');

      expect(result).toEqual(reservations);
      expect(reservationRepo.find).toHaveBeenCalledWith({
        where: { task_id: 'task-1' },
        order: { created_at: 'DESC' },
      });
    });
  });

  describe('getActiveReservationsByOperator', () => {
    it('should return active reservations for an operator', async () => {
      const reservations = [
        {
          id: 'res-1',
          reference_id: 'operator-1',
          status: ReservationStatus.PENDING,
          inventory_level: InventoryLevel.OPERATOR,
        },
      ];
      reservationRepo.find.mockResolvedValue(reservations);

      const result = await service.getActiveReservationsByOperator('operator-1');

      expect(result).toEqual(reservations);
      expect(reservationRepo.find).toHaveBeenCalledWith({
        where: {
          reference_id: 'operator-1',
          inventory_level: InventoryLevel.OPERATOR,
          status: ReservationStatus.PENDING,
        },
        order: { created_at: 'DESC' },
      });
    });
  });

  describe('getActiveReservations', () => {
    it('should return all active reservations', async () => {
      const reservations = [
        { id: 'res-1', status: ReservationStatus.PENDING },
        { id: 'res-2', status: ReservationStatus.PENDING },
      ];
      reservationRepo.find.mockResolvedValue(reservations);

      const result = await service.getActiveReservations();

      expect(result).toEqual(reservations);
      expect(reservationRepo.find).toHaveBeenCalledWith({
        where: { status: ReservationStatus.PENDING },
        order: { created_at: 'DESC' },
      });
    });
  });

  describe('getReservationsByOperator', () => {
    it('should return all reservations for an operator', async () => {
      const reservations = [
        { id: 'res-1', reference_id: 'operator-1', status: ReservationStatus.PENDING },
        { id: 'res-2', reference_id: 'operator-1', status: ReservationStatus.FULFILLED },
      ];
      reservationRepo.find.mockResolvedValue(reservations);

      const result = await service.getReservationsByOperator('operator-1');

      expect(result).toEqual(reservations);
      expect(reservationRepo.find).toHaveBeenCalledWith({
        where: {
          reference_id: 'operator-1',
          inventory_level: InventoryLevel.OPERATOR,
        },
        order: { created_at: 'DESC' },
      });
    });
  });
});
