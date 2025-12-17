import { Injectable, Logger } from '@nestjs/common';
import {
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ValidationSummary,
  FieldValidationStats,
} from '../interfaces/parser.interface';
import * as moment from 'moment';

/** Row data as key-value pairs */
type RowData = Record<string, unknown>;

export interface ValidationSchema {
  [field: string]: ValidationRule;
}

export interface ValidationRule {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'date' | 'email' | 'phone' | 'inn' | 'amount';
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  enum?: unknown[];
  validator?: (value: unknown) => boolean | Promise<boolean>;
  transformer?: (value: unknown) => unknown;
  message?: string;
}

/**
 * Data Validation & Cleaning Service
 *
 * Provides comprehensive data validation and cleaning with
 * Uzbekistan-specific validators
 */
@Injectable()
export class DataValidationService {
  private readonly logger = new Logger(DataValidationService.name);

  // Uzbekistan-specific validators
  private readonly validators = {
    phone: (value: string) => /^\+998\d{9}$/.test(value),
    inn: (value: string) => /^(\d{9}|\d{14})$/.test(value), // 9 for companies, 14 for individuals
    bankAccount: (value: string) => /^\d{20}$/.test(value),
    bankMFO: (value: string) => /^\d{5}$/.test(value),
    postalCode: (value: string) => /^\d{6}$/.test(value),
    passportSeries: (value: string) => /^[A-Z]{2}\d{7}$/.test(value),
    vehiclePlate: (value: string) =>
      /^(01|10|20|25|30|40|50|60|70|75|80|85|90|95)[A-Z]{3}\d{3}$/.test(value),
  };

  /**
   * Validate batch of data against schema
   */
  async validateBatch(data: RowData[], schema: ValidationSchema): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const validData: RowData[] = [];
    const fieldStats: Record<string, FieldValidationStats> = {};

    // Initialize field stats
    for (const field of Object.keys(schema)) {
      fieldStats[field] = {
        total: 0,
        valid: 0,
        invalid: 0,
        null: 0,
        unique: 0,
        dataTypes: {},
      };
    }

    // Validate each row
    for (const [index, row] of data.entries()) {
      const { cleanedRow, rowErrors, rowWarnings } = await this.validateRow(row, schema, index);

      errors.push(...rowErrors);
      warnings.push(...rowWarnings);

      if (rowErrors.length === 0) {
        validData.push(cleanedRow);
      }

      // Update field statistics
      this.updateFieldStats(cleanedRow, schema, fieldStats);
    }

    // Calculate unique values
    for (const field of Object.keys(fieldStats)) {
      const uniqueValues = new Set(validData.map((row) => row[field]));
      fieldStats[field].unique = uniqueValues.size;
    }

    const summary: ValidationSummary = {
      total: data.length,
      valid: validData.length,
      invalid: data.length - validData.length,
      warnings: warnings.length,
      fields: fieldStats,
    };

