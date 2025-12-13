import { Injectable, Logger } from '@nestjs/common';
import * as csvParser from 'csv-parser';
import { Readable } from 'stream';
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

/**
 * CSV Parser
 *
 * Handles CSV files with automatic delimiter detection,
 * encoding support, and data type inference
 */
@Injectable()
export class CsvParser implements DataParser {
  private readonly logger = new Logger(CsvParser.name);

  /**
   * Parse CSV file
   */
  async parse(input: Buffer | string, options: ParserOptions = {}): Promise<ParsedData> {
    const startTime = Date.now();
    const warnings: ParseWarning[] = [];
    const errors: ParseError[] = [];

    return new Promise((resolve, reject) => {
      const data: any[] = [];
      const headers: string[] = [];
      let rowCount = 0;
      let skippedRows = 0;

      // Convert input to readable stream
      const stream = Readable.from(typeof input === 'string' ? Buffer.from(input) : input);

      // Detect delimiter if not provided
      const delimiter = options.delimiter || this.detectDelimiter(input);

      // Configure CSV parser
      const parser = csvParser({
        separator: delimiter,
        strict: options.strict || false,
        skipComments: true,
        headers: options.headers === false ? false : undefined,
        mapHeaders: ({ header }: { header: string }) => {
          const normalized = this.normalizeHeader(header);
          if (!headers.includes(normalized)) {
            headers.push(normalized);
          }
          return normalized;
        },
      });

      stream
        .pipe(parser)
        .on('data', (row: any) => {
          rowCount++;

          // Skip initial rows if specified
          if (options.skipRows && rowCount <= options.skipRows) {
            skippedRows++;
            return;
          }

          // Apply max rows limit
          if (options.maxRows && data.length >= options.maxRows) {
            return;
          }

          // Clean and convert data types
          const cleanedRow = this.cleanRow(row, options);

          // Validate row
          if (this.isValidRow(cleanedRow)) {
            data.push(cleanedRow);
          } else {
            warnings.push({
              row: rowCount,
              type: 'missing_value',
              message: 'Row is empty or contains only null values',
            });
            skippedRows++;
          }
        })
        .on('error', (error: Error) => {
          if (options.strict) {
            reject(error);
          } else {
            errors.push({
              row: rowCount,
              type: 'recoverable',
              message: error.message,
            });
          }
        })
        .on('end', () => {
          this.logger.log(`Parsed CSV: ${data.length} valid rows from ${rowCount} total`);

          resolve({
            data,
            metadata: {
              format: FileFormat.CSV,
              parsedAt: new Date(),
              headers,
              rowCount: data.length,
              columnCount: headers.length,
              encoding: options.encoding,
            },
            warnings,
            errors,
            statistics: {
              totalRows: rowCount,
              validRows: data.length,
              invalidRows: errors.length,
              skippedRows,
              processingTimeMs: Date.now() - startTime,
            },
          });
        });
    });
  }

  /**
   * Detect CSV delimiter
   */
  private detectDelimiter(input: Buffer | string): string {
    const text =
      typeof input === 'string' ? input : input.toString('utf8', 0, Math.min(1000, input.length));

    const lines = text.split('\n').slice(0, 5);
    const delimiters = [',', ';', '\t', '|'];

    let bestDelimiter = ',';
    let maxConsistency = 0;

    for (const delimiter of delimiters) {
      const counts = lines.map((line) => line.split(delimiter).length);

      // Check consistency across lines
      if (counts.length > 1) {
        const firstCount = counts[0];
        const consistency = counts.filter((c) => c === firstCount).length;

        if (consistency > maxConsistency && firstCount > 1) {
          maxConsistency = consistency;
          bestDelimiter = delimiter;
        }
      }
    }

    this.logger.log(`Detected delimiter: "${bestDelimiter}"`);
    return bestDelimiter;
  }

