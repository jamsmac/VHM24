import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { File } from './entities/file.entity';

describe('FilesController', () => {
  let controller: FilesController;
  let mockFilesService: jest.Mocked<FilesService>;

  const mockFile: Partial<File> = {
    id: 'file-123',
    original_filename: 'test-image.jpg',
    stored_filename: '1234567890-uuid.jpg',
    file_path: 'task/task-123/task_photo_before/1234567890-uuid.jpg',
    mime_type: 'image/jpeg',
    file_size: 1024000,
    category_code: 'task_photo_before',
    entity_type: 'task',
    entity_id: 'task-123',
    uploaded_by_user_id: 'user-123',
    description: 'Test photo',
    tags: ['test', 'photo'],
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockMulterFile: Express.Multer.File = {
    fieldname: 'file',
    originalname: 'test-image.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    size: 1024000,
    buffer: Buffer.from('test file content'),
    stream: null as any,
    destination: '',
    filename: '',
    path: '',
  };

  beforeEach(async () => {
    mockFilesService = {
      uploadFile: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      findByEntity: jest.fn(),
      findByEntityAndCategory: jest.fn(),
      validateTaskPhotos: jest.fn(),
      remove: jest.fn(),
      getStats: jest.fn(),
      getFileUrl: jest.fn(),
      getFileBuffer: jest.fn(),
      getFileStream: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FilesController],
      providers: [
        {
          provide: FilesService,
          useValue: mockFilesService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<FilesController>(FilesController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadFile', () => {
    it('should upload file successfully', async () => {
      // Arrange
      mockFilesService.uploadFile.mockResolvedValue(mockFile as File);

      // Act
      const result = await controller.uploadFile(
        mockMulterFile,
        'task',
        'task-123',
        'task_photo_before',
        'user-123',
        'Test description',
        ['test', 'photo'],
      );

      // Assert
      expect(mockFilesService.uploadFile).toHaveBeenCalledWith(
        mockMulterFile,
        'task',
        'task-123',
        'task_photo_before',
        'user-123',
        'Test description',
        ['test', 'photo'],
      );
      expect(result).toEqual(mockFile);
    });

    it('should throw BadRequestException when file is not provided', async () => {
      // Act & Assert
      await expect(
        controller.uploadFile(null as any, 'task', 'task-123', 'task_photo_before', 'user-123'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.uploadFile(
          undefined as any,
          'task',
          'task-123',
          'task_photo_before',
          'user-123',
        ),
      ).rejects.toThrow('Файл не предоставлен');
    });

    it('should parse tags from JSON string', async () => {
      // Arrange
      mockFilesService.uploadFile.mockResolvedValue(mockFile as File);

      // Act
      await controller.uploadFile(
        mockMulterFile,
        'task',
        'task-123',
        'task_photo_before',
        'user-123',
        undefined,
        '["tag1", "tag2"]',
      );

      // Assert
      expect(mockFilesService.uploadFile).toHaveBeenCalledWith(
        expect.any(Object),
        'task',
        'task-123',
        'task_photo_before',
        'user-123',
        undefined,
        ['tag1', 'tag2'],
      );
    });

    it('should pass tags array directly', async () => {
      // Arrange
      mockFilesService.uploadFile.mockResolvedValue(mockFile as File);

      // Act
      await controller.uploadFile(
        mockMulterFile,
        'task',
        'task-123',
        'task_photo_before',
        'user-123',
        undefined,
        ['tag1', 'tag2'],
      );

      // Assert
      expect(mockFilesService.uploadFile).toHaveBeenCalledWith(
        expect.any(Object),
        'task',
        'task-123',
        'task_photo_before',
        'user-123',
        undefined,
        ['tag1', 'tag2'],
      );
    });

    it('should handle optional parameters', async () => {
      // Arrange
      mockFilesService.uploadFile.mockResolvedValue(mockFile as File);

      // Act
      await controller.uploadFile(
        mockMulterFile,
        'task',
        'task-123',
        'task_photo_before',
        'user-123',
      );

      // Assert
      expect(mockFilesService.uploadFile).toHaveBeenCalledWith(
        mockMulterFile,
        'task',
        'task-123',
        'task_photo_before',
        'user-123',
        undefined,
        undefined,
      );
    });
  });

  describe('findAll', () => {
    it('should return all files without filters', async () => {
      // Arrange
      const files = [mockFile as File];
      mockFilesService.findAll.mockResolvedValue(files);

      // Act
      const result = await controller.findAll();

      // Assert
      expect(mockFilesService.findAll).toHaveBeenCalledWith(undefined, undefined, undefined);
      expect(result).toEqual(files);
    });

    it('should filter by entityType', async () => {
      // Arrange
      mockFilesService.findAll.mockResolvedValue([]);

      // Act
      await controller.findAll('task');

      // Assert
      expect(mockFilesService.findAll).toHaveBeenCalledWith('task', undefined, undefined);
    });

    it('should filter by entityId', async () => {
      // Arrange
      mockFilesService.findAll.mockResolvedValue([]);

      // Act
      await controller.findAll(undefined, 'task-123');

      // Assert
      expect(mockFilesService.findAll).toHaveBeenCalledWith(undefined, 'task-123', undefined);
    });

    it('should filter by categoryCode', async () => {
      // Arrange
      mockFilesService.findAll.mockResolvedValue([]);

      // Act
      await controller.findAll(undefined, undefined, 'task_photo_before');

      // Assert
      expect(mockFilesService.findAll).toHaveBeenCalledWith(
        undefined,
        undefined,
        'task_photo_before',
      );
    });

    it('should apply all filters', async () => {
      // Arrange
      mockFilesService.findAll.mockResolvedValue([]);

      // Act
      await controller.findAll('task', 'task-123', 'task_photo_before');

      // Assert
      expect(mockFilesService.findAll).toHaveBeenCalledWith(
        'task',
        'task-123',
        'task_photo_before',
      );
    });
  });

  describe('getStats', () => {
    it('should return file statistics', async () => {
      // Arrange
      const stats = {
        total: 100,
        total_size_bytes: 104857600,
        total_size_mb: 100,
        by_category: [
          { category: 'task_photo_before', count: '50' },
          { category: 'task_photo_after', count: '40' },
          { category: 'contract_document', count: '10' },
        ],
      };
      mockFilesService.getStats.mockResolvedValue(stats);

      // Act
      const result = await controller.getStats();

      // Assert
      expect(mockFilesService.getStats).toHaveBeenCalled();
      expect(result).toEqual(stats);
    });
  });

  describe('findByEntity', () => {
    it('should return files for specific entity', async () => {
      // Arrange
      const files = [mockFile as File];
      mockFilesService.findByEntity.mockResolvedValue(files);

      // Act
      const result = await controller.findByEntity('task', 'task-123');

      // Assert
      expect(mockFilesService.findByEntity).toHaveBeenCalledWith('task', 'task-123');
      expect(result).toEqual(files);
    });
  });

  describe('validateTaskPhotos', () => {
    it('should return validation result for task photos', async () => {
      // Arrange
      const validationResult = {
        hasPhotoBefore: true,
        hasPhotoAfter: true,
        photosBefore: [mockFile as File],
        photosAfter: [mockFile as File],
      };
      mockFilesService.validateTaskPhotos.mockResolvedValue(validationResult);

      // Act
      const result = await controller.validateTaskPhotos('task-123');

      // Assert
      expect(mockFilesService.validateTaskPhotos).toHaveBeenCalledWith('task-123');
      expect(result).toEqual(validationResult);
    });

    it('should return invalid result when photos are missing', async () => {
      // Arrange
      const validationResult = {
        hasPhotoBefore: false,
        hasPhotoAfter: false,
        photosBefore: [],
        photosAfter: [],
      };
      mockFilesService.validateTaskPhotos.mockResolvedValue(validationResult);

      // Act
      const result = await controller.validateTaskPhotos('task-456');

      // Assert
      expect(result.hasPhotoBefore).toBe(false);
      expect(result.hasPhotoAfter).toBe(false);
    });
  });

  describe('findOne', () => {
    it('should return file by ID', async () => {
      // Arrange
      mockFilesService.findOne.mockResolvedValue(mockFile as File);

      // Act
      const result = await controller.findOne('file-123');

      // Assert
      expect(mockFilesService.findOne).toHaveBeenCalledWith('file-123');
      expect(result).toEqual(mockFile);
    });
  });

  describe('remove', () => {
    it('should delete file by ID', async () => {
      // Arrange
      mockFilesService.remove.mockResolvedValue(undefined);

      // Act
      await controller.remove('file-123');

      // Assert
      expect(mockFilesService.remove).toHaveBeenCalledWith('file-123');
    });
  });

  describe('CRITICAL: Task Photo Validation Flow', () => {
    // These tests ensure the critical photo validation flow for manual operations

    it('should validate task photos before completion workflow', async () => {
      // Arrange
      const validPhotos = {
        hasPhotoBefore: true,
        hasPhotoAfter: true,
        photosBefore: [{ ...mockFile, category_code: 'task_photo_before' } as File],
        photosAfter: [{ ...mockFile, category_code: 'task_photo_after' } as File],
      };
      mockFilesService.validateTaskPhotos.mockResolvedValue(validPhotos);

      // Act
      const result = await controller.validateTaskPhotos('refill-task-123');

      // Assert - Task can be completed
      expect(result.hasPhotoBefore).toBe(true);
      expect(result.hasPhotoAfter).toBe(true);
    });

    it('should detect missing before photos - blocking task completion', async () => {
      // Arrange
      const invalidPhotos = {
        hasPhotoBefore: false,
        hasPhotoAfter: true,
        photosBefore: [],
        photosAfter: [{ ...mockFile, category_code: 'task_photo_after' } as File],
      };
      mockFilesService.validateTaskPhotos.mockResolvedValue(invalidPhotos);

      // Act
      const result = await controller.validateTaskPhotos('collection-task-456');

      // Assert - Task completion should be blocked
      expect(result.hasPhotoBefore).toBe(false);
    });

    it('should detect missing after photos - blocking task completion', async () => {
      // Arrange
      const invalidPhotos = {
        hasPhotoBefore: true,
        hasPhotoAfter: false,
        photosBefore: [{ ...mockFile, category_code: 'task_photo_before' } as File],
        photosAfter: [],
      };
      mockFilesService.validateTaskPhotos.mockResolvedValue(invalidPhotos);

      // Act
      const result = await controller.validateTaskPhotos('maintenance-task-789');

      // Assert - Task completion should be blocked
      expect(result.hasPhotoAfter).toBe(false);
    });
  });

  describe('file upload for different entities', () => {
    const entityTypes = ['task', 'machine', 'incident', 'contract'];

    entityTypes.forEach((entityType) => {
      it(`should upload file for ${entityType} entity`, async () => {
        // Arrange
        mockFilesService.uploadFile.mockResolvedValue({
          ...mockFile,
          entity_type: entityType,
        } as File);

        // Act
        await controller.uploadFile(
          mockMulterFile,
          entityType,
          `${entityType}-123`,
          'document',
          'user-123',
        );

        // Assert
        expect(mockFilesService.uploadFile).toHaveBeenCalledWith(
          expect.any(Object),
          entityType,
          `${entityType}-123`,
          'document',
          'user-123',
          undefined,
          undefined,
        );
      });
    });
  });
});
