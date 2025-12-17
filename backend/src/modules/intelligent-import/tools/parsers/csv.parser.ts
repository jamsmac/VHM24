import { Injectable, BadRequestException } from '@nestjs/common';
import { Readable } from 'stream';
import * as csv from 'csv-parser';
import { RawTable } from '../../interfaces/common.interface';

/**
 * CSV Parser
 *
 * Parses CSV files with automatic delimiter detection
 */
@Injectable()
export class CsvParser {
  /**
   * Parse CSV file from buffer
   */
  async parse(buffer: Buffer): Promise<RawTable[]> {
    try {
      const encoding = this.detectEncoding(buffer);
      const delimiter = this.detectDelimiter(buffer);

      const rows: Record<string, unknown>[] = await this.parseWithOptions(buffer, {
        separator: delimiter,
        encoding: encoding as BufferEncoding,
      });

      if (rows.length === 0) {
        throw new BadRequestException('CSV file contains no valid data');
      }

      // Extract headers from first row keys
      const headers = Object.keys(rows[0]);

      // Convert rows from objects to arrays
      const rowArrays = rows.map((row) => headers.map((h) => row[h]));

      return [
        {
          headers,
          rows: rowArrays,
          metadata: {
            totalRows: rowArrays.length,
            totalColumns: headers.length,
            delimiter,
            encoding,
          },
        },
      ];
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to parse CSV file: ${error.message}`);
    }
  }

  /**
   * Parse CSV with specific options
   */
  private parseWithOptions(
    buffer: Buffer,
    options: { separator: string; encoding: BufferEncoding },
  ): Promise<Record<string, unknown>[]> {
    return new Promise((resolve, reject) => {
      const rows: Record<string, unknown>[] = [];
      const stream = Readable.from(buffer);

      stream
        .pipe(
          csv({
            separator: options.separator,
            mapHeaders: ({ header }) => header.trim(),
          }),
        )
        .on('data', (row) => {
          rows.push(row);
        })
        .on('end', () => {
          resolve(rows);
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  /**
   * Detect CSV delimiter (comma, semicolon, tab, pipe)
   */
  detectDelimiter(buffer: Buffer): string {
    const sample = buffer.toString('utf-8', 0, Math.min(1000, buffer.length));
    const lines = sample.split('\n').slice(0, 5); // Check first 5 lines

    const delimiters = [',', ';', '\t', '|'];
    const counts = delimiters.map((delimiter) => {
      const lineCounts = lines.map(
        (line) => (line.match(new RegExp(`\\${delimiter}`, 'g')) || []).length,
      );
      const avg = lineCounts.reduce((a, b) => a + b, 0) / lineCounts.length;
      const variance = lineCounts.every((count) => count === lineCounts[0]);
      return { delimiter, count: avg, consistent: variance };
    });

    // Prefer consistent delimiter with highest count
    counts.sort((a, b) => {
      if (a.consistent && !b.consistent) return -1;
      if (!a.consistent && b.consistent) return 1;
      return b.count - a.count;
    });

    return counts[0].delimiter;
  }

  /**
   * Detect encoding (UTF-8, Windows-1251, etc.)
   */
  detectEncoding(buffer: Buffer): string {
    // Check for BOM (Byte Order Mark)
    if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
      return 'utf-8'; // UTF-8 BOM
    }

    // Check for UTF-16 LE BOM
    if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
      return 'utf-16le';
    }

    // Check for UTF-16 BE BOM
    if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
      return 'utf-16be';
    }

    // Check for Cyrillic characters (Russian) -> likely Windows-1251 or UTF-8
    const sample = buffer.toString('utf-8', 0, Math.min(1000, buffer.length));
    const cyrillicRegex = /[\u0400-\u04FF]/;

    if (cyrillicRegex.test(sample)) {
      return 'utf-8'; // Modern files use UTF-8
    }

    return 'utf-8'; // Default to UTF-8
  }

  /**
   * Extract headers from first row
   */
  async extractHeaders(buffer: Buffer): Promise<string[]> {
    const tables = await this.parse(buffer);
    return tables[0]?.headers || [];
  }
}
