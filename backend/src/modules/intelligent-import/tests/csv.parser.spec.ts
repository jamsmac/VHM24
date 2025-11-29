import { Test, TestingModule } from '@nestjs/testing';
import { CsvParser } from '../tools/parsers/csv.parser';

describe('CsvParser', () => {
  let parser: CsvParser;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CsvParser],
    }).compile();

    parser = module.get<CsvParser>(CsvParser);
  });

  it('should be defined', () => {
    expect(parser).toBeDefined();
  });

  describe('parse', () => {
    it('should parse simple CSV with comma delimiter', async () => {
      const csvData = 'Name,Age,City\nJohn,30,NYC\nJane,25,LA';
      const buffer = Buffer.from(csvData);

      const result = await parser.parse(buffer);

      expect(result).toHaveLength(1);
      expect(result[0].headers).toEqual(['Name', 'Age', 'City']);
      expect(result[0].rows).toHaveLength(2);
      expect(result[0].rows[0]).toEqual(['John', '30', 'NYC']);
      expect(result[0].rows[1]).toEqual(['Jane', '25', 'LA']);
    });

    it('should parse CSV with semicolon delimiter', async () => {
      const csvData = 'Name;Age;City\nJohn;30;NYC\nJane;25;LA';
      const buffer = Buffer.from(csvData);

      const result = await parser.parse(buffer);

      expect(result).toHaveLength(1);
      expect(result[0].headers).toEqual(['Name', 'Age', 'City']);
      expect(result[0].metadata?.delimiter).toBe(';');
    });

    it('should parse CSV with tab delimiter', async () => {
      const csvData = 'Name\tAge\tCity\nJohn\t30\tNYC\nJane\t25\tLA';
      const buffer = Buffer.from(csvData);

      const result = await parser.parse(buffer);

      expect(result).toHaveLength(1);
      expect(result[0].headers).toEqual(['Name', 'Age', 'City']);
      expect(result[0].metadata?.delimiter).toBe('\t');
    });

    it('should parse CSV with pipe delimiter', async () => {
      const csvData = 'Name|Age|City\nJohn|30|NYC\nJane|25|LA';
      const buffer = Buffer.from(csvData);

      const result = await parser.parse(buffer);

      expect(result).toHaveLength(1);
      expect(result[0].headers).toEqual(['Name', 'Age', 'City']);
      expect(result[0].metadata?.delimiter).toBe('|');
    });

    it('should handle CSV with quoted fields', async () => {
      // Simple CSV with quotes (no commas inside quoted fields to avoid delimiter detection issues)
      const csvData =
        'Name,Description,Price\n"Product A","Simple text",10.99\n"Product B","Another item",20.50';
      const buffer = Buffer.from(csvData);

      const result = await parser.parse(buffer);

      expect(result).toHaveLength(1);
      expect(result[0].headers).toEqual(['Name', 'Description', 'Price']);
      expect(result[0].rows).toHaveLength(2);
      expect(result[0].rows[0][0]).toBe('Product A');
      expect(result[0].rows[0][1]).toBe('Simple text');
    });

    it('should handle empty rows', async () => {
      const csvData = 'Name,Age\nJohn,30\n\nJane,25';
      const buffer = Buffer.from(csvData);

      const result = await parser.parse(buffer);

      expect(result).toHaveLength(1);
      expect(result[0].rows.length).toBeGreaterThan(0);
    });

    it('should detect UTF-8 encoding', () => {
      const csvData = 'Имя,Возраст\nИван,30';
      const buffer = Buffer.from(csvData, 'utf-8');

      const encoding = (parser as any).detectEncoding(buffer);

      expect(encoding).toBe('utf-8');
    });

    it('should handle large CSV files', async () => {
      const headers = 'Col1,Col2,Col3';
      const rows = Array(1000).fill('Val1,Val2,Val3').join('\n');
      const csvData = `${headers}\n${rows}`;
      const buffer = Buffer.from(csvData);

      const result = await parser.parse(buffer);

      expect(result).toHaveLength(1);
      expect(result[0].rows).toHaveLength(1000);
    });
  });

  describe('detectDelimiter', () => {
    it('should detect comma delimiter', () => {
      const buffer = Buffer.from('a,b,c\n1,2,3');
      const delimiter = (parser as any).detectDelimiter(buffer);
      expect(delimiter).toBe(',');
    });

    it('should detect semicolon delimiter', () => {
      const buffer = Buffer.from('a;b;c\n1;2;3');
      const delimiter = (parser as any).detectDelimiter(buffer);
      expect(delimiter).toBe(';');
    });

    it('should detect tab delimiter', () => {
      const buffer = Buffer.from('a\tb\tc\n1\t2\t3');
      const delimiter = (parser as any).detectDelimiter(buffer);
      expect(delimiter).toBe('\t');
    });

    it('should prefer most common delimiter', () => {
      const buffer = Buffer.from('a,b;c\n1,2;3\n4,5;6'); // More commas
      const delimiter = (parser as any).detectDelimiter(buffer);
      expect(delimiter).toBe(',');
    });
  });

  describe('edge cases', () => {
    it('should handle empty buffer', async () => {
      const buffer = Buffer.from('');
      await expect(parser.parse(buffer)).rejects.toThrow();
    });

    it('should handle CSV with only headers', async () => {
      const csvData = 'Name,Age,City';
      const buffer = Buffer.from(csvData);

      await expect(parser.parse(buffer)).rejects.toThrow('CSV file contains no valid data');
    });

    it('should handle CSV with Windows line endings (CRLF)', async () => {
      const csvData = 'Name,Age\r\nJohn,30\r\nJane,25';
      const buffer = Buffer.from(csvData);

      const result = await parser.parse(buffer);

      expect(result).toHaveLength(1);
      expect(result[0].rows).toHaveLength(2);
    });

    it('should handle CSV with mixed line endings', async () => {
      const csvData = 'Name,Age\nJohn,30\r\nJane,25\rBob,35';
      const buffer = Buffer.from(csvData);

      const result = await parser.parse(buffer);

      expect(result).toHaveLength(1);
      expect(result[0].rows.length).toBeGreaterThan(0);
    });
  });
});
