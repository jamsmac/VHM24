import { Test, TestingModule } from '@nestjs/testing';
import { SummaryFormatter } from '../tools/formatters/summary.formatter';
import { DomainType, ActionType, ValidationSeverity } from '../interfaces/common.interface';

describe('SummaryFormatter', () => {
  let formatter: SummaryFormatter;

  const mockValidationReport = {
    totalRows: 100,
    errorCount: 5,
    warningCount: 10,
    infoCount: 2,
    errors: [
      {
        rowIndex: 0,
        field: 'amount',
        value: null,
        code: 'REQUIRED',
        message: 'Required field',
        severity: ValidationSeverity.ERROR,
      },
      {
        rowIndex: 1,
        field: 'amount',
        value: null,
        code: 'REQUIRED',
        message: 'Required field',
        severity: ValidationSeverity.ERROR,
      },
      {
        rowIndex: 2,
        field: 'machine_id',
        value: 'invalid',
        code: 'INVALID_FK',
        message: 'Invalid foreign key',
        severity: ValidationSeverity.ERROR,
      },
      {
        rowIndex: 3,
        field: 'machine_id',
        value: 'invalid',
        code: 'INVALID_FK',
        message: 'Invalid foreign key',
        severity: ValidationSeverity.ERROR,
      },
      {
        rowIndex: 4,
        field: 'date',
        value: 'bad',
        code: 'INVALID_DATE',
        message: 'Invalid date',
        severity: ValidationSeverity.ERROR,
      },
    ],
    warnings: [],
    info: [],
    isValid: false,
    canProceed: true,
  };

  const mockActionPlan = {
    actions: [
      { type: ActionType.INSERT, table: 'transactions', data: { amount: 100 } },
      { type: ActionType.INSERT, table: 'transactions', data: { amount: 200 } },
      { type: ActionType.UPDATE, table: 'transactions', data: { amount: 150 } },
      { type: ActionType.MERGE, table: 'inventory', data: { stock: 50 } },
      { type: ActionType.SKIP, table: 'transactions', data: { amount: null } },
      { type: ActionType.DELETE, table: 'old_data', data: {} },
    ],
    summary: {
      insertCount: 2,
      updateCount: 1,
      mergeCount: 1,
      skipCount: 1,
      deleteCount: 1,
    },
    estimatedDuration: 5,
    risks: ['5 warnings detected'],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SummaryFormatter],
    }).compile();

    formatter = module.get<SummaryFormatter>(SummaryFormatter);
  });

  describe('generateSummary', () => {
    it('should generate summary with correct domain', () => {
      // Act
      const result = formatter.generateSummary(
        DomainType.SALES,
        mockValidationReport,
        mockActionPlan,
      );

      // Assert
      expect(result.domain).toBe(DomainType.SALES);
    });

    it('should calculate row counts correctly', () => {
      // Act
      const result = formatter.generateSummary(
        DomainType.SALES,
        mockValidationReport,
        mockActionPlan,
      );

      // Assert
      expect(result.totalRows).toBe(100);
      expect(result.validRows).toBe(95);
      expect(result.invalidRows).toBe(5);
    });

    it('should extract new entities from INSERT actions', () => {
      // Act
      const result = formatter.generateSummary(
        DomainType.SALES,
        mockValidationReport,
        mockActionPlan,
      );

      // Assert
      expect(result.newEntities).toHaveLength(1);
      expect(result.newEntities[0]).toEqual({ type: 'transactions', count: 2 });
    });

    it('should extract updated entities from UPDATE and MERGE actions', () => {
      // Act
      const result = formatter.generateSummary(
        DomainType.SALES,
        mockValidationReport,
        mockActionPlan,
      );

      // Assert
      expect(result.updatedEntities).toHaveLength(2);
      expect(result.updatedEntities).toContainEqual({ type: 'transactions', count: 1 });
      expect(result.updatedEntities).toContainEqual({ type: 'inventory', count: 1 });
    });

    it('should extract warnings including error summary', () => {
      // Act
      const result = formatter.generateSummary(
        DomainType.SALES,
        mockValidationReport,
        mockActionPlan,
      );

      // Assert
      expect(result.warnings).toContain('5 row(s) contain errors');
      expect(result.warnings).toContain('10 warning(s) detected');
    });

    it('should include top error codes in warnings', () => {
      // Act
      const result = formatter.generateSummary(
        DomainType.SALES,
        mockValidationReport,
        mockActionPlan,
      );

      // Assert
      expect(result.warnings).toContain('REQUIRED: 2 occurrence(s)');
      expect(result.warnings).toContain('INVALID_FK: 2 occurrence(s)');
      expect(result.warnings).toContain('INVALID_DATE: 1 occurrence(s)');
    });

    it('should generate human-readable estimated changes', () => {
      // Act
      const result = formatter.generateSummary(
        DomainType.SALES,
        mockValidationReport,
        mockActionPlan,
      );

      // Assert
      expect(result.estimatedChanges).toContain('Create 2 new record(s)');
      expect(result.estimatedChanges).toContain('Update 1 existing record(s)');
      expect(result.estimatedChanges).toContain('Merge 1 record(s)');
      expect(result.estimatedChanges).toContain('Skip 1 record(s)');
      expect(result.estimatedChanges).toContain('Delete 1 record(s)');
      expect(result.estimatedChanges.endsWith('.')).toBe(true);
    });

    it('should return "No changes will be made" for empty action plan', () => {
      // Arrange
      const emptyActionPlan = {
        actions: [],
        summary: {
          insertCount: 0,
          updateCount: 0,
          mergeCount: 0,
          skipCount: 0,
          deleteCount: 0,
        },
        estimatedDuration: 0,
        risks: [],
      };

      // Act
      const result = formatter.generateSummary(
        DomainType.SALES,
        mockValidationReport,
        emptyActionPlan,
      );

      // Assert
      expect(result.estimatedChanges).toBe('No changes will be made');
    });

    it('should not include error/warning messages when counts are zero', () => {
      // Arrange
      const cleanReport = {
        ...mockValidationReport,
        errorCount: 0,
        warningCount: 0,
        errors: [],
        warnings: [],
      };

      // Act
      const result = formatter.generateSummary(DomainType.SALES, cleanReport, mockActionPlan);

      // Assert
      expect(result.warnings.find((w) => w.includes('contain errors'))).toBeUndefined();
      expect(result.warnings.find((w) => w.includes('warning(s) detected'))).toBeUndefined();
    });

    it('should limit top errors to 5', () => {
      // Arrange
      const manyErrors = Array(20)
        .fill(null)
        .map((_, i) => ({
          rowIndex: i,
          field: 'field',
          value: null,
          code: `ERROR_TYPE_${i}`,
          message: `Error ${i}`,
          severity: ValidationSeverity.ERROR,
        }));

      const reportWithManyErrors = {
        ...mockValidationReport,
        errors: manyErrors,
      };

      // Act
      const result = formatter.generateSummary(
        DomainType.SALES,
        reportWithManyErrors,
        mockActionPlan,
      );

      // Assert
      const errorCodeWarnings = result.warnings.filter((w) => w.includes('ERROR_TYPE'));
      expect(errorCodeWarnings).toHaveLength(5);
    });
  });

  describe('extractNewEntities (private)', () => {
    it('should group inserts by table', () => {
      // Arrange
      const actionPlan = {
        actions: [
          { type: ActionType.INSERT, table: 'transactions', data: {} },
          { type: ActionType.INSERT, table: 'transactions', data: {} },
          { type: ActionType.INSERT, table: 'inventory', data: {} },
        ],
        summary: {},
        estimatedDuration: 0,
        risks: [],
      };

      // Act
      const result = (formatter as any).extractNewEntities(actionPlan);

      // Assert
      expect(result).toHaveLength(2);
      expect(result).toContainEqual({ type: 'transactions', count: 2 });
      expect(result).toContainEqual({ type: 'inventory', count: 1 });
    });

    it('should return empty array when no inserts', () => {
      // Arrange
      const actionPlan = {
        actions: [{ type: ActionType.UPDATE, table: 'transactions', data: {} }],
        summary: {},
        estimatedDuration: 0,
        risks: [],
      };

      // Act
      const result = (formatter as any).extractNewEntities(actionPlan);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('extractUpdatedEntities (private)', () => {
    it('should include both UPDATE and MERGE actions', () => {
      // Arrange
      const actionPlan = {
        actions: [
          { type: ActionType.UPDATE, table: 'transactions', data: {} },
          { type: ActionType.MERGE, table: 'inventory', data: {} },
        ],
        summary: {},
        estimatedDuration: 0,
        risks: [],
      };

      // Act
      const result = (formatter as any).extractUpdatedEntities(actionPlan);

      // Assert
      expect(result).toHaveLength(2);
      expect(result).toContainEqual({ type: 'transactions', count: 1 });
      expect(result).toContainEqual({ type: 'inventory', count: 1 });
    });
  });

  describe('formatAsText', () => {
    it('should format summary as plain text', () => {
      // Arrange
      const summary = formatter.generateSummary(
        DomainType.SALES,
        mockValidationReport,
        mockActionPlan,
      );

      // Act
      const text = formatter.formatAsText(summary);

      // Assert
      expect(text).toContain('Import Summary - SALES Domain');
      expect(text).toContain('Total Rows: 100');
      expect(text).toContain('Valid Rows: 95');
      expect(text).toContain('Invalid Rows: 5');
      expect(text).toContain('New Entities:');
      expect(text).toContain('transactions: 2');
      expect(text).toContain('Updated Entities:');
      expect(text).toContain('Estimated Changes:');
      expect(text).toContain('Warnings:');
    });

    it('should not include New Entities section if empty', () => {
      // Arrange
      const summary = {
        domain: DomainType.SALES,
        totalRows: 10,
        validRows: 10,
        invalidRows: 0,
        newEntities: [],
        updatedEntities: [],
        warnings: [],
        estimatedChanges: 'No changes',
      };

      // Act
      const text = formatter.formatAsText(summary);

      // Assert
      expect(text).not.toContain('New Entities:');
    });

    it('should not include Updated Entities section if empty', () => {
      // Arrange
      const summary = {
        domain: DomainType.SALES,
        totalRows: 10,
        validRows: 10,
        invalidRows: 0,
        newEntities: [{ type: 'test', count: 1 }],
        updatedEntities: [],
        warnings: [],
        estimatedChanges: 'Create 1 new record(s).',
      };

      // Act
      const text = formatter.formatAsText(summary);

      // Assert
      expect(text).not.toContain('Updated Entities:');
    });

    it('should not include Warnings section if empty', () => {
      // Arrange
      const summary = {
        domain: DomainType.SALES,
        totalRows: 10,
        validRows: 10,
        invalidRows: 0,
        newEntities: [],
        updatedEntities: [],
        warnings: [],
        estimatedChanges: 'No changes',
      };

      // Act
      const text = formatter.formatAsText(summary);

      // Assert
      expect(text).not.toContain('Warnings:');
    });
  });

  describe('formatAsMarkdown', () => {
    it('should format summary as Markdown', () => {
      // Arrange
      const summary = formatter.generateSummary(
        DomainType.SALES,
        mockValidationReport,
        mockActionPlan,
      );

      // Act
      const md = formatter.formatAsMarkdown(summary);

      // Assert
      expect(md).toContain('# Import Summary - SALES Domain');
      expect(md).toContain('## Overview');
      expect(md).toContain('**Total Rows**: 100');
      expect(md).toContain('**Valid Rows**: 95');
      expect(md).toContain('**Invalid Rows**: 5');
      expect(md).toContain('## New Entities');
      expect(md).toContain('**transactions**: 2');
      expect(md).toContain('## Updated Entities');
      expect(md).toContain('## Estimated Changes');
    });

    it('should include warnings section with emoji', () => {
      // Arrange
      const summary = formatter.generateSummary(
        DomainType.SALES,
        mockValidationReport,
        mockActionPlan,
      );

      // Act
      const md = formatter.formatAsMarkdown(summary);

      // Assert
      expect(md).toContain('## ⚠️ Warnings');
    });

    it('should not include optional sections if empty', () => {
      // Arrange
      const summary = {
        domain: DomainType.SALES,
        totalRows: 10,
        validRows: 10,
        invalidRows: 0,
        newEntities: [],
        updatedEntities: [],
        warnings: [],
        estimatedChanges: 'No changes',
      };

      // Act
      const md = formatter.formatAsMarkdown(summary);

      // Assert
      expect(md).not.toContain('## New Entities');
      expect(md).not.toContain('## Updated Entities');
      expect(md).not.toContain('## ⚠️ Warnings');
    });
  });

  describe('formatAsHtml', () => {
    it('should format summary as HTML', () => {
      // Arrange
      const summary = formatter.generateSummary(
        DomainType.SALES,
        mockValidationReport,
        mockActionPlan,
      );

      // Act
      const html = formatter.formatAsHtml(summary);

      // Assert
      expect(html).toContain('<div class="import-summary">');
      expect(html).toContain('<h2>Import Summary - SALES Domain</h2>');
      expect(html).toContain('<h3>Overview</h3>');
      expect(html).toContain('<td>Total Rows</td><td>100</td>');
      expect(html).toContain('class="success"');
      expect(html).toContain('class="error"');
    });

    it('should include new entities section', () => {
      // Arrange
      const summary = formatter.generateSummary(
        DomainType.SALES,
        mockValidationReport,
        mockActionPlan,
      );

      // Act
      const html = formatter.formatAsHtml(summary);

      // Assert
      expect(html).toContain('<div class="new-entities">');
      expect(html).toContain('<strong>transactions</strong>: 2');
    });

    it('should include updated entities section', () => {
      // Arrange
      const summary = formatter.generateSummary(
        DomainType.SALES,
        mockValidationReport,
        mockActionPlan,
      );

      // Act
      const html = formatter.formatAsHtml(summary);

      // Assert
      expect(html).toContain('<div class="updated-entities">');
    });

    it('should include warnings section', () => {
      // Arrange
      const summary = formatter.generateSummary(
        DomainType.SALES,
        mockValidationReport,
        mockActionPlan,
      );

      // Act
      const html = formatter.formatAsHtml(summary);

      // Assert
      expect(html).toContain('<div class="warnings">');
      expect(html).toContain('<h3>⚠️ Warnings</h3>');
    });

    it('should not include optional sections if empty', () => {
      // Arrange
      const summary = {
        domain: DomainType.SALES,
        totalRows: 10,
        validRows: 10,
        invalidRows: 0,
        newEntities: [],
        updatedEntities: [],
        warnings: [],
        estimatedChanges: 'No changes',
      };

      // Act
      const html = formatter.formatAsHtml(summary);

      // Assert
      expect(html).not.toContain('<div class="new-entities">');
      expect(html).not.toContain('<div class="updated-entities">');
      expect(html).not.toContain('<div class="warnings">');
    });
  });
});
