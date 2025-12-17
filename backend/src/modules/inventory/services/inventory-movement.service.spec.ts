import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { InventoryMovementService } from './inventory-movement.service';
import { InventoryMovement, MovementType } from '../entities/inventory-movement.entity';

describe('InventoryMovementService', () => {
  let service: InventoryMovementService;
  let movementRepository: jest.Mocked<Repository<InventoryMovement>>;

  const mockUserId = 'user-123';
  const mockMachineId = 'machine-456';
  const mockNomenclatureId = 'nom-789';
  const mockOperatorId = 'operator-012';

  const createMockMovement = (overrides: Partial<InventoryMovement> = {}): InventoryMovement =>
    ({
      id: 'mov-1',
      movement_type: MovementType.WAREHOUSE_TO_OPERATOR,
      nomenclature_id: mockNomenclatureId,
      quantity: 10,
      performed_by_user_id: mockUserId,
      operator_id: mockOperatorId,
      machine_id: null,
      notes: 'Test movement',
      created_at: new Date(),
      ...overrides,
    }) as InventoryMovement;

  const createMockQueryBuilder = () => {
    const qb = {
      leftJoin: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
      getCount: jest.fn().mockResolvedValue(0),
      getRawMany: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<SelectQueryBuilder<InventoryMovement>>;
    return qb;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryMovementService,
        {
          provide: getRepositoryToken(InventoryMovement),
          useValue: {
            create: jest.fn().mockImplementation((data) => ({ ...data })),
            save: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(createMockQueryBuilder()),
          },
        },
      ],
    }).compile();

    service = module.get<InventoryMovementService>(InventoryMovementService);
    movementRepository = module.get(getRepositoryToken(InventoryMovement));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createMovement', () => {
    it('should create and save a movement record', async () => {
      const movementData = {
        movement_type: MovementType.WAREHOUSE_TO_OPERATOR,
        nomenclature_id: mockNomenclatureId,
        quantity: 25,
        performed_by_user_id: mockUserId,
        operator_id: mockOperatorId,
        notes: 'Stock transfer',
      };

      const createdMovement = createMockMovement(movementData);
      movementRepository.create.mockReturnValue(createdMovement);
      movementRepository.save.mockResolvedValue(createdMovement);

      const result = await service.createMovement(movementData);

      expect(movementRepository.create).toHaveBeenCalledWith(movementData);
      expect(movementRepository.save).toHaveBeenCalledWith(createdMovement);
      expect(result).toEqual(createdMovement);
    });

    it('should create movement with machine reference', async () => {
      const movementData = {
        movement_type: MovementType.OPERATOR_TO_MACHINE,
        nomenclature_id: mockNomenclatureId,
        quantity: 15,
        performed_by_user_id: mockUserId,
        operator_id: mockOperatorId,
        machine_id: mockMachineId,
      };

      const createdMovement = createMockMovement(movementData);
      movementRepository.create.mockReturnValue(createdMovement);
      movementRepository.save.mockResolvedValue(createdMovement);

      const result = await service.createMovement(movementData);

      expect(result.machine_id).toBe(mockMachineId);
    });
  });

  describe('getMovements', () => {
    it('should return all movements without filters', async () => {
      const mockMovements = [createMockMovement(), createMockMovement({ id: 'mov-2' })];

      const mockQb = createMockQueryBuilder();
      mockQb.getMany.mockResolvedValue(mockMovements);
      movementRepository.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.getMovements();

      expect(result).toEqual(mockMovements);
      expect(mockQb.orderBy).toHaveBeenCalledWith('movement.created_at', 'DESC');
    });

    it('should filter by movement type', async () => {
      const mockQb = createMockQueryBuilder();
      movementRepository.createQueryBuilder.mockReturnValue(mockQb);

      await service.getMovements(MovementType.WAREHOUSE_TO_OPERATOR);

      expect(mockQb.andWhere).toHaveBeenCalledWith('movement.movement_type = :movementType', {
        movementType: MovementType.WAREHOUSE_TO_OPERATOR,
      });
    });

    it('should filter by nomenclature', async () => {
      const mockQb = createMockQueryBuilder();
      movementRepository.createQueryBuilder.mockReturnValue(mockQb);

      await service.getMovements(undefined, mockNomenclatureId);

      expect(mockQb.andWhere).toHaveBeenCalledWith('movement.nomenclature_id = :nomenclatureId', {
        nomenclatureId: mockNomenclatureId,
      });
    });

    it('should filter by machine', async () => {
      const mockQb = createMockQueryBuilder();
      movementRepository.createQueryBuilder.mockReturnValue(mockQb);

      await service.getMovements(undefined, undefined, mockMachineId);

      expect(mockQb.andWhere).toHaveBeenCalledWith('movement.machine_id = :machineId', {
        machineId: mockMachineId,
      });
    });

    it('should filter by operator', async () => {
      const mockQb = createMockQueryBuilder();
      movementRepository.createQueryBuilder.mockReturnValue(mockQb);

      await service.getMovements(undefined, undefined, undefined, mockOperatorId);

      expect(mockQb.andWhere).toHaveBeenCalledWith('movement.operator_id = :operatorId', {
        operatorId: mockOperatorId,
      });
    });

    it('should filter by date range', async () => {
      const mockQb = createMockQueryBuilder();
      movementRepository.createQueryBuilder.mockReturnValue(mockQb);

      const dateFrom = new Date('2024-01-01');
      const dateTo = new Date('2024-01-31');

      await service.getMovements(undefined, undefined, undefined, undefined, dateFrom, dateTo);

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'movement.created_at BETWEEN :dateFrom AND :dateTo',
        { dateFrom, dateTo },
      );
    });

    it('should combine multiple filters', async () => {
      const mockQb = createMockQueryBuilder();
      movementRepository.createQueryBuilder.mockReturnValue(mockQb);

      await service.getMovements(
        MovementType.OPERATOR_TO_MACHINE,
        mockNomenclatureId,
        mockMachineId,
        mockOperatorId,
      );

      expect(mockQb.andWhere).toHaveBeenCalledTimes(4);
    });

    it('should join relations for nomenclature, performed_by, operator, and machine', async () => {
      const mockQb = createMockQueryBuilder();
      movementRepository.createQueryBuilder.mockReturnValue(mockQb);

      await service.getMovements();

      expect(mockQb.leftJoin).toHaveBeenCalledWith('movement.nomenclature', 'nomenclature');
      expect(mockQb.leftJoin).toHaveBeenCalledWith('movement.performed_by', 'performed_by');
      expect(mockQb.leftJoin).toHaveBeenCalledWith('movement.operator', 'operator');
      expect(mockQb.leftJoin).toHaveBeenCalledWith('movement.machine', 'machine');
    });
  });

  describe('getMovementStats', () => {
    it('should return total count and stats by type', async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.getCount.mockResolvedValue(100);
      mockQb.getRawMany.mockResolvedValue([
        { type: MovementType.WAREHOUSE_TO_OPERATOR, count: '40', total_quantity: '500' },
        { type: MovementType.OPERATOR_TO_MACHINE, count: '35', total_quantity: '400' },
        { type: MovementType.MACHINE_SALE, count: '25', total_quantity: '300' },
      ]);
      movementRepository.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.getMovementStats();

      expect(result.total).toBe(100);
      expect(result.by_type).toHaveLength(3);
      expect(result.by_type[0]).toEqual({
        type: MovementType.WAREHOUSE_TO_OPERATOR,
        count: 40,
        total_quantity: 500,
      });
    });

    it('should filter stats by date range when provided', async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.getCount.mockResolvedValue(50);
      mockQb.getRawMany.mockResolvedValue([]);
      movementRepository.createQueryBuilder.mockReturnValue(mockQb);

      const dateFrom = new Date('2024-01-01');
      const dateTo = new Date('2024-01-31');

      await service.getMovementStats(dateFrom, dateTo);

      expect(mockQb.where).toHaveBeenCalledWith(
        'movement.created_at BETWEEN :dateFrom AND :dateTo',
        { dateFrom, dateTo },
      );
    });

    it('should handle null total_quantity', async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.getCount.mockResolvedValue(10);
      mockQb.getRawMany.mockResolvedValue([
        { type: MovementType.ADJUSTMENT, count: '10', total_quantity: null },
      ]);
      movementRepository.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.getMovementStats();

      expect(result.by_type[0].total_quantity).toBe(0);
    });

    it('should return empty by_type array when no movements', async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.getCount.mockResolvedValue(0);
      mockQb.getRawMany.mockResolvedValue([]);
      movementRepository.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.getMovementStats();

      expect(result.total).toBe(0);
      expect(result.by_type).toEqual([]);
    });
  });
});
