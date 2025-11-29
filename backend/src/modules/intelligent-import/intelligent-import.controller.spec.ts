import { Test, TestingModule } from '@nestjs/testing';
import { IntelligentImportController } from './intelligent-import.controller';
import { IntelligentImportService } from './intelligent-import.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ImportSession } from './entities/import-session.entity';
import { ImportTemplate } from './entities/import-template.entity';
import { DomainType, ImportSessionStatus } from './interfaces/common.interface';
import { ApprovalAction } from './dto/approval.dto';

describe('IntelligentImportController', () => {
  let controller: IntelligentImportController;
  let mockImportService: jest.Mocked<IntelligentImportService>;

  const mockSession: Partial<ImportSession> = {
    id: 'session-123',
    domain: DomainType.SALES,
    status: ImportSessionStatus.COMPLETED,
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
    mockImportService = {
      startImport: jest.fn(),
      getSession: jest.fn(),
      getSessions: jest.fn(),
      approveSession: jest.fn(),
      rejectSession: jest.fn(),
      getTemplates: jest.fn(),
      deleteSession: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [IntelligentImportController],
      providers: [
        {
          provide: IntelligentImportService,
          useValue: mockImportService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<IntelligentImportController>(IntelligentImportController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadFile', () => {
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

    const mockRequest = {
      user: { sub: 'user-123' },
    } as any;

    it('should upload file and start import', async () => {
      // Arrange
      const expectedResult = {
        sessionId: 'session-123',
        status: ImportSessionStatus.COMPLETED,
        message: 'Import completed successfully',
      };
      mockImportService.startImport.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.uploadFile(mockFile, mockRequest);

      // Assert
      expect(mockImportService.startImport).toHaveBeenCalledWith(mockFile, 'user-123');
      expect(result).toEqual(expectedResult);
    });

    it('should extract userId from request', async () => {
      // Arrange
      mockImportService.startImport.mockResolvedValue({
        sessionId: 'session-123',
        status: ImportSessionStatus.COMPLETED,
        message: 'Success',
      });

      // Act
      await controller.uploadFile(mockFile, mockRequest);

      // Assert
      expect(mockImportService.startImport).toHaveBeenCalledWith(expect.any(Object), 'user-123');
    });
  });

  describe('getSessions', () => {
    it('should return all sessions without filters', async () => {
      // Arrange
      const sessions = [mockSession as ImportSession];
      mockImportService.getSessions.mockResolvedValue(sessions);

      // Act
      const result = await controller.getSessions();

      // Assert
      expect(mockImportService.getSessions).toHaveBeenCalledWith(undefined, undefined, undefined);
      expect(result).toEqual(sessions);
    });

    it('should pass status filter to service', async () => {
      // Arrange
      mockImportService.getSessions.mockResolvedValue([]);

      // Act
      await controller.getSessions(ImportSessionStatus.COMPLETED);

      // Assert
      expect(mockImportService.getSessions).toHaveBeenCalledWith(
        ImportSessionStatus.COMPLETED,
        undefined,
        undefined,
      );
    });

    it('should pass domain filter to service', async () => {
      // Arrange
      mockImportService.getSessions.mockResolvedValue([]);

      // Act
      await controller.getSessions(undefined, DomainType.SALES);

      // Assert
      expect(mockImportService.getSessions).toHaveBeenCalledWith(
        undefined,
        DomainType.SALES,
        undefined,
      );
    });

    it('should pass userId filter to service', async () => {
      // Arrange
      mockImportService.getSessions.mockResolvedValue([]);

      // Act
      await controller.getSessions(undefined, undefined, 'user-123');

      // Assert
      expect(mockImportService.getSessions).toHaveBeenCalledWith(undefined, undefined, 'user-123');
    });

    it('should pass all filters to service', async () => {
      // Arrange
      mockImportService.getSessions.mockResolvedValue([]);

      // Act
      await controller.getSessions(ImportSessionStatus.FAILED, DomainType.INVENTORY, 'user-456');

      // Assert
      expect(mockImportService.getSessions).toHaveBeenCalledWith(
        ImportSessionStatus.FAILED,
        DomainType.INVENTORY,
        'user-456',
      );
    });
  });

  describe('getSession', () => {
    it('should return session by ID', async () => {
      // Arrange
      mockImportService.getSession.mockResolvedValue(mockSession as ImportSession);

      // Act
      const result = await controller.getSession('session-123');

      // Assert
      expect(mockImportService.getSession).toHaveBeenCalledWith('session-123');
      expect(result).toEqual(mockSession);
    });
  });

  describe('handleApproval', () => {
    const mockRequest = {
      user: { sub: 'admin-123' },
    } as any;

    it('should approve session when action is APPROVE', async () => {
      // Arrange
      mockImportService.approveSession.mockResolvedValue({
        ...mockSession,
        status: ImportSessionStatus.COMPLETED,
      } as ImportSession);

      // Act
      const result = await controller.handleApproval(
        'session-123',
        { action: ApprovalAction.APPROVE },
        mockRequest,
      );

      // Assert
      expect(mockImportService.approveSession).toHaveBeenCalledWith('session-123', 'admin-123');
      expect(result.status).toBe(ImportSessionStatus.COMPLETED);
    });

    it('should reject session when action is REJECT', async () => {
      // Arrange
      mockImportService.rejectSession.mockResolvedValue({
        ...mockSession,
        status: ImportSessionStatus.CANCELLED,
      } as ImportSession);

      // Act
      const result = await controller.handleApproval(
        'session-123',
        { action: ApprovalAction.REJECT, reason: 'Invalid data' },
        mockRequest,
      );

      // Assert
      expect(mockImportService.rejectSession).toHaveBeenCalledWith(
        'session-123',
        'admin-123',
        'Invalid data',
      );
      expect(result.status).toBe(ImportSessionStatus.CANCELLED);
    });

    it('should use default reason when rejecting without reason', async () => {
      // Arrange
      mockImportService.rejectSession.mockResolvedValue({
        ...mockSession,
        status: ImportSessionStatus.CANCELLED,
      } as ImportSession);

      // Act
      await controller.handleApproval(
        'session-123',
        { action: ApprovalAction.REJECT },
        mockRequest,
      );

      // Assert
      expect(mockImportService.rejectSession).toHaveBeenCalledWith(
        'session-123',
        'admin-123',
        'No reason provided',
      );
    });
  });

  describe('getTemplates', () => {
    it('should return all templates without domain filter', async () => {
      // Arrange
      const templates = [mockTemplate as ImportTemplate];
      mockImportService.getTemplates.mockResolvedValue(templates);

      // Act
      const result = await controller.getTemplates();

      // Assert
      expect(mockImportService.getTemplates).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(templates);
    });

    it('should filter templates by domain', async () => {
      // Arrange
      mockImportService.getTemplates.mockResolvedValue([]);

      // Act
      await controller.getTemplates(DomainType.MACHINES);

      // Assert
      expect(mockImportService.getTemplates).toHaveBeenCalledWith(DomainType.MACHINES);
    });
  });

  describe('deleteSession', () => {
    it('should delete session by ID', async () => {
      // Arrange
      mockImportService.deleteSession.mockResolvedValue(undefined);

      // Act
      await controller.deleteSession('session-123');

      // Assert
      expect(mockImportService.deleteSession).toHaveBeenCalledWith('session-123');
    });
  });
});
