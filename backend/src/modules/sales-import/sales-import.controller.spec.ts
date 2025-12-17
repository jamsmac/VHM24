import { Test, TestingModule } from '@nestjs/testing';
import { Request } from 'express';
import { SalesImportController } from './sales-import.controller';
import { SalesImportService } from './sales-import.service';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { SalesImport, ImportStatus, ImportFileType } from './entities/sales-import.entity';

/** Mock authenticated request for testing */
type MockAuthRequest = { user: { id: string } } & Partial<Request>;

describe('SalesImportController', () => {
  let controller: SalesImportController;
  let mockSalesImportService: jest.Mocked<SalesImportService>;

  const mockImport: Partial<SalesImport> = {
    id: 'import-123',
    uploaded_by_user_id: 'user-123',
    filename: 'sales_report.xlsx',
    file_type: ImportFileType.EXCEL,
    status: ImportStatus.COMPLETED,
    total_rows: 100,
    success_rows: 98,
    failed_rows: 2,
    errors: null,
    summary: { total_amount: 500000, transactions_created: 98 },
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockFile: Express.Multer.File = {
    fieldname: 'file',
    originalname: 'sales_report.xlsx',
    encoding: '7bit',
    mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    size: 1024,
    buffer: Buffer.from('test'),
    stream: null as any,
    destination: '',
    filename: '',
    path: '',
  };

  beforeEach(async () => {
    mockSalesImportService = {
      uploadSalesFile: jest.fn(),
      findOne: jest.fn(),
      findAll: jest.fn(),
      retryImport: jest.fn(),
      getJobStatus: jest.fn(),
      remove: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SalesImportController],
      providers: [
        {
          provide: SalesImportService,
          useValue: mockSalesImportService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SalesImportController>(SalesImportController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadFile', () => {
    it('should upload file and return import record with job ID', async () => {
      // Arrange
      const expectedResult = {
        importRecord: mockImport as SalesImport,
        jobId: 'job-123',
      };
      mockSalesImportService.uploadSalesFile.mockResolvedValue(expectedResult);

      const mockRequest = { user: { id: 'user-123' } } as MockAuthRequest;

      // Act
      const result = await controller.uploadFile(mockFile, mockRequest as Parameters<typeof controller.uploadFile>[1]);

      // Assert
      expect(mockSalesImportService.uploadSalesFile).toHaveBeenCalledWith(mockFile, 'user-123');
      expect(result).toEqual(expectedResult);
    });

    it('should extract userId from request', async () => {
      // Arrange
      mockSalesImportService.uploadSalesFile.mockResolvedValue({
        importRecord: mockImport as SalesImport,
        jobId: 'job-456',
      });

      const mockRequest = { user: { id: 'admin-456' } } as MockAuthRequest;

      // Act
      await controller.uploadFile(mockFile, mockRequest as Parameters<typeof controller.uploadFile>[1]);

      // Assert
      expect(mockSalesImportService.uploadSalesFile).toHaveBeenCalledWith(
        expect.any(Object),
        'admin-456',
      );
    });
  });

  describe('findAll', () => {
    it('should return all imports without filters', async () => {
      // Arrange
      const imports = [mockImport as SalesImport];
      mockSalesImportService.findAll.mockResolvedValue(imports);

      // Act
      const result = await controller.findAll();

      // Assert
      expect(mockSalesImportService.findAll).toHaveBeenCalledWith(undefined, undefined);
      expect(result).toEqual(imports);
    });

    it('should pass status filter to service', async () => {
      // Arrange
      mockSalesImportService.findAll.mockResolvedValue([]);

      // Act
      await controller.findAll(ImportStatus.COMPLETED);

      // Assert
      expect(mockSalesImportService.findAll).toHaveBeenCalledWith(
        ImportStatus.COMPLETED,
        undefined,
      );
    });

    it('should pass userId filter to service', async () => {
      // Arrange
      mockSalesImportService.findAll.mockResolvedValue([]);

      // Act
      await controller.findAll(undefined, 'user-123');

      // Assert
      expect(mockSalesImportService.findAll).toHaveBeenCalledWith(undefined, 'user-123');
    });

    it('should pass both filters to service', async () => {
      // Arrange
      mockSalesImportService.findAll.mockResolvedValue([]);

      // Act
      await controller.findAll(ImportStatus.FAILED, 'user-456');

      // Assert
      expect(mockSalesImportService.findAll).toHaveBeenCalledWith(ImportStatus.FAILED, 'user-456');
    });
  });

  describe('findOne', () => {
    it('should return import by ID', async () => {
      // Arrange
      mockSalesImportService.findOne.mockResolvedValue(mockImport as SalesImport);

      // Act
      const result = await controller.findOne('import-123');

      // Assert
      expect(mockSalesImportService.findOne).toHaveBeenCalledWith('import-123');
      expect(result).toEqual(mockImport);
    });
  });

  describe('retry', () => {
    it('should retry failed import', async () => {
      // Arrange
      const retriedImport = { ...mockImport, status: ImportStatus.PENDING };
      mockSalesImportService.retryImport.mockResolvedValue(retriedImport as SalesImport);

      // Act
      const result = await controller.retry('import-123');

      // Assert
      expect(mockSalesImportService.retryImport).toHaveBeenCalledWith('import-123');
      expect(result.status).toBe(ImportStatus.PENDING);
    });
  });

  describe('getJobStatus', () => {
    it('should return job status', async () => {
      // Arrange
      const jobStatus = {
        jobId: 'job-123',
        state: 'completed',
        progress: 100,
        data: { importId: 'import-123' },
        failedReason: null,
        attemptsMade: 1,
        processedOn: Date.now(),
        finishedOn: Date.now(),
      };
      mockSalesImportService.getJobStatus.mockResolvedValue(jobStatus);

      // Act
      const result = await controller.getJobStatus('job-123');

      // Assert
      expect(mockSalesImportService.getJobStatus).toHaveBeenCalledWith('job-123');
      expect(result).toEqual(jobStatus);
    });

    it('should return failed job status with reason', async () => {
      // Arrange
      const failedJobStatus = {
        jobId: 'job-456',
        state: 'failed',
        progress: 50,
        data: { importId: 'import-456' },
        failedReason: 'Processing error',
        attemptsMade: 3,
        processedOn: Date.now(),
        finishedOn: null,
      };
      mockSalesImportService.getJobStatus.mockResolvedValue(failedJobStatus);

      // Act
      const result = await controller.getJobStatus('job-456');

      // Assert
      expect(result.state).toBe('failed');
      expect(result.failedReason).toBe('Processing error');
    });
  });

  describe('remove', () => {
    it('should delete import', async () => {
      // Arrange
      mockSalesImportService.remove.mockResolvedValue(undefined);

      // Act
      await controller.remove('import-123');

      // Assert
      expect(mockSalesImportService.remove).toHaveBeenCalledWith('import-123');
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete import workflow', async () => {
      // Arrange
      const uploadResult = {
        importRecord: { ...mockImport, status: ImportStatus.PENDING } as SalesImport,
        jobId: 'job-123',
      };
      const processingStatus = {
        jobId: 'job-123',
        state: 'active',
        progress: 50,
        data: { importId: 'import-123' },
        failedReason: null,
        attemptsMade: 1,
        processedOn: Date.now(),
        finishedOn: null,
      };
      const completedImport = { ...mockImport, status: ImportStatus.COMPLETED } as SalesImport;

      mockSalesImportService.uploadSalesFile.mockResolvedValue(uploadResult);
      mockSalesImportService.getJobStatus.mockResolvedValue(processingStatus);
      mockSalesImportService.findOne.mockResolvedValue(completedImport);

      // Act - Step 1: Upload
      const mockRequest = { user: { id: 'user-123' } } as MockAuthRequest;
      const upload = await controller.uploadFile(mockFile, mockRequest as Parameters<typeof controller.uploadFile>[1]);
      expect(upload.jobId).toBe('job-123');

      // Act - Step 2: Check status
      const status = await controller.getJobStatus('job-123');
      expect(status.state).toBe('active');

      // Act - Step 3: Get completed import
      const result = await controller.findOne('import-123');
      expect(result.status).toBe(ImportStatus.COMPLETED);
    });

    it('should handle failed import and retry', async () => {
      // Arrange
      const failedImport = { ...mockImport, status: ImportStatus.FAILED } as SalesImport;
      const retriedImport = { ...mockImport, status: ImportStatus.PENDING } as SalesImport;

      mockSalesImportService.findOne.mockResolvedValue(failedImport);
      mockSalesImportService.retryImport.mockResolvedValue(retriedImport);

      // Act - Step 1: Get failed import
      const failed = await controller.findOne('import-123');
      expect(failed.status).toBe(ImportStatus.FAILED);

      // Act - Step 2: Retry
      const retried = await controller.retry('import-123');
      expect(retried.status).toBe(ImportStatus.PENDING);
    });
  });

  describe('different import statuses', () => {
    const statuses = [
      ImportStatus.PENDING,
      ImportStatus.PROCESSING,
      ImportStatus.COMPLETED,
      ImportStatus.PARTIAL,
      ImportStatus.FAILED,
    ];

    statuses.forEach((status) => {
      it(`should correctly return import with ${status} status`, async () => {
        // Arrange
        mockSalesImportService.findAll.mockResolvedValue([
          { ...mockImport, status } as SalesImport,
        ]);

        // Act
        const result = await controller.findAll(status);

        // Assert
        expect(mockSalesImportService.findAll).toHaveBeenCalledWith(status, undefined);
        expect(result[0].status).toBe(status);
      });
    });
  });
});
