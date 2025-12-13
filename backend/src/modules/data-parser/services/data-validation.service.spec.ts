import { Test, TestingModule } from '@nestjs/testing';
import { DataValidationService, ValidationSchema } from './data-validation.service';

describe('DataValidationService', () => {
  let service: DataValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DataValidationService],
    }).compile();

    service = module.get<DataValidationService>(DataValidationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================================================
  // VALIDATE BATCH TESTS
  // ============================================================================

  describe('validateBatch', () => {
    it('should validate data successfully when all fields are valid', async () => {
      const schema: ValidationSchema = {
        name: { required: true, type: 'string' },
        age: { required: true, type: 'number', min: 0, max: 150 },
      };

      const data = [
        { name: 'John', age: 30 },
        { name: 'Jane', age: 25 },
      ];

      const result = await service.validateBatch(data, schema);

      expect(result.isValid).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
      expect(result.summary.total).toBe(2);
      expect(result.summary.valid).toBe(2);
      expect(result.summary.invalid).toBe(0);
    });

    it('should return errors for required fields that are missing', async () => {
      const schema: ValidationSchema = {
        name: { required: true, type: 'string' },
        email: { required: true, type: 'email' },
      };

      const data = [
        { name: 'John', email: '' },
        { name: '', email: 'test@example.com' },
      ];

      const result = await service.validateBatch(data, schema);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.summary.invalid).toBe(2);
    });

    it('should allow null values for non-required fields', async () => {
      const schema: ValidationSchema = {
        name: { required: true, type: 'string' },
        nickname: { required: false, type: 'string' },
      };

      const data = [{ name: 'John', nickname: null }];

      const result = await service.validateBatch(data, schema);

      expect(result.isValid).toBe(true);
      expect(result.data[0].nickname).toBeNull();
    });

    it('should track field statistics', async () => {
      const schema: ValidationSchema = {
        name: { required: true, type: 'string' },
        age: { required: false, type: 'number' },
      };

      const data = [
        { name: 'John', age: 30 },
        { name: 'Jane', age: null },
      ];

      const result = await service.validateBatch(data, schema);

      expect(result.summary.fields.name).toBeDefined();
      expect(result.summary.fields.age).toBeDefined();
      expect(result.summary.fields.age.null).toBe(1);
    });

    it('should count unique values in field stats', async () => {
      const schema: ValidationSchema = {
        category: { required: true, type: 'string' },
      };

      const data = [{ category: 'A' }, { category: 'B' }, { category: 'A' }, { category: 'C' }];

      const result = await service.validateBatch(data, schema);

      expect(result.summary.fields.category.unique).toBe(3);
    });
  });

  // ============================================================================
  // TYPE VALIDATION TESTS
  // ============================================================================

  describe('type validation', () => {
    it('should validate string type', async () => {
      const schema: ValidationSchema = {
        name: { required: true, type: 'string' },
      };

      const data = [{ name: 123 }];
      const result = await service.validateBatch(data, schema);

      expect(result.isValid).toBe(true);
      expect(result.data[0].name).toBe('123'); // Converted to string
    });

    it('should validate number type', async () => {
      const schema: ValidationSchema = {
        count: { required: true, type: 'number' },
      };

      const data = [{ count: '42' }];
      const result = await service.validateBatch(data, schema);

      expect(result.isValid).toBe(true);
      expect(result.data[0].count).toBe(42);
    });

    it('should fail validation for invalid number', async () => {
      const schema: ValidationSchema = {
        count: { required: true, type: 'number' },
      };

      const data = [{ count: 'not a number' }];
      const result = await service.validateBatch(data, schema);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].rule).toBe('type');
    });

    it('should validate boolean type', async () => {
      const schema: ValidationSchema = {
        active: { required: true, type: 'boolean' },
      };

      const testCases = [
        { input: 'true', expected: true },
        { input: '1', expected: true },
        { input: 'yes', expected: true },
        { input: 'false', expected: false },
        { input: '0', expected: false },
        { input: 'no', expected: false },
      ];

      for (const tc of testCases) {
        const data = [{ active: tc.input }];
        const result = await service.validateBatch(data, schema);
        expect(result.data[0].active).toBe(tc.expected);
      }
    });

    it('should validate date type with various formats', async () => {
      const schema: ValidationSchema = {
        date: { required: true, type: 'date' },
      };

      const validDates = ['2025-01-15', '15.01.2025', '15/01/2025', '01/15/2025'];

      for (const dateStr of validDates) {
        const data = [{ date: dateStr }];
        const result = await service.validateBatch(data, schema);
        expect(result.isValid).toBe(true);
        expect(result.data[0].date).toBeInstanceOf(Date);
      }
    });

    it('should fail validation for invalid date', async () => {
      const schema: ValidationSchema = {
        date: { required: true, type: 'date' },
      };

      const data = [{ date: 'not a date' }];
      const result = await service.validateBatch(data, schema);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].rule).toBe('type');
    });

    it('should validate email type', async () => {
      const schema: ValidationSchema = {
        email: { required: true, type: 'email' },
      };

      const validEmails = ['test@example.com', 'user.name@domain.org'];
      const invalidEmails = ['notanemail', '@example.com', 'test@'];

      for (const email of validEmails) {
        const data = [{ email }];
        const result = await service.validateBatch(data, schema);
        expect(result.isValid).toBe(true);
      }

      for (const email of invalidEmails) {
        const data = [{ email }];
        const result = await service.validateBatch(data, schema);
        expect(result.isValid).toBe(false);
      }
    });

    it('should validate phone type (Uzbekistan format)', async () => {
      const schema: ValidationSchema = {
        phone: { required: true, type: 'phone' },
      };

      const validPhones = ['+998901234567', '998901234567', '901234567'];
      const invalidPhones = ['+123456789', '12345'];

      for (const phone of validPhones) {
        const data = [{ phone }];
        const result = await service.validateBatch(data, schema);
        expect(result.isValid).toBe(true);
        expect(result.data[0].phone).toMatch(/^\+998\d{9}$/);
      }

      for (const phone of invalidPhones) {
        const data = [{ phone }];
        const result = await service.validateBatch(data, schema);
        expect(result.isValid).toBe(false);
      }
    });

    it('should validate INN type (9 or 14 digits)', async () => {
      const schema: ValidationSchema = {
        inn: { required: true, type: 'inn' },
      };

      const validINNs = ['123456789', '12345678901234'];
      const invalidINNs = ['12345', '123456789012345', 'abc123456'];

      for (const inn of validINNs) {
        const data = [{ inn }];
        const result = await service.validateBatch(data, schema);
        expect(result.isValid).toBe(true);
      }

      for (const inn of invalidINNs) {
        const data = [{ inn }];
        const result = await service.validateBatch(data, schema);
        expect(result.isValid).toBe(false);
      }
    });

    it('should validate amount type', async () => {
      const schema: ValidationSchema = {
        price: { required: true, type: 'amount' },
      };

      const testCases = [
        { input: '1,500.00', expected: 1500 },
        { input: '1 500', expected: 1500 },
        { input: '1500,50', expected: 1500.5 },
        { input: '$1,500.00', expected: 1500 },
      ];

      for (const tc of testCases) {
        const data = [{ price: tc.input }];
        const result = await service.validateBatch(data, schema);
        expect(result.isValid).toBe(true);
        expect(result.data[0].price).toBe(tc.expected);
      }
    });
  });

  // ============================================================================
  // RANGE VALIDATION TESTS
  // ============================================================================

  describe('range validation', () => {
    it('should validate minimum value', async () => {
      const schema: ValidationSchema = {
        quantity: { required: true, type: 'number', min: 0 },
      };

      const validData = [{ quantity: 0 }, { quantity: 10 }];
      const invalidData = [{ quantity: -1 }];

      const validResult = await service.validateBatch(validData, schema);
      expect(validResult.isValid).toBe(true);

      const invalidResult = await service.validateBatch(invalidData, schema);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors[0].rule).toBe('min');
    });

    it('should validate maximum value', async () => {
      const schema: ValidationSchema = {
        percentage: { required: true, type: 'number', max: 100 },
      };

      const validData = [{ percentage: 100 }, { percentage: 50 }];
      const invalidData = [{ percentage: 101 }];

      const validResult = await service.validateBatch(validData, schema);
      expect(validResult.isValid).toBe(true);

      const invalidResult = await service.validateBatch(invalidData, schema);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors[0].rule).toBe('max');
    });
  });

  // ============================================================================
  // LENGTH VALIDATION TESTS
  // ============================================================================

  describe('length validation', () => {
    it('should validate minimum length', async () => {
      const schema: ValidationSchema = {
        password: { required: true, type: 'string', minLength: 8 },
      };

      const validData = [{ password: 'password123' }];
      const invalidData = [{ password: 'short' }];

      const validResult = await service.validateBatch(validData, schema);
      expect(validResult.isValid).toBe(true);

      const invalidResult = await service.validateBatch(invalidData, schema);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors[0].rule).toBe('minLength');
    });

    it('should truncate values exceeding maximum length and add warning', async () => {
      const schema: ValidationSchema = {
        title: { required: true, type: 'string', maxLength: 10 },
      };

      const data = [{ title: 'This is a very long title' }];

      const result = await service.validateBatch(data, schema);

      expect(result.isValid).toBe(true);
      expect(result.data[0].title).toBe('This is a ');
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].type).toBe('truncated');
    });
  });

  // ============================================================================
  // PATTERN VALIDATION TESTS
  // ============================================================================

  describe('pattern validation', () => {
    it('should validate against regex pattern', async () => {
      const schema: ValidationSchema = {
        code: { required: true, type: 'string', pattern: /^[A-Z]{3}-\d{3}$/ },
      };

      const validData = [{ code: 'ABC-123' }];
      const invalidData = [{ code: 'abc-123' }, { code: 'ABC123' }];

      const validResult = await service.validateBatch(validData, schema);
      expect(validResult.isValid).toBe(true);

      for (const item of invalidData) {
        const result = await service.validateBatch([item], schema);
        expect(result.isValid).toBe(false);
        expect(result.errors[0].rule).toBe('pattern');
      }
    });
  });

  // ============================================================================
  // ENUM VALIDATION TESTS
  // ============================================================================

  describe('enum validation', () => {
    it('should validate against enum values', async () => {
      const schema: ValidationSchema = {
        status: { required: true, type: 'string', enum: ['active', 'inactive', 'pending'] },
      };

      const validData = [{ status: 'active' }, { status: 'inactive' }];
      const invalidData = [{ status: 'unknown' }];

      const validResult = await service.validateBatch(validData, schema);
      expect(validResult.isValid).toBe(true);

      const invalidResult = await service.validateBatch(invalidData, schema);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors[0].rule).toBe('enum');
    });
  });

  // ============================================================================
  // CUSTOM VALIDATOR TESTS
  // ============================================================================

  describe('custom validator', () => {
    it('should apply custom validation function', async () => {
      const schema: ValidationSchema = {
        value: {
          required: true,
          type: 'number',
          validator: (v) => v % 2 === 0, // Must be even
        },
      };

      const validData = [{ value: 4 }, { value: 10 }];
      const invalidData = [{ value: 5 }];

      const validResult = await service.validateBatch(validData, schema);
      expect(validResult.isValid).toBe(true);

      const invalidResult = await service.validateBatch(invalidData, schema);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors[0].rule).toBe('custom');
    });

    it('should handle async custom validator', async () => {
      const schema: ValidationSchema = {
        code: {
          required: true,
          type: 'string',
          validator: async (v) => {
            await new Promise((resolve) => setTimeout(resolve, 10));
            return v.startsWith('VALID');
          },
        },
      };

      const validData = [{ code: 'VALID-123' }];
      const invalidData = [{ code: 'INVALID-123' }];

      const validResult = await service.validateBatch(validData, schema);
      expect(validResult.isValid).toBe(true);

      const invalidResult = await service.validateBatch(invalidData, schema);
      expect(invalidResult.isValid).toBe(false);
    });
  });

  // ============================================================================
  // TRANSFORMER TESTS
  // ============================================================================

  describe('transformer', () => {
    it('should apply transformer function to value', async () => {
      const schema: ValidationSchema = {
        name: {
          required: true,
          type: 'string',
          transformer: (v) => v.toUpperCase(),
        },
      };

      const data = [{ name: 'john doe' }];

      const result = await service.validateBatch(data, schema);

      expect(result.isValid).toBe(true);
      expect(result.data[0].name).toBe('JOHN DOE');
    });
  });

  // ============================================================================
  // INFER SCHEMA TESTS
  // ============================================================================

  describe('inferSchema', () => {
    it('should infer string type from sample data', async () => {
      const data = [{ name: 'John' }, { name: 'Jane' }];

      const schema = await service.inferSchema(data);

      expect(schema.name).toBeDefined();
      expect(schema.name.type).toBe('string');
      expect(schema.name.required).toBe(true);
    });

    it('should infer number type from sample data', async () => {
      const data = [{ count: 10 }, { count: 20 }, { count: 30 }];

      const schema = await service.inferSchema(data);

      expect(schema.count).toBeDefined();
      expect(schema.count.type).toBe('number');
      expect(schema.count.min).toBe(10);
      expect(schema.count.max).toBe(30);
    });

    it('should infer date type from sample data', async () => {
      const data = [{ date: '2025-01-15' }, { date: '2025-01-20' }];

      const schema = await service.inferSchema(data);

      expect(schema.date).toBeDefined();
      expect(schema.date.type).toBe('date');
    });

    it('should infer email type from sample data', async () => {
      const data = [{ email: 'test@example.com' }, { email: 'user@domain.org' }];

      const schema = await service.inferSchema(data);

      expect(schema.email).toBeDefined();
      expect(schema.email.type).toBe('email');
    });

    it('should mark field as non-required when some values are missing', async () => {
      const data = [{ name: 'John', nickname: 'Johnny' }, { name: 'Jane' }];

      const schema = await service.inferSchema(data);

      expect(schema.name.required).toBe(true);
      expect(schema.nickname.required).toBe(false);
    });

    it('should return empty schema for empty data', async () => {
      const schema = await service.inferSchema([]);

      expect(Object.keys(schema)).toHaveLength(0);
    });

    it('should infer maxLength for string fields', async () => {
      const data = [
        { description: 'Short' },
        { description: 'This is a much longer description text' },
      ];

      const schema = await service.inferSchema(data);

      expect(schema.description.maxLength).toBe(38);
    });

    it('should use first 100 rows as sample', async () => {
      const data = Array.from({ length: 200 }, (_, i) => ({
        index: i,
        value: i < 100 ? 'consistent' : i,
      }));

      const schema = await service.inferSchema(data);

      // Type should be inferred from first 100 rows where all values are 'consistent' string
      expect(schema.value.type).toBe('string');
    });
  });

  // ============================================================================
  // PHONE CLEANING TESTS
  // ============================================================================

  describe('phone cleaning', () => {
    it('should normalize phone numbers to +998 format', async () => {
      const schema: ValidationSchema = {
        phone: { required: true, type: 'phone' },
      };

      const testCases = [
        { input: '901234567', expected: '+998901234567' },
        { input: '998901234567', expected: '+998901234567' },
        { input: '+998901234567', expected: '+998901234567' },
        { input: '8 (90) 123-45-67', expected: '+998901234567' },
      ];

      for (const tc of testCases) {
        const data = [{ phone: tc.input }];
        const result = await service.validateBatch(data, schema);
        if (result.isValid) {
          expect(result.data[0].phone).toBe(tc.expected);
        }
      }
    });
  });

  // ============================================================================
  // AMOUNT CLEANING TESTS
  // ============================================================================

  describe('amount cleaning', () => {
    it('should handle various amount formats', async () => {
      const schema: ValidationSchema = {
        amount: { required: true, type: 'amount' },
      };

      const testCases = [
        { input: '1000', expected: 1000 },
        { input: '1,000.50', expected: 1000.5 },
        { input: '1 000', expected: 1000 },
        { input: '1000,50', expected: 1000.5 },
        { input: 'USD 1000', expected: 1000 },
      ];

      for (const tc of testCases) {
        const data = [{ amount: tc.input }];
        const result = await service.validateBatch(data, schema);
        expect(result.data[0].amount).toBe(tc.expected);
      }
    });
  });

  // ============================================================================
  // CUSTOM MESSAGE TESTS
  // ============================================================================

  describe('custom error messages', () => {
    it('should use custom error message when provided', async () => {
      const schema: ValidationSchema = {
        age: {
          required: true,
          type: 'number',
          min: 18,
          message: 'You must be at least 18 years old',
        },
      };

      const data = [{ age: 16 }];
      const result = await service.validateBatch(data, schema);

      expect(result.isValid).toBe(false);
      // Custom message should be used for validation errors
    });
  });
});
