import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { MachineInventoryService } from './machine-inventory.service';
import { MachineInventory } from '../entities/machine-inventory.entity';
import { InventoryMovementService } from './inventory-movement.service';
import { MovementType } from '../entities/inventory-movement.entity';

describe('MachineInventoryService', () => {
  let service: MachineInventoryService;
  let machineInventoryRepository: jest.Mocked<Repository<MachineInventory>>;
  let movementService: jest.Mocked<InventoryMovementService>;

  const mockUserId = 'user-123';
  const mockMachineId = 'machine-456';
  const mockNomenclatureId = 'nom-789';

  const createMockInventory = (overrides: Partial<MachineInventory> = {}): MachineInventory =>
    ({
      id: 'inv-1',
      machine_id: mockMachineId,
      nomenclature_id: mockNomenclatureId,
      current_quantity: 50,
      min_stock_level: 10,
      last_refilled_at: new Date(),
      ...overrides,
    }) as MachineInventory;

  const createMockQueryBuilder = () => {
    const qb = {
      leftJoin: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<SelectQueryBuilder<MachineInventory>>;
    return qb;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MachineInventoryService,
        {
          provide: getRepositoryToken(MachineInventory),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn().mockImplementation((data) => ({ ...data })),
            save: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(createMockQueryBuilder()),
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

    service = module.get<MachineInventoryService>(MachineInventoryService);
    machineInventoryRepository = module.get(getRepositoryToken(MachineInventory));
    movementService = module.get(InventoryMovementService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMachineInventory', () => {
    it('should return machine inventory with nomenclature and machine info', async () => {
      const mockInventories = [createMockInventory(), createMockInventory({ id: 'inv-2' })];

      const mockQb = createMockQueryBuilder();
      mockQb.getMany.mockResolvedValue(mockInventories);
      machineInventoryRepository.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.getMachineInventory(mockMachineId);

      expect(result).toEqual(mockInventories);
      expect(mockQb.where).toHaveBeenCalledWith('inventory.machine_id = :machineId', {
        machineId: mockMachineId,
      });
      expect(mockQb.andWhere).toHaveBeenCalledWith('inventory.deleted_at IS NULL');
      expect(mockQb.andWhere).toHaveBeenCalledWith('machine.deleted_at IS NULL');
    });
  });

  describe('getMachineInventoryByNomenclature', () => {
    it('should return existing inventory', async () => {
      const mockInventory = createMockInventory();
      machineInventoryRepository.findOne.mockResolvedValue(mockInventory);

      const result = await service.getMachineInventoryByNomenclature(
        mockMachineId,
        mockNomenclatureId,
      );

      expect(result).toEqual(mockInventory);
      expect(machineInventoryRepository.findOne).toHaveBeenCalledWith({
        where: {
          machine_id: mockMachineId,
          nomenclature_id: mockNomenclatureId,
        },
      });
    });

    it('should create new inventory with zero quantity if not exists', async () => {
      const newInventory = createMockInventory({ current_quantity: 0, min_stock_level: 0 });
      machineInventoryRepository.findOne.mockResolvedValue(null);
      machineInventoryRepository.create.mockReturnValue(newInventory);
      machineInventoryRepository.save.mockResolvedValue(newInventory);

      const result = await service.getMachineInventoryByNomenclature(
        mockMachineId,
        mockNomenclatureId,
      );

      expect(machineInventoryRepository.create).toHaveBeenCalledWith({
        machine_id: mockMachineId,
        nomenclature_id: mockNomenclatureId,
        current_quantity: 0,
        min_stock_level: 0,
      });
      expect(result).toEqual(newInventory);
    });
  });

  describe('recordSale', () => {
    it('should deduct quantity and create movement for sale', async () => {
      const mockInventory = createMockInventory({ current_quantity: 100 });
      machineInventoryRepository.findOne.mockResolvedValue(mockInventory);
      machineInventoryRepository.save.mockResolvedValue({
        ...mockInventory,
        current_quantity: 95,
      });

      const result = await service.recordSale(
        {
          machine_id: mockMachineId,
          nomenclature_id: mockNomenclatureId,
          quantity: 5,
          transaction_id: 'tx-123',
        },
        mockUserId,
      );

      expect(result.current_quantity).toBe(95);
      expect(movementService.createMovement).toHaveBeenCalledWith(
        expect.objectContaining({
          movement_type: MovementType.MACHINE_SALE,
          quantity: 5,
          metadata: { transaction_id: 'tx-123' },
        }),
      );
    });

    it('should not deduct if insufficient stock but still record movement', async () => {
      const mockInventory = createMockInventory({ current_quantity: 2 });
      machineInventoryRepository.findOne.mockResolvedValue(mockInventory);

      await service.recordSale(
        {
          machine_id: mockMachineId,
          nomenclature_id: mockNomenclatureId,
          quantity: 10,
        },
        mockUserId,
      );

      // Save should not be called when insufficient stock
      expect(machineInventoryRepository.save).not.toHaveBeenCalled();
      // But movement should still be recorded
      expect(movementService.createMovement).toHaveBeenCalled();
    });

    it('should use operation_date if provided', async () => {
      const mockInventory = createMockInventory({ current_quantity: 100 });
      machineInventoryRepository.findOne.mockResolvedValue(mockInventory);

      const operationDate = '2024-01-15T10:00:00Z';
      await service.recordSale(
        {
          machine_id: mockMachineId,
          nomenclature_id: mockNomenclatureId,
          quantity: 5,
          operation_date: operationDate,
        },
        mockUserId,
      );

      expect(movementService.createMovement).toHaveBeenCalledWith(
        expect.objectContaining({
          operation_date: new Date(operationDate),
        }),
      );
    });
  });

  describe('deductFromMachine', () => {
    it('should deduct stock and create movement', async () => {
      const mockInventory = createMockInventory({ current_quantity: 100 });
      machineInventoryRepository.findOne.mockResolvedValue(mockInventory);
      machineInventoryRepository.save.mockResolvedValue({
        ...mockInventory,
        current_quantity: 85,
      });

      await service.deductFromMachine(mockMachineId, mockNomenclatureId, 15, 'Sales import');

      expect(machineInventoryRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          current_quantity: 85,
        }),
      );
      expect(movementService.createMovement).toHaveBeenCalledWith(
        expect.objectContaining({
          movement_type: MovementType.MACHINE_SALE,
          quantity: 15,
          notes: 'Sales import',
        }),
      );
    });

    it('should throw BadRequestException if insufficient stock', async () => {
      const mockInventory = createMockInventory({ current_quantity: 10 });
      machineInventoryRepository.findOne.mockResolvedValue(mockInventory);

      await expect(
        service.deductFromMachine(mockMachineId, mockNomenclatureId, 50, 'Sales import'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateMachineInventory', () => {
    it('should update machine inventory settings', async () => {
      const mockInventory = createMockInventory();
      machineInventoryRepository.findOne.mockResolvedValue(mockInventory);
      machineInventoryRepository.save.mockResolvedValue({
        ...mockInventory,
        min_stock_level: 20,
      });

      const result = await service.updateMachineInventory(mockMachineId, mockNomenclatureId, {
        min_stock_level: 20,
      });

      expect(result.min_stock_level).toBe(20);
    });
  });

  describe('getMachinesLowStock', () => {
    it('should return machines with low stock', async () => {
      const lowStockItems = [
        createMockInventory({ current_quantity: 3, min_stock_level: 10 }),
        createMockInventory({ id: 'inv-2', current_quantity: 5, min_stock_level: 15 }),
      ];

      const mockQb = createMockQueryBuilder();
      mockQb.getMany.mockResolvedValue(lowStockItems);
      machineInventoryRepository.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.getMachinesLowStock();

      expect(result).toEqual(lowStockItems);
      expect(mockQb.where).toHaveBeenCalledWith(
        'inventory.current_quantity <= inventory.min_stock_level',
      );
      expect(mockQb.andWhere).toHaveBeenCalledWith('inventory.min_stock_level > 0');
    });

    it('should filter out soft-deleted inventory and machines', async () => {
      const mockQb = createMockQueryBuilder();
      machineInventoryRepository.createQueryBuilder.mockReturnValue(mockQb);

      await service.getMachinesLowStock();

      expect(mockQb.andWhere).toHaveBeenCalledWith('inventory.deleted_at IS NULL');
      expect(mockQb.andWhere).toHaveBeenCalledWith('machine.deleted_at IS NULL');
    });
  });

  describe('adjustMachineInventory', () => {
    it('should adjust inventory and record difference', async () => {
      const mockInventory = createMockInventory({ current_quantity: 50 });
      machineInventoryRepository.findOne.mockResolvedValue(mockInventory);
      machineInventoryRepository.save.mockResolvedValue({
        ...mockInventory,
        current_quantity: 45,
      });

      const result = await service.adjustMachineInventory(
        mockMachineId,
        mockNomenclatureId,
        { actual_quantity: 45, notes: 'Stock take' },
        mockUserId,
      );

      expect(result.current_quantity).toBe(45);
      expect(movementService.createMovement).toHaveBeenCalledWith(
        expect.objectContaining({
          movement_type: MovementType.ADJUSTMENT,
          quantity: 5, // |45 - 50|
          notes: 'Stock take',
        }),
      );
    });

    it('should handle positive adjustment (excess found)', async () => {
      const mockInventory = createMockInventory({ current_quantity: 50 });
      machineInventoryRepository.findOne.mockResolvedValue(mockInventory);
      machineInventoryRepository.save.mockResolvedValue({
        ...mockInventory,
        current_quantity: 60,
      });

      await service.adjustMachineInventory(
        mockMachineId,
        mockNomenclatureId,
        { actual_quantity: 60 },
        mockUserId,
      );

      expect(movementService.createMovement).toHaveBeenCalledWith(
        expect.objectContaining({
          movement_type: MovementType.ADJUSTMENT,
          quantity: 10, // |60 - 50|
          notes: expect.stringContaining('+10'),
        }),
      );
    });

    it('should generate default notes if not provided', async () => {
      const mockInventory = createMockInventory({ current_quantity: 50 });
      machineInventoryRepository.findOne.mockResolvedValue(mockInventory);

      await service.adjustMachineInventory(
        mockMachineId,
        mockNomenclatureId,
        { actual_quantity: 40 },
        mockUserId,
      );

      expect(movementService.createMovement).toHaveBeenCalledWith(
        expect.objectContaining({
          notes: expect.stringContaining('50 -> 40'),
        }),
      );
    });
  });
});
