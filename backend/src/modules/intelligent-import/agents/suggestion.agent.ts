import { Injectable, Logger } from '@nestjs/common';
import { IAgent, AgentContext, AgentStatus } from '../interfaces/agent.interface';
import { ValidationReport, Action, ActionPlan, ActionType } from '../interfaces/common.interface';

interface SuggestionInput {
  validationReport: ValidationReport;
  rows: any[];
  domain: string;
  columnMapping: any;
}

/**
 * Suggestion Agent
 *
 * Proposes actions based on validation results (create/update/skip/merge)
 */
@Injectable()
export class SuggestionAgent implements IAgent<SuggestionInput, ActionPlan> {
  private readonly logger = new Logger(SuggestionAgent.name);
  readonly name = 'SuggestionAgent';
  private status: AgentStatus = AgentStatus.IDLE;

  async execute(input: SuggestionInput, _context: AgentContext): Promise<ActionPlan> {
    this.status = AgentStatus.RUNNING;

    try {
      this.logger.log(`Generating action plan for ${input.rows.length} rows`);

      const actions: Action[] = [];
      const errorRowIndexes = new Set(input.validationReport.errors.map((e) => e.rowIndex));

      for (let i = 0; i < input.rows.length; i++) {
        if (errorRowIndexes.has(i)) {
          // Skip rows with errors
          actions.push({
            type: ActionType.SKIP,
            table: this.getTableName(input.domain),
            data: input.rows[i],
            metadata: { reason: 'Validation errors', rowIndex: i },
          });
        } else {
          // Insert valid rows
          actions.push({
            type: ActionType.INSERT,
            table: this.getTableName(input.domain),
            data: input.rows[i],
            metadata: { rowIndex: i },
          });
        }
      }

      const summary = {
        insertCount: actions.filter((a) => a.type === ActionType.INSERT).length,
        updateCount: actions.filter((a) => a.type === ActionType.UPDATE).length,
        mergeCount: actions.filter((a) => a.type === ActionType.MERGE).length,
        skipCount: actions.filter((a) => a.type === ActionType.SKIP).length,
        deleteCount: actions.filter((a) => a.type === ActionType.DELETE).length,
      };

      const risks = this.identifyRisks(actions, input.validationReport);

      this.logger.log(`Action plan: ${summary.insertCount} inserts, ${summary.skipCount} skips`);

      this.status = AgentStatus.COMPLETED;

      return {
        actions,
        summary,
        estimatedDuration: Math.ceil(actions.length / 100), // ~100 actions per second
        risks,
      };
    } catch (error) {
      this.status = AgentStatus.FAILED;
      this.logger.error(`Suggestion failed:`, error);
      throw error;
    }
  }

  async validateInput(input: SuggestionInput): Promise<boolean> {
    return input.rows && input.rows.length > 0;
  }

  getStatus(): AgentStatus {
    return this.status;
  }

  private getTableName(domain: string): string {
    const tableMap: Record<string, string> = {
      sales: 'transactions',
      inventory: 'inventory',
      machines: 'machines',
      equipment: 'equipment',
    };
    return tableMap[domain] || 'unknown';
  }

  private identifyRisks(actions: Action[], validationReport: ValidationReport): string[] {
    const risks: string[] = [];

    if (validationReport.warningCount > 0) {
      risks.push(`${validationReport.warningCount} warnings detected`);
    }

    const largeInsertCount = actions.filter((a) => a.type === ActionType.INSERT).length;
    if (largeInsertCount > 1000) {
      risks.push(`Large bulk insert (${largeInsertCount} records)`);
    }

    return risks;
  }
}
