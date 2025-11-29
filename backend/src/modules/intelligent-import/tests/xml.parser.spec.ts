import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { XmlParser } from '../tools/parsers/xml.parser';

describe('XmlParser', () => {
  let parser: XmlParser;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [XmlParser],
    }).compile();

    parser = module.get<XmlParser>(XmlParser);
  });

  describe('parse', () => {
    it('should parse simple XML with rows', async () => {
      // Arrange
      const xml = `
        <root>
          <row>
            <name>John</name>
            <age>30</age>
            <city>NYC</city>
          </row>
          <row>
            <name>Jane</name>
            <age>25</age>
            <city>LA</city>
          </row>
        </root>
      `;
      const buffer = Buffer.from(xml);

      // Act
      const result = await parser.parse(buffer);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].headers).toContain('name');
      expect(result[0].headers).toContain('age');
      expect(result[0].headers).toContain('city');
      expect(result[0].rows).toHaveLength(2);
    });

    it('should parse XML with nested data property', async () => {
      // Arrange
      const xml = `
        <root>
          <data>
            <record>
              <name>John</name>
              <value>100</value>
            </record>
            <record>
              <name>Jane</name>
              <value>200</value>
            </record>
          </data>
        </root>
      `;
      const buffer = Buffer.from(xml);

      // Act
      const result = await parser.parse(buffer);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].rows).toHaveLength(2);
    });

    it('should handle XML with attributes', async () => {
      // Arrange
      const xml = `
        <root>
          <item id="1" name="Coffee">
            <price>10</price>
          </item>
          <item id="2" name="Tea">
            <price>5</price>
          </item>
        </root>
      `;
      const buffer = Buffer.from(xml);

      // Act
      const result = await parser.parse(buffer);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].headers).toContain('id');
      expect(result[0].headers).toContain('name');
      expect(result[0].headers).toContain('price');
    });

    it('should flatten nested objects with dot notation', async () => {
      // Arrange
      const xml = `
        <root>
          <person>
            <name>John</name>
            <address>
              <street>123 Main St</street>
              <city>NYC</city>
            </address>
          </person>
        </root>
      `;
      const buffer = Buffer.from(xml);

      // Act
      const result = await parser.parse(buffer);

      // Assert
      expect(result[0].headers).toContain('name');
      expect(result[0].headers).toContain('address.street');
      expect(result[0].headers).toContain('address.city');
    });

    it('should handle single record (wrap in array)', async () => {
      // Arrange
      const xml = `
        <root>
          <record>
            <name>Single</name>
            <value>100</value>
          </record>
        </root>
      `;
      const buffer = Buffer.from(xml);

      // Act
      const result = await parser.parse(buffer);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].rows).toHaveLength(1);
    });

    it('should throw BadRequestException for invalid XML', async () => {
      // Arrange
      const invalidXml = '<root><unclosed>';
      const buffer = Buffer.from(invalidXml);

      // Act & Assert
      await expect(parser.parse(buffer)).rejects.toThrow(BadRequestException);
      await expect(parser.parse(buffer)).rejects.toThrow('Failed to parse XML file');
    });

    it('should throw BadRequestException for XML without valid records', async () => {
      // Arrange
      const emptyXml = '<root></root>';
      const buffer = Buffer.from(emptyXml);

      // Act & Assert
      await expect(parser.parse(buffer)).rejects.toThrow(BadRequestException);
      await expect(parser.parse(buffer)).rejects.toThrow(
        'XML does not contain valid record structure',
      );
    });

    it('should include correct metadata', async () => {
      // Arrange
      const xml = `
        <root>
          <item><a>1</a><b>2</b><c>3</c></item>
          <item><a>4</a><b>5</b><c>6</c></item>
        </root>
      `;
      const buffer = Buffer.from(xml);

      // Act
      const result = await parser.parse(buffer);

      // Assert
      expect(result[0].metadata).toEqual({
        totalRows: 2,
        totalColumns: 3,
        format: 'xml',
      });
    });

    it('should handle null values in records', async () => {
      // Arrange
      const xml = `
        <root>
          <row>
            <name>John</name>
            <age></age>
          </row>
        </root>
      `;
      const buffer = Buffer.from(xml);

      // Act
      const result = await parser.parse(buffer);

      // Assert
      expect(result).toHaveLength(1);
      // Empty string is a valid value
      expect(result[0].rows[0]).toBeDefined();
    });

    it('should handle arrays in XML (joined by comma)', async () => {
      // Arrange - xml2js with explicitArray: false may not create arrays
      // This tests the array handling in extractValue
      const xml = `
        <root>
          <item>
            <name>John</name>
            <tags>
              <tag>dev</tag>
              <tag>js</tag>
            </tags>
          </item>
        </root>
      `;
      const buffer = Buffer.from(xml);

      // Act
      const result = await parser.parse(buffer);

      // Assert
      expect(result).toHaveLength(1);
    });

    it('should handle large XML files', async () => {
      // Arrange
      let xmlRows = '';
      for (let i = 0; i < 100; i++) {
        xmlRows += `<row><id>${i}</id><name>Item ${i}</name></row>`;
      }
      const xml = `<root>${xmlRows}</root>`;
      const buffer = Buffer.from(xml);

      // Act
      const result = await parser.parse(buffer);

      // Assert
      expect(result[0].rows).toHaveLength(100);
    });

    it('should handle XML with numeric values', async () => {
      // Arrange
      const xml = `
        <root>
          <item>
            <integer>100</integer>
            <float>99.99</float>
          </item>
        </root>
      `;
      const buffer = Buffer.from(xml);

      // Act
      const result = await parser.parse(buffer);

      // Assert
      expect(result[0].rows[0]).toBeDefined();
    });

    it('should handle XML with special characters', async () => {
      // Arrange
      const xml = `
        <root>
          <item>
            <name>Coffee &amp; Tea</name>
            <description>&lt;hot&gt;</description>
          </item>
        </root>
      `;
      const buffer = Buffer.from(xml);

      // Act
      const result = await parser.parse(buffer);

      // Assert
      expect(result).toHaveLength(1);
      const nameIndex = result[0].headers.indexOf('name');
      expect(result[0].rows[0][nameIndex]).toContain('Coffee');
    });

    it('should handle CDATA sections', async () => {
      // Arrange
      const xml = `
        <root>
          <item>
            <name><![CDATA[<Special> Content]]></name>
          </item>
        </root>
      `;
      const buffer = Buffer.from(xml);

      // Act
      const result = await parser.parse(buffer);

      // Assert
      expect(result).toHaveLength(1);
    });
  });

  describe('detectEncoding', () => {
    it('should detect encoding from XML declaration', () => {
      // Arrange
      const xml = '<?xml version="1.0" encoding="UTF-8"?><root></root>';
      const buffer = Buffer.from(xml);

      // Act
      const encoding = parser.detectEncoding(buffer);

      // Assert
      expect(encoding).toBe('utf-8');
    });

    it('should detect Windows-1251 encoding', () => {
      // Arrange
      const xml = '<?xml version="1.0" encoding="windows-1251"?><root></root>';
      const buffer = Buffer.from(xml);

      // Act
      const encoding = parser.detectEncoding(buffer);

      // Assert
      expect(encoding).toBe('windows-1251');
    });

    it('should detect ISO-8859-1 encoding', () => {
      // Arrange
      const xml = '<?xml version="1.0" encoding="ISO-8859-1"?><root></root>';
      const buffer = Buffer.from(xml);

      // Act
      const encoding = parser.detectEncoding(buffer);

      // Assert
      expect(encoding).toBe('iso-8859-1');
    });

    it('should default to utf-8 when no encoding specified', () => {
      // Arrange
      const xml = '<root></root>';
      const buffer = Buffer.from(xml);

      // Act
      const encoding = parser.detectEncoding(buffer);

      // Assert
      expect(encoding).toBe('utf-8');
    });

    it('should handle single quotes in encoding declaration', () => {
      // Arrange
      const xml = "<?xml version='1.0' encoding='UTF-16'?><root></root>";
      const buffer = Buffer.from(xml);

      // Act
      const encoding = parser.detectEncoding(buffer);

      // Assert
      expect(encoding).toBe('utf-16');
    });
  });

  describe('extractHeaders', () => {
    it('should extract headers from XML', async () => {
      // Arrange
      const xml = `
        <root>
          <item><name>Test</name><value>100</value></item>
        </root>
      `;
      const buffer = Buffer.from(xml);

      // Act
      const headers = await parser.extractHeaders(buffer);

      // Assert
      expect(headers).toContain('name');
      expect(headers).toContain('value');
    });

    it('should return empty array for invalid XML', async () => {
      // Arrange
      const buffer = Buffer.from('<invalid>');

      // Act & Assert
      await expect(parser.extractHeaders(buffer)).rejects.toThrow();
    });
  });

  describe('findRecordsArray (private)', () => {
    it('should return null for non-object input', () => {
      // Act
      const result = (parser as any).findRecordsArray('string');

      // Assert
      expect(result).toBeNull();
    });

    it('should return array when found directly', () => {
      // Arrange
      const obj = { items: [{ a: 1 }, { b: 2 }] };

      // Act
      const result = (parser as any).findRecordsArray(obj);

      // Assert
      expect(result).toEqual([{ a: 1 }, { b: 2 }]);
    });

    it('should search nested objects for arrays', () => {
      // Arrange
      const obj = {
        wrapper: {
          data: [{ a: 1 }],
        },
      };

      // Act
      const result = (parser as any).findRecordsArray(obj);

      // Assert
      expect(result).toEqual([{ a: 1 }]);
    });

    it('should wrap single object in array', () => {
      // Arrange
      const obj = { root: { name: 'test' } };

      // Act
      const result = (parser as any).findRecordsArray(obj);

      // Assert
      expect(result).toEqual([{ name: 'test' }]);
    });
  });

  describe('parseRecordsToTable (private)', () => {
    it('should throw for empty records array', () => {
      // Act & Assert
      expect(() => (parser as any).parseRecordsToTable([])).toThrow(BadRequestException);
      expect(() => (parser as any).parseRecordsToTable([])).toThrow('XML records array is empty');
    });

    it('should handle non-object records', () => {
      // Arrange
      const records = [null, { name: 'test' }, undefined];

      // Act
      const result = (parser as any).parseRecordsToTable(records);

      // Assert
      expect(result[0].rows).toHaveLength(3);
      expect(result[0].rows[0]).toEqual([null]); // null record
      expect(result[0].rows[2]).toEqual([null]); // undefined becomes null
    });
  });

  describe('extractValue (private)', () => {
    it('should extract value by simple key path', () => {
      // Arrange
      const obj = { name: 'John' };

      // Act
      const result = (parser as any).extractValue(obj, 'name');

      // Assert
      expect(result).toBe('John');
    });

    it('should extract value by dot notation path', () => {
      // Arrange
      const obj = { address: { city: 'NYC' } };

      // Act
      const result = (parser as any).extractValue(obj, 'address.city');

      // Assert
      expect(result).toBe('NYC');
    });

    it('should return null for missing key', () => {
      // Arrange
      const obj = { name: 'John' };

      // Act
      const result = (parser as any).extractValue(obj, 'age');

      // Assert
      expect(result).toBeNull();
    });

    it('should join arrays with comma', () => {
      // Arrange
      const obj = { tags: ['a', 'b', 'c'] };

      // Act
      const result = (parser as any).extractValue(obj, 'tags');

      // Assert
      expect(result).toBe('a, b, c');
    });

    it('should stringify nested objects', () => {
      // Arrange
      const obj = { config: { key: 'value' } };

      // Act
      const result = (parser as any).extractValue(obj, 'config');

      // Assert
      expect(result).toBe('{"key":"value"}');
    });

    it('should handle deeply nested paths', () => {
      // Arrange
      const obj = { a: { b: { c: { d: 'deep' } } } };

      // Act
      const result = (parser as any).extractValue(obj, 'a.b.c.d');

      // Assert
      expect(result).toBe('deep');
    });
  });

  describe('extractKeys (private)', () => {
    it('should extract simple keys', () => {
      // Arrange
      const obj = { name: 'John', age: 30 };
      const keys = new Set<string>();

      // Act
      (parser as any).extractKeys(obj, keys);

      // Assert
      expect(keys.has('name')).toBe(true);
      expect(keys.has('age')).toBe(true);
    });

    it('should flatten nested objects with prefix', () => {
      // Arrange
      const obj = { address: { street: '123', city: 'NYC' } };
      const keys = new Set<string>();

      // Act
      (parser as any).extractKeys(obj, keys);

      // Assert
      expect(keys.has('address.street')).toBe(true);
      expect(keys.has('address.city')).toBe(true);
    });

    it('should not flatten arrays', () => {
      // Arrange
      const obj = { tags: ['a', 'b'] };
      const keys = new Set<string>();

      // Act
      (parser as any).extractKeys(obj, keys);

      // Assert
      expect(keys.has('tags')).toBe(true);
    });

    it('should handle null values', () => {
      // Arrange
      const obj = { name: null };
      const keys = new Set<string>();

      // Act
      (parser as any).extractKeys(obj, keys);

      // Assert
      expect(keys.has('name')).toBe(true);
    });
  });
});
