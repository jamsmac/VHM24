import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { DictionariesController } from './dictionaries.controller';
import { DictionaryCacheService } from './services/dictionary-cache.service';
import { Dictionary } from './entities/dictionary.entity';
import { DictionaryItem } from './entities/dictionary-item.entity';
import { CreateDictionaryDto } from './dto/create-dictionary.dto';
import { UpdateDictionaryDto } from './dto/update-dictionary.dto';
import { CreateDictionaryItemDto } from './dto/create-dictionary-item.dto';
import { UpdateDictionaryItemDto } from './dto/update-dictionary-item.dto';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';

describe('DictionariesController', () => {
  let controller: DictionariesController;
  let mockCacheService: jest.Mocked<DictionaryCacheService>;

  const mockDictionary: Dictionary = {
    id: 'dict-1',
    code: 'machine_types',
    name_ru: 'Типы аппаратов',
    name_en: 'Machine Types',
    description: 'Types of vending machines',
    is_system: false,
    is_active: true,
    sort_order: 1,
    items: [],
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    created_by_id: null,
    updated_by_id: null,
  };

  const _mockSystemDictionary: Dictionary = {
    ...mockDictionary,
    id: 'dict-2',
    code: 'task_statuses',
    is_system: true,
  };

  const mockDictionaryItem: DictionaryItem = {
    id: 'item-1',
    dictionary_id: 'dict-1',
    dictionary: mockDictionary,
    code: 'coffee_machine',
    value_ru: 'Кофейный автомат',
    value_en: 'Coffee Machine',
    description: 'Coffee vending machine',
    is_active: true,
    sort_order: 1,
    metadata: { color: '#FF0000' },
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    created_by_id: null,
    updated_by_id: null,
  };

  beforeEach(async () => {
    mockCacheService = {
      createDictionary: jest.fn(),
      findAllDictionaries: jest.fn(),
      findOneDictionary: jest.fn(),
      findByCode: jest.fn(),
      updateDictionary: jest.fn(),
      removeDictionary: jest.fn(),
      createDictionaryItem: jest.fn(),
      findAllDictionaryItems: jest.fn(),
      findOneDictionaryItem: jest.fn(),
      updateDictionaryItem: jest.fn(),
      removeDictionaryItem: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DictionariesController],
      providers: [
        {
          provide: DictionaryCacheService,
          useValue: mockCacheService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<DictionariesController>(DictionariesController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==================== DICTIONARIES ====================

  describe('createDictionary', () => {
    it('should create a new dictionary', async () => {
      // Arrange
      const createDto: CreateDictionaryDto = {
        code: 'new_dictionary',
        name_ru: 'Новый справочник',
        name_en: 'New Dictionary',
      };
      mockCacheService.createDictionary.mockResolvedValue({
        ...mockDictionary,
        ...createDto,
      } as Dictionary);

      // Act
      const result = await controller.createDictionary(createDto);

      // Assert
      expect(result.code).toBe(createDto.code);
      expect(mockCacheService.createDictionary).toHaveBeenCalledWith(createDto);
    });

    it('should throw ConflictException when code already exists', async () => {
      // Arrange
      const createDto: CreateDictionaryDto = {
        code: 'machine_types',
        name_ru: 'Дубликат',
      };
      mockCacheService.createDictionary.mockRejectedValue(
        new ConflictException('Справочник с кодом machine_types уже существует'),
      );

      // Act & Assert
      await expect(controller.createDictionary(createDto)).rejects.toThrow(ConflictException);
    });

    it('should create dictionary with minimal required fields', async () => {
      // Arrange
      const createDto: CreateDictionaryDto = {
        code: 'minimal',
        name_ru: 'Минимальный',
      };
      mockCacheService.createDictionary.mockResolvedValue({
        id: 'new-id',
        ...createDto,
      } as any);

      // Act
      const result = await controller.createDictionary(createDto);

      // Assert
      expect(result.code).toBe('minimal');
    });
  });

  describe('findAllDictionaries', () => {
    it('should return all dictionaries without items', async () => {
      // Arrange
      mockCacheService.findAllDictionaries.mockResolvedValue([mockDictionary]);

      // Act
      const result = await controller.findAllDictionaries();

      // Assert
      expect(result).toEqual([mockDictionary]);
      expect(mockCacheService.findAllDictionaries).toHaveBeenCalledWith(false);
    });

    it('should return all dictionaries with items when includeItems is true', async () => {
      // Arrange
      const dictWithItems = { ...mockDictionary, items: [mockDictionaryItem] };
      mockCacheService.findAllDictionaries.mockResolvedValue([dictWithItems]);

      // Act
      const result = await controller.findAllDictionaries('true');

      // Assert
      expect(result).toEqual([dictWithItems]);
      expect(mockCacheService.findAllDictionaries).toHaveBeenCalledWith(true);
    });

    it('should return empty array when no dictionaries exist', async () => {
      // Arrange
      mockCacheService.findAllDictionaries.mockResolvedValue([]);

      // Act
      const result = await controller.findAllDictionaries();

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('findOneDictionary', () => {
    it('should return dictionary by ID with items by default', async () => {
      // Arrange
      const dictWithItems = { ...mockDictionary, items: [mockDictionaryItem] };
      mockCacheService.findOneDictionary.mockResolvedValue(dictWithItems);

      // Act
      const result = await controller.findOneDictionary('dict-1');

      // Assert
      expect(result).toEqual(dictWithItems);
      expect(mockCacheService.findOneDictionary).toHaveBeenCalledWith('dict-1', true);
    });

    it('should return dictionary without items when includeItems is false', async () => {
      // Arrange
      mockCacheService.findOneDictionary.mockResolvedValue(mockDictionary);

      // Act
      const result = await controller.findOneDictionary('dict-1', 'false');

      // Assert
      expect(result).toEqual(mockDictionary);
      expect(mockCacheService.findOneDictionary).toHaveBeenCalledWith('dict-1', false);
    });

    it('should throw NotFoundException when dictionary not found', async () => {
      // Arrange
      mockCacheService.findOneDictionary.mockRejectedValue(
        new NotFoundException('Справочник с ID non-existent не найден'),
      );

      // Act & Assert
      await expect(controller.findOneDictionary('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByCode', () => {
    it('should return dictionary by code with items by default', async () => {
      // Arrange
      const dictWithItems = { ...mockDictionary, items: [mockDictionaryItem] };
      mockCacheService.findByCode.mockResolvedValue(dictWithItems);

      // Act
      const result = await controller.findByCode('machine_types');

      // Assert
      expect(result).toEqual(dictWithItems);
      expect(mockCacheService.findByCode).toHaveBeenCalledWith('machine_types', true);
    });

    it('should return dictionary without items when includeItems is false', async () => {
      // Arrange
      mockCacheService.findByCode.mockResolvedValue(mockDictionary);

      // Act
      const result = await controller.findByCode('machine_types', 'false');

      // Assert
      expect(result).toEqual(mockDictionary);
      expect(mockCacheService.findByCode).toHaveBeenCalledWith('machine_types', false);
    });

    it('should throw NotFoundException when code not found', async () => {
      // Arrange
      mockCacheService.findByCode.mockRejectedValue(
        new NotFoundException('Справочник с кодом unknown не найден'),
      );

      // Act & Assert
      await expect(controller.findByCode('unknown')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateDictionary', () => {
    it('should update dictionary successfully', async () => {
      // Arrange
      const updateDto: UpdateDictionaryDto = {
        name_ru: 'Обновленное название',
        description: 'Обновленное описание',
      };
      const updatedDict = { ...mockDictionary, ...updateDto };
      mockCacheService.updateDictionary.mockResolvedValue(updatedDict);

      // Act
      const result = await controller.updateDictionary('dict-1', updateDto);

      // Assert
      expect(result).toEqual(updatedDict);
      expect(mockCacheService.updateDictionary).toHaveBeenCalledWith('dict-1', updateDto);
    });

    it('should throw NotFoundException when dictionary not found', async () => {
      // Arrange
      mockCacheService.updateDictionary.mockRejectedValue(
        new NotFoundException('Справочник с ID non-existent не найден'),
      );

      // Act & Assert
      await expect(controller.updateDictionary('non-existent', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when trying to change system dictionary status', async () => {
      // Arrange
      mockCacheService.updateDictionary.mockRejectedValue(
        new BadRequestException('Невозможно изменить статус системного справочника'),
      );

      // Act & Assert
      await expect(controller.updateDictionary('dict-2', { is_system: false })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('removeDictionary', () => {
    it('should delete dictionary successfully', async () => {
      // Arrange
      mockCacheService.removeDictionary.mockResolvedValue(undefined);

      // Act
      await controller.removeDictionary('dict-1');

      // Assert
      expect(mockCacheService.removeDictionary).toHaveBeenCalledWith('dict-1');
    });

    it('should throw NotFoundException when dictionary not found', async () => {
      // Arrange
      mockCacheService.removeDictionary.mockRejectedValue(
        new NotFoundException('Справочник с ID non-existent не найден'),
      );

      // Act & Assert
      await expect(controller.removeDictionary('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when trying to delete system dictionary', async () => {
      // Arrange
      mockCacheService.removeDictionary.mockRejectedValue(
        new BadRequestException('Невозможно удалить системный справочник'),
      );

      // Act & Assert
      await expect(controller.removeDictionary('dict-2')).rejects.toThrow(BadRequestException);
    });
  });

  // ==================== DICTIONARY ITEMS ====================

  describe('createDictionaryItem', () => {
    it('should create a new dictionary item', async () => {
      // Arrange
      const createDto: CreateDictionaryItemDto = {
        code: 'new_item',
        value_ru: 'Новый элемент',
        value_en: 'New Item',
      };
      mockCacheService.createDictionaryItem.mockResolvedValue({
        ...mockDictionaryItem,
        ...createDto,
      } as DictionaryItem);

      // Act
      const result = await controller.createDictionaryItem('dict-1', createDto);

      // Assert
      expect(result.code).toBe(createDto.code);
      expect(mockCacheService.createDictionaryItem).toHaveBeenCalledWith('dict-1', createDto);
    });

    it('should throw NotFoundException when dictionary not found', async () => {
      // Arrange
      const createDto: CreateDictionaryItemDto = {
        code: 'new_item',
        value_ru: 'Новый элемент',
      };
      mockCacheService.createDictionaryItem.mockRejectedValue(
        new NotFoundException('Справочник с ID non-existent не найден'),
      );

      // Act & Assert
      await expect(controller.createDictionaryItem('non-existent', createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException when item code already exists', async () => {
      // Arrange
      const createDto: CreateDictionaryItemDto = {
        code: 'coffee_machine',
        value_ru: 'Дубликат',
      };
      mockCacheService.createDictionaryItem.mockRejectedValue(
        new ConflictException('Элемент с кодом coffee_machine уже существует'),
      );

      // Act & Assert
      await expect(controller.createDictionaryItem('dict-1', createDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findAllDictionaryItems', () => {
    it('should return all items for a dictionary', async () => {
      // Arrange
      mockCacheService.findAllDictionaryItems.mockResolvedValue([mockDictionaryItem]);

      // Act
      const result = await controller.findAllDictionaryItems('dict-1');

      // Assert
      expect(result).toEqual([mockDictionaryItem]);
      expect(mockCacheService.findAllDictionaryItems).toHaveBeenCalledWith('dict-1');
    });

    it('should return empty array when no items exist', async () => {
      // Arrange
      mockCacheService.findAllDictionaryItems.mockResolvedValue([]);

      // Act
      const result = await controller.findAllDictionaryItems('dict-1');

      // Assert
      expect(result).toEqual([]);
    });

    it('should throw NotFoundException when dictionary not found', async () => {
      // Arrange
      mockCacheService.findAllDictionaryItems.mockRejectedValue(
        new NotFoundException('Справочник с ID non-existent не найден'),
      );

      // Act & Assert
      await expect(controller.findAllDictionaryItems('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findOneDictionaryItem', () => {
    it('should return dictionary item by ID', async () => {
      // Arrange
      mockCacheService.findOneDictionaryItem.mockResolvedValue(mockDictionaryItem);

      // Act
      const result = await controller.findOneDictionaryItem('item-1');

      // Assert
      expect(result).toEqual(mockDictionaryItem);
      expect(mockCacheService.findOneDictionaryItem).toHaveBeenCalledWith('item-1');
    });

    it('should throw NotFoundException when item not found', async () => {
      // Arrange
      mockCacheService.findOneDictionaryItem.mockRejectedValue(
        new NotFoundException('Элемент справочника с ID non-existent не найден'),
      );

      // Act & Assert
      await expect(controller.findOneDictionaryItem('non-existent')).rejects.toThrow(
        NotFoundException,
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
      const updatedItem = { ...mockDictionaryItem, ...updateDto };
      mockCacheService.updateDictionaryItem.mockResolvedValue(updatedItem);

      // Act
      const result = await controller.updateDictionaryItem('item-1', updateDto);

      // Assert
      expect(result).toEqual(updatedItem);
      expect(mockCacheService.updateDictionaryItem).toHaveBeenCalledWith('item-1', updateDto);
    });

    it('should throw NotFoundException when item not found', async () => {
      // Arrange
      mockCacheService.updateDictionaryItem.mockRejectedValue(
        new NotFoundException('Элемент справочника с ID non-existent не найден'),
      );

      // Act & Assert
      await expect(controller.updateDictionaryItem('non-existent', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when trying to update system dictionary item', async () => {
      // Arrange
      mockCacheService.updateDictionaryItem.mockRejectedValue(
        new BadRequestException('Невозможно изменить элемент системного справочника'),
      );

      // Act & Assert
      await expect(controller.updateDictionaryItem('item-1', { value_ru: 'Test' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should update item metadata', async () => {
      // Arrange
      const updateDto: UpdateDictionaryItemDto = {
        metadata: { icon: 'new-icon', color: '#00FF00' },
      };
      const updatedItem = { ...mockDictionaryItem, metadata: updateDto.metadata } as any;
      mockCacheService.updateDictionaryItem.mockResolvedValue(updatedItem);

      // Act
      const result = await controller.updateDictionaryItem('item-1', updateDto);

      // Assert
      expect(result.metadata).toEqual(updateDto.metadata);
    });
  });

  describe('removeDictionaryItem', () => {
    it('should delete dictionary item successfully', async () => {
      // Arrange
      mockCacheService.removeDictionaryItem.mockResolvedValue(undefined);

      // Act
      await controller.removeDictionaryItem('item-1');

      // Assert
      expect(mockCacheService.removeDictionaryItem).toHaveBeenCalledWith('item-1');
    });

    it('should throw NotFoundException when item not found', async () => {
      // Arrange
      mockCacheService.removeDictionaryItem.mockRejectedValue(
        new NotFoundException('Элемент справочника с ID non-existent не найден'),
      );

      // Act & Assert
      await expect(controller.removeDictionaryItem('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when trying to delete system dictionary item', async () => {
      // Arrange
      mockCacheService.removeDictionaryItem.mockRejectedValue(
        new BadRequestException('Невозможно удалить элемент системного справочника'),
      );

      // Act & Assert
      await expect(controller.removeDictionaryItem('item-1')).rejects.toThrow(BadRequestException);
    });
  });

  // ==================== EDGE CASES ====================

  describe('Edge cases', () => {
    it('should handle special characters in dictionary code', async () => {
      // Arrange
      const createDto: CreateDictionaryDto = {
        code: 'special_code_123',
        name_ru: 'Справочник с цифрами',
      };
      mockCacheService.createDictionary.mockResolvedValue({
        id: 'new-id',
        ...createDto,
      } as any);

      // Act
      const result = await controller.createDictionary(createDto);

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
      mockCacheService.createDictionary.mockResolvedValue({
        id: 'new-id',
        ...createDto,
      } as any);

      // Act
      const result = await controller.createDictionary(createDto);

      // Assert
      expect(result.name_ru).toBe('Тест юникода');
    });

    it('should propagate service errors correctly', async () => {
      // Arrange
      const dbError = new Error('Database connection failed');
      mockCacheService.findAllDictionaries.mockRejectedValue(dbError);

      // Act & Assert
      await expect(controller.findAllDictionaries()).rejects.toThrow('Database connection failed');
    });

    it('should handle large metadata objects in dictionary items', async () => {
      // Arrange
      const largeMetadata = {
        key1: 'value1',
        nested: { deep: { data: Array(100).fill('item') } },
      };
      const createDto: CreateDictionaryItemDto = {
        code: 'large_metadata',
        value_ru: 'Большие метаданные',
        metadata: largeMetadata,
      };
      mockCacheService.createDictionaryItem.mockResolvedValue({
        id: 'new-item-id',
        dictionary_id: 'dict-1',
        ...createDto,
      } as any);

      // Act
      const result = await controller.createDictionaryItem('dict-1', createDto);

      // Assert
      expect(result.metadata).toEqual(largeMetadata);
    });
  });
});
