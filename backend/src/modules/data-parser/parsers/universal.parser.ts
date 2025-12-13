import { Injectable, Logger, BadRequestException } from '@nestjs/common';
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
import { ExcelParser } from './excel.parser';
import { CsvParser } from './csv.parser';
import { JsonParser } from './json.parser';

/**
 * Universal Parser
 *
 * Orchestrates multiple format-specific parsers and provides
 * intelligent format detection and error recovery
 */
@Injectable()
export class UniversalParser implements DataParser {
  private readonly logger = new Logger(UniversalParser.name);
  private readonly parsers = new Map<FileFormat, DataParser>();

  constructor() {
    this.registerParsers();
  }

  private registerParsers(): void {
    this.parsers.set(FileFormat.EXCEL, new ExcelParser());
    this.parsers.set(FileFormat.CSV, new CsvParser());
    this.parsers.set(FileFormat.JSON, new JsonParser());
    // Additional parsers can be registered here
  }

  /**
   * Parse input data with automatic format detection
   */
  async parse(input: Buffer | string, options: ParserOptions = {}): Promise<ParsedData> {
    const startTime = Date.now();
    const buffer = this.toBuffer(input);

    // Detect format if not specified
    const format =
      options.autoDetect !== false
        ? this.detectFormat(buffer)
        : this.detectFormatFromOptions(options);

    this.logger.log(`Detected format: ${format}`);

    // Get appropriate parser
    const parser = this.parsers.get(format);
    if (!parser) {
      throw new BadRequestException(`No parser available for format: ${format}`);
    }

    try {
      // Try normal parsing
      const result = await parser.parse(buffer, options);

      // Add processing time
      result.statistics.processingTimeMs = Date.now() - startTime;

      return result;
    } catch (error) {
      this.logger.warn(`Parse failed: ${error.message}`);

      // Try recovery if enabled
      if (options.recoverCorrupted) {
        this.logger.log('Attempting data recovery...');
        const recovered = await this.tryRecoverCorruptedData(buffer);
        if (recovered) {
          recovered.statistics.processingTimeMs = Date.now() - startTime;
          recovered.warnings.push({
            type: 'format',
            message: 'Data was recovered from corrupted file',
          } as ParseWarning);
          return recovered;
        }
      }

      // Try alternative parsers
      if (options.autoDetect !== false) {
        return await this.tryAlternativeParsers(buffer, format, options);
      }

      throw error;
    }
  }

  /**
   * Detect file format from buffer content
   */
  detectFormat(input: Buffer): FileFormat {
    const header = input.slice(0, 16);

    // Check for Excel (XLSX - ZIP format)
    if (header[0] === 0x50 && header[1] === 0x4b && header[2] === 0x03 && header[3] === 0x04) {
      return FileFormat.EXCEL;
    }

    // Check for Excel (XLS - OLE format)
    if (header[0] === 0xd0 && header[1] === 0xcf && header[2] === 0x11 && header[3] === 0xe0) {
      return FileFormat.EXCEL;
    }

    // Check for PDF
    if (header.toString('utf8', 0, 4) === '%PDF') {
      return FileFormat.PDF;
    }

    // Try to parse as text
    const text = input.toString('utf8', 0, Math.min(1000, input.length));

    // Check for JSON
    if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
      try {
        JSON.parse(text.substring(0, 500));
        return FileFormat.JSON;
      } catch {
        // Not JSON
      }
    }

    // Check for XML
    if (text.trim().startsWith('<?xml') || text.trim().startsWith('<')) {
      return FileFormat.XML;
    }

    // Check for CSV patterns
    const lines = text.split('\n').slice(0, 5);
    if (lines.length > 1) {
      const delimiter = this.detectDelimiter(lines);
      if (delimiter) {
        const columnCounts = lines.map((line) => line.split(delimiter).length);
        // If consistent column count, likely CSV
        if (columnCounts.every((count) => count === columnCounts[0])) {
          return FileFormat.CSV;
        }
      }
    }

