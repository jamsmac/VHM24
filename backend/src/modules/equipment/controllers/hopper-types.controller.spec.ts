import { Test, TestingModule } from '@nestjs/testing';
import { HopperTypesController } from './hopper-types.controller';
import { HopperTypesService } from '../services/hopper-types.service';
import { HopperType } from '../entities/hopper-type.entity';
import { CreateHopperTypeDto, UpdateHopperTypeDto } from '../dto/hopper-type.dto';

describe('HopperTypesController', () => {
  let controller: HopperTypesController;
  let mockHopperTypesService: jest.Mocked<HopperTypesService>;

  const mockHopperType: Partial<HopperType> = {
    id: 'hopper-type-123',
    code: 'milk_powder',
    name: 'Milk Powder',
    name_en: 'Milk Powder',
    description: 'Powdered milk for coffee machines',
    category: 'dairy',
    requires_refrigeration: false,
    shelf_life_days: 180,
    typical_capacity_kg: 2.5,
    unit_of_measure: 'kg',
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    mockHopperTypesService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      findByCode: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      getCategories: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HopperTypesController],
      providers: [
        {
          provide: HopperTypesService,
          useValue: mockHopperTypesService,
        },
      ],
    }).compile();

    controller = module.get<HopperTypesController>(HopperTypesController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new hopper type', async () => {
      const dto: CreateHopperTypeDto = {
        code: 'milk_powder',
        name: 'Milk Powder',
        category: 'dairy',
      };

      mockHopperTypesService.create.mockResolvedValue(mockHopperType as HopperType);

      const result = await controller.create(dto);

      expect(result).toEqual(mockHopperType);
      expect(mockHopperTypesService.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('should return all hopper types without filter', async () => {
      const hopperTypes = [
        mockHopperType,
        { ...mockHopperType, id: 'hopper-type-456', code: 'sugar' },
      ];
      mockHopperTypesService.findAll.mockResolvedValue(hopperTypes as HopperType[]);

      const result = await controller.findAll();

      expect(result).toEqual(hopperTypes);
      expect(mockHopperTypesService.findAll).toHaveBeenCalledWith(undefined);
    });

    it('should return hopper types filtered by category', async () => {
      const dairyTypes = [mockHopperType];
      mockHopperTypesService.findAll.mockResolvedValue(dairyTypes as HopperType[]);

      const result = await controller.findAll('dairy');

      expect(result).toEqual(dairyTypes);
      expect(mockHopperTypesService.findAll).toHaveBeenCalledWith('dairy');
    });
  });

  describe('getCategories', () => {
    it('should return list of unique categories', async () => {
      const categories = ['dairy', 'coffee', 'tea', 'chocolate'];
      mockHopperTypesService.getCategories.mockResolvedValue(categories);

      const result = await controller.getCategories();

      expect(result).toEqual(categories);
      expect(mockHopperTypesService.getCategories).toHaveBeenCalled();
    });

    it('should return empty array when no categories exist', async () => {
      mockHopperTypesService.getCategories.mockResolvedValue([]);

      const result = await controller.getCategories();

      expect(result).toEqual([]);
    });
  });

  describe('findByCode', () => {
    it('should return hopper type by code', async () => {
      mockHopperTypesService.findByCode.mockResolvedValue(mockHopperType as HopperType);

      const result = await controller.findByCode('milk_powder');

      expect(result).toEqual(mockHopperType);
      expect(mockHopperTypesService.findByCode).toHaveBeenCalledWith('milk_powder');
    });
  });

  describe('findOne', () => {
    it('should return hopper type by id', async () => {
      mockHopperTypesService.findOne.mockResolvedValue(mockHopperType as HopperType);

      const result = await controller.findOne('hopper-type-123');

      expect(result).toEqual(mockHopperType);
      expect(mockHopperTypesService.findOne).toHaveBeenCalledWith('hopper-type-123');
    });
  });

  describe('update', () => {
    it('should update hopper type', async () => {
      const dto: UpdateHopperTypeDto = {
        name: 'Updated Milk Powder',
        shelf_life_days: 200,
      };
      const updatedHopperType = { ...mockHopperType, ...dto };
      mockHopperTypesService.update.mockResolvedValue(updatedHopperType as HopperType);

      const result = await controller.update('hopper-type-123', dto);

      expect(result).toEqual(updatedHopperType);
      expect(mockHopperTypesService.update).toHaveBeenCalledWith('hopper-type-123', dto);
    });
  });

  describe('remove', () => {
    it('should soft delete hopper type', async () => {
      mockHopperTypesService.remove.mockResolvedValue(undefined);

      await controller.remove('hopper-type-123');

      expect(mockHopperTypesService.remove).toHaveBeenCalledWith('hopper-type-123');
    });
  });
});
