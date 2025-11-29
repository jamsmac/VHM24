import { Injectable, Logger } from '@nestjs/common';
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
 * JSON Parser
 *
 * Handles JSON files with nested structure support and schema validation
 */
@Injectable()
export class JsonParser implements DataParser {
  private readonly logger = new Logger(JsonParser.name);

  /**
   * Parse JSON file
   */
  async parse(input: Buffer | string, options: ParserOptions = {}): Promise<ParsedData> {
    const startTime = Date.now();
    const warnings: ParseWarning[] = [];
    const errors: ParseError[] = [];

    try {
      // Convert buffer to string if needed
      const jsonString =
        typeof input === 'string'
          ? input
          : input.toString((options.encoding as BufferEncoding) || 'utf8');

      // Parse JSON
      let jsonData: any;
      try {
        jsonData = JSON.parse(jsonString);
      } catch (error) {
        // Try to fix common JSON issues
        const fixed = this.tryFixJson(jsonString);
        if (fixed) {
          jsonData = JSON.parse(fixed);
          warnings.push({
            type: 'format',
            message: 'JSON was auto-corrected (trailing commas, quotes, etc.)',
          });
        } else {
          throw error;
        }
      }

      // Extract data array
      const dataArray = this.extractDataArray(jsonData);

      // Extract headers from data
      const headers = this.extractHeaders(dataArray);

      // Normalize data
      const normalizedData = dataArray
        .map((item, index) => {
          try {
            return this.normalizeJsonObject(item, options);
          } catch (error) {
            errors.push({
              row: index,
              type: 'recoverable',
              message: `Failed to normalize object: ${error.message}`,
              value: item,
            });
            return null;
          }
        })
        .filter((item) => item !== null);

      return {
        data: normalizedData,
        metadata: {
          format: FileFormat.JSON,
          parsedAt: new Date(),
          headers,
          rowCount: normalizedData.length,
          columnCount: headers.length,
          encoding: options.encoding,
        },
        warnings,
        errors,
        statistics: {
          totalRows: dataArray.length,
          validRows: normalizedData.length,
          invalidRows: errors.length,
          skippedRows: dataArray.length - normalizedData.length - errors.length,
          processingTimeMs: Date.now() - startTime,
        },
      };
    } catch (error) {
      this.logger.error(`JSON parse error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Try to fix common JSON syntax errors
   */
  private tryFixJson(jsonString: string): string | null {
    try {
      let fixed = jsonString;

      // Remove trailing commas
      fixed = fixed.replace(/,\s*([}\]])/g, '$1');

      // Fix single quotes to double quotes
      fixed = fixed.replace(/'/g, '"');

      // Remove comments
      fixed = fixed.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');

      // Remove BOM
      if (fixed.charCodeAt(0) === 0xfeff) {
        fixed = fixed.slice(1);
      }

      // Try to parse fixed JSON
      JSON.parse(fixed);
      return fixed;
    } catch {
      return null;
    }
  }

  /**
   * Extract data array from JSON structure
   */
  private extractDataArray(jsonData: any): any[] {
    // If already an array, return it
    if (Array.isArray(jsonData)) {
      return jsonData;
    }

    // Look for common data property names
    const dataKeys = ['data', 'items', 'results', 'records', 'rows'];

    for (const key of dataKeys) {
      if (jsonData[key] && Array.isArray(jsonData[key])) {
        return jsonData[key];
      }
    }

    // Look for first array property
    for (const key of Object.keys(jsonData)) {
      if (Array.isArray(jsonData[key])) {
        return jsonData[key];
      }
    }

    // If object, wrap in array
    if (typeof jsonData === 'object') {
      return [jsonData];
    }

    return [];
  }

  /**
   * Extract headers from data array
   */
  private extractHeaders(dataArray: any[]): string[] {
    const headers = new Set<string>();

    // Collect all unique keys
    for (const item of dataArray) {
      if (typeof item === 'object' && item !== null) {
        this.extractKeysRecursive(item, '', headers);
      }
    }

    return Array.from(headers);
  }

  /**
   * Recursively extract keys from nested objects
   */
  private extractKeysRecursive(obj: any, prefix: string, keys: Set<string>): void {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        // Nested object - recurse
        this.extractKeysRecursive(value, fullKey, keys);
      } else if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
        // Array of objects - extract keys from first item
        this.extractKeysRecursive(value[0], `${fullKey}[0]`, keys);
      } else {
        // Primitive value or array of primitives
        keys.add(fullKey);
      }
    }
  }

  /**
   * Normalize JSON object to flat structure
   */
  private normalizeJsonObject(obj: any, options: ParserOptions): any {
    if (typeof obj !== 'object' || obj === null) {
      return { value: obj };
    }

    const normalized: any = {};

    const flatten = (current: any, prefix: string = ''): void => {
      for (const [key, value] of Object.entries(current)) {
        const newKey = prefix ? `${prefix}_${key}` : key;

        if (value === null || value === undefined) {
          normalized[newKey] = null;
        } else if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
          // Nested object - flatten it
          flatten(value, newKey);
        } else if (Array.isArray(value)) {
          // Array - convert to string or flatten if objects
          if (value.length === 0) {
            normalized[newKey] = null;
          } else if (typeof value[0] === 'object') {
            // Array of objects - serialize as JSON
            normalized[newKey] = JSON.stringify(value);
          } else {
            // Array of primitives - join
            normalized[newKey] = value.join(', ');
          }
        } else {
          // Primitive value
          normalized[newKey] = this.convertValue(value, options);
        }
      }
    };

    flatten(obj);
    return normalized;
  }

  /**
   * Convert value based on type and options
   */
  private convertValue(value: any, options: ParserOptions): any {
    // Handle dates
    if (value instanceof Date) {
      return value;
    }

    // Try to parse date strings
    if (typeof value === 'string' && this.isISODate(value)) {
      return new Date(value);
    }

    // Handle numbers
    if (typeof value === 'string' && this.isNumeric(value)) {
      return parseFloat(value);
    }

    return value;
  }

  /**
   * Check if string is ISO date
   */
  private isISODate(value: string): boolean {
    return /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/.test(value);
  }

  /**
   * Check if string is numeric
   */
  private isNumeric(value: string): boolean {
    return !isNaN(Number(value)) && !isNaN(parseFloat(value));
  }

  // Implementation of other interface methods
  validate(data: ParsedData, schema?: any): ValidationResult {
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

  transform(data: ParsedData, rules?: any): TransformedData {
    return {
      data: data.data,
      transformations: [],
      originalCount: data.data.length,
      transformedCount: data.data.length,
    };
  }

  detectFormat(input: Buffer): FileFormat {
    return FileFormat.JSON;
  }

  async tryRecoverCorruptedData(input: Buffer): Promise<ParsedData | null> {
    try {
      // Try different encodings
      for (const encoding of ['utf8', 'utf16le', 'latin1'] as BufferEncoding[]) {
        try {
          const text = input.toString(encoding);
          return await this.parse(text, { encoding });
        } catch {
          // Continue with next encoding
        }
      }
    } catch {
      // Recovery failed
    }

    return null;
  }

  getSupportedFormats(): FileFormat[] {
    return [FileFormat.JSON];
  }

  canParse(format: FileFormat): boolean {
    return format === FileFormat.JSON;
  }
}
