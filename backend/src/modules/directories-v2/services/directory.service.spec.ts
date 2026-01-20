import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DirectoryService } from './directory.service';
import { Directory, DirectoryType, DirectoryScope } from '../entities/directory.entity';
import { DirectoryField, DirectoryFieldType } from '../entities/directory-field.entity';
import { DirectoryEntry } from '../entities/directory-entry.entity';
import { DirectoryStats } from '../entities/directory-stats.entity';

describe('DirectoryService', () => {
  let service: DirectoryService;
  let directoryRepository: jest.Mocked<Repository<Directory>>;
  let fieldRepository: jest.Mocked<Repository<DirectoryField>>;
  let entryRepository: jest.Mocked<Repository<DirectoryEntry>>;
  let statsRepository: jest.Mocked<Repository<DirectoryStats>>;

  const mockDirectory: Partial<Directory> = {
    id: 'dir-123',
    slug: 'products',
    name_ru: 'Товары',
    name_en: 'Products',
    directory_type: DirectoryType.INTERNAL,
    scope: DirectoryScope.ORGANIZATION,
    is_active: true,
    is_hierarchical: false,
    version: 1,
    created_at: new Date(),
    updated_at: new Date(),
    fields: [],
  };

  const mockField: Partial<DirectoryField> = {
    id: 'field-123',
    directory_id: 'dir-123',
    code: 'name',
    name_ru: 'Название',
    field_type: DirectoryFieldType.TEXT,
    is_required: true,
    is_unique: false,
    is_searchable: true,
    is_active: true,
    sort_order: 0,
  };

  beforeEach(async () => {
    const mockRepo = () => ({
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn(),
        getOne: jest.fn(),
        getCount: jest.fn(),
      })),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DirectoryService,
        { provide: getRepositoryToken(Directory), useFactory: mockRepo },
        { provide: getRepositoryToken(DirectoryField), useFactory: mockRepo },
        { provide: getRepositoryToken(DirectoryEntry), useFactory: mockRepo },
        { provide: getRepositoryToken(DirectoryStats), useFactory: mockRepo },
      ],
    }).compile();

    service = module.get<DirectoryService>(DirectoryService);
    directoryRepository = module.get(getRepositoryToken(Directory));
    fieldRepository = module.get(getRepositoryToken(DirectoryField));
    entryRepository = module.get(getRepositoryToken(DirectoryEntry));
    statsRepository = module.get(getRepositoryToken(DirectoryStats));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a directory with fields', async () => {
      const createDto = {
        slug: 'products',
        name_ru: 'Товары',
        directory_type: DirectoryType.INTERNAL,
        scope: DirectoryScope.ORGANIZATION,
        fields: [
          {
            code: 'name',
            name_ru: 'Название',
            field_type: DirectoryFieldType.TEXT,
            is_required: true,
          },
        ],
      };

      directoryRepository.findOne.mockResolvedValue(null);
      directoryRepository.create.mockReturnValue(mockDirectory as Directory);
      directoryRepository.save.mockResolvedValue(mockDirectory as Directory);
      fieldRepository.create.mockReturnValue(mockField as DirectoryField);
      fieldRepository.save.mockResolvedValue([mockField as DirectoryField]);

      const result = await service.create(createDto, 'user-123');

      expect(directoryRepository.findOne).toHaveBeenCalled();
      expect(directoryRepository.create).toHaveBeenCalled();
      expect(directoryRepository.save).toHaveBeenCalled();
      expect(result.slug).toBe('products');
    });

    it('should throw BadRequestException if slug already exists', async () => {
      const createDto = {
        slug: 'products',
        name_ru: 'Товары',
        directory_type: DirectoryType.INTERNAL,
        scope: DirectoryScope.ORGANIZATION,
      };

      directoryRepository.findOne.mockResolvedValue(mockDirectory as Directory);

      await expect(service.create(createDto, 'user-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findOne', () => {
    it('should return a directory by id', async () => {
      directoryRepository.findOne.mockResolvedValue(mockDirectory as Directory);

      const result = await service.findOne('dir-123');

      expect(result).toEqual(mockDirectory);
      expect(directoryRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'dir-123' },
        relations: ['fields'],
      });
    });

    it('should throw NotFoundException if directory not found', async () => {
      directoryRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('not-found')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findBySlug', () => {
    it('should return a directory by slug', async () => {
      directoryRepository.findOne.mockResolvedValue(mockDirectory as Directory);

      const result = await service.findBySlug('products');

      expect(result).toEqual(mockDirectory);
      expect(directoryRepository.findOne).toHaveBeenCalledWith({
        where: { slug: 'products' },
        relations: ['fields'],
      });
    });

    it('should throw NotFoundException if directory not found', async () => {
      directoryRepository.findOne.mockResolvedValue(null);

      await expect(service.findBySlug('not-found')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a directory', async () => {
      const updateDto = { name_ru: 'Обновленное название' };
      const updatedDirectory = { ...mockDirectory, name_ru: 'Обновленное название' };

      directoryRepository.findOne.mockResolvedValue(mockDirectory as Directory);
      directoryRepository.save.mockResolvedValue(updatedDirectory as Directory);

      const result = await service.update('dir-123', updateDto, 'user-123');

      expect(result.name_ru).toBe('Обновленное название');
      expect(directoryRepository.save).toHaveBeenCalled();
    });
  });

  describe('archive', () => {
    it('should soft delete a directory', async () => {
      directoryRepository.findOne.mockResolvedValue(mockDirectory as Directory);
      directoryRepository.save.mockResolvedValue({
        ...mockDirectory,
        deleted_at: new Date(),
      } as Directory);

      await service.archive('dir-123', 'user-123');

      expect(directoryRepository.save).toHaveBeenCalled();
    });
  });

  describe('addField', () => {
    it('should add a field to directory', async () => {
      const fieldDto = {
        code: 'description',
        name_ru: 'Описание',
        field_type: DirectoryFieldType.TEXTAREA,
      };

      directoryRepository.findOne.mockResolvedValue(mockDirectory as Directory);
      fieldRepository.findOne.mockResolvedValue(null);
      fieldRepository.create.mockReturnValue(mockField as DirectoryField);
      fieldRepository.save.mockResolvedValue(mockField as DirectoryField);

      const result = await service.addField('dir-123', fieldDto, 'user-123');

      expect(fieldRepository.create).toHaveBeenCalled();
      expect(fieldRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if field code already exists', async () => {
      const fieldDto = {
        code: 'name',
        name_ru: 'Название',
        field_type: DirectoryFieldType.TEXT,
      };

      directoryRepository.findOne.mockResolvedValue(mockDirectory as Directory);
      fieldRepository.findOne.mockResolvedValue(mockField as DirectoryField);

      await expect(service.addField('dir-123', fieldDto, 'user-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
