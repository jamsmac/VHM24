import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InventoryService } from './inventory.service';
import { WarehouseInventoryService } from './services/warehouse-inventory.service';
import { OperatorInventoryService } from './services/operator-inventory.service';
import { MachineInventoryService } from './services/machine-inventory.service';
import { InventoryTransferService } from './services/inventory-transfer.service';
import { InventoryMovementService } from './services/inventory-movement.service';
import { InventoryReservationService } from './services/inventory-reservation.service';
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

/**
 * NOTE: These tests are skipped because they test the InventoryService (facade)
 * as if it directly uses repositories. However, InventoryService is a pure
 * delegation layer that delegates all calls to specialized sub-services.
 *
 * Comprehensive tests for these operations should be in the sub-service test files:
 * - warehouse-inventory.service.spec.ts
 * - operator-inventory.service.spec.ts
 * - machine-inventory.service.spec.ts
 * - inventory-transfer.service.spec.ts
 * - inventory-reservation.service.spec.ts
 * - inventory-movement.service.spec.ts
 *
 * The main InventoryService (facade) tests are in inventory.service.spec.ts
 * which verifies proper delegation to sub-services.
 *
 * Original test suite description:
 * This test suite was meant to cover:
 * - Warehouse inventory operations
 * - Operator inventory operations
 * - Machine inventory operations
 * - Transfers (with transactions and pessimistic locking)
 * - Reservations lifecycle
 * - Inventory movements
 * - Error handling and edge cases
 *
 * Test Coverage Target: 70%+
 */
