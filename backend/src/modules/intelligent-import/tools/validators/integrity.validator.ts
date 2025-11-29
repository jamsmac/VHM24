import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ValidationError, ValidationSeverity, DomainType } from '../../interfaces/common.interface';
import { SchemaRelationship } from '../../engines/schema-registry.service';

/**
 * Integrity Validator
 *
 * Validates referential integrity (foreign keys, duplicates)
 */
@Injectable()
export class IntegrityValidator {
  private readonly logger = new Logger(IntegrityValidator.name);

  constructor(private readonly dataSource: DataSource) {}

  /**
   * Check foreign key integrity
   */
  async checkForeignKeys(
    rows: Record<string, unknown>[],
    relationships: Record<string, SchemaRelationship>,
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    for (const [field, relationship] of Object.entries(relationships)) {
      const fkErrors = await this.checkForeignKey(rows, field, relationship);
      errors.push(...fkErrors);
    }

    return errors;
  }

  /**
   * Check a single foreign key relationship
   */
  private async checkForeignKey(
    rows: Record<string, unknown>[],
    field: string,
    relationship: SchemaRelationship,
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    // Extract unique values from rows
    const values = [
      ...new Set(
        rows
          .map((row) => row[field])
          .filter((val) => val !== null && val !== undefined && val !== ''),
      ),
    ];

    if (values.length === 0) {
      return errors; // No values to check
    }

    try {
      // Query database to check which values exist
      const query = `
        SELECT DISTINCT "${relationship.field}"
        FROM "${relationship.table}"
        WHERE "${relationship.field}" = ANY($1)
        AND deleted_at IS NULL
      `;

      const result = await this.dataSource.query(query, [values]);
      const existingValues = new Set(
        result.map((r: Record<string, unknown>) => r[relationship.field]),
      );

      // Find missing values
      const missingValues = values.filter((val) => !existingValues.has(val));

      if (missingValues.length > 0) {
        // Group rows by missing value for better error reporting
        for (const missingValue of missingValues.slice(0, 10)) {
          // Limit to 10 unique errors
          const affectedRows = rows
            .map((row, index) => ({ row, index }))
            .filter(({ row }) => row[field] === missingValue)
            .map(({ index }) => index);

          errors.push({
            rowIndex: affectedRows[0], // First occurrence
            field,
            value: missingValue,
            code: 'FOREIGN_KEY_NOT_FOUND',
            message: `${field} "${missingValue}" not found in ${relationship.table}. Affects ${affectedRows.length} row(s).`,
            severity: ValidationSeverity.WARNING, // Warning, not error (can create new entities)
          });
        }

        if (missingValues.length > 10) {
          errors.push({
            rowIndex: -1,
            field,
            value: null,
            code: 'FOREIGN_KEY_NOT_FOUND',
            message: `${missingValues.length - 10} more ${field} values not found in ${relationship.table}`,
            severity: ValidationSeverity.INFO,
          });
        }
      }
    } catch (error) {
      this.logger.error(`Failed to check foreign key ${field}:`, error);
      errors.push({
        rowIndex: -1,
        field,
        value: null,
        code: 'FOREIGN_KEY_CHECK_FAILED',
        message: `Failed to validate ${field}: ${error.message}`,
        severity: ValidationSeverity.WARNING,
      });
    }

    return errors;
  }

  /**
   * Detect duplicate rows
   */
  async detectDuplicates(
    rows: Record<string, unknown>[],
    domain: DomainType,
    keyFields: string[],
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];
    const seen = new Map<string, number[]>(); // key -> row indexes

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const key = keyFields.map((field) => String(row[field] || '')).join('|');

      if (seen.has(key)) {
        seen.get(key)!.push(i);
      } else {
        seen.set(key, [i]);
      }
    }

    // Report duplicates
    for (const [key, indexes] of seen.entries()) {
      if (indexes.length > 1) {
        errors.push({
          rowIndex: indexes[1], // Second occurrence
          field: keyFields.join(', '),
          value: key,
          code: 'DUPLICATE_WITHIN_FILE',
          message: `Duplicate row found. Same ${keyFields.join('/')} appears in rows: ${indexes.map((i) => i + 1).join(', ')}`,
          severity: ValidationSeverity.WARNING,
        });
      }
    }

    return errors;
  }

  /**
   * Detect duplicates in database
   */
  async detectDatabaseDuplicates(
    rows: Record<string, unknown>[],
    domain: DomainType,
    tableName: string,
    keyFields: string[],
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    try {
      // Build WHERE clause for duplicate check
      const conditions = rows
        .map((row, index) => {
          const fieldConditions = keyFields
            .map(
              (field) => `"${field}" = $${index * keyFields.length + keyFields.indexOf(field) + 1}`,
            )
            .join(' AND ');
          return `(${fieldConditions})`;
        })
        .join(' OR ');

      // Limit to first 100 rows to avoid huge queries
      const sampleRows = rows.slice(0, 100);
      const params = sampleRows.flatMap((row) => keyFields.map((field) => row[field]));

      const query = `
        SELECT ${keyFields.map((f) => `"${f}"`).join(', ')}
        FROM "${tableName}"
        WHERE deleted_at IS NULL
        AND (${conditions})
      `;

      const duplicates = await this.dataSource.query(query, params);

      if (duplicates.length > 0) {
        const duplicateKeys = new Set(
          duplicates.map((dup: Record<string, unknown>) =>
            keyFields.map((field) => String(dup[field])).join('|'),
          ),
        );

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const key = keyFields.map((field) => String(row[field] || '')).join('|');

          if (duplicateKeys.has(key)) {
            errors.push({
              rowIndex: i,
              field: keyFields.join(', '),
              value: key,
              code: 'DUPLICATE_IN_DATABASE',
              message: `Record with same ${keyFields.join('/')} already exists in database`,
              severity: ValidationSeverity.WARNING,
            });
          }
        }
      }
    } catch (error) {
      this.logger.error('Failed to check database duplicates:', error);
      errors.push({
        rowIndex: -1,
        field: keyFields.join(', '),
        value: null,
        code: 'DUPLICATE_CHECK_FAILED',
        message: `Failed to check database duplicates: ${error.message}`,
        severity: ValidationSeverity.INFO,
      });
    }

    return errors;
  }
}
