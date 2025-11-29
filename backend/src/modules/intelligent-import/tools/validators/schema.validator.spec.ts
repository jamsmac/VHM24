import { SchemaValidator } from './schema.validator';
import { ValidationSeverity } from '../../interfaces/common.interface';
import { SchemaField } from '../../engines/schema-registry.service';

describe('SchemaValidator', () => {
  let validator: SchemaValidator;

  beforeEach(() => {
    validator = new SchemaValidator();
  });

  describe('validate', () => {
    it('should return empty array for valid data', async () => {
      const fields: SchemaField[] = [
        { name: 'name', type: 'string', required: true },
        { name: 'age', type: 'number', required: false },
      ];
      const rows = [
        { name: 'John', age: 25 },
        { name: 'Jane', age: 30 },
      ];

      const errors = await validator.validate(rows, fields);

      expect(errors).toEqual([]);
    });

    it('should return errors for missing required fields', async () => {
      const fields: SchemaField[] = [
        { name: 'name', type: 'string', required: true },
        { name: 'email', type: 'string', required: true },
      ];
      const rows = [{ name: 'John' }];

      const errors = await validator.validate(rows, fields);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].code).toBe('SCHEMA_REQUIRED');
      expect(errors[0].severity).toBe(ValidationSeverity.ERROR);
    });

    it('should return errors for type mismatches', async () => {
      const fields: SchemaField[] = [{ name: 'count', type: 'number', required: true }];
      const rows = [{ count: 'not a number' }];

      const errors = await validator.validate(rows, fields);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].code).toBe('SCHEMA_TYPE');
    });

    it('should validate multiple rows', async () => {
      const fields: SchemaField[] = [{ name: 'name', type: 'string', required: true }];
      const rows = [{}, {}, {}];

      const errors = await validator.validate(rows, fields);

      expect(errors.length).toBe(3);
      expect(errors.map((e) => e.rowIndex)).toEqual([0, 1, 2]);
    });

    it('should validate enum fields', async () => {
      const fields: SchemaField[] = [
        {
          name: 'status',
          type: 'enum',
          required: true,
          validation: { enum: ['active', 'inactive'] },
        },
      ];
      const rows = [{ status: 'invalid' }];

      const errors = await validator.validate(rows, fields);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].code).toBe('SCHEMA_ENUM');
    });

    it('should validate string fields with validation rules', async () => {
      const fields: SchemaField[] = [
        {
          name: 'code',
          type: 'string',
          required: true,
          validation: { minLength: 3, maxLength: 10 },
        },
      ];
      const rows = [{ code: 'AB' }];

      const errors = await validator.validate(rows, fields);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].code).toBe('SCHEMA_MINLENGTH');
    });

    it('should validate number fields with min/max', async () => {
      const fields: SchemaField[] = [
        {
          name: 'quantity',
          type: 'number',
          required: true,
          validation: { minimum: 0, maximum: 100 },
        },
      ];
      const rows = [{ quantity: 150 }];

      const errors = await validator.validate(rows, fields);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].code).toBe('SCHEMA_MAXIMUM');
    });

    it('should handle boolean fields', async () => {
      const fields: SchemaField[] = [{ name: 'active', type: 'boolean', required: true }];
      const rows = [{ active: true }];

      const errors = await validator.validate(rows, fields);

      expect(errors).toEqual([]);
    });

    it('should handle date fields as string', async () => {
      const fields: SchemaField[] = [{ name: 'date', type: 'date', required: true }];
      const rows = [{ date: '2025-01-15' }];

      const errors = await validator.validate(rows, fields);

      expect(errors).toEqual([]);
    });

    it('should handle date fields as number timestamp', async () => {
      const fields: SchemaField[] = [{ name: 'date', type: 'date', required: true }];
      const rows = [{ date: 1736899200000 }];

      const errors = await validator.validate(rows, fields);

      expect(errors).toEqual([]);
    });

    it('should handle uuid fields', async () => {
      const fields: SchemaField[] = [{ name: 'id', type: 'uuid', required: true }];
      const rows = [{ id: '123e4567-e89b-12d3-a456-426614174000' }];

      const errors = await validator.validate(rows, fields);

      expect(errors).toEqual([]);
    });

    it('should include field description in schema', async () => {
      const fields: SchemaField[] = [
        {
          name: 'name',
          type: 'string',
          required: true,
          description: 'User name',
        },
      ];
      const rows = [{ name: 'John' }];

      const errors = await validator.validate(rows, fields);

      expect(errors).toEqual([]);
    });

    it('should handle unknown field types as string', async () => {
      const fields: SchemaField[] = [{ name: 'custom', type: 'unknown' as any, required: false }];
      const rows = [{ custom: 'value' }];

      const errors = await validator.validate(rows, fields);

      expect(errors).toEqual([]);
    });

    it('should allow additional properties', async () => {
      const fields: SchemaField[] = [{ name: 'name', type: 'string', required: true }];
      const rows = [{ name: 'John', extraField: 'extra value' }];

      const errors = await validator.validate(rows, fields);

      expect(errors).toEqual([]);
    });
  });

  describe('formatErrorMessage', () => {
    it('should format required field error', async () => {
      const fields: SchemaField[] = [{ name: 'username', type: 'string', required: true }];
      const rows = [{}];

      const errors = await validator.validate(rows, fields);

      expect(errors[0].message).toContain('required');
    });

    it('should format type error', async () => {
      const fields: SchemaField[] = [{ name: 'count', type: 'number', required: true }];
      const rows = [{ count: 'not number' }];

      const errors = await validator.validate(rows, fields);

      expect(errors[0].message).toContain('type');
    });

    it('should format minLength error', async () => {
      const fields: SchemaField[] = [
        { name: 'code', type: 'string', required: true, validation: { minLength: 5 } },
      ];
      const rows = [{ code: 'AB' }];

      const errors = await validator.validate(rows, fields);

      expect(errors[0].message).toContain('at least');
    });

    it('should format maxLength error', async () => {
      const fields: SchemaField[] = [
        { name: 'code', type: 'string', required: true, validation: { maxLength: 3 } },
      ];
      const rows = [{ code: 'ABCDEF' }];

      const errors = await validator.validate(rows, fields);

      expect(errors[0].message).toContain('at most');
    });

    it('should format minimum error', async () => {
      const fields: SchemaField[] = [
        { name: 'age', type: 'number', required: true, validation: { minimum: 18 } },
      ];
      const rows = [{ age: 10 }];

      const errors = await validator.validate(rows, fields);

      expect(errors[0].message).toContain('>=');
    });

    it('should format maximum error', async () => {
      const fields: SchemaField[] = [
        { name: 'age', type: 'number', required: true, validation: { maximum: 100 } },
      ];
      const rows = [{ age: 150 }];

      const errors = await validator.validate(rows, fields);

      expect(errors[0].message).toContain('<=');
    });

    it('should format enum error', async () => {
      const fields: SchemaField[] = [
        {
          name: 'status',
          type: 'enum',
          required: true,
          validation: { enum: ['active', 'inactive'] },
        },
      ];
      const rows = [{ status: 'unknown' }];

      const errors = await validator.validate(rows, fields);

      expect(errors[0].message).toContain('must be one of');
    });

    it('should format pattern error', async () => {
      const fields: SchemaField[] = [
        {
          name: 'email',
          type: 'string',
          required: true,
          validation: { pattern: '^[a-z]+$' },
        },
      ];
      const rows = [{ email: 'ABC123' }];

      const errors = await validator.validate(rows, fields);

      expect(errors[0].message).toContain('pattern');
    });
  });
});