describe.skip('InventoryService - Comprehensive Tests', () => {
  let service: InventoryService;
  let warehouseRepo: any;
  let operatorRepo: any;
  let machineRepo: any;
  let movementRepo: any;
  let reservationRepo: any;
  let dataSource: any;
  let mockManager: any;

  // Test data fixtures
  const testUserId = '11111111-1111-1111-1111-111111111111';
  const testOperatorId = '22222222-2222-2222-2222-222222222222';
  const testMachineId = '33333333-3333-3333-3333-333333333333';
  const testNomenclatureId = '44444444-4444-4444-4444-444444444444';
  const testTaskId = '55555555-5555-5555-5555-555555555555';

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
      save: jest.fn((entity, data) => Promise.resolve({ id: 'new-id', ...data })),
    };

    // Mock DataSource with transaction support
    dataSource = {
      transaction: jest.fn((callback) => callback(mockManager)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        {
          provide: WarehouseInventoryService,
          useValue: {
            getWarehouseInventory: jest.fn().mockResolvedValue([]),
            getWarehouseLowStock: jest.fn().mockResolvedValue([]),
            getWarehouseInventoryByNomenclature: jest.fn().mockResolvedValue(null),
            addToWarehouse: jest.fn().mockResolvedValue({}),
            removeFromWarehouse: jest.fn().mockResolvedValue({}),
            updateWarehouseInventory: jest.fn().mockResolvedValue({}),
            reserveWarehouseStock: jest.fn().mockResolvedValue(undefined),
            releaseWarehouseReservation: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: OperatorInventoryService,
          useValue: {
            getOperatorInventory: jest.fn().mockResolvedValue([]),
            getOperatorInventoryByNomenclature: jest.fn().mockResolvedValue(null),
            addToOperator: jest.fn().mockResolvedValue({}),
            removeFromOperator: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: MachineInventoryService,
          useValue: {
            getMachineInventory: jest.fn().mockResolvedValue([]),
            getMachineLowStock: jest.fn().mockResolvedValue([]),
            getMachineInventoryByNomenclature: jest.fn().mockResolvedValue(null),
            addToMachine: jest.fn().mockResolvedValue({}),
            removeFromMachine: jest.fn().mockResolvedValue({}),
            updateMachineInventory: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: InventoryTransferService,
          useValue: {
            transferWarehouseToOperator: jest.fn().mockResolvedValue({}),
            transferOperatorToMachine: jest.fn().mockResolvedValue({}),
            transferMachineToOperator: jest.fn().mockResolvedValue({}),
            transferOperatorToWarehouse: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: InventoryMovementService,
          useValue: {
            createMovement: jest.fn().mockResolvedValue({}),
            getMovements: jest.fn().mockResolvedValue([]),
            getMovementsByNomenclature: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: InventoryReservationService,
          useValue: {
            createReservation: jest.fn().mockResolvedValue({}),
            confirmReservation: jest.fn().mockResolvedValue({}),
            cancelReservation: jest.fn().mockResolvedValue({}),
            getActiveReservations: jest.fn().mockResolvedValue([]),
          },
        },
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

  describe('Warehouse Inventory Operations', () => {
    describe('getWarehouseInventory', () => {
      it('should return all warehouse inventory items sorted by nomenclature name', async () => {
        // Arrange
        const mockInventory = [
          { id: '1', nomenclature_id: 'nom-1', current_quantity: 100 },
          { id: '2', nomenclature_id: 'nom-2', current_quantity: 200 },
        ];
        warehouseRepo.find.mockResolvedValue(mockInventory);

        // Act
        const result = await service.getWarehouseInventory();

        // Assert
        expect(result).toEqual(mockInventory);
        expect(warehouseRepo.find).toHaveBeenCalledWith({
          order: { nomenclature: { name: 'ASC' } },
        });
      });

      it('should return empty array when no warehouse inventory exists', async () => {
        // Arrange
        warehouseRepo.find.mockResolvedValue([]);

        // Act
        const result = await service.getWarehouseInventory();

        // Assert
        expect(result).toEqual([]);
      });
    });

    describe('getWarehouseInventoryByNomenclature', () => {
      it('should return existing warehouse inventory for nomenclature', async () => {
        // Arrange
        const mockInventory = {
          id: '1',
          nomenclature_id: testNomenclatureId,
          current_quantity: 100,
        };
        warehouseRepo.findOne.mockResolvedValue(mockInventory);

        // Act
        const result = await service.getWarehouseInventoryByNomenclature(testNomenclatureId);

        // Assert
        expect(result).toEqual(mockInventory);
        expect(warehouseRepo.findOne).toHaveBeenCalledWith({
          where: { nomenclature_id: testNomenclatureId },
        });
      });

      it('should create new inventory record with zero quantity if not exists', async () => {
        // Arrange
        warehouseRepo.findOne.mockResolvedValue(null);
        const newInventory = {
          nomenclature_id: testNomenclatureId,
          current_quantity: 0,
          min_stock_level: 0,
        };
        warehouseRepo.create.mockReturnValue(newInventory);
        warehouseRepo.save.mockResolvedValue({ id: 'new-1', ...newInventory });

        // Act
        const result = await service.getWarehouseInventoryByNomenclature(testNomenclatureId);

        // Assert
        expect(result.id).toBe('new-1');
        expect(result.current_quantity).toBe(0);
        expect(warehouseRepo.create).toHaveBeenCalledWith({
          nomenclature_id: testNomenclatureId,
          current_quantity: 0,
          min_stock_level: 0,
        });
        expect(warehouseRepo.save).toHaveBeenCalled();
      });
    });

    describe('addToWarehouse', () => {
      it('should add quantity to existing warehouse inventory', async () => {
        // Arrange
        const existingInventory = {
          id: '1',
          nomenclature_id: testNomenclatureId,
          current_quantity: 100,
        };
        warehouseRepo.findOne.mockResolvedValue(existingInventory);
        warehouseRepo.save.mockResolvedValue({
          ...existingInventory,
          current_quantity: 150,
          last_restocked_at: expect.any(Date),
        });
        movementRepo.create.mockReturnValue({});
        movementRepo.save.mockResolvedValue({});

        const dto = {
          nomenclature_id: testNomenclatureId,
          quantity: 50,
          notes: 'Test addition',
        };

        // Act
        const result = await service.addToWarehouse(dto, testUserId);

        // Assert
        expect(result.current_quantity).toBe(150);
        expect(warehouseRepo.save).toHaveBeenCalled();
        expect(movementRepo.save).toHaveBeenCalled();
      });

      it('should create movement record with WAREHOUSE_IN type', async () => {
        // Arrange
        const existingInventory = {
          id: '1',
          nomenclature_id: testNomenclatureId,
          current_quantity: 100,
        };
        warehouseRepo.findOne.mockResolvedValue(existingInventory);
        warehouseRepo.save.mockResolvedValue({ ...existingInventory, current_quantity: 150 });
        movementRepo.create.mockReturnValue({});
        movementRepo.save.mockResolvedValue({});

        const dto = {
          nomenclature_id: testNomenclatureId,
          quantity: 50,
          notes: 'Purchase order',
          metadata: { invoice: 'INV-001' },
        };

        // Act
        await service.addToWarehouse(dto, testUserId);

        // Assert
        expect(movementRepo.create).toHaveBeenCalledWith({
          movement_type: MovementType.WAREHOUSE_IN,
          nomenclature_id: testNomenclatureId,
          quantity: 50,
          performed_by_user_id: testUserId,
          notes: 'Purchase order',
          metadata: { invoice: 'INV-001' },
        });
      });

      it('should handle decimal quantities correctly', async () => {
        // Arrange
        const existingInventory = {
          id: '1',
          nomenclature_id: testNomenclatureId,
          current_quantity: 100.5,
        };
        warehouseRepo.findOne.mockResolvedValue(existingInventory);
        warehouseRepo.save.mockImplementation((inv: any) => Promise.resolve(inv));
        movementRepo.create.mockReturnValue({});
        movementRepo.save.mockResolvedValue({});

        const dto = {
          nomenclature_id: testNomenclatureId,
          quantity: 25.75,
        };

        // Act
        const result = await service.addToWarehouse(dto, testUserId);

        // Assert
        expect(result.current_quantity).toBe(126.25);
      });
    });

    describe('removeFromWarehouse', () => {
      it('should remove quantity from warehouse inventory', async () => {
        // Arrange
        const existingInventory = {
          id: '1',
          nomenclature_id: testNomenclatureId,
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
          nomenclature_id: testNomenclatureId,
          quantity: 30,
          notes: 'Write-off expired items',
        };

        // Act
        const result = await service.removeFromWarehouse(dto, testUserId);

        // Assert
        expect(result.current_quantity).toBe(70);
      });

      it('should throw BadRequestException when insufficient quantity in warehouse', async () => {
        // Arrange
        const existingInventory = {
          id: '1',
          nomenclature_id: testNomenclatureId,
          current_quantity: 10,
        };
        warehouseRepo.findOne.mockResolvedValue(existingInventory);

        const dto = {
          nomenclature_id: testNomenclatureId,
          quantity: 50,
        };

        // Act & Assert
        await expect(service.removeFromWarehouse(dto, testUserId)).rejects.toThrow(
          BadRequestException,
        );
        await expect(service.removeFromWarehouse(dto, testUserId)).rejects.toThrow(
          /Недостаточно товара на складе/,
        );
      });

      it('should create movement record with WAREHOUSE_OUT type', async () => {
        // Arrange
        const existingInventory = {
          id: '1',
          nomenclature_id: testNomenclatureId,
          current_quantity: 100,
        };
        warehouseRepo.findOne.mockResolvedValue(existingInventory);
        warehouseRepo.save.mockResolvedValue({ ...existingInventory, current_quantity: 70 });
        movementRepo.create.mockReturnValue({});
        movementRepo.save.mockResolvedValue({});

        const dto = {
          nomenclature_id: testNomenclatureId,
          quantity: 30,
        };

        // Act
        await service.removeFromWarehouse(dto, testUserId);

        // Assert
        expect(movementRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({
            movement_type: MovementType.WAREHOUSE_OUT,
            nomenclature_id: testNomenclatureId,
            quantity: 30,
          }),
        );
      });
    });

    describe('updateWarehouseInventory', () => {
      it('should update warehouse inventory settings', async () => {
        // Arrange
        const existingInventory = {
          id: '1',
          nomenclature_id: testNomenclatureId,
          current_quantity: 100,
          min_stock_level: 10,
        };
        warehouseRepo.findOne.mockResolvedValue(existingInventory);
        warehouseRepo.save.mockImplementation((inv: any) => Promise.resolve(inv));

        const dto = {
          min_stock_level: 25,
        };

        // Act
        const result = await service.updateWarehouseInventory(testNomenclatureId, dto);

        // Assert
        expect(result.min_stock_level).toBe(25);
      });
    });

    describe('getWarehouseLowStock', () => {
      it('should return items with quantity below min stock level', async () => {
        // Arrange
        const lowStockItems = [
          { id: '1', current_quantity: 5, min_stock_level: 10, nomenclature: { name: 'Item A' } },
          { id: '2', current_quantity: 2, min_stock_level: 20, nomenclature: { name: 'Item B' } },
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

        // Act
        const result = await service.getWarehouseLowStock();

        // Assert
        expect(result).toEqual(lowStockItems);
        expect(queryBuilder.where).toHaveBeenCalledWith(
          'inventory.current_quantity <= inventory.min_stock_level',
        );
        expect(queryBuilder.andWhere).toHaveBeenCalledWith('inventory.min_stock_level > 0');
      });

      it('should return empty array when no low stock items', async () => {
        // Arrange
        const queryBuilder = {
          leftJoin: jest.fn().mockReturnThis(),
          addSelect: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([]),
        };

        warehouseRepo.createQueryBuilder.mockReturnValue(queryBuilder);

        // Act
        const result = await service.getWarehouseLowStock();

        // Assert
        expect(result).toEqual([]);
      });
    });
  });

  // ============================================================================
  // OPERATOR INVENTORY TESTS
  // ============================================================================

  describe('Operator Inventory Operations', () => {
    describe('getOperatorInventory', () => {
      it('should return operator inventory items sorted by nomenclature name', async () => {
        // Arrange
        const mockInventory = [
          { id: '1', operator_id: testOperatorId, nomenclature_id: 'nom-1', current_quantity: 50 },
        ];
        operatorRepo.find.mockResolvedValue(mockInventory);

        // Act
        const result = await service.getOperatorInventory(testOperatorId);

        // Assert
        expect(result).toEqual(mockInventory);
        expect(operatorRepo.find).toHaveBeenCalledWith({
          where: { operator_id: testOperatorId },
          order: { nomenclature: { name: 'ASC' } },
        });
      });
    });

    describe('getOperatorInventoryByNomenclature', () => {
      it('should return existing operator inventory', async () => {
        // Arrange
        const mockInventory = {
          id: '1',
          operator_id: testOperatorId,
          nomenclature_id: testNomenclatureId,
          current_quantity: 50,
        };
        operatorRepo.findOne.mockResolvedValue(mockInventory);

        // Act
        const result = await service.getOperatorInventoryByNomenclature(
          testOperatorId,
          testNomenclatureId,
        );

        // Assert
        expect(result).toEqual(mockInventory);
      });

      it('should create new inventory record if not exists', async () => {
        // Arrange
        operatorRepo.findOne.mockResolvedValue(null);
        operatorRepo.create.mockReturnValue({
          operator_id: testOperatorId,
          nomenclature_id: testNomenclatureId,
          current_quantity: 0,
        });
        operatorRepo.save.mockResolvedValue({
          id: 'new-1',
          operator_id: testOperatorId,
          nomenclature_id: testNomenclatureId,
          current_quantity: 0,
        });

        // Act
        const result = await service.getOperatorInventoryByNomenclature(
          testOperatorId,
          testNomenclatureId,
        );

        // Assert
        expect(result.current_quantity).toBe(0);
        expect(operatorRepo.create).toHaveBeenCalled();
      });
    });
  });

  // ============================================================================
  // TRANSFER OPERATIONS TESTS (WITH TRANSACTIONS)
  // ============================================================================

  describe('Transfer Operations', () => {
    describe('transferWarehouseToOperator', () => {
      it('should successfully transfer inventory from warehouse to operator', async () => {
        // Arrange
        const warehouseInventory = {
          id: 'wh-1',
          nomenclature_id: testNomenclatureId,
          current_quantity: 100,
        };
        const operatorInventory = {
          id: 'op-1',
          operator_id: testOperatorId,
          nomenclature_id: testNomenclatureId,
          current_quantity: 20,
        };

        mockManager.findOne
          .mockResolvedValueOnce(warehouseInventory) // First call: warehouse
          .mockResolvedValueOnce(operatorInventory); // Second call: operator

        mockManager.save
          .mockResolvedValueOnce({ ...warehouseInventory, current_quantity: 70 })
          .mockResolvedValueOnce({ ...operatorInventory, current_quantity: 50 })
          .mockResolvedValueOnce({}); // Movement record

        movementRepo.create.mockReturnValue({});
        movementRepo.save.mockResolvedValue({});

        const dto = {
          operator_id: testOperatorId,
          nomenclature_id: testNomenclatureId,
          quantity: 30,
        };

        // Act
        const result = await service.transferWarehouseToOperator(dto, testUserId);

        // Assert
        expect(result.warehouse.current_quantity).toBe(70);
        expect(result.operator.current_quantity).toBe(50);
        expect(dataSource.transaction).toHaveBeenCalled();
      });

      it('should throw BadRequestException when insufficient warehouse stock', async () => {
        // Arrange
        const warehouseInventory = {
          id: 'wh-1',
          nomenclature_id: testNomenclatureId,
          current_quantity: 10,
        };

        mockManager.findOne.mockResolvedValueOnce(warehouseInventory);

        const dto = {
          operator_id: testOperatorId,
          nomenclature_id: testNomenclatureId,
          quantity: 50,
        };

        // Act & Assert
        await expect(service.transferWarehouseToOperator(dto, testUserId)).rejects.toThrow(
          BadRequestException,
        );
      });

      it('should throw NotFoundException when warehouse inventory not found', async () => {
        // Arrange
        mockManager.findOne.mockResolvedValueOnce(null);

        const dto = {
          operator_id: testOperatorId,
          nomenclature_id: testNomenclatureId,
          quantity: 30,
        };

        // Act & Assert
        await expect(service.transferWarehouseToOperator(dto, testUserId)).rejects.toThrow(
          NotFoundException,
        );
      });

      it('should create new operator inventory if not exists', async () => {
        // Arrange
        const warehouseInventory = {
          id: 'wh-1',
          nomenclature_id: testNomenclatureId,
          current_quantity: 100,
        };

        mockManager.findOne.mockResolvedValueOnce(warehouseInventory).mockResolvedValueOnce(null); // No existing operator inventory

        mockManager.create.mockImplementation((entity: any, data: any) => ({
          ...data,
          current_quantity: data.current_quantity || 0,
        }));

        mockManager.save.mockResolvedValue({
          current_quantity: 70,
        });

        const dto = {
          operator_id: testOperatorId,
          nomenclature_id: testNomenclatureId,
          quantity: 30,
        };

        // Act
        const _result = await service.transferWarehouseToOperator(dto, testUserId);

        // Assert
        expect(mockManager.create).toHaveBeenCalledWith(
          OperatorInventory,
          expect.objectContaining({
            operator_id: testOperatorId,
            nomenclature_id: testNomenclatureId,
            current_quantity: 0,
          }),
        );
      });
    });

    describe('transferOperatorToWarehouse', () => {
      it('should successfully return inventory from operator to warehouse', async () => {
        // Arrange
        const operatorInventory = {
          id: 'op-1',
          operator_id: testOperatorId,
          nomenclature_id: testNomenclatureId,
          current_quantity: 50,
        };
        const warehouseInventory = {
          id: 'wh-1',
          nomenclature_id: testNomenclatureId,
          current_quantity: 100,
        };

        mockManager.findOne
          .mockResolvedValueOnce(operatorInventory)
          .mockResolvedValueOnce(warehouseInventory);

        mockManager.save
          .mockResolvedValueOnce({ ...operatorInventory, current_quantity: 30 })
          .mockResolvedValueOnce({ ...warehouseInventory, current_quantity: 120 })
          .mockResolvedValueOnce({});

        const dto = {
          operator_id: testOperatorId,
          nomenclature_id: testNomenclatureId,
          quantity: 20,
        };

        // Act
        const result = await service.transferOperatorToWarehouse(dto, testUserId);

        // Assert
        expect(result.operator.current_quantity).toBe(30);
        expect(result.warehouse.current_quantity).toBe(120);
      });

      it('should throw BadRequestException when operator has insufficient stock', async () => {
        // Arrange
        const operatorInventory = {
          id: 'op-1',
          operator_id: testOperatorId,
          nomenclature_id: testNomenclatureId,
          current_quantity: 5,
        };

        mockManager.findOne.mockResolvedValueOnce(operatorInventory);

        const dto = {
          operator_id: testOperatorId,
          nomenclature_id: testNomenclatureId,
          quantity: 20,
        };

        // Act & Assert
        await expect(service.transferOperatorToWarehouse(dto, testUserId)).rejects.toThrow(
          BadRequestException,
        );
      });

      it('should throw NotFoundException when operator inventory not found', async () => {
        // Arrange
        mockManager.findOne.mockResolvedValueOnce(null);

        const dto = {
          operator_id: testOperatorId,
          nomenclature_id: testNomenclatureId,
          quantity: 20,
        };

        // Act & Assert
        await expect(service.transferOperatorToWarehouse(dto, testUserId)).rejects.toThrow(
          NotFoundException,
        );
      });
    });

    describe('transferOperatorToMachine', () => {
      it('should successfully transfer inventory from operator to machine (refill)', async () => {
        // Arrange
        const operatorInventory = {
          id: 'op-1',
          operator_id: testOperatorId,
          nomenclature_id: testNomenclatureId,
          current_quantity: 50,
        };
        const machineInventory = {
          id: 'mach-1',
          machine_id: testMachineId,
          nomenclature_id: testNomenclatureId,
          current_quantity: 10,
        };

        mockManager.findOne
          .mockResolvedValueOnce(operatorInventory)
          .mockResolvedValueOnce(machineInventory);

        mockManager.save
          .mockResolvedValueOnce({ ...operatorInventory, current_quantity: 30 })
          .mockResolvedValueOnce({ ...machineInventory, current_quantity: 30 })
          .mockResolvedValueOnce({});

        const dto = {
          operator_id: testOperatorId,
          machine_id: testMachineId,
          nomenclature_id: testNomenclatureId,
          quantity: 20,
          task_id: testTaskId,
        };

        // Act
        const result = await service.transferOperatorToMachine(dto, testUserId);

        // Assert
        expect(result.operator.current_quantity).toBe(30);
        expect(result.machine.current_quantity).toBe(30);
      });

      it('should throw BadRequestException when operator has insufficient stock', async () => {
        // Arrange
        const operatorInventory = {
          id: 'op-1',
          operator_id: testOperatorId,
          nomenclature_id: testNomenclatureId,
          current_quantity: 5,
        };

        mockManager.findOne.mockResolvedValueOnce(operatorInventory);

        const dto = {
          operator_id: testOperatorId,
          machine_id: testMachineId,
          nomenclature_id: testNomenclatureId,
          quantity: 20,
        };

        // Act & Assert
        await expect(service.transferOperatorToMachine(dto, testUserId)).rejects.toThrow(
          BadRequestException,
        );
      });

      it('should create new machine inventory if not exists', async () => {
        // Arrange
        const operatorInventory = {
          id: 'op-1',
          operator_id: testOperatorId,
          nomenclature_id: testNomenclatureId,
          current_quantity: 50,
        };

        mockManager.findOne.mockResolvedValueOnce(operatorInventory).mockResolvedValueOnce(null); // No existing machine inventory

        mockManager.create.mockImplementation((entity: any, data: any) => ({
          ...data,
          current_quantity: data.current_quantity || 0,
        }));

        mockManager.save.mockResolvedValue({ current_quantity: 30 });

        const dto = {
          operator_id: testOperatorId,
          machine_id: testMachineId,
          nomenclature_id: testNomenclatureId,
          quantity: 20,
        };

        // Act
        await service.transferOperatorToMachine(dto, testUserId);

        // Assert
        expect(mockManager.create).toHaveBeenCalledWith(
          MachineInventory,
          expect.objectContaining({
            machine_id: testMachineId,
            nomenclature_id: testNomenclatureId,
            current_quantity: 0,
          }),
        );
      });

      it('should record operation_date in movement when provided', async () => {
        // Arrange
        const operatorInventory = {
          id: 'op-1',
          operator_id: testOperatorId,
          nomenclature_id: testNomenclatureId,
          current_quantity: 50,
        };
        const machineInventory = {
          id: 'mach-1',
          machine_id: testMachineId,
          nomenclature_id: testNomenclatureId,
          current_quantity: 10,
        };

        mockManager.findOne
          .mockResolvedValueOnce(operatorInventory)
          .mockResolvedValueOnce(machineInventory);

        mockManager.save.mockResolvedValue({});

        const operationDate = '2025-11-20T10:00:00Z';
        const dto = {
          operator_id: testOperatorId,
          machine_id: testMachineId,
          nomenclature_id: testNomenclatureId,
          quantity: 20,
          operation_date: operationDate,
        };

        // Act
        await service.transferOperatorToMachine(dto, testUserId);

        // Assert
        expect(mockManager.create).toHaveBeenCalledWith(
          InventoryMovement,
          expect.objectContaining({
            operation_date: new Date(operationDate),
          }),
        );
      });
    });

    describe('transferMachineToOperator', () => {
      it('should successfully transfer inventory from machine to operator (collection)', async () => {
        // Arrange
        const machineInventory = {
          id: 'mach-1',
          machine_id: testMachineId,
          nomenclature_id: testNomenclatureId,
          current_quantity: 30,
        };
        const operatorInventory = {
          id: 'op-1',
          operator_id: testOperatorId,
          nomenclature_id: testNomenclatureId,
          current_quantity: 10,
        };

        mockManager.findOne
          .mockResolvedValueOnce(machineInventory)
          .mockResolvedValueOnce(operatorInventory);

        mockManager.save
          .mockResolvedValueOnce({ ...machineInventory, current_quantity: 20 })
          .mockResolvedValueOnce({ ...operatorInventory, current_quantity: 20 })
          .mockResolvedValueOnce({});

        const dto = {
          machine_id: testMachineId,
          operator_id: testOperatorId,
          nomenclature_id: testNomenclatureId,
          quantity: 10,
        };

        // Act
        const result = await service.transferMachineToOperator(dto, testUserId);

        // Assert
        expect(result.machine.current_quantity).toBe(20);
        expect(result.operator.current_quantity).toBe(20);
      });

      it('should throw BadRequestException when machine has insufficient stock', async () => {
        // Arrange
        const machineInventory = {
          id: 'mach-1',
          machine_id: testMachineId,
          nomenclature_id: testNomenclatureId,
          current_quantity: 5,
        };

        mockManager.findOne.mockResolvedValueOnce(machineInventory);

        const dto = {
          machine_id: testMachineId,
          operator_id: testOperatorId,
          nomenclature_id: testNomenclatureId,
          quantity: 10,
        };

        // Act & Assert
        await expect(service.transferMachineToOperator(dto, testUserId)).rejects.toThrow(
          BadRequestException,
        );
      });
    });
  });

  // ============================================================================
  // MACHINE INVENTORY TESTS
  // ============================================================================

  describe('Machine Inventory Operations', () => {
    describe('getMachineInventory', () => {
      it('should return machine inventory with optimized field selection', async () => {
        // Arrange
        const mockInventory = [
          {
            id: '1',
            machine_id: testMachineId,
            nomenclature_id: 'nom-1',
            current_quantity: 25,
          },
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

        // Act
        const result = await service.getMachineInventory(testMachineId);

        // Assert
        expect(result).toEqual(mockInventory);
        expect(queryBuilder.where).toHaveBeenCalledWith('inventory.machine_id = :machineId', {
          machineId: testMachineId,
        });
        expect(queryBuilder.andWhere).toHaveBeenCalledWith('inventory.deleted_at IS NULL');
      });
    });

    describe('getMachineInventoryByNomenclature', () => {
      it('should return existing machine inventory', async () => {
        // Arrange
        const mockInventory = {
          id: '1',
          machine_id: testMachineId,
          nomenclature_id: testNomenclatureId,
          current_quantity: 25,
        };
        machineRepo.findOne.mockResolvedValue(mockInventory);

        // Act
        const result = await service.getMachineInventoryByNomenclature(
          testMachineId,
          testNomenclatureId,
        );

        // Assert
        expect(result).toEqual(mockInventory);
      });

      it('should create new inventory with zero quantity if not exists', async () => {
        // Arrange
        machineRepo.findOne.mockResolvedValue(null);
        machineRepo.create.mockReturnValue({
          machine_id: testMachineId,
          nomenclature_id: testNomenclatureId,
          current_quantity: 0,
          min_stock_level: 0,
        });
        machineRepo.save.mockResolvedValue({
          id: 'new-1',
          machine_id: testMachineId,
          nomenclature_id: testNomenclatureId,
          current_quantity: 0,
          min_stock_level: 0,
        });

        // Act
        const result = await service.getMachineInventoryByNomenclature(
          testMachineId,
          testNomenclatureId,
        );

        // Assert
        expect(result.current_quantity).toBe(0);
        expect(machineRepo.create).toHaveBeenCalled();
      });
    });

    describe('recordSale', () => {
      it('should record sale and deduct from machine inventory', async () => {
        // Arrange
        const machineInventory = {
          id: 'mach-1',
          machine_id: testMachineId,
          nomenclature_id: testNomenclatureId,
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
          machine_id: testMachineId,
          nomenclature_id: testNomenclatureId,
          quantity: 5,
          transaction_id: 'trans-1',
        };

        // Act
        const result = await service.recordSale(dto, testUserId);

        // Assert
        expect(result.current_quantity).toBe(25);
        expect(movementRepo.save).toHaveBeenCalled();
      });

      it('should not deduct if insufficient stock but still record movement', async () => {
        // Arrange
        const machineInventory = {
          id: 'mach-1',
          machine_id: testMachineId,
          nomenclature_id: testNomenclatureId,
          current_quantity: 2,
        };

        machineRepo.findOne.mockResolvedValue(machineInventory);
        machineRepo.save.mockResolvedValue(machineInventory);
        movementRepo.create.mockReturnValue({});
        movementRepo.save.mockResolvedValue({});

        const dto = {
          machine_id: testMachineId,
          nomenclature_id: testNomenclatureId,
          quantity: 5,
        };

        // Act
        const result = await service.recordSale(dto, testUserId);

        // Assert
        // Should not throw, but quantity should not be deducted
        expect(result.current_quantity).toBe(2);
        expect(movementRepo.save).toHaveBeenCalled();
      });
    });

    describe('deductFromMachine', () => {
      it('should deduct quantity from machine inventory', async () => {
        // Arrange
        const machineInventory = {
          id: 'mach-1',
          machine_id: testMachineId,
          nomenclature_id: testNomenclatureId,
          current_quantity: 50,
        };

        machineRepo.findOne.mockResolvedValue(machineInventory);
        machineRepo.save.mockResolvedValue({
          ...machineInventory,
          current_quantity: 35,
        });
        movementRepo.create.mockReturnValue({});
        movementRepo.save.mockResolvedValue({});

        // Act
        await service.deductFromMachine(testMachineId, testNomenclatureId, 15, 'Sales import');

        // Assert
        expect(machineRepo.save).toHaveBeenCalled();
        expect(movementRepo.save).toHaveBeenCalled();
      });

      it('should throw BadRequestException if insufficient machine stock for deduction', async () => {
        // Arrange
        const machineInventory = {
          id: 'mach-1',
          machine_id: testMachineId,
          nomenclature_id: testNomenclatureId,
          current_quantity: 5,
        };

        machineRepo.findOne.mockResolvedValue(machineInventory);

        // Act & Assert
        await expect(
          service.deductFromMachine(testMachineId, testNomenclatureId, 15, 'Sales import'),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('getMachinesLowStock', () => {
      it('should return machines with low stock excluding soft-deleted', async () => {
        // Arrange
        const lowStockMachines = [
          {
            id: '1',
            machine_id: testMachineId,
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

        // Act
        const result = await service.getMachinesLowStock();

        // Assert
        expect(result).toEqual(lowStockMachines);
        expect(queryBuilder.andWhere).toHaveBeenCalledWith('inventory.deleted_at IS NULL');
        expect(queryBuilder.andWhere).toHaveBeenCalledWith('machine.deleted_at IS NULL');
      });
    });

    describe('adjustMachineInventory', () => {
      it('should adjust machine inventory to actual quantity (increase)', async () => {
        // Arrange
        const machineInventory = {
          id: 'mach-1',
          machine_id: testMachineId,
          nomenclature_id: testNomenclatureId,
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

        // Act
        const result = await service.adjustMachineInventory(
          testMachineId,
          testNomenclatureId,
          dto,
          testUserId,
        );

        // Assert
        expect(result.current_quantity).toBe(30);
        expect(movementRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({
            movement_type: MovementType.ADJUSTMENT,
            quantity: 5, // Math.abs(30 - 25)
          }),
        );
      });

      it('should adjust machine inventory to actual quantity (decrease)', async () => {
        // Arrange
        const machineInventory = {
          id: 'mach-1',
          machine_id: testMachineId,
          nomenclature_id: testNomenclatureId,
          current_quantity: 30,
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
          notes: 'Shrinkage detected',
        };

        // Act
        const result = await service.adjustMachineInventory(
          testMachineId,
          testNomenclatureId,
          dto,
          testUserId,
        );

        // Assert
        expect(result.current_quantity).toBe(20);
        expect(movementRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({
            quantity: 10, // Math.abs(20 - 30)
          }),
        );
      });
    });

    describe('updateMachineInventory', () => {
      it('should update machine inventory settings', async () => {
        // Arrange
        const machineInventory = {
          id: 'mach-1',
          machine_id: testMachineId,
          nomenclature_id: testNomenclatureId,
          current_quantity: 25,
          min_stock_level: 5,
        };

        machineRepo.findOne.mockResolvedValue(machineInventory);
        machineRepo.save.mockImplementation((inv: any) => Promise.resolve(inv));

        const dto = {
          min_stock_level: 15,
        };

        // Act
        const result = await service.updateMachineInventory(testMachineId, testNomenclatureId, dto);

        // Assert
        expect(result.min_stock_level).toBe(15);
      });
    });
  });

  // ============================================================================
  // RESERVATION TESTS
  // ============================================================================

  describe('Reservation Operations', () => {
    describe('reserveWarehouseStock', () => {
      it('should reserve warehouse stock for task', async () => {
        // Arrange
        const inventory = {
          id: 'wh-1',
          nomenclature_id: testNomenclatureId,
          current_quantity: 100,
          reserved_quantity: 10,
        };

        mockManager.findOne.mockResolvedValue(inventory);
        mockManager.save.mockResolvedValue({
          ...inventory,
          reserved_quantity: 30,
        });

        // Act
        await service.reserveWarehouseStock(
          testNomenclatureId,
          20,
          `task:${testTaskId}`,
          testUserId,
        );

        // Assert
        expect(mockManager.save).toHaveBeenCalledWith(
          WarehouseInventory,
          expect.objectContaining({
            reserved_quantity: 30, // 10 + 20
          }),
        );
        expect(mockManager.create).toHaveBeenCalledWith(
          InventoryMovement,
          expect.objectContaining({
            movement_type: MovementType.WAREHOUSE_RESERVATION,
            quantity: 20,
          }),
        );
      });

      it('should throw BadRequestException if insufficient available stock for reservation', async () => {
        // Arrange
        const inventory = {
          id: 'wh-1',
          nomenclature_id: testNomenclatureId,
          current_quantity: 100,
          reserved_quantity: 95, // Only 5 available
        };

        mockManager.findOne.mockResolvedValue(inventory);

        // Act & Assert
        await expect(
          service.reserveWarehouseStock(testNomenclatureId, 20, `task:${testTaskId}`, testUserId),
        ).rejects.toThrow(BadRequestException);
      });

      it('should throw NotFoundException if warehouse inventory not found', async () => {
        // Arrange
        mockManager.findOne.mockResolvedValue(null);

        // Act & Assert
        await expect(
          service.reserveWarehouseStock(testNomenclatureId, 20, `task:${testTaskId}`, testUserId),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('releaseWarehouseReservation', () => {
      it('should release warehouse reservation', async () => {
        // Arrange
        const inventory = {
          id: 'wh-1',
          nomenclature_id: testNomenclatureId,
          current_quantity: 100,
          reserved_quantity: 30,
        };

        mockManager.findOne.mockResolvedValue(inventory);
        mockManager.save.mockResolvedValue({
          ...inventory,
          reserved_quantity: 10,
        });

        // Act
        await service.releaseWarehouseReservation(testNomenclatureId, 20, `task:${testTaskId}`);

        // Assert
        expect(mockManager.save).toHaveBeenCalledWith(
          WarehouseInventory,
          expect.objectContaining({
            reserved_quantity: 10, // 30 - 20
          }),
        );
        expect(mockManager.create).toHaveBeenCalledWith(
          InventoryMovement,
          expect.objectContaining({
            movement_type: MovementType.WAREHOUSE_RESERVATION_RELEASE,
          }),
        );
      });

      it('should not allow negative reserved quantity', async () => {
        // Arrange
        const inventory = {
          id: 'wh-1',
          nomenclature_id: testNomenclatureId,
          current_quantity: 100,
          reserved_quantity: 5,
        };

        mockManager.findOne.mockResolvedValue(inventory);
        mockManager.save.mockImplementation((entity: any, data: any) => Promise.resolve(data));

        // Act
        await service.releaseWarehouseReservation(testNomenclatureId, 20, `task:${testTaskId}`);

        // Assert
        const savedInventory = mockManager.save.mock.calls[0][1];
        expect(savedInventory.reserved_quantity).toBe(0); // Math.max(0, 5 - 20)
      });
    });

    describe('createReservation', () => {
      it('should create reservation for operator inventory', async () => {
        // Arrange
        const operatorInventory = {
          id: 'op-1',
          operator_id: testOperatorId,
          nomenclature_id: testNomenclatureId,
          current_quantity: 100,
          reserved_quantity: 10,
        };

        mockManager.findOne.mockResolvedValue(operatorInventory);
        mockManager.save.mockImplementation((entity: any, data: any) =>
          Promise.resolve({ id: 'rsv-1', ...data }),
        );

        const items = [{ nomenclature_id: testNomenclatureId, quantity: 20 }];

        // Act
        const result = await service.createReservation(testTaskId, testOperatorId, items, 24);

        // Assert
        expect(result).toHaveLength(1);
        expect(mockManager.save).toHaveBeenCalledWith(
          OperatorInventory,
          expect.objectContaining({
            reserved_quantity: 30, // 10 + 20
          }),
        );
      });

      it('should throw BadRequestException if insufficient available quantity', async () => {
        // Arrange
        const operatorInventory = {
          id: 'op-1',
          operator_id: testOperatorId,
          nomenclature_id: testNomenclatureId,
          current_quantity: 50,
          reserved_quantity: 45, // Only 5 available
        };

        mockManager.findOne.mockResolvedValue(operatorInventory);

        const items = [{ nomenclature_id: testNomenclatureId, quantity: 20 }];

        // Act & Assert
        await expect(
          service.createReservation(testTaskId, testOperatorId, items, 24),
        ).rejects.toThrow(BadRequestException);
      });

      it('should throw BadRequestException if operator has no inventory for nomenclature', async () => {
        // Arrange
        mockManager.findOne.mockResolvedValue(null);

        const items = [{ nomenclature_id: testNomenclatureId, quantity: 20 }];

        // Act & Assert
        await expect(
          service.createReservation(testTaskId, testOperatorId, items, 24),
        ).rejects.toThrow(BadRequestException);
      });

      it('should set correct expiration time', async () => {
        // Arrange
        const operatorInventory = {
          id: 'op-1',
          operator_id: testOperatorId,
          nomenclature_id: testNomenclatureId,
          current_quantity: 100,
          reserved_quantity: 0,
        };

        mockManager.findOne.mockResolvedValue(operatorInventory);
        mockManager.save.mockImplementation((entity: any, data: any) =>
          Promise.resolve({ id: 'rsv-1', ...data }),
        );

        const items = [{ nomenclature_id: testNomenclatureId, quantity: 20 }];
        const expiresInHours = 48;

        // Act
        await service.createReservation(testTaskId, testOperatorId, items, expiresInHours);

        // Assert
        const reservationCreateCall = mockManager.create.mock.calls.find(
          (call: any[]) => call[0] === InventoryReservation,
        );
        expect(reservationCreateCall).toBeDefined();
        expect(reservationCreateCall[1].expires_at).toBeInstanceOf(Date);
      });
    });

    describe('fulfillReservation', () => {
      it('should fulfill pending reservations for task', async () => {
        // Arrange
        const reservation = {
          id: 'rsv-1',
          task_id: testTaskId,
          nomenclature_id: testNomenclatureId,
          quantity_reserved: 20,
          quantity_fulfilled: 0,
          status: ReservationStatus.PENDING,
          inventory_level: InventoryLevel.OPERATOR,
          reference_id: testOperatorId,
        };

        const operatorInventory = {
          id: 'op-1',
          operator_id: testOperatorId,
          nomenclature_id: testNomenclatureId,
          current_quantity: 100,
          reserved_quantity: 20,
        };

        mockManager.find.mockResolvedValue([reservation]);
        mockManager.findOne.mockResolvedValue(operatorInventory);
        mockManager.save.mockImplementation((entity: any, data: any) => Promise.resolve(data));

        // Act
        const result = await service.fulfillReservation(testTaskId);

        // Assert
        expect(result).toHaveLength(1);
        expect(result[0].status).toBe(ReservationStatus.FULFILLED);
        expect(result[0].quantity_fulfilled).toBe(20);
        expect(mockManager.save).toHaveBeenCalledWith(
          OperatorInventory,
          expect.objectContaining({
            reserved_quantity: 0, // 20 - 20
          }),
        );
      });

      it('should return empty array if no pending reservations', async () => {
        // Arrange
        mockManager.find.mockResolvedValue([]);

        // Act
        const result = await service.fulfillReservation(testTaskId);

        // Assert
        expect(result).toEqual([]);
      });
    });

    describe('cancelReservation', () => {
      it('should cancel pending reservations and release reserved quantity for operator level', async () => {
        // Arrange
        const reservation = {
          id: 'rsv-1',
          task_id: testTaskId,
          nomenclature_id: testNomenclatureId,
          quantity_reserved: 20,
          status: ReservationStatus.PENDING,
          inventory_level: InventoryLevel.OPERATOR,
          reference_id: testOperatorId,
        };

        const operatorInventory = {
          id: 'op-1',
          operator_id: testOperatorId,
          nomenclature_id: testNomenclatureId,
          reserved_quantity: 20,
        };

        mockManager.find.mockResolvedValue([reservation]);
        mockManager.findOne.mockResolvedValue(operatorInventory);
        mockManager.save.mockImplementation((entity: any, data: any) => Promise.resolve(data));

        // Act
        const result = await service.cancelReservation(testTaskId);

        // Assert
        expect(result).toHaveLength(1);
        expect(result[0].status).toBe(ReservationStatus.CANCELLED);
        expect(result[0].cancelled_at).toBeInstanceOf(Date);
        expect(mockManager.save).toHaveBeenCalledWith(
          OperatorInventory,
          expect.objectContaining({
            reserved_quantity: 0,
          }),
        );
      });

      it('should release reserved quantity for warehouse level', async () => {
        // Arrange
        const reservation = {
          id: 'rsv-1',
          task_id: testTaskId,
          nomenclature_id: testNomenclatureId,
          quantity_reserved: 30,
          status: ReservationStatus.PENDING,
          inventory_level: InventoryLevel.WAREHOUSE,
          reference_id: 'warehouse-1',
        };

        const warehouseInventory = {
          id: 'wh-1',
          nomenclature_id: testNomenclatureId,
          reserved_quantity: 30,
        };

        mockManager.find.mockResolvedValue([reservation]);
        mockManager.findOne.mockResolvedValue(warehouseInventory);
        mockManager.save.mockImplementation((entity: any, data: any) => Promise.resolve(data));

        // Act
        const result = await service.cancelReservation(testTaskId);

        // Assert
        expect(result[0].status).toBe(ReservationStatus.CANCELLED);
        expect(mockManager.save).toHaveBeenCalledWith(
          WarehouseInventory,
          expect.objectContaining({
            reserved_quantity: 0,
          }),
        );
      });
    });

    describe('expireOldReservations', () => {
      it('should expire old pending reservations and release quantities', async () => {
        // Arrange
        const expiredReservation = {
          id: 'rsv-1',
          task_id: testTaskId,
          nomenclature_id: testNomenclatureId,
          quantity_reserved: 20,
          status: ReservationStatus.PENDING,
          expires_at: new Date(Date.now() - 1000), // Expired
          inventory_level: InventoryLevel.OPERATOR,
          reference_id: testOperatorId,
        };

        const operatorInventory = {
          id: 'op-1',
          reserved_quantity: 20,
        };

        mockManager.find.mockResolvedValue([expiredReservation]);
        mockManager.findOne.mockResolvedValue(operatorInventory);
        mockManager.save.mockImplementation((entity: any, data: any) => Promise.resolve(data));

        // Act
        const count = await service.expireOldReservations();

        // Assert
        expect(count).toBe(1);
        expect(mockManager.save).toHaveBeenCalledWith(
          InventoryReservation,
          expect.objectContaining({
            status: ReservationStatus.EXPIRED,
          }),
        );
      });

      it('should return 0 if no expired reservations', async () => {
        // Arrange
        mockManager.find.mockResolvedValue([]);

        // Act
        const count = await service.expireOldReservations();

        // Assert
        expect(count).toBe(0);
      });
    });

    describe('getReservationsByTask', () => {
      it('should return reservations for specific task', async () => {
        // Arrange
        const reservations = [
          { id: 'rsv-1', task_id: testTaskId, nomenclature_id: 'nom-1' },
          { id: 'rsv-2', task_id: testTaskId, nomenclature_id: 'nom-2' },
        ];
        reservationRepo.find.mockResolvedValue(reservations);

        // Act
        const result = await service.getReservationsByTask(testTaskId);

        // Assert
        expect(result).toEqual(reservations);
        expect(reservationRepo.find).toHaveBeenCalledWith({
          where: { task_id: testTaskId },
          order: { created_at: 'DESC' },
        });
      });
    });

    describe('getActiveReservationsByOperator', () => {
      it('should return active reservations for operator', async () => {
        // Arrange
        const reservations = [
          {
            id: 'rsv-1',
            reference_id: testOperatorId,
            status: ReservationStatus.PENDING,
            inventory_level: InventoryLevel.OPERATOR,
          },
        ];
        reservationRepo.find.mockResolvedValue(reservations);

        // Act
        const result = await service.getActiveReservationsByOperator(testOperatorId);

        // Assert
        expect(result).toEqual(reservations);
        expect(reservationRepo.find).toHaveBeenCalledWith({
          where: {
            reference_id: testOperatorId,
            inventory_level: InventoryLevel.OPERATOR,
            status: ReservationStatus.PENDING,
          },
          order: { created_at: 'DESC' },
        });
      });
    });

    describe('getActiveReservations', () => {
      it('should return all active reservations', async () => {
        // Arrange
        const reservations = [
          { id: 'rsv-1', status: ReservationStatus.PENDING },
          { id: 'rsv-2', status: ReservationStatus.PENDING },
        ];
        reservationRepo.find.mockResolvedValue(reservations);

        // Act
        const result = await service.getActiveReservations();

        // Assert
        expect(result).toEqual(reservations);
        expect(reservationRepo.find).toHaveBeenCalledWith({
          where: { status: ReservationStatus.PENDING },
          order: { created_at: 'DESC' },
        });
      });
    });

    describe('getReservationsByOperator', () => {
      it('should return all reservations for operator including completed and cancelled', async () => {
        // Arrange
        const reservations = [
          { id: 'rsv-1', status: ReservationStatus.PENDING },
          { id: 'rsv-2', status: ReservationStatus.FULFILLED },
          { id: 'rsv-3', status: ReservationStatus.CANCELLED },
        ];
        reservationRepo.find.mockResolvedValue(reservations);

        // Act
        const result = await service.getReservationsByOperator(testOperatorId);

        // Assert
        expect(result).toEqual(reservations);
        expect(reservationRepo.find).toHaveBeenCalledWith({
          where: {
            reference_id: testOperatorId,
            inventory_level: InventoryLevel.OPERATOR,
          },
          order: { created_at: 'DESC' },
        });
      });
    });
  });

  // ============================================================================
  // MOVEMENT TESTS
  // ============================================================================

  describe('Movement Operations', () => {
    describe('getMovements', () => {
      it('should return all movements without filters', async () => {
        // Arrange
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

        // Act
        const result = await service.getMovements();

        // Assert
        expect(result).toEqual(movements);
      });

      it('should filter movements by type', async () => {
        // Arrange
        const queryBuilder = {
          leftJoin: jest.fn().mockReturnThis(),
          addSelect: jest.fn().mockReturnThis(),
          leftJoinAndSelect: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([]),
        };

        movementRepo.createQueryBuilder.mockReturnValue(queryBuilder);

        // Act
        await service.getMovements(MovementType.WAREHOUSE_IN);

        // Assert
        expect(queryBuilder.andWhere).toHaveBeenCalledWith(
          'movement.movement_type = :movementType',
          { movementType: MovementType.WAREHOUSE_IN },
        );
      });

      it('should filter movements by nomenclature', async () => {
        // Arrange
        const queryBuilder = {
          leftJoin: jest.fn().mockReturnThis(),
          addSelect: jest.fn().mockReturnThis(),
          leftJoinAndSelect: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([]),
        };

        movementRepo.createQueryBuilder.mockReturnValue(queryBuilder);

        // Act
        await service.getMovements(undefined, testNomenclatureId);

        // Assert
        expect(queryBuilder.andWhere).toHaveBeenCalledWith(
          'movement.nomenclature_id = :nomenclatureId',
          { nomenclatureId: testNomenclatureId },
        );
      });

      it('should filter movements by machine', async () => {
        // Arrange
        const queryBuilder = {
          leftJoin: jest.fn().mockReturnThis(),
          addSelect: jest.fn().mockReturnThis(),
          leftJoinAndSelect: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([]),
        };

        movementRepo.createQueryBuilder.mockReturnValue(queryBuilder);

        // Act
        await service.getMovements(undefined, undefined, testMachineId);

        // Assert
        expect(queryBuilder.andWhere).toHaveBeenCalledWith('movement.machine_id = :machineId', {
          machineId: testMachineId,
        });
      });

      it('should filter movements by operator', async () => {
        // Arrange
        const queryBuilder = {
          leftJoin: jest.fn().mockReturnThis(),
          addSelect: jest.fn().mockReturnThis(),
          leftJoinAndSelect: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([]),
        };

        movementRepo.createQueryBuilder.mockReturnValue(queryBuilder);

        // Act
        await service.getMovements(undefined, undefined, undefined, testOperatorId);

        // Assert
        expect(queryBuilder.andWhere).toHaveBeenCalledWith('movement.operator_id = :operatorId', {
          operatorId: testOperatorId,
        });
      });

      it('should filter movements by date range', async () => {
        // Arrange
        const queryBuilder = {
          leftJoin: jest.fn().mockReturnThis(),
          addSelect: jest.fn().mockReturnThis(),
          leftJoinAndSelect: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([]),
        };

        movementRepo.createQueryBuilder.mockReturnValue(queryBuilder);

        const dateFrom = new Date('2025-01-01');
        const dateTo = new Date('2025-12-31');

        // Act
        await service.getMovements(undefined, undefined, undefined, undefined, dateFrom, dateTo);

        // Assert
        expect(queryBuilder.andWhere).toHaveBeenCalledWith(
          'movement.created_at BETWEEN :dateFrom AND :dateTo',
          { dateFrom, dateTo },
        );
      });
    });

    describe('getMovementStats', () => {
      it('should return movement statistics', async () => {
        // Arrange
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

        // Act
        const result = await service.getMovementStats();

        // Assert
        expect(result.total).toBe(100);
        expect(result.by_type).toHaveLength(2);
        expect(result.by_type[0].count).toBe(30);
        expect(result.by_type[0].total_quantity).toBe(1000);
      });

      it('should filter stats by date range', async () => {
        // Arrange
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
        const dateTo = new Date('2025-06-30');

        // Act
        await service.getMovementStats(dateFrom, dateTo);

        // Assert
        expect(queryBuilder.where).toHaveBeenCalledWith(
          'movement.created_at BETWEEN :dateFrom AND :dateTo',
          { dateFrom, dateTo },
        );
      });
    });
  });

  // ============================================================================
  // EDGE CASES AND ERROR HANDLING
  // ============================================================================

  describe('Edge Cases and Error Handling', () => {
    it('should handle zero quantity transfers gracefully', async () => {
      // Arrange
      const warehouseInventory = {
        id: 'wh-1',
        nomenclature_id: testNomenclatureId,
        current_quantity: 100,
      };

      mockManager.findOne.mockResolvedValue(warehouseInventory);

      const _dto = {
        operator_id: testOperatorId,
        nomenclature_id: testNomenclatureId,
        quantity: 0,
      };

      // Act & Assert - zero quantity should work but might be validated at DTO level
      // Service level should handle it without error
      // Note: Actual behavior depends on business rules
    });

    it('should handle concurrent transaction attempts with pessimistic locking', async () => {
      // Arrange - This tests that the transaction is properly set up
      const warehouseInventory = {
        id: 'wh-1',
        nomenclature_id: testNomenclatureId,
        current_quantity: 100,
      };
      const operatorInventory = {
        id: 'op-1',
        operator_id: testOperatorId,
        nomenclature_id: testNomenclatureId,
        current_quantity: 0,
      };

      mockManager.findOne
        .mockResolvedValueOnce(warehouseInventory)
        .mockResolvedValueOnce(operatorInventory);

      mockManager.save.mockResolvedValue({ current_quantity: 70 });

      const dto = {
        operator_id: testOperatorId,
        nomenclature_id: testNomenclatureId,
        quantity: 30,
      };

      // Act
      await service.transferWarehouseToOperator(dto, testUserId);

      // Assert - Verify pessimistic lock was requested
      expect(mockManager.findOne).toHaveBeenCalledWith(
        WarehouseInventory,
        expect.objectContaining({
          lock: { mode: 'pessimistic_write' },
        }),
      );
    });

    it('should handle string numbers in quantity fields', async () => {
      // Arrange
      const existingInventory = {
        id: '1',
        nomenclature_id: testNomenclatureId,
        current_quantity: '100', // String instead of number
      };
      warehouseRepo.findOne.mockResolvedValue(existingInventory);
      warehouseRepo.save.mockImplementation((inv: any) => Promise.resolve(inv));
      movementRepo.create.mockReturnValue({});
      movementRepo.save.mockResolvedValue({});

      const dto = {
        nomenclature_id: testNomenclatureId,
        quantity: 50,
      };

      // Act
      const result = await service.addToWarehouse(dto, testUserId);

      // Assert - Should properly convert string to number
      expect(result.current_quantity).toBe(150);
    });
  });
});
