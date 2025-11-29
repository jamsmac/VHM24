import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FilesService } from './files.service';
import { File } from './entities/file.entity';
import { S3StorageService } from './s3-storage.service';

describe('FilesService', () => {
  let service: FilesService;
  let mockFileRepository: jest.Mocked<Repository<File>>;
  let mockS3StorageService: jest.Mocked<S3StorageService>;

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
    mockFileRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      softRemove: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ size: '1048576' }),
        getRawMany: jest.fn().mockResolvedValue([{ category: 'task_photo_before', count: '10' }]),
        getMany: jest.fn().mockResolvedValue([]),
      }),
    } as any;

    mockS3StorageService = {
      uploadFile: jest.fn().mockResolvedValue('task/task-123/task_photo_before/file.jpg'),
      getSignedUrl: jest.fn().mockResolvedValue('https://signed-url.example.com/file.jpg'),
      getFile: jest.fn().mockResolvedValue(Buffer.from('file content')),
      getFileStream: jest.fn().mockResolvedValue({ pipe: jest.fn() }),
      deleteFile: jest.fn().mockResolvedValue(undefined),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FilesService,
        {
          provide: getRepositoryToken(File),
          useValue: mockFileRepository,
        },
        {
          provide: S3StorageService,
          useValue: mockS3StorageService,
        },
      ],
    }).compile();

    service = module.get<FilesService>(FilesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadFile', () => {
    it('should upload valid image file successfully', async () => {
      // Arrange
      mockFileRepository.create.mockReturnValue(mockFile as File);
      mockFileRepository.save.mockResolvedValue(mockFile as File);

      // Act
      const result = await service.uploadFile(
        mockMulterFile,
        'task',
        'task-123',
        'task_photo_before',
        'user-123',
        'Test description',
        ['test', 'photo'],
      );

      // Assert
      expect(mockS3StorageService.uploadFile).toHaveBeenCalledWith(
        expect.stringContaining('task/task-123/task_photo_before/'),
        mockMulterFile.buffer,
        expect.objectContaining({
          contentType: 'image/jpeg',
          uploadedBy: 'user-123',
          category: 'task_photo_before',
          originalFilename: 'test-image.jpg',
        }),
        'image/jpeg',
      );
      expect(mockFileRepository.create).toHaveBeenCalled();
      expect(mockFileRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockFile);
    });

    it('should upload valid PNG file successfully', async () => {
      // Arrange
      const pngFile = { ...mockMulterFile, mimetype: 'image/png', originalname: 'test.png' };
      mockFileRepository.create.mockReturnValue(mockFile as File);
      mockFileRepository.save.mockResolvedValue(mockFile as File);

      // Act
      const result = await service.uploadFile(
        pngFile,
        'task',
        'task-123',
        'task_photo_before',
        'user-123',
      );

      // Assert
      expect(mockS3StorageService.uploadFile).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should upload valid PDF file successfully', async () => {
      // Arrange
      const pdfFile = {
        ...mockMulterFile,
        mimetype: 'application/pdf',
        originalname: 'document.pdf',
      };
      mockFileRepository.create.mockReturnValue(mockFile as File);
      mockFileRepository.save.mockResolvedValue(mockFile as File);

      // Act
      const result = await service.uploadFile(
        pdfFile,
        'contract',
        'contract-123',
        'contract_document',
        'user-123',
      );

      // Assert
      expect(result).toBeDefined();
    });

    it('should upload valid Excel file successfully', async () => {
      // Arrange
      const xlsxFile = {
        ...mockMulterFile,
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        originalname: 'report.xlsx',
      };
      mockFileRepository.create.mockReturnValue(mockFile as File);
      mockFileRepository.save.mockResolvedValue(mockFile as File);

      // Act
      const result = await service.uploadFile(
        xlsxFile,
        'report',
        'report-123',
        'sales_report',
        'user-123',
      );

      // Assert
      expect(result).toBeDefined();
    });

    it('should upload valid CSV file successfully', async () => {
      // Arrange
      const csvFile = {
        ...mockMulterFile,
        mimetype: 'text/csv',
        originalname: 'data.csv',
      };
      mockFileRepository.create.mockReturnValue(mockFile as File);
      mockFileRepository.save.mockResolvedValue(mockFile as File);

      // Act
      const result = await service.uploadFile(
        csvFile,
        'import',
        'import-123',
        'sales_import',
        'user-123',
      );

      // Assert
      expect(result).toBeDefined();
    });

    it('should throw BadRequestException for invalid MIME type', async () => {
      // Arrange
      const invalidFile = { ...mockMulterFile, mimetype: 'application/exe' };

      // Act & Assert
      await expect(
        service.uploadFile(invalidFile, 'task', 'task-123', 'category', 'user-123'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.uploadFile(invalidFile, 'task', 'task-123', 'category', 'user-123'),
      ).rejects.toThrow('Недопустимый тип файла');
    });

    it('should throw BadRequestException for invalid extension', async () => {
      // Arrange
      const invalidFile = {
        ...mockMulterFile,
        mimetype: 'image/jpeg',
        originalname: 'test.exe',
      };

      // Act & Assert
      await expect(
        service.uploadFile(invalidFile, 'task', 'task-123', 'category', 'user-123'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.uploadFile(invalidFile, 'task', 'task-123', 'category', 'user-123'),
      ).rejects.toThrow('Недопустимое расширение файла');
    });

    it('should throw BadRequestException when file exceeds maximum size', async () => {
      // Arrange
      const largeFile = { ...mockMulterFile, size: 20_000_000 }; // 20MB

      // Act & Assert
      await expect(
        service.uploadFile(largeFile, 'task', 'task-123', 'category', 'user-123'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.uploadFile(largeFile, 'task', 'task-123', 'category', 'user-123'),
      ).rejects.toThrow('Размер файла превышает');
    });

    it('should generate correct S3 key format', async () => {
      // Arrange
      mockFileRepository.create.mockReturnValue(mockFile as File);
      mockFileRepository.save.mockResolvedValue(mockFile as File);

      // Act
      await service.uploadFile(
        mockMulterFile,
        'machine',
        'machine-456',
        'machine_photo',
        'user-789',
      );

      // Assert
      expect(mockS3StorageService.uploadFile).toHaveBeenCalledWith(
        expect.stringMatching(/^machine\/machine-456\/machine_photo\/\d+-[a-f0-9-]+\.jpg$/),
        expect.any(Buffer),
        expect.any(Object),
        expect.any(String),
      );
    });

    it('should handle optional description and tags', async () => {
      // Arrange
      mockFileRepository.create.mockReturnValue(mockFile as File);
      mockFileRepository.save.mockResolvedValue(mockFile as File);

      // Act
      await service.uploadFile(mockMulterFile, 'task', 'task-123', 'task_photo_before', 'user-123');

      // Assert
      expect(mockFileRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          description: undefined,
          tags: [],
        }),
      );
    });
  });

  describe('getFileUrl', () => {
    it('should return signed URL for existing file', async () => {
      // Arrange
      mockFileRepository.findOne.mockResolvedValue(mockFile as File);

      // Act
      const result = await service.getFileUrl('file-123');

      // Assert
      expect(mockFileRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'file-123' },
        relations: ['uploaded_by'],
      });
      expect(mockS3StorageService.getSignedUrl).toHaveBeenCalledWith(mockFile.file_path, 3600);
      expect(result).toBe('https://signed-url.example.com/file.jpg');
    });

    it('should use custom expiration time', async () => {
      // Arrange
      mockFileRepository.findOne.mockResolvedValue(mockFile as File);

      // Act
      await service.getFileUrl('file-123', 7200);

      // Assert
      expect(mockS3StorageService.getSignedUrl).toHaveBeenCalledWith(mockFile.file_path, 7200);
    });

    it('should throw NotFoundException when file not found', async () => {
      // Arrange
      mockFileRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getFileUrl('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getFileBuffer', () => {
    it('should return file buffer from S3', async () => {
      // Arrange
      mockFileRepository.findOne.mockResolvedValue(mockFile as File);
      const expectedBuffer = Buffer.from('test content');
      mockS3StorageService.getFile.mockResolvedValue(expectedBuffer);

      // Act
      const result = await service.getFileBuffer('file-123');

      // Assert
      expect(mockS3StorageService.getFile).toHaveBeenCalledWith(mockFile.file_path);
      expect(result).toEqual(expectedBuffer);
    });

    it('should throw NotFoundException when file not found', async () => {
      // Arrange
      mockFileRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getFileBuffer('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getFileStream', () => {
    it('should return file stream from S3', async () => {
      // Arrange
      mockFileRepository.findOne.mockResolvedValue(mockFile as File);
      const mockStream = { pipe: jest.fn() };
      mockS3StorageService.getFileStream.mockResolvedValue(mockStream as any);

      // Act
      const result = await service.getFileStream('file-123');

      // Assert
      expect(mockS3StorageService.getFileStream).toHaveBeenCalledWith(mockFile.file_path);
      expect(result).toEqual(mockStream);
    });

    it('should throw NotFoundException when file not found', async () => {
      // Arrange
      mockFileRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getFileStream('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return all files without filters', async () => {
      // Arrange
      const files = [mockFile as File];
      const queryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(files),
      };
      mockFileRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      // Act
      const result = await service.findAll();

      // Assert
      expect(queryBuilder.orderBy).toHaveBeenCalledWith('file.created_at', 'DESC');
      expect(queryBuilder.andWhere).not.toHaveBeenCalled();
      expect(result).toEqual(files);
    });

    it('should filter by entityType', async () => {
      // Arrange
      const queryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      mockFileRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      // Act
      await service.findAll('task');

      // Assert
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('file.entity_type = :entityType', {
        entityType: 'task',
      });
    });

    it('should filter by entityId', async () => {
      // Arrange
      const queryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      mockFileRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      // Act
      await service.findAll(undefined, 'task-123');

      // Assert
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('file.entity_id = :entityId', {
        entityId: 'task-123',
      });
    });

    it('should filter by categoryCode', async () => {
      // Arrange
      const queryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      mockFileRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      // Act
      await service.findAll(undefined, undefined, 'task_photo_before');

      // Assert
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('file.category_code = :categoryCode', {
        categoryCode: 'task_photo_before',
      });
    });

    it('should apply all filters together', async () => {
      // Arrange
      const queryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      mockFileRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      // Act
      await service.findAll('task', 'task-123', 'task_photo_before');

      // Assert
      expect(queryBuilder.andWhere).toHaveBeenCalledTimes(3);
    });
  });

  describe('findOne', () => {
    it('should return file when found', async () => {
      // Arrange
      mockFileRepository.findOne.mockResolvedValue(mockFile as File);

      // Act
      const result = await service.findOne('file-123');

      // Assert
      expect(mockFileRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'file-123' },
        relations: ['uploaded_by'],
      });
      expect(result).toEqual(mockFile);
    });

    it('should throw NotFoundException when file not found', async () => {
      // Arrange
      mockFileRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('non-existent')).rejects.toThrow(
        'Файл с ID non-existent не найден',
      );
    });
  });

  describe('remove', () => {
    it('should delete file from S3 and database', async () => {
      // Arrange
      mockFileRepository.findOne.mockResolvedValue(mockFile as File);
      mockFileRepository.softRemove.mockResolvedValue(mockFile as File);

      // Act
      await service.remove('file-123');

      // Assert
      expect(mockS3StorageService.deleteFile).toHaveBeenCalledWith(mockFile.file_path);
      expect(mockFileRepository.softRemove).toHaveBeenCalledWith(mockFile);
    });

    it('should soft delete from database even if S3 delete fails', async () => {
      // Arrange
      mockFileRepository.findOne.mockResolvedValue(mockFile as File);
      mockS3StorageService.deleteFile.mockRejectedValue(new Error('S3 error'));
      mockFileRepository.softRemove.mockResolvedValue(mockFile as File);
      const loggerErrorSpy = jest.spyOn((service as any).logger, 'error');

      // Act
      await service.remove('file-123');

      // Assert
      expect(loggerErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Error deleting file'));
      expect(mockFileRepository.softRemove).toHaveBeenCalled();
    });

    it('should throw NotFoundException when file not found', async () => {
      // Arrange
      mockFileRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.remove('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByEntity', () => {
    it('should return files for specific entity', async () => {
      // Arrange
      const files = [mockFile as File];
      mockFileRepository.find.mockResolvedValue(files);

      // Act
      const result = await service.findByEntity('task', 'task-123');

      // Assert
      expect(mockFileRepository.find).toHaveBeenCalledWith({
        where: {
          entity_type: 'task',
          entity_id: 'task-123',
        },
        order: {
          created_at: 'DESC',
        },
      });
      expect(result).toEqual(files);
    });

    it('should return empty array when no files found', async () => {
      // Arrange
      mockFileRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.findByEntity('task', 'non-existent');

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('findByEntityAndCategory', () => {
    it('should return files for specific entity and category', async () => {
      // Arrange
      const files = [mockFile as File];
      mockFileRepository.find.mockResolvedValue(files);

      // Act
      const result = await service.findByEntityAndCategory('task', 'task-123', 'task_photo_before');

      // Assert
      expect(mockFileRepository.find).toHaveBeenCalledWith({
        where: {
          entity_type: 'task',
          entity_id: 'task-123',
          category_code: 'task_photo_before',
        },
        order: {
          created_at: 'DESC',
        },
      });
      expect(result).toEqual(files);
    });

    it('should return empty array when no files match criteria', async () => {
      // Arrange
      mockFileRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.findByEntityAndCategory(
        'task',
        'task-123',
        'non_existent_category',
      );

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('validateTaskPhotos', () => {
    it('should return valid status when both before and after photos exist', async () => {
      // Arrange
      const photosBefore = [{ ...mockFile, category_code: 'task_photo_before' } as File];
      const photosAfter = [{ ...mockFile, category_code: 'task_photo_after' } as File];
      mockFileRepository.find
        .mockResolvedValueOnce(photosBefore)
        .mockResolvedValueOnce(photosAfter);

      // Act
      const result = await service.validateTaskPhotos('task-123');

      // Assert
      expect(result).toEqual({
        hasPhotoBefore: true,
        hasPhotoAfter: true,
        photosBefore,
        photosAfter,
      });
    });

    it('should return invalid status when before photos missing', async () => {
      // Arrange
      const photosAfter = [{ ...mockFile, category_code: 'task_photo_after' } as File];
      mockFileRepository.find.mockResolvedValueOnce([]).mockResolvedValueOnce(photosAfter);

      // Act
      const result = await service.validateTaskPhotos('task-123');

      // Assert
      expect(result).toEqual({
        hasPhotoBefore: false,
        hasPhotoAfter: true,
        photosBefore: [],
        photosAfter,
      });
    });

    it('should return invalid status when after photos missing', async () => {
      // Arrange
      const photosBefore = [{ ...mockFile, category_code: 'task_photo_before' } as File];
      mockFileRepository.find.mockResolvedValueOnce(photosBefore).mockResolvedValueOnce([]);

      // Act
      const result = await service.validateTaskPhotos('task-123');

      // Assert
      expect(result).toEqual({
        hasPhotoBefore: true,
        hasPhotoAfter: false,
        photosBefore,
        photosAfter: [],
      });
    });

    it('should return invalid status when both photos missing', async () => {
      // Arrange
      mockFileRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.validateTaskPhotos('task-123');

      // Assert
      expect(result).toEqual({
        hasPhotoBefore: false,
        hasPhotoAfter: false,
        photosBefore: [],
        photosAfter: [],
      });
    });

    it('should call findByEntityAndCategory with correct parameters', async () => {
      // Arrange
      mockFileRepository.find.mockResolvedValue([]);

      // Act
      await service.validateTaskPhotos('task-456');

      // Assert
      expect(mockFileRepository.find).toHaveBeenCalledWith({
        where: {
          entity_type: 'task',
          entity_id: 'task-456',
          category_code: 'task_photo_before',
        },
        order: {
          created_at: 'DESC',
        },
      });
      expect(mockFileRepository.find).toHaveBeenCalledWith({
        where: {
          entity_type: 'task',
          entity_id: 'task-456',
          category_code: 'task_photo_after',
        },
        order: {
          created_at: 'DESC',
        },
      });
    });

    it('should handle multiple photos for before and after', async () => {
      // Arrange
      const photosBefore = [
        { ...mockFile, id: 'file-1', category_code: 'task_photo_before' } as File,
        { ...mockFile, id: 'file-2', category_code: 'task_photo_before' } as File,
      ];
      const photosAfter = [
        { ...mockFile, id: 'file-3', category_code: 'task_photo_after' } as File,
        { ...mockFile, id: 'file-4', category_code: 'task_photo_after' } as File,
        { ...mockFile, id: 'file-5', category_code: 'task_photo_after' } as File,
      ];
      mockFileRepository.find
        .mockResolvedValueOnce(photosBefore)
        .mockResolvedValueOnce(photosAfter);

      // Act
      const result = await service.validateTaskPhotos('task-123');

      // Assert
      expect(result.hasPhotoBefore).toBe(true);
      expect(result.hasPhotoAfter).toBe(true);
      expect(result.photosBefore.length).toBe(2);
      expect(result.photosAfter.length).toBe(3);
    });
  });

  describe('getStats', () => {
    it('should return file statistics', async () => {
      // Arrange
      mockFileRepository.count.mockResolvedValue(100);

      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ size: '104857600' }), // 100MB
        getRawMany: jest.fn().mockResolvedValue([
          { category: 'task_photo_before', count: '50' },
          { category: 'task_photo_after', count: '40' },
          { category: 'contract_document', count: '10' },
        ]),
      };
      mockFileRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      // Act
      const result = await service.getStats();

      // Assert
      expect(result).toEqual({
        total: 100,
        total_size_bytes: 104857600,
        total_size_mb: 100,
        by_category: [
          { category: 'task_photo_before', count: '50' },
          { category: 'task_photo_after', count: '40' },
          { category: 'contract_document', count: '10' },
        ],
      });
    });

    it('should handle zero files', async () => {
      // Arrange
      mockFileRepository.count.mockResolvedValue(0);

      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ size: null }),
        getRawMany: jest.fn().mockResolvedValue([]),
      };
      mockFileRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      // Act
      const result = await service.getStats();

      // Assert
      expect(result).toEqual({
        total: 0,
        total_size_bytes: 0,
        total_size_mb: 0,
        by_category: [],
      });
    });
  });

  describe('MIME type validation', () => {
    const validMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
    ];

    validMimeTypes.forEach((mimeType) => {
      it(`should accept ${mimeType}`, async () => {
        // Arrange
        const extension = mimeType.includes('jpeg')
          ? '.jpg'
          : mimeType.includes('png')
            ? '.png'
            : mimeType.includes('webp')
              ? '.webp'
              : mimeType.includes('gif')
                ? '.gif'
                : mimeType.includes('pdf')
                  ? '.pdf'
                  : mimeType.includes('ms-excel')
                    ? '.xls'
                    : mimeType.includes('spreadsheetml')
                      ? '.xlsx'
                      : '.csv';

        const file = {
          ...mockMulterFile,
          mimetype: mimeType,
          originalname: `test${extension}`,
        };
        mockFileRepository.create.mockReturnValue(mockFile as File);
        mockFileRepository.save.mockResolvedValue(mockFile as File);

        // Act & Assert
        await expect(
          service.uploadFile(file, 'task', 'task-123', 'category', 'user-123'),
        ).resolves.toBeDefined();
      });
    });

    const invalidMimeTypes = [
      'application/javascript',
      'application/x-executable',
      'application/x-msdownload',
      'text/html',
      'application/zip',
    ];

    invalidMimeTypes.forEach((mimeType) => {
      it(`should reject ${mimeType}`, async () => {
        // Arrange
        const file = {
          ...mockMulterFile,
          mimetype: mimeType,
          originalname: 'test.file',
        };

        // Act & Assert
        await expect(
          service.uploadFile(file, 'task', 'task-123', 'category', 'user-123'),
        ).rejects.toThrow(BadRequestException);
      });
    });
  });

  describe('Extension validation', () => {
    const validExtensions = [
      '.jpg',
      '.jpeg',
      '.png',
      '.webp',
      '.gif',
      '.pdf',
      '.xls',
      '.xlsx',
      '.csv',
    ];

    validExtensions.forEach((ext) => {
      it(`should accept ${ext} extension`, async () => {
        // Arrange
        const mimeTypeMap: Record<string, string> = {
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.webp': 'image/webp',
          '.gif': 'image/gif',
          '.pdf': 'application/pdf',
          '.xls': 'application/vnd.ms-excel',
          '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          '.csv': 'text/csv',
        };
        const file = {
          ...mockMulterFile,
          mimetype: mimeTypeMap[ext],
          originalname: `test${ext}`,
        };
        mockFileRepository.create.mockReturnValue(mockFile as File);
        mockFileRepository.save.mockResolvedValue(mockFile as File);

        // Act & Assert
        await expect(
          service.uploadFile(file, 'task', 'task-123', 'category', 'user-123'),
        ).resolves.toBeDefined();
      });
    });

    const invalidExtensions = ['.exe', '.sh', '.bat', '.js', '.php', '.html'];

    invalidExtensions.forEach((ext) => {
      it(`should reject ${ext} extension`, async () => {
        // Arrange
        const file = {
          ...mockMulterFile,
          mimetype: 'image/jpeg', // Valid MIME but invalid extension
          originalname: `test${ext}`,
        };

        // Act & Assert
        await expect(
          service.uploadFile(file, 'task', 'task-123', 'category', 'user-123'),
        ).rejects.toThrow(BadRequestException);
      });
    });
  });

  describe('File size validation', () => {
    it('should accept file at maximum size limit', async () => {
      // Arrange
      const file = { ...mockMulterFile, size: 10485760 }; // Exactly 10MB (default max)
      mockFileRepository.create.mockReturnValue(mockFile as File);
      mockFileRepository.save.mockResolvedValue(mockFile as File);

      // Act & Assert
      await expect(
        service.uploadFile(file, 'task', 'task-123', 'category', 'user-123'),
      ).resolves.toBeDefined();
    });

    it('should reject file exceeding maximum size', async () => {
      // Arrange
      const file = { ...mockMulterFile, size: 10485761 }; // Just over 10MB

      // Act & Assert
      await expect(
        service.uploadFile(file, 'task', 'task-123', 'category', 'user-123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept small files', async () => {
      // Arrange
      const file = { ...mockMulterFile, size: 1 }; // 1 byte
      mockFileRepository.create.mockReturnValue(mockFile as File);
      mockFileRepository.save.mockResolvedValue(mockFile as File);

      // Act & Assert
      await expect(
        service.uploadFile(file, 'task', 'task-123', 'category', 'user-123'),
      ).resolves.toBeDefined();
    });
  });

  describe('CRITICAL: Task Photo Validation for Manual Operations', () => {
    // These tests are CRITICAL as per VendHub's manual operations architecture
    // Tasks MUST have before/after photos to be completed

    it('should validate task has required photos before completion', async () => {
      // Arrange
      const taskId = 'refill-task-123';
      const photosBefore = [{ ...mockFile, category_code: 'task_photo_before' } as File];
      const photosAfter = [{ ...mockFile, category_code: 'task_photo_after' } as File];
      mockFileRepository.find
        .mockResolvedValueOnce(photosBefore)
        .mockResolvedValueOnce(photosAfter);

      // Act
      const result = await service.validateTaskPhotos(taskId);

      // Assert - CRITICAL: Both must be true for task completion
      expect(result.hasPhotoBefore).toBe(true);
      expect(result.hasPhotoAfter).toBe(true);
    });

    it('should detect missing before photos - TASK CANNOT BE COMPLETED', async () => {
      // Arrange
      const taskId = 'refill-task-456';
      mockFileRepository.find.mockResolvedValueOnce([]).mockResolvedValueOnce([mockFile as File]);

      // Act
      const result = await service.validateTaskPhotos(taskId);

      // Assert - CRITICAL: Task completion should be blocked
      expect(result.hasPhotoBefore).toBe(false);
      // This should trigger task completion rejection in TasksService
    });

    it('should detect missing after photos - TASK CANNOT BE COMPLETED', async () => {
      // Arrange
      const taskId = 'collection-task-789';
      mockFileRepository.find.mockResolvedValueOnce([mockFile as File]).mockResolvedValueOnce([]);

      // Act
      const result = await service.validateTaskPhotos(taskId);

      // Assert - CRITICAL: Task completion should be blocked
      expect(result.hasPhotoAfter).toBe(false);
      // This should trigger task completion rejection in TasksService
    });

    it('should return all photos for audit trail', async () => {
      // Arrange
      const taskId = 'audit-task-123';
      const photosBefore = [
        { ...mockFile, id: 'before-1' } as File,
        { ...mockFile, id: 'before-2' } as File,
      ];
      const photosAfter = [
        { ...mockFile, id: 'after-1' } as File,
        { ...mockFile, id: 'after-2' } as File,
      ];
      mockFileRepository.find
        .mockResolvedValueOnce(photosBefore)
        .mockResolvedValueOnce(photosAfter);

      // Act
      const result = await service.validateTaskPhotos(taskId);

      // Assert - All photos should be returned for audit purposes
      expect(result.photosBefore).toHaveLength(2);
      expect(result.photosAfter).toHaveLength(2);
    });
  });
});
