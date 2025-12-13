import { Injectable } from '@nestjs/common';
import { UniversalParser } from './parsers/universal.parser';
import { DataValidationService, ValidationSchema } from './services/data-validation.service';
import {
  FileFormat,
  ParsedData,
  ParserOptions,
  ValidationResult,
} from './interfaces/parser.interface';

/**
 * Data Parser Service
 *
 * Main service for data parsing and validation operations
 */
@Injectable()
export class DataParserService {
  constructor(
    private readonly universalParser: UniversalParser,
    private readonly validationService: DataValidationService,
  ) {}

  /**
   * Parse and validate data from file
   */
  async parseAndValidate(
    file: Buffer | string,
    schema?: ValidationSchema,
    options?: ParserOptions,
  ): Promise<{
    parsed: ParsedData;
    validated: ValidationResult;
  }> {
    // Parse file
    const parsed = await this.universalParser.parse(file, {
      autoDetect: true,
      recoverCorrupted: true,
      locale: 'ru-RU',
      dateFormat: 'DD.MM.YYYY',
      ...options,
    });

    // Infer schema if not provided
    const validationSchema = schema || (await this.validationService.inferSchema(parsed.data));

    // Validate data
    const validated = await this.validationService.validateBatch(parsed.data, validationSchema);

    return {
      parsed,
      validated,
    };
  }

  /**
   * Parse file with specific format
   */
  async parse(
    file: Buffer | string,
    format?: FileFormat,
    options?: ParserOptions,
  ): Promise<ParsedData> {
    return this.universalParser.parse(file, {
      ...options,
      autoDetect: !format,
    });
  }

  /**
   * Validate data against schema
   */
  async validate(data: any[], schema: ValidationSchema): Promise<ValidationResult> {
    return this.validationService.validateBatch(data, schema);
  }

  /**
   * Detect file format
   */
  detectFormat(file: Buffer): FileFormat {
    return this.universalParser.detectFormat(file);
  }

  /**
   * Try to recover corrupted data
   */
  async tryRecover(file: Buffer): Promise<ParsedData | null> {
    return this.universalParser.tryRecoverCorruptedData(file);
  }

  /**
   * Infer validation schema from sample data
   */
  async inferSchema(data: any[]): Promise<ValidationSchema> {
    return this.validationService.inferSchema(data);
  }

  /**
   * Get supported file formats
   */
  getSupportedFormats(): FileFormat[] {
    return this.universalParser.getSupportedFormats();
  }

  /**
   * Parse sales import file
   */
  async parseSalesImport(file: Buffer): Promise<{
    success: any[];
    failed: any[];
    warnings: string[];
  }> {
    const { validated } = await this.parseAndValidate(file, {
      date: {
        required: true,
        type: 'date',
      },
      machine_number: {
        required: true,
        type: 'string',
      },
      amount: {
        required: true,
        type: 'amount',
        min: 0,
        max: 1000000,
      },
      payment_method: {
        required: false,
        type: 'string',
        enum: ['cash', 'card', 'mobile', 'qr'],
      },
      product_name: {
        required: false,
        type: 'string',
      },
      quantity: {
        required: false,
        type: 'number',
        min: 0,
      },
    });

    return {
      success: validated.data,
      failed: validated.errors.map((e) => ({
        row: e.row,
        field: e.field,
        message: e.message,
        value: e.value,
      })),
      warnings: validated.warnings.map((w) => `Row ${w.row}: ${w.message}`),
    };
  }

  /**
   * Parse counterparties import file
   */
  async parseCounterpartiesImport(file: Buffer): Promise<{
    success: any[];
    failed: any[];
    warnings: string[];
  }> {
    const { validated } = await this.parseAndValidate(file, {
      name: {
        required: true,
        type: 'string',
        maxLength: 200,
      },
      type: {
        required: false,
        type: 'string',
        enum: ['supplier', 'landlord', 'service', 'other'],
      },
      inn: {
        required: false,
        type: 'inn',
      },
      phone: {
        required: false,
        type: 'phone',
      },
      email: {
        required: false,
        type: 'email',
      },
      address: {
        required: false,
        type: 'string',
        maxLength: 500,
      },
      bank_account: {
        required: false,
        type: 'string',
        pattern: /^\d{20}$/,
      },
    });

    return {
      success: validated.data,
      failed: validated.errors.map((e) => ({
        row: e.row,
        field: e.field,
        message: e.message,
        value: e.value,
      })),
      warnings: validated.warnings.map((w) => `Row ${w.row}: ${w.message}`),
    };
  }

  /**
   * Parse inventory import file
   */
  async parseInventoryImport(file: Buffer): Promise<{
    success: any[];
    failed: any[];
    warnings: string[];
  }> {
    const { validated } = await this.parseAndValidate(file, {
      product_code: {
        required: true,
        type: 'string',
      },
      product_name: {
        required: true,
        type: 'string',
      },
      quantity: {
        required: true,
        type: 'number',
        min: 0,
      },
      unit_cost: {
        required: false,
        type: 'amount',
        min: 0,
      },
      location: {
        required: false,
        type: 'string',
        enum: ['warehouse', 'operator', 'machine'],
      },
      expiry_date: {
        required: false,
        type: 'date',
      },
    });

    return {
      success: validated.data,
      failed: validated.errors.map((e) => ({
        row: e.row,
        field: e.field,
        message: e.message,
        value: e.value,
      })),
      warnings: validated.warnings.map((w) => `Row ${w.row}: ${w.message}`),
    };
  }
}
