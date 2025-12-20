import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { WarehouseInventoryService } from './services/warehouse-inventory.service';
import { OperatorInventoryService } from './services/operator-inventory.service';
import { MachineInventoryService } from './services/machine-inventory.service';
import { InventoryTransferService } from './services/inventory-transfer.service';
import { InventoryMovementService } from './services/inventory-movement.service';
import { InventoryReservationService } from './services/inventory-reservation.service';
import { MovementType } from './entities/inventory-movement.entity';
import { ReservationStatus, InventoryLevel } from './entities/inventory-reservation.entity';

/**
 * Unit Tests for InventoryService (Facade)
 *
 * The InventoryService is a facade that delegates to specialized sub-services.
 * These tests verify that the facade correctly delegates calls to the appropriate services.
 */
describe('InventoryService', () => {
  let service: InventoryService;
  let warehouseInventoryService: jest.Mocked<WarehouseInventoryService>;
  let operatorInventoryService: jest.Mocked<OperatorInventoryService>;
  let machineInventoryService: jest.Mocked<MachineInventoryService>;
  let inventoryTransferService: jest.Mocked<InventoryTransferService>;
  let inventoryMovementService: jest.Mocked<InventoryMovementService>;
  let inventoryReservationService: jest.Mocked<InventoryReservationService>;

  beforeEach(async () => {
    const mockWarehouseInventoryService = {
      getWarehouseInventory: jest.fn(),
      getWarehouseInventoryByNomenclature: jest.fn(),
      getWarehouseLowStock: jest.fn(),
      addToWarehouse: jest.fn(),
      removeFromWarehouse: jest.fn(),
      updateWarehouseInventory: jest.fn(),
      reserveWarehouseStock: jest.fn(),
      releaseWarehouseReservation: jest.fn(),
    };

    const mockOperatorInventoryService = {
      getOperatorInventory: jest.fn(),
      getOperatorInventoryByNomenclature: jest.fn(),
    };

    const mockMachineInventoryService = {
      getMachineInventory: jest.fn(),
      getMachineInventoryByNomenclature: jest.fn(),
      getMachinesLowStock: jest.fn(),
      recordSale: jest.fn(),
      updateMachineInventory: jest.fn(),
      adjustMachineInventory: jest.fn(),
      deductFromMachine: jest.fn(),
    };

    const mockInventoryTransferService = {
      transferWarehouseToOperator: jest.fn(),
      transferOperatorToWarehouse: jest.fn(),
      transferOperatorToMachine: jest.fn(),
      transferMachineToOperator: jest.fn(),
    };

    const mockInventoryMovementService = {
      getMovements: jest.fn(),
      getMovementStats: jest.fn(),
      createMovement: jest.fn(),
    };

    const mockInventoryReservationService = {
      createReservation: jest.fn(),
      fulfillReservation: jest.fn(),
      cancelReservation: jest.fn(),
      expireOldReservations: jest.fn(),
      getReservationsByTask: jest.fn(),
      getActiveReservationsByOperator: jest.fn(),
      getActiveReservations: jest.fn(),
      getReservationsByOperator: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        {
          provide: WarehouseInventoryService,
          useValue: mockWarehouseInventoryService,
        },
        {
          provide: OperatorInventoryService,
          useValue: mockOperatorInventoryService,
        },
        {
          provide: MachineInventoryService,
          useValue: mockMachineInventoryService,
        },
        {
          provide: InventoryTransferService,
          useValue: mockInventoryTransferService,
        },
        {
          provide: InventoryMovementService,
          useValue: mockInventoryMovementService,
        },
        {
          provide: InventoryReservationService,
          useValue: mockInventoryReservationService,
        },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    warehouseInventoryService = module.get(WarehouseInventoryService);
    operatorInventoryService = module.get(OperatorInventoryService);
    machineInventoryService = module.get(MachineInventoryService);
    inventoryTransferService = module.get(InventoryTransferService);
    inventoryMovementService = module.get(InventoryMovementService);
    inventoryReservationService = module.get(InventoryReservationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // WAREHOUSE INVENTORY TESTS
  // ============================================================================

  describe('getWarehouseInventory', () => {
    it('should delegate to warehouseInventoryService', async () => {
      const mockInventory = [
        { id: '1', nomenclature_id: 'nom-1', current_quantity: 100 },
        { id: '2', nomenclature_id: 'nom-2', current_quantity: 200 },
      ];
      warehouseInventoryService.getWarehouseInventory.mockResolvedValue(mockInventory as any);

      const result = await service.getWarehouseInventory();

      expect(result).toEqual(mockInventory);
      expect(warehouseInventoryService.getWarehouseInventory).toHaveBeenCalled();
    });
  });

  describe('getWarehouseInventoryByNomenclature', () => {
    it('should delegate to warehouseInventoryService', async () => {
      const mockInventory = {
        id: '1',
        nomenclature_id: 'nom-1',
        current_quantity: 100,
      };
      warehouseInventoryService.getWarehouseInventoryByNomenclature.mockResolvedValue(
        mockInventory as any,
      );

      const result = await service.getWarehouseInventoryByNomenclature('nom-1');

      expect(result).toEqual(mockInventory);
      expect(warehouseInventoryService.getWarehouseInventoryByNomenclature).toHaveBeenCalledWith(
        'nom-1',
      );
    });
  });

  describe('addToWarehouse', () => {
    it('should delegate to warehouseInventoryService', async () => {
      const dto = {
        nomenclature_id: 'nom-1',
        quantity: 50,
        notes: 'Test addition',
      };
      const expectedResult = {
        id: '1',
        nomenclature_id: 'nom-1',
        current_quantity: 150,
      };
      warehouseInventoryService.addToWarehouse.mockResolvedValue(expectedResult as any);

      const result = await service.addToWarehouse(dto, 'user-1');

      expect(result).toEqual(expectedResult);
      expect(warehouseInventoryService.addToWarehouse).toHaveBeenCalledWith(dto, 'user-1');
    });
  });

  describe('removeFromWarehouse', () => {
    it('should delegate to warehouseInventoryService', async () => {
      const dto = {
        nomenclature_id: 'nom-1',
        quantity: 30,
        notes: 'Test removal',
      };
      const expectedResult = {
        id: '1',
        nomenclature_id: 'nom-1',
        current_quantity: 70,
      };
      warehouseInventoryService.removeFromWarehouse.mockResolvedValue(expectedResult as any);

      const result = await service.removeFromWarehouse(dto, 'user-1');

      expect(result).toEqual(expectedResult);
      expect(warehouseInventoryService.removeFromWarehouse).toHaveBeenCalledWith(dto, 'user-1');
    });

    it('should propagate errors from warehouseInventoryService', async () => {
      const dto = {
        nomenclature_id: 'nom-1',
        quantity: 50,
      };
      warehouseInventoryService.removeFromWarehouse.mockRejectedValue(
        new BadRequestException('Insufficient quantity'),
      );

      await expect(service.removeFromWarehouse(dto, 'user-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getWarehouseLowStock', () => {
    it('should delegate to warehouseInventoryService', async () => {
      const lowStockItems = [
        { id: '1', current_quantity: 5, min_stock_level: 10 },
        { id: '2', current_quantity: 2, min_stock_level: 20 },
      ];
      warehouseInventoryService.getWarehouseLowStock.mockResolvedValue(lowStockItems as any);

      const result = await service.getWarehouseLowStock();

      expect(result).toEqual(lowStockItems);
      expect(warehouseInventoryService.getWarehouseLowStock).toHaveBeenCalled();
    });
  });

  describe('updateWarehouseInventory', () => {
    it('should delegate to warehouseInventoryService', async () => {
      const dto = { min_stock_level: 20 };
      const expectedResult = {
        id: '1',
        nomenclature_id: 'nom-1',
        min_stock_level: 20,
      };
      warehouseInventoryService.updateWarehouseInventory.mockResolvedValue(expectedResult as any);

      const result = await service.updateWarehouseInventory('nom-1', dto);

      expect(result).toEqual(expectedResult);
      expect(warehouseInventoryService.updateWarehouseInventory).toHaveBeenCalledWith('nom-1', dto);
    });
  });

  describe('reserveWarehouseStock', () => {
    it('should delegate to warehouseInventoryService', async () => {
      warehouseInventoryService.reserveWarehouseStock.mockResolvedValue(undefined);

      await service.reserveWarehouseStock('nom-1', 20, 'task:task-1', 'user-1');

      expect(warehouseInventoryService.reserveWarehouseStock).toHaveBeenCalledWith(
        'nom-1',
        20,
        'task:task-1',
        'user-1',
      );
    });

    it('should propagate errors from warehouseInventoryService', async () => {
      warehouseInventoryService.reserveWarehouseStock.mockRejectedValue(
        new BadRequestException('Insufficient available stock'),
      );

      await expect(
        service.reserveWarehouseStock('nom-1', 20, 'task:task-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('releaseWarehouseReservation', () => {
    it('should delegate to warehouseInventoryService', async () => {
      warehouseInventoryService.releaseWarehouseReservation.mockResolvedValue(undefined);

      await service.releaseWarehouseReservation('nom-1', 20, 'task:task-1');

      expect(warehouseInventoryService.releaseWarehouseReservation).toHaveBeenCalledWith(
        'nom-1',
        20,
        'task:task-1',
      );
    });
  });

  // ============================================================================
  // OPERATOR INVENTORY TESTS
  // ============================================================================

  describe('getOperatorInventory', () => {
    it('should delegate to operatorInventoryService', async () => {
      const mockInventory = [
        { id: '1', operator_id: 'op-1', nomenclature_id: 'nom-1', current_quantity: 50 },
      ];
      operatorInventoryService.getOperatorInventory.mockResolvedValue(mockInventory as any);

      const result = await service.getOperatorInventory('op-1');

      expect(result).toEqual(mockInventory);
      expect(operatorInventoryService.getOperatorInventory).toHaveBeenCalledWith('op-1');
    });
  });

  describe('getOperatorInventoryByNomenclature', () => {
    it('should delegate to operatorInventoryService', async () => {
      const mockInventory = {
        id: '1',
        operator_id: 'op-1',
        nomenclature_id: 'nom-1',
        current_quantity: 50,
      };
      operatorInventoryService.getOperatorInventoryByNomenclature.mockResolvedValue(
        mockInventory as any,
      );

      const result = await service.getOperatorInventoryByNomenclature('op-1', 'nom-1');

      expect(result).toEqual(mockInventory);
      expect(operatorInventoryService.getOperatorInventoryByNomenclature).toHaveBeenCalledWith(
        'op-1',
        'nom-1',
      );
    });
  });

  // ============================================================================
  // TRANSFER TESTS
  // ============================================================================

  describe('transferWarehouseToOperator', () => {
    it('should delegate to inventoryTransferService', async () => {
      const dto = {
        operator_id: 'operator-1',
        nomenclature_id: 'nom-1',
        quantity: 30,
      };
      const expectedResult = {
        warehouse: { id: 'wh-1', current_quantity: 70 },
        operator: { id: 'op-1', current_quantity: 50 },
      };
      inventoryTransferService.transferWarehouseToOperator.mockResolvedValue(expectedResult as any);

      const result = await service.transferWarehouseToOperator(dto, 'user-1');

      expect(result).toEqual(expectedResult);
      expect(inventoryTransferService.transferWarehouseToOperator).toHaveBeenCalledWith(
        dto,
        'user-1',
      );
    });

    it('should propagate errors from inventoryTransferService', async () => {
      const dto = {
        operator_id: 'operator-1',
        nomenclature_id: 'nom-1',
        quantity: 50,
      };
      inventoryTransferService.transferWarehouseToOperator.mockRejectedValue(
        new BadRequestException('Insufficient warehouse stock'),
      );

      await expect(service.transferWarehouseToOperator(dto, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('transferOperatorToWarehouse', () => {
    it('should delegate to inventoryTransferService', async () => {
      const dto = {
        operator_id: 'operator-1',
        nomenclature_id: 'nom-1',
        quantity: 20,
      };
      const expectedResult = {
        operator: { id: 'op-1', current_quantity: 30 },
        warehouse: { id: 'wh-1', current_quantity: 120 },
      };
      inventoryTransferService.transferOperatorToWarehouse.mockResolvedValue(expectedResult as any);

      const result = await service.transferOperatorToWarehouse(dto, 'user-1');

      expect(result).toEqual(expectedResult);
      expect(inventoryTransferService.transferOperatorToWarehouse).toHaveBeenCalledWith(
        dto,
        'user-1',
      );
    });
  });

  describe('transferOperatorToMachine', () => {
    it('should delegate to inventoryTransferService', async () => {
      const dto = {
        operator_id: 'operator-1',
        machine_id: 'machine-1',
        nomenclature_id: 'nom-1',
        quantity: 20,
        task_id: 'task-1',
      };
      const expectedResult = {
        operator: { id: 'op-1', current_quantity: 30 },
        machine: { id: 'mach-1', current_quantity: 30 },
      };
      inventoryTransferService.transferOperatorToMachine.mockResolvedValue(expectedResult as any);

      const result = await service.transferOperatorToMachine(dto, 'user-1');

      expect(result).toEqual(expectedResult);
      expect(inventoryTransferService.transferOperatorToMachine).toHaveBeenCalledWith(
        dto,
        'user-1',
      );
    });

    it('should propagate errors from inventoryTransferService', async () => {
      const dto = {
        operator_id: 'operator-1',
        machine_id: 'machine-1',
        nomenclature_id: 'nom-1',
        quantity: 20,
      };
      inventoryTransferService.transferOperatorToMachine.mockRejectedValue(
        new BadRequestException('Insufficient operator stock'),
      );

      await expect(service.transferOperatorToMachine(dto, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('transferMachineToOperator', () => {
    it('should delegate to inventoryTransferService', async () => {
      const dto = {
        operator_id: 'operator-1',
        machine_id: 'machine-1',
        nomenclature_id: 'nom-1',
        quantity: 10,
      };
      const expectedResult = {
        machine: { id: 'mach-1', current_quantity: 20 },
        operator: { id: 'op-1', current_quantity: 15 },
      };
      inventoryTransferService.transferMachineToOperator.mockResolvedValue(expectedResult as any);

      const result = await service.transferMachineToOperator(dto, 'user-1');

      expect(result).toEqual(expectedResult);
      expect(inventoryTransferService.transferMachineToOperator).toHaveBeenCalledWith(
        dto,
        'user-1',
      );
    });
  });

  // ============================================================================
  // MACHINE INVENTORY TESTS
  // ============================================================================

  describe('getMachineInventory', () => {
    it('should delegate to machineInventoryService', async () => {
      const mockInventory = [
        { id: '1', machine_id: 'machine-1', nomenclature_id: 'nom-1', current_quantity: 25 },
      ];
      machineInventoryService.getMachineInventory.mockResolvedValue(mockInventory as any);

      const result = await service.getMachineInventory('machine-1');

      expect(result).toEqual(mockInventory);
      expect(machineInventoryService.getMachineInventory).toHaveBeenCalledWith('machine-1');
    });
  });

  describe('getMachineInventoryByNomenclature', () => {
    it('should delegate to machineInventoryService', async () => {
      const mockInventory = {
        id: '1',
        machine_id: 'machine-1',
        nomenclature_id: 'nom-1',
        current_quantity: 25,
      };
      machineInventoryService.getMachineInventoryByNomenclature.mockResolvedValue(
        mockInventory as any,
      );

      const result = await service.getMachineInventoryByNomenclature('machine-1', 'nom-1');

      expect(result).toEqual(mockInventory);
      expect(machineInventoryService.getMachineInventoryByNomenclature).toHaveBeenCalledWith(
        'machine-1',
        'nom-1',
      );
    });
  });

  describe('recordSale', () => {
    it('should delegate to machineInventoryService', async () => {
      const dto = {
        machine_id: 'machine-1',
        nomenclature_id: 'nom-1',
        quantity: 5,
        transaction_id: 'trans-1',
      };
      const expectedResult = {
        id: 'mach-1',
        current_quantity: 25,
      };
      machineInventoryService.recordSale.mockResolvedValue(expectedResult as any);

      const result = await service.recordSale(dto, 'user-1');

      expect(result).toEqual(expectedResult);
      expect(machineInventoryService.recordSale).toHaveBeenCalledWith(dto, 'user-1');
    });
  });

  describe('getMachinesLowStock', () => {
    it('should delegate to machineInventoryService', async () => {
      const lowStockMachines = [
        {
          id: '1',
          machine_id: 'machine-1',
          current_quantity: 3,
          min_stock_level: 10,
        },
      ];
      machineInventoryService.getMachinesLowStock.mockResolvedValue(lowStockMachines as any);

      const result = await service.getMachinesLowStock();

      expect(result).toEqual(lowStockMachines);
      expect(machineInventoryService.getMachinesLowStock).toHaveBeenCalled();
    });
  });

  describe('adjustMachineInventory', () => {
    it('should delegate to machineInventoryService', async () => {
      const dto = {
        actual_quantity: 30,
        notes: 'Physical inventory count',
      };
      const expectedResult = {
        id: 'mach-1',
        current_quantity: 30,
      };
      machineInventoryService.adjustMachineInventory.mockResolvedValue(expectedResult as any);

      const result = await service.adjustMachineInventory('machine-1', 'nom-1', dto, 'user-1');

      expect(result).toEqual(expectedResult);
      expect(machineInventoryService.adjustMachineInventory).toHaveBeenCalledWith(
        'machine-1',
        'nom-1',
        dto,
        'user-1',
      );
    });
  });

  describe('updateMachineInventory', () => {
    it('should delegate to machineInventoryService', async () => {
      const dto = { min_stock_level: 10 };
      const expectedResult = {
        id: '1',
        min_stock_level: 10,
      };
      machineInventoryService.updateMachineInventory.mockResolvedValue(expectedResult as any);

      const result = await service.updateMachineInventory('machine-1', 'nom-1', dto);

      expect(result).toEqual(expectedResult);
      expect(machineInventoryService.updateMachineInventory).toHaveBeenCalledWith(
        'machine-1',
        'nom-1',
        dto,
      );
    });
  });

  describe('deductFromMachine', () => {
    it('should delegate to machineInventoryService', async () => {
      machineInventoryService.deductFromMachine.mockResolvedValue(undefined);

      await service.deductFromMachine('machine-1', 'nom-1', 15, 'Sales import');

      expect(machineInventoryService.deductFromMachine).toHaveBeenCalledWith(
        'machine-1',
        'nom-1',
        15,
        'Sales import',
      );
    });

    it('should propagate errors from machineInventoryService', async () => {
      machineInventoryService.deductFromMachine.mockRejectedValue(
        new BadRequestException('Insufficient stock'),
      );

      await expect(
        service.deductFromMachine('machine-1', 'nom-1', 15, 'Sales import'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================================================
  // MOVEMENT TESTS
  // ============================================================================

  describe('getMovements', () => {
    it('should delegate to inventoryMovementService', async () => {
      const movements = [
        { id: '1', movement_type: MovementType.WAREHOUSE_IN, quantity: 100 },
        { id: '2', movement_type: MovementType.WAREHOUSE_TO_OPERATOR, quantity: 50 },
      ];
      inventoryMovementService.getMovements.mockResolvedValue(movements as any);

      const result = await service.getMovements();

      expect(result).toEqual(movements);
      expect(inventoryMovementService.getMovements).toHaveBeenCalled();
    });

    it('should pass all filters to inventoryMovementService', async () => {
      const dateFrom = new Date('2025-01-01');
      const dateTo = new Date('2025-01-31');
      inventoryMovementService.getMovements.mockResolvedValue([]);

      await service.getMovements(
        MovementType.WAREHOUSE_IN,
        'nom-1',
        'machine-1',
        'op-1',
        dateFrom,
        dateTo,
      );

      expect(inventoryMovementService.getMovements).toHaveBeenCalledWith(
        MovementType.WAREHOUSE_IN,
        'nom-1',
        'machine-1',
        'op-1',
        dateFrom,
        dateTo,
      );
    });
  });

  describe('getMovementStats', () => {
    it('should delegate to inventoryMovementService', async () => {
      const mockStats = {
        total: 100,
        by_type: [
          { type: MovementType.WAREHOUSE_IN, count: 30, total_quantity: 1000 },
          { type: MovementType.MACHINE_SALE, count: 70, total_quantity: 500 },
        ],
      };
      inventoryMovementService.getMovementStats.mockResolvedValue(mockStats);

      const result = await service.getMovementStats();

      expect(result).toEqual(mockStats);
      expect(inventoryMovementService.getMovementStats).toHaveBeenCalled();
    });

    it('should pass date range to inventoryMovementService', async () => {
      const dateFrom = new Date('2025-01-01');
      const dateTo = new Date('2025-01-31');
      inventoryMovementService.getMovementStats.mockResolvedValue({ total: 50, by_type: [] });

      await service.getMovementStats(dateFrom, dateTo);

      expect(inventoryMovementService.getMovementStats).toHaveBeenCalledWith(dateFrom, dateTo);
    });
  });

  // ============================================================================
  // RESERVATION TESTS
  // ============================================================================

  describe('createReservation', () => {
    it('should delegate to inventoryReservationService', async () => {
      const items = [{ nomenclature_id: 'nom-1', quantity: 20 }];
      const expectedReservations = [
        {
          id: 'res-1',
          task_id: 'task-1',
          nomenclature_id: 'nom-1',
          quantity_reserved: 20,
          status: ReservationStatus.PENDING,
        },
      ];
      inventoryReservationService.createReservation.mockResolvedValue(expectedReservations as any);

      const result = await service.createReservation('task-1', 'operator-1', items);

      expect(result).toEqual(expectedReservations);
      expect(inventoryReservationService.createReservation).toHaveBeenCalledWith(
        'task-1',
        'operator-1',
        items,
        undefined,
      );
    });

    it('should propagate errors from inventoryReservationService', async () => {
      const items = [{ nomenclature_id: 'nom-1', quantity: 20 }];
      inventoryReservationService.createReservation.mockRejectedValue(
        new NotFoundException('Operator has no inventory'),
      );

      await expect(service.createReservation('task-1', 'operator-1', items)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('fulfillReservation', () => {
    it('should delegate to inventoryReservationService', async () => {
      const fulfilledReservations = [
        {
          id: 'res-1',
          status: ReservationStatus.FULFILLED,
        },
      ];
      inventoryReservationService.fulfillReservation.mockResolvedValue(
        fulfilledReservations as any,
      );

      const result = await service.fulfillReservation('task-1');

      expect(result).toEqual(fulfilledReservations);
      expect(inventoryReservationService.fulfillReservation).toHaveBeenCalledWith('task-1');
    });
  });

  describe('cancelReservation', () => {
    it('should delegate to inventoryReservationService', async () => {
      const cancelledReservations = [
        {
          id: 'res-1',
          status: ReservationStatus.CANCELLED,
        },
      ];
      inventoryReservationService.cancelReservation.mockResolvedValue(
        cancelledReservations as any,
      );

      const result = await service.cancelReservation('task-1');

      expect(result).toEqual(cancelledReservations);
      expect(inventoryReservationService.cancelReservation).toHaveBeenCalledWith('task-1');
    });
  });

  describe('expireOldReservations', () => {
    it('should delegate to inventoryReservationService', async () => {
      inventoryReservationService.expireOldReservations.mockResolvedValue(5);

      const result = await service.expireOldReservations();

      expect(result).toBe(5);
      expect(inventoryReservationService.expireOldReservations).toHaveBeenCalled();
    });
  });

  describe('getReservationsByTask', () => {
    it('should delegate to inventoryReservationService', async () => {
      const reservations = [
        { id: 'res-1', task_id: 'task-1', nomenclature_id: 'nom-1', quantity_reserved: 20 },
      ];
      inventoryReservationService.getReservationsByTask.mockResolvedValue(reservations as any);

      const result = await service.getReservationsByTask('task-1');

      expect(result).toEqual(reservations);
      expect(inventoryReservationService.getReservationsByTask).toHaveBeenCalledWith('task-1');
    });
  });

  describe('getActiveReservationsByOperator', () => {
    it('should delegate to inventoryReservationService', async () => {
      const reservations = [
        {
          id: 'res-1',
          reference_id: 'operator-1',
          status: ReservationStatus.PENDING,
          inventory_level: InventoryLevel.OPERATOR,
        },
      ];
      inventoryReservationService.getActiveReservationsByOperator.mockResolvedValue(
        reservations as any,
      );

      const result = await service.getActiveReservationsByOperator('operator-1');

      expect(result).toEqual(reservations);
      expect(inventoryReservationService.getActiveReservationsByOperator).toHaveBeenCalledWith(
        'operator-1',
      );
    });
  });

  describe('getActiveReservations', () => {
    it('should delegate to inventoryReservationService', async () => {
      const reservations = [
        { id: 'res-1', status: ReservationStatus.PENDING },
        { id: 'res-2', status: ReservationStatus.PENDING },
      ];
      inventoryReservationService.getActiveReservations.mockResolvedValue(reservations as any);

      const result = await service.getActiveReservations();

      expect(result).toEqual(reservations);
      expect(inventoryReservationService.getActiveReservations).toHaveBeenCalled();
    });
  });

  describe('getReservationsByOperator', () => {
    it('should delegate to inventoryReservationService', async () => {
      const reservations = [
        { id: 'res-1', reference_id: 'operator-1', status: ReservationStatus.PENDING },
        { id: 'res-2', reference_id: 'operator-1', status: ReservationStatus.FULFILLED },
      ];
      inventoryReservationService.getReservationsByOperator.mockResolvedValue(reservations as any);

      const result = await service.getReservationsByOperator('operator-1');

      expect(result).toEqual(reservations);
      expect(inventoryReservationService.getReservationsByOperator).toHaveBeenCalledWith(
        'operator-1',
      );
    });
  });
});
