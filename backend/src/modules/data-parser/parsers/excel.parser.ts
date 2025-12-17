import { Injectable, Logger } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import {
  DataParser,
  FileFormat,
  ParsedData,
  ParserOptions,
  ValidationResult,
  TransformedData,
  ParseWarning,
  ParseError,
} from '../interfaces/parser.interface';

/** Structure info for a worksheet */
interface SheetStructure {
  headerRow: number;
  dataStartRow: number;
  lastRow: number;
  lastCol: number;
}

/** Mapping of field names to column indices */
type ColumnMapping = Record<string, number>;

/** Row data as key-value pairs */
type RowData = Record<string, unknown>;

/**
 * Advanced Excel Parser
 *
 * Supports Excel files with intelligent column detection,
 * Uzbek format support, and template-based parsing
 */
@Injectable()
export class ExcelParser implements DataParser {
  private readonly logger = new Logger(ExcelParser.name);

  // Template configurations for different report types
  private readonly templates = {
    cash_register_report: {
      sheetIndex: 0,
      headerRow: 3,
      dataStartRow: 5,
      columns: {
        date: 'A',
        machine: 'B',
        product: 'C',
        quantity: 'D',
        amount: 'E',
        payment_type: 'F',
      },
      dateFormat: 'DD.MM.YYYY',
      numberFormat: 'ru-RU',
    },
    bank_statement: {
      sheetIndex: 0,
      headerRow: 1,
      dataStartRow: 2,
      columns: {
        date: 'A',
        description: 'B',
        debit: 'C',
        credit: 'D',
        balance: 'E',
      },
      dateFormat: 'DD.MM.YYYY',
      numberFormat: 'ru-RU',
    },
    inventory_report: {
      sheetIndex: 0,
      headerRow: 2,
      dataStartRow: 3,
      columns: {
        product_code: 'A',
        product_name: 'B',
        warehouse_qty: 'C',
        operator_qty: 'D',
        machine_qty: 'E',
        total_qty: 'F',
        unit_cost: 'G',
        total_cost: 'H',
      },
    },
  };

  // Column name patterns for auto-detection (supports Russian and English)
  private readonly columnPatterns = {
    date: /дата|date|время|time|период|period/i,
    machine: /аппарат|машина|machine|device|автомат|terminal/i,
    product: /товар|продукт|product|item|наименование|название/i,
    quantity: /количество|qty|кол-во|count|число|amount/i,
    amount: /сумма|amount|total|итого|стоимость|cost|price/i,
    payment: /оплата|payment|тип.*оплат|метод.*оплат|способ.*оплат/i,
    code: /код|code|артикул|sku|номер/i,
    inn: /инн|inn|ИНН/i,
    phone: /телефон|phone|тел|контакт/i,
    address: /адрес|address|местоположение|location/i,
    name: /название|наименование|name|ФИО|имя/i,
    status: /статус|status|состояние|state/i,
    type: /тип|type|вид|category|категория/i,
    description: /описание|description|примечание|note|комментарий/i,
  };

