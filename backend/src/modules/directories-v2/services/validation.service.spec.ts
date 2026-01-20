import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ValidationService } from './validation.service';
import { DirectoryEntry } from '../entities/directory-entry.entity';
import { DirectoryField, DirectoryFieldType } from '../entities/directory-field.entity';
import { Directory, DirectoryType, DirectoryScope } from '../entities/directory.entity';

describe('ValidationService', () => {
  let service: ValidationService;
  let entryRepository: jest.Mocked<Repository<DirectoryEntry>>;
  let fieldRepository: jest.Mocked<Repository<DirectoryField>>;

  const mockDirectory: Partial<Directory> = {
    id: 'dir-123',
    slug: 'products',
    name_ru: 'Товары',
    directory_type: DirectoryType.INTERNAL,
    scope: DirectoryScope.ORGANIZATION,
    is_active: true,
    fields: [],
  };

  const createMockField = (overrides: Partial<DirectoryField> = {}): DirectoryField => ({
    id: 'field-123',
    directory_id: 'dir-123',
    code: 'test_field',
    name_ru: 'Тестовое поле',
    name_en: 'Test Field',
    field_type: DirectoryFieldType.TEXT,
    is_required: false,
    is_unique: false,
    is_searchable: true,
    is_active: true,
    sort_order: 0,
    validation: null,
    options: null,
    default_value: null,
    description_ru: null,
    description_en: null,
    reference_directory_id: null,
    is_unique_per_org: false,
    allow_free_text: false,
    translations: null,
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    created_by_id: 'user-123',
    updated_by_id: null,
    directory: mockDirectory as Directory,
    ...overrides,
  } as DirectoryField);

  beforeEach(async () => {
    const mockRepo = () => ({
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      })),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValidationService,
        { provide: getRepositoryToken(DirectoryEntry), useFactory: mockRepo },
        { provide: getRepositoryToken(DirectoryField), useFactory: mockRepo },
      ],
    }).compile();

    service = module.get<ValidationService>(ValidationService);
    entryRepository = module.get(getRepositoryToken(DirectoryEntry));
    fieldRepository = module.get(getRepositoryToken(DirectoryField));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateEntryData', () => {
    it('should pass validation for valid data', async () => {
      const directory = {
        ...mockDirectory,
        fields: [
          createMockField({
            code: 'name',
            name_ru: 'Название',
            field_type: DirectoryFieldType.TEXT,
            is_required: true,
          }),
        ],
      } as Directory;

      const data = { name: 'Test Product' };

      const result = await service.validateEntryData(directory, data);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for missing required field', async () => {
      const directory = {
        ...mockDirectory,
        fields: [
          createMockField({
            code: 'name',
            name_ru: 'Название',
            field_type: DirectoryFieldType.TEXT,
            is_required: true,
          }),
        ],
      } as Directory;

      const data = {};

      const result = await service.validateEntryData(directory, data);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('REQUIRED');
    });

    it('should pass validation for empty optional field', async () => {
      const directory = {
        ...mockDirectory,
        fields: [
          createMockField({
            code: 'description',
            name_ru: 'Описание',
            field_type: DirectoryFieldType.TEXT,
            is_required: false,
          }),
        ],
      } as Directory;

      const data = {};

      const result = await service.validateEntryData(directory, data);

      expect(result.valid).toBe(true);
    });
  });

  describe('validateFieldValue - type validation', () => {
    it('should validate TEXT field', async () => {
      const field = createMockField({
        code: 'name',
        field_type: DirectoryFieldType.TEXT,
      });

      const errors = await service.validateFieldValue(field, 'test', 'dir-123');
      expect(errors).toHaveLength(0);

      const errorsBadType = await service.validateFieldValue(field, 123, 'dir-123');
      expect(errorsBadType).toHaveLength(1);
      expect(errorsBadType[0].code).toBe('INVALID_TYPE');
    });

    it('should validate NUMBER field', async () => {
      const field = createMockField({
        code: 'quantity',
        field_type: DirectoryFieldType.NUMBER,
      });

      const errors = await service.validateFieldValue(field, 10, 'dir-123');
      expect(errors).toHaveLength(0);

      const errorsDecimal = await service.validateFieldValue(field, 10.5, 'dir-123');
      expect(errorsDecimal).toHaveLength(1);
      expect(errorsDecimal[0].code).toBe('INVALID_TYPE');
    });

    it('should validate DECIMAL field', async () => {
      const field = createMockField({
        code: 'price',
        field_type: DirectoryFieldType.DECIMAL,
      });

      const errors = await service.validateFieldValue(field, 99.99, 'dir-123');
      expect(errors).toHaveLength(0);

      const errorsString = await service.validateFieldValue(field, 'not a number', 'dir-123');
      expect(errorsString).toHaveLength(1);
    });

    it('should validate BOOLEAN field', async () => {
      const field = createMockField({
        code: 'is_active',
        field_type: DirectoryFieldType.BOOLEAN,
      });

      const errors = await service.validateFieldValue(field, true, 'dir-123');
      expect(errors).toHaveLength(0);

      const errorsString = await service.validateFieldValue(field, 'true', 'dir-123');
      expect(errorsString).toHaveLength(1);
    });

    it('should validate DATE field', async () => {
      const field = createMockField({
        code: 'birth_date',
        field_type: DirectoryFieldType.DATE,
      });

      const errors = await service.validateFieldValue(field, '2024-01-15', 'dir-123');
      expect(errors).toHaveLength(0);

      const errorsInvalid = await service.validateFieldValue(field, '15-01-2024', 'dir-123');
      expect(errorsInvalid).toHaveLength(1);
    });

    it('should validate EMAIL field', async () => {
      const field = createMockField({
        code: 'email',
        field_type: DirectoryFieldType.EMAIL,
      });

      const errors = await service.validateFieldValue(field, 'test@example.com', 'dir-123');
      expect(errors).toHaveLength(0);

      const errorsInvalid = await service.validateFieldValue(field, 'not-an-email', 'dir-123');
      expect(errorsInvalid).toHaveLength(1);
      expect(errorsInvalid[0].code).toBe('INVALID_FORMAT');
    });

    it('should validate PHONE field', async () => {
      const field = createMockField({
        code: 'phone',
        field_type: DirectoryFieldType.PHONE,
      });

      const errors = await service.validateFieldValue(field, '+7 (999) 123-45-67', 'dir-123');
      expect(errors).toHaveLength(0);

      const errorsInvalid = await service.validateFieldValue(field, 'abc', 'dir-123');
      expect(errorsInvalid).toHaveLength(1);
    });

    it('should validate URL field', async () => {
      const field = createMockField({
        code: 'website',
        field_type: DirectoryFieldType.URL,
      });

      const errors = await service.validateFieldValue(field, 'https://example.com', 'dir-123');
      expect(errors).toHaveLength(0);

      const errorsInvalid = await service.validateFieldValue(field, 'not-a-url', 'dir-123');
      expect(errorsInvalid).toHaveLength(1);
    });

    it('should validate SELECT field', async () => {
      const field = createMockField({
        code: 'status',
        field_type: DirectoryFieldType.SELECT,
        options: [
          { value: 'active', label: 'Active' },
          { value: 'inactive', label: 'Inactive' },
        ],
      });

      const errors = await service.validateFieldValue(field, 'active', 'dir-123');
      expect(errors).toHaveLength(0);

      const errorsInvalid = await service.validateFieldValue(field, 'unknown', 'dir-123');
      expect(errorsInvalid).toHaveLength(1);
      expect(errorsInvalid[0].code).toBe('INVALID_OPTION');
    });

    it('should validate MULTISELECT field', async () => {
      const field = createMockField({
        code: 'tags',
        field_type: DirectoryFieldType.MULTISELECT,
        options: [
          { value: 'tag1', label: 'Tag 1' },
          { value: 'tag2', label: 'Tag 2' },
        ],
      });

      const errors = await service.validateFieldValue(field, ['tag1', 'tag2'], 'dir-123');
      expect(errors).toHaveLength(0);

      const errorsNotArray = await service.validateFieldValue(field, 'tag1', 'dir-123');
      expect(errorsNotArray).toHaveLength(1);
      expect(errorsNotArray[0].code).toBe('INVALID_TYPE');
    });
  });

  describe('validateFieldValue - custom validation rules', () => {
    it('should validate minLength rule', async () => {
      const field = createMockField({
        code: 'name',
        field_type: DirectoryFieldType.TEXT,
        validation: { minLength: 3 },
      });

      const errors = await service.validateFieldValue(field, 'ab', 'dir-123');
      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('MIN_LENGTH');

      const errorsValid = await service.validateFieldValue(field, 'abc', 'dir-123');
      expect(errorsValid).toHaveLength(0);
    });

    it('should validate maxLength rule', async () => {
      const field = createMockField({
        code: 'code',
        field_type: DirectoryFieldType.TEXT,
        validation: { maxLength: 5 },
      });

      const errors = await service.validateFieldValue(field, 'toolong', 'dir-123');
      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('MAX_LENGTH');
    });

    it('should validate pattern rule', async () => {
      const field = createMockField({
        code: 'sku',
        field_type: DirectoryFieldType.TEXT,
        validation: {
          pattern: '^[A-Z]{2}-\\d{3}$',
          patternMessage: 'Format: XX-000',
        },
      });

      const errors = await service.validateFieldValue(field, 'invalid', 'dir-123');
      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('PATTERN_MISMATCH');

      const errorsValid = await service.validateFieldValue(field, 'AB-123', 'dir-123');
      expect(errorsValid).toHaveLength(0);
    });

    it('should validate min/max number rules', async () => {
      const field = createMockField({
        code: 'quantity',
        field_type: DirectoryFieldType.NUMBER,
        validation: { min: 1, max: 100 },
      });

      const errorsTooSmall = await service.validateFieldValue(field, 0, 'dir-123');
      expect(errorsTooSmall).toHaveLength(1);
      expect(errorsTooSmall[0].code).toBe('MIN_VALUE');

      const errorsTooBig = await service.validateFieldValue(field, 101, 'dir-123');
      expect(errorsTooBig).toHaveLength(1);
      expect(errorsTooBig[0].code).toBe('MAX_VALUE');

      const errorsValid = await service.validateFieldValue(field, 50, 'dir-123');
      expect(errorsValid).toHaveLength(0);
    });

    it('should validate precision rule', async () => {
      const field = createMockField({
        code: 'price',
        field_type: DirectoryFieldType.DECIMAL,
        validation: { precision: 2 },
      });

      const errors = await service.validateFieldValue(field, 99.999, 'dir-123');
      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('PRECISION');

      const errorsValid = await service.validateFieldValue(field, 99.99, 'dir-123');
      expect(errorsValid).toHaveLength(0);
    });
  });

  describe('validateFieldValue - uniqueness', () => {
    it('should check uniqueness for unique fields', async () => {
      const field = createMockField({
        code: 'sku',
        field_type: DirectoryFieldType.TEXT,
        is_unique: true,
      });

      // Mock query builder to return count = 1 (duplicate exists)
      const mockQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1),
      };
      entryRepository.createQueryBuilder.mockReturnValue(mockQb as any);

      const errors = await service.validateFieldValue(field, 'SKU-001', 'dir-123');
      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('UNIQUE_VIOLATION');
    });

    it('should allow same value when updating existing entry', async () => {
      const field = createMockField({
        code: 'sku',
        field_type: DirectoryFieldType.TEXT,
        is_unique: true,
      });

      // Mock query builder to return count = 0 (no other entry with this value)
      const mockQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      };
      entryRepository.createQueryBuilder.mockReturnValue(mockQb as any);

      const errors = await service.validateFieldValue(field, 'SKU-001', 'dir-123', 'entry-123');
      expect(errors).toHaveLength(0);
    });
  });
});
