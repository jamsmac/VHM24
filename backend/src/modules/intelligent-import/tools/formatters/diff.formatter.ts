import { Injectable } from '@nestjs/common';
import { Action, ActionType } from '../../interfaces/common.interface';

export interface DiffEntry {
  action: ActionType;
  table: string;
  record: Record<string, unknown>;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  highlight?: string[];
}

export interface FormattedDiff {
  summary: string;
  entries: DiffEntry[];
  markdown: string;
  html: string;
}

/**
 * Diff Formatter
 *
 * Generates human-readable diffs for import preview
 */
@Injectable()
export class DiffFormatter {
  /**
   * Format action plan as diff
   */
  formatActionPlan(actions: Action[]): FormattedDiff {
    const entries: DiffEntry[] = actions.map((action) => this.formatAction(action));

    const summary = this.generateSummary(actions);
    const markdown = this.generateMarkdown(entries, summary);
    const html = this.generateHtml(entries, summary);

    return {
      summary,
      entries,
      markdown,
      html,
    };
  }

  /**
   * Format a single action
   */
  private formatAction(action: Action): DiffEntry {
    const entry: DiffEntry = {
      action: action.type,
      table: action.table,
      record: action.data,
    };

    switch (action.type) {
      case ActionType.INSERT:
        entry.after = action.data;
        break;

      case ActionType.UPDATE:
        entry.before = action.conditions;
        entry.after = action.data;
        if (action.conditions) {
          entry.highlight = this.getChangedFields(action.conditions, action.data);
        }
        break;

      case ActionType.MERGE:
        entry.before = action.conditions;
        entry.after = { ...action.conditions, ...action.data };
        entry.highlight = Object.keys(action.data);
        break;

      case ActionType.DELETE:
        entry.before = action.conditions;
        break;

      case ActionType.SKIP:
        // No before/after for skip
        break;
    }

    return entry;
  }

  /**
   * Get fields that changed between before and after
   */
  private getChangedFields(
    before: Record<string, unknown>,
    after: Record<string, unknown>,
  ): string[] {
    const changed: string[] = [];

    for (const key of Object.keys(after)) {
      if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
        changed.push(key);
      }
    }

    return changed;
  }

  /**
   * Generate summary text
   */
  private generateSummary(actions: Action[]): string {
    const counts = {
      insert: actions.filter((a) => a.type === ActionType.INSERT).length,
      update: actions.filter((a) => a.type === ActionType.UPDATE).length,
      merge: actions.filter((a) => a.type === ActionType.MERGE).length,
      delete: actions.filter((a) => a.type === ActionType.DELETE).length,
      skip: actions.filter((a) => a.type === ActionType.SKIP).length,
    };

    const parts: string[] = [];

    if (counts.insert > 0) parts.push(`${counts.insert} new record(s)`);
    if (counts.update > 0) parts.push(`${counts.update} update(s)`);
    if (counts.merge > 0) parts.push(`${counts.merge} merge(s)`);
    if (counts.delete > 0) parts.push(`${counts.delete} deletion(s)`);
    if (counts.skip > 0) parts.push(`${counts.skip} skipped`);

    return `Planned changes: ${parts.join(', ') || 'No changes'}`;
  }

  /**
   * Generate Markdown format
   */
  private generateMarkdown(entries: DiffEntry[], summary: string): string {
    let md = `# Import Preview\n\n${summary}\n\n`;

    const groupedByTable = this.groupByTable(entries);

    for (const [table, tableEntries] of Object.entries(groupedByTable)) {
      md += `## Table: \`${table}\`\n\n`;

      for (const entry of tableEntries) {
        md += this.formatEntryMarkdown(entry);
        md += '\n---\n\n';
      }
    }

    return md;
  }

  /**
   * Format single entry as Markdown
   */
  private formatEntryMarkdown(entry: DiffEntry): string {
    let md = `### ${this.getActionIcon(entry.action)} ${entry.action.toUpperCase()}\n\n`;

    if (entry.before) {
      md += '**Before:**\n```json\n' + JSON.stringify(entry.before, null, 2) + '\n```\n\n';
    }

    if (entry.after) {
      md += '**After:**\n```json\n' + JSON.stringify(entry.after, null, 2) + '\n```\n\n';
    }

    if (entry.highlight && entry.highlight.length > 0) {
      md += `**Changed fields:** ${entry.highlight.join(', ')}\n\n`;
    }

    return md;
  }

  /**
   * Generate HTML format
   */
  private generateHtml(entries: DiffEntry[], summary: string): string {
    let html = `
      <div class="import-preview">
        <h2>Import Preview</h2>
        <p class="summary">${summary}</p>
    `;

    const groupedByTable = this.groupByTable(entries);

    for (const [table, tableEntries] of Object.entries(groupedByTable)) {
      html += `<div class="table-section">
        <h3>Table: <code>${table}</code></h3>
      `;

      for (const entry of tableEntries) {
        html += this.formatEntryHtml(entry);
      }

      html += '</div>';
    }

    html += '</div>';

    return html;
  }

  /**
   * Format single entry as HTML
   */
  private formatEntryHtml(entry: DiffEntry): string {
    const actionClass = entry.action.toLowerCase();
    const icon = this.getActionIcon(entry.action);

    let html = `
      <div class="diff-entry ${actionClass}">
        <h4>${icon} ${entry.action.toUpperCase()}</h4>
    `;

    if (entry.before && entry.after) {
      html += '<div class="diff-columns">';
      html += `<div class="before">
        <strong>Before:</strong>
        <pre>${JSON.stringify(entry.before, null, 2)}</pre>
      </div>`;
      html += `<div class="after">
        <strong>After:</strong>
        <pre>${this.highlightChanges(entry.before, entry.after, entry.highlight)}</pre>
      </div>`;
      html += '</div>';
    } else if (entry.after) {
      html += `<div class="after">
        <strong>New Record:</strong>
        <pre>${JSON.stringify(entry.after, null, 2)}</pre>
      </div>`;
    } else if (entry.before) {
      html += `<div class="before">
        <strong>Deleted Record:</strong>
        <pre>${JSON.stringify(entry.before, null, 2)}</pre>
      </div>`;
    }

    html += '</div>';

    return html;
  }

  /**
   * Highlight changed fields in JSON
   */
  private highlightChanges(
    before: Record<string, unknown>,
    after: Record<string, unknown>,
    highlight?: string[],
  ): string {
    const json = JSON.stringify(after, null, 2);

    if (!highlight || highlight.length === 0) {
      return json;
    }

    // Simple highlighting (in real implementation, use proper JSON parser)
    let highlighted = json;
    for (const field of highlight) {
      const regex = new RegExp(`"${field}":\\s*([^,\n}]+)`, 'g');
      highlighted = highlighted.replace(regex, `"${field}": <mark>$1</mark>`);
    }

    return highlighted;
  }

  /**
   * Group entries by table
   */
  private groupByTable(entries: DiffEntry[]): Record<string, DiffEntry[]> {
    const grouped: Record<string, DiffEntry[]> = {};

    for (const entry of entries) {
      if (!grouped[entry.table]) {
        grouped[entry.table] = [];
      }
      grouped[entry.table].push(entry);
    }

    return grouped;
  }

  /**
   * Get emoji/icon for action type
   */
  private getActionIcon(action: ActionType): string {
    switch (action) {
      case ActionType.INSERT:
        return '➕';
      case ActionType.UPDATE:
        return '✏️';
      case ActionType.MERGE:
        return '🔀';
      case ActionType.DELETE:
        return '🗑️';
      case ActionType.SKIP:
        return '⏭️';
      default:
        return '❓';
    }
  }
}
