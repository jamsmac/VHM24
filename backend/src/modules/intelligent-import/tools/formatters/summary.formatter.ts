import { Injectable } from '@nestjs/common';
import {
  ImportSummary,
  ValidationReport,
  ActionPlan,
  DomainType,
} from '../../interfaces/common.interface';

/**
 * Summary Formatter
 *
 * Generates human-readable summaries of import operations
 */
@Injectable()
export class SummaryFormatter {
  /**
   * Generate import summary from validation and action plan
   */
  generateSummary(
    domain: DomainType,
    validationReport: ValidationReport,
    actionPlan: ActionPlan,
  ): ImportSummary {
    const newEntities = this.extractNewEntities(actionPlan);
    const updatedEntities = this.extractUpdatedEntities(actionPlan);
    const warnings = this.extractWarnings(validationReport);
    const estimatedChanges = this.generateEstimatedChanges(actionPlan);

    return {
      domain,
      totalRows: validationReport.totalRows,
      validRows: validationReport.totalRows - validationReport.errorCount,
      invalidRows: validationReport.errorCount,
      newEntities,
      updatedEntities,
      warnings,
      estimatedChanges,
    };
  }

  /**
   * Extract new entities from action plan
   */
  private extractNewEntities(actionPlan: ActionPlan): { type: string; count: number }[] {
    const entityCounts: Record<string, number> = {};

    for (const action of actionPlan.actions) {
      if (action.type === 'insert') {
        entityCounts[action.table] = (entityCounts[action.table] || 0) + 1;
      }
    }

    return Object.entries(entityCounts).map(([type, count]) => ({ type, count }));
  }

  /**
   * Extract updated entities from action plan
   */
  private extractUpdatedEntities(actionPlan: ActionPlan): { type: string; count: number }[] {
    const entityCounts: Record<string, number> = {};

    for (const action of actionPlan.actions) {
      if (action.type === 'update' || action.type === 'merge') {
        entityCounts[action.table] = (entityCounts[action.table] || 0) + 1;
      }
    }

    return Object.entries(entityCounts).map(([type, count]) => ({ type, count }));
  }

  /**
   * Extract warnings from validation report
   */
  private extractWarnings(validationReport: ValidationReport): string[] {
    const warnings: string[] = [];

    // Add error summary
    if (validationReport.errorCount > 0) {
      warnings.push(`${validationReport.errorCount} row(s) contain errors`);
    }

    // Add warning summary
    if (validationReport.warningCount > 0) {
      warnings.push(`${validationReport.warningCount} warning(s) detected`);
    }

    // Add top 5 most common errors
    const errorCodes: Record<string, number> = {};
    for (const error of validationReport.errors) {
      errorCodes[error.code] = (errorCodes[error.code] || 0) + 1;
    }

    const topErrors = Object.entries(errorCodes)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    for (const [code, count] of topErrors) {
      warnings.push(`${code}: ${count} occurrence(s)`);
    }

    return warnings;
  }

  /**
   * Generate human-readable estimated changes
   */
  private generateEstimatedChanges(actionPlan: ActionPlan): string {
    const parts: string[] = [];

    if (actionPlan.summary.insertCount > 0) {
      parts.push(`Create ${actionPlan.summary.insertCount} new record(s)`);
    }

    if (actionPlan.summary.updateCount > 0) {
      parts.push(`Update ${actionPlan.summary.updateCount} existing record(s)`);
    }

    if (actionPlan.summary.mergeCount > 0) {
      parts.push(`Merge ${actionPlan.summary.mergeCount} record(s)`);
    }

    if (actionPlan.summary.skipCount > 0) {
      parts.push(`Skip ${actionPlan.summary.skipCount} record(s)`);
    }

    if (actionPlan.summary.deleteCount > 0) {
      parts.push(`Delete ${actionPlan.summary.deleteCount} record(s)`);
    }

    if (parts.length === 0) {
      return 'No changes will be made';
    }

    return parts.join(', ') + '.';
  }

