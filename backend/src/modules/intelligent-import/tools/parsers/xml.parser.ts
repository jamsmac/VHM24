import { Injectable, BadRequestException } from '@nestjs/common';
import * as xml2js from 'xml2js';
import { RawTable } from '../../interfaces/common.interface';

/**
 * XML Parser
 *
 * Parses XML files and converts to table format
 */
@Injectable()
export class XmlParser {
  /**
   * Parse XML file from buffer
   */
  async parse(buffer: Buffer): Promise<RawTable[]> {
    try {
      const xmlString = buffer.toString('utf-8');
      const parser = new xml2js.Parser({
        explicitArray: false,
        mergeAttrs: true,
        ignoreAttrs: false,
      });

      const result = await parser.parseStringPromise(xmlString);

      // Try to find array of records
      const records = this.findRecordsArray(result);

      if (!records || records.length === 0) {
        throw new BadRequestException('XML does not contain valid record structure');
      }

      return this.parseRecordsToTable(records);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to parse XML file: ${error.message}`);
    }
  }

  /**
   * Find array of records in XML structure
   */
  private findRecordsArray(obj: any): any[] | null {
    // Common XML structures:
    // <root><row>...</row><row>...</row></root>
    // <root><data><row>...</row></data></root>
    // <rows><row>...</row></rows>

    if (typeof obj !== 'object') {
      return null;
    }

    // Check root keys for arrays
    for (const key of Object.keys(obj)) {
      const value = obj[key];

      // If value is an array, return it
      if (Array.isArray(value)) {
        return value;
      }

      // If value is object, check nested
      if (typeof value === 'object') {
        const nested = this.findRecordsArray(value);
        if (nested) return nested;
      }
    }

    // If root object has multiple identical keys (parsed as array), return it
    const rootKeys = Object.keys(obj);
    if (rootKeys.length === 1) {
      const firstValue = obj[rootKeys[0]];
      if (Array.isArray(firstValue)) {
        return firstValue;
      }
      // Single object -> wrap in array
      if (typeof firstValue === 'object') {
        return [firstValue];
      }
    }

    return null;
  }

  /**
   * Convert records to table format
   */
  private parseRecordsToTable(records: any[]): RawTable[] {
    if (records.length === 0) {
      throw new BadRequestException('XML records array is empty');
    }

    // Extract all unique keys from all records
    const allKeys = new Set<string>();
    for (const record of records) {
      if (typeof record === 'object' && record !== null) {
        this.extractKeys(record, allKeys);
      }
    }

    const headers = Array.from(allKeys);

    // Convert records to row arrays
    const rows = records.map((record) => {
      if (typeof record !== 'object' || record === null) {
        return headers.map(() => null);
      }
      return headers.map((header) => this.extractValue(record, header));
    });

    return [
      {
        headers,
        rows,
        metadata: {
          totalRows: rows.length,
          totalColumns: headers.length,
          format: 'xml',
        },
      },
    ];
  }

  /**
   * Extract all keys from object (flatten nested)
   */
  private extractKeys(obj: any, keys: Set<string>, prefix: string = ''): void {
    for (const key of Object.keys(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      const value = obj[key];

      if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
        // Nested object -> flatten
        this.extractKeys(value, keys, fullKey);
      } else {
        keys.add(fullKey);
      }
    }
  }

  /**
   * Extract value by key path (supports dot notation)
   */
  private extractValue(obj: any, keyPath: string): any {
    const keys = keyPath.split('.');
    let current = obj;

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return null;
      }
    }

    // Flatten arrays and objects
    if (Array.isArray(current)) {
      return current.join(', ');
    }

    if (typeof current === 'object' && current !== null) {
      return JSON.stringify(current);
    }

    return current;
  }

  /**
   * Detect encoding (XML declares encoding in header)
   */
  detectEncoding(buffer: Buffer): string {
    const xmlString = buffer.toString('utf-8', 0, Math.min(200, buffer.length));
    const match = xmlString.match(/encoding=["']([^"']+)["']/i);
    return match ? match[1].toLowerCase() : 'utf-8';
  }

  /**
   * Extract headers from XML
   */
  async extractHeaders(buffer: Buffer): Promise<string[]> {
    const tables = await this.parse(buffer);
    return tables[0]?.headers || [];
  }
}
