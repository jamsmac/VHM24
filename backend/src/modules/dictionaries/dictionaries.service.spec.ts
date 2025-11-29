import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { DictionariesService } from './dictionaries.service';
import { Dictionary } from './entities/dictionary.entity';
import { DictionaryItem } from './entities/dictionary-item.entity';
import { CreateDictionaryDto } from './dto/create-dictionary.dto';
import { UpdateDictionaryDto } from './dto/update-dictionary.dto';
import { CreateDictionaryItemDto } from './dto/create-dictionary-item.dto';
import { UpdateDictionaryItemDto } from './dto/update-dictionary-item.dto';

describe('DictionariesService', () => {
  let service: DictionariesService;
  let mockDictionaryRepository: jest.Mocked<Repository<Dictionary>>;
  let mockDictionaryItemRepository: jest.Mocked<Repository<DictionaryItem>>;

  // Test fixtures
  const mockDictionary: Dictionary = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    code: 'machine_types',
    name_ru: 'Типы аппаратов',
    name_en: 'Machine Types',
    description: 'Справочник типов вендинговых автоматов',
    is_system: false,
    is_active: true,
    sort_order: 0,
    items: [],
    created_at: new Date('2025-01-01'),
    updated_at: new Date('2025-01-01'),
    deleted_at: null,
    created_by_id: null,
    updated_by_id: null,
  };

  const mockSystemDictionary: Dictionary = {
    ...mockDictionary,
    id: '223e4567-e89b-12d3-a456-426614174000',
    code: 'task_statuses',
    name_ru: 'Статусы задач',
    is_system: true,
  };

  const mockDictionaryItem: DictionaryItem = {
    id: '323e4567-e89b-12d3-a456-426614174000',
    dictionary_id: mockDictionary.id,
    dictionary: mockDictionary,
    code: 'coffee_machine',
    value_ru: 'Кофейный автомат',
    value_en: 'Coffee Machine',
    description: 'Автомат для приготовления кофе',
    is_active: true,
    sort_order: 0,
    metadata: { color: '#FF0000' },
    created_at: new Date('2025-01-01'),
    updated_at: new Date('2025-01-01'),
    deleted_at: null,
    created_by_id: null,
    updated_by_id: null,
  };

  const mockSystemDictionaryItem: DictionaryItem = {
    ...mockDictionaryItem,
    id: '423e4567-e89b-12d3-a456-426614174000',
    dictionary_id: mockSystemDictionary.id,
    dictionary: mockSystemDictionary,
    code: 'pending',
    value_ru: 'Ожидает',
  };

  // Helper to create mock query builder
  const createMockQueryBuilder = (): Partial<SelectQueryBuilder<any>> => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
    getMany: jest.fn(),
  });

  beforeEach(async () => {
    mockDictionaryRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      softRemove: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as any;

    mockDictionaryItemRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      softRemove: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DictionariesService,
        {
          provide: getRepositoryToken(Dictionary),
          useValue: mockDictionaryRepository,
        },
        {
          provide: getRepositoryToken(DictionaryItem),
          useValue: mockDictionaryItemRepository,
        },
      ],
    }).compile();

    service = module.get<DictionariesService>(DictionariesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==================== DICTIONARIES ====================

  describe('createDictionary', () => {
    it('should create a dictionary successfully', async () => {
      // Arrange
      const createDto: CreateDictionaryDto = {
        code: 'new_dictionary',
        name_ru: 'Новый справочник',
        name_en: 'New Dictionary',
        description: 'Test description',
        is_system: false,
        is_active: true,
        sort_order: 1,
      };

      mockDictionaryRepository.findOne.mockResolvedValue(null);
      mockDictionaryRepository.create.mockReturnValue({ ...createDto } as any);
      mockDictionaryRepository.save.mockResolvedValue({
        id: 'new-id',
        ...createDto,
      } as any);

      // Act
      const result = await service.createDictionary(createDto);

      // Assert
      expect(mockDictionaryRepository.findOne).toHaveBeenCalledWith({
        where: { code: createDto.code },
      });
      expect(mockDictionaryRepository.create).toHaveBeenCalledWith(createDto);
      expect(mockDictionaryRepository.save).toHaveBeenCalled();
      expect(result.code).toBe(createDto.code);
    });

    it('should throw ConflictException when code already exists', async () => {
      // Arrange
      const createDto: CreateDictionaryDto = {
        code: 'machine_types',
        name_ru: 'Дубликат',
      };

      mockDictionaryRepository.findOne.mockResolvedValue(mockDictionary);

      // Act & Assert
      await expect(service.createDictionary(createDto)).rejects.toThrow(ConflictException);
      await expect(service.createDictionary(createDto)).rejects.toThrow(
        'Справочник с кодом machine_types уже существует',
      );
    });

    it('should create dictionary with minimal required fields', async () => {
      // Arrange
      const createDto: CreateDictionaryDto = {
        code: 'minimal',
        name_ru: 'Минимальный',
      };

      mockDictionaryRepository.findOne.mockResolvedValue(null);
      mockDictionaryRepository.create.mockReturnValue({ ...createDto } as any);
      mockDictionaryRepository.save.mockResolvedValue({
        id: 'new-id',
        ...createDto,
      } as any);

      // Act
      const result = await service.createDictionary(createDto);

      // Assert
      expect(result.code).toBe('minimal');
      expect(mockDictionaryRepository.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('findAllDictionaries', () => {
    it('should return all dictionaries without items', async () => {
      // Arrange
      const mockQueryBuilder = createMockQueryBuilder();
      (mockQueryBuilder.getMany as jest.Mock).mockResolvedValue([mockDictionary]);
      mockDictionaryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      // Act
      const result = await service.findAllDictionaries(false);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockDictionary);
      expect(mockQueryBuilder.leftJoinAndSelect).not.toHaveBeenCalled();
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('dictionary.sort_order', 'ASC');
    });

    it('should return all dictionaries with items', async () => {
      // Arrange
      const dictionaryWithItems = {
        ...mockDictionary,
        items: [mockDictionaryItem],
      };
      const mockQueryBuilder = createMockQueryBuilder();
      (mockQueryBuilder.getMany as jest.Mock).mockResolvedValue([dictionaryWithItems]);
      mockDictionaryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      // Act
      const result = await service.findAllDictionaries(true);

      // Assert
      expect(result).toHaveLength(1);
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('dictionary.items', 'items');
      expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith('items.sort_order', 'ASC');
    });

    it('should return empty array when no dictionaries exist', async () => {
      // Arrange
      const mockQueryBuilder = createMockQueryBuilder();
      (mockQueryBuilder.getMany as jest.Mock).mockResolvedValue([]);
      mockDictionaryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      // Act
      const result = await service.findAllDictionaries();

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('findOneDictionary', () => {
    it('should return dictionary by ID with items', async () => {
      // Arrange
      const dictionaryWithItems = {
        ...mockDictionary,
        items: [mockDictionaryItem],
      };
      const mockQueryBuilder = createMockQueryBuilder();
      (mockQueryBuilder.getOne as jest.Mock).mockResolvedValue(dictionaryWithItems);
      mockDictionaryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      // Act
      const result = await service.findOneDictionary(mockDictionary.id, true);

      // Assert
      expect(result).toEqual(dictionaryWithItems);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('dictionary.id = :id', {
        id: mockDictionary.id,
      });
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('dictionary.items', 'items');
    });

    it('should return dictionary by ID without items', async () => {
      // Arrange
      const mockQueryBuilder = createMockQueryBuilder();
      (mockQueryBuilder.getOne as jest.Mock).mockResolvedValue(mockDictionary);
      mockDictionaryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      // Act
      const result = await service.findOneDictionary(mockDictionary.id, false);

      // Assert
      expect(result).toEqual(mockDictionary);
      expect(mockQueryBuilder.leftJoinAndSelect).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when dictionary not found', async () => {
      // Arrange
      const mockQueryBuilder = createMockQueryBuilder();
      (mockQueryBuilder.getOne as jest.Mock).mockResolvedValue(null);
      mockDictionaryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      // Act & Assert
      await expect(service.findOneDictionary('non-existent-id')).rejects.toThrow(NotFoundException);
      await expect(service.findOneDictionary('non-existent-id')).rejects.toThrow(
        'Справочник с ID non-existent-id не найден',
      );
    });
  });

  describe('findByCode', () => {
    it('should return dictionary by code with items', async () => {
      // Arrange
      const dictionaryWithItems = {
        ...mockDictionary,
        items: [mockDictionaryItem],
      };
      const mockQueryBuilder = createMockQueryBuilder();
      (mockQueryBuilder.getOne as jest.Mock).mockResolvedValue(dictionaryWithItems);
      mockDictionaryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      // Act
      const result = await service.findByCode('machine_types', true);

      // Assert
      expect(result).toEqual(dictionaryWithItems);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('dictionary.code = :code', {
        code: 'machine_types',
      });
    });

    it('should return dictionary by code without items', async () => {
      // Arrange
      const mockQueryBuilder = createMockQueryBuilder();
      (mockQueryBuilder.getOne as jest.Mock).mockResolvedValue(mockDictionary);
      mockDictionaryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      // Act
      const result = await service.findByCode('machine_types', false);

      // Assert
      expect(result).toEqual(mockDictionary);
      expect(mockQueryBuilder.leftJoinAndSelect).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when code not found', async () => {
      // Arrange
      const mockQueryBuilder = createMockQueryBuilder();
      (mockQueryBuilder.getOne as jest.Mock).mockResolvedValue(null);
      mockDictionaryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      // Act & Assert
      await expect(service.findByCode('non_existent_code')).rejects.toThrow(NotFoundException);
      await expect(service.findByCode('non_existent_code')).rejects.toThrow(
        'Справочник с кодом non_existent_code не найден',
      );
    });
  });

  describe('updateDictionary', () => {
    it('should update dictionary successfully', async () => {
      // Arrange
      const updateDto: UpdateDictionaryDto = {
        name_ru: 'Обновленное название',
        description: 'Обновленное описание',
      };

      const mockQueryBuilder = createMockQueryBuilder();
      (mockQueryBuilder.getOne as jest.Mock).mockResolvedValue({ ...mockDictionary });
      mockDictionaryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
      mockDictionaryRepository.save.mockResolvedValue({
        ...mockDictionary,
        ...updateDto,
      } as any);

      // Act
      const result = await service.updateDictionary(mockDictionary.id, updateDto);

      // Assert
      expect(result.name_ru).toBe(updateDto.name_ru);
      expect(result.description).toBe(updateDto.description);
      expect(mockDictionaryRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException when trying to change system status', async () => {
      // Arrange
      const updateDto: UpdateDictionaryDto = {
        is_system: false,
      };

      const mockQueryBuilder = createMockQueryBuilder();
      (mockQueryBuilder.getOne as jest.Mock).mockResolvedValue({ ...mockSystemDictionary });
      mockDictionaryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      // Act & Assert
      await expect(service.updateDictionary(mockSystemDictionary.id, updateDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.updateDictionary(mockSystemDictionary.id, updateDto)).rejects.toThrow(
        'Невозможно изменить статус системного справочника',
      );
    });

    it('should allow updating non-system dictionary to system', async () => {
      // Arrange
      const updateDto: UpdateDictionaryDto = {
        is_system: true,
      };

      const mockQueryBuilder = createMockQueryBuilder();
      (mockQueryBuilder.getOne as jest.Mock).mockResolvedValue({ ...mockDictionary });
      mockDictionaryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
      mockDictionaryRepository.save.mockResolvedValue({
        ...mockDictionary,
        is_system: true,
      } as any);

      // Act
      const result = await service.updateDictionary(mockDictionary.id, updateDto);

      // Assert
      expect(result.is_system).toBe(true);
    });

    it('should throw NotFoundException when dictionary not found', async () => {
      // Arrange
      const mockQueryBuilder = createMockQueryBuilder();
      (mockQueryBuilder.getOne as jest.Mock).mockResolvedValue(null);
      mockDictionaryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      // Act & Assert
      await expect(service.updateDictionary('non-existent-id', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should update dictionary sort_order', async () => {
      // Arrange
      const updateDto: UpdateDictionaryDto = {
        sort_order: 10,
      };

      const mockQueryBuilder = createMockQueryBuilder();
      (mockQueryBuilder.getOne as jest.Mock).mockResolvedValue({ ...mockDictionary });
      mockDictionaryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
      mockDictionaryRepository.save.mockResolvedValue({
        ...mockDictionary,
        sort_order: 10,
      } as any);

      // Act
      const result = await service.updateDictionary(mockDictionary.id, updateDto);

      // Assert
      expect(result.sort_order).toBe(10);
    });
  });

  describe('removeDictionary', () => {
    it('should soft delete non-system dictionary', async () => {
      // Arrange
      const mockQueryBuilder = createMockQueryBuilder();
      (mockQueryBuilder.getOne as jest.Mock).mockResolvedValue({ ...mockDictionary });
      mockDictionaryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
      mockDictionaryRepository.softRemove.mockResolvedValue(mockDictionary as any);

      // Act
      await service.removeDictionary(mockDictionary.id);

      // Assert
      expect(mockDictionaryRepository.softRemove).toHaveBeenCalledWith(
        expect.objectContaining({ id: mockDictionary.id }),
      );
    });

    it('should throw BadRequestException when trying to delete system dictionary', async () => {
      // Arrange
      const mockQueryBuilder = createMockQueryBuilder();
      (mockQueryBuilder.getOne as jest.Mock).mockResolvedValue({ ...mockSystemDictionary });
      mockDictionaryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      // Act & Assert
      await expect(service.removeDictionary(mockSystemDictionary.id)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.removeDictionary(mockSystemDictionary.id)).rejects.toThrow(
        'Невозможно удалить системный справочник',
      );
    });

    it('should throw NotFoundException when dictionary not found', async () => {
      // Arrange
      const mockQueryBuilder = createMockQueryBuilder();
      (mockQueryBuilder.getOne as jest.Mock).mockResolvedValue(null);
      mockDictionaryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      // Act & Assert
      await expect(service.removeDictionary('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ==================== DICTIONARY ITEMS ====================

  describe('createDictionaryItem', () => {
    it('should create dictionary item successfully', async () => {
      // Arrange
      const createDto: CreateDictionaryItemDto = {
        code: 'new_item',
        value_ru: 'Новый элемент',
        value_en: 'New Item',
        description: 'Description',
        is_active: true,
        sort_order: 1,
        metadata: { icon: 'test' },
      };

      const mockQueryBuilder = createMockQueryBuilder();
      (mockQueryBuilder.getOne as jest.Mock).mockResolvedValue(mockDictionary);
      mockDictionaryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      mockDictionaryItemRepository.findOne.mockResolvedValue(null);
      mockDictionaryItemRepository.create.mockReturnValue({
        ...createDto,
        dictionary_id: mockDictionary.id,
      } as any);
      mockDictionaryItemRepository.save.mockResolvedValue({
        id: 'new-item-id',
        ...createDto,
        dictionary_id: mockDictionary.id,
      } as any);

      // Act
      const result = await service.createDictionaryItem(mockDictionary.id, createDto);

      // Assert
      expect(mockDictionaryItemRepository.create).toHaveBeenCalledWith({
        ...createDto,
        dictionary_id: mockDictionary.id,
      });
      expect(mockDictionaryItemRepository.save).toHaveBeenCalled();
      expect(result.code).toBe(createDto.code);
    });

    it('should throw ConflictException when item code already exists in dictionary', async () => {
      // Arrange
      const createDto: CreateDictionaryItemDto = {
        code: 'coffee_machine',
        value_ru: 'Дубликат',
      };

      const mockQueryBuilder = createMockQueryBuilder();
      (mockQueryBuilder.getOne as jest.Mock).mockResolvedValue(mockDictionary);
      mockDictionaryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      mockDictionaryItemRepository.findOne.mockResolvedValue(mockDictionaryItem);

      // Act & Assert
      await expect(service.createDictionaryItem(mockDictionary.id, createDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.createDictionaryItem(mockDictionary.id, createDto)).rejects.toThrow(
        'Элемент с кодом coffee_machine уже существует в этом справочнике',
      );
    });

    it('should throw NotFoundException when dictionary not found', async () => {
      // Arrange
      const createDto: CreateDictionaryItemDto = {
        code: 'new_item',
        value_ru: 'Новый элемент',
      };

      const mockQueryBuilder = createMockQueryBuilder();
      (mockQueryBuilder.getOne as jest.Mock).mockResolvedValue(null);
      mockDictionaryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      // Act & Assert
      await expect(service.createDictionaryItem('non-existent-id', createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should create item with minimal required fields', async () => {
      // Arrange
      const createDto: CreateDictionaryItemDto = {
        code: 'minimal_item',
        value_ru: 'Минимальный элемент',
      };

      const mockQueryBuilder = createMockQueryBuilder();
      (mockQueryBuilder.getOne as jest.Mock).mockResolvedValue(mockDictionary);
      mockDictionaryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      mockDictionaryItemRepository.findOne.mockResolvedValue(null);
      mockDictionaryItemRepository.create.mockReturnValue({
        ...createDto,
        dictionary_id: mockDictionary.id,
      } as any);
      mockDictionaryItemRepository.save.mockResolvedValue({
        id: 'new-id',
        ...createDto,
        dictionary_id: mockDictionary.id,
      } as any);

      // Act
      const result = await service.createDictionaryItem(mockDictionary.id, createDto);

      // Assert
      expect(result.code).toBe('minimal_item');
    });
  });

  describe('findAllDictionaryItems', () => {
    it('should return all items for a dictionary', async () => {
      // Arrange
      const mockQueryBuilder = createMockQueryBuilder();
      (mockQueryBuilder.getOne as jest.Mock).mockResolvedValue(mockDictionary);
      mockDictionaryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      mockDictionaryItemRepository.find.mockResolvedValue([mockDictionaryItem]);

      // Act
      const result = await service.findAllDictionaryItems(mockDictionary.id);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockDictionaryItem);
      expect(mockDictionaryItemRepository.find).toHaveBeenCalledWith({
        where: { dictionary_id: mockDictionary.id },
        order: { sort_order: 'ASC' },
      });
    });

    it('should return empty array when no items exist', async () => {
      // Arrange
      const mockQueryBuilder = createMockQueryBuilder();
      (mockQueryBuilder.getOne as jest.Mock).mockResolvedValue(mockDictionary);
      mockDictionaryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      mockDictionaryItemRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.findAllDictionaryItems(mockDictionary.id);

      // Assert
      expect(result).toEqual([]);
    });

    it('should throw NotFoundException when dictionary not found', async () => {
      // Arrange
      const mockQueryBuilder = createMockQueryBuilder();
      (mockQueryBuilder.getOne as jest.Mock).mockResolvedValue(null);
      mockDictionaryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      // Act & Assert
      await expect(service.findAllDictionaryItems('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findOneDictionaryItem', () => {
    it('should return dictionary item by ID', async () => {
      // Arrange
      mockDictionaryItemRepository.findOne.mockResolvedValue(mockDictionaryItem);

      // Act
      const result = await service.findOneDictionaryItem(mockDictionaryItem.id);

      // Assert
      expect(result).toEqual(mockDictionaryItem);
      expect(mockDictionaryItemRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockDictionaryItem.id },
        relations: ['dictionary'],
      });
    });

    it('should throw NotFoundException when item not found', async () => {
      // Arrange
      mockDictionaryItemRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOneDictionaryItem('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOneDictionaryItem('non-existent-id')).rejects.toThrow(
        'Элемент справочника с ID non-existent-id не найден',
      );
    });
  });

  describe('updateDictionaryItem', () => {
    it('should update dictionary item successfully', async () => {
      // Arrange
      const updateDto: UpdateDictionaryItemDto = {
        value_ru: 'Обновленное значение',
        description: 'Обновленное описание',
      };

      mockDictionaryItemRepository.findOne.mockResolvedValue({
        ...mockDictionaryItem,
      });
      mockDictionaryItemRepository.save.mockResolvedValue({
        ...mockDictionaryItem,
        ...updateDto,
      } as any);

      // Act
      const result = await service.updateDictionaryItem(mockDictionaryItem.id, updateDto);

      // Assert
      expect(result.value_ru).toBe(updateDto.value_ru);
      expect(result.description).toBe(updateDto.description);
      expect(mockDictionaryItemRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException when trying to update system dictionary item', async () => {
      // Arrange
      const updateDto: UpdateDictionaryItemDto = {
        value_ru: 'Новое значение',
      };

      mockDictionaryItemRepository.findOne.mockResolvedValue({
        ...mockSystemDictionaryItem,
      });

      // Act & Assert
      await expect(
        service.updateDictionaryItem(mockSystemDictionaryItem.id, updateDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.updateDictionaryItem(mockSystemDictionaryItem.id, updateDto),
      ).rejects.toThrow('Невозможно изменить элемент системного справочника');
    });

    it('should throw NotFoundException when item not found', async () => {
      // Arrange
      mockDictionaryItemRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.updateDictionaryItem('non-existent-id', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should update item metadata', async () => {
      // Arrange
      const updateDto: UpdateDictionaryItemDto = {
        metadata: { icon: 'new-icon', color: '#00FF00' },
      };

      mockDictionaryItemRepository.findOne.mockResolvedValue({
        ...mockDictionaryItem,
      });
      mockDictionaryItemRepository.save.mockResolvedValue({
        ...mockDictionaryItem,
        metadata: updateDto.metadata,
      } as any);

      // Act
      const result = await service.updateDictionaryItem(mockDictionaryItem.id, updateDto);

      // Assert
      expect(result.metadata).toEqual(updateDto.metadata);
    });

    it('should allow update when dictionary relation is null', async () => {
      // Arrange
      const itemWithoutDictionary = {
        ...mockDictionaryItem,
        dictionary: undefined as any,
      };
      const updateDto: UpdateDictionaryItemDto = {
        value_ru: 'Обновлено',
      };

      mockDictionaryItemRepository.findOne.mockResolvedValue(itemWithoutDictionary);
      mockDictionaryItemRepository.save.mockResolvedValue({
        ...itemWithoutDictionary,
        ...updateDto,
      } as any);

      // Act
      const result = await service.updateDictionaryItem(mockDictionaryItem.id, updateDto);

      // Assert
      expect(result.value_ru).toBe(updateDto.value_ru);
    });
  });

  describe('removeDictionaryItem', () => {
    it('should soft delete non-system dictionary item', async () => {
      // Arrange
      mockDictionaryItemRepository.findOne.mockResolvedValue({
        ...mockDictionaryItem,
      });
      mockDictionaryItemRepository.softRemove.mockResolvedValue(mockDictionaryItem as any);

      // Act
      await service.removeDictionaryItem(mockDictionaryItem.id);

      // Assert
      expect(mockDictionaryItemRepository.softRemove).toHaveBeenCalledWith(
        expect.objectContaining({ id: mockDictionaryItem.id }),
      );
    });

    it('should throw BadRequestException when trying to delete system dictionary item', async () => {
      // Arrange
      mockDictionaryItemRepository.findOne.mockResolvedValue({
        ...mockSystemDictionaryItem,
      });

      // Act & Assert
      await expect(service.removeDictionaryItem(mockSystemDictionaryItem.id)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.removeDictionaryItem(mockSystemDictionaryItem.id)).rejects.toThrow(
        'Невозможно удалить элемент системного справочника',
      );
    });

    it('should throw NotFoundException when item not found', async () => {
      // Arrange
      mockDictionaryItemRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.removeDictionaryItem('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should allow delete when dictionary relation is null', async () => {
      // Arrange
      const itemWithoutDictionary = {
        ...mockDictionaryItem,
        dictionary: undefined as any,
      };

      mockDictionaryItemRepository.findOne.mockResolvedValue(itemWithoutDictionary);
      mockDictionaryItemRepository.softRemove.mockResolvedValue(itemWithoutDictionary as any);

      // Act
      await service.removeDictionaryItem(mockDictionaryItem.id);

      // Assert
      expect(mockDictionaryItemRepository.softRemove).toHaveBeenCalled();
    });
  });

  // ==================== EDGE CASES ====================

  describe('edge cases', () => {
    it('should handle special characters in dictionary code', async () => {
      // Arrange
      const createDto: CreateDictionaryDto = {
        code: 'special_code_123',
        name_ru: 'Справочник с цифрами',
      };

      mockDictionaryRepository.findOne.mockResolvedValue(null);
      mockDictionaryRepository.create.mockReturnValue({ ...createDto } as any);
      mockDictionaryRepository.save.mockResolvedValue({
        id: 'new-id',
        ...createDto,
      } as any);

      // Act
      const result = await service.createDictionary(createDto);

      // Assert
      expect(result.code).toBe('special_code_123');
    });

    it('should handle unicode characters in dictionary names', async () => {
      // Arrange
      const createDto: CreateDictionaryDto = {
        code: 'unicode_test',
        name_ru: 'Тест юникода',
        name_en: 'Unicode test',
      };

      mockDictionaryRepository.findOne.mockResolvedValue(null);
      mockDictionaryRepository.create.mockReturnValue({ ...createDto } as any);
      mockDictionaryRepository.save.mockResolvedValue({
        id: 'new-id',
        ...createDto,
      } as any);

      // Act
      const result = await service.createDictionary(createDto);

      // Assert
      expect(result.name_ru).toBe('Тест юникода');
    });

    it('should handle large metadata objects in dictionary items', async () => {
      // Arrange
      const largeMetadata = {
        key1: 'value1',
        key2: 'value2',
        nested: {
          deep: {
            data: [1, 2, 3, 4, 5],
          },
        },
        array: Array(100).fill('item'),
      };

      const createDto: CreateDictionaryItemDto = {
        code: 'large_metadata',
        value_ru: 'Большие метаданные',
        metadata: largeMetadata,
      };

      const mockQueryBuilder = createMockQueryBuilder();
      (mockQueryBuilder.getOne as jest.Mock).mockResolvedValue(mockDictionary);
      mockDictionaryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      mockDictionaryItemRepository.findOne.mockResolvedValue(null);
      mockDictionaryItemRepository.create.mockReturnValue({
        ...createDto,
        dictionary_id: mockDictionary.id,
      } as any);
      mockDictionaryItemRepository.save.mockResolvedValue({
        id: 'new-id',
        ...createDto,
        dictionary_id: mockDictionary.id,
      } as any);

      // Act
      const result = await service.createDictionaryItem(mockDictionary.id, createDto);

      // Assert
      expect(result.metadata).toEqual(largeMetadata);
    });
  });
});
