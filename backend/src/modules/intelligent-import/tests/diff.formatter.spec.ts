import { Test, TestingModule } from '@nestjs/testing';
import { DiffFormatter, DiffEntry } from '../tools/formatters/diff.formatter';
import { ActionType, Action } from '../interfaces/common.interface';

describe('DiffFormatter', () => {
  let formatter: DiffFormatter;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DiffFormatter],
    }).compile();

    formatter = module.get<DiffFormatter>(DiffFormatter);
  });

  describe('formatActionPlan', () => {
    it('should format INSERT actions correctly', () => {
      // Arrange
      const actions: Action[] = [
        {
          type: ActionType.INSERT,
          table: 'transactions',
          data: { amount: 100, machine_id: 'M-001' },
        },
      ];

      // Act
      const result = formatter.formatActionPlan(actions);

      // Assert
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].action).toBe(ActionType.INSERT);
      expect(result.entries[0].table).toBe('transactions');
      expect(result.entries[0].after).toEqual({ amount: 100, machine_id: 'M-001' });
      expect(result.entries[0].before).toBeUndefined();
    });

    it('should format UPDATE actions with before/after states', () => {
      // Arrange
      const actions: Action[] = [
        {
          type: ActionType.UPDATE,
          table: 'transactions',
          data: { amount: 150 },
          conditions: { id: 'tx-001', amount: 100 },
        },
      ];

      // Act
      const result = formatter.formatActionPlan(actions);

      // Assert
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].action).toBe(ActionType.UPDATE);
      expect(result.entries[0].before).toEqual({ id: 'tx-001', amount: 100 });
      expect(result.entries[0].after).toEqual({ amount: 150 });
      expect(result.entries[0].highlight).toContain('amount');
    });

    it('should format MERGE actions with combined after state', () => {
      // Arrange
      const actions: Action[] = [
        {
          type: ActionType.MERGE,
          table: 'inventory',
          data: { stock: 50 },
          conditions: { id: 'inv-001', product: 'Coffee' },
        },
      ];

      // Act
      const result = formatter.formatActionPlan(actions);

      // Assert
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].action).toBe(ActionType.MERGE);
      expect(result.entries[0].before).toEqual({ id: 'inv-001', product: 'Coffee' });
      expect(result.entries[0].after).toEqual({
        id: 'inv-001',
        product: 'Coffee',
        stock: 50,
      });
      expect(result.entries[0].highlight).toContain('stock');
    });

    it('should format DELETE actions with only before state', () => {
      // Arrange
      const actions: Action[] = [
        {
          type: ActionType.DELETE,
          table: 'old_data',
          data: {},
          conditions: { id: 'old-001', status: 'archived' },
        },
      ];

      // Act
      const result = formatter.formatActionPlan(actions);

      // Assert
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].action).toBe(ActionType.DELETE);
      expect(result.entries[0].before).toEqual({ id: 'old-001', status: 'archived' });
      expect(result.entries[0].after).toBeUndefined();
    });

    it('should format SKIP actions with no before/after', () => {
      // Arrange
      const actions: Action[] = [
        {
          type: ActionType.SKIP,
          table: 'transactions',
          data: { amount: null },
        },
      ];

      // Act
      const result = formatter.formatActionPlan(actions);

      // Assert
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].action).toBe(ActionType.SKIP);
      expect(result.entries[0].before).toBeUndefined();
      expect(result.entries[0].after).toBeUndefined();
      expect(result.entries[0].record).toEqual({ amount: null });
    });

    it('should generate summary text', () => {
      // Arrange
      const actions: Action[] = [
        { type: ActionType.INSERT, table: 'test', data: {} },
        { type: ActionType.INSERT, table: 'test', data: {} },
        { type: ActionType.UPDATE, table: 'test', data: {} },
        { type: ActionType.MERGE, table: 'test', data: {} },
        { type: ActionType.DELETE, table: 'test', data: {} },
        { type: ActionType.SKIP, table: 'test', data: {} },
      ];

      // Act
      const result = formatter.formatActionPlan(actions);

      // Assert
      expect(result.summary).toContain('Planned changes:');
      expect(result.summary).toContain('2 new record(s)');
      expect(result.summary).toContain('1 update(s)');
      expect(result.summary).toContain('1 merge(s)');
      expect(result.summary).toContain('1 deletion(s)');
      expect(result.summary).toContain('1 skipped');
    });

    it('should generate "No changes" summary for empty actions', () => {
      // Arrange
      const actions: Action[] = [];

      // Act
      const result = formatter.formatActionPlan(actions);

      // Assert
      expect(result.summary).toContain('No changes');
    });

    it('should generate Markdown output', () => {
      // Arrange
      const actions: Action[] = [
        {
          type: ActionType.INSERT,
          table: 'transactions',
          data: { amount: 100 },
        },
      ];

      // Act
      const result = formatter.formatActionPlan(actions);

      // Assert
      expect(result.markdown).toContain('# Import Preview');
      expect(result.markdown).toContain('## Table: `transactions`');
      expect(result.markdown).toContain('### ➕ INSERT');
      expect(result.markdown).toContain('**After:**');
      expect(result.markdown).toContain('```json');
    });

    it('should generate HTML output', () => {
      // Arrange
      const actions: Action[] = [
        {
          type: ActionType.INSERT,
          table: 'transactions',
          data: { amount: 100 },
        },
      ];

      // Act
      const result = formatter.formatActionPlan(actions);

      // Assert
      expect(result.html).toContain('<div class="import-preview">');
      expect(result.html).toContain('<h2>Import Preview</h2>');
      expect(result.html).toContain('<h3>Table: <code>transactions</code></h3>');
      expect(result.html).toContain('class="diff-entry insert"');
    });

    it('should group entries by table in output', () => {
      // Arrange
      const actions: Action[] = [
        { type: ActionType.INSERT, table: 'transactions', data: { amount: 100 } },
        { type: ActionType.INSERT, table: 'inventory', data: { stock: 50 } },
        { type: ActionType.INSERT, table: 'transactions', data: { amount: 200 } },
      ];

      // Act
      const result = formatter.formatActionPlan(actions);

      // Assert
      // Should have both tables mentioned
      expect(result.markdown).toContain('Table: `transactions`');
      expect(result.markdown).toContain('Table: `inventory`');
    });
  });

  describe('formatAction (private)', () => {
    it('should set highlight for UPDATE with conditions', () => {
      // Arrange
      const action: Action = {
        type: ActionType.UPDATE,
        table: 'test',
        data: { name: 'new', age: 30 },
        conditions: { name: 'old', age: 25 },
      };

      // Act
      const result = (formatter as any).formatAction(action);

      // Assert
      expect(result.highlight).toContain('name');
      expect(result.highlight).toContain('age');
    });

    it('should not set highlight for UPDATE without conditions', () => {
      // Arrange
      const action: Action = {
        type: ActionType.UPDATE,
        table: 'test',
        data: { name: 'new' },
      };

      // Act
      const result = (formatter as any).formatAction(action);

      // Assert
      expect(result.highlight).toBeUndefined();
    });
  });

  describe('getChangedFields (private)', () => {
    it('should identify changed fields', () => {
      // Arrange
      const before = { name: 'John', age: 30, city: 'NYC' };
      const after = { name: 'John', age: 31, city: 'LA' };

      // Act
      const result = (formatter as any).getChangedFields(before, after);

      // Assert
      expect(result).toContain('age');
      expect(result).toContain('city');
      expect(result).not.toContain('name');
    });

    it('should identify new fields in after', () => {
      // Arrange
      const before = { name: 'John' };
      const after = { name: 'John', age: 30 };

      // Act
      const result = (formatter as any).getChangedFields(before, after);

      // Assert
      expect(result).toContain('age');
    });

    it('should handle nested objects using JSON comparison', () => {
      // Arrange
      const before = { config: { a: 1 } };
      const after = { config: { a: 2 } };

      // Act
      const result = (formatter as any).getChangedFields(before, after);

      // Assert
      expect(result).toContain('config');
    });

    it('should return empty array when no changes', () => {
      // Arrange
      const before = { name: 'John', age: 30 };
      const after = { name: 'John', age: 30 };

      // Act
      const result = (formatter as any).getChangedFields(before, after);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('generateSummary (private)', () => {
    it('should count each action type', () => {
      // Arrange
      const actions: Action[] = [
        { type: ActionType.INSERT, table: 'test', data: {} },
        { type: ActionType.INSERT, table: 'test', data: {} },
        { type: ActionType.INSERT, table: 'test', data: {} },
      ];

      // Act
      const result = (formatter as any).generateSummary(actions);

      // Assert
      expect(result).toContain('3 new record(s)');
    });

    it('should only include non-zero counts', () => {
      // Arrange
      const actions: Action[] = [{ type: ActionType.INSERT, table: 'test', data: {} }];

      // Act
      const result = (formatter as any).generateSummary(actions);

      // Assert
      expect(result).not.toContain('update');
      expect(result).not.toContain('merge');
      expect(result).not.toContain('deletion');
      expect(result).not.toContain('skipped');
    });
  });

  describe('getActionIcon (private)', () => {
    it('should return correct icons for each action type', () => {
      // Act
      const insertIcon = (formatter as any).getActionIcon(ActionType.INSERT);
      const updateIcon = (formatter as any).getActionIcon(ActionType.UPDATE);
      const mergeIcon = (formatter as any).getActionIcon(ActionType.MERGE);
      const deleteIcon = (formatter as any).getActionIcon(ActionType.DELETE);
      const skipIcon = (formatter as any).getActionIcon(ActionType.SKIP);

      // Assert
      expect(insertIcon).toBe('➕');
      expect(updateIcon).toBe('✏️');
      expect(mergeIcon).toBe('🔀');
      expect(deleteIcon).toBe('🗑️');
      expect(skipIcon).toBe('⏭️');
    });

    it('should return question mark for unknown action type', () => {
      // Act
      const result = (formatter as any).getActionIcon('unknown');

      // Assert
      expect(result).toBe('❓');
    });
  });

  describe('groupByTable (private)', () => {
    it('should group entries by table name', () => {
      // Arrange
      const entries: DiffEntry[] = [
        { action: ActionType.INSERT, table: 'transactions', record: {} },
        { action: ActionType.INSERT, table: 'inventory', record: {} },
        { action: ActionType.INSERT, table: 'transactions', record: {} },
      ];

      // Act
      const result = (formatter as any).groupByTable(entries);

      // Assert
      expect(Object.keys(result)).toHaveLength(2);
      expect(result.transactions).toHaveLength(2);
      expect(result.inventory).toHaveLength(1);
    });

    it('should return empty object for empty entries', () => {
      // Act
      const result = (formatter as any).groupByTable([]);

      // Assert
      expect(result).toEqual({});
    });
  });

  describe('highlightChanges (private)', () => {
    it('should add mark tags around highlighted fields', () => {
      // Arrange
      const before = { name: 'old' };
      const after = { name: 'new', age: 30 };
      const highlight = ['name'];

      // Act
      const result = (formatter as any).highlightChanges(before, after, highlight);

      // Assert
      expect(result).toContain('<mark>');
      expect(result).toContain('</mark>');
    });

    it('should return plain JSON when no highlights', () => {
      // Arrange
      const before = { name: 'old' };
      const after = { name: 'new' };

      // Act
      const result = (formatter as any).highlightChanges(before, after, []);

      // Assert
      expect(result).not.toContain('<mark>');
      expect(result).toBe(JSON.stringify(after, null, 2));
    });

    it('should return plain JSON when highlights is undefined', () => {
      // Arrange
      const before = { name: 'old' };
      const after = { name: 'new' };

      // Act
      const result = (formatter as any).highlightChanges(before, after, undefined);

      // Assert
      expect(result).not.toContain('<mark>');
    });
  });

  describe('formatEntryMarkdown (private)', () => {
    it('should format entry with before and after', () => {
      // Arrange
      const entry: DiffEntry = {
        action: ActionType.UPDATE,
        table: 'test',
        record: {},
        before: { id: 1 },
        after: { id: 2 },
        highlight: ['id'],
      };

      // Act
      const result = (formatter as any).formatEntryMarkdown(entry);

      // Assert
      expect(result).toContain('**Before:**');
      expect(result).toContain('**After:**');
      expect(result).toContain('**Changed fields:**');
    });

    it('should format entry with only after (INSERT)', () => {
      // Arrange
      const entry: DiffEntry = {
        action: ActionType.INSERT,
        table: 'test',
        record: {},
        after: { id: 1 },
      };

      // Act
      const result = (formatter as any).formatEntryMarkdown(entry);

      // Assert
      expect(result).not.toContain('**Before:**');
      expect(result).toContain('**After:**');
    });
  });

  describe('formatEntryHtml (private)', () => {
    it('should format entry with diff columns for before and after', () => {
      // Arrange
      const entry: DiffEntry = {
        action: ActionType.UPDATE,
        table: 'test',
        record: {},
        before: { id: 1 },
        after: { id: 2 },
      };

      // Act
      const result = (formatter as any).formatEntryHtml(entry);

      // Assert
      expect(result).toContain('<div class="diff-columns">');
      expect(result).toContain('<div class="before">');
      expect(result).toContain('<div class="after">');
    });

    it('should format INSERT entry with only after', () => {
      // Arrange
      const entry: DiffEntry = {
        action: ActionType.INSERT,
        table: 'test',
        record: {},
        after: { id: 1 },
      };

      // Act
      const result = (formatter as any).formatEntryHtml(entry);

      // Assert
      expect(result).toContain('<strong>New Record:</strong>');
      expect(result).not.toContain('<div class="diff-columns">');
    });

    it('should format DELETE entry with only before', () => {
      // Arrange
      const entry: DiffEntry = {
        action: ActionType.DELETE,
        table: 'test',
        record: {},
        before: { id: 1 },
      };

      // Act
      const result = (formatter as any).formatEntryHtml(entry);

      // Assert
      expect(result).toContain('<strong>Deleted Record:</strong>');
      expect(result).not.toContain('<div class="diff-columns">');
    });

    it('should use action class for styling', () => {
      // Arrange
      const entry: DiffEntry = {
        action: ActionType.INSERT,
        table: 'test',
        record: {},
      };

      // Act
      const result = (formatter as any).formatEntryHtml(entry);

      // Assert
      expect(result).toContain('class="diff-entry insert"');
    });
  });
});
