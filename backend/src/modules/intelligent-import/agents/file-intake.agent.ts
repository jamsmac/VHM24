import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { IAgent, AgentContext, AgentStatus, FileUpload } from '../interfaces/agent.interface';
import { ParsedFile, FileType } from '../interfaces/common.interface';
import { XlsxParser } from '../tools/parsers/xlsx.parser';
import { CsvParser } from '../tools/parsers/csv.parser';
import { JsonParser } from '../tools/parsers/json.parser';
import { XmlParser } from '../tools/parsers/xml.parser';
import * as crypto from 'crypto';

/**
 * File Intake Agent
 *
 * Parses uploaded files and extracts raw data tables
 */
@Injectable()
export class FileIntakeAgent implements IAgent<FileUpload, ParsedFile> {
  private readonly logger = new Logger(FileIntakeAgent.name);
  readonly name = 'FileIntakeAgent';
  private status: AgentStatus = AgentStatus.IDLE;

  constructor(
    private readonly xlsxParser: XlsxParser,
    private readonly csvParser: CsvParser,
    private readonly jsonParser: JsonParser,
    private readonly xmlParser: XmlParser,
  ) {}

  /**
   * Execute file parsing
   */
  async execute(input: FileUpload, _context: AgentContext): Promise<ParsedFile> {
    this.status = AgentStatus.RUNNING;

    try {
      this.logger.log(`Processing file: ${input.filename} (${input.size} bytes)`);

      // Step 1: Detect file type
      const fileType = this.detectFileType(input.filename, input.mimetype);
      this.logger.log(`Detected file type: ${fileType}`);

      // Step 2: Select appropriate parser
      const parser = this.getParser(fileType);

      // Step 3: Parse file
      const tables = await parser.parse(input.buffer);
      this.logger.log(`Parsed ${tables.length} table(s)`);

      // Step 4: Collect metadata
      const metadata = {
        filename: input.filename,
        size: input.size,
        mimetype: input.mimetype,
        encoding: this.detectEncoding(input.buffer, fileType),
        checksum: this.calculateChecksum(input.buffer),
        rowCount: tables.reduce((sum, t) => sum + t.rows.length, 0),
        columnCount: tables[0]?.headers.length || 0,
      };

      this.logger.log(`Extracted ${metadata.rowCount} rows, ${metadata.columnCount} columns`);

      this.status = AgentStatus.COMPLETED;

      return {
        fileType,
        tables,
        metadata,
      };
    } catch (error) {
      this.status = AgentStatus.FAILED;
      this.logger.error(`Failed to parse file:`, error);
      throw new BadRequestException(`File parsing failed: ${error.message}`);
    }
  }

  /**
   * Validate input
   */
  async validateInput(input: FileUpload): Promise<boolean> {
    if (!input.buffer || input.buffer.length === 0) {
      throw new BadRequestException('File buffer is empty');
    }

    if (!input.filename) {
      throw new BadRequestException('Filename is required');
    }

    if (input.size > 50 * 1024 * 1024) {
      // 50 MB limit
      throw new BadRequestException('File size exceeds 50MB limit');
    }

    return true;
  }

  /**
   * Get current status
   */
  getStatus(): AgentStatus {
    return this.status;
  }

  /**
   * Detect file type from filename and MIME type
   */
  private detectFileType(filename: string, mimetype: string): FileType {
    const ext = filename.split('.').pop()?.toLowerCase();

    // Excel
    if (
      ext === 'xlsx' ||
      ext === 'xls' ||
      mimetype.includes('spreadsheet') ||
      mimetype.includes('excel')
    ) {
      return FileType.EXCEL;
    }

    // CSV
    if (ext === 'csv' || mimetype === 'text/csv') {
      return FileType.CSV;
    }

    // JSON
    if (ext === 'json' || mimetype === 'application/json') {
      return FileType.JSON;
    }

    // XML
    if (ext === 'xml' || mimetype.includes('xml')) {
      return FileType.XML;
    }

    throw new BadRequestException(`Unsupported file type: ${ext || mimetype}`);
  }

  /**
   * Get parser for file type
   */
  private getParser(fileType: FileType): XlsxParser | CsvParser | JsonParser | XmlParser {
    switch (fileType) {
      case FileType.EXCEL:
        return this.xlsxParser;
      case FileType.CSV:
        return this.csvParser;
      case FileType.JSON:
        return this.jsonParser;
      case FileType.XML:
        return this.xmlParser;
      default:
        throw new BadRequestException(`No parser available for file type: ${fileType}`);
    }
  }

  /**
   * Detect encoding
   */
  private detectEncoding(buffer: Buffer, fileType: FileType): string {
    switch (fileType) {
      case FileType.EXCEL:
        return this.xlsxParser.detectEncoding(buffer);
      case FileType.CSV:
        return this.csvParser.detectEncoding(buffer);
      case FileType.JSON:
        return this.jsonParser.detectEncoding(buffer);
      case FileType.XML:
        return this.xmlParser.detectEncoding(buffer);
      default:
        return 'utf-8';
    }
  }

  /**
   * Calculate SHA-256 checksum
   */
  private calculateChecksum(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }
}
