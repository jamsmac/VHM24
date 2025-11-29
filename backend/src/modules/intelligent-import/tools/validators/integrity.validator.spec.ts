import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { IntegrityValidator } from './integrity.validator';
import { ValidationSeverity, DomainType } from '../../interfaces/common.interface';
import { SchemaRelationship } from '../../engines/schema-registry.service';

describe('IntegrityValidator', () => {
  let validator: IntegrityValidator;
  let mockDataSource: jest.Mocked<DataSource>;

  beforeEach(async () => {
    mockDataSource = {
      query: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntegrityValidator,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    validator = module.get<IntegrityValidator>(IntegrityValidator);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkForeignKeys', () => {
    it('should return empty array when no relationships provided', async () => {
      const rows = [{ name: 'Test', location_id: 'loc-1' }];
      const relationships: Record<string, SchemaRelationship> = {};

      const errors = await validator.checkForeignKeys(rows, relationships);

      expect(errors).toEqual([]);
    });

    it('should return empty array when all foreign keys exist', async () => {
      const rows = [
        { name: 'Test1', location_id: 'loc-1' },
        { name: 'Test2', location_id: 'loc-2' },
      ];
      const relationships: Record<string, SchemaRelationship> = {
        location_id: { table: 'locations', field: 'id', type: 'uuid' },
      };

      mockDataSource.query.mockResolvedValue([{ id: 'loc-1' }, { id: 'loc-2' }]);

      const errors = await validator.checkForeignKeys(rows, relationships);

      expect(errors).toEqual([]);
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT DISTINCT'),
        [['loc-1', 'loc-2']],
      );
    });

    it('should return warning when foreign key not found', async () => {
      const rows = [
        { name: 'Test1', location_id: 'loc-1' },
        { name: 'Test2', location_id: 'loc-missing' },
      ];
      const relationships: Record<string, SchemaRelationship> = {
        location_id: { table: 'locations', field: 'id', type: 'uuid' },
      };

      mockDataSource.query.mockResolvedValue([{ id: 'loc-1' }]);

      const errors = await validator.checkForeignKeys(rows, relationships);

      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('FOREIGN_KEY_NOT_FOUND');
      expect(errors[0].severity).toBe(ValidationSeverity.WARNING);
      expect(errors[0].field).toBe('location_id');
      expect(errors[0].value).toBe('loc-missing');
    });

    it('should limit errors to 10 unique values', async () => {
      const rows = Array.from({ length: 15 }, (_, i) => ({
        name: `Test${i}`,
        location_id: `missing-${i}`,
      }));
      const relationships: Record<string, SchemaRelationship> = {
        location_id: { table: 'locations', field: 'id', type: 'uuid' },
      };

      mockDataSource.query.mockResolvedValue([]);

      const errors = await validator.checkForeignKeys(rows, relationships);

      // 10 unique errors + 1 summary error
      expect(errors).toHaveLength(11);
      expect(errors[10].code).toBe('FOREIGN_KEY_NOT_FOUND');
      expect(errors[10].severity).toBe(ValidationSeverity.INFO);
      expect(errors[10].message).toContain('5 more');
    });

    it('should handle database error gracefully', async () => {
      const rows = [{ name: 'Test', location_id: 'loc-1' }];
      const relationships: Record<string, SchemaRelationship> = {
        location_id: { table: 'locations', field: 'id', type: 'uuid' },
      };

      mockDataSource.query.mockRejectedValue(new Error('Database connection failed'));

      const errors = await validator.checkForeignKeys(rows, relationships);

      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('FOREIGN_KEY_CHECK_FAILED');
      expect(errors[0].severity).toBe(ValidationSeverity.WARNING);
    });

    it('should skip null and empty values', async () => {
      const rows = [
        { name: 'Test1', location_id: null },
        { name: 'Test2', location_id: undefined },
        { name: 'Test3', location_id: '' },
        { name: 'Test4', location_id: 'loc-1' },
      ];
      const relationships: Record<string, SchemaRelationship> = {
        location_id: { table: 'locations', field: 'id', type: 'uuid' },
      };

      mockDataSource.query.mockResolvedValue([{ id: 'loc-1' }]);

      const errors = await validator.checkForeignKeys(rows, relationships);

      expect(errors).toEqual([]);
      // Only 'loc-1' should be checked
      expect(mockDataSource.query).toHaveBeenCalledWith(expect.any(String), [['loc-1']]);
    });

    it('should return empty when all values are null or empty', async () => {
      const rows = [
        { name: 'Test1', location_id: null },
        { name: 'Test2', location_id: '' },
      ];
      const relationships: Record<string, SchemaRelationship> = {
        location_id: { table: 'locations', field: 'id', type: 'uuid' },
      };

      const errors = await validator.checkForeignKeys(rows, relationships);

      expect(errors).toEqual([]);
      expect(mockDataSource.query).not.toHaveBeenCalled();
    });

    it('should check multiple relationships', async () => {
      const rows = [{ name: 'Test', location_id: 'loc-1', user_id: 'user-1' }];
      const relationships: Record<string, SchemaRelationship> = {
        location_id: { table: 'locations', field: 'id', type: 'uuid' },
        user_id: { table: 'users', field: 'id', type: 'uuid' },
      };

      mockDataSource.query
        .mockResolvedValueOnce([{ id: 'loc-1' }])
        .mockResolvedValueOnce([{ id: 'user-1' }]);

      const errors = await validator.checkForeignKeys(rows, relationships);

      expect(errors).toEqual([]);
      expect(mockDataSource.query).toHaveBeenCalledTimes(2);
    });
  });

  describe('detectDuplicates', () => {
    it('should return empty array when no duplicates', async () => {
      const rows = [
        { name: 'Item1', code: 'A001' },
        { name: 'Item2', code: 'A002' },
        { name: 'Item3', code: 'A003' },
      ];

      const errors = await validator.detectDuplicates(rows, DomainType.NOMENCLATURE, ['code']);

      expect(errors).toEqual([]);
    });

    it('should detect duplicate rows based on key fields', async () => {
      const rows = [
        { name: 'Item1', code: 'A001' },
        { name: 'Item2', code: 'A002' },
        { name: 'Duplicate', code: 'A001' },
      ];

      const errors = await validator.detectDuplicates(rows, DomainType.NOMENCLATURE, ['code']);

      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('DUPLICATE_WITHIN_FILE');
      expect(errors[0].severity).toBe(ValidationSeverity.WARNING);
      expect(errors[0].rowIndex).toBe(2); // Second occurrence
      expect(errors[0].message).toContain('rows: 1, 3');
    });

    it('should detect duplicates with multiple key fields', async () => {
      const rows = [
        { location: 'A', machine: '001', value: 100 },
        { location: 'A', machine: '002', value: 200 },
        { location: 'A', machine: '001', value: 150 },
      ];

      const errors = await validator.detectDuplicates(rows, DomainType.TRANSACTIONS, [
        'location',
        'machine',
      ]);

      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('location, machine');
    });

    it('should handle null/undefined values in key fields', async () => {
      const rows = [
        { name: 'Item1', code: null },
        { name: 'Item2', code: null },
      ];

      const errors = await validator.detectDuplicates(rows, DomainType.NOMENCLATURE, ['code']);

      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('DUPLICATE_WITHIN_FILE');
    });

    it('should detect multiple duplicate groups', async () => {
      const rows = [
        { code: 'A001' },
        { code: 'A002' },
        { code: 'A001' },
        { code: 'A002' },
        { code: 'A001' },
      ];

      const errors = await validator.detectDuplicates(rows, DomainType.NOMENCLATURE, ['code']);

      expect(errors).toHaveLength(2);
    });
  });

  describe('detectDatabaseDuplicates', () => {
    it('should return empty array when no duplicates in database', async () => {
      const rows = [{ code: 'NEW001' }, { code: 'NEW002' }];

      mockDataSource.query.mockResolvedValue([]);

      const errors = await validator.detectDatabaseDuplicates(
        rows,
        DomainType.NOMENCLATURE,
        'nomenclature',
        ['code'],
      );

      expect(errors).toEqual([]);
    });

    it('should detect rows that already exist in database', async () => {
      const rows = [{ code: 'EXISTING001' }, { code: 'NEW001' }];

      mockDataSource.query.mockResolvedValue([{ code: 'EXISTING001' }]);

      const errors = await validator.detectDatabaseDuplicates(
        rows,
        DomainType.NOMENCLATURE,
        'nomenclature',
        ['code'],
      );

      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('DUPLICATE_IN_DATABASE');
      expect(errors[0].severity).toBe(ValidationSeverity.WARNING);
      expect(errors[0].rowIndex).toBe(0);
    });

    it('should limit query to first 100 rows', async () => {
      const rows = Array.from({ length: 150 }, (_, i) => ({ code: `CODE${i}` }));

      mockDataSource.query.mockResolvedValue([]);

      await validator.detectDatabaseDuplicates(rows, DomainType.NOMENCLATURE, 'nomenclature', [
        'code',
      ]);

      // Should have 100 params (first 100 rows)
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['CODE0', 'CODE99']),
      );
    });

    it('should handle database error gracefully', async () => {
      const rows = [{ code: 'TEST001' }];

      mockDataSource.query.mockRejectedValue(new Error('Connection timeout'));

      const errors = await validator.detectDatabaseDuplicates(
        rows,
        DomainType.NOMENCLATURE,
        'nomenclature',
        ['code'],
      );

      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('DUPLICATE_CHECK_FAILED');
      expect(errors[0].severity).toBe(ValidationSeverity.INFO);
    });

    it('should detect duplicates with multiple key fields', async () => {
      const rows = [
        { location: 'A', machine: '001' },
        { location: 'B', machine: '002' },
      ];

      mockDataSource.query.mockResolvedValue([{ location: 'A', machine: '001' }]);

      const errors = await validator.detectDatabaseDuplicates(
        rows,
        DomainType.MACHINES,
        'machines',
        ['location', 'machine'],
      );

      expect(errors).toHaveLength(1);
      expect(errors[0].rowIndex).toBe(0);
    });
  });
});
