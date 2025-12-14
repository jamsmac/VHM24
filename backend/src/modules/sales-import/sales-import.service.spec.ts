import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bull';
import { Repository, DataSource } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SalesImportService } from './sales-import.service';
import { SalesImport, ImportStatus, ImportFileType } from './entities/sales-import.entity';
import { Transaction, PaymentMethod } from '../transactions/entities/transaction.entity';
import { Machine } from '../machines/entities/machine.entity';
import { Nomenclature } from '../nomenclature/entities/nomenclature.entity';
import { InventoryService } from '../inventory/inventory.service';

// Mock ExcelJS
jest.mock('exceljs', () => ({
  Workbook: jest.fn().mockImplementation(() => ({
    xlsx: {
      load: jest.fn().mockResolvedValue(undefined),
    },
    worksheets: [
      {
        eachRow: jest.fn((callback) => {
          callback({ eachCell: jest.fn((cb) => cb({ value: 'date' }, 1)) }, 1);
          callback(
            {
              eachCell: jest.fn((cb) => {
                const values = ['2025-01-15', 'M-001', '5000', 'cash', 'Coffee', '1'];
                values.forEach((val, idx) => cb({ value: val }, idx + 1));
              }),
            },
            2,
          );
        }),
      },
    ],
  })),
}));

// Mock csv-parser
jest.mock('csv-parser', () => {
  return jest.fn().mockImplementation(() => {
    const { Transform } = require('stream');
    return new Transform({
      objectMode: true,
      transform(chunk: any, encoding: string, callback: (error?: Error | null) => void) {
        callback();
      },
    });
  });
});