  /**
   * Format summary as plain text
   */
  formatAsText(summary: ImportSummary): string {
    let text = `Import Summary - ${summary.domain.toUpperCase()} Domain\n`;
    text += `${'='.repeat(50)}\n\n`;

    text += `Total Rows: ${summary.totalRows}\n`;
    text += `Valid Rows: ${summary.validRows}\n`;
    text += `Invalid Rows: ${summary.invalidRows}\n\n`;

    if (summary.newEntities.length > 0) {
      text += 'New Entities:\n';
      for (const entity of summary.newEntities) {
        text += `  - ${entity.type}: ${entity.count}\n`;
      }
      text += '\n';
    }

    if (summary.updatedEntities.length > 0) {
      text += 'Updated Entities:\n';
      for (const entity of summary.updatedEntities) {
        text += `  - ${entity.type}: ${entity.count}\n`;
      }
      text += '\n';
    }

    text += `Estimated Changes: ${summary.estimatedChanges}\n\n`;

    if (summary.warnings.length > 0) {
      text += 'Warnings:\n';
      for (const warning of summary.warnings) {
        text += `  ⚠️  ${warning}\n`;
      }
    }

    return text;
  }

  /**
   * Format summary as Markdown
   */
  formatAsMarkdown(summary: ImportSummary): string {
    let md = `# Import Summary - ${summary.domain.toUpperCase()} Domain\n\n`;

    md += `## Overview\n\n`;
    md += `- **Total Rows**: ${summary.totalRows}\n`;
    md += `- **Valid Rows**: ${summary.validRows}\n`;
    md += `- **Invalid Rows**: ${summary.invalidRows}\n\n`;

    if (summary.newEntities.length > 0) {
      md += `## New Entities\n\n`;
      for (const entity of summary.newEntities) {
        md += `- **${entity.type}**: ${entity.count}\n`;
      }
      md += '\n';
    }

    if (summary.updatedEntities.length > 0) {
      md += `## Updated Entities\n\n`;
      for (const entity of summary.updatedEntities) {
        md += `- **${entity.type}**: ${entity.count}\n`;
      }
      md += '\n';
    }

    md += `## Estimated Changes\n\n${summary.estimatedChanges}\n\n`;

    if (summary.warnings.length > 0) {
      md += `## ⚠️ Warnings\n\n`;
      for (const warning of summary.warnings) {
        md += `- ${warning}\n`;
      }
    }

    return md;
  }

  /**
   * Format summary as HTML
   */
  formatAsHtml(summary: ImportSummary): string {
    let html = `
      <div class="import-summary">
        <h2>Import Summary - ${summary.domain.toUpperCase()} Domain</h2>

        <div class="overview">
          <h3>Overview</h3>
          <table>
            <tr><td>Total Rows</td><td>${summary.totalRows}</td></tr>
            <tr><td>Valid Rows</td><td class="success">${summary.validRows}</td></tr>
            <tr><td>Invalid Rows</td><td class="error">${summary.invalidRows}</td></tr>
          </table>
        </div>
    `;

    if (summary.newEntities.length > 0) {
      html += `
        <div class="new-entities">
          <h3>New Entities</h3>
          <ul>
      `;
      for (const entity of summary.newEntities) {
        html += `<li><strong>${entity.type}</strong>: ${entity.count}</li>`;
      }
      html += '</ul></div>';
    }

    if (summary.updatedEntities.length > 0) {
      html += `
        <div class="updated-entities">
          <h3>Updated Entities</h3>
          <ul>
      `;
      for (const entity of summary.updatedEntities) {
        html += `<li><strong>${entity.type}</strong>: ${entity.count}</li>`;
      }
      html += '</ul></div>';
    }

    html += `
      <div class="estimated-changes">
        <h3>Estimated Changes</h3>
        <p>${summary.estimatedChanges}</p>
      </div>
    `;

    if (summary.warnings.length > 0) {
      html += `
        <div class="warnings">
          <h3>⚠️ Warnings</h3>
          <ul>
      `;
      for (const warning of summary.warnings) {
        html += `<li>${warning}</li>`;
      }
      html += '</ul></div>';
    }

    html += '</div>';

    return html;
  }
}
