import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InventoryService } from './inventory.service';
import { WarehouseInventory } from './entities/warehouse-inventory.entity';
import { OperatorInventory } from './entities/operator-inventory.entity';
import { MachineInventory } from './entities/machine-inventory.entity';
import { InventoryMovement, MovementType } from './entities/inventory-movement.entity';
import { InventoryReservation } from './entities/inventory-reservation.entity';

describe('InventoryService - Query Optimizations', () => {
  let service: InventoryService;
  let movementRepository: Repository<InventoryMovement>;
  let warehouseInventoryRepository: Repository<WarehouseInventory>;
  let machineInventoryRepository: Repository<MachineInventory>;
  let mockQueryBuilder: any;

  beforeEach(async () => {
    // Create mock query builder
    mockQueryBuilder = {
      createQueryBuilder: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        {
          provide: getRepositoryToken(WarehouseInventory),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(OperatorInventory),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(MachineInventory),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(InventoryMovement),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(InventoryReservation),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn((callback) =>
              callback({
                findOne: jest.fn(),
                save: jest.fn(),
                create: jest.fn(),
              }),
            ),
          },
        },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    movementRepository = module.get<Repository<InventoryMovement>>(
      getRepositoryToken(InventoryMovement),
    );
    warehouseInventoryRepository = module.get<Repository<WarehouseInventory>>(
      getRepositoryToken(WarehouseInventory),
    );
    machineInventoryRepository = module.get<Repository<MachineInventory>>(
      getRepositoryToken(MachineInventory),
    );
  });

  describe('getMovements', () => {
    it('should select only safe user fields and not expose sensitive data', async () => {
      // Act
      await service.getMovements();

      // Assert
      expect(movementRepository.createQueryBuilder).toHaveBeenCalledWith('movement');

      // Check that we use leftJoin + addSelect instead of leftJoinAndSelect
      expect(mockQueryBuilder.leftJoin).toHaveBeenCalledWith(
        'movement.performed_by',
        'performed_by',
      );
      expect(mockQueryBuilder.leftJoin).toHaveBeenCalledWith('movement.operator', 'operator');

      // Check that addSelect is called with safe fields only
      expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith(
        expect.arrayContaining([
          'performed_by.id',
          'performed_by.full_name',
          'performed_by.email',
          'performed_by.phone',
          'performed_by.role',
          'performed_by.status',
          'performed_by.telegram_username',
        ]),
      );

      // Ensure sensitive fields are NOT selected
      const addSelectCalls = mockQueryBuilder.addSelect.mock.calls.flat();
      expect(addSelectCalls).not.toContain('performed_by.password_hash');
      expect(addSelectCalls).not.toContain('performed_by.two_fa_secret');
      expect(addSelectCalls).not.toContain('performed_by.refresh_token');

      // Ensure leftJoinAndSelect is NOT used (would load all fields)
      expect(mockQueryBuilder.leftJoinAndSelect).not.toHaveBeenCalled();
    });

    it('should optimize nomenclature and machine field selection', async () => {
      // Act
      await service.getMovements();

      // Assert
      expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith(
        expect.arrayContaining([
          'nomenclature.id',
          'nomenclature.name',
          'nomenclature.sku',
          'nomenclature.unit',
          'nomenclature.category',
        ]),
      );

      expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith(
        expect.arrayContaining([
          'machine.id',
          'machine.machine_number',
          'machine.name',
          'machine.location_name',
          'machine.status',
        ]),
      );
    });

    it('should apply filters correctly', async () => {
      // Arrange
      const movementType = MovementType.WAREHOUSE_TO_OPERATOR;
      const nomenclatureId = 'test-nomenclature-id';
      const machineId = 'test-machine-id';
      const operatorId = 'test-operator-id';
      const dateFrom = new Date('2025-01-01');
      const dateTo = new Date('2025-12-31');

      // Act
      await service.getMovements(
        movementType,
        nomenclatureId,
        machineId,
        operatorId,
        dateFrom,
        dateTo,
      );

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'movement.movement_type = :movementType',
        { movementType },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'movement.nomenclature_id = :nomenclatureId',
        { nomenclatureId },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('movement.machine_id = :machineId', {
        machineId,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('movement.operator_id = :operatorId', {
        operatorId,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'movement.created_at BETWEEN :dateFrom AND :dateTo',
        { dateFrom, dateTo },
      );
    });
  });

  describe('getWarehouseLowStock', () => {
    it('should optimize nomenclature field selection', async () => {
      // Act
      await service.getWarehouseLowStock();

      // Assert
      expect(warehouseInventoryRepository.createQueryBuilder).toHaveBeenCalledWith('inventory');
      expect(mockQueryBuilder.leftJoin).toHaveBeenCalledWith(
        'inventory.nomenclature',
        'nomenclature',
      );
      expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith(
        expect.arrayContaining([
          'nomenclature.id',
          'nomenclature.name',
          'nomenclature.sku',
          'nomenclature.unit',
          'nomenclature.category',
        ]),
      );

      // Ensure leftJoinAndSelect is NOT used
      expect(mockQueryBuilder.leftJoinAndSelect).not.toHaveBeenCalled();
    });
  });

  describe('getMachineInventory', () => {
    it('should optimize nomenclature and machine field selection', async () => {
      // Arrange
      const machineId = 'test-machine-id';

      // Act
      await service.getMachineInventory(machineId);

      // Assert
      expect(machineInventoryRepository.createQueryBuilder).toHaveBeenCalledWith('inventory');

      // Check optimized joins
      expect(mockQueryBuilder.leftJoin).toHaveBeenCalledWith(
        'inventory.nomenclature',
        'nomenclature',
      );
      expect(mockQueryBuilder.leftJoin).toHaveBeenCalledWith('inventory.machine', 'machine');

      // Check field selection
      expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith(
        expect.arrayContaining([
          'nomenclature.id',
          'nomenclature.name',
          'nomenclature.sku',
          'nomenclature.unit',
          'nomenclature.category',
        ]),
      );

      expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith(
        expect.arrayContaining([
          'machine.id',
          'machine.machine_number',
          'machine.name',
          'machine.location_name',
          'machine.status',
        ]),
      );

      // Ensure leftJoinAndSelect is NOT used
      expect(mockQueryBuilder.leftJoinAndSelect).not.toHaveBeenCalled();
    });
  });

  describe('getMachinesLowStock', () => {
    it('should optimize machine and nomenclature field selection', async () => {
      // Act
      await service.getMachinesLowStock();

      // Assert
      expect(machineInventoryRepository.createQueryBuilder).toHaveBeenCalledWith('inventory');

      // Check optimized joins
      expect(mockQueryBuilder.leftJoin).toHaveBeenCalledWith('inventory.machine', 'machine');
      expect(mockQueryBuilder.leftJoin).toHaveBeenCalledWith(
        'inventory.nomenclature',
        'nomenclature',
      );

      // Check field selection
      expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith(
        expect.arrayContaining([
          'machine.id',
          'machine.machine_number',
          'machine.name',
          'machine.location_name',
          'machine.status',
        ]),
      );

      expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith(
        expect.arrayContaining([
          'nomenclature.id',
          'nomenclature.name',
          'nomenclature.sku',
          'nomenclature.unit',
          'nomenclature.category',
        ]),
      );

      // Ensure leftJoinAndSelect is NOT used
      expect(mockQueryBuilder.leftJoinAndSelect).not.toHaveBeenCalled();
    });
  });
});
