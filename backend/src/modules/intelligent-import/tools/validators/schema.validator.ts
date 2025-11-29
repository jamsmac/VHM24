import { Injectable } from '@nestjs/common';
import Ajv, { ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import { ValidationError, ValidationSeverity } from '../../interfaces/common.interface';
import { SchemaField } from '../../engines/schema-registry.service';

/**
 * Schema Validator
 *
 * Validates data against JSON Schema definitions
 */
@Injectable()
export class SchemaValidator {
  private ajv: Ajv;

  constructor() {
    this.ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(this.ajv);
  }

  /**
   * Validate rows against schema fields
   */
  async validate(
    rows: Record<string, unknown>[],
    fields: SchemaField[],
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    // Convert SchemaField[] to JSON Schema
    const jsonSchema = this.buildJsonSchema(fields);
    const validateFn = this.ajv.compile(jsonSchema);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowErrors = this.validateRow(row, validateFn, i);
      errors.push(...rowErrors);
    }

    return errors;
  }

  /**
   * Validate a single row
   */
  private validateRow(
    row: Record<string, unknown>,
    validateFn: ValidateFunction,
    rowIndex: number,
  ): ValidationError[] {
    const isValid = validateFn(row);

    if (isValid) {
      return [];
    }

    const errors: ValidationError[] = [];

    for (const error of validateFn.errors || []) {
      const field =
        error.instancePath?.replace(/^\//, '') || error.params?.missingProperty || 'unknown';

      errors.push({
        rowIndex,
        field,
        value: row[field],
        code: `SCHEMA_${error.keyword?.toUpperCase()}`,
        message: this.formatErrorMessage(error),
        severity: ValidationSeverity.ERROR,
      });
    }

    return errors;
  }

  /**
   * Build JSON Schema from SchemaField[]
   */
  private buildJsonSchema(fields: SchemaField[]): Record<string, unknown> {
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const field of fields) {
      // Build property schema
      const propSchema: Record<string, unknown> = {
        type: this.mapTypeToJsonSchema(field.type),
      };

      // Add validation rules
      if (field.validation) {
        Object.assign(propSchema, field.validation);
      }

      // Add description
      if (field.description) {
        propSchema.description = field.description;
      }

      // Add enum values
      if (field.type === 'enum' && field.validation?.enum) {
        propSchema.enum = field.validation.enum;
      }

      properties[field.name] = propSchema;

      if (field.required) {
        required.push(field.name);
      }
    }

    return {
      type: 'object',
      properties,
      required,
      additionalProperties: true, // Allow extra fields
    };
  }

  /**
   * Map SchemaField type to JSON Schema type
   */
  private mapTypeToJsonSchema(type: string): string | string[] {
    switch (type) {
      case 'string':
        return 'string';
      case 'number':
        return 'number';
      case 'date':
        return ['string', 'number']; // Date can be string or timestamp
      case 'boolean':
        return 'boolean';
      case 'uuid':
        return 'string';
      case 'enum':
        return 'string';
      default:
        return 'string';
    }
  }

  /**
   * Format AJV error message
   */
  private formatErrorMessage(error: {
    keyword?: string;
    instancePath?: string;
    params?: Record<string, unknown>;
    message?: string;
  }): string {
    const field = error.instancePath?.replace(/^\//, '') || error.params?.missingProperty;

    switch (error.keyword) {
      case 'required':
        return `Field "${error.params?.missingProperty}" is required`;
      case 'type':
        return `Field "${field}" must be of type ${error.params?.type}`;
      case 'minimum':
        return `Field "${field}" must be >= ${error.params?.limit}`;
      case 'maximum':
        return `Field "${field}" must be <= ${error.params?.limit}`;
      case 'minLength':
        return `Field "${field}" must have at least ${error.params?.limit} characters`;
      case 'maxLength':
        return `Field "${field}" must have at most ${error.params?.limit} characters`;
      case 'enum':
        return `Field "${field}" must be one of: ${(error.params?.allowedValues as unknown[] | undefined)?.join(', ')}`;
      case 'pattern':
        return `Field "${field}" does not match required pattern`;
      default:
        return error.message || `Validation failed for field "${field}"`;
    }
  }
}
