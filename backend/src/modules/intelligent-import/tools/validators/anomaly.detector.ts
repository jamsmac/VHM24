import { Injectable } from '@nestjs/common';
import { ValidationError, ValidationSeverity } from '../../interfaces/common.interface';

/**
 * Anomaly Detector
 *
 * Detects statistical outliers and unusual patterns in data
 */
@Injectable()
export class AnomalyDetector {
  /**
   * Detect anomalies in numeric columns
   */
  detectNumericAnomalies(
    rows: Record<string, unknown>[],
    field: string,
    threshold: number = 3, // Standard deviations
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // Extract numeric values
    const values = rows.map((row) => parseFloat(String(row[field]))).filter((val) => !isNaN(val));

    if (values.length < 10) {
      return errors; // Need at least 10 values for statistical analysis
    }

    // Calculate mean and standard deviation
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    // Detect outliers (values beyond threshold * stdDev)
    for (let i = 0; i < rows.length; i++) {
      const value = parseFloat(String(rows[i][field]));

      if (isNaN(value)) {
        continue;
      }

      const zScore = Math.abs((value - mean) / stdDev);

      if (zScore > threshold) {
        errors.push({
          rowIndex: i,
          field,
          value,
          code: 'STATISTICAL_OUTLIER',
          message: `Value ${value} is ${zScore.toFixed(2)} standard deviations from mean (${mean.toFixed(2)}). Possible outlier.`,
          severity: ValidationSeverity.INFO,
        });
      }
    }

    return errors;
  }

  /**
   * Detect unusual patterns (e.g., all zeros, repeated values)
   */
  detectPatterns(rows: Record<string, unknown>[], field: string): ValidationError[] {
    const errors: ValidationError[] = [];

    const values = rows.map((row) => row[field]);
    const uniqueValues = new Set(values);

    // Pattern 1: All same value
    if (uniqueValues.size === 1 && rows.length > 5) {
      errors.push({
        rowIndex: -1,
        field,
        value: values[0],
        code: 'ALL_SAME_VALUE',
        message: `All ${rows.length} rows have the same value for ${field}: "${values[0]}"`,
        severity: ValidationSeverity.INFO,
      });
    }

    // Pattern 2: Very low cardinality (< 5 unique values for 100+ rows)
    if (rows.length > 100 && uniqueValues.size < 5) {
      errors.push({
        rowIndex: -1,
        field,
        value: null,
        code: 'LOW_CARDINALITY',
        message: `Field ${field} has only ${uniqueValues.size} unique values across ${rows.length} rows. Possible data quality issue.`,
        severity: ValidationSeverity.INFO,
      });
    }

    // Pattern 3: Too many nulls (> 50%)
    const nullCount = values.filter(
      (val) => val === null || val === undefined || val === '',
    ).length;
    const nullPercentage = (nullCount / rows.length) * 100;

    if (nullPercentage > 50) {
      errors.push({
        rowIndex: -1,
        field,
        value: null,
        code: 'HIGH_NULL_RATE',
        message: `Field ${field} has ${nullPercentage.toFixed(1)}% null/empty values (${nullCount}/${rows.length})`,
        severity: ValidationSeverity.INFO,
      });
    }

    return errors;
  }

  /**
   * Detect date anomalies
   */
  detectDateAnomalies(rows: Record<string, unknown>[], field: string): ValidationError[] {
    const errors: ValidationError[] = [];

    const dates = rows
      .map((row, index) => ({ date: new Date(String(row[field])), index }))
      .filter(({ date }) => !isNaN(date.getTime()));

    if (dates.length < 5) {
      return errors;
    }

    // Sort dates
    dates.sort((a, b) => a.date.getTime() - b.date.getTime());

    const now = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const tenYearsAgo = new Date();
    tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);

    // Pattern 1: Future dates
    const futureDates = dates.filter(({ date }) => date > now);
    if (futureDates.length > 0) {
      errors.push({
        rowIndex: futureDates[0].index,
        field,
        value: futureDates[0].date.toISOString(),
        code: 'FUTURE_DATE',
        message: `${futureDates.length} row(s) have future dates for ${field}`,
        severity: ValidationSeverity.WARNING,
      });
    }

    // Pattern 2: Very old dates (> 10 years)
    const veryOldDates = dates.filter(({ date }) => date < tenYearsAgo);
    if (veryOldDates.length > 0) {
      errors.push({
        rowIndex: veryOldDates[0].index,
        field,
        value: veryOldDates[0].date.toISOString(),
        code: 'VERY_OLD_DATE',
        message: `${veryOldDates.length} row(s) have dates older than 10 years for ${field}`,
        severity: ValidationSeverity.INFO,
      });
    }

    // Pattern 3: Large gaps in date sequence
    if (dates.length > 10) {
      const gaps: number[] = [];
      for (let i = 1; i < dates.length; i++) {
        const gap = dates[i].date.getTime() - dates[i - 1].date.getTime();
        gaps.push(gap);
      }

      const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;

      for (let i = 1; i < dates.length; i++) {
        const gap = dates[i].date.getTime() - dates[i - 1].date.getTime();

        // Gap is 10x larger than average
        if (gap > avgGap * 10) {
          const gapDays = Math.floor(gap / (1000 * 60 * 60 * 24));
          errors.push({
            rowIndex: dates[i].index,
            field,
            value: dates[i].date.toISOString(),
            code: 'DATE_GAP',
            message: `Large gap detected: ${gapDays} days between row ${dates[i - 1].index + 1} and ${dates[i].index + 1}`,
            severity: ValidationSeverity.INFO,
          });
        }
      }
    }

    return errors;
  }

  /**
   * Detect all anomalies for a dataset
   */
  detectAllAnomalies(
    rows: Record<string, unknown>[],
    fields: { name: string; type: string }[],
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    for (const field of fields) {
      // Numeric anomalies
      if (field.type === 'number') {
        errors.push(...this.detectNumericAnomalies(rows, field.name));
      }

      // Date anomalies
      if (field.type === 'date') {
        errors.push(...this.detectDateAnomalies(rows, field.name));
      }

      // Pattern anomalies (all types)
      errors.push(...this.detectPatterns(rows, field.name));
    }

    return errors;
  }
}
