import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { IntelligentImportService } from './intelligent-import.service';
import { ImportSession } from './entities/import-session.entity';
import { ImportTemplate } from './entities/import-template.entity';
import { ImportWorkflow } from './workflows/import.workflow';
import { DomainType, ImportSessionStatus } from './interfaces/common.interface';

describe('IntelligentImportService', () => {
  let service: IntelligentImportService;
  let mockSessionRepo: jest.Mocked<Repository<ImportSession>>;
  let mockTemplateRepo: jest.Mocked<Repository<ImportTemplate>>;
  let mockImportWorkflow: jest.Mocked<ImportWorkflow>;

  const mockSession: Partial<ImportSession> = {
    id: 'session-123',
    domain: DomainType.SALES,
    status: ImportSessionStatus.PENDING,
    uploaded_by_user_id: 'user-123',
    file_metadata: { filename: 'test.csv', size: 1024 } as any,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockTemplate: Partial<ImportTemplate> = {
    id: 'template-123',
    name: 'Sales Template',
    domain: DomainType.SALES,
    active: true,
    use_count: 10,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    mockSessionRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      softRemove: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      }),
    } as any;

    mockTemplateRepo = {
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      }),
    } as any;

    mockImportWorkflow = {
      execute: jest.fn(),
      approve: jest.fn(),
      reject: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntelligentImportService,
        {
          provide: getRepositoryToken(ImportSession),
          useValue: mockSessionRepo,
        },
        {
          provide: getRepositoryToken(ImportTemplate),
          useValue: mockTemplateRepo,
        },
        {
          provide: ImportWorkflow,
          useValue: mockImportWorkflow,
        },
      ],
    }).compile();

    service = module.get<IntelligentImportService>(IntelligentImportService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('startImport', () => {
    const mockFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'sales.csv',
      encoding: '7bit',
      mimetype: 'text/csv',
      size: 1024,
      buffer: Buffer.from('test'),
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    };

    it('should start import workflow successfully', async () => {
      // Arrange
      const expectedResult = {
        sessionId: 'session-123',
        status: ImportSessionStatus.COMPLETED,
        message: 'Import completed successfully',
      };
      mockImportWorkflow.execute.mockResolvedValue(expectedResult);

      // Act
      const result = await service.startImport(mockFile, 'user-123');

      // Assert
      expect(mockImportWorkflow.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          buffer: mockFile.buffer,
          filename: mockFile.originalname,
          mimetype: mockFile.mimetype,
          size: mockFile.size,
        }),
        'user-123',
        undefined,
      );
      expect(result).toEqual(expectedResult);
    });

    it('should pass progress callback to workflow', async () => {
      // Arrange
      const onProgress = jest.fn();
      mockImportWorkflow.execute.mockResolvedValue({
        sessionId: 'session-123',
        status: ImportSessionStatus.COMPLETED,
        message: 'Success',
      });

      // Act
      await service.startImport(mockFile, 'user-123', onProgress);

      // Assert
      expect(mockImportWorkflow.execute).toHaveBeenCalledWith(
        expect.any(Object),
        'user-123',
        onProgress,
      );
    });

    it('should handle workflow failure', async () => {
      // Arrange
      mockImportWorkflow.execute.mockResolvedValue({
        sessionId: 'session-123',
        status: ImportSessionStatus.FAILED,
        message: 'Validation failed',
      });

      // Act
      const result = await service.startImport(mockFile, 'user-123');

      // Assert
      expect(result.status).toBe(ImportSessionStatus.FAILED);
    });
  });

  describe('getSession', () => {
    it('should return session when found', async () => {
      // Arrange
      mockSessionRepo.findOne.mockResolvedValue(mockSession as ImportSession);

      // Act
      const result = await service.getSession('session-123');

      // Assert
      expect(mockSessionRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'session-123' },
        relations: ['uploaded_by', 'approved_by', 'template'],
      });
      expect(result).toEqual(mockSession);
    });

    it('should throw NotFoundException when session not found', async () => {
      // Arrange
      mockSessionRepo.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getSession('non-existent')).rejects.toThrow(NotFoundException);
      await expect(service.getSession('non-existent')).rejects.toThrow(
        'Import session non-existent not found',
      );
    });
  });

  describe('getSessions', () => {
    it('should return all sessions without filters', async () => {
      // Arrange
      const sessions = [mockSession as ImportSession];
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(sessions),
      };
      mockSessionRepo.createQueryBuilder.mockReturnValue(queryBuilder as any);

      // Act
      const result = await service.getSessions();

      // Assert
      expect(queryBuilder.orderBy).toHaveBeenCalledWith('session.created_at', 'DESC');
      expect(queryBuilder.andWhere).not.toHaveBeenCalled();
      expect(result).toEqual(sessions);
    });

    it('should filter by status when provided', async () => {
      // Arrange
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      mockSessionRepo.createQueryBuilder.mockReturnValue(queryBuilder as any);

      // Act
      await service.getSessions(ImportSessionStatus.COMPLETED);

      // Assert
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('session.status = :status', {
        status: ImportSessionStatus.COMPLETED,
      });
    });

    it('should filter by domain when provided', async () => {
      // Arrange
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      mockSessionRepo.createQueryBuilder.mockReturnValue(queryBuilder as any);

      // Act
      await service.getSessions(undefined, DomainType.SALES);

      // Assert
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('session.domain = :domain', {
        domain: DomainType.SALES,
      });
    });

    it('should filter by userId when provided', async () => {
      // Arrange
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      mockSessionRepo.createQueryBuilder.mockReturnValue(queryBuilder as any);

      // Act
      await service.getSessions(undefined, undefined, 'user-123');

      // Assert
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('session.uploaded_by_user_id = :userId', {
        userId: 'user-123',
      });
    });

    it('should apply all filters together', async () => {
      // Arrange
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      mockSessionRepo.createQueryBuilder.mockReturnValue(queryBuilder as any);

      // Act
      await service.getSessions(ImportSessionStatus.COMPLETED, DomainType.SALES, 'user-123');

      // Assert
      expect(queryBuilder.andWhere).toHaveBeenCalledTimes(3);
    });
  });

  describe('approveSession', () => {
    it('should approve session and return updated session', async () => {
      // Arrange
      mockImportWorkflow.approve.mockResolvedValue({
        sessionId: 'session-123',
        status: ImportSessionStatus.COMPLETED,
        message: 'Success',
      });
      mockSessionRepo.findOne.mockResolvedValue({
        ...mockSession,
        status: ImportSessionStatus.COMPLETED,
      } as ImportSession);

      // Act
      const result = await service.approveSession('session-123', 'admin-123');

      // Assert
      expect(mockImportWorkflow.approve).toHaveBeenCalledWith('session-123', 'admin-123');
      expect(result.status).toBe(ImportSessionStatus.COMPLETED);
    });
  });

  describe('rejectSession', () => {
    it('should reject session with reason', async () => {
      // Arrange
      mockImportWorkflow.reject.mockResolvedValue(undefined);
      mockSessionRepo.findOne.mockResolvedValue({
        ...mockSession,
        status: ImportSessionStatus.CANCELLED,
      } as ImportSession);

      // Act
      const result = await service.rejectSession('session-123', 'admin-123', 'Invalid data');

      // Assert
      expect(mockImportWorkflow.reject).toHaveBeenCalledWith(
        'session-123',
        'admin-123',
        'Invalid data',
      );
      expect(result.status).toBe(ImportSessionStatus.CANCELLED);
    });
  });

  describe('getTemplates', () => {
    it('should return all active templates without domain filter', async () => {
      // Arrange
      const templates = [mockTemplate as ImportTemplate];
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(templates),
      };
      mockTemplateRepo.createQueryBuilder.mockReturnValue(queryBuilder as any);

      // Act
      const result = await service.getTemplates();

      // Assert
      expect(queryBuilder.where).toHaveBeenCalledWith('template.active = :active', {
        active: true,
      });
      expect(queryBuilder.orderBy).toHaveBeenCalledWith('template.use_count', 'DESC');
      expect(result).toEqual(templates);
    });

    it('should filter templates by domain when provided', async () => {
      // Arrange
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      mockTemplateRepo.createQueryBuilder.mockReturnValue(queryBuilder as any);

      // Act
      await service.getTemplates(DomainType.INVENTORY);

      // Assert
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('template.domain = :domain', {
        domain: DomainType.INVENTORY,
      });
    });
  });

  describe('deleteSession', () => {
    it('should soft delete existing session', async () => {
      // Arrange
      mockSessionRepo.findOne.mockResolvedValue(mockSession as ImportSession);
      mockSessionRepo.softRemove.mockResolvedValue(mockSession as ImportSession);

      // Act
      await service.deleteSession('session-123');

      // Assert
      expect(mockSessionRepo.findOne).toHaveBeenCalled();
      expect(mockSessionRepo.softRemove).toHaveBeenCalledWith(mockSession);
    });

    it('should throw NotFoundException when session not found', async () => {
      // Arrange
      mockSessionRepo.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.deleteSession('non-existent')).rejects.toThrow(NotFoundException);
    });
  });
});
