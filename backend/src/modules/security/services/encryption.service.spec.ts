import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EncryptionService } from './encryption.service';
import { DataEncryption, EncryptionStatus } from '../entities/data-encryption.entity';

describe('EncryptionService', () => {
  let service: EncryptionService;
  let mockRepository: any;

  const originalEnv = process.env.ENCRYPTION_KEY;

  beforeAll(() => {
    // Set encryption key for tests
    process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars-long!';
  });

  afterAll(() => {
    // Restore original environment
    process.env.ENCRYPTION_KEY = originalEnv;
  });

  beforeEach(async () => {
    mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        delete: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 5 }),
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncryptionService,
        {
          provide: getRepositoryToken(DataEncryption),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<EncryptionService>(EncryptionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should throw error when ENCRYPTION_KEY is not set', async () => {
      const originalKey = process.env.ENCRYPTION_KEY;
      delete process.env.ENCRYPTION_KEY;

      await expect(
        Test.createTestingModule({
          providers: [
            EncryptionService,
            {
              provide: getRepositoryToken(DataEncryption),
              useValue: mockRepository,
            },
          ],
        }).compile(),
      ).rejects.toThrow('ENCRYPTION_KEY environment variable must be set');

      process.env.ENCRYPTION_KEY = originalKey;
    });

    it('should throw error when ENCRYPTION_KEY is too short', async () => {
      const originalKey = process.env.ENCRYPTION_KEY;
      process.env.ENCRYPTION_KEY = 'short';

      await expect(
        Test.createTestingModule({
          providers: [
            EncryptionService,
            {
              provide: getRepositoryToken(DataEncryption),
              useValue: mockRepository,
            },
          ],
        }).compile(),
      ).rejects.toThrow('ENCRYPTION_KEY must be at least 32 characters');

      process.env.ENCRYPTION_KEY = originalKey;
    });
  });

  describe('encryptField', () => {
    it('should encrypt a field and save to database', async () => {
      const entityType = 'user';
      const entityId = 'user-123';
      const fieldName = 'phone';
      const value = '+1234567890';
      const encryptedById = 'admin-123';
      const metadata = { data_classification: 'PII' };

      const mockEncryptionRecord = {
        id: 'enc-123',
        entity_type: entityType,
        entity_id: entityId,
        field_name: fieldName,
        encrypted_value: expect.any(String),
        encryption_algorithm: 'aes-256-gcm',
        key_version: 'v1',
        status: EncryptionStatus.ENCRYPTED,
        encrypted_at: expect.any(Date),
        encrypted_by_id: encryptedById,
        metadata,
      };

      mockRepository.create.mockReturnValue(mockEncryptionRecord);
      mockRepository.save.mockResolvedValue(mockEncryptionRecord);

      const result = await service.encryptField(
        entityType,
        entityId,
        fieldName,
        value,
        encryptedById,
        metadata,
      );

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          entity_type: entityType,
          entity_id: entityId,
          field_name: fieldName,
          encryption_algorithm: 'aes-256-gcm',
          key_version: 'v1',
          status: EncryptionStatus.ENCRYPTED,
          encrypted_by_id: encryptedById,
          metadata,
        }),
      );
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockEncryptionRecord);
    });

    it('should encrypt a field with default metadata when not provided', async () => {
      const entityType = 'payment';
      const entityId = 'pay-456';
      const fieldName = 'card_number';
      const value = '4111111111111111';

      const mockEncryptionRecord = {
        id: 'enc-456',
        entity_type: entityType,
        entity_id: entityId,
        field_name: fieldName,
        metadata: {},
      };

      mockRepository.create.mockReturnValue(mockEncryptionRecord);
      mockRepository.save.mockResolvedValue(mockEncryptionRecord);

      await service.encryptField(entityType, entityId, fieldName, value);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: {},
        }),
      );
    });
  });

  describe('decryptField', () => {
    it('should decrypt a field and update access tracking', async () => {
      const entityType = 'user';
      const entityId = 'user-123';
      const fieldName = 'phone';
      const accessedById = 'admin-456';

      // First encrypt the value to get valid encrypted data
      const originalValue = '+1234567890';
      const encryptedRecord = {
        id: 'enc-123',
        entity_type: entityType,
        entity_id: entityId,
        field_name: fieldName,
        encrypted_value: '', // Will be set in test
        last_accessed_at: null,
        last_accessed_by_id: null,
        access_count: 0,
      };

      // We need to encrypt a value first to get valid encrypted data
      mockRepository.create.mockReturnValue({ ...encryptedRecord });
      mockRepository.save.mockImplementation((record: any) => Promise.resolve(record));

      const encrypted = await service.encryptField(entityType, entityId, fieldName, originalValue);

      // Now test decryption
      encryptedRecord.encrypted_value = (
        mockRepository.create.mock.calls[0][0] as any
      ).encrypted_value;
      mockRepository.findOne.mockResolvedValue(encryptedRecord);

      const result = await service.decryptField(entityType, entityId, fieldName, accessedById);

      expect(result).toBe(originalValue);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: {
          entity_type: entityType,
          entity_id: entityId,
          field_name: fieldName,
        },
      });
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw error when encrypted field not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.decryptField('user', 'nonexistent', 'phone')).rejects.toThrow(
        'Encrypted field not found',
      );
    });
  });

  describe('getEncryptedFields', () => {
    it('should return all encrypted fields for an entity', async () => {
      const entityType = 'user';
      const entityId = 'user-123';
      const mockFields = [
        { id: 'enc-1', field_name: 'phone' },
        { id: 'enc-2', field_name: 'email' },
      ];

      mockRepository.find.mockResolvedValue(mockFields);

      const result = await service.getEncryptedFields(entityType, entityId);

      expect(result).toEqual(mockFields);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: {
          entity_type: entityType,
          entity_id: entityId,
        },
      });
    });

    it('should return empty array when no encrypted fields exist', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.getEncryptedFields('user', 'nonexistent');

      expect(result).toEqual([]);
    });
  });

  describe('cleanExpiredData', () => {
    it('should clean expired data with default retention period', async () => {
      const result = await service.cleanExpiredData();

      expect(result).toBe(5);
      expect(mockRepository.createQueryBuilder).toHaveBeenCalled();
    });

    it('should clean expired data with custom retention period', async () => {
      const result = await service.cleanExpiredData(30);

      expect(result).toBe(5);
      expect(mockRepository.createQueryBuilder).toHaveBeenCalled();
    });

    it('should return 0 when no data to clean', async () => {
      mockRepository.createQueryBuilder.mockReturnValue({
        delete: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 0 }),
      });

      const result = await service.cleanExpiredData();

      expect(result).toBe(0);
    });

    it('should handle undefined affected count', async () => {
      mockRepository.createQueryBuilder.mockReturnValue({
        delete: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({}),
      });

      const result = await service.cleanExpiredData();

      expect(result).toBe(0);
    });
  });

  describe('encryption/decryption round trip', () => {
    it('should correctly encrypt and decrypt various data types', async () => {
      const testCases = [
        { value: 'simple text' },
        { value: '+1 (555) 123-4567' },
        { value: 'email@example.com' },
        { value: '4111-1111-1111-1111' },
        { value: 'Special chars: !@#$%^&*()' },
        { value: 'Unicode: Hello World' },
      ];

      for (const testCase of testCases) {
        let capturedEncryptedValue = '';

        mockRepository.create.mockImplementation((data: any) => {
          capturedEncryptedValue = data.encrypted_value;
          return { ...data, id: 'test-id' };
        });
        mockRepository.save.mockImplementation((data: any) => Promise.resolve(data));

        await service.encryptField('test', 'id-1', 'field', testCase.value);

        mockRepository.findOne.mockResolvedValue({
          encrypted_value: capturedEncryptedValue,
          last_accessed_at: null,
          last_accessed_by_id: null,
          access_count: 0,
        });

        const decrypted = await service.decryptField('test', 'id-1', 'field');
        expect(decrypted).toBe(testCase.value);
      }
    });
  });
});
