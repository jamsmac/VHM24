import { Test, TestingModule } from '@nestjs/testing';
import { FileIntakeAgent } from '../agents/file-intake.agent';
import { XlsxParser } from '../tools/parsers/xlsx.parser';
import { CsvParser } from '../tools/parsers/csv.parser';
import { JsonParser } from '../tools/parsers/json.parser';
import { XmlParser } from '../tools/parsers/xml.parser';
import { FileUpload, FileType, AgentContext } from '../interfaces/common.interface';

describe('FileIntakeAgent', () => {
  let agent: FileIntakeAgent;
  let xlsxParser: XlsxParser;
  let csvParser: CsvParser;
  let jsonParser: JsonParser;
  let xmlParser: XmlParser;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FileIntakeAgent, XlsxParser, CsvParser, JsonParser, XmlParser],
    }).compile();

    agent = module.get<FileIntakeAgent>(FileIntakeAgent);
    xlsxParser = module.get<XlsxParser>(XlsxParser);
    csvParser = module.get<CsvParser>(CsvParser);
    jsonParser = module.get<JsonParser>(JsonParser);
    xmlParser = module.get<XmlParser>(XmlParser);
  });

  it('should be defined', () => {
    expect(agent).toBeDefined();
  });

  describe('detectFileType', () => {
    it('should detect CSV from extension', () => {
      const fileType = (agent as any).detectFileType('data.csv', 'text/csv');
      expect(fileType).toBe(FileType.CSV);
    });

    it('should detect XLSX from extension', () => {
      const fileType = (agent as any).detectFileType(
        'data.xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(fileType).toBe(FileType.EXCEL);
    });

    it('should detect JSON from extension', () => {
      const fileType = (agent as any).detectFileType('data.json', 'application/json');
      expect(fileType).toBe(FileType.JSON);
    });

    it('should detect XML from extension', () => {
      const fileType = (agent as any).detectFileType('data.xml', 'text/xml');
      expect(fileType).toBe(FileType.XML);
    });

    it('should throw error for unsupported file type', () => {
      expect(() => (agent as any).detectFileType('data.pdf', 'application/pdf')).toThrow(
        'Unsupported file type',
      );
    });
  });

  describe('execute', () => {
    it('should parse CSV file successfully', async () => {
      const csvData = 'Name,Age\nJohn,30\nJane,25';
      const fileUpload: FileUpload = {
        buffer: Buffer.from(csvData),
        filename: 'test.csv',
        mimetype: 'text/csv',
        size: csvData.length,
      };

      const context: AgentContext = {
        sessionId: 'test-session',
        userId: 'test-user',
      };

      const result = await agent.execute(fileUpload, context);

      expect(result.fileType).toBe(FileType.CSV);
      expect(result.metadata.filename).toBe('test.csv');
      expect(result.metadata.size).toBe(csvData.length);
      expect(result.metadata.rowCount).toBeGreaterThan(0);
      expect(result.metadata.checksum).toBeDefined();
    });

    it('should parse JSON file successfully', async () => {
      const jsonData = JSON.stringify([
        { name: 'John', age: 30 },
        { name: 'Jane', age: 25 },
      ]);
      const fileUpload: FileUpload = {
        buffer: Buffer.from(jsonData),
        filename: 'test.json',
        mimetype: 'application/json',
        size: jsonData.length,
      };

      const context: AgentContext = {
        sessionId: 'test-session',
        userId: 'test-user',
      };

      const result = await agent.execute(fileUpload, context);

      expect(result.fileType).toBe(FileType.JSON);
      expect(result.metadata.filename).toBe('test.json');
      expect(result.metadata.checksum).toBeDefined();
    });

    it('should parse XML file successfully', async () => {
      const xmlData = `<?xml version="1.0" encoding="UTF-8"?>
<root>
  <row><name>John</name><age>30</age></row>
  <row><name>Jane</name><age>25</age></row>
</root>`;
      const fileUpload: FileUpload = {
        buffer: Buffer.from(xmlData),
        filename: 'test.xml',
        mimetype: 'text/xml',
        size: xmlData.length,
      };

      const context: AgentContext = {
        sessionId: 'test-session',
        userId: 'test-user',
      };

      const result = await agent.execute(fileUpload, context);

      expect(result.fileType).toBe(FileType.XML);
      expect(result.metadata.filename).toBe('test.xml');
      expect(result.metadata.checksum).toBeDefined();
    });

    it('should parse XLSX file successfully', async () => {
      // Create a minimal XLSX buffer (Excel files are ZIP archives)
      // We'll mock the xlsxParser to handle this test
      jest.spyOn(xlsxParser, 'parse').mockResolvedValue([
        {
          headers: ['Name', 'Age'],
          rows: [
            ['John', 30],
            ['Jane', 25],
          ],
          metadata: { sheetName: 'Sheet1', totalRows: 2, totalColumns: 2 },
        },
      ]);
      jest.spyOn(xlsxParser, 'detectEncoding').mockReturnValue('utf-8');

      const fileUpload: FileUpload = {
        buffer: Buffer.from('fake-xlsx-content'),
        filename: 'test.xlsx',
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: 100,
      };

      const context: AgentContext = {
        sessionId: 'test-session',
        userId: 'test-user',
      };

      const result = await agent.execute(fileUpload, context);

      expect(result.fileType).toBe(FileType.EXCEL);
      expect(result.metadata.filename).toBe('test.xlsx');
      expect(result.metadata.checksum).toBeDefined();
    });

    it('should calculate SHA-256 checksum', async () => {
      const csvData = 'Name,Age\nJohn,30';
      const fileUpload: FileUpload = {
        buffer: Buffer.from(csvData),
        filename: 'test.csv',
        mimetype: 'text/csv',
        size: csvData.length,
      };

      const context: AgentContext = {
        sessionId: 'test-session',
        userId: 'test-user',
      };

      const result = await agent.execute(fileUpload, context);

      expect(result.metadata.checksum).toHaveLength(64); // SHA-256 hex string
      expect(result.metadata.checksum).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should validate file size limit', async () => {
      const largeData = 'x'.repeat(51 * 1024 * 1024); // 51MB
      const fileUpload: FileUpload = {
        buffer: Buffer.from(largeData),
        filename: 'large.csv',
        mimetype: 'text/csv',
        size: largeData.length,
      };

      const context: AgentContext = {
        sessionId: 'test-session',
        userId: 'test-user',
      };

      await expect(agent.execute(fileUpload, context)).rejects.toThrow('File parsing failed');
    });
  });

  describe('validateInput', () => {
    it('should validate correct input', async () => {
      const input: FileUpload = {
        buffer: Buffer.from('test'),
        filename: 'test.csv',
        mimetype: 'text/csv',
        size: 4,
      };

      const result = await agent.validateInput(input);
      expect(result).toBe(true);
    });

    it('should reject missing filename', async () => {
      const input: any = {
        buffer: Buffer.from('test'),
        mimetype: 'text/csv',
        size: 4,
      };

      await expect(agent.validateInput(input)).rejects.toThrow('Filename is required');
    });

    it('should reject empty buffer', async () => {
      const input: FileUpload = {
        buffer: Buffer.from(''),
        filename: 'test.csv',
        mimetype: 'text/csv',
        size: 0,
      };

      await expect(agent.validateInput(input)).rejects.toThrow('File buffer is empty');
    });

    it('should reject file size exceeding 50MB', async () => {
      const input: FileUpload = {
        buffer: Buffer.from('x'),
        filename: 'test.csv',
        mimetype: 'text/csv',
        size: 51 * 1024 * 1024, // 51MB
      };

      await expect(agent.validateInput(input)).rejects.toThrow('File size exceeds 50MB limit');
    });
  });

  describe('detectFileType edge cases', () => {
    it('should detect Excel from XLS extension', () => {
      const fileType = (agent as any).detectFileType('data.xls', 'application/vnd.ms-excel');
      expect(fileType).toBe(FileType.EXCEL);
    });

    it('should detect Excel from spreadsheet mimetype', () => {
      const fileType = (agent as any).detectFileType(
        'data.unknown',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(fileType).toBe(FileType.EXCEL);
    });

    it('should detect XML from xml mimetype', () => {
      const fileType = (agent as any).detectFileType('data.unknown', 'application/xml');
      expect(fileType).toBe(FileType.XML);
    });
  });

  describe('getStatus', () => {
    it('should return current status', () => {
      const status = agent.getStatus();
      expect(status).toBeDefined();
    });
  });
});
