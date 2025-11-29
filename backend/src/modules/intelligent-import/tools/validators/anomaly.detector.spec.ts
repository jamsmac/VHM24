import { AnomalyDetector } from './anomaly.detector';
import { ValidationSeverity } from '../../interfaces/common.interface';

describe('AnomalyDetector', () => {
  let detector: AnomalyDetector;

  beforeEach(() => {
    detector = new AnomalyDetector();
  });

  describe('detectNumericAnomalies', () => {
    it('should return empty array when fewer than 10 values', () => {
      const rows = Array.from({ length: 5 }, (_, i) => ({ value: i * 10 }));

      const errors = detector.detectNumericAnomalies(rows, 'value');

      expect(errors).toEqual([]);
    });

    it('should return empty array when no outliers', () => {
      const rows = Array.from({ length: 20 }, (_, i) => ({ value: 100 + i }));

      const errors = detector.detectNumericAnomalies(rows, 'value');

      expect(errors).toEqual([]);
    });

    it('should detect statistical outliers', () => {
      // Normal values around 100
      const rows = Array.from({ length: 15 }, () => ({ value: 100 }));
      // Add an extreme outlier
      rows.push({ value: 1000 });

      const errors = detector.detectNumericAnomalies(rows, 'value');

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].code).toBe('STATISTICAL_OUTLIER');
      expect(errors[0].severity).toBe(ValidationSeverity.INFO);
      expect(errors[0].value).toBe(1000);
    });

    it('should skip NaN values', () => {
      const rows = [
        ...Array.from({ length: 15 }, () => ({ value: 100 })),
        { value: 'not a number' },
      ];

      const errors = detector.detectNumericAnomalies(rows, 'value');

      // Should not error on NaN value
      expect(errors.every((e) => e.value !== 'not a number')).toBe(true);
    });

    it('should use custom threshold', () => {
      const rows = Array.from({ length: 20 }, () => ({ value: 100 }));
      rows.push({ value: 200 }); // Moderate outlier

      // With default threshold of 3, this might not be an outlier
      const errorsHighThreshold = detector.detectNumericAnomalies(rows, 'value', 3);

      // With threshold of 1, it should be detected
      const errorsLowThreshold = detector.detectNumericAnomalies(rows, 'value', 1);

      expect(errorsLowThreshold.length).toBeGreaterThanOrEqual(errorsHighThreshold.length);
    });

    it('should handle all NaN values', () => {
      const rows = Array.from({ length: 15 }, () => ({ value: 'invalid' }));

      const errors = detector.detectNumericAnomalies(rows, 'value');

      expect(errors).toEqual([]);
    });
  });

  describe('detectPatterns', () => {
    it('should detect all same value pattern', () => {
      const rows = Array.from({ length: 10 }, () => ({ status: 'active' }));

      const errors = detector.detectPatterns(rows, 'status');

      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('ALL_SAME_VALUE');
      expect(errors[0].severity).toBe(ValidationSeverity.INFO);
      expect(errors[0].value).toBe('active');
    });

    it('should not detect all same value for small datasets', () => {
      const rows = Array.from({ length: 3 }, () => ({ status: 'active' }));

      const errors = detector.detectPatterns(rows, 'status');

      const allSameError = errors.find((e) => e.code === 'ALL_SAME_VALUE');
      expect(allSameError).toBeUndefined();
    });

    it('should detect low cardinality', () => {
      const rows = Array.from({ length: 150 }, (_, i) => ({
        category: `cat${i % 3}`, // Only 3 unique values
      }));

      const errors = detector.detectPatterns(rows, 'category');

      expect(errors.some((e) => e.code === 'LOW_CARDINALITY')).toBe(true);
    });

    it('should not detect low cardinality for small datasets', () => {
      const rows = Array.from({ length: 50 }, (_, i) => ({
        category: `cat${i % 3}`,
      }));

      const errors = detector.detectPatterns(rows, 'category');

      const lowCardError = errors.find((e) => e.code === 'LOW_CARDINALITY');
      expect(lowCardError).toBeUndefined();
    });

    it('should detect high null rate', () => {
      const rows = [
        ...Array.from({ length: 6 }, () => ({ value: null })),
        ...Array.from({ length: 4 }, () => ({ value: 'data' })),
      ];

      const errors = detector.detectPatterns(rows, 'value');

      expect(errors.some((e) => e.code === 'HIGH_NULL_RATE')).toBe(true);
    });

    it('should treat empty strings as null', () => {
      const rows = [
        ...Array.from({ length: 6 }, () => ({ value: '' })),
        ...Array.from({ length: 4 }, () => ({ value: 'data' })),
      ];

      const errors = detector.detectPatterns(rows, 'value');

      const highNullError = errors.find((e) => e.code === 'HIGH_NULL_RATE');
      expect(highNullError).toBeDefined();
      expect(highNullError?.message).toContain('60.0%');
    });

    it('should not detect high null rate when below threshold', () => {
      const rows = [
        ...Array.from({ length: 4 }, () => ({ value: null })),
        ...Array.from({ length: 6 }, () => ({ value: 'data' })),
      ];

      const errors = detector.detectPatterns(rows, 'value');

      const highNullError = errors.find((e) => e.code === 'HIGH_NULL_RATE');
      expect(highNullError).toBeUndefined();
    });

    it('should detect multiple patterns at once', () => {
      const rows = Array.from({ length: 200 }, () => ({ value: null }));

      const errors = detector.detectPatterns(rows, 'value');

      expect(errors.some((e) => e.code === 'ALL_SAME_VALUE')).toBe(true);
      expect(errors.some((e) => e.code === 'LOW_CARDINALITY')).toBe(true);
      expect(errors.some((e) => e.code === 'HIGH_NULL_RATE')).toBe(true);
    });
  });

  describe('detectDateAnomalies', () => {
    it('should return empty array when fewer than 5 dates', () => {
      const rows = [{ date: '2025-01-01' }, { date: '2025-01-02' }];

      const errors = detector.detectDateAnomalies(rows, 'date');

      expect(errors).toEqual([]);
    });

    it('should detect future dates', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const rows = [
        { date: '2025-01-01' },
        { date: '2025-01-02' },
        { date: '2025-01-03' },
        { date: '2025-01-04' },
        { date: '2025-01-05' },
        { date: futureDate.toISOString() },
      ];

      const errors = detector.detectDateAnomalies(rows, 'date');

      expect(errors.some((e) => e.code === 'FUTURE_DATE')).toBe(true);
    });

    it('should detect very old dates', () => {
      const rows = [
        { date: '2025-01-01' },
        { date: '2025-01-02' },
        { date: '2025-01-03' },
        { date: '2025-01-04' },
        { date: '2025-01-05' },
        { date: '2010-01-01' }, // More than 10 years ago
      ];

      const errors = detector.detectDateAnomalies(rows, 'date');

      expect(errors.some((e) => e.code === 'VERY_OLD_DATE')).toBe(true);
    });

    it('should detect large date gaps', () => {
      const rows = [
        { date: '2025-01-01' },
        { date: '2025-01-02' },
        { date: '2025-01-03' },
        { date: '2025-01-04' },
        { date: '2025-01-05' },
        { date: '2025-01-06' },
        { date: '2025-01-07' },
        { date: '2025-01-08' },
        { date: '2025-01-09' },
        { date: '2025-01-10' },
        { date: '2025-01-11' },
        { date: '2025-06-01' }, // 5 month gap
      ];

      const errors = detector.detectDateAnomalies(rows, 'date');

      expect(errors.some((e) => e.code === 'DATE_GAP')).toBe(true);
    });

    it('should skip invalid dates', () => {
      const rows = [
        { date: '2025-01-01' },
        { date: '2025-01-02' },
        { date: '2025-01-03' },
        { date: '2025-01-04' },
        { date: '2025-01-05' },
        { date: 'invalid-date' },
      ];

      const errors = detector.detectDateAnomalies(rows, 'date');

      // Should not error, just skip invalid date
      expect(errors.every((e) => e.value !== 'invalid-date')).toBe(true);
    });

    it('should handle mixed valid and invalid dates', () => {
      const rows = [
        { date: 'invalid' },
        { date: 'not a date' },
        { date: null },
        { date: '2025-01-01' },
        { date: '2025-01-02' },
      ];

      // Should not throw, just process valid dates
      expect(() => detector.detectDateAnomalies(rows, 'date')).not.toThrow();
    });
  });

  describe('detectAllAnomalies', () => {
    it('should detect anomalies for numeric fields', () => {
      const rows = Array.from({ length: 20 }, () => ({ price: 100 }));
      rows.push({ price: 10000 }); // Outlier

      const fields = [{ name: 'price', type: 'number' }];

      const errors = detector.detectAllAnomalies(rows, fields);

      expect(errors.some((e) => e.code === 'STATISTICAL_OUTLIER')).toBe(true);
    });

    it('should detect anomalies for date fields', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const rows = [
        { created: '2025-01-01' },
        { created: '2025-01-02' },
        { created: '2025-01-03' },
        { created: '2025-01-04' },
        { created: '2025-01-05' },
        { created: futureDate.toISOString() },
      ];

      const fields = [{ name: 'created', type: 'date' }];

      const errors = detector.detectAllAnomalies(rows, fields);

      expect(errors.some((e) => e.code === 'FUTURE_DATE')).toBe(true);
    });

    it('should detect pattern anomalies for all field types', () => {
      const rows = Array.from({ length: 10 }, () => ({ name: 'Same Name' }));

      const fields = [{ name: 'name', type: 'string' }];

      const errors = detector.detectAllAnomalies(rows, fields);

      expect(errors.some((e) => e.code === 'ALL_SAME_VALUE')).toBe(true);
    });

    it('should check multiple fields', () => {
      const rows = Array.from({ length: 20 }, () => ({
        price: 100,
        status: 'active',
      }));
      rows.push({ price: 10000, status: 'active' }); // Price outlier

      const fields = [
        { name: 'price', type: 'number' },
        { name: 'status', type: 'string' },
      ];

      const errors = detector.detectAllAnomalies(rows, fields);

      // Should have numeric outlier for price and pattern detection for both
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle empty rows', () => {
      const rows: Record<string, unknown>[] = [];
      const fields = [{ name: 'value', type: 'number' }];

      const errors = detector.detectAllAnomalies(rows, fields);

      expect(errors).toEqual([]);
    });

    it('should handle empty fields', () => {
      const rows = [{ value: 100 }];
      const fields: { name: string; type: string }[] = [];

      const errors = detector.detectAllAnomalies(rows, fields);

      expect(errors).toEqual([]);
    });
  });
});
