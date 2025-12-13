import { Injectable, BadRequestException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { RawTable } from '../../interfaces/common.interface';

/**
 * XLSX Parser
 *
 * Parses Excel files (.xlsx, .xls) and extracts tables
 */
@Injectable()
export class XlsxParser {
  /**
   * Parse Excel file from buffer
   */
  async parse(buffer: Buffer): Promise<RawTable[]> {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer as any);

      const tables: RawTable[] = [];

      // Process all sheets
      for (const worksheet of workbook.worksheets) {
        const sheetName = worksheet.name;

        // Convert to array of arrays (header: 1 equivalent)
        const jsonData: any[][] = [];
        worksheet.eachRow((row) => {
          const rowValues: any[] = [];
          row.eachCell({ includeEmpty: true }, (cell) => {
            rowValues.push(cell.value);
          });
          jsonData.push(rowValues);
        });

        if (jsonData.length === 0) {
          continue; // Skip empty sheets
        }

        // First row is headers
        const headers = (jsonData[0] as any[]).map((h) => String(h || '').trim());

        // Remaining rows are data
        const rows = jsonData.slice(1) as any[][];

        // Filter out empty rows
        const validRows = rows.filter((row) =>
          row.some((cell) => cell !== null && cell !== undefined && cell !== ''),
        );

        if (validRows.length > 0) {
          tables.push({
            headers,
            rows: validRows,
            metadata: {
              sheetName,
              totalRows: validRows.length,
              totalColumns: headers.length,
            },
          });
        }
      }

      if (tables.length === 0) {
        throw new BadRequestException('Excel file contains no valid data');
      }

      return tables;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to parse Excel file: ${error.message}`);
    }
  }

  /**
   * Detect encoding (Excel files are binary, so this always returns 'binary')
   */
  detectEncoding(_buffer: Buffer): string {
    return 'binary';
  }

  /**
   * Extract headers from first row
   */
  async extractHeaders(buffer: Buffer): Promise<string[]> {
    const tables = await this.parse(buffer);
    return tables[0]?.headers || [];
  }
}