    return {
      isValid: errors.length === 0,
      data: validData,
      errors,
      warnings,
      summary,
    };
  }

  /**
   * Validate single row
   */
  private async validateRow(
    row: RowData,
    schema: ValidationSchema,
    rowIndex: number,
  ): Promise<{
    cleanedRow: RowData;
    rowErrors: ValidationError[];
    rowWarnings: ValidationWarning[];
  }> {
    const cleanedRow: RowData = {};
    const rowErrors: ValidationError[] = [];
    const rowWarnings: ValidationWarning[] = [];

    for (const [field, rules] of Object.entries(schema)) {
      const value = row[field];

      // Check required
      if (rules.required && (value === null || value === undefined || value === '')) {
        rowErrors.push({
          field,
          value,
          rule: 'required',
          message: rules.message || `Поле "${field}" обязательно`,
          row: rowIndex + 1,
        });
        continue;
      }

      // Skip validation if value is null and not required
      if (!rules.required && (value === null || value === undefined || value === '')) {
        cleanedRow[field] = null;
        continue;
      }

      // Clean value
      let cleanedValue = await this.cleanValue(value, rules);

      // Type validation
      if (rules.type) {
        const typeValidation = this.validateType(cleanedValue, rules.type);
        if (!typeValidation.isValid) {
          rowErrors.push({
            field,
            value: cleanedValue,
            rule: 'type',
            message: typeValidation.message || `Неверный тип данных для поля "${field}"`,
            row: rowIndex + 1,
          });
          continue;
        }
        cleanedValue = typeValidation.converted;
      }

      // Range validation (only for numbers)
      if (rules.min !== undefined && typeof cleanedValue === 'number' && cleanedValue < rules.min) {
        rowErrors.push({
          field,
          value: cleanedValue,
          rule: 'min',
          message: `Значение поля "${field}" должно быть не менее ${rules.min}`,
          row: rowIndex + 1,
        });
      }

      if (rules.max !== undefined && typeof cleanedValue === 'number' && cleanedValue > rules.max) {
        rowErrors.push({
          field,
          value: cleanedValue,
          rule: 'max',
          message: `Значение поля "${field}" должно быть не более ${rules.max}`,
          row: rowIndex + 1,
        });
      }

      // Length validation
      if (rules.minLength !== undefined && String(cleanedValue).length < rules.minLength) {
        rowErrors.push({
          field,
          value: cleanedValue,
          rule: 'minLength',
          message: `Длина поля "${field}" должна быть не менее ${rules.minLength} символов`,
          row: rowIndex + 1,
        });
      }

      if (rules.maxLength !== undefined && String(cleanedValue).length > rules.maxLength) {
        rowWarnings.push({
          field,
          value: cleanedValue,
          type: 'truncated',
          message: `Поле "${field}" обрезано до ${rules.maxLength} символов`,
          row: rowIndex + 1,
        });
        cleanedValue = String(cleanedValue).substring(0, rules.maxLength);
      }

      // Pattern validation
      if (rules.pattern && !rules.pattern.test(String(cleanedValue))) {
        rowErrors.push({
          field,
          value: cleanedValue,
          rule: 'pattern',
          message: `Поле "${field}" не соответствует формату`,
          row: rowIndex + 1,
        });
      }

      // Enum validation
      if (rules.enum && !rules.enum.includes(cleanedValue)) {
        rowErrors.push({
          field,
          value: cleanedValue,
          rule: 'enum',
          message: `Поле "${field}" должно быть одним из: ${rules.enum.join(', ')}`,
          row: rowIndex + 1,
        });
      }

      // Custom validator
      if (rules.validator) {
        const isValid = await rules.validator(cleanedValue);
        if (!isValid) {
          rowErrors.push({
            field,
            value: cleanedValue,
            rule: 'custom',
            message: rules.message || `Поле "${field}" не прошло валидацию`,
            row: rowIndex + 1,
          });
        }
      }

      // Apply transformer
      if (rules.transformer) {
        cleanedValue = rules.transformer(cleanedValue);
      }

      cleanedRow[field] = cleanedValue;
    }

    return {
      cleanedRow,
      rowErrors,
      rowWarnings,
    };
  }

  /**
   * Clean value based on rules
   */
  private async cleanValue(value: unknown, rules: ValidationRule): Promise<unknown> {
    if (value === null || value === undefined) {
      return null;
    }

    // Clean strings
    if (typeof value === 'string') {
      let cleanedStr = value.trim().replace(/\s+/g, ' ');

      // Clean based on type
      if (rules.type === 'phone') {
        cleanedStr = this.cleanPhone(cleanedStr);
      } else if (rules.type === 'amount') {
        return this.cleanAmount(cleanedStr);
      } else if (rules.type === 'inn') {
        cleanedStr = cleanedStr.replace(/\D/g, '');
      } else if (rules.type === 'email') {
        cleanedStr = cleanedStr.toLowerCase();
      }

      return cleanedStr;
    }

    return value;
  }

  /**
   * Clean phone number to +998 format
   */
  private cleanPhone(phone: string): string {
    // Remove all non-digits except +
    let cleaned = phone.replace(/[^\d+]/g, '');

    // Handle different formats
    if (cleaned.startsWith('998')) {
      cleaned = '+' + cleaned;
    } else if (cleaned.startsWith('8') && cleaned.length === 11) {
      cleaned = '+99' + cleaned;
    } else if (cleaned.length === 9) {
      cleaned = '+998' + cleaned;
    } else if (cleaned.startsWith('+7')) {
      // Russian number - leave as is
      return cleaned;
    }

    return cleaned;
  }

  /**
   * Clean amount string
   */
  private cleanAmount(value: string): number {
    // Remove currency symbols and spaces
    let cleaned = value.replace(/[^\d.,\-]/g, '');

    // Handle different decimal separators
    if (cleaned.includes(',') && cleaned.includes('.')) {
      // Assume comma is thousands separator
      cleaned = cleaned.replace(/,/g, '');
    } else if (cleaned.includes(',')) {
      // Assume comma is decimal separator
      cleaned = cleaned.replace(',', '.');
    }

    return parseFloat(cleaned) || 0;
  }

  /**
   * Validate data type
   */
  private validateType(
    value: unknown,
    type: string,
  ): {
    isValid: boolean;
    converted?: unknown;
    message?: string;
  } {
    switch (type) {
      case 'string':
        return {
          isValid: true,
          converted: String(value),
        };

      case 'number':
        const num = Number(value);
        return {
          isValid: !isNaN(num),
          converted: num,
          message: 'Значение должно быть числом',
        };

      case 'boolean':
        const boolValue = ['true', '1', 'yes', 'да', 'on'].includes(String(value).toLowerCase());
        return {
          isValid: true,
          converted: boolValue,
        };

      case 'date':
        const date = this.parseDate(value);
        return {
          isValid: date !== null,
          converted: date,
          message: 'Неверный формат даты',
        };

      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return {
          isValid: emailRegex.test(String(value)),
          converted: String(value).toLowerCase(),
          message: 'Неверный формат email',
        };

      case 'phone':
        const cleanedPhone = this.cleanPhone(String(value));
        return {
          isValid: this.validators.phone(cleanedPhone),
          converted: cleanedPhone,
          message: 'Неверный формат телефона (ожидается +998XXXXXXXXX)',
        };

      case 'inn':
        const cleanedINN = String(value).replace(/\D/g, '');
        return {
          isValid: this.validators.inn(cleanedINN),
          converted: cleanedINN,
          message: 'Неверный формат ИНН (9 цифр для компаний, 14 для физлиц)',
        };

      case 'amount':
        const amount = this.cleanAmount(String(value));
        return {
          isValid: !isNaN(amount) && amount >= 0,
          converted: amount,
          message: 'Неверный формат суммы',
        };

      default:
        return {
          isValid: true,
          converted: value,
        };
    }
  }

  /**
   * Parse date with multiple format support
   */
  private parseDate(value: unknown): Date | null {
    if (value instanceof Date) {
      return value;
    }

    // Convert to string for parsing
    const strValue = typeof value === 'string' ? value : String(value);

    const dateFormats = [
      'DD.MM.YYYY',
      'DD/MM/YYYY',
      'YYYY-MM-DD',
      'MM/DD/YYYY',
      'DD.MM.YYYY HH:mm:ss',
      'YYYY-MM-DD HH:mm:ss',
    ];

    for (const format of dateFormats) {
      const parsed = moment(strValue, format, true);
      if (parsed.isValid()) {
        return parsed.toDate();
      }
    }

    // Try native parsing
    const nativeDate = new Date(strValue);
    return isNaN(nativeDate.getTime()) ? null : nativeDate;
  }

  /**
   * Update field statistics
   */
  private updateFieldStats(
    row: RowData,
    schema: ValidationSchema,
    fieldStats: Record<string, FieldValidationStats>,
  ): void {
    for (const field of Object.keys(schema)) {
      const stats = fieldStats[field];
      const value = row[field];

      stats.total++;

      if (value === null || value === undefined) {
        stats.null++;
      } else {
        stats.valid++;

        // Track data types
        const type = typeof value;
        stats.dataTypes[type] = (stats.dataTypes[type] || 0) + 1;
      }
    }
  }

  /**
   * Create validation schema from sample data
   */
  async inferSchema(data: RowData[]): Promise<ValidationSchema> {
    const schema: ValidationSchema = {};

    if (data.length === 0) {
      return schema;
    }

    // Analyze first 100 rows to infer types
    const sample = data.slice(0, 100);
    const fields = new Set<string>();

    // Collect all fields
    for (const row of sample) {
      Object.keys(row).forEach((key) => fields.add(key));
    }

    // Analyze each field
    for (const field of fields) {
      const values = sample
        .map((row) => row[field])
        .filter((v) => v !== null && v !== undefined && v !== '');

      if (values.length === 0) {
        schema[field] = { required: false };
        continue;
      }

      // Infer type
      const rule: ValidationRule = {
        required: values.length === sample.length,
      };

      // Check if all values are numbers
      if (values.every((v) => !isNaN(Number(v)))) {
        rule.type = 'number';
        rule.min = Math.min(...values.map(Number));
        rule.max = Math.max(...values.map(Number));
      }
      // Check if all values are dates
      else if (values.every((v) => this.parseDate(v) !== null)) {
        rule.type = 'date';
      }
      // Check if all values are emails
      else if (values.every((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v)))) {
        rule.type = 'email';
      }
      // Check if all values are phones
      else if (values.every((v) => /\d{9,}/.test(String(v).replace(/\D/g, '')))) {
        rule.type = 'phone';
      }
      // Default to string
      else {
        rule.type = 'string';
        rule.maxLength = Math.max(...values.map((v) => String(v).length));
      }

      schema[field] = rule;
    }

    return schema;
  }
}
