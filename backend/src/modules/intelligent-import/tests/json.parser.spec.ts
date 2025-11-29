import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { JsonParser } from '../tools/parsers/json.parser';

describe('JsonParser', () => {
  let parser: JsonParser;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JsonParser],
    }).compile();

    parser = module.get<JsonParser>(JsonParser);
  });

  describe('parse', () => {
    it('should parse array of objects', () => {
      // Arrange
      const jsonData = [
        { name: 'John', age: 30, city: 'NYC' },
        { name: 'Jane', age: 25, city: 'LA' },
      ];
      const buffer = Buffer.from(JSON.stringify(jsonData));

      // Act
      const result = parser.parse(buffer);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].headers).toEqual(['name', 'age', 'city']);
      expect(result[0].rows).toHaveLength(2);
      expect(result[0].rows[0]).toEqual(['John', 30, 'NYC']);
      expect(result[0].rows[1]).toEqual(['Jane', 25, 'LA']);
    });

    it('should parse object with "data" property', () => {
      // Arrange
      const jsonData = {
        data: [
          { name: 'John', age: 30 },
          { name: 'Jane', age: 25 },
        ],
      };
      const buffer = Buffer.from(JSON.stringify(jsonData));

      // Act
      const result = parser.parse(buffer);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].headers).toEqual(['name', 'age']);
      expect(result[0].rows).toHaveLength(2);
    });

    it('should parse object with "rows" property', () => {
      // Arrange
      const jsonData = {
        rows: [
          { name: 'John', age: 30 },
          { name: 'Jane', age: 25 },
        ],
      };
      const buffer = Buffer.from(JSON.stringify(jsonData));

      // Act
      const result = parser.parse(buffer);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].rows).toHaveLength(2);
    });

    it('should parse object with "records" property', () => {
      // Arrange
      const jsonData = {
        records: [
          { name: 'John', age: 30 },
          { name: 'Jane', age: 25 },
        ],
      };
      const buffer = Buffer.from(JSON.stringify(jsonData));

      // Act
      const result = parser.parse(buffer);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].rows).toHaveLength(2);
    });

    it('should parse object with "items" property', () => {
      // Arrange
      const jsonData = {
        items: [
          { name: 'John', age: 30 },
          { name: 'Jane', age: 25 },
        ],
      };
      const buffer = Buffer.from(JSON.stringify(jsonData));

      // Act
      const result = parser.parse(buffer);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].rows).toHaveLength(2);
    });

    it('should find first array property in nested object', () => {
      // Arrange
      const jsonData = {
        metadata: { version: 1 },
        customRecords: [
          { name: 'John', age: 30 },
          { name: 'Jane', age: 25 },
        ],
      };
      const buffer = Buffer.from(JSON.stringify(jsonData));

      // Act
      const result = parser.parse(buffer);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].rows).toHaveLength(2);
    });

    it('should wrap single object in array', () => {
      // Arrange
      const jsonData = { name: 'John', age: 30, city: 'NYC' };
      const buffer = Buffer.from(JSON.stringify(jsonData));

      // Act
      const result = parser.parse(buffer);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].headers).toEqual(['name', 'age', 'city']);
      expect(result[0].rows).toHaveLength(1);
      expect(result[0].rows[0]).toEqual(['John', 30, 'NYC']);
    });

    it('should handle sparse data (missing keys in some objects)', () => {
      // Arrange
      const jsonData = [
        { name: 'John', age: 30 },
        { name: 'Jane', city: 'LA' },
        { age: 40, city: 'Chicago' },
      ];
      const buffer = Buffer.from(JSON.stringify(jsonData));

      // Act
      const result = parser.parse(buffer);

      // Assert
      expect(result[0].headers).toContain('name');
      expect(result[0].headers).toContain('age');
      expect(result[0].headers).toContain('city');
      expect(result[0].headers).toHaveLength(3);
    });

    it('should flatten nested objects to JSON strings', () => {
      // Arrange
      const jsonData = [
        {
          name: 'John',
          address: { street: '123 Main St', city: 'NYC' },
        },
      ];
      const buffer = Buffer.from(JSON.stringify(jsonData));

      // Act
      const result = parser.parse(buffer);

      // Assert
      expect(result[0].headers).toContain('address');
      const addressValue = result[0].rows[0][result[0].headers.indexOf('address')];
      expect(typeof addressValue).toBe('string');
      expect(addressValue).toContain('123 Main St');
    });

    it('should handle null values', () => {
      // Arrange
      const jsonData = [
        { name: 'John', age: null },
        { name: null, age: 25 },
      ];
      const buffer = Buffer.from(JSON.stringify(jsonData));

      // Act
      const result = parser.parse(buffer);

      // Assert
      expect(result[0].rows[0]).toContain(null);
      expect(result[0].rows[1]).toContain(null);
    });

    it('should handle undefined values (serialized as null in JSON)', () => {
      // Arrange - JSON.stringify removes undefined values, so we test with explicit null
      const jsonData = [{ name: 'John', age: null }];
      const buffer = Buffer.from(JSON.stringify(jsonData));

      // Act
      const result = parser.parse(buffer);

      // Assert - null values should be preserved
      expect(result[0].rows[0]).toContain(null);
    });

    it('should throw BadRequestException for invalid JSON syntax', () => {
      // Arrange
      const invalidJson = '{ invalid json }';
      const buffer = Buffer.from(invalidJson);

      // Act & Assert
      expect(() => parser.parse(buffer)).toThrow(BadRequestException);
      expect(() => parser.parse(buffer)).toThrow('Invalid JSON syntax');
    });

    it('should throw BadRequestException for empty array', () => {
      // Arrange
      const emptyArray = '[]';
      const buffer = Buffer.from(emptyArray);

      // Act & Assert
      expect(() => parser.parse(buffer)).toThrow(BadRequestException);
      expect(() => parser.parse(buffer)).toThrow('Invalid JSON structure');
    });

    it('should throw BadRequestException for invalid structure', () => {
      // Arrange - array of primitives (not objects)
      const invalidStructure = JSON.stringify([1, 2, 3]);
      const buffer = Buffer.from(invalidStructure);

      // Act & Assert
      expect(() => parser.parse(buffer)).toThrow(BadRequestException);
    });

    it('should include correct metadata', () => {
      // Arrange
      const jsonData = [
        { col1: 'a', col2: 'b', col3: 'c' },
        { col1: 'd', col2: 'e', col3: 'f' },
      ];
      const buffer = Buffer.from(JSON.stringify(jsonData));

      // Act
      const result = parser.parse(buffer);

      // Assert
      expect(result[0].metadata).toEqual({
        totalRows: 2,
        totalColumns: 3,
        format: 'json',
      });
    });

    it('should handle arrays in values', () => {
      // Arrange
      const jsonData = [{ name: 'John', tags: ['dev', 'js', 'node'] }];
      const buffer = Buffer.from(JSON.stringify(jsonData));

      // Act
      const result = parser.parse(buffer);

      // Assert
      const tagsValue = result[0].rows[0][result[0].headers.indexOf('tags')];
      expect(typeof tagsValue).toBe('string');
      expect(tagsValue).toContain('dev');
    });

    it('should handle boolean values', () => {
      // Arrange
      const jsonData = [
        { name: 'John', active: true },
        { name: 'Jane', active: false },
      ];
      const buffer = Buffer.from(JSON.stringify(jsonData));

      // Act
      const result = parser.parse(buffer);

      // Assert
      const activeIndex = result[0].headers.indexOf('active');
      expect(result[0].rows[0][activeIndex]).toBe(true);
      expect(result[0].rows[1][activeIndex]).toBe(false);
    });

    it('should handle numeric values', () => {
      // Arrange
      const jsonData = [{ integer: 100, float: 99.99, negative: -50, zero: 0 }];
      const buffer = Buffer.from(JSON.stringify(jsonData));

      // Act
      const result = parser.parse(buffer);

      // Assert
      expect(result[0].rows[0]).toEqual([100, 99.99, -50, 0]);
    });

    it('should handle large JSON files', () => {
      // Arrange
      const largeData = Array(1000)
        .fill(null)
        .map((_, i) => ({ id: i, name: `Item ${i}`, value: i * 10 }));
      const buffer = Buffer.from(JSON.stringify(largeData));

      // Act
      const result = parser.parse(buffer);

      // Assert
      expect(result[0].rows).toHaveLength(1000);
    });

    it('should handle non-object items in array by returning null row', () => {
      // Arrange
      const jsonData = [{ name: 'John' }, null, { name: 'Jane' }];
      const buffer = Buffer.from(JSON.stringify(jsonData));

      // Act
      const result = parser.parse(buffer);

      // Assert
      expect(result[0].rows).toHaveLength(3);
      expect(result[0].rows[1]).toEqual([null]); // null item results in null row
    });
  });

  describe('detectEncoding', () => {
    it('should always return utf-8 for JSON files', () => {
      // Arrange
      const buffer = Buffer.from('{}');

      // Act
      const encoding = parser.detectEncoding(buffer);

      // Assert
      expect(encoding).toBe('utf-8');
    });
  });

  describe('extractHeaders', () => {
    it('should extract headers from JSON array', () => {
      // Arrange
      const jsonData = [
        { name: 'John', age: 30, city: 'NYC' },
        { name: 'Jane', age: 25, city: 'LA' },
      ];
      const buffer = Buffer.from(JSON.stringify(jsonData));

      // Act
      const headers = parser.extractHeaders(buffer);

      // Assert
      expect(headers).toEqual(['name', 'age', 'city']);
    });

    it('should return empty array for invalid JSON', () => {
      // Arrange
      const buffer = Buffer.from('invalid');

      // Act & Assert
      expect(() => parser.extractHeaders(buffer)).toThrow(BadRequestException);
    });
  });

  describe('flattenValue (private)', () => {
    it('should return primitives as-is', () => {
      // Act
      const result1 = (parser as any).flattenValue('test');
      const result2 = (parser as any).flattenValue(123);
      const result3 = (parser as any).flattenValue(true);

      // Assert
      expect(result1).toBe('test');
      expect(result2).toBe(123);
      expect(result3).toBe(true);
    });

    it('should return null for null/undefined', () => {
      // Act
      const result1 = (parser as any).flattenValue(null);
      const result2 = (parser as any).flattenValue(undefined);

      // Assert
      expect(result1).toBe(null);
      expect(result2).toBe(null);
    });

    it('should stringify objects', () => {
      // Act
      const result = (parser as any).flattenValue({ key: 'value' });

      // Assert
      expect(result).toBe('{"key":"value"}');
    });

    it('should stringify arrays', () => {
      // Act
      const result = (parser as any).flattenValue([1, 2, 3]);

      // Assert
      expect(result).toBe('[1,2,3]');
    });
  });

  describe('parseArrayOfObjects (private)', () => {
    it('should throw for empty array', () => {
      // Act & Assert
      expect(() => (parser as any).parseArrayOfObjects([])).toThrow(BadRequestException);
      expect(() => (parser as any).parseArrayOfObjects([])).toThrow('JSON array is empty');
    });

    it('should extract all unique keys from all objects', () => {
      // Arrange
      const data = [{ a: 1 }, { b: 2 }, { c: 3 }];

      // Act
      const result = (parser as any).parseArrayOfObjects(data);

      // Assert
      expect(result[0].headers).toContain('a');
      expect(result[0].headers).toContain('b');
      expect(result[0].headers).toContain('c');
    });
  });
});