  /**
   * Parse Excel file
   */
  async parse(input: Buffer | string, options: ParserOptions = {}): Promise<ParsedData> {
    const startTime = Date.now();
    const warnings: ParseWarning[] = [];
    const errors: ParseError[] = [];

    try {
      // Read workbook
      const workbook = new ExcelJS.Workbook();
      if (Buffer.isBuffer(input)) {
        // ExcelJS accepts ArrayBuffer, Node Buffer is compatible but requires type assertion
        await workbook.xlsx.load(input as unknown as ArrayBuffer);
      } else {
        throw new Error('Input must be a Buffer');
      }

      // Get worksheets
      const worksheets = workbook.worksheets;

      if (worksheets.length === 0) {
        throw new Error('No sheets found in Excel file');
      }

      // Parse all sheets or specific sheet
      const allData: RowData[] = [];
      let headers: string[] = [];

      for (const worksheet of worksheets) {
        const sheetName = worksheet.name;

        // Skip empty sheets
        if (!worksheet || worksheet.rowCount === 0) {
          warnings.push({
            type: 'missing_value',
            message: `Sheet "${sheetName}" is empty`,
          });
          continue;
        }

        // Auto-detect structure
        const structure = this.detectSheetStructure(worksheet, options);

        // Extract headers
        const sheetHeaders = this.extractHeaders(worksheet, structure);
        if (headers.length === 0) {
          headers = sheetHeaders;
        }

        // Map columns
        const columnMapping = await this.autoDetectColumns(sheetHeaders);

        // Extract data
        const sheetData = this.extractData(worksheet, structure, columnMapping, options);

        // Clean and normalize data
        for (const [index, row] of sheetData.entries()) {
          const cleaned = await this.cleanRow(row, columnMapping);

          if (this.isValidRow(cleaned)) {
            allData.push(cleaned);
          } else if (Object.keys(cleaned).some((key) => cleaned[key])) {
            warnings.push({
              row: structure.dataStartRow + index,
              type: 'data_type',
              message: 'Row contains partial data',
              value: cleaned,
            });
          }
        }

        this.logger.log(`Parsed sheet "${sheetName}": ${sheetData.length} rows`);
      }

      return {
        data: allData,
        metadata: {
          format: FileFormat.EXCEL,
          parsedAt: new Date(),
          sheets: worksheets.map((ws) => ws.name),
          headers,
          rowCount: allData.length,
          columnCount: headers.length,
        },
        warnings,
        errors,
        statistics: {
          totalRows: allData.length,
          validRows: allData.length,
          invalidRows: errors.length,
          skippedRows: warnings.filter((w) => w.type === 'missing_value').length,
          processingTimeMs: Date.now() - startTime,
        },
      };
    } catch (error) {
      this.logger.error(`Excel parse error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Detect sheet structure (headers, data start row, etc.)
   */
  private detectSheetStructure(worksheet: ExcelJS.Worksheet, options: ParserOptions): SheetStructure {
    let headerRow = options.skipRows || 0;
    let dataStartRow = headerRow + 1;

    // Get worksheet dimensions
    const rowCount = worksheet.rowCount;
    const colCount = worksheet.columnCount;

    // Try to find header row by looking for row with most non-empty cells
    let maxNonEmptyCells = 0;

    for (let rowNum = 1; rowNum <= Math.min(10, rowCount); rowNum++) {
      const row = worksheet.getRow(rowNum);
      let nonEmptyCells = 0;

      row.eachCell({ includeEmpty: false }, (cell) => {
        if (cell.value !== null && cell.value !== undefined && cell.value !== '') {
          nonEmptyCells++;
        }
      });

      if (nonEmptyCells > maxNonEmptyCells) {
        maxNonEmptyCells = nonEmptyCells;
        headerRow = rowNum - 1; // Convert to 0-based
      }
    }

    dataStartRow = headerRow + 1;

    return {
      headerRow,
      dataStartRow,
      lastRow: rowCount - 1, // 0-based
      lastCol: colCount - 1, // 0-based
    };
  }

  /**
   * Extract headers from sheet
   */
  private extractHeaders(worksheet: ExcelJS.Worksheet, structure: SheetStructure): string[] {
    const headers: string[] = [];

    // headerRow is 0-based, ExcelJS rows are 1-based
    const row = worksheet.getRow(structure.headerRow + 1);

    for (let col = 1; col <= structure.lastCol + 1; col++) {
      const cell = row.getCell(col);

      if (cell && cell.value !== null && cell.value !== undefined) {
        headers.push(String(cell.value).trim());
      } else {
        headers.push(`Column_${col}`);
      }
    }

    return headers;
  }

  /**
   * Auto-detect column mapping based on header names
   */
  private async autoDetectColumns(headers: string[]): Promise<ColumnMapping> {
    const mapping: ColumnMapping = {};

    for (const [index, header] of headers.entries()) {
      for (const [field, pattern] of Object.entries(this.columnPatterns)) {
        if (pattern.test(header)) {
          mapping[field] = index;
          break;
        }
      }

      // If no pattern matched, use header as field name
      if (!Object.values(mapping).includes(index)) {
        const fieldName = this.normalizeFieldName(header);
        mapping[fieldName] = index;
      }
    }

    return mapping;
  }

  /**
   * Extract data from sheet
   */
  private extractData(
    worksheet: ExcelJS.Worksheet,
    structure: SheetStructure,
    columnMapping: ColumnMapping,
    options: ParserOptions,
  ): RowData[] {
    const data: RowData[] = [];
    const maxRows = options.maxRows || Infinity;

    // dataStartRow is 0-based, convert to 1-based for ExcelJS
    for (
      let rowNum = structure.dataStartRow + 1;
      rowNum <= structure.lastRow + 1 && data.length < maxRows;
      rowNum++
    ) {
      const row = worksheet.getRow(rowNum);
      const rowData: RowData = {};
      let hasData = false;

      for (const [field, colIndex] of Object.entries(columnMapping)) {
        // colIndex is 0-based, convert to 1-based for ExcelJS
        const cell = row.getCell((colIndex as number) + 1);

        if (cell && cell.value !== null && cell.value !== undefined) {
          rowData[field] = this.getCellValue(cell, field);
          hasData = true;
        } else {
          rowData[field] = null;
        }
      }

      if (hasData) {
        data.push(rowData);
      }
    }

    return data;
  }

  /**
   * Get cell value with proper type conversion
   */
  private getCellValue(cell: ExcelJS.Cell, field: string): unknown {
    const value = cell.value;

    // Handle null/undefined
    if (value === null || value === undefined) {
      return null;
    }

    // Handle dates
    if (value instanceof Date || field.includes('date')) {
      if (value instanceof Date) {
        return value;
      }
      // Excel serial date
      if (typeof value === 'number' && value > 25569) {
        return this.excelSerialToDate(value);
      }
    }

    // Handle numbers
    if (typeof value === 'number') {
      return value;
    }

    // Handle booleans
    if (typeof value === 'boolean') {
      return value;
    }

    // Handle strings
    if (typeof value === 'string') {
      return value.trim();
    }

    // Handle rich text (ExcelJS specific)
    if (typeof value === 'object' && 'richText' in value) {
      const richTextValue = value as { richText: Array<{ text: string }> };
      return richTextValue.richText
        .map((rt) => rt.text)
        .join('')
        .trim();
    }

    // Default: convert to string
    return String(value).trim();
  }

  /**
   * Convert Excel serial date to JavaScript Date
   */
  private excelSerialToDate(serial: number): Date {
    // Excel dates start from 1900-01-01 (serial = 1)
    // But Excel incorrectly treats 1900 as leap year
    const utcDays = Math.floor(serial - 25569);
    const utcValue = utcDays * 86400000; // milliseconds per day
    const date = new Date(utcValue);

    // Adjust for timezone
    const timezoneOffset = date.getTimezoneOffset() * 60000;
    return new Date(utcValue - timezoneOffset);
  }

  /**
   * Clean and normalize row data
   */
  private async cleanRow(row: RowData, _columnMapping: ColumnMapping): Promise<RowData> {
    const cleaned: RowData = {};

    for (const [field, value] of Object.entries(row)) {
      let cleanedValue: unknown = value;

      // Clean strings
      if (typeof value === 'string') {
        cleanedValue = value.trim().replace(/\s+/g, ' ');

        // Fix phone numbers
        if (field === 'phone') {
          cleanedValue = this.normalizePhoneNumber(String(cleanedValue));
        }

        // Fix amounts
        if (field === 'amount' || field.includes('sum') || field.includes('cost')) {
          cleanedValue = this.parseAmount(String(cleanedValue));
        }
      }

      // Handle null/undefined
      if (cleanedValue === undefined || cleanedValue === '') {
        cleanedValue = null;
      }

      cleaned[field] = cleanedValue;
    }

    return cleaned;
  }

  /**
   * Normalize phone number to +998 format
   */
  private normalizePhoneNumber(phone: string): string {
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');

    // Handle Uzbek numbers
    if (digits.startsWith('998')) {
      return `+${digits}`;
    }
    if (digits.startsWith('8') && digits.length === 11) {
      return `+99${digits}`;
    }
    if (digits.length === 9) {
      return `+998${digits}`;
    }

    return phone;
  }

  /**
   * Parse amount string to number
   */
  private parseAmount(value: string): number {
    if (typeof value === 'number') return value;

    // Remove currency symbols and spaces
    let cleaned = String(value)
      .replace(/[^\d.,\-]/g, '')
      .replace(/\s/g, '');

    // Handle different decimal separators
    if (cleaned.includes(',') && cleaned.includes('.')) {
      // Assume comma is thousands separator
      cleaned = cleaned.replace(/,/g, '');
    } else if (cleaned.includes(',')) {
      // Assume comma is decimal separator
      cleaned = cleaned.replace(',', '.');
    }

    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Check if row has valid data
   */
  private isValidRow(row: RowData): boolean {
    // Row must have at least one non-null value
    return Object.values(row).some((value) => value !== null && value !== undefined);
  }

  /**
   * Normalize field name for use as object key
   */
  private normalizeFieldName(header: string): string {
    return header
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/_+/g, '_') // Remove multiple underscores
      .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
  }

  // Implementation of other interface methods
  validate(data: ParsedData, _schema?: unknown): ValidationResult {
    return {
      isValid: true,
      data: data.data,
      errors: [],
      warnings: [],
      summary: {
        total: data.data.length,
        valid: data.data.length,
        invalid: 0,
        warnings: data.warnings.length,
        fields: {},
      },
    };
  }

  transform(data: ParsedData, _rules?: unknown): TransformedData {
    return {
      data: data.data,
      transformations: [],
      originalCount: data.data.length,
      transformedCount: data.data.length,
    };
  }

  detectFormat(_input: Buffer): FileFormat {
    return FileFormat.EXCEL;
  }

  async tryRecoverCorruptedData(input: Buffer): Promise<ParsedData | null> {
    // Try to parse with different options
    try {
      return await this.parse(input, {
        dateFormat: 'MM/DD/YYYY',
        strict: false,
      });
    } catch {
      return null;
    }
  }

  getSupportedFormats(): FileFormat[] {
    return [FileFormat.EXCEL];
  }

  canParse(format: FileFormat): boolean {
    return format === FileFormat.EXCEL;
  }
}
