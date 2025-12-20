import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InventoryTransferService } from './inventory-transfer.service';
import { WarehouseInventory } from '../entities/warehouse-inventory.entity';
import { OperatorInventory } from '../entities/operator-inventory.entity';
import { MachineInventory } from '../entities/machine-inventory.entity';
import { InventoryMovement, MovementType } from '../entities/inventory-movement.entity';

describe('InventoryTransferService', () => {
  let service: InventoryTransferService;

  const mockUserId = 'user-123';
  const mockOperatorId = 'operator-456';
  const mockMachineId = 'machine-789';
  const mockNomenclatureId = 'nom-012';

  const createMockWarehouseInventory = (
    overrides: Partial<WarehouseInventory> = {},
  ): WarehouseInventory =>
    ({
      id: 'wh-inv-1',
      nomenclature_id: mockNomenclatureId,
      current_quantity: 100,
      reserved_quantity: 0,
      ...overrides,
    }) as WarehouseInventory;

  const createMockOperatorInventory = (
    overrides: Partial<OperatorInventory> = {},
  ): OperatorInventory =>
    ({
      id: 'op-inv-1',
      operator_id: mockOperatorId,
      nomenclature_id: mockNomenclatureId,
      current_quantity: 50,
      reserved_quantity: 0,
      ...overrides,
    }) as OperatorInventory;

  const createMockMachineInventory = (
    overrides: Partial<MachineInventory> = {},
  ): MachineInventory =>
    ({
      id: 'mc-inv-1',
      machine_id: mockMachineId,
      nomenclature_id: mockNomenclatureId,
      current_quantity: 20,
      min_stock_level: 5,
      ...overrides,
    }) as MachineInventory;

  let mockManager: {
    findOne: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
  };

  beforeEach(async () => {
    mockManager = {
      findOne: jest.fn(),
      save: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockImplementation((entity, data) => ({ ...data })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryTransferService,
        {
          provide: getRepositoryToken(WarehouseInventory),
          useValue: {},
        },
        {
          provide: getRepositoryToken(OperatorInventory),
          useValue: {},
        },
        {
          provide: getRepositoryToken(MachineInventory),
          useValue: {},
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn((callback) => callback(mockManager)),
          },
        },
      ],
    }).compile();

    service = module.get<InventoryTransferService>(InventoryTransferService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('transferWarehouseToOperator', () => {
    it('should transfer stock from warehouse to operator', async () => {
      const warehouseInventory = createMockWarehouseInventory({ current_quantity: 100 });
      const operatorInventory = createMockOperatorInventory({ current_quantity: 10 });

      mockManager.findOne
        .mockResolvedValueOnce(warehouseInventory) // Warehouse lookup
        .mockResolvedValueOnce(operatorInventory); // Operator lookup

      const result = await service.transferWarehouseToOperator(
        {
          nomenclature_id: mockNomenclatureId,
          operator_id: mockOperatorId,
          quantity: 30,
        },
        mockUserId,
      );

      expect(result.warehouse.current_quantity).toBe(70); // 100 - 30
      expect(result.operator.current_quantity).toBe(40); // 10 + 30
      expect(mockManager.save).toHaveBeenCalledWith(
        InventoryMovement,
        expect.objectContaining({
          movement_type: MovementType.WAREHOUSE_TO_OPERATOR,
          quantity: 30,
        }),
      );
    });

    it('should throw NotFoundException if warehouse inventory not found', async () => {
      mockManager.findOne.mockResolvedValueOnce(null);

      await expect(
        service.transferWarehouseToOperator(
          {
            nomenclature_id: mockNomenclatureId,
            operator_id: mockOperatorId,
            quantity: 30,
          },
          mockUserId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if insufficient warehouse stock', async () => {
      const warehouseInventory = createMockWarehouseInventory({ current_quantity: 20 });
      mockManager.findOne.mockResolvedValueOnce(warehouseInventory);

      await expect(
        service.transferWarehouseToOperator(
          {
            nomenclature_id: mockNomenclatureId,
            operator_id: mockOperatorId,
            quantity: 50,
          },
          mockUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create new operator inventory if not exists', async () => {
      const warehouseInventory = createMockWarehouseInventory({ current_quantity: 100 });
      mockManager.findOne
        .mockResolvedValueOnce(warehouseInventory)
        .mockResolvedValueOnce(null); // Operator inventory not found

      await service.transferWarehouseToOperator(
        {
          nomenclature_id: mockNomenclatureId,
          operator_id: mockOperatorId,
          quantity: 30,
        },
        mockUserId,
      );

      expect(mockManager.create).toHaveBeenCalledWith(
        OperatorInventory,
        expect.objectContaining({
          operator_id: mockOperatorId,
          nomenclature_id: mockNomenclatureId,
          current_quantity: 0,
        }),
      );
    });

    it('should set last_received_at timestamp on operator inventory', async () => {
      const warehouseInventory = createMockWarehouseInventory();
      const operatorInventory = createMockOperatorInventory();
      mockManager.findOne
        .mockResolvedValueOnce(warehouseInventory)
        .mockResolvedValueOnce(operatorInventory);

      await service.transferWarehouseToOperator(
        {
          nomenclature_id: mockNomenclatureId,
          operator_id: mockOperatorId,
          quantity: 10,
        },
        mockUserId,
      );

      expect(mockManager.save).toHaveBeenCalledWith(
        OperatorInventory,
        expect.objectContaining({
          last_received_at: expect.any(Date),
        }),
      );
    });
  });

  describe('transferOperatorToWarehouse', () => {
    it('should transfer stock from operator back to warehouse', async () => {
      const operatorInventory = createMockOperatorInventory({ current_quantity: 50 });
      const warehouseInventory = createMockWarehouseInventory({ current_quantity: 100 });

      mockManager.findOne
        .mockResolvedValueOnce(operatorInventory)
        .mockResolvedValueOnce(warehouseInventory);

      const result = await service.transferOperatorToWarehouse(
        {
          nomenclature_id: mockNomenclatureId,
          operator_id: mockOperatorId,
          quantity: 20,
        },
        mockUserId,
      );

      expect(result.operator.current_quantity).toBe(30); // 50 - 20
      expect(result.warehouse.current_quantity).toBe(120); // 100 + 20
      expect(mockManager.save).toHaveBeenCalledWith(
        InventoryMovement,
        expect.objectContaining({
          movement_type: MovementType.OPERATOR_TO_WAREHOUSE,
        }),
      );
    });

    it('should throw NotFoundException if operator inventory not found', async () => {
      mockManager.findOne.mockResolvedValueOnce(null);

      await expect(
        service.transferOperatorToWarehouse(
          {
            nomenclature_id: mockNomenclatureId,
            operator_id: mockOperatorId,
            quantity: 20,
          },
          mockUserId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if insufficient operator stock', async () => {
      const operatorInventory = createMockOperatorInventory({ current_quantity: 10 });
      mockManager.findOne.mockResolvedValueOnce(operatorInventory);

      await expect(
        service.transferOperatorToWarehouse(
          {
            nomenclature_id: mockNomenclatureId,
            operator_id: mockOperatorId,
            quantity: 50,
          },
          mockUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('transferOperatorToMachine', () => {
    it('should transfer stock from operator to machine (refill)', async () => {
      const operatorInventory = createMockOperatorInventory({ current_quantity: 50 });
      const machineInventory = createMockMachineInventory({ current_quantity: 10 });

      mockManager.findOne
        .mockResolvedValueOnce(operatorInventory)
        .mockResolvedValueOnce(machineInventory);

      const result = await service.transferOperatorToMachine(
        {
          nomenclature_id: mockNomenclatureId,
          operator_id: mockOperatorId,
          machine_id: mockMachineId,
          quantity: 25,
          task_id: 'task-123',
        },
        mockUserId,
      );

      expect(result.operator.current_quantity).toBe(25); // 50 - 25
      expect(result.machine.current_quantity).toBe(35); // 10 + 25
      expect(mockManager.save).toHaveBeenCalledWith(
        InventoryMovement,
        expect.objectContaining({
          movement_type: MovementType.OPERATOR_TO_MACHINE,
          task_id: 'task-123',
        }),
      );
    });

    it('should set last_refilled_at and last_refill_task_id on machine inventory', async () => {
      const operatorInventory = createMockOperatorInventory();
      const machineInventory = createMockMachineInventory();
      mockManager.findOne
        .mockResolvedValueOnce(operatorInventory)
        .mockResolvedValueOnce(machineInventory);

      await service.transferOperatorToMachine(
        {
          nomenclature_id: mockNomenclatureId,
          operator_id: mockOperatorId,
          machine_id: mockMachineId,
          quantity: 10,
          task_id: 'task-123',
        },
        mockUserId,
      );

      expect(mockManager.save).toHaveBeenCalledWith(
        MachineInventory,
        expect.objectContaining({
          last_refilled_at: expect.any(Date),
          last_refill_task_id: 'task-123',
        }),
      );
    });

    it('should set last_task_id on operator inventory', async () => {
      const operatorInventory = createMockOperatorInventory();
      const machineInventory = createMockMachineInventory();
      mockManager.findOne
        .mockResolvedValueOnce(operatorInventory)
        .mockResolvedValueOnce(machineInventory);

      await service.transferOperatorToMachine(
        {
          nomenclature_id: mockNomenclatureId,
          operator_id: mockOperatorId,
          machine_id: mockMachineId,
          quantity: 10,
          task_id: 'task-123',
        },
        mockUserId,
      );

      expect(mockManager.save).toHaveBeenCalledWith(
        OperatorInventory,
        expect.objectContaining({
          last_task_id: 'task-123',
        }),
      );
    });

    it('should throw NotFoundException if operator inventory not found', async () => {
      mockManager.findOne.mockResolvedValueOnce(null);

      await expect(
        service.transferOperatorToMachine(
          {
            nomenclature_id: mockNomenclatureId,
            operator_id: mockOperatorId,
            machine_id: mockMachineId,
            quantity: 10,
          },
          mockUserId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if insufficient operator stock', async () => {
      const operatorInventory = createMockOperatorInventory({ current_quantity: 5 });
      mockManager.findOne.mockResolvedValueOnce(operatorInventory);

      await expect(
        service.transferOperatorToMachine(
          {
            nomenclature_id: mockNomenclatureId,
            operator_id: mockOperatorId,
            machine_id: mockMachineId,
            quantity: 20,
          },
          mockUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create new machine inventory if not exists', async () => {
      const operatorInventory = createMockOperatorInventory();
      mockManager.findOne
        .mockResolvedValueOnce(operatorInventory)
        .mockResolvedValueOnce(null); // Machine inventory not found

      await service.transferOperatorToMachine(
        {
          nomenclature_id: mockNomenclatureId,
          operator_id: mockOperatorId,
          machine_id: mockMachineId,
          quantity: 10,
        },
        mockUserId,
      );

      expect(mockManager.create).toHaveBeenCalledWith(
        MachineInventory,
        expect.objectContaining({
          machine_id: mockMachineId,
          nomenclature_id: mockNomenclatureId,
          current_quantity: 0,
        }),
      );
    });
  });

  describe('transferMachineToOperator', () => {
    it('should transfer stock from machine to operator (removal)', async () => {
      const machineInventory = createMockMachineInventory({ current_quantity: 30 });
      const operatorInventory = createMockOperatorInventory({ current_quantity: 10 });

      mockManager.findOne
        .mockResolvedValueOnce(machineInventory)
        .mockResolvedValueOnce(operatorInventory);

      const result = await service.transferMachineToOperator(
        {
          nomenclature_id: mockNomenclatureId,
          operator_id: mockOperatorId,
          machine_id: mockMachineId,
          quantity: 15,
        },
        mockUserId,
      );

      expect(result.machine.current_quantity).toBe(15); // 30 - 15
      expect(result.operator.current_quantity).toBe(25); // 10 + 15
      expect(mockManager.save).toHaveBeenCalledWith(
        InventoryMovement,
        expect.objectContaining({
          movement_type: MovementType.MACHINE_TO_OPERATOR,
        }),
      );
    });

    it('should throw NotFoundException if machine inventory not found', async () => {
      mockManager.findOne.mockResolvedValueOnce(null);

      await expect(
        service.transferMachineToOperator(
          {
            nomenclature_id: mockNomenclatureId,
            operator_id: mockOperatorId,
            machine_id: mockMachineId,
            quantity: 10,
          },
          mockUserId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if insufficient machine stock', async () => {
      const machineInventory = createMockMachineInventory({ current_quantity: 5 });
      mockManager.findOne.mockResolvedValueOnce(machineInventory);

      await expect(
        service.transferMachineToOperator(
          {
            nomenclature_id: mockNomenclatureId,
            operator_id: mockOperatorId,
            machine_id: mockMachineId,
            quantity: 20,
          },
          mockUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create new operator inventory if not exists', async () => {
      const machineInventory = createMockMachineInventory();
      mockManager.findOne
        .mockResolvedValueOnce(machineInventory)
        .mockResolvedValueOnce(null); // Operator inventory not found

      await service.transferMachineToOperator(
        {
          nomenclature_id: mockNomenclatureId,
          operator_id: mockOperatorId,
          machine_id: mockMachineId,
          quantity: 10,
        },
        mockUserId,
      );

      expect(mockManager.create).toHaveBeenCalledWith(
        OperatorInventory,
        expect.objectContaining({
          operator_id: mockOperatorId,
          nomenclature_id: mockNomenclatureId,
          current_quantity: 0,
        }),
      );
    });
  });
});
