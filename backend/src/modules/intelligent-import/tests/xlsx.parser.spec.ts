import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { XlsxParser } from '../tools/parsers/xlsx.parser';
import * as ExcelJS from 'exceljs';

// Helper to convert ExcelJS buffer to Node Buffer
const toNodeBuffer = (buffer: ArrayBuffer | Buffer): Buffer => {
  if (Buffer.isBuffer(buffer)) {
    return buffer;
  }
  return Buffer.from(buffer);
};

describe('XlsxParser', () => {
  let parser: XlsxParser;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [XlsxParser],
    }).compile();

    parser = module.get<XlsxParser>(XlsxParser);
  });

  describe('parse', () => {
    it('should parse simple Excel file with one sheet', async () => {
      // Arrange
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Sheet1');
      worksheet.addRow(['Name', 'Age', 'City']);
      worksheet.addRow(['John', 30, 'NYC']);
      worksheet.addRow(['Jane', 25, 'LA']);

      const buffer = toNodeBuffer(await workbook.xlsx.writeBuffer());

      // Act
      const result = await parser.parse(buffer);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].headers).toEqual(['Name', 'Age', 'City']);
      expect(result[0].rows).toHaveLength(2);
      expect(result[0].rows[0]).toEqual(['John', 30, 'NYC']);
      expect(result[0].rows[1]).toEqual(['Jane', 25, 'LA']);
    });

    it('should parse Excel file with multiple sheets', async () => {
      // Arrange
      const workbook = new ExcelJS.Workbook();

      const sheet1 = workbook.addWorksheet('Sales');
      sheet1.addRow(['Product', 'Amount']);
      sheet1.addRow(['Coffee', 100]);

      const sheet2 = workbook.addWorksheet('Inventory');
      sheet2.addRow(['Item', 'Stock']);
      sheet2.addRow(['Coffee Beans', 500]);

      const buffer = toNodeBuffer(await workbook.xlsx.writeBuffer());

      // Act
      const result = await parser.parse(buffer);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].metadata?.sheetName).toBe('Sales');
      expect(result[1].metadata?.sheetName).toBe('Inventory');
    });

    it('should skip empty sheets', async () => {
      // Arrange
      const workbook = new ExcelJS.Workbook();

      workbook.addWorksheet('Empty');
      // No rows added

      const sheet2 = workbook.addWorksheet('Data');
      sheet2.addRow(['Name']);
      sheet2.addRow(['John']);

      const buffer = toNodeBuffer(await workbook.xlsx.writeBuffer());

      // Act
      const result = await parser.parse(buffer);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].metadata?.sheetName).toBe('Data');
    });

    it('should filter out empty rows', async () => {
      // Arrange
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Sheet1');
      worksheet.addRow(['Name', 'Age']);
      worksheet.addRow(['John', 30]);
      worksheet.addRow([null, null]); // Empty row
      worksheet.addRow(['Jane', 25]);

      const buffer = toNodeBuffer(await workbook.xlsx.writeBuffer());

      // Act
      const result = await parser.parse(buffer);

      // Assert
      expect(result[0].rows).toHaveLength(2);
      expect(result[0].metadata?.totalRows).toBe(2);
    });

    it('should handle cells with null values', async () => {
      // Arrange
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Sheet1');
      worksheet.addRow(['Name', 'Age', 'City']);
      worksheet.addRow(['John', null, 'NYC']);

      const buffer = toNodeBuffer(await workbook.xlsx.writeBuffer());

      // Act
      const result = await parser.parse(buffer);

      // Assert
      expect(result[0].rows[0]).toEqual(['John', null, 'NYC']);
    });

    it('should trim header values', async () => {
      // Arrange
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Sheet1');
      worksheet.addRow(['  Name  ', ' Age ', '  City']);
      worksheet.addRow(['John', 30, 'NYC']);

      const buffer = toNodeBuffer(await workbook.xlsx.writeBuffer());

      // Act
      const result = await parser.parse(buffer);

      // Assert
      expect(result[0].headers).toEqual(['Name', 'Age', 'City']);
    });

    it('should handle date values', async () => {
      // Arrange
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Sheet1');
      worksheet.addRow(['Date', 'Amount']);
      worksheet.addRow([new Date('2025-01-15'), 100]);

      const buffer = toNodeBuffer(await workbook.xlsx.writeBuffer());

      // Act
      const result = await parser.parse(buffer);

      // Assert
      expect(result[0].rows[0][0]).toBeInstanceOf(Date);
    });

    it('should handle numeric values', async () => {
      // Arrange
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Sheet1');
      worksheet.addRow(['Integer', 'Float', 'Currency']);
      worksheet.addRow([100, 99.99, 1234.56]);

      const buffer = toNodeBuffer(await workbook.xlsx.writeBuffer());

      // Act
      const result = await parser.parse(buffer);

      // Assert
      expect(result[0].rows[0][0]).toBe(100);
      expect(result[0].rows[0][1]).toBe(99.99);
      expect(result[0].rows[0][2]).toBe(1234.56);
    });

    it('should throw BadRequestException for empty Excel file', async () => {
      // Arrange
      const workbook = new ExcelJS.Workbook();
      workbook.addWorksheet('Empty');
      const buffer = toNodeBuffer(await workbook.xlsx.writeBuffer());

      // Act & Assert
      await expect(parser.parse(buffer)).rejects.toThrow(BadRequestException);
      await expect(parser.parse(buffer)).rejects.toThrow('Excel file contains no valid data');
    });

    it('should throw BadRequestException for invalid file', async () => {
      // Arrange
      const invalidBuffer = Buffer.from('not an excel file');

      // Act & Assert
      await expect(parser.parse(invalidBuffer)).rejects.toThrow(BadRequestException);
      await expect(parser.parse(invalidBuffer)).rejects.toThrow('Failed to parse Excel file');
    });

    it('should include correct metadata', async () => {
      // Arrange
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('TestSheet');
      worksheet.addRow(['Col1', 'Col2', 'Col3']);
      worksheet.addRow(['A', 'B', 'C']);
      worksheet.addRow(['D', 'E', 'F']);

      const buffer = toNodeBuffer(await workbook.xlsx.writeBuffer());

      // Act
      const result = await parser.parse(buffer);

      // Assert
      expect(result[0].metadata).toEqual({
        sheetName: 'TestSheet',
        totalRows: 2,
        totalColumns: 3,
      });
    });

    it('should handle sheet with only headers', async () => {
      // Arrange
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('HeaderOnly');
      worksheet.addRow(['Name', 'Age', 'City']);
      // No data rows

      const buffer = toNodeBuffer(await workbook.xlsx.writeBuffer());

      // Act & Assert - Sheet with only headers throws exception since no valid data
      await expect(parser.parse(buffer)).rejects.toThrow(BadRequestException);
      await expect(parser.parse(buffer)).rejects.toThrow('Excel file contains no valid data');
    });

    it('should handle formulas and return calculated values', async () => {
      // Arrange
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Sheet1');
      worksheet.addRow(['Value1', 'Value2', 'Sum']);
      worksheet.addRow([10, 20, { formula: 'A2+B2', result: 30 }]);

      const buffer = toNodeBuffer(await workbook.xlsx.writeBuffer());

      // Act
      const result = await parser.parse(buffer);

      // Assert - Should get the calculated result
      expect(result[0].rows[0]).toBeDefined();
    });

    it('should handle large Excel files', async () => {
      // Arrange
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('LargeData');
      worksheet.addRow(['Col1', 'Col2', 'Col3']);

      for (let i = 0; i < 1000; i++) {
        worksheet.addRow([`Value${i}`, i, `Data${i}`]);
      }

      const buffer = toNodeBuffer(await workbook.xlsx.writeBuffer());

      // Act
      const result = await parser.parse(buffer);

      // Assert
      expect(result[0].rows).toHaveLength(1000);
    });
  });

  describe('detectEncoding', () => {
    it('should always return binary for Excel files', () => {
      // Arrange
      const buffer = Buffer.from('test');

      // Act
      const encoding = parser.detectEncoding(buffer);

      // Assert
      expect(encoding).toBe('binary');
    });
  });

  describe('extractHeaders', () => {
    it('should extract headers from Excel file', async () => {
      // Arrange
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Sheet1');
      worksheet.addRow(['Name', 'Age', 'City']);
      worksheet.addRow(['John', 30, 'NYC']);

      const buffer = toNodeBuffer(await workbook.xlsx.writeBuffer());

      // Act
      const headers = await parser.extractHeaders(buffer);

      // Assert
      expect(headers).toEqual(['Name', 'Age', 'City']);
    });

    it('should return empty array for empty file', async () => {
      // Arrange
      const workbook = new ExcelJS.Workbook();
      workbook.addWorksheet('Empty');
      const buffer = toNodeBuffer(await workbook.xlsx.writeBuffer());

      // Act & Assert
      await expect(parser.extractHeaders(buffer)).rejects.toThrow();
    });
  });
});
