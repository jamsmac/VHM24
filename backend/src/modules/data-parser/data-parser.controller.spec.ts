import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { DataParserController } from './data-parser.controller';
import { DataParserService } from './data-parser.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { FileFormat } from './interfaces/parser.interface';

describe('DataParserController', () => {
  let controller: DataParserController;
  let mockDataParserService: any;

  const mockParsedData = {
    data: [
      { id: 1, name: 'Test Item 1', value: 100 },
      { id: 2, name: 'Test Item 2', value: 200 },
    ],
    metadata: {
      format: FileFormat.EXCEL,
      parsedAt: new Date(),
      headers: ['id', 'name', 'value'],
      rowCount: 2,
      columnCount: 3,
    },
    warnings: [],
    errors: [],
    statistics: {
      totalRows: 2,
      validRows: 2,
      invalidRows: 0,
      skippedRows: 0,
      processingTimeMs: 50,
    },
  };

  const mockValidationResult = {
    success: [
      { id: 1, name: 'Test', amount: 100 },
      { id: 2, name: 'Test 2', amount: 200 },
    ],
    failed: [{ row: 3, field: 'amount', message: 'Invalid amount', value: 'abc' }],
    warnings: ['Row 5: Missing optional field'],
  };

  const createMockFile = (buffer?: Buffer): Express.Multer.File => ({
    fieldname: 'file',
    originalname: 'test.xlsx',
    encoding: '7bit',
    mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    size: buffer ? buffer.length : 1024,
    buffer: buffer || Buffer.from('test data'),
    destination: '',
    filename: 'test.xlsx',
    path: '',
    stream: null as any,
  });

  beforeEach(async () => {
    mockDataParserService = {
      parse: jest.fn(),
      parseSalesImport: jest.fn(),
      parseCounterpartiesImport: jest.fn(),
      parseInventoryImport: jest.fn(),
      detectFormat: jest.fn(),
      tryRecover: jest.fn(),
      getSupportedFormats: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DataParserController],
      providers: [
        {
          provide: DataParserService,
          useValue: mockDataParserService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<DataParserController>(DataParserController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('parseFile', () => {
    it('should parse file successfully', async () => {
      mockDataParserService.parse.mockResolvedValue(mockParsedData as any);
      const mockFile = createMockFile();

      const result = await controller.parseFile(mockFile, FileFormat.EXCEL);

      expect(result).toEqual({
        success: true,
        format: FileFormat.EXCEL,
        rowCount: 2,
        columnCount: 3,
        headers: ['id', 'name', 'value'],
        warnings: [],
        errors: [],
        statistics: mockParsedData.statistics,
        data: mockParsedData.data,
      });
      expect(mockDataParserService.parse).toHaveBeenCalledWith(mockFile.buffer, FileFormat.EXCEL);
    });

    it('should throw BadRequestException when no file provided', async () => {
      await expect(controller.parseFile(undefined as any, FileFormat.EXCEL)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.parseFile(undefined as any, FileFormat.EXCEL)).rejects.toThrow(
        'File is required',
      );
    });

    it('should parse file without explicit format (auto-detect)', async () => {
      mockDataParserService.parse.mockResolvedValue(mockParsedData as any);
      const mockFile = createMockFile();

      await controller.parseFile(mockFile);

      expect(mockDataParserService.parse).toHaveBeenCalledWith(mockFile.buffer, undefined);
    });

    it('should return first 10 rows as preview', async () => {
      const largeData = Array.from({ length: 20 }, (_, i) => ({ id: i + 1 }));
      mockDataParserService.parse.mockResolvedValue({
        ...mockParsedData,
        data: largeData,
      } as any);

      const mockFile = createMockFile();
      const result = await controller.parseFile(mockFile);

      expect(result.data).toHaveLength(10);
    });
  });

  describe('parseSalesFile', () => {
    it('should parse sales file successfully', async () => {
      mockDataParserService.parseSalesImport.mockResolvedValue(mockValidationResult);
      const mockFile = createMockFile();

      const result = await controller.parseSalesFile(mockFile);

      expect(result).toEqual({
        success: true,
        validRows: 2,
        invalidRows: 1,
        warnings: 1,
        data: {
          valid: mockValidationResult.success,
          invalid: mockValidationResult.failed,
          warnings: mockValidationResult.warnings,
        },
        summary: {
          total: 3,
          valid: 2,
          invalid: 1,
          successRate: (2 / 3) * 100,
        },
      });
    });

    it('should throw BadRequestException when no file provided', async () => {
      await expect(controller.parseSalesFile(undefined as any)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.parseSalesFile(undefined as any)).rejects.toThrow('File is required');
    });

    it('should return preview limited to 10 rows', async () => {
      const largeResult = {
        success: Array.from({ length: 20 }, (_, i) => ({ id: i + 1 })),
        failed: Array.from({ length: 15 }, (_, i) => ({ row: i + 1 })),
        warnings: Array.from({ length: 12 }, (_, i) => `Warning ${i + 1}`),
      };
      mockDataParserService.parseSalesImport.mockResolvedValue(largeResult);
      const mockFile = createMockFile();

      const result = await controller.parseSalesFile(mockFile);

      expect(result.data.valid).toHaveLength(10);
      expect(result.data.invalid).toHaveLength(10);
      expect(result.data.warnings).toHaveLength(10);
    });
  });

  describe('parseCounterpartiesFile', () => {
    it('should parse counterparties file successfully', async () => {
      mockDataParserService.parseCounterpartiesImport.mockResolvedValue(mockValidationResult);
      const mockFile = createMockFile();

      const result = await controller.parseCounterpartiesFile(mockFile);

      expect(result).toEqual({
        success: true,
        validRows: 2,
        invalidRows: 1,
        warnings: 1,
        data: {
          valid: mockValidationResult.success.slice(0, 10),
          invalid: mockValidationResult.failed.slice(0, 10),
          warnings: mockValidationResult.warnings.slice(0, 10),
        },
        summary: {
          total: 3,
          valid: 2,
          invalid: 1,
          successRate: (2 / 3) * 100,
        },
      });
    });

    it('should throw BadRequestException when no file provided', async () => {
      await expect(controller.parseCounterpartiesFile(undefined as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('parseInventoryFile', () => {
    it('should parse inventory file successfully', async () => {
      mockDataParserService.parseInventoryImport.mockResolvedValue(mockValidationResult);
      const mockFile = createMockFile();

      const result = await controller.parseInventoryFile(mockFile);

      expect(result).toEqual({
        success: true,
        validRows: 2,
        invalidRows: 1,
        warnings: 1,
        data: {
          valid: mockValidationResult.success.slice(0, 10),
          invalid: mockValidationResult.failed.slice(0, 10),
          warnings: mockValidationResult.warnings.slice(0, 10),
        },
        summary: {
          total: 3,
          valid: 2,
          invalid: 1,
          successRate: (2 / 3) * 100,
        },
      });
    });

    it('should throw BadRequestException when no file provided', async () => {
      await expect(controller.parseInventoryFile(undefined as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should calculate success rate correctly', async () => {
      const resultWithNoFailed = {
        success: [{ id: 1 }, { id: 2 }],
        failed: [],
        warnings: [],
      };
      mockDataParserService.parseInventoryImport.mockResolvedValue(resultWithNoFailed);
      const mockFile = createMockFile();

      const result = await controller.parseInventoryFile(mockFile);

      expect(result.summary.successRate).toBe(100);
    });
  });

  describe('detectFormat', () => {
    it('should detect file format successfully', async () => {
      mockDataParserService.detectFormat.mockReturnValue(FileFormat.EXCEL);
      const mockFile = createMockFile();

      const result = await controller.detectFormat(mockFile);

      expect(result).toEqual({
        success: true,
        filename: 'test.xlsx',
        size: mockFile.size,
        detectedFormat: FileFormat.EXCEL,
        mimeType: mockFile.mimetype,
      });
      expect(mockDataParserService.detectFormat).toHaveBeenCalledWith(mockFile.buffer);
    });

    it('should throw BadRequestException when no file provided', async () => {
      await expect(controller.detectFormat(undefined as any)).rejects.toThrow(BadRequestException);
      await expect(controller.detectFormat(undefined as any)).rejects.toThrow('File is required');
    });

    it('should detect CSV format', async () => {
      mockDataParserService.detectFormat.mockReturnValue(FileFormat.CSV);
      const mockFile = createMockFile();
      mockFile.originalname = 'data.csv';
      mockFile.mimetype = 'text/csv';

      const result = await controller.detectFormat(mockFile);

      expect(result.detectedFormat).toBe(FileFormat.CSV);
    });

    it('should detect JSON format', async () => {
      mockDataParserService.detectFormat.mockReturnValue(FileFormat.JSON);
      const mockFile = createMockFile();
      mockFile.originalname = 'data.json';
      mockFile.mimetype = 'application/json';

      const result = await controller.detectFormat(mockFile);

      expect(result.detectedFormat).toBe(FileFormat.JSON);
    });
  });

  describe('recoverFile', () => {
    it('should recover corrupted file successfully', async () => {
      mockDataParserService.tryRecover.mockResolvedValue(mockParsedData as any);
      const mockFile = createMockFile();

      const result = await controller.recoverFile(mockFile);

      expect(result).toEqual({
        success: true,
        format: FileFormat.EXCEL,
        encoding: undefined,
        rowCount: 2,
        columnCount: 3,
        warnings: [],
        data: mockParsedData.data,
      });
    });

    it('should return failure when recovery not possible', async () => {
      mockDataParserService.tryRecover.mockResolvedValue(null);
      const mockFile = createMockFile();

      const result = await controller.recoverFile(mockFile);

      expect(result).toEqual({
        success: false,
        message: 'Unable to recover data from file',
      });
    });

    it('should throw BadRequestException when no file provided', async () => {
      await expect(controller.recoverFile(undefined as any)).rejects.toThrow(BadRequestException);
    });

    it('should return preview limited to 10 rows', async () => {
      const largeData = Array.from({ length: 20 }, (_, i) => ({ id: i + 1 }));
      mockDataParserService.tryRecover.mockResolvedValue({
        ...mockParsedData,
        data: largeData,
      } as any);

      const mockFile = createMockFile();
      const result = await controller.recoverFile(mockFile);

      expect(result.data).toHaveLength(10);
    });
  });

  describe('getSupportedFormats', () => {
    it('should return list of supported formats with details', () => {
      const supportedFormats = [FileFormat.EXCEL, FileFormat.CSV, FileFormat.JSON];
      mockDataParserService.getSupportedFormats.mockReturnValue(supportedFormats);

      const result = controller.getSupportedFormats();

      expect(result).toEqual({
        formats: supportedFormats,
        details: {
          excel: {
            extensions: ['.xlsx', '.xls'],
            mimeTypes: [
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              'application/vnd.ms-excel',
            ],
            description: 'Microsoft Excel files',
          },
          csv: {
            extensions: ['.csv'],
            mimeTypes: ['text/csv', 'application/csv'],
            description: 'Comma-separated values files',
          },
          json: {
            extensions: ['.json'],
            mimeTypes: ['application/json'],
            description: 'JavaScript Object Notation files',
          },
        },
      });
    });

    it('should call service getSupportedFormats', () => {
      mockDataParserService.getSupportedFormats.mockReturnValue([FileFormat.EXCEL]);

      controller.getSupportedFormats();

      expect(mockDataParserService.getSupportedFormats).toHaveBeenCalled();
    });
  });
});