    // Default to text
    return FileFormat.TEXT;
  }

  /**
   * Detect delimiter for CSV files
   */
  private detectDelimiter(lines: string[]): string | null {
    const delimiters = [',', ';', '\t', '|'];

    for (const delimiter of delimiters) {
      const counts = lines.map((line) => line.split(delimiter).length);
      // Check if all lines have same number of delimiters
      if (counts.length > 1 && counts.every((c) => c === counts[0] && c > 1)) {
        return delimiter;
      }
    }

    return null;
  }

  /**
   * Try to recover corrupted data
   */
  async tryRecoverCorruptedData(input: Buffer): Promise<ParsedData | null> {
    this.logger.log('Attempting to recover corrupted data...');

    // Try different encodings
    const encodings = ['utf8', 'utf16le', 'latin1', 'windows-1251'];

    for (const encoding of encodings) {
      try {
        const text = input.toString(encoding as BufferEncoding);

        // Try to parse as CSV with different delimiters
        for (const delimiter of [',', ';', '\t', '|']) {
          try {
            const lines = text.split(/\r?\n/);
            const headers = lines[0]?.split(delimiter);

            if (headers && headers.length > 1) {
              const data = [];
              const errors: ParseError[] = [];

              for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(delimiter);
                if (values.length === headers.length) {
                  const row: any = {};
                  headers.forEach((header, idx) => {
                    row[header.trim()] = values[idx]?.trim();
                  });
                  data.push(row);
                } else if (lines[i].trim()) {
                  errors.push({
                    row: i,
                    type: 'recoverable',
                    message: `Row has ${values.length} columns, expected ${headers.length}`,
                  });
                }
              }

              if (data.length > 0) {
                this.logger.log(`Recovered ${data.length} rows using ${encoding} encoding`);

                return {
                  data,
                  metadata: {
                    format: FileFormat.CSV,
                    encoding,
                    parsedAt: new Date(),
                    headers,
                    rowCount: data.length,
                    columnCount: headers.length,
                  },
                  warnings: [
                    {
                      type: 'format',
                      message: `File recovered using ${encoding} encoding and ${delimiter} delimiter`,
                    },
                  ],
                  errors,
                  statistics: {
                    totalRows: lines.length - 1,
                    validRows: data.length,
                    invalidRows: errors.length,
                    skippedRows: 0,
                    processingTimeMs: 0,
                  },
                };
              }
            }
          } catch {
            // Continue trying
          }
        }
      } catch {
        // Continue with next encoding
      }
    }

    return null;
  }

  /**
   * Try alternative parsers when primary parser fails
   */
  private async tryAlternativeParsers(
    buffer: Buffer,
    failedFormat: FileFormat,
    options: ParserOptions,
  ): Promise<ParsedData> {
    this.logger.log('Trying alternative parsers...');

    for (const [format, parser] of this.parsers.entries()) {
      if (format !== failedFormat) {
        try {
          this.logger.log(`Trying ${format} parser...`);
          const result = await parser.parse(buffer, options);

          result.warnings.push({
            type: 'format',
            message: `File parsed as ${format} instead of ${failedFormat}`,
          } as ParseWarning);

          return result;
        } catch {
          // Continue with next parser
        }
      }
    }

    throw new BadRequestException('Failed to parse file with any available parser');
  }

  /**
   * Validate parsed data
   */
  validate(data: ParsedData, _schema?: any): ValidationResult {
    // Implementation would go here
    // For now, return a basic validation result
    return {
      isValid: data.errors.length === 0,
      data: data.data,
      errors: [],
      warnings: [],
      summary: {
        total: data.data.length,
        valid: data.statistics.validRows,
        invalid: data.statistics.invalidRows,
        warnings: data.warnings.length,
        fields: {},
      },
    };
  }

  /**
   * Transform parsed data
   */
  transform(data: ParsedData, _rules?: any): TransformedData {
    // Implementation would go here
    // For now, return the data as-is
    return {
      data: data.data,
      transformations: [],
      originalCount: data.data.length,
      transformedCount: data.data.length,
    };
  }

  /**
   * Get supported formats
   */
  getSupportedFormats(): FileFormat[] {
    return Array.from(this.parsers.keys());
  }

  /**
   * Check if format can be parsed
   */
  canParse(format: FileFormat): boolean {
    return this.parsers.has(format);
  }

  /**
   * Convert input to Buffer
   */
  private toBuffer(input: Buffer | string): Buffer {
    if (typeof input === 'string') {
      // Check if it's base64
      if (/^[A-Za-z0-9+/]+=*$/.test(input)) {
        return Buffer.from(input, 'base64');
      }
      return Buffer.from(input);
    }
    return input;
  }

  /**
   * Detect format from options
   */
  private detectFormatFromOptions(options: ParserOptions): FileFormat {
    // Try to infer from delimiter
    if (options.delimiter) {
      return FileFormat.CSV;
    }

    // Default to Excel as it's most common for data import
    return FileFormat.EXCEL;
  }
}
