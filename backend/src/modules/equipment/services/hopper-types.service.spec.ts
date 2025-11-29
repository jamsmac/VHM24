import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { HopperTypesService } from './hopper-types.service';
import { HopperType } from '../entities/hopper-type.entity';

describe('HopperTypesService', () => {
  let service: HopperTypesService;
  let mockRepository: any;

  beforeEach(async () => {
    mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HopperTypesService,
        {
          provide: getRepositoryToken(HopperType),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<HopperTypesService>(HopperTypesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new hopper type', async () => {
      const data = {
        code: 'COFFEE',
        name: 'Coffee Beans',
        name_en: 'Coffee Beans',
        description: 'Roasted coffee beans',
        category: 'beverages',
        requires_refrigeration: false,
        shelf_life_days: 90,
        typical_capacity_kg: 5,
        unit_of_measure: 'kg',
      };

      const mockHopperType = { id: 'ht-123', ...data };

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(mockHopperType);
      mockRepository.save.mockResolvedValue(mockHopperType);

      const result = await service.create(data);

      expect(result).toEqual(mockHopperType);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { code: 'COFFEE' },
      });
      expect(mockRepository.create).toHaveBeenCalledWith(data);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException when code already exists', async () => {
      const data = { code: 'COFFEE', name: 'Coffee' };
      mockRepository.findOne.mockResolvedValue({ id: 'existing', code: 'COFFEE' });

      await expect(service.create(data)).rejects.toThrow(BadRequestException);
      await expect(service.create(data)).rejects.toThrow(
        'Hopper type with code "COFFEE" already exists',
      );
    });

    it('should create hopper type with minimal data', async () => {
      const data = { code: 'SUGAR', name: 'Sugar' };
      const mockHopperType = { id: 'ht-456', ...data };

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(mockHopperType);
      mockRepository.save.mockResolvedValue(mockHopperType);

      const result = await service.create(data);

      expect(result).toEqual(mockHopperType);
    });
  });

  describe('findAll', () => {
    it('should return all hopper types ordered by name', async () => {
      const mockTypes = [
        { id: 'ht-1', code: 'COFFEE', name: 'Coffee', category: 'beverages' },
        { id: 'ht-2', code: 'SUGAR', name: 'Sugar', category: 'additives' },
      ];

      mockRepository.find.mockResolvedValue(mockTypes);

      const result = await service.findAll();

      expect(result).toEqual(mockTypes);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: {},
        order: { name: 'ASC' },
      });
    });

    it('should filter by category when provided', async () => {
      const mockTypes = [{ id: 'ht-1', code: 'COFFEE', category: 'beverages' }];

      mockRepository.find.mockResolvedValue(mockTypes);

      const result = await service.findAll('beverages');

      expect(result).toEqual(mockTypes);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { category: 'beverages' },
        order: { name: 'ASC' },
      });
    });

    it('should return empty array when no types exist', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a hopper type by id', async () => {
      const mockType = { id: 'ht-123', code: 'COFFEE', name: 'Coffee' };

      mockRepository.findOne.mockResolvedValue(mockType);

      const result = await service.findOne('ht-123');

      expect(result).toEqual(mockType);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'ht-123' },
      });
    });

    it('should throw NotFoundException when not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('nonexistent')).rejects.toThrow(
        'Hopper type with ID nonexistent not found',
      );
    });
  });

  describe('findByCode', () => {
    it('should return a hopper type by code', async () => {
      const mockType = { id: 'ht-123', code: 'COFFEE', name: 'Coffee' };

      mockRepository.findOne.mockResolvedValue(mockType);

      const result = await service.findByCode('COFFEE');

      expect(result).toEqual(mockType);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { code: 'COFFEE' },
      });
    });

    it('should throw NotFoundException when code not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findByCode('INVALID')).rejects.toThrow(NotFoundException);
      await expect(service.findByCode('INVALID')).rejects.toThrow(
        'Hopper type with code "INVALID" not found',
      );
    });
  });

  describe('update', () => {
    it('should update a hopper type', async () => {
      const existingType = { id: 'ht-123', code: 'COFFEE', name: 'Coffee' };
      const updateData = { name: 'Coffee Beans', description: 'Updated description' };
      const updatedType = { ...existingType, ...updateData };

      mockRepository.findOne.mockResolvedValueOnce(existingType);
      mockRepository.update.mockResolvedValue({ affected: 1 });
      mockRepository.findOne.mockResolvedValueOnce(updatedType);

      const result = await service.update('ht-123', updateData);

      expect(result).toEqual(updatedType);
      expect(mockRepository.update).toHaveBeenCalledWith('ht-123', updateData);
    });

    it('should throw NotFoundException when updating non-existent type', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.update('nonexistent', { name: 'New Name' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should allow partial updates', async () => {
      const existingType = { id: 'ht-123', code: 'COFFEE', name: 'Coffee' };
      mockRepository.findOne.mockResolvedValue(existingType);
      mockRepository.update.mockResolvedValue({ affected: 1 });

      await service.update('ht-123', { shelf_life_days: 120 });

      expect(mockRepository.update).toHaveBeenCalledWith('ht-123', { shelf_life_days: 120 });
    });
  });

  describe('remove', () => {
    it('should soft delete a hopper type', async () => {
      const existingType = { id: 'ht-123', code: 'COFFEE', name: 'Coffee' };

      mockRepository.findOne.mockResolvedValue(existingType);
      mockRepository.softDelete.mockResolvedValue({ affected: 1 });

      await service.remove('ht-123');

      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: 'ht-123' } });
      expect(mockRepository.softDelete).toHaveBeenCalledWith('ht-123');
    });

    it('should throw NotFoundException when deleting non-existent type', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getCategories', () => {
    it('should return unique categories', async () => {
      const mockCategories = [{ category: 'beverages' }, { category: 'additives' }];

      const qb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(mockCategories),
      };
      mockRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getCategories();

      expect(result).toEqual(['beverages', 'additives']);
    });

    it('should return empty array when no categories exist', async () => {
      const qb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };
      mockRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getCategories();

      expect(result).toEqual([]);
    });
  });
});
