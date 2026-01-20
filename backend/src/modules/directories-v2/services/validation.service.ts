import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { Directory } from '../entities/directory.entity';
import {
  DirectoryField,
  DirectoryFieldType,
  FieldValidation,
} from '../entities/directory-field.entity';
import { DirectoryEntry } from '../entities/directory-entry.entity';

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

@Injectable()
export class ValidationService {
  constructor(
    @InjectRepository(DirectoryEntry)
    private readonly entryRepository: Repository<DirectoryEntry>,
    @InjectRepository(DirectoryField)
    private readonly fieldRepository: Repository<DirectoryField>,
  ) {}

  /**
   * Validate entry data against directory field definitions
   */
  async validateEntryData(
    directory: Directory,
    data: Record<string, any>,
    entryId?: string,
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const fields = directory.fields.filter((f) => f.is_active);

    for (const field of fields) {
      const value = data[field.code];
      const fieldErrors = await this.validateFieldValue(field, value, directory.id, entryId);
      errors.push(...fieldErrors);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate a single field value
   */
  async validateFieldValue(
    field: DirectoryField,
    value: any,
    directoryId: string,
    entryId?: string,
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    // Required check
    if (field.is_required && this.isEmpty(value)) {
      errors.push({
        field: field.code,
        message: `Field "${field.name_ru}" is required`,
        code: 'REQUIRED',
      });
      return errors; // No point in further validation if required field is empty
    }

    // Skip validation for empty optional fields
    if (this.isEmpty(value)) {
      return errors;
    }

    // Type-specific validation
    const typeErrors = this.validateFieldType(field, value);
    errors.push(...typeErrors);

    // Custom validation rules
    if (field.validation) {
      const ruleErrors = this.validateRules(field, value);
      errors.push(...ruleErrors);
    }

    // Uniqueness check
    if (field.is_unique && errors.length === 0) {
      const isUnique = await this.checkUniqueness(field, value, directoryId, entryId);
      if (!isUnique) {
        errors.push({
          field: field.code,
          message: `Value "${value}" already exists for field "${field.name_ru}"`,
          code: 'UNIQUE_VIOLATION',
        });
      }
    }

    return errors;
  }

  /**
   * Validate field type
   */
  private validateFieldType(field: DirectoryField, value: any): ValidationError[] {
    const errors: ValidationError[] = [];

    switch (field.field_type) {
      case DirectoryFieldType.TEXT:
      case DirectoryFieldType.TEXTAREA:
        if (typeof value !== 'string') {
          errors.push({
            field: field.code,
            message: `Field "${field.name_ru}" must be a string`,
            code: 'INVALID_TYPE',
          });
        }
        break;

      case DirectoryFieldType.NUMBER:
        if (typeof value !== 'number' || !Number.isInteger(value)) {
          errors.push({
            field: field.code,
            message: `Field "${field.name_ru}" must be an integer`,
            code: 'INVALID_TYPE',
          });
        }
        break;

      case DirectoryFieldType.DECIMAL:
        if (typeof value !== 'number' || isNaN(value)) {
          errors.push({
            field: field.code,
            message: `Field "${field.name_ru}" must be a decimal number`,
            code: 'INVALID_TYPE',
          });
        }
        break;

      case DirectoryFieldType.BOOLEAN:
        if (typeof value !== 'boolean') {
          errors.push({
            field: field.code,
            message: `Field "${field.name_ru}" must be a boolean`,
            code: 'INVALID_TYPE',
          });
        }
        break;

      case DirectoryFieldType.DATE:
        if (!this.isValidDate(value)) {
          errors.push({
            field: field.code,
            message: `Field "${field.name_ru}" must be a valid date (YYYY-MM-DD)`,
            code: 'INVALID_TYPE',
          });
        }
        break;

      case DirectoryFieldType.DATETIME:
        if (!this.isValidDateTime(value)) {
          errors.push({
            field: field.code,
            message: `Field "${field.name_ru}" must be a valid datetime (ISO 8601)`,
            code: 'INVALID_TYPE',
          });
        }
        break;

      case DirectoryFieldType.SELECT:
        if (!field.allow_free_text && field.options) {
          const validValues = field.options.map((o) => o.value);
          if (!validValues.includes(value)) {
            errors.push({
              field: field.code,
              message: `Invalid value for field "${field.name_ru}"`,
              code: 'INVALID_OPTION',
            });
          }
        }
        break;

      case DirectoryFieldType.MULTISELECT:
        if (!Array.isArray(value)) {
          errors.push({
            field: field.code,
            message: `Field "${field.name_ru}" must be an array`,
            code: 'INVALID_TYPE',
          });
        } else if (!field.allow_free_text && field.options) {
          const validValues = field.options.map((o) => o.value);
          const invalidValues = value.filter((v: string) => !validValues.includes(v));
          if (invalidValues.length > 0) {
            errors.push({
              field: field.code,
              message: `Invalid values for field "${field.name_ru}": ${invalidValues.join(', ')}`,
              code: 'INVALID_OPTION',
            });
          }
        }
        break;

      case DirectoryFieldType.REFERENCE:
        if (typeof value !== 'string' || !this.isUUID(value)) {
          errors.push({
            field: field.code,
            message: `Field "${field.name_ru}" must be a valid UUID reference`,
            code: 'INVALID_TYPE',
          });
        }
        break;

      case DirectoryFieldType.EMAIL:
        if (typeof value !== 'string' || !this.isValidEmail(value)) {
          errors.push({
            field: field.code,
            message: `Field "${field.name_ru}" must be a valid email address`,
            code: 'INVALID_FORMAT',
          });
        }
        break;

      case DirectoryFieldType.PHONE:
        if (typeof value !== 'string' || !this.isValidPhone(value)) {
          errors.push({
            field: field.code,
            message: `Field "${field.name_ru}" must be a valid phone number`,
            code: 'INVALID_FORMAT',
          });
        }
        break;

      case DirectoryFieldType.URL:
        if (typeof value !== 'string' || !this.isValidUrl(value)) {
          errors.push({
            field: field.code,
            message: `Field "${field.name_ru}" must be a valid URL`,
            code: 'INVALID_FORMAT',
          });
        }
        break;

      case DirectoryFieldType.JSON:
        if (typeof value !== 'object') {
          errors.push({
            field: field.code,
            message: `Field "${field.name_ru}" must be a valid JSON object`,
            code: 'INVALID_TYPE',
          });
        }
        break;
    }

    return errors;
  }

  /**
   * Validate custom validation rules
   */
  private validateRules(field: DirectoryField, value: any): ValidationError[] {
    const errors: ValidationError[] = [];
    const rules = field.validation as FieldValidation;

    if (!rules) return errors;

    // String length rules
    if (typeof value === 'string') {
      if (rules.minLength !== undefined && value.length < rules.minLength) {
        errors.push({
          field: field.code,
          message: `Field "${field.name_ru}" must be at least ${rules.minLength} characters`,
          code: 'MIN_LENGTH',
        });
      }

      if (rules.maxLength !== undefined && value.length > rules.maxLength) {
        errors.push({
          field: field.code,
          message: `Field "${field.name_ru}" must be at most ${rules.maxLength} characters`,
          code: 'MAX_LENGTH',
        });
      }

      if (rules.pattern) {
        const regex = new RegExp(rules.pattern);
        if (!regex.test(value)) {
          errors.push({
            field: field.code,
            message: rules.patternMessage || `Field "${field.name_ru}" has invalid format`,
            code: 'PATTERN_MISMATCH',
          });
        }
      }
    }

    // Number range rules
    if (typeof value === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        errors.push({
          field: field.code,
          message: `Field "${field.name_ru}" must be at least ${rules.min}`,
          code: 'MIN_VALUE',
        });
      }

      if (rules.max !== undefined && value > rules.max) {
        errors.push({
          field: field.code,
          message: `Field "${field.name_ru}" must be at most ${rules.max}`,
          code: 'MAX_VALUE',
        });
      }

      if (rules.precision !== undefined) {
        const decimals = (value.toString().split('.')[1] || '').length;
        if (decimals > rules.precision) {
          errors.push({
            field: field.code,
            message: `Field "${field.name_ru}" must have at most ${rules.precision} decimal places`,
            code: 'PRECISION',
          });
        }
      }
    }

    return errors;
  }

  /**
   * Check uniqueness of a field value
   */
  private async checkUniqueness(
    field: DirectoryField,
    value: any,
    directoryId: string,
    entryId?: string,
  ): Promise<boolean> {
    const qb = this.entryRepository
      .createQueryBuilder('e')
      .where('e.directory_id = :directoryId', { directoryId })
      .andWhere('e.deleted_at IS NULL')
      .andWhere(`e.data ->> :fieldCode = :value`, {
        fieldCode: field.code,
        value: String(value),
      });

    if (entryId) {
      qb.andWhere('e.id != :entryId', { entryId });
    }

    const count = await qb.getCount();
    return count === 0;
  }

  // Helper methods
  private isEmpty(value: any): boolean {
    return value === undefined || value === null || value === '';
  }

  private isValidDate(value: any): boolean {
    if (typeof value !== 'string') return false;
    const date = new Date(value);
    return !isNaN(date.getTime()) && /^\d{4}-\d{2}-\d{2}$/.test(value);
  }

  private isValidDateTime(value: any): boolean {
    if (typeof value !== 'string') return false;
    const date = new Date(value);
    return !isNaN(date.getTime());
  }

  private isUUID(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }

  private isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  private isValidPhone(value: string): boolean {
    return /^\+?[0-9\s\-\(\)]{7,20}$/.test(value);
  }

  private isValidUrl(value: string): boolean {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }
}
