import { Test, TestingModule } from '@nestjs/testing';
import { DataParserService } from './data-parser.service';
import { UniversalParser } from './parsers/universal.parser';
import { DataValidationService, ValidationSchema } from './services/data-validation.service';
import { FileFormat, ParsedData, ValidationResult } from './interfaces/parser.interface';

describe('DataParserService', () => {
  let service: DataParserService;
  let universalParser: jest.Mocked<UniversalParser>;
  let validationService: jest.Mocked<DataValidationService>;

  // Mock data fixtures
  const mockParsedData: ParsedData = {
    data: [
      { name: 'Product 1', quantity: 10, price: 1000 },
      { name: 'Product 2', quantity: 20, price: 2000 },
    ],
    metadata: {
      format: FileFormat.CSV,
      encoding: 'utf8',
      parsedAt: new Date(),
      headers: ['name', 'quantity', 'price'],
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

  const mockValidationResult: ValidationResult = {
    isValid: true,
    data: mockParsedData.data,
    errors: [],
    warnings: [],
    summary: {
      total: 2,
      valid: 2,
      invalid: 0,
      warnings: 0,
      fields: {},
    },
  };

  const mockValidationSchema: ValidationSchema = {
    name: { required: true, type: 'string' },
    quantity: { required: true, type: 'number', min: 0 },
    price: { required: true, type: 'amount', min: 0 },
  };

  beforeEach(async () => {
    const mockUniversalParser = {
      parse: jest.fn(),
      detectFormat: jest.fn(),
      tryRecoverCorruptedData: jest.fn(),
      getSupportedFormats: jest.fn(),
      validate: jest.fn(),
      transform: jest.fn(),
      canParse: jest.fn(),
    };

    const mockValidationService = {
      validateBatch: jest.fn(),
      inferSchema: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataParserService,
        {
          provide: UniversalParser,
          useValue: mockUniversalParser,
        },
        {
          provide: DataValidationService,
          useValue: mockValidationService,
        },
      ],
    }).compile();

    service = module.get<DataParserService>(DataParserService);
    universalParser = module.get(UniversalParser);
    validationService = module.get(DataValidationService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================================================
  // PARSE AND VALIDATE TESTS
  // ============================================================================

  describe('parseAndValidate', () => {
    it('should parse and validate file with provided schema', async () => {
      universalParser.parse.mockResolvedValue(mockParsedData);
      validationService.validateBatch.mockResolvedValue(mockValidationResult);

      const result = await service.parseAndValidate(Buffer.from('test data'), mockValidationSchema);

      expect(result.parsed).toEqual(mockParsedData);
      expect(result.validated).toEqual(mockValidationResult);
      expect(universalParser.parse).toHaveBeenCalledWith(
        Buffer.from('test data'),
        expect.objectContaining({
          autoDetect: true,
          recoverCorrupted: true,
          locale: 'ru-RU',
          dateFormat: 'DD.MM.YYYY',
        }),
      );
      expect(validationService.validateBatch).toHaveBeenCalledWith(
        mockParsedData.data,
        mockValidationSchema,
      );
    });

    it('should infer schema when not provided', async () => {
      const inferredSchema: ValidationSchema = {
        name: { required: true, type: 'string' },
        quantity: { required: true, type: 'number' },
      };

      universalParser.parse.mockResolvedValue(mockParsedData);
      validationService.inferSchema.mockResolvedValue(inferredSchema);
      validationService.validateBatch.mockResolvedValue(mockValidationResult);

      const _result = await service.parseAndValidate(Buffer.from('test data'));

      expect(validationService.inferSchema).toHaveBeenCalledWith(mockParsedData.data);
      expect(validationService.validateBatch).toHaveBeenCalledWith(
        mockParsedData.data,
        inferredSchema,
      );
    });

    it('should merge custom options with defaults', async () => {
      universalParser.parse.mockResolvedValue(mockParsedData);
      validationService.validateBatch.mockResolvedValue(mockValidationResult);

      await service.parseAndValidate(Buffer.from('test data'), mockValidationSchema, {
        delimiter: ';',
        encoding: 'windows-1251',
      });

      expect(universalParser.parse).toHaveBeenCalledWith(
        Buffer.from('test data'),
        expect.objectContaining({
          delimiter: ';',
          encoding: 'windows-1251',
          autoDetect: true,
          recoverCorrupted: true,
        }),
      );
    });
  });

  // ============================================================================
  // PARSE TESTS
  // ============================================================================

  describe('parse', () => {
    it('should parse file with auto-detection when format not specified', async () => {
      universalParser.parse.mockResolvedValue(mockParsedData);

      const result = await service.parse(Buffer.from('test data'));

      expect(result).toEqual(mockParsedData);
      expect(universalParser.parse).toHaveBeenCalledWith(
        Buffer.from('test data'),
        expect.objectContaining({ autoDetect: true }),
      );
    });

    it('should parse file with specified format', async () => {
      universalParser.parse.mockResolvedValue(mockParsedData);

      const result = await service.parse(Buffer.from('test data'), FileFormat.EXCEL);

      expect(result).toEqual(mockParsedData);
      expect(universalParser.parse).toHaveBeenCalledWith(
        Buffer.from('test data'),
        expect.objectContaining({ autoDetect: false }),
      );
    });

    it('should pass custom options to parser', async () => {
      universalParser.parse.mockResolvedValue(mockParsedData);

      await service.parse(Buffer.from('test data'), FileFormat.CSV, {
        delimiter: ';',
        skipRows: 1,
      });

      expect(universalParser.parse).toHaveBeenCalledWith(
        Buffer.from('test data'),
        expect.objectContaining({
          delimiter: ';',
          skipRows: 1,
        }),
      );
    });

    it('should handle string input', async () => {
      universalParser.parse.mockResolvedValue(mockParsedData);

      await service.parse('string input data');

      expect(universalParser.parse).toHaveBeenCalledWith('string input data', expect.any(Object));
    });
  });

  // ============================================================================
  // VALIDATE TESTS
  // ============================================================================

  describe('validate', () => {
    it('should validate data against schema', async () => {
      validationService.validateBatch.mockResolvedValue(mockValidationResult);

      const result = await service.validate(mockParsedData.data, mockValidationSchema);

      expect(result).toEqual(mockValidationResult);
      expect(validationService.validateBatch).toHaveBeenCalledWith(
        mockParsedData.data,
        mockValidationSchema,
      );
    });

    it('should return validation errors when data is invalid', async () => {
      const invalidResult: ValidationResult = {
        isValid: false,
        data: [],
        errors: [
          {
            field: 'quantity',
            value: -10,
            rule: 'min',
            message: 'Value must be at least 0',
            row: 1,
          },
        ],
        warnings: [],
        summary: {
          total: 1,
          valid: 0,
          invalid: 1,
          warnings: 0,
          fields: {},
        },
      };

      validationService.validateBatch.mockResolvedValue(invalidResult);

      const result = await service.validate([{ quantity: -10 }], mockValidationSchema);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });
  });

  // ============================================================================
  // DETECT FORMAT TESTS
  // ============================================================================

  describe('detectFormat', () => {
    it('should detect file format from buffer', () => {
      universalParser.detectFormat.mockReturnValue(FileFormat.EXCEL);

      const result = service.detectFormat(Buffer.from('test'));

      expect(result).toBe(FileFormat.EXCEL);
      expect(universalParser.detectFormat).toHaveBeenCalled();
    });

    it('should return CSV for comma-separated data', () => {
      universalParser.detectFormat.mockReturnValue(FileFormat.CSV);

      const result = service.detectFormat(Buffer.from('name,value\ntest,123'));

      expect(result).toBe(FileFormat.CSV);
    });

    it('should return JSON for JSON data', () => {
      universalParser.detectFormat.mockReturnValue(FileFormat.JSON);

      const result = service.detectFormat(Buffer.from('{"name": "test"}'));

      expect(result).toBe(FileFormat.JSON);
    });
  });

  // ============================================================================
  // TRY RECOVER TESTS
  // ============================================================================

  describe('tryRecover', () => {
    it('should attempt to recover corrupted data', async () => {
      universalParser.tryRecoverCorruptedData.mockResolvedValue(mockParsedData);

      const result = await service.tryRecover(Buffer.from('corrupted data'));

      expect(result).toEqual(mockParsedData);
      expect(universalParser.tryRecoverCorruptedData).toHaveBeenCalled();
    });

    it('should return null when recovery fails', async () => {
      universalParser.tryRecoverCorruptedData.mockResolvedValue(null);

      const result = await service.tryRecover(Buffer.from('unrecoverable data'));

      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // INFER SCHEMA TESTS
  // ============================================================================

  describe('inferSchema', () => {
    it('should infer schema from sample data', async () => {
      const inferredSchema: ValidationSchema = {
        name: { required: true, type: 'string', maxLength: 50 },
        age: { required: true, type: 'number', min: 0, max: 100 },
      };
      validationService.inferSchema.mockResolvedValue(inferredSchema);

      const result = await service.inferSchema([
        { name: 'John', age: 30 },
        { name: 'Jane', age: 25 },
      ]);

      expect(result).toEqual(inferredSchema);
      expect(validationService.inferSchema).toHaveBeenCalled();
    });

    it('should return empty schema for empty data', async () => {
      validationService.inferSchema.mockResolvedValue({});

      const result = await service.inferSchema([]);

      expect(result).toEqual({});
    });
  });

  // ============================================================================
  // GET SUPPORTED FORMATS TESTS
  // ============================================================================

  describe('getSupportedFormats', () => {
    it('should return list of supported formats', () => {
      const formats = [FileFormat.EXCEL, FileFormat.CSV, FileFormat.JSON];
      universalParser.getSupportedFormats.mockReturnValue(formats);

      const result = service.getSupportedFormats();

      expect(result).toEqual(formats);
      expect(universalParser.getSupportedFormats).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // PARSE SALES IMPORT TESTS
  // ============================================================================

  describe('parseSalesImport', () => {
    it('should parse sales import file with validation', async () => {
      const salesData: ParsedData = {
        ...mockParsedData,
        data: [
          { date: '2025-01-15', machine_number: 'M-001', amount: 5000, payment_method: 'cash' },
          { date: '2025-01-15', machine_number: 'M-002', amount: 3000, payment_method: 'card' },
        ],
      };

      const salesValidationResult: ValidationResult = {
        isValid: true,
        data: salesData.data,
        errors: [],
        warnings: [],
        summary: { total: 2, valid: 2, invalid: 0, warnings: 0, fields: {} },
      };

      universalParser.parse.mockResolvedValue(salesData);
      validationService.inferSchema.mockResolvedValue({});
      validationService.validateBatch.mockResolvedValue(salesValidationResult);

      const result = await service.parseSalesImport(Buffer.from('sales data'));

      expect(result.success).toHaveLength(2);
      expect(result.failed).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should return failed rows with validation errors', async () => {
      const salesData: ParsedData = {
        ...mockParsedData,
        data: [{ date: 'invalid', machine_number: 'M-001', amount: -100 }],
      };

      const salesValidationResult: ValidationResult = {
        isValid: false,
        data: [],
        errors: [
          { field: 'date', value: 'invalid', rule: 'type', message: 'Invalid date', row: 1 },
          { field: 'amount', value: -100, rule: 'min', message: 'Amount must be positive', row: 1 },
        ],
        warnings: [],
        summary: { total: 1, valid: 0, invalid: 1, warnings: 0, fields: {} },
      };

      universalParser.parse.mockResolvedValue(salesData);
      validationService.inferSchema.mockResolvedValue({});
      validationService.validateBatch.mockResolvedValue(salesValidationResult);

      const result = await service.parseSalesImport(Buffer.from('invalid sales data'));

      expect(result.success).toHaveLength(0);
      expect(result.failed).toHaveLength(2);
      expect(result.failed[0].field).toBe('date');
      expect(result.failed[1].field).toBe('amount');
    });

    it('should return warnings for rows with non-critical issues', async () => {
      const salesData: ParsedData = {
        ...mockParsedData,
        data: [{ date: '2025-01-15', machine_number: 'M-001', amount: 5000 }],
      };

      const salesValidationResult: ValidationResult = {
        isValid: true,
        data: salesData.data,
        errors: [],
        warnings: [
          {
            field: 'payment_method',
            value: null,
            type: 'missing_value',
            message: 'Payment method not specified',
            row: 1,
          },
        ],
        summary: { total: 1, valid: 1, invalid: 0, warnings: 1, fields: {} },
      };

      universalParser.parse.mockResolvedValue(salesData);
      validationService.inferSchema.mockResolvedValue({});
      validationService.validateBatch.mockResolvedValue(salesValidationResult);

      const result = await service.parseSalesImport(Buffer.from('sales data'));

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('Row 1');
    });
  });

  // ============================================================================
  // PARSE COUNTERPARTIES IMPORT TESTS
  // ============================================================================

  describe('parseCounterpartiesImport', () => {
    it('should parse counterparties import file with validation', async () => {
      const counterpartiesData: ParsedData = {
        ...mockParsedData,
        data: [
          { name: 'Supplier 1', type: 'supplier', inn: '123456789', phone: '+998901234567' },
          { name: 'Landlord 1', type: 'landlord', inn: '987654321' },
        ],
      };

      const validationResult: ValidationResult = {
        isValid: true,
        data: counterpartiesData.data,
        errors: [],
        warnings: [],
        summary: { total: 2, valid: 2, invalid: 0, warnings: 0, fields: {} },
      };

      universalParser.parse.mockResolvedValue(counterpartiesData);
      validationService.inferSchema.mockResolvedValue({});
      validationService.validateBatch.mockResolvedValue(validationResult);

      const result = await service.parseCounterpartiesImport(Buffer.from('counterparties data'));

      expect(result.success).toHaveLength(2);
      expect(result.failed).toHaveLength(0);
    });

    it('should validate INN format for counterparties', async () => {
      const counterpartiesData: ParsedData = {
        ...mockParsedData,
        data: [{ name: 'Invalid INN', inn: '12345' }],
      };

      const validationResult: ValidationResult = {
        isValid: false,
        data: [],
        errors: [
          { field: 'inn', value: '12345', rule: 'type', message: 'Invalid INN format', row: 1 },
        ],
        warnings: [],
        summary: { total: 1, valid: 0, invalid: 1, warnings: 0, fields: {} },
      };

      universalParser.parse.mockResolvedValue(counterpartiesData);
      validationService.inferSchema.mockResolvedValue({});
      validationService.validateBatch.mockResolvedValue(validationResult);

      const result = await service.parseCounterpartiesImport(Buffer.from('invalid data'));

      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].field).toBe('inn');
    });
  });

  // ============================================================================
  // PARSE INVENTORY IMPORT TESTS
  // ============================================================================

  describe('parseInventoryImport', () => {
    it('should parse inventory import file with validation', async () => {
      const inventoryData: ParsedData = {
        ...mockParsedData,
        data: [
          {
            product_code: 'P001',
            product_name: 'Coffee Beans',
            quantity: 100,
            unit_cost: 50000,
            location: 'warehouse',
          },
          {
            product_code: 'P002',
            product_name: 'Cups',
            quantity: 500,
            unit_cost: 1000,
            location: 'operator',
          },
        ],
      };

      const validationResult: ValidationResult = {
        isValid: true,
        data: inventoryData.data,
        errors: [],
        warnings: [],
        summary: { total: 2, valid: 2, invalid: 0, warnings: 0, fields: {} },
      };

      universalParser.parse.mockResolvedValue(inventoryData);
      validationService.inferSchema.mockResolvedValue({});
      validationService.validateBatch.mockResolvedValue(validationResult);

      const result = await service.parseInventoryImport(Buffer.from('inventory data'));

      expect(result.success).toHaveLength(2);
      expect(result.failed).toHaveLength(0);
    });

    it('should validate location enum values', async () => {
      const inventoryData: ParsedData = {
        ...mockParsedData,
        data: [{ product_code: 'P001', product_name: 'Test', quantity: 10, location: 'invalid' }],
      };

      const validationResult: ValidationResult = {
        isValid: false,
        data: [],
        errors: [
          {
            field: 'location',
            value: 'invalid',
            rule: 'enum',
            message: 'Must be one of: warehouse, operator, machine',
            row: 1,
          },
        ],
        warnings: [],
        summary: { total: 1, valid: 0, invalid: 1, warnings: 0, fields: {} },
      };

      universalParser.parse.mockResolvedValue(inventoryData);
      validationService.inferSchema.mockResolvedValue({});
      validationService.validateBatch.mockResolvedValue(validationResult);

      const result = await service.parseInventoryImport(Buffer.from('invalid inventory'));

      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].field).toBe('location');
    });

    it('should validate quantity is non-negative', async () => {
      const inventoryData: ParsedData = {
        ...mockParsedData,
        data: [{ product_code: 'P001', product_name: 'Test', quantity: -5 }],
      };

      const validationResult: ValidationResult = {
        isValid: false,
        data: [],
        errors: [
          {
            field: 'quantity',
            value: -5,
            rule: 'min',
            message: 'Quantity must be at least 0',
            row: 1,
          },
        ],
        warnings: [],
        summary: { total: 1, valid: 0, invalid: 1, warnings: 0, fields: {} },
      };

      universalParser.parse.mockResolvedValue(inventoryData);
      validationService.inferSchema.mockResolvedValue({});
      validationService.validateBatch.mockResolvedValue(validationResult);

      const result = await service.parseInventoryImport(Buffer.from('invalid inventory'));

      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].field).toBe('quantity');
    });
  });
});