  /**
   * Normalize header name
   */
  private normalizeHeader(header: string): string {
    return header
      .trim()
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/_+/g, '_') // Remove multiple underscores
      .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
  }

  /**
   * Clean and convert row data
   */
  private cleanRow(row: any, options: ParserOptions): any {
    const cleaned: any = {};

    for (const [key, value] of Object.entries(row)) {
      let cleanedValue: any = value;

      if (typeof value === 'string') {
        const trimmedValue = value.trim();

        // Handle empty strings
        if (trimmedValue === '') {
          cleanedValue = null;
        }
        // Try to parse as number
        else if (this.isNumeric(trimmedValue)) {
          cleanedValue = this.parseNumber(trimmedValue, options);
        }
        // Try to parse as date
        else if (this.isDate(trimmedValue, options)) {
          cleanedValue = this.parseDate(trimmedValue, options);
        }
        // Try to parse as boolean
        else if (this.isBoolean(trimmedValue)) {
          cleanedValue = this.parseBoolean(trimmedValue);
        } else {
          cleanedValue = trimmedValue;
        }
      }

      cleaned[key] = cleanedValue;
    }

    return cleaned;
  }

  /**
   * Check if value is numeric
   */
  private isNumeric(value: string): boolean {
    // Remove currency symbols and spaces
    const cleaned = value.replace(/[^\d.,\-]/g, '');
    return !isNaN(Number(cleaned.replace(',', '.')));
  }

  /**
   * Parse number with locale support
   */
  private parseNumber(value: string, options: ParserOptions): number {
    let cleaned = value.replace(/[^\d.,\-]/g, '');

    // Handle different decimal separators based on locale
    if (options.locale === 'ru-RU' || options.numberFormat === 'ru-RU') {
      // Russian format: 1.234,56
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // Default format: 1,234.56
      cleaned = cleaned.replace(/,/g, '');
    }

    return parseFloat(cleaned);
  }

  /**
   * Check if value is a date
   */
  private isDate(value: string, _options: ParserOptions): boolean {
    const datePatterns = [
      /^\d{2}[./]\d{2}[./]\d{4}$/, // DD.MM.YYYY or DD/MM/YYYY
      /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
      /^\d{2}-\d{2}-\d{4}$/, // MM-DD-YYYY
    ];

    return datePatterns.some((pattern) => pattern.test(value));
  }

  /**
   * Parse date based on format
   */
  private parseDate(value: string, options: ParserOptions): Date {
    const dateFormat = options.dateFormat || 'DD.MM.YYYY';

    // Handle different date formats
    if (dateFormat === 'DD.MM.YYYY' || dateFormat === 'DD/MM/YYYY') {
      const parts = value.split(/[./]/);
      if (parts.length === 3) {
        return new Date(
          parseInt(parts[2]), // year
          parseInt(parts[1]) - 1, // month (0-indexed)
          parseInt(parts[0]), // day
        );
      }
    } else if (dateFormat === 'MM/DD/YYYY' || dateFormat === 'MM-DD-YYYY') {
      const parts = value.split(/[-/]/);
      if (parts.length === 3) {
        return new Date(
          parseInt(parts[2]), // year
          parseInt(parts[0]) - 1, // month (0-indexed)
          parseInt(parts[1]), // day
        );
      }
    } else if (dateFormat === 'YYYY-MM-DD') {
      const parts = value.split('-');
      if (parts.length === 3) {
        return new Date(
          parseInt(parts[0]), // year
          parseInt(parts[1]) - 1, // month (0-indexed)
          parseInt(parts[2]), // day
        );
      }
    }

    // Fallback to native Date parsing
    return new Date(value);
  }

  /**
   * Check if value is boolean
   */
  private isBoolean(value: string): boolean {
    const booleanValues = ['true', 'false', 'yes', 'no', 'да', 'нет', '1', '0', 'on', 'off'];

    return booleanValues.includes(value.toLowerCase());
  }

  /**
   * Parse boolean value
   */
  private parseBoolean(value: string): boolean {
    const trueValues = ['true', 'yes', 'да', '1', 'on'];
    return trueValues.includes(value.toLowerCase());
  }

  /**
   * Check if row is valid
   */
  private isValidRow(row: any): boolean {
    // Row must have at least one non-null value
    return Object.values(row).some((value) => value !== null && value !== undefined);
  }

  // Implementation of other interface methods
  validate(data: ParsedData, _schema?: any): ValidationResult {
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

  transform(data: ParsedData, _rules?: any): TransformedData {
    return {
      data: data.data,
      transformations: [],
      originalCount: data.data.length,
      transformedCount: data.data.length,
    };
  }

  detectFormat(_input: Buffer): FileFormat {
    return FileFormat.CSV;
  }

  async tryRecoverCorruptedData(input: Buffer): Promise<ParsedData | null> {
    // Try different encodings
    const encodings: BufferEncoding[] = ['utf8', 'utf16le', 'latin1'];

    for (const encoding of encodings) {
      try {
        const text = input.toString(encoding);
        return await this.parse(text, {
          strict: false,
          encoding,
        });
      } catch {
        // Continue with next encoding
      }
    }

    return null;
  }

  getSupportedFormats(): FileFormat[] {
    return [FileFormat.CSV];
  }

  canParse(format: FileFormat): boolean {
    return format === FileFormat.CSV;
  }
}
