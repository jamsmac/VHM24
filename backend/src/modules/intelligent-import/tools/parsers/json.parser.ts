import { Injectable, BadRequestException } from '@nestjs/common';
import { RawTable } from '../../interfaces/common.interface';

/**
 * JSON Parser
 *
 * Parses JSON files (array of objects or nested structures)
 */
@Injectable()
export class JsonParser {
  /**
   * Parse JSON file from buffer
   */
  parse(buffer: Buffer): RawTable[] {
    try {
      const jsonString = buffer.toString('utf-8');
      const data = JSON.parse(jsonString);

      // Case 1: Array of objects (most common)
      if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
        return this.parseArrayOfObjects(data);
      }

      // Case 2: Object with data property
      if (typeof data === 'object' && !Array.isArray(data)) {
        // Try common property names
        const dataProp = data.data || data.rows || data.records || data.items;
        if (Array.isArray(dataProp) && dataProp.length > 0) {
          return this.parseArrayOfObjects(dataProp);
        }

        // Try to find first array property
        for (const key of Object.keys(data)) {
          if (Array.isArray(data[key]) && data[key].length > 0) {
            return this.parseArrayOfObjects(data[key]);
          }
        }
      }

      // Case 3: Single object -> wrap in array
      if (typeof data === 'object' && !Array.isArray(data)) {
        return this.parseArrayOfObjects([data]);
      }

      throw new BadRequestException(
        'Invalid JSON structure. Expected array of objects or object with data property.',
      );
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new BadRequestException('Invalid JSON syntax');
      }
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to parse JSON file: ${error.message}`);
    }
  }

  /**
   * Parse array of objects into table format
   */
  private parseArrayOfObjects(data: any[]): RawTable[] {
    if (data.length === 0) {
      throw new BadRequestException('JSON array is empty');
    }

    // Extract all unique keys from all objects (handles sparse data)
    const allKeys = new Set<string>();
    for (const obj of data) {
      if (typeof obj === 'object' && obj !== null) {
        Object.keys(obj).forEach((key) => allKeys.add(key));
      }
    }

    const headers = Array.from(allKeys);

    // Convert objects to row arrays
    const rows = data.map((obj) => {
      if (typeof obj !== 'object' || obj === null) {
        return headers.map(() => null); // Empty row for non-object items
      }
      return headers.map((header) => this.flattenValue(obj[header]));
    });

    return [
      {
        headers,
        rows,
        metadata: {
          totalRows: rows.length,
          totalColumns: headers.length,
          format: 'json',
        },
      },
    ];
  }

  /**
   * Flatten nested values (objects, arrays) to strings
   */
  private flattenValue(value: any): any {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value === 'object') {
      return JSON.stringify(value); // Stringify nested objects
    }

    return value;
  }

  /**
   * Detect encoding (JSON is always UTF-8)
   */
  detectEncoding(buffer: Buffer): string {
    return 'utf-8';
  }

  /**
   * Extract headers from JSON
   */
  extractHeaders(buffer: Buffer): string[] {
    const tables = this.parse(buffer);
    return tables[0]?.headers || [];
  }
}
