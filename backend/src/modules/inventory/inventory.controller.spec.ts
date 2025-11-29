import { Test, TestingModule } from '@nestjs/testing';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { WarehouseInventory } from './entities/warehouse-inventory.entity';
import { OperatorInventory } from './entities/operator-inventory.entity';
import { MachineInventory } from './entities/machine-inventory.entity';
import { InventoryMovement, MovementType } from './entities/inventory-movement.entity';

describe('InventoryController', () => {
  let controller: InventoryController;
  let mockInventoryService: any;

  const mockWarehouseInventory: Partial<WarehouseInventory> = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    nomenclature_id: '123e4567-e89b-12d3-a456-426614174002',
    current_quantity: 100,
    min_stock_level: 10,
    last_restocked_at: new Date(),
  };

  const mockOperatorInventory: Partial<OperatorInventory> = {
    id: '123e4567-e89b-12d3-a456-426614174003',
    operator_id: '123e4567-e89b-12d3-a456-426614174004',
    nomenclature_id: '123e4567-e89b-12d3-a456-426614174002',
    current_quantity: 50,
  };

  const mockMachineInventory: Partial<MachineInventory> = {
    id: '123e4567-e89b-12d3-a456-426614174005',
    machine_id: '123e4567-e89b-12d3-a456-426614174006',
    nomenclature_id: '123e4567-e89b-12d3-a456-426614174002',
    current_quantity: 25,
    max_capacity: 100,
    min_stock_level: 5,
  };

  const mockMovement: Partial<InventoryMovement> = {
    id: '123e4567-e89b-12d3-a456-426614174007',
    movement_type: MovementType.WAREHOUSE_IN,
    nomenclature_id: '123e4567-e89b-12d3-a456-426614174002',
    quantity: 10,
    created_at: new Date(),
  };

  const mockRequest = { user: { id: 'user-123' } };

  beforeEach(async () => {
    mockInventoryService = {
      // Warehouse methods
      getWarehouseInventory: jest.fn(),
      getWarehouseLowStock: jest.fn(),
      getWarehouseInventoryByNomenclature: jest.fn(),
      addToWarehouse: jest.fn(),
      removeFromWarehouse: jest.fn(),
      updateWarehouseInventory: jest.fn(),
      // Operator methods
      getOperatorInventory: jest.fn(),
      getOperatorInventoryByNomenclature: jest.fn(),
      // Machine methods
      getMachineInventory: jest.fn(),
      getMachineInventoryByNomenclature: jest.fn(),
      getMachinesLowStock: jest.fn(),
      updateMachineInventory: jest.fn(),
      adjustMachineInventory: jest.fn(),
      // Transfer methods
      transferWarehouseToOperator: jest.fn(),
      transferOperatorToWarehouse: jest.fn(),
      transferOperatorToMachine: jest.fn(),
      transferMachineToOperator: jest.fn(),
      // Sale
      recordSale: jest.fn(),
      // Movements
      getMovements: jest.fn(),
      getMovementStats: jest.fn(),
      // Reservations
      getActiveReservations: jest.fn(),
      getReservationsByTask: jest.fn(),
      getReservationsByOperator: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryController],
      providers: [
        {
          provide: InventoryService,
          useValue: mockInventoryService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<InventoryController>(InventoryController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // WAREHOUSE INVENTORY ENDPOINTS
  // ==========================================================================

  describe('getWarehouseInventory', () => {
    it('should return all warehouse inventory', async () => {
      const mockItems = [mockWarehouseInventory];
      mockInventoryService.getWarehouseInventory.mockResolvedValue(mockItems as any);

      const result = await controller.getWarehouseInventory();

      expect(result).toEqual(mockItems);
      expect(mockInventoryService.getWarehouseInventory).toHaveBeenCalled();
    });

    it('should return empty array when no inventory', async () => {
      mockInventoryService.getWarehouseInventory.mockResolvedValue([]);

      const result = await controller.getWarehouseInventory();

      expect(result).toEqual([]);
    });
  });

  describe('getWarehouseLowStock', () => {
    it('should return low stock items', async () => {
      const lowStockItem = { ...mockWarehouseInventory, current_quantity: 5 };
      mockInventoryService.getWarehouseLowStock.mockResolvedValue([lowStockItem] as any);

      const result = await controller.getWarehouseLowStock();

      expect(result).toEqual([lowStockItem]);
      expect(mockInventoryService.getWarehouseLowStock).toHaveBeenCalled();
    });
  });

  describe('getWarehouseInventoryByNomenclature', () => {
    it('should return inventory for specific nomenclature', async () => {
      mockInventoryService.getWarehouseInventoryByNomenclature.mockResolvedValue(
        mockWarehouseInventory as any,
      );

      const result = await controller.getWarehouseInventoryByNomenclature(
        '123e4567-e89b-12d3-a456-426614174002',
      );

      expect(result).toEqual(mockWarehouseInventory);
      expect(mockInventoryService.getWarehouseInventoryByNomenclature).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174002',
      );
    });
  });

  describe('addToWarehouse', () => {
    it('should add items to warehouse', async () => {
      const dto = { nomenclature_id: 'nom-1', quantity: 50, notes: 'New stock' };
      const updatedInventory = { ...mockWarehouseInventory, current_quantity: 150 };
      mockInventoryService.addToWarehouse.mockResolvedValue(updatedInventory as any);

      const result = await controller.addToWarehouse(dto, mockRequest as any);

      expect(result).toEqual(updatedInventory);
      expect(mockInventoryService.addToWarehouse).toHaveBeenCalledWith(dto, 'user-123');
    });
  });

  describe('removeFromWarehouse', () => {
    it('should remove items from warehouse', async () => {
      const dto = { nomenclature_id: 'nom-1', quantity: 20, notes: 'Damaged goods' };
      const updatedInventory = { ...mockWarehouseInventory, current_quantity: 80 };
      mockInventoryService.removeFromWarehouse.mockResolvedValue(updatedInventory as any);

      const result = await controller.removeFromWarehouse(dto, mockRequest as any);

      expect(result).toEqual(updatedInventory);
      expect(mockInventoryService.removeFromWarehouse).toHaveBeenCalledWith(dto, 'user-123');
    });
  });

  describe('updateWarehouseInventory', () => {
    it('should update warehouse inventory settings', async () => {
      const dto = { min_stock_level: 15 };
      const updatedInventory = { ...mockWarehouseInventory, min_stock_level: 15 };
      mockInventoryService.updateWarehouseInventory.mockResolvedValue(updatedInventory as any);

      const result = await controller.updateWarehouseInventory(
        '123e4567-e89b-12d3-a456-426614174002',
        dto,
      );

      expect(result).toEqual(updatedInventory);
      expect(mockInventoryService.updateWarehouseInventory).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174002',
        dto,
      );
    });
  });

  // ==========================================================================
  // OPERATOR INVENTORY ENDPOINTS
  // ==========================================================================

  describe('getOperatorInventory', () => {
    it('should return operator inventory', async () => {
      const mockItems = [mockOperatorInventory];
      mockInventoryService.getOperatorInventory.mockResolvedValue(mockItems as any);

      const result = await controller.getOperatorInventory('123e4567-e89b-12d3-a456-426614174004');

      expect(result).toEqual(mockItems);
      expect(mockInventoryService.getOperatorInventory).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174004',
      );
    });
  });

  describe('getOperatorInventoryByNomenclature', () => {
    it('should return specific item in operator inventory', async () => {
      mockInventoryService.getOperatorInventoryByNomenclature.mockResolvedValue(
        mockOperatorInventory as any,
      );

      const result = await controller.getOperatorInventoryByNomenclature(
        '123e4567-e89b-12d3-a456-426614174004',
        '123e4567-e89b-12d3-a456-426614174002',
      );

      expect(result).toEqual(mockOperatorInventory);
      expect(mockInventoryService.getOperatorInventoryByNomenclature).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174004',
        '123e4567-e89b-12d3-a456-426614174002',
      );
    });
  });

  // ==========================================================================
  // MACHINE INVENTORY ENDPOINTS
  // ==========================================================================

  describe('getMachineInventory', () => {
    it('should return machine inventory', async () => {
      const mockItems = [mockMachineInventory];
      mockInventoryService.getMachineInventory.mockResolvedValue(mockItems as any);

      const result = await controller.getMachineInventory('123e4567-e89b-12d3-a456-426614174006');

      expect(result).toEqual(mockItems);
      expect(mockInventoryService.getMachineInventory).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174006',
      );
    });
  });

  describe('getMachineInventoryByNomenclature', () => {
    it('should return specific item in machine inventory', async () => {
      mockInventoryService.getMachineInventoryByNomenclature.mockResolvedValue(
        mockMachineInventory as any,
      );

      const result = await controller.getMachineInventoryByNomenclature(
        '123e4567-e89b-12d3-a456-426614174006',
        '123e4567-e89b-12d3-a456-426614174002',
      );

      expect(result).toEqual(mockMachineInventory);
      expect(mockInventoryService.getMachineInventoryByNomenclature).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174006',
        '123e4567-e89b-12d3-a456-426614174002',
      );
    });
  });

  describe('getMachinesLowStock', () => {
    it('should return machines with low stock', async () => {
      const lowStockItem = { ...mockMachineInventory, current_quantity: 3 };
      mockInventoryService.getMachinesLowStock.mockResolvedValue([lowStockItem] as any);

      const result = await controller.getMachinesLowStock();

      expect(result).toEqual([lowStockItem]);
      expect(mockInventoryService.getMachinesLowStock).toHaveBeenCalled();
    });
  });

  describe('updateMachineInventory', () => {
    it('should update machine inventory settings', async () => {
      const dto = { min_stock_level: 10, max_capacity: 150 };
      const updatedInventory = { ...mockMachineInventory, ...dto };
      mockInventoryService.updateMachineInventory.mockResolvedValue(updatedInventory as any);

      const result = await controller.updateMachineInventory(
        '123e4567-e89b-12d3-a456-426614174006',
        '123e4567-e89b-12d3-a456-426614174002',
        dto,
      );

      expect(result).toEqual(updatedInventory);
      expect(mockInventoryService.updateMachineInventory).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174006',
        '123e4567-e89b-12d3-a456-426614174002',
        dto,
      );
    });
  });

  describe('adjustMachineInventory', () => {
    it('should adjust machine inventory (inventory count)', async () => {
      const dto = { actual_quantity: 30, notes: 'Physical count adjustment' };
      const adjustedInventory = { ...mockMachineInventory, current_quantity: 30 };
      mockInventoryService.adjustMachineInventory.mockResolvedValue(adjustedInventory as any);

      const result = await controller.adjustMachineInventory(
        '123e4567-e89b-12d3-a456-426614174006',
        '123e4567-e89b-12d3-a456-426614174002',
        dto as any,
        mockRequest as any,
      );

      expect(result).toEqual(adjustedInventory);
      expect(mockInventoryService.adjustMachineInventory).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174006',
        '123e4567-e89b-12d3-a456-426614174002',
        dto,
        'user-123',
      );
    });
  });

  // ==========================================================================
  // TRANSFER ENDPOINTS
  // ==========================================================================

  describe('transferWarehouseToOperator', () => {
    it('should transfer from warehouse to operator', async () => {
      const dto = { operator_id: 'op-1', nomenclature_id: 'nom-1', quantity: 20 };
      const mockResult = { success: true, transferred: 20 };
      mockInventoryService.transferWarehouseToOperator.mockResolvedValue(mockResult as any);

      const result = await controller.transferWarehouseToOperator(dto, mockRequest as any);

      expect(result).toEqual(mockResult);
      expect(mockInventoryService.transferWarehouseToOperator).toHaveBeenCalledWith(
        dto,
        'user-123',
      );
    });
  });

  describe('transferOperatorToWarehouse', () => {
    it('should transfer from operator to warehouse', async () => {
      const dto = { operator_id: 'op-1', nomenclature_id: 'nom-1', quantity: 10 };
      const mockResult = { success: true, returned: 10 };
      mockInventoryService.transferOperatorToWarehouse.mockResolvedValue(mockResult as any);

      const result = await controller.transferOperatorToWarehouse(dto, mockRequest as any);

      expect(result).toEqual(mockResult);
      expect(mockInventoryService.transferOperatorToWarehouse).toHaveBeenCalledWith(
        dto,
        'user-123',
      );
    });
  });

  describe('transferOperatorToMachine', () => {
    it('should transfer from operator to machine', async () => {
      const dto = {
        operator_id: 'op-1',
        machine_id: 'm-1',
        nomenclature_id: 'nom-1',
        quantity: 15,
      };
      const mockResult = { success: true, loaded: 15 };
      mockInventoryService.transferOperatorToMachine.mockResolvedValue(mockResult as any);

      const result = await controller.transferOperatorToMachine(dto, mockRequest as any);

      expect(result).toEqual(mockResult);
      expect(mockInventoryService.transferOperatorToMachine).toHaveBeenCalledWith(dto, 'user-123');
    });
  });

  describe('transferMachineToOperator', () => {
    it('should transfer from machine to operator', async () => {
      const dto = { operator_id: 'op-1', machine_id: 'm-1', nomenclature_id: 'nom-1', quantity: 5 };
      const mockResult = { success: true, removed: 5 };
      mockInventoryService.transferMachineToOperator.mockResolvedValue(mockResult as any);

      const result = await controller.transferMachineToOperator(dto, mockRequest as any);

      expect(result).toEqual(mockResult);
      expect(mockInventoryService.transferMachineToOperator).toHaveBeenCalledWith(dto, 'user-123');
    });
  });

  describe('recordSale', () => {
    it('should record a sale', async () => {
      const dto = { machine_id: 'm-1', nomenclature_id: 'nom-1', quantity: 1 };
      const updatedInventory = { ...mockMachineInventory, current_quantity: 24 };
      mockInventoryService.recordSale.mockResolvedValue(updatedInventory as any);

      const result = await controller.recordSale(dto, mockRequest as any);

      expect(result).toEqual(updatedInventory);
      expect(mockInventoryService.recordSale).toHaveBeenCalledWith(dto, 'user-123');
    });
  });

  // ==========================================================================
  // MOVEMENTS ENDPOINTS
  // ==========================================================================

  describe('getMovements', () => {
    it('should return movements with no filters', async () => {
      const mockMovements = [mockMovement];
      mockInventoryService.getMovements.mockResolvedValue(mockMovements as any);

      const result = await controller.getMovements();

      expect(result).toEqual(mockMovements);
      expect(mockInventoryService.getMovements).toHaveBeenCalledWith(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
      );
    });

    it('should return movements with all filters', async () => {
      const mockMovements = [mockMovement];
      mockInventoryService.getMovements.mockResolvedValue(mockMovements as any);

      const result = await controller.getMovements(
        MovementType.WAREHOUSE_IN,
        'nom-1',
        'machine-1',
        'op-1',
        '2025-01-01',
        '2025-01-31',
      );

      expect(result).toEqual(mockMovements);
      expect(mockInventoryService.getMovements).toHaveBeenCalledWith(
        MovementType.WAREHOUSE_IN,
        'nom-1',
        'machine-1',
        'op-1',
        expect.any(Date),
        expect.any(Date),
      );
    });

    it('should handle date filtering correctly', async () => {
      mockInventoryService.getMovements.mockResolvedValue([]);

      await controller.getMovements(
        undefined,
        undefined,
        undefined,
        undefined,
        '2025-01-01',
        '2025-01-31',
      );

      expect(mockInventoryService.getMovements).toHaveBeenCalledWith(
        undefined,
        undefined,
        undefined,
        undefined,
        new Date('2025-01-01'),
        new Date('2025-01-31'),
      );
    });
  });

  describe('getMovementStats', () => {
    it('should return movement statistics', async () => {
      const mockStats = {
        totalIn: 100,
        totalOut: 80,
        byType: { WAREHOUSE_IN: 50, WAREHOUSE_OUT: 30 },
      };
      mockInventoryService.getMovementStats.mockResolvedValue(mockStats);

      const result = await controller.getMovementStats();

      expect(result).toEqual(mockStats);
      expect(mockInventoryService.getMovementStats).toHaveBeenCalled();
    });

    it('should return stats with date filters', async () => {
      const mockStats = { totalIn: 50, totalOut: 40 };
      mockInventoryService.getMovementStats.mockResolvedValue(mockStats);

      const result = await controller.getMovementStats('2025-01-01', '2025-01-31');

      expect(result).toEqual(mockStats);
      expect(mockInventoryService.getMovementStats).toHaveBeenCalledWith(
        new Date('2025-01-01'),
        new Date('2025-01-31'),
      );
    });
  });

  // ==========================================================================
  // RESERVATIONS ENDPOINTS
  // ==========================================================================

  describe('getActiveReservations', () => {
    it('should return active reservations', async () => {
      const mockReservations = [{ id: 'res-1', task_id: 'task-1', status: 'active' }];
      mockInventoryService.getActiveReservations.mockResolvedValue(mockReservations);

      const result = await controller.getActiveReservations();

      expect(result).toEqual(mockReservations);
      expect(mockInventoryService.getActiveReservations).toHaveBeenCalled();
    });
  });

  describe('getReservationsByTask', () => {
    it('should return reservations for a task', async () => {
      const mockReservations = [{ id: 'res-1', task_id: 'task-123' }];
      mockInventoryService.getReservationsByTask.mockResolvedValue(mockReservations);

      const result = await controller.getReservationsByTask('task-123');

      expect(result).toEqual(mockReservations);
      expect(mockInventoryService.getReservationsByTask).toHaveBeenCalledWith('task-123');
    });
  });

  describe('getReservationsByOperator', () => {
    it('should return reservations for an operator', async () => {
      const mockReservations = [{ id: 'res-1', operator_id: 'op-123' }];
      mockInventoryService.getReservationsByOperator.mockResolvedValue(mockReservations);

      const result = await controller.getReservationsByOperator('op-123');

      expect(result).toEqual(mockReservations);
      expect(mockInventoryService.getReservationsByOperator).toHaveBeenCalledWith('op-123');
    });
  });
});
