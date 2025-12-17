import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OperatorInventoryService } from './operator-inventory.service';
import { OperatorInventory } from '../entities/operator-inventory.entity';

describe('OperatorInventoryService', () => {
  let service: OperatorInventoryService;
  let operatorInventoryRepository: jest.Mocked<Repository<OperatorInventory>>;

  const mockOperatorId = 'operator-123';
  const mockNomenclatureId = 'nom-456';

  const createMockInventory = (overrides: Partial<OperatorInventory> = {}): OperatorInventory =>
    ({
      id: 'inv-1',
      operator_id: mockOperatorId,
      nomenclature_id: mockNomenclatureId,
      current_quantity: 50,
      reserved_quantity: 0,
      last_received_at: new Date(),
      ...overrides,
    }) as OperatorInventory;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OperatorInventoryService,
        {
          provide: getRepositoryToken(OperatorInventory),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn().mockImplementation((data) => ({ ...data })),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<OperatorInventoryService>(OperatorInventoryService);
    operatorInventoryRepository = module.get(getRepositoryToken(OperatorInventory));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getOperatorInventory', () => {
    it('should return all inventory for an operator ordered by nomenclature name', async () => {
      const mockInventories = [
        createMockInventory({ nomenclature_id: 'nom-1' }),
        createMockInventory({ id: 'inv-2', nomenclature_id: 'nom-2' }),
      ];

      operatorInventoryRepository.find.mockResolvedValue(mockInventories);

      const result = await service.getOperatorInventory(mockOperatorId);

      expect(result).toEqual(mockInventories);
      expect(operatorInventoryRepository.find).toHaveBeenCalledWith({
        where: { operator_id: mockOperatorId },
        order: { nomenclature: { name: 'ASC' } },
      });
    });

    it('should return empty array if operator has no inventory', async () => {
      operatorInventoryRepository.find.mockResolvedValue([]);

      const result = await service.getOperatorInventory(mockOperatorId);

      expect(result).toEqual([]);
    });
  });

  describe('getOperatorInventoryByNomenclature', () => {
    it('should return existing inventory for operator and nomenclature', async () => {
      const mockInventory = createMockInventory();
      operatorInventoryRepository.findOne.mockResolvedValue(mockInventory);

      const result = await service.getOperatorInventoryByNomenclature(
        mockOperatorId,
        mockNomenclatureId,
      );

      expect(result).toEqual(mockInventory);
      expect(operatorInventoryRepository.findOne).toHaveBeenCalledWith({
        where: {
          operator_id: mockOperatorId,
          nomenclature_id: mockNomenclatureId,
        },
      });
    });

    it('should create new inventory with zero quantity if not exists', async () => {
      const newInventory = createMockInventory({ current_quantity: 0 });
      operatorInventoryRepository.findOne.mockResolvedValue(null);
      operatorInventoryRepository.create.mockReturnValue(newInventory);
      operatorInventoryRepository.save.mockResolvedValue(newInventory);

      const result = await service.getOperatorInventoryByNomenclature(
        mockOperatorId,
        mockNomenclatureId,
      );

      expect(operatorInventoryRepository.create).toHaveBeenCalledWith({
        operator_id: mockOperatorId,
        nomenclature_id: mockNomenclatureId,
        current_quantity: 0,
      });
      expect(operatorInventoryRepository.save).toHaveBeenCalled();
      expect(result).toEqual(newInventory);
    });

    it('should save the new inventory record to database', async () => {
      const createdInventory = {
        operator_id: mockOperatorId,
        nomenclature_id: mockNomenclatureId,
        current_quantity: 0,
      };
      const savedInventory = { ...createdInventory, id: 'new-inv-id' };

      operatorInventoryRepository.findOne.mockResolvedValue(null);
      operatorInventoryRepository.create.mockReturnValue(createdInventory as OperatorInventory);
      operatorInventoryRepository.save.mockResolvedValue(savedInventory as OperatorInventory);

      const result = await service.getOperatorInventoryByNomenclature(
        mockOperatorId,
        mockNomenclatureId,
      );

      expect(operatorInventoryRepository.save).toHaveBeenCalledWith(createdInventory);
      expect(result.id).toBe('new-inv-id');
    });

    it('should not create new record if inventory exists', async () => {
      const existingInventory = createMockInventory({ current_quantity: 100 });
      operatorInventoryRepository.findOne.mockResolvedValue(existingInventory);

      await service.getOperatorInventoryByNomenclature(mockOperatorId, mockNomenclatureId);

      expect(operatorInventoryRepository.create).not.toHaveBeenCalled();
      expect(operatorInventoryRepository.save).not.toHaveBeenCalled();
    });
  });
});
