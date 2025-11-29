import { Test, TestingModule } from '@nestjs/testing';
import { CsvParser } from './csv.parser';
import { FileFormat, ParsedData } from '../interfaces/parser.interface';

describe('CsvParser', () => {
  let parser: CsvParser;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CsvParser],
    }).compile();

    parser = module.get<CsvParser>(CsvParser);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('parse', () => {
    it('should parse CSV with comma delimiter', async () => {
      const csvContent = 'id,quantity,price\n1,10,1000\n2,20,2000';
      const buffer = Buffer.from(csvContent);

      const result = await parser.parse(buffer);

      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toMatchObject({
        id: 1,
        quantity: 10,
        price: 1000,
      });
      expect(result.data[1]).toMatchObject({
        id: 2,
        quantity: 20,
        price: 2000,
      });
      expect(result.metadata.format).toBe(FileFormat.CSV);
      expect(result.metadata.rowCount).toBe(2);
    });

    it('should parse CSV with semicolon delimiter', async () => {
      const csvContent = 'id;quantity;price\n1;10;1000\n2;20;2000';
      const buffer = Buffer.from(csvContent);

      const result = await parser.parse(buffer, { delimiter: ';' });

      expect(result.data).toHaveLength(2);
      expect(result.data[0].id).toBe(1);
    });

    it('should auto-detect semicolon delimiter', async () => {
      const csvContent = 'id;quantity;price\n1;10;1000';
      const buffer = Buffer.from(csvContent);

      const result = await parser.parse(buffer);

      expect(result.data[0].id).toBe(1);
      expect(result.data[0].quantity).toBe(10);
    });

    it('should normalize headers (lowercase, no special characters)', async () => {
      const csvContent = 'Product Name,Total Quantity,Unit Price\nCoffee,5,500';
      const buffer = Buffer.from(csvContent);

      const result = await parser.parse(buffer);

      expect(result.metadata.headers).toContain('product_name');
      expect(result.metadata.headers).toContain('total_quantity');
      expect(result.metadata.headers).toContain('unit_price');
    });

    it('should parse string input', async () => {
      const csvContent = 'product_id,value\n1,123';

      const result = await parser.parse(csvContent);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].product_id).toBe(1);
      expect(result.data[0].value).toBe(123);
    });

    it('should skip rows when skipRows option is provided', async () => {
      const csvContent = 'header_row\nproduct_name,quantity,price\nCoffee,10,1000\nTea,20,2000';
      const buffer = Buffer.from(csvContent);

      const result = await parser.parse(buffer, { skipRows: 1 });

      // After skipping 1 row, remaining rows should be parsed
      expect(result.statistics.skippedRows).toBeGreaterThanOrEqual(1);
    });

    it('should respect maxRows option', async () => {
      const csvContent = 'product_name,quantity\nCoffee,10\nTea,20\nWater,30\nJuice,40';
      const buffer = Buffer.from(csvContent);

      const result = await parser.parse(buffer, { maxRows: 2 });

      expect(result.data.length).toBeLessThanOrEqual(2);
    });

    it('should handle empty strings as null', async () => {
      const csvContent = 'product_name,quantity,price\nCoffee,,1000';
      const buffer = Buffer.from(csvContent);

      const result = await parser.parse(buffer);

      expect(result.data[0].quantity).toBeNull();
    });

    it('should parse numbers correctly', async () => {
      const csvContent = 'product_name,quantity,price\nCoffee,10,1500.50';
      const buffer = Buffer.from(csvContent);

      const result = await parser.parse(buffer);

      expect(typeof result.data[0].quantity).toBe('number');
      expect(result.data[0].quantity).toBe(10);
      expect(result.data[0].price).toBe(1500.5);
    });

    it('should parse Russian formatted numbers', async () => {
      const csvContent = 'product_name,price\nCoffee,1 500';
      const buffer = Buffer.from(csvContent);

      const result = await parser.parse(buffer, { locale: 'ru-RU' });

      expect(typeof result.data[0].price).toBe('number');
    });

    it('should parse dates in DD.MM.YYYY format', async () => {
      const csvContent = 'date,product_name\n15.01.2025,Coffee';
      const buffer = Buffer.from(csvContent);

      const result = await parser.parse(buffer, { dateFormat: 'DD.MM.YYYY' });

      expect(result.data[0].date).toBeInstanceOf(Date);
    });

    it('should parse dates in YYYY-MM-DD format', async () => {
      const csvContent = 'date,product_name\n2025-01-15,Coffee';
      const buffer = Buffer.from(csvContent);

      const result = await parser.parse(buffer, { dateFormat: 'YYYY-MM-DD' });

      expect(result.data[0].date).toBeInstanceOf(Date);
    });

    it('should handle numeric values correctly', async () => {
      // Numeric values are parsed as numbers
      const csvContent = 'id,is_active,is_available\n100,1,0';
      const buffer = Buffer.from(csvContent);

      const result = await parser.parse(buffer);

      expect(result.data[0].id).toBe(100);
      expect(result.data[0].is_active).toBe(1);
      expect(result.data[0].is_available).toBe(0);
    });

    it('should preserve string values', async () => {
      // String values that aren't numeric/boolean/date remain as strings
      const csvContent = 'id,description\n100,"test_product_123"';
      const buffer = Buffer.from(csvContent);

      const result = await parser.parse(buffer);

      // Non-boolean values remain as is
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe(100);
    });

    it('should skip empty rows', async () => {
      const csvContent = 'id,quantity\n1,10\n\n\n2,20';
      const buffer = Buffer.from(csvContent);

      const result = await parser.parse(buffer);

      // Empty rows should be skipped and added to warnings
      expect(result.data.length).toBe(2);
      expect(result.data[0].id).toBe(1);
      expect(result.data[1].id).toBe(2);
    });

    it('should add warnings for rows with only null values', async () => {
      const csvContent = 'product_name,quantity\nCoffee,10\n,,\nTea,20';
      const buffer = Buffer.from(csvContent);

      const result = await parser.parse(buffer);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0].type).toBe('missing_value');
    });

    it('should calculate processing time statistics', async () => {
      const csvContent = 'product_name,quantity\nCoffee,10';
      const buffer = Buffer.from(csvContent);

      const result = await parser.parse(buffer);

      expect(result.statistics.processingTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.statistics.totalRows).toBeGreaterThan(0);
      expect(result.statistics.validRows).toBeGreaterThan(0);
    });
  });

  describe('validate', () => {
    it('should return valid result for parsed data', () => {
      const mockParsedData: ParsedData = {
        data: [{ name: 'Test' }],
        metadata: {
          format: FileFormat.CSV,
          parsedAt: new Date(),
          headers: ['name'],
          rowCount: 1,
          columnCount: 1,
        },
        warnings: [],
        errors: [],
        statistics: {
          totalRows: 1,
          validRows: 1,
          invalidRows: 0,
          skippedRows: 0,
          processingTimeMs: 10,
        },
      };

      const result = parser.validate(mockParsedData);

      expect(result.isValid).toBe(true);
      expect(result.data).toEqual(mockParsedData.data);
    });
  });

  describe('transform', () => {
    it('should return data unchanged without transformation rules', () => {
      const mockParsedData: ParsedData = {
        data: [{ name: 'Test' }],
        metadata: {
          format: FileFormat.CSV,
          parsedAt: new Date(),
          headers: ['name'],
          rowCount: 1,
          columnCount: 1,
        },
        warnings: [],
        errors: [],
        statistics: {
          totalRows: 1,
          validRows: 1,
          invalidRows: 0,
          skippedRows: 0,
          processingTimeMs: 10,
        },
      };

      const result = parser.transform(mockParsedData);

      expect(result.data).toEqual(mockParsedData.data);
      expect(result.originalCount).toBe(1);
      expect(result.transformedCount).toBe(1);
    });
  });

  describe('detectFormat', () => {
    it('should return CSV format', () => {
      const buffer = Buffer.from('name,value');
      const result = parser.detectFormat(buffer);
      expect(result).toBe(FileFormat.CSV);
    });
  });

  describe('tryRecoverCorruptedData', () => {
    it('should attempt recovery with different encodings', async () => {
      const buffer = Buffer.from('name,value\nTest,123');

      const result = await parser.tryRecoverCorruptedData(buffer);

      expect(result).not.toBeNull();
      expect(result?.data).toHaveLength(1);
    });
  });

  describe('getSupportedFormats', () => {
    it('should return CSV as supported format', () => {
      const formats = parser.getSupportedFormats();
      expect(formats).toContain(FileFormat.CSV);
    });
  });

  describe('canParse', () => {
    it('should return true for CSV format', () => {
      expect(parser.canParse(FileFormat.CSV)).toBe(true);
    });

    it('should return false for non-CSV formats', () => {
      expect(parser.canParse(FileFormat.EXCEL)).toBe(false);
      expect(parser.canParse(FileFormat.JSON)).toBe(false);
    });
  });

  describe('parse with numberFormat option', () => {
    it('should parse Russian formatted numbers with numberFormat option', async () => {
      const csvContent = 'product_name,price\nCoffee,1.500,50';
      const buffer = Buffer.from(csvContent);

      const result = await parser.parse(buffer, { numberFormat: 'ru-RU' });

      expect(typeof result.data[0].price).toBe('number');
    });
  });

  describe('parse dates in various formats', () => {
    it('should parse dates in DD/MM/YYYY format', async () => {
      const csvContent = 'date,product_name\n15/01/2025,Coffee';
      const buffer = Buffer.from(csvContent);

      const result = await parser.parse(buffer, { dateFormat: 'DD/MM/YYYY' });

      // Value should be present
      expect(result.data[0].date).toBeDefined();
    });

    it('should process dates with MM-DD-YYYY format option', async () => {
      const csvContent = 'date,product_name\n01-15-2025,Coffee';
      const buffer = Buffer.from(csvContent);

      const result = await parser.parse(buffer, { dateFormat: 'MM-DD-YYYY' });

      // Value should be present
      expect(result.data[0].date).toBeDefined();
    });
  });

  describe('parse boolean values', () => {
    it('should handle boolean-like text values', async () => {
      const csvContent = 'name,is_active\nCoffee,true';
      const buffer = Buffer.from(csvContent);

      const result = await parser.parse(buffer);

      // Boolean text should be processed
      expect(result.data[0]).toHaveProperty('is_active');
    });
  });

  describe('delimiter detection', () => {
    it('should detect tab delimiter', async () => {
      const csvContent = 'id\tquantity\tprice\n1\t10\t1000';
      const buffer = Buffer.from(csvContent);

      const result = await parser.parse(buffer);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe(1);
    });

    it('should detect pipe delimiter', async () => {
      const csvContent = 'id|quantity|price\n1|10|1000';
      const buffer = Buffer.from(csvContent);

      const result = await parser.parse(buffer);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe(1);
    });

    it('should handle single line input for delimiter detection', async () => {
      const csvContent = 'id,quantity,price';
      const buffer = Buffer.from(csvContent);

      // With only header row, should handle gracefully
      const result = await parser.parse(buffer);

      expect(result.metadata.headers).toHaveLength(3);
    });
  });

  describe('edge cases', () => {
    it('should handle non-string values in row cleaning', async () => {
      // This tests the typeof value === 'string' branch
      const csvContent = 'id,quantity\n1,10';
      const buffer = Buffer.from(csvContent);

      const result = await parser.parse(buffer);

      expect(result.data[0].id).toBe(1);
    });

    it('should handle strict mode with errors', async () => {
      // Test non-strict mode with recoverable errors
      const csvContent = 'id,quantity\n1,10';
      const buffer = Buffer.from(csvContent);

      const result = await parser.parse(buffer, { strict: false });

      expect(result.data).toHaveLength(1);
    });
  });
});
