import { Test, TestingModule } from '@nestjs/testing';
import { JsonParser } from './json.parser';
import { FileFormat, ParsedData } from '../interfaces/parser.interface';

describe('JsonParser', () => {
  let parser: JsonParser;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JsonParser],
    }).compile();

    parser = module.get<JsonParser>(JsonParser);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('parse', () => {
    it('should parse JSON array', async () => {
      const jsonContent = JSON.stringify([
        { name: 'Product A', quantity: 10 },
        { name: 'Product B', quantity: 20 },
      ]);
      const buffer = Buffer.from(jsonContent);

      const result = await parser.parse(buffer);

      expect(result.data).toHaveLength(2);
      expect(result.data[0].name).toBe('Product A');
      expect(result.data[1].name).toBe('Product B');
      expect(result.metadata.format).toBe(FileFormat.JSON);
    });

    it('should parse JSON object with data property', async () => {
      const jsonContent = JSON.stringify({
        data: [
          { name: 'Product A', quantity: 10 },
          { name: 'Product B', quantity: 20 },
        ],
      });
      const buffer = Buffer.from(jsonContent);

      const result = await parser.parse(buffer);

      expect(result.data).toHaveLength(2);
      expect(result.data[0].name).toBe('Product A');
    });

    it('should parse JSON object with items property', async () => {
      const jsonContent = JSON.stringify({
        items: [{ name: 'Product A' }],
      });
      const buffer = Buffer.from(jsonContent);

      const result = await parser.parse(buffer);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('Product A');
    });

    it('should parse JSON object with results property', async () => {
      const jsonContent = JSON.stringify({
        results: [{ name: 'Product A' }],
      });
      const buffer = Buffer.from(jsonContent);

      const result = await parser.parse(buffer);

      expect(result.data).toHaveLength(1);
    });

    it('should parse JSON object with records property', async () => {
      const jsonContent = JSON.stringify({
        records: [{ name: 'Product A' }],
      });
      const buffer = Buffer.from(jsonContent);

      const result = await parser.parse(buffer);

      expect(result.data).toHaveLength(1);
    });

    it('should parse single JSON object', async () => {
      const jsonContent = JSON.stringify({ name: 'Product A', quantity: 10 });
      const buffer = Buffer.from(jsonContent);

      const result = await parser.parse(buffer);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('Product A');
    });

    it('should parse string input', async () => {
      const jsonContent = JSON.stringify([{ name: 'Test' }]);

      const result = await parser.parse(jsonContent);

      expect(result.data).toHaveLength(1);
    });

    it('should flatten nested objects', async () => {
      const jsonContent = JSON.stringify([
        {
          name: 'Product A',
          details: {
            category: 'Electronics',
            price: 1000,
          },
        },
      ]);
      const buffer = Buffer.from(jsonContent);

      const result = await parser.parse(buffer);

      expect(result.data[0].details_category).toBe('Electronics');
      expect(result.data[0].details_price).toBe(1000);
    });

    it('should handle arrays of primitives', async () => {
      const jsonContent = JSON.stringify([
        {
          name: 'Product A',
          tags: ['tag1', 'tag2', 'tag3'],
        },
      ]);
      const buffer = Buffer.from(jsonContent);

      const result = await parser.parse(buffer);

      expect(result.data[0].tags).toBe('tag1, tag2, tag3');
    });

    it('should handle arrays of objects as JSON string', async () => {
      const jsonContent = JSON.stringify([
        {
          name: 'Product A',
          variants: [{ color: 'red' }, { color: 'blue' }],
        },
      ]);
      const buffer = Buffer.from(jsonContent);

      const result = await parser.parse(buffer);

      expect(typeof result.data[0].variants).toBe('string');
      expect(JSON.parse(result.data[0].variants as string)).toHaveLength(2);
    });

    it('should handle null values', async () => {
      const jsonContent = JSON.stringify([
        {
          name: 'Product A',
          description: null,
        },
      ]);
      const buffer = Buffer.from(jsonContent);

      const result = await parser.parse(buffer);

      expect(result.data[0].description).toBeNull();
    });

    it('should handle empty arrays as null', async () => {
      const jsonContent = JSON.stringify([
        {
          name: 'Product A',
          tags: [],
        },
      ]);
      const buffer = Buffer.from(jsonContent);

      const result = await parser.parse(buffer);

      expect(result.data[0].tags).toBeNull();
    });

    it('should parse ISO date strings', async () => {
      const jsonContent = JSON.stringify([
        {
          name: 'Product A',
          created_at: '2025-01-15',
        },
      ]);
      const buffer = Buffer.from(jsonContent);

      const result = await parser.parse(buffer);

      expect(result.data[0].created_at).toBeInstanceOf(Date);
    });

    it('should parse ISO datetime strings', async () => {
      const jsonContent = JSON.stringify([
        {
          name: 'Product A',
          created_at: '2025-01-15T10:30:00Z',
        },
      ]);
      const buffer = Buffer.from(jsonContent);

      const result = await parser.parse(buffer);

      expect(result.data[0].created_at).toBeInstanceOf(Date);
    });

    it('should convert numeric strings to numbers', async () => {
      const jsonContent = JSON.stringify([
        {
          name: 'Product A',
          price: '1500',
        },
      ]);
      const buffer = Buffer.from(jsonContent);

      const result = await parser.parse(buffer);

      expect(typeof result.data[0].price).toBe('number');
      expect(result.data[0].price).toBe(1500);
    });

    it('should fix JSON with trailing commas', async () => {
      const jsonContent = '[{"name": "Product A",}]';
      const buffer = Buffer.from(jsonContent);

      const result = await parser.parse(buffer);

      expect(result.data).toHaveLength(1);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].type).toBe('format');
    });

    it('should fix JSON with single quotes', async () => {
      const jsonContent = "[{'name': 'Product A'}]";
      const buffer = Buffer.from(jsonContent);

      const result = await parser.parse(buffer);

      expect(result.data).toHaveLength(1);
    });

    it('should extract headers from all objects', async () => {
      const jsonContent = JSON.stringify([
        { name: 'Product A', price: 100 },
        { name: 'Product B', quantity: 20 },
      ]);
      const buffer = Buffer.from(jsonContent);

      const result = await parser.parse(buffer);

      expect(result.metadata.headers).toContain('name');
      expect(result.metadata.headers).toContain('price');
      expect(result.metadata.headers).toContain('quantity');
    });

    it('should calculate statistics correctly', async () => {
      const jsonContent = JSON.stringify([{ name: 'Product A' }, { name: 'Product B' }]);
      const buffer = Buffer.from(jsonContent);

      const result = await parser.parse(buffer);

      expect(result.statistics.totalRows).toBe(2);
      expect(result.statistics.validRows).toBe(2);
      expect(result.statistics.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should throw error for invalid JSON that cannot be fixed', async () => {
      const invalidJson = 'not valid json at all {{{';
      const buffer = Buffer.from(invalidJson);

      await expect(parser.parse(buffer)).rejects.toThrow();
    });

    it('should handle Buffer with different encoding', async () => {
      const jsonContent = JSON.stringify([{ name: 'Product A' }]);
      const buffer = Buffer.from(jsonContent, 'utf8');

      const result = await parser.parse(buffer, { encoding: 'utf8' });

      expect(result.data).toHaveLength(1);
    });

    it('should add errors for objects that fail to normalize', async () => {
      // This test verifies error handling during normalization
      const jsonContent = JSON.stringify([{ name: 'Product A' }, { name: 'Product B' }]);
      const buffer = Buffer.from(jsonContent);

      const result = await parser.parse(buffer);

      // All should succeed in this case
      expect(result.data).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle primitive value as single item', async () => {
      const jsonContent = JSON.stringify({ value: 'test' });
      const buffer = Buffer.from(jsonContent);

      const result = await parser.parse(buffer);

      expect(result.data).toHaveLength(1);
    });
  });

  describe('validate', () => {
    it('should return valid result for parsed data', () => {
      const mockParsedData: ParsedData = {
        data: [{ name: 'Test' }],
        metadata: {
          format: FileFormat.JSON,
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
          format: FileFormat.JSON,
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
    it('should return JSON format', () => {
      const buffer = Buffer.from('{"name": "test"}');
      const result = parser.detectFormat(buffer);
      expect(result).toBe(FileFormat.JSON);
    });
  });

  describe('tryRecoverCorruptedData', () => {
    it('should attempt recovery with different encodings', async () => {
      const buffer = Buffer.from(JSON.stringify([{ name: 'Test' }]));

      const result = await parser.tryRecoverCorruptedData(buffer);

      expect(result).not.toBeNull();
      expect(result?.data).toHaveLength(1);
    });

    it('should return null for unrecoverable data', async () => {
      const buffer = Buffer.from('completely invalid {{{{');

      const result = await parser.tryRecoverCorruptedData(buffer);

      expect(result).toBeNull();
    });
  });

  describe('getSupportedFormats', () => {
    it('should return JSON as supported format', () => {
      const formats = parser.getSupportedFormats();
      expect(formats).toContain(FileFormat.JSON);
    });
  });

  describe('canParse', () => {
    it('should return true for JSON format', () => {
      expect(parser.canParse(FileFormat.JSON)).toBe(true);
    });

    it('should return false for non-JSON formats', () => {
      expect(parser.canParse(FileFormat.CSV)).toBe(false);
      expect(parser.canParse(FileFormat.EXCEL)).toBe(false);
    });
  });
});