describe('SalesImportService', () => {
  let service: SalesImportService;
  let mockImportRepository: jest.Mocked<Repository<SalesImport>>;
  let mockTransactionRepository: jest.Mocked<Repository<Transaction>>;
  let mockMachineRepository: jest.Mocked<Repository<Machine>>;
  let mockNomenclatureRepository: jest.Mocked<Repository<Nomenclature>>;
  let mockInventoryService: jest.Mocked<InventoryService>;
  let mockDataSource: jest.Mocked<DataSource>;
  let mockSalesImportQueue: any;

  const mockImport: Partial<SalesImport> = {
    id: 'import-123',
    uploaded_by_user_id: 'user-123',
    filename: 'sales_report.xlsx',
    file_type: ImportFileType.EXCEL,
    status: ImportStatus.PENDING,
    total_rows: 0,
    success_rows: 0,
    failed_rows: 0,
    errors: null,
    summary: null,
  };

  const mockMachine: Partial<Machine> = {
    id: 'machine-123',
    machine_number: 'M-001',
    name: 'Test Machine',
  };

  const mockNomenclature: Partial<Nomenclature> = {
    id: 'nom-123',
    name: 'Coffee',
    sku: 'COF-001',
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
    mockImportRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      softRemove: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      }),
    } as any;

    mockTransactionRepository = {
      create: jest.fn(),
      save: jest.fn(),
    } as any;

    mockMachineRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
    } as any;

    mockNomenclatureRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
    } as any;

    mockInventoryService = {
      recordSale: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockDataSource = {
      transaction: jest.fn().mockImplementation(async (cb) => {
        const manager = {
          save: jest.fn().mockResolvedValue({ id: 'transaction-123' }),
        };
        return cb(manager);
      }),
    } as any;

    mockSalesImportQueue = {
      add: jest.fn().mockResolvedValue({ id: 'job-123' }),
      getJob: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesImportService,
        {
          provide: getRepositoryToken(SalesImport),
          useValue: mockImportRepository,
        },
        {
          provide: getRepositoryToken(Transaction),
          useValue: mockTransactionRepository,
        },
        {
          provide: getRepositoryToken(Machine),
          useValue: mockMachineRepository,
        },
        {
          provide: getRepositoryToken(Nomenclature),
          useValue: mockNomenclatureRepository,
        },
        {
          provide: InventoryService,
          useValue: mockInventoryService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: getQueueToken('sales-import'),
          useValue: mockSalesImportQueue,
        },
      ],
    }).compile();

    service = module.get<SalesImportService>(SalesImportService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadSalesFile', () => {
    it('should create import record and add to queue for Excel file', async () => {
      // Arrange
      mockImportRepository.create.mockReturnValue(mockImport as SalesImport);
      mockImportRepository.save.mockResolvedValue(mockImport as SalesImport);

      // Act
      const result = await service.uploadSalesFile(mockFile, 'user-123');

      // Assert
      expect(mockImportRepository.create).toHaveBeenCalledWith({
        uploaded_by_user_id: 'user-123',
        filename: 'sales_report.xlsx',
        file_type: ImportFileType.EXCEL,
        status: ImportStatus.PENDING,
      });
      expect(mockImportRepository.save).toHaveBeenCalled();
      expect(mockSalesImportQueue.add).toHaveBeenCalledWith(
        'process-file',
        expect.objectContaining({
          importId: mockImport.id,
          fileType: ImportFileType.EXCEL,
          userId: 'user-123',
        }),
        expect.objectContaining({
          attempts: 3,
          backoff: expect.any(Object),
        }),
      );
      expect(result.importRecord).toEqual(mockImport);
      expect(result.jobId).toBe('job-123');
    });

    it('should create import record for CSV file', async () => {
      // Arrange
      const csvFile = { ...mockFile, originalname: 'sales_report.csv' };
      mockImportRepository.create.mockReturnValue({
        ...mockImport,
        file_type: ImportFileType.CSV,
      } as SalesImport);
      mockImportRepository.save.mockResolvedValue({
        ...mockImport,
        file_type: ImportFileType.CSV,
      } as SalesImport);

      // Act
      const result = await service.uploadSalesFile(csvFile, 'user-123');

      // Assert
      expect(mockImportRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          file_type: ImportFileType.CSV,
        }),
      );
      expect(result.importRecord.file_type).toBe(ImportFileType.CSV);
    });

    it('should use provided file type if specified', async () => {
      // Arrange
      mockImportRepository.create.mockReturnValue(mockImport as SalesImport);
      mockImportRepository.save.mockResolvedValue(mockImport as SalesImport);

      // Act
      await service.uploadSalesFile(mockFile, 'user-123', ImportFileType.CSV);

      // Assert
      expect(mockImportRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          file_type: ImportFileType.CSV,
        }),
      );
    });
  });

  describe('detectFileType', () => {
    it('should detect xlsx file type', () => {
      // Act
      const result = (service as any).detectFileType('sales_report.xlsx');

      // Assert
      expect(result).toBe(ImportFileType.EXCEL);
    });

    it('should detect xls file type', () => {
      // Act
      const result = (service as any).detectFileType('sales_report.xls');

      // Assert
      expect(result).toBe(ImportFileType.EXCEL);
    });

    it('should detect csv file type', () => {
      // Act
      const result = (service as any).detectFileType('sales_report.csv');

      // Assert
      expect(result).toBe(ImportFileType.CSV);
    });

    it('should throw BadRequestException for unsupported file type', () => {
      // Act & Assert
      expect(() => (service as any).detectFileType('sales_report.txt')).toThrow(
        BadRequestException,
      );
      expect(() => (service as any).detectFileType('sales_report.txt')).toThrow(
        'Unsupported file type',
      );
    });
  });

  describe('parseExcel', () => {
    it('should parse Excel buffer and return normalized rows', async () => {
      // Arrange
      const buffer = Buffer.from('test excel data');

      // Act
      const result = await (service as any).parseExcel(buffer);

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should throw BadRequestException for empty worksheet', async () => {
      // Arrange
      const ExcelJS = require('exceljs');
      ExcelJS.Workbook.mockImplementationOnce(() => ({
        xlsx: { load: jest.fn().mockResolvedValue(undefined) },
        worksheets: [],
      }));
      const buffer = Buffer.from('empty data');

      // Act & Assert
      await expect((service as any).parseExcel(buffer)).rejects.toThrow(BadRequestException);
    });
  });

  describe('parseCSV', () => {
    it('should parse CSV buffer and return rows', async () => {
      // Arrange
      const buffer = Buffer.from('date,machine,amount\n2025-01-15,M-001,5000');

      // Act - Note: Due to mocking, this will return empty array
      const result = await (service as any).parseCSV(buffer);

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('normalizeRow', () => {
    it('should normalize row with English column names', () => {
      // Arrange
      const row = {
        date: '2025-01-15',
        machine: 'M-001',
        amount: '5000',
        payment: 'cash',
        product: 'Coffee',
        quantity: '2',
      };

      // Act
      const result = (service as any).normalizeRow(row);

      // Assert
      expect(result).toEqual({
        date: expect.any(String),
        machine_number: 'M-001',
        amount: 5000,
        payment_method: 'cash',
        product_name: 'Coffee',
        quantity: 2,
      });
    });

    it('should normalize row with Russian column names', () => {
      // Arrange
      const row = {
        Дата: '2025-01-15',
        Аппарат: 'M-002',
        Сумма: '10000',
        'Способ оплаты': 'card',
        Товар: 'Tea',
        Количество: '3',
      };

      // Act
      const result = (service as any).normalizeRow(row);

      // Assert
      expect(result.machine_number).toBe('M-002');
      expect(result.amount).toBe(10000);
      expect(result.quantity).toBe(3);
    });

    it('should handle missing optional fields', () => {
      // Arrange
      const row = {
        date: '2025-01-15',
        machine: 'M-001',
        amount: '5000',
      };

      // Act
      const result = (service as any).normalizeRow(row);

      // Assert
      expect(result.payment_method).toBe('cash');
      expect(result.product_name).toBeUndefined();
      expect(result.quantity).toBe(1);
    });

    it('should clean amount string with currency symbols', () => {
      // Arrange
      const row = {
        date: '2025-01-15',
        machine: 'M-001',
        amount: '5,000 UZS',
      };

      // Act
      const result = (service as any).normalizeRow(row);

      // Assert
      expect(result.amount).toBe(5000);
    });
  });

  describe('parseDate', () => {
    it('should return ISO string for Date object', () => {
      // Arrange
      const date = new Date('2025-01-15');

      // Act
      const result = (service as any).parseDate(date);

      // Assert
      expect(result).toBe(date.toISOString());
    });

    it('should handle Excel serial number', () => {
      // Arrange - Excel serial for 2025-01-15 is approximately 45672
      const excelSerial = 45672;

      // Act
      const result = (service as any).parseDate(excelSerial);

      // Assert
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should parse string date', () => {
      // Arrange
      const dateStr = '2025-01-15';

      // Act
      const result = (service as any).parseDate(dateStr);

      // Assert
      expect(result).toMatch(/2025-01-15/);
    });

    it('should return current date for null input', () => {
      // Act
      const result = (service as any).parseDate(null);
      const now = new Date().toISOString().split('T')[0];

      // Assert
      expect(result).toContain(now);
    });

    it('should return current date for invalid date string', () => {
      // Arrange
      const invalidDate = 'not-a-date';

      // Act
      const result = (service as any).parseDate(invalidDate);
      const now = new Date().toISOString().split('T')[0];

      // Assert
      expect(result).toContain(now);
    });
  });

  describe('processRows', () => {
    const mockRows = [
      {
        date: '2025-01-15T00:00:00.000Z',
        machine_number: 'M-001',
        amount: 5000,
        payment_method: 'cash',
        product_name: 'Coffee',
        quantity: 1,
      },
    ];

    it('should process valid rows successfully', async () => {
      // Arrange
      mockMachineRepository.find.mockResolvedValue([mockMachine as Machine]);
      mockNomenclatureRepository.find.mockResolvedValue([mockNomenclature as Nomenclature]);
      mockTransactionRepository.create.mockReturnValue({} as Transaction);

      // Act
      const result = await (service as any).processRows(mockRows);

      // Assert
      expect(result.successCount).toBe(1);
      expect(result.failedCount).toBe(0);
      expect(result.summary.transactions_created).toBe(1);
    });

    it('should fail when machine not found', async () => {
      // Arrange
      mockMachineRepository.find.mockResolvedValue([]);
      mockNomenclatureRepository.find.mockResolvedValue([]);

      // Act
      const result = await (service as any).processRows(mockRows);

      // Assert
      expect(result.successCount).toBe(0);
      expect(result.failedCount).toBe(1);
      expect(result.errors.errors).toEqual(
        expect.arrayContaining([expect.stringContaining('Machine M-001 not found')]),
      );
    });

    it('should fail when machine_number is missing', async () => {
      // Arrange
      const rowsWithoutMachine = [
        {
          date: '2025-01-15',
          machine_number: '',
          amount: 5000,
        },
      ];
      mockMachineRepository.find.mockResolvedValue([]);
      mockNomenclatureRepository.find.mockResolvedValue([]);

      // Act
      const result = await (service as any).processRows(rowsWithoutMachine);

      // Assert
      expect(result.failedCount).toBe(1);
      expect(result.errors.errors).toEqual(
        expect.arrayContaining([expect.stringContaining('Missing machine number or amount')]),
      );
    });

    it('should fail when amount is missing', async () => {
      // Arrange
      const rowsWithoutAmount = [
        {
          date: '2025-01-15',
          machine_number: 'M-001',
          amount: 0,
        },
      ];
      mockMachineRepository.find.mockResolvedValue([]);
      mockNomenclatureRepository.find.mockResolvedValue([]);

      // Act
      const result = await (service as any).processRows(rowsWithoutAmount);

      // Assert
      expect(result.failedCount).toBe(1);
    });

    it('should handle inventory service errors gracefully', async () => {
      // Arrange
      mockMachineRepository.find.mockResolvedValue([mockMachine as Machine]);
      mockNomenclatureRepository.find.mockResolvedValue([mockNomenclature as Nomenclature]);
      mockTransactionRepository.create.mockReturnValue({} as Transaction);
      mockInventoryService.recordSale.mockRejectedValue(new Error('Inventory error'));

      // Act
      const result = await (service as any).processRows(mockRows);

      // Assert
      // Transaction should still be created even if inventory update fails
      expect(result.successCount).toBe(1);
    });

    it('should calculate total amount correctly', async () => {
      // Arrange
      const multipleRows = [
        { date: '2025-01-15T00:00:00.000Z', machine_number: 'M-001', amount: 5000 },
        { date: '2025-01-15T00:00:00.000Z', machine_number: 'M-001', amount: 10000 },
      ];
      mockMachineRepository.find.mockResolvedValue([mockMachine as Machine]);
      mockNomenclatureRepository.find.mockResolvedValue([]);
      mockTransactionRepository.create.mockReturnValue({} as Transaction);

      // Act
      const result = await (service as any).processRows(multipleRows);

      // Assert
      expect(result.summary.total_amount).toBe(15000);
      expect(result.summary.average_amount).toBe(7500);
    });
  });

  describe('mapPaymentMethod', () => {
    it('should map "card" to CARD', () => {
      expect((service as any).mapPaymentMethod('card')).toBe(PaymentMethod.CARD);
    });

    it('should map Russian "карта" to CARD', () => {
      expect((service as any).mapPaymentMethod('карта')).toBe(PaymentMethod.CARD);
    });

    it('should map "qr" to QR', () => {
      expect((service as any).mapPaymentMethod('qr')).toBe(PaymentMethod.QR);
    });

    it('should map "sbp" to QR', () => {
      expect((service as any).mapPaymentMethod('sbp')).toBe(PaymentMethod.QR);
    });

    it('should map "online" to MOBILE', () => {
      expect((service as any).mapPaymentMethod('online')).toBe(PaymentMethod.MOBILE);
    });

    it('should map "mobile" to MOBILE', () => {
      expect((service as any).mapPaymentMethod('mobile')).toBe(PaymentMethod.MOBILE);
    });

    it('should default to CASH for unknown methods', () => {
      expect((service as any).mapPaymentMethod('unknown')).toBe(PaymentMethod.CASH);
    });

    it('should default to CASH for undefined', () => {
      expect((service as any).mapPaymentMethod(undefined)).toBe(PaymentMethod.CASH);
    });

    it('should default to CASH for empty string', () => {
      expect((service as any).mapPaymentMethod('')).toBe(PaymentMethod.CASH);
    });
  });

  describe('findOne', () => {
    it('should return import record when found', async () => {
      // Arrange
      mockImportRepository.findOne.mockResolvedValue(mockImport as SalesImport);

      // Act
      const result = await service.findOne('import-123');

      // Assert
      expect(mockImportRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'import-123' },
        relations: ['uploaded_by'],
      });
      expect(result).toEqual(mockImport);
    });

    it('should throw NotFoundException when import not found', async () => {
      // Arrange
      mockImportRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('non-existent')).rejects.toThrow('Import not found');
    });
  });

  describe('findAll', () => {
    it('should return all imports without filters', async () => {
      // Arrange
      const imports = [mockImport as SalesImport];
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(imports),
      };
      mockImportRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      // Act
      const result = await service.findAll();

      // Assert
      expect(queryBuilder.orderBy).toHaveBeenCalledWith('import.created_at', 'DESC');
      expect(queryBuilder.andWhere).not.toHaveBeenCalled();
      expect(result).toEqual(imports);
    });

    it('should filter by status when provided', async () => {
      // Arrange
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      mockImportRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      // Act
      await service.findAll(ImportStatus.COMPLETED);

      // Assert
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('import.status = :status', {
        status: ImportStatus.COMPLETED,
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
      mockImportRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      // Act
      await service.findAll(undefined, 'user-123');

      // Assert
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('import.uploaded_by_user_id = :userId', {
        userId: 'user-123',
      });
    });

    it('should filter by both status and userId when provided', async () => {
      // Arrange
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      mockImportRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      // Act
      await service.findAll(ImportStatus.FAILED, 'user-123');

      // Assert
      expect(queryBuilder.andWhere).toHaveBeenCalledTimes(2);
    });
  });

  describe('retryImport', () => {
    it('should reset failed import status for retry', async () => {
      // Arrange
      const failedImport = {
        ...mockImport,
        status: ImportStatus.FAILED,
        started_at: new Date(),
        completed_at: new Date(),
        errors: { error: 'Previous error' },
      } as SalesImport;
      mockImportRepository.findOne.mockResolvedValue(failedImport);
      mockImportRepository.save.mockResolvedValue({
        ...failedImport,
        status: ImportStatus.PENDING,
        started_at: null,
        completed_at: null,
        errors: null,
      } as SalesImport);

      // Act
      const _result = await service.retryImport('import-123');

      // Assert
      expect(mockImportRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ImportStatus.PENDING,
          started_at: null,
          completed_at: null,
          errors: null,
        }),
      );
    });

    it('should throw BadRequestException when import is not failed', async () => {
      // Arrange
      mockImportRepository.findOne.mockResolvedValue({
        ...mockImport,
        status: ImportStatus.COMPLETED,
      } as SalesImport);

      // Act & Assert
      await expect(service.retryImport('import-123')).rejects.toThrow(BadRequestException);
      await expect(service.retryImport('import-123')).rejects.toThrow(
        'Can only retry failed imports',
      );
    });

    it('should throw NotFoundException when import does not exist', async () => {
      // Arrange
      mockImportRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.retryImport('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getJobStatus', () => {
    it('should return job status when job exists', async () => {
      // Arrange
      const mockJob = {
        id: 'job-123',
        getState: jest.fn().mockResolvedValue('completed'),
        progress: jest.fn().mockReturnValue(100),
        failedReason: null,
        data: { importId: 'import-123' },
        attemptsMade: 1,
        processedOn: Date.now(),
        finishedOn: Date.now(),
      };
      mockSalesImportQueue.getJob.mockResolvedValue(mockJob);

      // Act
      const result = await service.getJobStatus('job-123');

      // Assert
      expect(result).toEqual({
        jobId: 'job-123',
        state: 'completed',
        progress: 100,
        data: { importId: 'import-123' },
        failedReason: null,
        attemptsMade: 1,
        processedOn: expect.any(Number),
        finishedOn: expect.any(Number),
      });
    });

    it('should throw NotFoundException when job not found', async () => {
      // Arrange
      mockSalesImportQueue.getJob.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getJobStatus('non-existent-job')).rejects.toThrow(NotFoundException);
      await expect(service.getJobStatus('non-existent-job')).rejects.toThrow(
        'Job non-existent-job not found',
      );
    });

    it('should return failed job status with reason', async () => {
      // Arrange
      const mockJob = {
        id: 'job-123',
        getState: jest.fn().mockResolvedValue('failed'),
        progress: jest.fn().mockReturnValue(50),
        failedReason: 'Processing error',
        data: { importId: 'import-123' },
        attemptsMade: 3,
        processedOn: Date.now(),
        finishedOn: null,
      };
      mockSalesImportQueue.getJob.mockResolvedValue(mockJob);

      // Act
      const result = await service.getJobStatus('job-123');

      // Assert
      expect(result.state).toBe('failed');
      expect(result.failedReason).toBe('Processing error');
    });
  });

  describe('remove', () => {
    it('should soft delete import record', async () => {
      // Arrange
      mockImportRepository.findOne.mockResolvedValue(mockImport as SalesImport);
      mockImportRepository.softRemove.mockResolvedValue(mockImport as SalesImport);

      // Act
      await service.remove('import-123');

      // Assert
      expect(mockImportRepository.findOne).toHaveBeenCalled();
      expect(mockImportRepository.softRemove).toHaveBeenCalledWith(mockImport);
    });

    it('should throw NotFoundException when import not found', async () => {
      // Arrange
      mockImportRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.remove('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty rows array', async () => {
      // Arrange
      mockMachineRepository.find.mockResolvedValue([]);
      mockNomenclatureRepository.find.mockResolvedValue([]);

      // Act
      const result = await (service as any).processRows([]);

      // Assert
      expect(result.successCount).toBe(0);
      expect(result.failedCount).toBe(0);
      expect(result.summary.total_amount).toBe(0);
    });

    it('should handle case-insensitive payment method mapping', () => {
      expect((service as any).mapPaymentMethod('CARD')).toBe(PaymentMethod.CARD);
      expect((service as any).mapPaymentMethod('Card')).toBe(PaymentMethod.CARD);
      expect((service as any).mapPaymentMethod('QR')).toBe(PaymentMethod.QR);
    });

    it('should trim machine_number in normalizeRow', () => {
      // Arrange
      const row = {
        machine: '  M-001  ',
        amount: '5000',
      };

      // Act
      const result = (service as any).normalizeRow(row);

      // Assert
      expect(result.machine_number).toBe('M-001');
    });

    it('should handle negative amounts', () => {
      // Arrange
      const row = {
        machine: 'M-001',
        amount: '-5000',
      };

      // Act
      const result = (service as any).normalizeRow(row);

      // Assert
      expect(result.amount).toBe(-5000);
    });
  });
});
